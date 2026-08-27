import express from 'express';
import { db } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/data', authenticateToken, (req, res) => {
  try {
    const { month, type, category_id } = req.query;
    const roomCode = req.user.room_code;
    const currentUserId = req.user.id;
    const isAdmin = req.user.role === 'Admin';

    let expenses = db.find('expenses', exp => {
      if (exp.room_code !== roomCode) return false;
      if (exp.expense_type === 'personal' && !isAdmin && exp.created_by !== currentUserId) {
        return false;
      }
      if (month && !exp.expense_date.startsWith(month)) return false;
      if (type && type !== 'all' && exp.expense_type !== type) return false;
      if (category_id && category_id !== 'all' && exp.category_id !== category_id) return false;
      return true;
    });

    expenses.sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date));

    const exportRows = expenses.map(exp => {
      const splits = db.find('expense_splits', s => s.expense_id === exp.id);
      const splitText = splits.map(s => {
        const u = db.findById('users', s.user_id);
        return `${u ? u.full_name : s.user_id}: ${s.share_amount}฿ (${s.percentage}%)`;
      }).join(' | ');

      return {
        'วันที่': exp.expense_date,
        'ประเภท': exp.expense_type === 'personal' ? 'ส่วนตัว' : 'ร่วม',
        'หมวดหมู่': `${exp.category_icon || ''} ${exp.category_name}`,
        'จำนวนเงิน (บาท)': exp.amount,
        'ผู้จ่าย': exp.creator_name || 'สมาชิก',
        'วิธีชำระเงิน': exp.payment_method,
        'สัดส่วนการแบ่ง': splitText || '-',
        'โน้ต': exp.note || '',
        'แท็ก': (exp.tags || []).join(', ')
      };
    });

    res.json({
      month: month || 'ทั้งหมด',
      totalRecords: exportRows.length,
      data: exportRows
    });
  } catch (err) {
    res.status(500).json({ error: 'ไม่สามารถส่งออกข้อมูลได้' });
  }
});

export default router;
