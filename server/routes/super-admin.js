import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware: SuperAdmin only
function superAdminOnly(req, res, next) {
  if (req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ error: 'สิทธิ์เฉพาะ Super Admin เท่านั้น' });
  }
  next();
}

// 1. Super Admin Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' });
    }

    const user = db.findOne('users', u => u.email.toLowerCase() === email.toLowerCase() && u.role === 'SuperAdmin');
    if (!user) {
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง (ต้องเป็น Super Admin)' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    const token = generateToken(user);
    const { password_hash: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Super Admin login error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// 2. Get current Super Admin
router.get('/me', authenticateToken, superAdminOnly, (req, res) => {
  const { password_hash: _, ...safeUser } = req.user;
  res.json({ user: safeUser });
});

// 3. System Stats
router.get('/stats', authenticateToken, superAdminOnly, (req, res) => {
  try {
    const users = db.find('users');
    const rooms = db.find('rooms');
    const expenses = db.find('expenses');
    let totalAmount = 0;
    expenses.forEach(e => { totalAmount += e.amount; });

    // Recent activity (last 10 expenses)
    const recentActivity = expenses
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map(e => ({
        icon: e.category_icon,
        title: `${e.category_name} — ${e.amount.toLocaleString()} ฿`,
        message: `${e.creator_name} ในห้อง ${e.room_code}`,
        time: e.expense_date
      }));

    res.json({
      totalUsers: users.length,
      totalRooms: rooms.length,
      totalExpenses: totalAmount,
      totalExpenseItems: expenses.length,
      recentActivity
    });
  } catch (err) {
    console.error('Super admin stats error:', err);
    res.status(500).json({ error: 'ไม่สามารถดึงสถิติได้' });
  }
});

// 4. Get All Rooms
router.get('/rooms', authenticateToken, superAdminOnly, (req, res) => {
  try {
    const rooms = db.find('rooms');
    const roomsData = rooms.map(room => {
      const members = db.find('users', u => u.room_code === room.room_code);
      const expenses = db.find('expenses', e => e.room_code === room.room_code);
      let total = 0;
      expenses.forEach(e => { total += e.amount; });
      return {
        ...room,
        memberCount: members.length,
        expenseCount: expenses.length,
        totalExpenses: total
      };
    });
    res.json(roomsData);
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// 5. Get All Users
router.get('/users', authenticateToken, superAdminOnly, (req, res) => {
  try {
    const users = db.find('users').map(u => {
      const { password_hash, ...safe } = u;
      return safe;
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// 6. Delete User
router.delete('/users/:id', authenticateToken, superAdminOnly, (req, res) => {
  try {
    const { id } = req.params;
    const user = db.findById('users', id);
    if (!user) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    if (user.role === 'SuperAdmin') return res.status(400).json({ error: 'ไม่สามารถลบ Super Admin ได้' });

    db.delete('users', id);
    res.json({ message: `ลบผู้ใช้ ${user.full_name} สำเร็จ` });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// 6.5. Get Room Detail with Members
router.get('/rooms/:roomCode', authenticateToken, superAdminOnly, (req, res) => {
  try {
    const { roomCode } = req.params;
    const room = db.findOne('rooms', r => r.room_code === roomCode);
    if (!room) return res.status(404).json({ error: 'ไม่พบห้องนี้ในระบบ' });

    const members = db.find('users', u => u.room_code === roomCode).map(u => {
      const { password_hash, ...safe } = u;
      return safe;
    });

    const expenses = db.find('expenses', e => e.room_code === roomCode);
    let totalAmount = 0;
    expenses.forEach(e => { totalAmount += e.amount; });

    res.json({ room, members, expenses: expenses.length, totalExpenses: totalAmount });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// 7. Delete Room (Super Admin)
router.delete('/rooms/:roomCode', authenticateToken, superAdminOnly, (req, res) => {
  try {
    const { roomCode } = req.params;
    const room = db.findOne('rooms', r => r.room_code === roomCode);
    if (!room) return res.status(404).json({ error: 'ไม่พบห้องนี้ในระบบ' });

    // Prevent deleting Super Admin's own room
    if (room.room_code === 'SYSADMIN') {
      return res.status(400).json({ error: 'ไม่สามารถลบห้อง SYSADMIN ได้' });
    }

    // Delete all room data
    const expenses = db.find('expenses', e => e.room_code === roomCode);
    expenses.forEach(e => db.deleteMany('expense_splits', s => s.expense_id === e.id));
    const deletedExpenses = db.deleteMany('expenses', e => e.room_code === roomCode);
    const deletedBudgets = db.deleteMany('budgets', b => b.room_code === roomCode);
    const deletedBudgetHist = db.deleteMany('budget_histories', b => b.room_code === roomCode);
    const deletedSettlements = db.deleteMany('settlements', s => s.room_code === roomCode);
    const deletedNotifications = db.deleteMany('notifications', n => n.room_code === roomCode);

    // Remove all members from the room (set room_code to null)
    const members = db.find('users', u => u.room_code === roomCode);
    members.forEach(m => db.update('users', m.id, { room_code: null }));

    // Delete the room
    db.delete('rooms', room.id);

    res.json({
      message: `ลบห้อง ${room.room_name} (${roomCode}) สำเร็จ`,
      deleted: {
        expenses: deletedExpenses,
        budgets: deletedBudgets,
        settlements: deletedSettlements,
        notifications: deletedNotifications,
        members: members.length
      }
    });
  } catch (err) {
    console.error('Super admin delete room error:', err);
    res.status(500).json({ error: 'ไม่สามารถลบห้องได้' });
  }
});

// 7.5. Add Member to Room
router.post('/rooms/:roomCode/members', authenticateToken, superAdminOnly, async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { full_name, email, password, role } = req.body;
    if (!full_name || !email || !password) return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบ' });
    const room = db.findOne('rooms', r => r.room_code === roomCode);
    if (!room) return res.status(404).json({ error: 'ไม่พบห้อง' });
    const existing = db.findOne('users', u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) return res.status(400).json({ error: 'อีเมลนี้มีผู้ใช้แล้ว' });
    const password_hash = await bcrypt.hash(password, 10);
    const newUser = db.insert('users', {
      email: email.toLowerCase(), password_hash, full_name,
      role: role || 'Member', room_code: roomCode, avatar_url: '', promptpay_id: ''
    });
    const { password_hash: _, ...safe } = newUser;
    res.json({ message: 'เพิ่มสมาชิกสำเร็จ', user: safe });
  } catch (err) { res.status(500).json({ error: 'เกิดข้อผิดพลาด' }); }
});

// 7.6. Update Member
router.put('/rooms/:roomCode/members/:userId', authenticateToken, superAdminOnly, async (req, res) => {
  try {
    const { userId } = req.params;
    const { full_name, email, role, promptpay_id, password } = req.body;
    const user = db.findById('users', userId);
    if (!user) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    const updates = {};
    if (full_name) updates.full_name = full_name;
    if (email) updates.email = email.toLowerCase();
    if (role) updates.role = role;
    if (promptpay_id !== undefined) updates.promptpay_id = promptpay_id;
    if (password) updates.password_hash = await bcrypt.hash(password, 10);
    db.update('users', userId, updates);
    res.json({ message: 'อัปเดตสำเร็จ' });
  } catch (err) { res.status(500).json({ error: 'เกิดข้อผิดพลาด' }); }
});

// 7.7. Delete Member from Room
router.delete('/rooms/:roomCode/members/:userId', authenticateToken, superAdminOnly, (req, res) => {
  try {
    const { userId } = req.params;
    const user = db.findById('users', userId);
    if (!user) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    if (user.role === 'SuperAdmin') return res.status(400).json({ error: 'ไม่สามารถลบ Super Admin ได้' });
    db.update('users', userId, { room_code: null });
    res.json({ message: `นำ ${user.full_name} ออกจากห้องสำเร็จ` });
  } catch (err) { res.status(500).json({ error: 'เกิดข้อผิดพลาด' }); }
});

// 8. Seed Super Admin (run once)
router.post('/seed-super-admin', async (req, res) => {
  try {
    const existing = db.findOne('users', u => u.role === 'SuperAdmin');
    if (existing) {
      return res.status(400).json({ error: 'Super Admin มีอยู่แล้ว' });
    }

    const email = 'superadmin@mymonth.app';
    const password = 'Admin@MyMonth2026';
    const password_hash = await bcrypt.hash(password, 10);

    const newRoomCode = 'SYSADMIN';
    db.insert('rooms', {
      room_code: newRoomCode,
      room_name: 'System Admin Room',
      created_by: email
    });

    db.insert('users', {
      email,
      password_hash,
      full_name: 'Super Admin',
      role: 'SuperAdmin',
      room_code: newRoomCode,
      avatar_url: '',
      promptpay_id: ''
    });

    res.json({
      message: 'สร้าง Super Admin สำเร็จ',
      credentials: { email, password }
    });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

export default router;
