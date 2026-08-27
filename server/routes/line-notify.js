// LINE Notify Integration
// =======================
// ส่งการแจ้งเตือนผ่าน LINE Notify ไปยังผู้ใช้
// วิธีใช้:
// 1. ไปที่ https://notify-bot.line.me/
// 2. สร้าง Token สำหรับ MyMonth app
// 3. ใส่ LINE_NOTIFY_TOKEN ใน .env

import express from 'express';
import LINE_CONFIG from '../config/line.js';
import { db } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ส่ง LINE Notify
async function sendLineNotify(message, image = null) {
  const { channelAccessToken } = LINE_CONFIG.notify;
  if (!channelAccessToken) {
    console.log('⚠️ LINE Notify not configured, skipping notification');
    return false;
  }

  try {
    const body = new URLSearchParams({ message });

    if (image) {
      body.append('imageThumbnail', image);
      body.append('imageFullsize', image);
    }

    const response = await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const result = await response.json();
    return result.status === 200;
  } catch (err) {
    console.error('LINE Notify error:', err);
    return false;
  }
}

// ส่งแจ้งเตือนเมื่อมีรายจ่ายใหม่
function formatExpenseNotification(expense, creatorName, splitInfo = null) {
  const type = expense.type === 'shared' ? '🟢 รายจ่ายร่วม' : '🔵 รายจ่ายส่วนตัว';
  const category = expense.category_icon || '💰';
  const amount = Number(expense.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 });

  let msg = `${type} ${category} ${expense.description}\n`;
  msg += `👤 ${creatorName} บันทึก ${amount} ฿`;
  msg += `\n📅 ${new Date(expense.expense_date).toLocaleDateString('th-TH')}`;

  if (splitInfo) {
    msg += `\n📊 ส่วนแบ่ง: ${splitInfo}`;
  }

  if (expense.note) {
    msg += `\n📝 ${expense.note}`;
  }

  return msg;
}

// ส่งแจ้งเตือนรายจ่าย
router.post('/notify-expense', authenticateToken, async (req, res) => {
  try {
    const { expense, splits } = req.body;

    // หาสมาชิกในห้องที่มี line_user_id
    const roomMembers = db.find('users', u => u.room_code === req.user.room_code);
    const lineMembers = roomMembers.filter(m => m.line_user_id && m.id !== req.user.id);

    if (lineMembers.length === 0) {
      return res.json({ message: 'ไม่มีสมาชิกที่เชื่อม LINE', sent: 0 });
    }

    // สร้างข้อความ
    let splitInfo = null;
    if (splits && splits.length > 0) {
      splitInfo = splits.map(s => {
        const member = db.findById('users', s.user_id);
        return `${member?.full_name || 'Unknown'}: ${Number(s.amount).toLocaleString()} ฿`;
      }).join(', ');
    }

    const message = formatExpenseNotification(expense, req.user.full_name, splitInfo);

    // ส่งไปยังสมาชิกทุกคนที่มี LINE
    let sentCount = 0;
    for (const member of lineMembers) {
      const success = await sendLineNotify(message);
      if (success) sentCount++;
    }

    res.json({
      message: `ส่ง LINE Notify สำเร็จ ${sentCount}/${lineMembers.length} คน`,
      sent: sentCount,
    });
  } catch (err) {
    console.error('LINE notify-expense error:', err);
    res.status(500).json({ error: 'ส่ง LINE Notify ไม่สำเร็จ' });
  }
});

// ทดสอบส่ง LINE Notify (สำหรับ admin)
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const message = `🧪 MyMonth LINE Notify Test\n\n👤 ${req.user.full_name}\n📅 ${new Date().toLocaleDateString('th-TH')}\n✅ การเชื่อมต่อ LINE สำเร็จ!`;

    const success = await sendLineNotify(message);

    if (success) {
      res.json({ message: '✅ ส่ง LINE Notify สำเร็จ!' });
    } else {
      res.status(500).json({ error: '❌ ส่งไม่สำเร็จ กรุณาตรวจสอบ LINE_NOTIFY_TOKEN' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// สถานะ LINE Notify
router.get('/status', (req, res) => {
  const { channelAccessToken } = LINE_CONFIG.notify;
  res.json({
    configured: !!channelAccessToken,
  });
});

export { sendLineNotify, formatExpenseNotification };
export default router;
