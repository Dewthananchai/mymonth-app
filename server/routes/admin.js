import express from 'express';
import { db } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware: Admin only
function adminOnly(req, res, next) {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'สิทธิ์เฉพาะ Admin เท่านั้น' });
  }
  next();
}

// 1. Get Admin Stats
router.get('/stats', authenticateToken, adminOnly, (req, res) => {
  try {
    const { month } = req.query;
    const roomCode = req.user.room_code;

    const members = db.find('users', u => u.room_code === roomCode);
    const expenses = db.find('expenses', e => e.room_code === roomCode && (!month || e.expense_date.startsWith(month)));
    const budgets = db.find('budgets', b => b.room_code === roomCode && (!month || b.month_year === month));
    const settlements = db.find('settlements', s => s.room_code === roomCode && (!month || s.month === month));
    const notifications = db.find('notifications', n => n.room_code === roomCode);

    let totalExpenses = 0;
    let totalShared = 0;
    let totalPersonal = 0;
    expenses.forEach(e => {
      totalExpenses += e.amount;
      if (e.expense_type === 'shared') totalShared += e.amount;
      else totalPersonal += e.amount;
    });

    let totalBudget = 0;
    budgets.forEach(b => { totalBudget += b.budget_amount || 0; });

    // Recent activity
    const recentExpenses = expenses
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map(e => ({
        icon: e.category_icon,
        title: `${e.category_name} — ${e.amount.toLocaleString()} ฿`,
        message: `${e.creator_name} บันทึก${e.expense_type === 'shared' ? 'รายจ่ายร่วม' : 'รายจ่ายส่วนตัว'}`,
        timestamp: e.createdAt
      }));

    // Monthly history for comparison chart (last 6 months)
    const allExpenses = db.find('expenses', e => e.room_code === roomCode);
    const monthMap = {};
    allExpenses.forEach(exp => {
      const d = new Date(exp.expense_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap[key] = (monthMap[key] || 0) + exp.amount;
    });
    const monthlyHistory = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, total]) => ({ month, total }));

    const stats = {
      memberCount: members.length,
      totalExpenses,
      totalShared,
      totalPersonal,
      expenseCount: expenses.length,
      totalBudget,
      totalSpent: totalShared + totalPersonal,
      settlementCount: settlements.length,
      notificationCount: notifications.length,
    };

    res.json({ stats, activity: recentExpenses, monthlyHistory });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลสถิติได้' });
  }
});

// 2. Export All Data (backup)
router.get('/export', authenticateToken, adminOnly, (req, res) => {
  try {
    const roomCode = req.user.room_code;
    const exportData = {
      exported_at: new Date().toISOString(),
      room_code: roomCode,
      members: db.find('users', u => u.room_code === roomCode).map(u => {
        const { password_hash, ...safe } = u;
        return safe;
      }),
      expenses: db.find('expenses', e => e.room_code === roomCode),
      expense_splits: db.find('expense_splits', s => {
        const exp = db.findById('expenses', s.expense_id);
        return exp && exp.room_code === roomCode;
      }),
      budgets: db.find('budgets', b => b.room_code === roomCode),
      budget_histories: db.find('budget_histories', b => b.room_code === roomCode),
      settlements: db.find('settlements', s => s.room_code === roomCode),
      notifications: db.find('notifications', n => n.room_code === roomCode),
      categories: db.find('categories', c => c.room_code === roomCode || c.room_code === '_global'),
    };

    res.json(exportData);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'ไม่สามารถส่งออกข้อมูลได้' });
  }
});

// 3. Clear Month Data
router.delete('/clear-month', authenticateToken, adminOnly, (req, res) => {
  try {
    const { month } = req.query;
    if (!month) {
      return res.status(400).json({ error: 'กรุณาระบุเดือน' });
    }

    const roomCode = req.user.room_code;
    let deletedCount = 0;

    // Delete expenses for the month
    const expenses = db.find('expenses', e => e.room_code === roomCode && e.expense_date.startsWith(month));
    expenses.forEach(e => {
      db.delete('expenses', e.id);
      db.deleteMany('expense_splits', s => s.expense_id === e.id);
      deletedCount++;
    });

    // Delete settlements for the month
    db.deleteMany('settlements', s => s.room_code === roomCode && s.month === month);

    // Delete budgets for the month
    db.deleteMany('budgets', b => b.room_code === roomCode && b.month_year === month);

    // Delete budget histories for the month
    db.deleteMany('budget_histories', b => b.room_code === roomCode && b.changed_at?.startsWith(month));

    res.json({ message: `ลบข้อมูลเดือน ${month} สำเร็จ (${deletedCount} รายการ)` });
  } catch (err) {
    console.error('Clear month error:', err);
    res.status(500).json({ error: 'ไม่สามารถลบข้อมูลได้' });
  }
});

// 4. Get All Rooms (Super Admin only)
router.get('/rooms', authenticateToken, adminOnly, (req, res) => {
  try {
    const rooms = db.find('rooms');
    const roomsData = rooms.map(room => {
      const members = db.find('users', u => u.room_code === room.room_code);
      const expenses = db.find('expenses', e => e.room_code === room.room_code);
      let totalExpenses = 0;
      expenses.forEach(e => { totalExpenses += e.amount; });
      return {
        ...room,
        memberCount: members.length,
        expenseCount: expenses.length,
        totalExpenses
      };
    });
    res.json(roomsData);
  } catch (err) {
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลห้องได้' });
  }
});

export default router;
