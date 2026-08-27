import express from 'express';
import { db } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { generatePromptPayPayload } from '../utils/promptpay.js';

const router = express.Router();

// 1. Calculate Monthly Net Debt Summary
router.get('/summary', authenticateToken, (req, res) => {
  try {
    const { month } = req.query; // YYYY-MM
    const roomCode = req.user.room_code;
    const targetMonth = month || new Date().toISOString().substring(0, 7);

    // Get room members
    const members = db.find('users', u => u.room_code === roomCode);

    // Get shared expenses for month
    const sharedExpenses = db.find('expenses', exp => {
      return exp.room_code === roomCode &&
        exp.expense_type === 'shared' &&
        exp.expense_date.startsWith(targetMonth);
    });

    // Map member stats
    const userStats = {};
    members.forEach(m => {
      userStats[m.id] = {
        user_id: m.id,
        user_name: m.full_name,
        avatar_url: m.avatar_url,
        promptpay_id: m.promptpay_id || '',
        paid_total: 0,      // Amount this user paid up-front
        share_total: 0,     // Amount this user is responsible for
        net_balance: 0      // paid_total - share_total (>0: should receive, <0: owes)
      };
    });

    // Calculate total paid & shares
    let totalSharedAmount = 0;
    const expenseDetails = [];

    sharedExpenses.forEach(exp => {
      totalSharedAmount += exp.amount;
      const payerId = exp.created_by;
      if (userStats[payerId]) {
        userStats[payerId].paid_total += exp.amount;
      }

      // Splits
      const splits = db.find('expense_splits', s => s.expense_id === exp.id);
      splits.forEach(s => {
        if (userStats[s.user_id]) {
          userStats[s.user_id].share_total += s.share_amount;
        }
      });

      const payer = db.findById('users', payerId);
      expenseDetails.push({
        id: exp.id,
        category_name: exp.category_name,
        category_icon: exp.category_icon,
        amount: exp.amount,
        expense_date: exp.expense_date,
        payer_name: payer ? payer.full_name : 'สมาชิก',
        payer_id: payerId,
        splits: splits.map(s => {
          const u = db.findById('users', s.user_id);
          return {
            user_id: s.user_id,
            user_name: u ? u.full_name : 'สมาชิก',
            share_amount: s.share_amount,
            percentage: s.percentage,
            is_paid: s.is_paid
          };
        })
      });
    });

    // Calculate net balances
    Object.values(userStats).forEach(st => {
      st.net_balance = Math.round((st.paid_total - st.share_total) * 100) / 100;
    });

    // Calculate Optimal Debt Transfers (Who pays Whom)
    const creditors = []; // Owed money (> 0)
    const debtors = [];   // Owes money (< 0)

    Object.values(userStats).forEach(st => {
      if (st.net_balance > 0.01) {
        creditors.push({ ...st, remaining: st.net_balance });
      } else if (st.net_balance < -0.01) {
        debtors.push({ ...st, remaining: Math.abs(st.net_balance) });
      }
    });

    const debts = [];
    let cIdx = 0;
    let dIdx = 0;

    while (cIdx < creditors.length && dIdx < debtors.length) {
      const creditor = creditors[cIdx];
      const debtor = debtors[dIdx];

      const amountToTransfer = Math.min(creditor.remaining, debtor.remaining);
      const roundedAmount = Math.round(amountToTransfer * 100) / 100;

      if (roundedAmount > 0) {
        // Generate PromptPay Payload
        let qrPayload = '';
        if (creditor.promptpay_id) {
          try {
            qrPayload = generatePromptPayPayload(creditor.promptpay_id, roundedAmount);
          } catch (e) {
            console.error('PromptPay QR error:', e);
          }
        }

        // Check if settlement already recorded and confirmed
        const existingSettlement = db.findOne('settlements', s =>
          s.room_code === roomCode &&
          s.from_user_id === debtor.user_id &&
          s.to_user_id === creditor.user_id &&
          s.settlement_date.startsWith(targetMonth)
        );

        debts.push({
          from_user_id: debtor.user_id,
          from_user_name: debtor.user_name,
          to_user_id: creditor.user_id,
          to_user_name: creditor.user_name,
          amount: roundedAmount,
          promptpay_id: creditor.promptpay_id,
          qr_payload: qrPayload,
          is_settled: existingSettlement ? existingSettlement.is_confirmed : false,
          settlement_id: existingSettlement ? existingSettlement.id : null,
          note: `คืนค่าใช้จ่ายร่วม ${targetMonth}`
        });
      }

      creditor.remaining -= amountToTransfer;
      debtor.remaining -= amountToTransfer;

      if (creditor.remaining < 0.01) cIdx++;
      if (debtor.remaining < 0.01) dIdx++;
    }

    res.json({
      month: targetMonth,
      total_shared: totalSharedAmount,
      user_summaries: Object.values(userStats),
      debts,
      expenses: expenseDetails
    });
  } catch (err) {
    console.error('Settlement calculation error:', err);
    res.status(500).json({ error: 'ไม่สามารถคำนวณการแบ่งหนี้ได้' });
  }
});

// 2. Confirm Debt Settlement (Mark as paid)
router.post('/confirm', authenticateToken, (req, res) => {
  try {
    const { from_user_id, to_user_id, amount, month, method } = req.body;
    const roomCode = req.user.room_code;

    const fromUser = db.findById('users', from_user_id);
    const toUser = db.findById('users', to_user_id);

    const settlement = db.insert('settlements', {
      room_code: roomCode,
      from_user_id,
      from_user_name: fromUser ? fromUser.full_name : 'สมาชิก',
      to_user_id,
      to_user_name: toUser ? toUser.full_name : 'สมาชิก',
      amount: parseFloat(amount),
      settlement_date: new Date().toISOString(),
      month: month || new Date().toISOString().substring(0, 7),
      method: method || 'promptpay',
      is_confirmed: true,
      confirmed_by: req.user.id
    });

    // Notify receiver
    db.insert('notifications', {
      room_code: roomCode,
      user_id: to_user_id,
      title: '💸 ยืนยันการโอนเงินคืนแล้ว',
      message: `${fromUser?.full_name || 'สมาชิก'} โอนเงินคืนจำนวน ${parseFloat(amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿ เรียบร้อยแล้ว`,
      type: 'settlement_confirmed',
      is_read: false
    });

    res.json({ message: 'บันทึกการโอนเงินเรียบร้อยแล้ว', settlement });
  } catch (err) {
    res.status(500).json({ error: 'บันทึกการโอนเงินไม่สำเร็จ' });
  }
});

// 3. Get PromptPay QR Payload on Demand
router.post('/promptpay-qr', (req, res) => {
  try {
    const { target, amount } = req.body;
    if (!target) {
      return res.status(400).json({ error: 'กรุณาระบุหมายเลขพร้อมเพย์' });
    }
    const payload = generatePromptPayPayload(target, amount);
    res.json({ payload });
  } catch (err) {
    res.status(500).json({ error: 'ไม่สามารถสร้าง QR Code ได้' });
  }
});

export default router;
