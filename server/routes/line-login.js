// LINE Login (OAuth 2.0)
// =====================
// Flow:
// 1. Client → GET /api/line/login → redirect ไป LINE Authorization
// 2. User อนุญาต → LINE redirect กลับ /api/line/callback?code=xxx
// 3. Server แลก code → access_token
// 4. ใช้ access_token ดึง profile → login/register อัตโนมัติ

import express from 'express';
import crypto from 'crypto';
import LINE_CONFIG from '../config/line.js';
import { db } from '../db.js';
import { generateToken } from '../middleware/auth.js';

const router = express.Router();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 1. Redirect ไป LINE Login
router.get('/login', (req, res) => {
  const { channelId } = LINE_CONFIG.channelLogin;
  if (!channelId) {
    return res.status(503).json({
      error: 'LINE Login ยังไม่ได้ตั้งค่า',
      debug: {
        LINE_CHANNEL_LOGIN_ID: process.env.LINE_CHANNEL_LOGIN_ID || '(empty)',
        LINE_CHANNEL_ID: process.env.LINE_CHANNEL_ID || '(empty)',
        LINE_CHANNEL_LOGIN_SECRET: process.env.LINE_CHANNEL_LOGIN_SECRET ? '***set***' : '(empty)',
        LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET ? '***set***' : '(empty)',
        LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN ? '***set***' : '(empty)',
        LINE_MESSAGING_CHANNEL_ID: process.env.LINE_MESSAGING_CHANNEL_ID || '(empty)',
        LINE_FRONTEND_URL: process.env.LINE_FRONTEND_URL || '(empty)',
        RENDER_EXTERNAL_URL: process.env.RENDER_EXTERNAL_URL || '(empty)',
      }
    });
  }

  const state = crypto.randomBytes(16).toString('hex');
  const redirectUri = encodeURIComponent(LINE_CONFIG.callbackUrl);

  // เก็บ state ใน cookie (ใช้ sameSite: none สำหรับ cross-origin)
  res.cookie('line_login_state', state, {
    maxAge: 10 * 60 * 1000, // 10 นาที
    httpOnly: false,
    sameSite: 'none',
    secure: true,
    path: '/'
  });

  const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${channelId}&redirect_uri=${redirectUri}&state=${state}&scope=profile%20openid&bot_prompt=aggressive`;

  res.redirect(lineAuthUrl);
});

// 2. LINE Callback — แลก code เป็น token + ดึง profile
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  // ตรวจสอบ state — ถ้าไม่มี cookie ก็ข้าม (cross-origin ngrok)
  const savedState = req.cookies?.line_login_state;
  if (savedState && state !== savedState) {
    return res.redirect(`${LINE_CONFIG.frontendUrl}/login?error=line_invalid_state`);
  }

  if (!code) {
    return res.redirect(`${LINE_CONFIG.frontendUrl}/login?error=line_no_code`);
  }

  try {
    const { channelId, channelSecret } = LINE_CONFIG.channelLogin;
    if (!channelId || !channelSecret) {
      return res.redirect(`${LINE_CONFIG.frontendUrl}/login?error=line_not_configured`);
    }

    // แลก authorization code เป็น access_token
    const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: LINE_CONFIG.callbackUrl,
        client_id: channelId,
        client_secret: channelSecret,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      console.error('LINE token exchange error:', tokenData);
      return res.redirect(`${LINE_CONFIG.frontendUrl}/login?error=line_token_failed`);
    }

    // ดึง profile จาก LINE
    const profileResponse = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profile = await profileResponse.json();
    if (!profile.userId) {
      return res.redirect(`${LINE_CONFIG.frontendUrl}/login?error=line_profile_failed`);
    }

    // สร้าง/หา user ในระบบ
    const lineEmail = `line_${profile.userId}@line.mymonth.app`;

    let user = db.findOne('users', u => u.line_user_id === profile.userId);

    if (!user) {
      // ลองหาด้วย email ด้วย
      user = db.findOne('users', u => u.email.toLowerCase() === lineEmail.toLowerCase());
    }

    if (!user) {
      // สร้าง user ใหม่
      const newRoomCode = generateRoomCode();
      db.insert('rooms', {
        room_code: newRoomCode,
        room_name: `ห้องส่วนตัว (${profile.displayName})`,
        created_by: lineEmail,
      });

      user = db.insert('users', {
        email: lineEmail,
        password_hash: crypto.randomUUID(), // ไม่ใช้ password
        full_name: profile.displayName,
        role: 'Admin',
        room_code: newRoomCode,
        promptpay_id: '',
        avatar_url: profile.pictureUrl || '',
        line_user_id: profile.userId,
      });
    } else {
      // อัพเดทข้อมูล LINE
      db.update('users', user.id, {
        avatar_url: profile.pictureUrl || user.avatar_url,
        full_name: profile.displayName || user.full_name,
      });
    }

    // สร้าง JWT token
    const token = generateToken(user);
    const { password_hash: _, ...safeUser } = user;

    // Redirect กลับ frontend พร้อม token
    const params = new URLSearchParams({
      token,
      user: JSON.stringify(safeUser),
    });

    res.redirect(`${LINE_CONFIG.frontendUrl}/login?line_success=true&${params.toString()}`);

  } catch (err) {
    console.error('LINE callback error:', err);
    res.redirect(`${LINE_CONFIG.frontendUrl}/login?error=line_server_error`);
  }
});

// 3. LIFF Login — เปิด MyMonth ภายใน LINE
router.post('/liff-login', async (req, res) => {
  try {
    const { lineUserId, displayName, pictureUrl } = req.body;

    if (!lineUserId) {
      return res.status(400).json({ error: 'Missing lineUserId' });
    }

    // หา user ที่มี line_user_id ตรงกัน
    let user = db.findOne('users', u => u.line_user_id === lineUserId);

    if (!user) {
      // สร้าง user ใหม่
      const lineEmail = `line_${lineUserId}@line.mymonth.app`;

      // สร้างห้องใหม่
      const newRoomCode = generateRoomCode();
      db.insert('rooms', {
        room_code: newRoomCode,
        room_name: `ห้องส่วนตัว (${displayName})`,
        created_by: lineEmail,
      });

      user = db.insert('users', {
        email: lineEmail,
        password_hash: crypto.randomUUID(),
        full_name: displayName || 'User',
        role: 'Admin',
        room_code: newRoomCode,
        promptpay_id: '',
        avatar_url: pictureUrl || '',
        line_user_id: lineUserId,
      });
    } else {
      // อัพเดทข้อมูล LINE
      db.update('users', user.id, {
        avatar_url: pictureUrl || user.avatar_url,
        full_name: displayName || user.full_name,
      });
    }

    // สร้าง JWT token
    const token = generateToken(user);
    const { password_hash: _, ...safeUser } = user;

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('LIFF login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 4. LINE Login status check
router.get('/status', (req, res) => {
  const { channelId } = LINE_CONFIG.channelLogin;
  res.json({
    configured: !!channelId,
    loginUrl: channelId ? '/api/line/login' : null,
  });
});

export default router;
