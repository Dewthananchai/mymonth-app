import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../db.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper to generate 8-character Room Code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 1. Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, room_code, promptpay_id } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    const existingUser = db.findOne('users', u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: 'อีเมลนี้ถูกใช้งานในระบบแล้ว' });
    }

    let finalRoomCode = room_code ? room_code.trim().toUpperCase() : null;
    let role = 'Member';

    if (finalRoomCode) {
      const existingRoom = db.findOne('rooms', r => r.room_code === finalRoomCode);
      if (!existingRoom) {
        db.insert('rooms', {
          room_code: finalRoomCode,
          room_name: `ห้อง ${finalRoomCode}`,
          created_by: email
        });
        role = 'Admin';
      }
    } else {
      finalRoomCode = generateRoomCode();
      db.insert('rooms', {
        room_code: finalRoomCode,
        room_name: `ห้องส่วนตัว (${full_name})`,
        created_by: email
      });
      role = 'Admin';
    }

    const password_hash = await bcrypt.hash(password, 10);
    const newUser = db.insert('users', {
      email,
      password_hash,
      full_name,
      role,
      room_code: finalRoomCode,
      promptpay_id: promptpay_id || '',
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(full_name)}`
    });

    const token = generateToken(newUser);
    const { password_hash: _, ...safeUser } = newUser;

    res.status(201).json({
      message: 'สมัครสมาชิกสำเร็จ',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' });
  }
});

// 2. Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, room_code } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' });
    }

    const user = db.findOne('users', u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    const token = generateToken(user);
    const { password_hash: _, ...safeUser } = user;

    res.json({
      message: 'เข้าสู่ระบบสำเร็จ',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
  }
});

// 3. Google OAuth Login
// Production: Use Google Identity Services (GIS) with VITE_GOOGLE_CLIENT_ID
router.post('/google-login', async (req, res) => {
  try {
    const { googleId, email, name, avatar } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'กรุณาเข้าสู่ระบบด้วย Google' });
    }

    let user = db.findOne('users', u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      // New Google user — auto-create with a new room
      const newRoomCode = generateRoomCode();
      db.insert('rooms', {
        room_code: newRoomCode,
        room_name: `ห้องส่วนตัว (${name || 'Google User'})`,
        created_by: email
      });

      user = db.insert('users', {
        email,
        password_hash: await bcrypt.hash(crypto.randomUUID(), 10),
        full_name: name || 'Google User',
        role: 'Admin',
        room_code: newRoomCode,
        avatar_url: avatar || '',
        promptpay_id: '',
        line_user_id: ''
      });
    }

    const token = generateToken(user);
    const { password_hash: _, ...safeUser } = user;

    res.json({
      message: 'เข้าสู่ระบบด้วย Google สำเร็จ',
      token,
      user: safeUser
    });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google' });
  }
});

// 5. Join Room by Code
router.post('/join-room', authenticateToken, (req, res) => {
  try {
    const { room_code } = req.body;
    if (!room_code) {
      return res.status(400).json({ error: 'กรุณาระบุรหัสห้อง' });
    }

    const cleanCode = room_code.trim().toUpperCase();
    let room = db.findOne('rooms', r => r.room_code === cleanCode);

    if (!room) {
      room = db.insert('rooms', {
        room_code: cleanCode,
        room_name: `ห้อง ${cleanCode}`,
        created_by: req.user.email
      });
    }

    const updatedUser = db.update('users', req.user.id, { room_code: cleanCode });
    const token = generateToken(updatedUser);
    const { password_hash: _, ...safeUser } = updatedUser;

    res.json({
      message: `เข้าร่วมห้อง ${cleanCode} สำเร็จ`,
      token,
      user: safeUser
    });
  } catch (err) {
    res.status(500).json({ error: 'เข้าร่วมห้องไม่สำเร็จ' });
  }
});

// 6. Get Current User Profile & Room Members
router.get('/me', authenticateToken, (req, res) => {
  const { password_hash: _, ...safeUser } = req.user;
  const roomMembers = db.find('users', u => u.room_code === req.user.room_code).map(u => ({
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    role: u.role,
    avatar_url: u.avatar_url,
    promptpay_id: u.promptpay_id
  }));

  const room = db.findOne('rooms', r => r.room_code === req.user.room_code) || {
    room_code: req.user.room_code,
    room_name: `ห้อง ${req.user.room_code}`
  };

  res.json({
    user: safeUser,
    room,
    roomMembers
  });
});

// 7.5 Generate LINE Link Code
router.post('/line-link-code', authenticateToken, (req, res) => {
  try {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    db.update('users', req.user.id, { line_link_code: code });
    res.json({ message: 'สร้างโค้ดเชื่อมต่อ LINE สำเร็จ', code });
  } catch (err) {
    res.status(500).json({ error: 'สร้างโค้ดไม่สำเร็จ' });
  }
});

// 7.6 Connect LINE Account
router.post('/connect-line', authenticateToken, (req, res) => {
  try {
    const { line_user_id } = req.body;
    if (!line_user_id) {
      return res.status(400).json({ error: 'ไม่ได้รับ LINE User ID' });
    }

    // ตรวจสอบว่า LINE ID นี้ถูกใช้โดยคนอื่นหรือยัง
    const existing = db.findOne('users', u => u.line_user_id === line_user_id && u.id !== req.user.id);
    if (existing) {
      return res.status(400).json({ error: 'บัญชี LINE นี้ถูกเชื่อมกับผู้ใช้อื่นแล้ว' });
    }

    const updatedUser = db.update('users', req.user.id, { line_user_id });
    const { password_hash: _, ...safeUser } = updatedUser;

    res.json({ message: 'เชื่อมต่อ LINE สำเร็จ', user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'เชื่อมต่อ LINE ไม่สำเร็จ' });
  }
});

// 7. Update Own Profile
router.put('/profile', authenticateToken, (req, res) => {
  try {
    const { full_name, promptpay_id, avatar_url, room_name } = req.body;
    const updates = {};
    if (full_name) updates.full_name = full_name;
    if (promptpay_id !== undefined) updates.promptpay_id = promptpay_id;
    if (avatar_url) updates.avatar_url = avatar_url;

    const updatedUser = db.update('users', req.user.id, updates);

    if (room_name && req.user.role === 'Admin') {
      const room = db.findOne('rooms', r => r.room_code === req.user.room_code);
      if (room) {
        db.update('rooms', room.id, { room_name });
      }
    }

    const { password_hash: _, ...safeUser } = updatedUser;
    res.json({
      message: 'อัปเดตข้อมูลส่วนตัวสำเร็จ',
      user: safeUser
    });
  } catch (err) {
    res.status(500).json({ error: 'อัปเดตข้อมูลไม่สำเร็จ' });
  }
});

// ==========================================
// 8. ADMIN USER MANAGEMENT ROUTES (New!)
// ==========================================

// 8.1 Admin: Create/Add User to Room
router.post('/admin/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'สิทธิ์เฉพาะ Admin เท่านั้น' });
    }

    const { full_name, email, password, role, promptpay_id } = req.body;
    if (!full_name || !email) {
      return res.status(400).json({ error: 'กรุณากรอกชื่อและอีเมล' });
    }

    const existing = db.findOne('users', u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'อีเมลนี้มีอยู่ในระบบแล้ว' });
    }

    const password_hash = await bcrypt.hash(password || '123456', 10);
    const newUser = db.insert('users', {
      email,
      password_hash,
      full_name,
      role: role || 'Member',
      room_code: req.user.room_code,
      promptpay_id: promptpay_id || '',
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(full_name)}`,
      line_user_id: ''
    });

    const { password_hash: _, ...safeUser } = newUser;
    res.status(201).json({ message: 'เพิ่มผู้ใช้งานสำเร็จ', user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'ไม่สามารถเพิ่มผู้ใช้งานได้' });
  }
});

// 8.2 Admin: Edit/Update Member info
router.put('/admin/users/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'สิทธิ์เฉพาะ Admin เท่านั้น' });
    }

    const { id } = req.params;
    const targetUser = db.findById('users', id);
    if (!targetUser) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้งานนี้' });
    }

    if (targetUser.room_code !== req.user.room_code) {
      return res.status(403).json({ error: 'ผู้ใช้งานไม่ได้อยู่ในห้องเดียวกัน' });
    }

    const { full_name, email, role, promptpay_id, password } = req.body;
    const updates = {};
    if (full_name) updates.full_name = full_name;
    if (email) updates.email = email;
    if (role) updates.role = role;
    if (promptpay_id !== undefined) updates.promptpay_id = promptpay_id;
    if (password) {
      updates.password_hash = await bcrypt.hash(password, 10);
    }

    const updated = db.update('users', id, updates);
    const { password_hash: _, ...safeUser } = updated;

    res.json({ message: 'แก้ไขข้อมูลผู้ใช้งานสำเร็จ', user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'แก้ไขผู้ใช้งานไม่สำเร็จ' });
  }
});

// 8.3 Admin: Delete User from Room
router.delete('/admin/users/:id', authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'สิทธิ์เฉพาะ Admin เท่านั้น' });
    }

    const { id } = req.params;
    if (id === req.user.id) {
      return res.status(400).json({ error: 'ไม่สามารถลบบัญชีตัวเองได้' });
    }

    const targetUser = db.findById('users', id);
    if (!targetUser) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้งาน' });
    }

    if (targetUser.room_code !== req.user.room_code) {
      return res.status(403).json({ error: 'ผู้ใช้งานไม่ได้อยู่ในห้องนี้' });
    }

    db.delete('users', id);
    res.json({ message: `ลบผู้ใช้งาน ${targetUser.full_name} ออกจากห้องเรียบร้อยแล้ว` });
  } catch (err) {
    res.status(500).json({ error: 'ลบผู้ใช้งานไม่สำเร็จ' });
  }
});

export default router;
