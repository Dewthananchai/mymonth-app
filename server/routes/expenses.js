import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'bill-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const router = express.Router();

// Helper to attach splits to expense object
function attachSplits(expense) {
  const splits = db.find('expense_splits', s => s.expense_id === expense.id);
  const splitsWithUser = splits.map(s => {
    const user = db.findById('users', s.user_id);
    return {
      ...s,
      user_name: user ? user.full_name : 'สมาชิก',
      user_avatar: user ? user.avatar_url : null
    };
  });
  return {
    ...expense,
    splits: splitsWithUser
  };
}

// 1. Get Expenses with Filters
router.get('/', authenticateToken, (req, res) => {
  try {
    const { month, type, category_id, user_id, search } = req.query;
    const currentUserId = req.user.id;
    const isAdmin = req.user.role === 'Admin';
    const roomCode = req.user.room_code;

    let expenses = db.find('expenses', exp => {
      // Must match user's room
      if (exp.room_code !== roomCode) return false;

      // Access Control: Personal expenses only visible to creator (unless Admin)
      if (exp.expense_type === 'personal') {
        if (!isAdmin && exp.created_by !== currentUserId) {
          return false;
        }
      }

      // Filter by month (YYYY-MM)
      if (month && !exp.expense_date.startsWith(month)) {
        return false;
      }

      // Filter by type (personal / shared)
      if (type && type !== 'all' && exp.expense_type !== type) {
        return false;
      }

      // Filter by category
      if (category_id && category_id !== 'all' && exp.category_id !== category_id) {
        return false;
      }

      // Filter by user
      if (user_id && user_id !== 'all' && exp.created_by !== user_id) {
        return false;
      }

      // Filter by search query (note, category_name, tags)
      if (search && search.trim() !== '') {
        const query = search.toLowerCase();
        const noteMatch = (exp.note || '').toLowerCase().includes(query);
        const catMatch = (exp.category_name || '').toLowerCase().includes(query);
        const tagsMatch = (exp.tags || []).some(t => t.toLowerCase().includes(query));
        const amountMatch = exp.amount.toString().includes(query);
        if (!noteMatch && !catMatch && !tagsMatch && !amountMatch) {
          return false;
        }
      }

      return true;
    });

    // Sort descending by date
    expenses.sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date) || b.createdAt.localeCompare(a.createdAt));

    const populated = expenses.map(attachSplits);

    // Summary calculations
    let totalPersonal = 0;
    let totalShared = 0;
    let myPersonalTotal = 0;

    populated.forEach(exp => {
      if (exp.expense_type === 'personal') {
        totalPersonal += exp.amount;
        if (exp.created_by === currentUserId) {
          myPersonalTotal += exp.amount;
        }
      } else {
        totalShared += exp.amount;
      }
    });

    res.json({
      expenses: populated,
      summary: {
        totalPersonal,
        totalShared,
        totalAll: totalPersonal + totalShared,
        myPersonalTotal
      }
    });
  } catch (err) {
    console.error('Fetch expenses error:', err);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลรายจ่ายได้' });
  }
});

// 2. Create Expense
router.post('/', authenticateToken, upload.single('bill_image'), (req, res) => {
  try {
    const {
      category_id,
      amount,
      expense_date,
      payment_method,
      expense_type,
      payer_id,
      note,
      tags,
      is_recurring,
      splits // JSON string or array
    } = req.body;

    if (!category_id || !amount || !expense_date || !expense_type) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลสำคัญให้ครบถ้วน' });
    }

    const category = db.findById('categories', category_id) || { name: 'อื่นๆ', icon: '➕' };
    const numAmount = parseFloat(amount);
    const parsedTags = typeof tags === 'string' ? JSON.parse(tags || '[]') : (tags || []);
    const isRecurring = is_recurring === 'true' || is_recurring === true;
    const actualPayerId = payer_id || req.user.id;
    const payerUser = db.findById('users', actualPayerId) || req.user;

    const newExpense = db.insert('expenses', {
      room_code: req.user.room_code,
      category_id,
      category_name: category.name,
      category_icon: category.icon,
      amount: numAmount,
      expense_date,
      payment_method: payment_method || 'bank_transfer',
      expense_type, // 'personal' or 'shared'
      note: note || '',
      tags: parsedTags,
      bill_image_url: req.file ? `/uploads/${req.file.filename}` : null,
      created_by: actualPayerId,
      creator_name: payerUser.full_name,
      is_recurring: isRecurring
    });

    // Handle Splits for Shared Expense
    if (expense_type === 'shared') {
      let parsedSplits = [];
      if (typeof splits === 'string') {
        try {
          parsedSplits = JSON.parse(splits);
        } catch (e) {
          parsedSplits = [];
        }
      } else if (Array.isArray(splits)) {
        parsedSplits = splits;
      }

      // If no splits provided, default to even split among all room members
      if (!parsedSplits || parsedSplits.length === 0) {
        const members = db.find('users', u => u.room_code === req.user.room_code);
        const count = members.length || 1;
        const equalPct = 100 / count;
        const equalAmt = numAmount / count;

        parsedSplits = members.map(m => ({
          user_id: m.id,
          percentage: equalPct,
          share_amount: equalAmt,
          is_paid: m.id === actualPayerId
        }));
      }

      parsedSplits.forEach(sp => {
        db.insert('expense_splits', {
          expense_id: newExpense.id,
          user_id: sp.user_id,
          percentage: parseFloat(sp.percentage || 0),
          share_amount: parseFloat(sp.share_amount || 0),
          is_paid: sp.is_paid !== undefined ? sp.is_paid : (sp.user_id === actualPayerId),
          paid_at: sp.is_paid ? new Date().toISOString() : null
        });
      });
    }

    // Trigger Notification for Room Members
    if (expense_type === 'shared') {
      // Parse splits for notification if it's still a string
      let notifSplits = [];
      if (typeof splits === 'string') {
        try { notifSplits = JSON.parse(splits); } catch (e) { notifSplits = []; }
      } else if (Array.isArray(splits)) {
        notifSplits = splits;
      }

      const roomMembers = db.find('users', u => u.room_code === req.user.room_code && u.id !== req.user.id);
      roomMembers.forEach(member => {
        const memberSplit = notifSplits.find(s => s.user_id === member.id);
        const shareAmount = memberSplit ? (parseFloat(memberSplit.share_amount) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '0';
        db.insert('notifications', {
          room_code: req.user.room_code,
          user_id: member.id,
          title: `🟢 รายจ่ายร่วมใหม่: ${category.icon} ${category.name}`,
          message: `${payerUser.full_name} บันทึกรายจ่ายร่วม ${numAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿ (ส่วนแบ่ง: ${shareAmount} ฿)`,
          type: 'expense_shared',
          is_read: false
        });
      });
    }
    // Personal expenses are private — no notification sent to other room members

    const populated = attachSplits(newExpense);
    res.status(201).json(populated);
  } catch (err) {
    console.error('Create expense error:', err);
    res.status(500).json({ error: 'บันทึกรายจ่ายไม่สำเร็จ' });
  }
});

// 3. Update Expense
router.put('/:id', authenticateToken, upload.single('bill_image'), (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.findById('expenses', id);
    if (!existing) {
      return res.status(404).json({ error: 'ไม่พบรายการรายจ่าย' });
    }

    // Check permission: Only Admin or Creator can edit
    if (req.user.role !== 'Admin' && existing.created_by !== req.user.id) {
      return res.status(403).json({ error: 'คุณไม่มีสิทธิ์แก้ไขรายการนี้' });
    }

    const {
      category_id,
      amount,
      expense_date,
      payment_method,
      expense_type,
      payer_id,
      note,
      tags,
      is_recurring,
      splits
    } = req.body;

    const updates = {};
    if (category_id) {
      const cat = db.findById('categories', category_id);
      updates.category_id = category_id;
      if (cat) {
        updates.category_name = cat.name;
        updates.category_icon = cat.icon;
      }
    }

    if (amount !== undefined) updates.amount = parseFloat(amount);
    if (expense_date) updates.expense_date = expense_date;
    if (payment_method) updates.payment_method = payment_method;
    if (expense_type) updates.expense_type = expense_type;
    if (note !== undefined) updates.note = note;
    if (tags !== undefined) {
      updates.tags = typeof tags === 'string' ? JSON.parse(tags || '[]') : tags;
    }
    if (is_recurring !== undefined) {
      updates.is_recurring = is_recurring === 'true' || is_recurring === true;
    }
    if (req.file) {
      updates.bill_image_url = `/uploads/${req.file.filename}`;
    }
    if (payer_id) {
      const payer = db.findById('users', payer_id);
      updates.created_by = payer_id;
      if (payer) updates.creator_name = payer.full_name;
    }

    const updated = db.update('expenses', id, updates);

    // Update splits if shared
    if (updates.expense_type === 'shared' || (!updates.expense_type && existing.expense_type === 'shared')) {
      if (splits) {
        // Delete old splits
        db.deleteMany('expense_splits', s => s.expense_id === id);

        const parsedSplits = typeof splits === 'string' ? JSON.parse(splits) : splits;
        parsedSplits.forEach(sp => {
          db.insert('expense_splits', {
            expense_id: id,
            user_id: sp.user_id,
            percentage: parseFloat(sp.percentage || 0),
            share_amount: parseFloat(sp.share_amount || 0),
            is_paid: !!sp.is_paid,
            paid_at: sp.is_paid ? new Date().toISOString() : null
          });
        });
      }
    } else if (updates.expense_type === 'personal') {
      db.deleteMany('expense_splits', s => s.expense_id === id);
    }

    const populated = attachSplits(updated);
    res.json(populated);
  } catch (err) {
    console.error('Update expense error:', err);
    res.status(500).json({ error: 'แก้ไขรายการไม่สำเร็จ' });
  }
});

// 4. Delete Single Expense
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.findById('expenses', id);
    if (!existing) {
      return res.status(404).json({ error: 'ไม่พบรายการรายจ่าย' });
    }

    if (req.user.role !== 'Admin' && existing.created_by !== req.user.id) {
      return res.status(403).json({ error: 'คุณไม่มีสิทธิ์ลบรายการนี้' });
    }

    db.delete('expenses', id);
    db.deleteMany('expense_splits', s => s.expense_id === id);

    res.json({ message: 'ลบรายการสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: 'ลบรายการไม่สำเร็จ' });
  }
});

// 5. Batch Delete Expenses (Multi-select delete)
router.post('/batch-delete', authenticateToken, (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'กรุณาระบุรายการที่ต้องการลบ' });
    }

    let deletedCount = 0;
    ids.forEach(id => {
      const existing = db.findById('expenses', id);
      if (existing) {
        if (req.user.role === 'Admin' || existing.created_by === req.user.id) {
          db.delete('expenses', id);
          db.deleteMany('expense_splits', s => s.expense_id === id);
          deletedCount++;
        }
      }
    });

    res.json({ message: `ลบสำเร็จ ${deletedCount} รายการ` });
  } catch (err) {
    res.status(500).json({ error: 'ลบหลายรายการไม่สำเร็จ' });
  }
});

export default router;
