import express from 'express';
import { db } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get unread and all notifications
router.get('/', authenticateToken, (req, res) => {
  try {
    const list = db.find('notifications', n =>
      n.room_code === req.user.room_code &&
      (n.user_id === req.user.id || !n.user_id)
    );

    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const unreadCount = list.filter(n => !n.is_read).length;

    res.json({
      notifications: list,
      unreadCount
    });
  } catch (err) {
    res.status(500).json({ error: 'ไม่สามารถโหลดการแจ้งเตือนได้' });
  }
});

// Mark single as read
router.put('/:id/read', authenticateToken, (req, res) => {
  try {
    const updated = db.update('notifications', req.params.id, { is_read: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'อัปเดตไม่สำเร็จ' });
  }
});

// Mark all as read
router.post('/mark-all-read', authenticateToken, (req, res) => {
  try {
    const list = db.find('notifications', n =>
      n.room_code === req.user.room_code &&
      (n.user_id === req.user.id || !n.user_id)
    );

    list.forEach(n => {
      db.update('notifications', n.id, { is_read: true });
    });

    res.json({ message: 'อ่านทั้งหมดแล้ว' });
  } catch (err) {
    res.status(500).json({ error: 'ทำรายการไม่สำเร็จ' });
  }
});

export default router;
