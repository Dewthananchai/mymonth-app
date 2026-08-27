import express from 'express';
import { db } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper to get budget status
function getBudgetStatus(spent, budget) {
  if (!budget || budget <= 0) return { status: 'none', label: 'ไม่ได้ตั้งงบ', color: 'slate' };
  const pct = (spent / budget) * 100;
  if (pct >= 100) return { status: 'exhausted', label: 'หมดแล้ว', color: 'red', pct };
  if (pct >= 80) return { status: 'near_limit', label: 'ใกล้เต็ม', color: 'amber', pct };
  return { status: 'ok', label: 'ยังเหลือ', color: 'emerald', pct };
}

// 1. Get Budgets for Month with Actual Spending & Status
router.get('/', authenticateToken, (req, res) => {
  try {
    const { month } = req.query;
    const roomCode = req.user.room_code;
    const currentUserId = req.user.id;
    const targetMonth = month || new Date().toISOString().substring(0, 7);

    // Get categories
    const categories = db.find('categories', c => c.is_system || c.room_code === roomCode);

    // Get budgets for this month & room
    const budgets = db.find('budgets', b => b.room_code === roomCode && b.month_year === targetMonth);

    // Get expenses for actual spending calculation
    const expenses = db.find('expenses', exp => {
      if (exp.room_code !== roomCode) return false;
      if (!exp.expense_date.startsWith(targetMonth)) return false;
      // If personal, only count if it belongs to user
      if (exp.expense_type === 'personal' && exp.created_by !== currentUserId && req.user.role !== 'Admin') {
        return false;
      }
      return true;
    });

    // Calculate actual spending per category
    const spendingMap = {};
    expenses.forEach(exp => {
      spendingMap[exp.category_id] = (spendingMap[exp.category_id] || 0) + exp.amount;
    });

    // Combine category, budget, spending
    let totalBudget = 0;
    let totalSpent = 0;

    const categoryBudgets = categories.map(cat => {
      const budgetItem = budgets.find(b => b.category_id === cat.id);
      const budgetAmount = budgetItem ? budgetItem.budget_amount : 0;
      const actualSpent = spendingMap[cat.id] || 0;
      const remaining = budgetAmount - actualSpent;
      const statusInfo = getBudgetStatus(actualSpent, budgetAmount);

      totalBudget += budgetAmount;
      totalSpent += actualSpent;

      return {
        id: budgetItem ? budgetItem.id : null,
        category_id: cat.id,
        category_name: cat.name,
        category_icon: cat.icon,
        category_color: cat.color,
        budget_amount: budgetAmount,
        actual_spent: actualSpent,
        remaining,
        status: statusInfo.status,
        status_label: statusInfo.label,
        status_color: statusInfo.color,
        percentage_used: budgetAmount > 0 ? Math.min(Math.round((actualSpent / budgetAmount) * 100), 100) : 0,
        budget_type: budgetItem?.budget_type || 'shared'
      };
    });

    const overallStatus = getBudgetStatus(totalSpent, totalBudget);

    res.json({
      month: targetMonth,
      total_budget: totalBudget,
      total_spent: totalSpent,
      total_remaining: totalBudget - totalSpent,
      percentage_used: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
      overall_status: overallStatus,
      items: categoryBudgets
    });
  } catch (err) {
    console.error('Fetch budgets error:', err);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลงบประมาณได้' });
  }
});

// 2. Save / Update Category Budgets with History Log
router.post('/save', authenticateToken, (req, res) => {
  try {
    const { month, items, note } = req.body;
    const roomCode = req.user.room_code;
    const targetMonth = month || new Date().toISOString().substring(0, 7);

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง' });
    }

    // Get current total budget before update
    const existingBudgets = db.find('budgets', b => b.room_code === roomCode && b.month_year === targetMonth);
    const oldTotal = existingBudgets.reduce((acc, b) => acc + (b.budget_amount || 0), 0);

    let newTotal = 0;
    const changeDetails = [];

    items.forEach(item => {
      const numBudget = parseFloat(item.budget_amount) || 0;
      newTotal += numBudget;

      const existing = existingBudgets.find(b => b.category_id === item.category_id);
      if (existing) {
        const diff = numBudget - existing.budget_amount;
        if (Math.abs(diff) > 0.01) {
          const cat = db.findById('categories', item.category_id);
          changeDetails.push(`${cat?.name || 'หมวดหมู่'} ${diff >= 0 ? '+' : ''}${diff.toLocaleString('th-TH')} ฿`);
        }
        db.update('budgets', existing.id, {
          budget_amount: numBudget,
          budget_type: item.budget_type || 'shared'
        });
      } else if (numBudget > 0) {
        const cat = db.findById('categories', item.category_id);
        changeDetails.push(`${cat?.name || 'หมวดหมู่'} +${numBudget.toLocaleString('th-TH')} ฿`);
        db.insert('budgets', {
          room_code: roomCode,
          category_id: item.category_id,
          month_year: targetMonth,
          budget_amount: numBudget,
          budget_type: item.budget_type || 'shared',
          user_id: req.user.id
        });
      }
    });

    // Record History Log if there's any change
    const diffTotal = newTotal - oldTotal;
    if (Math.abs(diffTotal) > 0.01 || changeDetails.length > 0) {
      db.insert('budget_histories', {
        room_code: roomCode,
        user_id: req.user.id,
        user_name: `${req.user.full_name} (${req.user.role})`,
        old_amount: oldTotal,
        new_amount: newTotal,
        change_amount: diffTotal,
        note: note || (oldTotal === 0 ? `ตั้งงบประมาณเริ่มต้นประจำเดือน ${targetMonth}` : changeDetails.join(', ')),
        changed_at: new Date().toISOString()
      });
    }

    res.json({ message: 'บันทึกงบประมาณสำเร็จ', total_budget: newTotal });
  } catch (err) {
    console.error('Save budget error:', err);
    res.status(500).json({ error: 'บันทึกงบประมาณไม่สำเร็จ' });
  }
});

// 3. Copy Budget from Previous Month
router.post('/copy-previous', authenticateToken, (req, res) => {
  try {
    const { target_month } = req.body;
    const roomCode = req.user.room_code;
    const current = new Date(target_month + '-01');
    current.setMonth(current.getMonth() - 1);
    const prevMonthStr = current.toISOString().substring(0, 7);

    const prevBudgets = db.find('budgets', b => b.room_code === roomCode && b.month_year === prevMonthStr);
    if (prevBudgets.length === 0) {
      return res.status(404).json({ error: `ไม่พบข้อมูลงบประมาณของเดือนก่อนหน้า (${prevMonthStr})` });
    }

    // Clear current month budgets and copy
    db.deleteMany('budgets', b => b.room_code === roomCode && b.month_year === target_month);

    let copiedTotal = 0;
    prevBudgets.forEach(b => {
      copiedTotal += b.budget_amount;
      db.insert('budgets', {
        room_code: roomCode,
        category_id: b.category_id,
        month_year: target_month,
        budget_amount: b.budget_amount,
        budget_type: b.budget_type,
        user_id: req.user.id
      });
    });

    db.insert('budget_histories', {
      room_code: roomCode,
      user_id: req.user.id,
      user_name: `${req.user.full_name} (${req.user.role})`,
      old_amount: 0,
      new_amount: copiedTotal,
      change_amount: copiedTotal,
      note: `คัดลอกงบประมาณจากเดือน ${prevMonthStr} (${copiedTotal.toLocaleString('th-TH')} ฿)`,
      changed_at: new Date().toISOString()
    });

    res.json({ message: `คัดลอกงบประมาณจากเดือน ${prevMonthStr} เรียบร้อยแล้ว`, count: prevBudgets.length });
  } catch (err) {
    res.status(500).json({ error: 'คัดลอกงบประมาณไม่สำเร็จ' });
  }
});

// 4. Get Budget History Log
router.get('/history', authenticateToken, (req, res) => {
  try {
    const roomCode = req.user.room_code;
    const histories = db.find('budget_histories', h => h.room_code === roomCode);
    histories.sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at));
    res.json(histories);
  } catch (err) {
    res.status(500).json({ error: 'ไม่สามารถดึงประวัติงบประมาณได้' });
  }
});

export default router;
