// LINE Bot (Messaging API)
// =========================
// ให้ผู้ใช้พิมพ์บันทึกรายจ่าย/ดูสรุป ผ่าน LINE โดยตรง
//
// วิธีตั้งค่า:
// 1. ไปที่ https://developers.line.biz/console/
// 2. เปิด Messaging API Channel
// 3. ตั้ง Webhook URL: https://your-domain.com/api/line/webhook
// 4. เปิด "Use webhook" และปิด "Auto-reply messages"
//
// คำสั่งที่รองรับ:
// - พิมพ์ตัวเลข/คำ → บันทึกรายจ่าย
// - "สรุป" / "summary" → ดูสรุปเดือน
// - "งบ" / "budget" → ดูสถานะงบประมาณ
// - "ช่วย" / "help" → แสดงคำสั่งที่ใช้ได้

import express from 'express';
import crypto from 'crypto';
import LINE_CONFIG from '../config/line.js';
import { db } from '../db.js';

const router = express.Router();

// ตรวจสอบ webhook signature
function verifyWebhookSignature(body, signature) {
  const { channelSecret } = LINE_CONFIG.messaging;
  if (!channelSecret) return true; // ถ้าไม่ได้ตั้งค่า skip (dev mode)

  const hmac = crypto.createHmac('sha256', channelSecret);
  hmac.update(JSON.stringify(body));
  const calculated = hmac.digest('base64');
  return calculated === signature;
}

// ส่งข้อความ LINE
async function replyMessage(replyToken, messages) {
  const { channelAccessToken } = LINE_CONFIG.messaging;
  if (!channelAccessToken) {
    console.log('⚠️ LINE Messaging not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        replyToken,
        messages: Array.isArray(messages) ? messages : [messages],
      }),
    });

    const result = await response.json();
    return result.status === 200 || !result.error;
  } catch (err) {
    console.error('LINE reply error:', err);
    return false;
  }
}

// Push ข้อความไปหา user
async function pushMessage(userId, messages) {
  const { channelAccessToken } = LINE_CONFIG.messaging;
  if (!channelAccessToken) return false;

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: userId,
        messages: Array.isArray(messages) ? messages : [messages],
      }),
    });

    return response.ok;
  } catch (err) {
    console.error('LINE push error:', err);
    return false;
  }
}// ===== Flex Message สำหรับจดรายจ่าย =====
// ใช้ line://nv/chatKeyboard (ทดสอบแล้วใช้งานได้จริง)
function createRecordExpenseFlexMessage() {
  return {
    type: 'flex',
    altText: '💰 พิมพ์ได้เลย เช่น ค่าไฟ 500',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: '💰 พิมพ์ได้เลย เช่น',
            wrap: true,
            size: 'md',
          },
          {
            type: 'text',
            text: '- ค่าไฟ 875\n- ค่าอาหารกลางวัน 450\n- น้ำมันรถ 1000\n- ค่าเน็ต 641',
            wrap: true,
            size: 'sm',
            color: '#666666',
          },
          {
            type: 'text',
            text: '💡 รูปแบบ: คำอธิบาย + จำนวนเงิน',
            wrap: true,
            size: 'sm',
            color: '#888888',
            margin: 'sm',
          },
          {
            type: 'text',
            text: 'ปั้นดาวจะจดและจัดประเภทให้อัตโนมัติค่ะ 👵',
            wrap: true,
            size: 'sm',
            color: '#E91E63',
            margin: 'sm',
            weight: 'bold',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '💰 จดรายจ่าย',
              uri: 'line://nv/chatKeyboard',
            },
            style: 'primary',
            color: '#E91E63',
            height: 'sm',
          },
        ],
      },
    },
  };
}

// Webhook endpoint
router.post('/webhook', async (req, res) => {
  // LINE ส่ง request มาแบบ array
  const events = Array.isArray(req.body?.events) ? req.body.events : [];

  //ตอบ 200 ก่อน (LINE ต้องได้ response ภายใน 1 วินาที)
  res.status(200).json({ message: 'OK' });

  //ประมวลผล event ทีละตัว
  for (const event of events) {
    if (event.type === 'follow') {
      await handleFollowEvent(event);
    }
    if (event.type === 'postback') {
      await handlePostbackEvent(event);
    }
    if (event.type === 'message' && event.message.type === 'text') {
      await handleTextMessage(event);
    }
  }
});

// ===== Postback Event =====
async function handlePostbackEvent(event) {
  const { replyToken, postback } = event;
  const data = postback.data;

  if (data === 'action=record_expense') {
    await replyMessage(replyToken, createRecordExpenseFlexMessage());
    return;
  }

  if (data === 'action=summary') {
    const fakeEvent = {
      ...event,
      message: { type: 'text', text: 'สรุป' },
    };
    await handleTextMessage(fakeEvent);
    return;
  }

  if (data === 'action=help') {
    const fakeEvent = {
      ...event,
      message: { type: 'text', text: 'ช่วย' },
    };
    await handleTextMessage(fakeEvent);
    return;
  }
}

// ===== Greeting Message — เมื่อ user ใหม่เพิ่มเพื่อน LINE OA =====
async function handleFollowEvent(event) {
  const { replyToken, source } = event;
  const userId = source.userId;

  // หา user ในระบบ
  const user = db.findOne('users', u => u.line_user_id === userId);

  const frontendUrl = LINE_CONFIG.frontendUrl || 'https://mymonth-app.fly.dev';
  const liffUrl = `${frontendUrl}/liff`;

  if (user) {
    // user เดิม — ต้อนรับกลับ
    await replyMessage(replyToken, [
      {
        type: 'flex',
        altText: `👋 ยินดีต้อนรับกลับ ${user.full_name}!`,
        contents: {
          type: 'bubble',
          size: 'giga',
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '🎉 ยินดีต้อนรับกลับ!', weight: 'bold', size: 'xl', color: '#FFFFFF' },
              { type: 'text', text: 'MyMonth — ระบบจัดการรายจ่าย', size: 'sm', color: '#FFFFFFCC' },
            ],
            backgroundColor: '#0D9488',
            paddingAll: '20px',
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'box', layout: 'horizontal', contents: [
                  { type: 'text', text: '👤', size: 'lg' },
                  { type: 'text', text: user.full_name, weight: 'bold', size: 'md', margin: 'sm' },
                ],
              },
              {
                type: 'box', layout: 'horizontal', contents: [
                  { type: 'text', text: '🏠', size: 'lg' },
                  { type: 'text', text: `ห้อง: ${user.room_code || 'ยังไม่ได้เข้าห้อง'}`, size: 'md', margin: 'sm', color: '#666666' },
                ],
                margin: 'md',
              },
              { type: 'separator', margin: 'xl' },
              {
                type: 'text', text: '💰 พิมพ์จำนวนเงิน เช่น "ค่าไฟ 500" เพื่อบันทึกรายจ่าย', size: 'sm', color: '#666666', margin: 'lg', wrap: true,
              },
              {
                type: 'text', text: '📊 พิมพ์ "สรุป" เพื่อดูสรุปรายเดือน', size: 'sm', color: '#666666', margin: 'sm', wrap: true,
              },
              {
                type: 'text', text: '❓ พิมพ์ "ช่วย" เพื่อดูคำสั่งทั้งหมด', size: 'sm', color: '#666666', margin: 'sm', wrap: true,
              },
            ],
            paddingAll: '20px',
          },
          footer: {
            type: 'box', layout: 'vertical', contents: [
              {
                type: 'button',
                action: { type: 'uri', uri: liffUrl, label: '📱 เปิด MyMonth' },
                style: 'primary',
                color: '#0D9488',
                height: 'md',
              },
              {
                type: 'button',
                action: { type: 'message', text: 'ช่วย', label: '📖 ดูคำสั่ง' },
                style: 'secondary',
                height: 'sm',
                margin: 'sm',
              },
            ],
            paddingAll: '15px',
          },
        },
      },
    ]);
    return;
  }

  // user ใหม่ — Greeting Message + LIFF
  await replyMessage(replyToken, [
    {
      type: 'flex',
      altText: '👋 สวัสดีค่ะ! ยินดีต้อนรับสู่ MyMonth 🎉',
      contents: {
        type: 'bubble',
        size: 'giga',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text', text: '🎉 สวัสดีค่ะ!', weight: 'bold', size: 'xl', color: '#FFFFFF' },
            { type: 'text', text: 'ยินดีต้อนรับสู่ MyMonth', size: 'lg', color: '#FFFFFFDD' },
            { type: 'text', text: 'ระบบจัดการรายจ่ายส่วนตัวและร่วม', size: 'sm', color: '#FFFFFFAA', margin: 'sm' },
          ],
          backgroundColor: '#0D9488',
          paddingAll: '20px',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text', text: '✨ ฟีเจอร์ที่ใช้ได้', weight: 'bold', size: 'md', margin: 'md',
            },
            {
              type: 'box', layout: 'vertical', contents: [
                { type: 'text', text: '💰 บันทึกรายจ่ายผ่าน LINE', size: 'sm', color: '#555555', margin: 'sm' },
                { type: 'text', text: '📊 ดูสรุปรายเดือน', size: 'sm', color: '#555555', margin: 'sm' },
                { type: 'text', text: '🐷 ดูงบประมาณ', size: 'sm', color: '#555555', margin: 'sm' },
                { type: 'text', text: '🟢 แบ่งจ่ายรายจ่ายร่วม', size: 'sm', color: '#555555', margin: 'sm' },
                { type: 'text', text: '🔔 แจ้งเตือนเมื่อบันทึกใหม่', size: 'sm', color: '#555555', margin: 'sm' },
              ],
            },
            { type: 'separator', margin: 'lg' },
            {
              type: 'text', text: '📱 วิธีเริ่มใช้งาน', weight: 'bold', size: 'md', margin: 'lg',
            },
            {
              type: 'box', layout: 'vertical', contents: [
                { type: 'text', text: '1️⃣ เปิด MyMonth เพื่อสมัคร/เข้าสู่ระบบ', size: 'sm', color: '#555555', margin: 'sm' },
                { type: 'text', text: '2️⃣ เชื่อมต่อบัญชี LINE กับ MyMonth', size: 'sm', color: '#555555', margin: 'sm' },
                { type: 'text', text: '3️⃣ เริ่มบันทึกรายจ่ายผ่าน LINE ได้เลย!', size: 'sm', color: '#555555', margin: 'sm' },
              ],
            },
            {
              type: 'text', text: '💡 พิมพ์ "ช่วย" เพื่อดูคำสั่งทั้งหมด', size: 'sm', color: '#0D9488', margin: 'lg', wrap: true, weight: 'bold',
            },
          ],
          paddingAll: '15px',
        },
        footer: {
          type: 'box', layout: 'vertical', contents: [
            {
              type: 'button',
              action: { type: 'uri', uri: liffUrl, label: '🚀 เริ่มใช้งาน MyMonth' },
              style: 'primary',
              color: '#0D9488',
              height: 'lg',
            },
          ],
          paddingAll: '15px',
        },
      },
    },
  ]);
}

// จัดการข้อความจากผู้ใช้
async function handleTextMessage(event) {
  const { replyToken, source, message } = event;
  const userId = source.userId;
  const text = message.text.trim();

  // หา user ในระบบ
  const user = db.findOne('users', u => u.line_user_id === userId);

  // ถ้าไม่เจอ → แจ้งให้เชื่อมบัญชี
  if (!user) {
    // ตรวจสอบว่ามีคำสั่งเชื่อมบัญชีหรือไม่
    if (text.toLowerCase().startsWith('เชื่อม ')) {
      const code = text.replace('เชื่อม ', '').trim();
      const linkUser = db.findOne('users', u => u.line_link_code === code);
      if (linkUser) {
        db.update('users', linkUser.id, { line_user_id: userId, line_link_code: '' });
        await replyMessage(replyToken, {
          type: 'text',
          text: `✅ เชื่อมต่อ LINE สำเร็จ!\n\n👤 ${linkUser.full_name}\n🏠 ห้อง: ${linkUser.room_code}\n\nตอนนี้คุณสามารถบันทึกรายจ่ายผ่าน LINE ได้แล้ว!\n\n💡 พิมพ์ "ช่วย" เพื่อดูคำสั่งที่ใช้ได้`,
        });
        return;
      }
    }

    await replyMessage(replyToken, {
      type: 'text',
      text: `👋 สวัสดีค่ะ! MyMonth 🎉\n\n⚠️ คุณยังไม่ได้เชื่อมต่อบัญชี\nกรุณาเข้าเว็บ MyMonth เพื่อเชื่อมต่อ LINE\n\n🔗 ${LINE_CONFIG.frontendUrl || 'https://mymonth-app.onrender.com'}`,
    });
    return;
  }

  const command = text.toLowerCase();
  const pendingExpense = user.pending_expense;

  // ===== คำสั่งต่างๆ =====

  // จดรายจ่าย - แสดง Flex Message
  if (['จดรายจ่าย', 'จด', 'บันทึก', 'เพิ่มรายจ่าย'].includes(command)) {
    console.log('💰 จดรายจ่าย triggered for user:', userId);
    const flexMsg = createRecordExpenseFlexMessage();
    const result = await replyMessage(replyToken, flexMsg);
    console.log('💰 replyMessage result:', result);
    if (!result) {
      // ถ้า Flex Message ส่งไม่ได้ ให้ส่งข้อความธรรมดาแทน
      console.log('💰 Flex failed, sending text instead');
      await replyMessage(replyToken, {
        type: 'text',
        text: '💰 จดรายจ่าย\n\nพิมพ์ได้เลย เช่น:\n• ค่าไฟ 875\n• ค่าอาหาร 450\n• น้ำมันรถ 1000\n\nปั้นดาวจะจดและจัดประเภทให้อัตโนมัติค่ะ 👵'
      });
    }
    return;
  }

  // ช่วย / help
  if (['ช่วย', 'help', '?', 'คำสั่ง'].includes(command)) {
    await replyMessage(replyToken, [
      {
        type: 'flex',
        altText: '📱 คำสั่งที่ใช้ได้',
        contents: {
          type: 'bubble',
          size: 'giga',
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '📱 คำสั่ง MyMonth', weight: 'bold', size: 'xl', color: '#FFFFFF' },
            ],
            backgroundColor: '#0D9488',
            paddingAll: '20px',
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '💰 บันทึกรายจ่าย', weight: 'bold', size: 'md', color: '#333333' },
              { type: 'text', text: 'พิมพ์ "จดรายจ่าย" หรือพิมพ์จำนวนเงิน\nเช่น "ค่าอาหารกลางวัน 450"', size: 'sm', color: '#666666', margin: 'sm', wrap: true },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '📊 ดูสรุปเดือน', weight: 'bold', size: 'md', color: '#333333', margin: 'md' },
              { type: 'text', text: 'พิมพ์ "สรุป" หรือ "summary"', size: 'sm', color: '#666666', margin: 'sm', wrap: true },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '🐷 ดูงบประมาณ', weight: 'bold', size: 'md', color: '#333333', margin: 'md' },
              { type: 'text', text: 'พิมพ์ "งบ" หรือ "budget"', size: 'sm', color: '#666666', margin: 'sm', wrap: true },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '📋 ดูรายการล่าสุด', weight: 'bold', size: 'md', color: '#333333', margin: 'md' },
              { type: 'text', text: 'พิมพ์ "รายการล่าสุด"', size: 'sm', color: '#666666', margin: 'sm', wrap: true },
            ],
            paddingAll: '15px',
          },
        },
        quickReply: {
          items: [
            {
              type: 'action',
              action: { type: 'message', text: 'จดรายจ่าย', label: '💰 จดรายจ่าย' },
            },
            {
              type: 'action',
              action: { type: 'message', text: 'สรุป', label: '📊 ดูสรุป' },
            },
            {
              type: 'action',
              action: { type: 'message', text: 'งบ', label: '🐷 ดูงบประมาณ' },
            },
            {
              type: 'action',
              action: { type: 'message', text: 'รายการล่าสุด', label: '📋 รายการล่าสุด' },
            },
          ],
        },
      },
    ]);
    return;
  }

  // สรุปเดือน
  if (['สรุป', 'summary', 'sum'].includes(command)) {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const targetMonth = `${year}-${String(month + 1).padStart(2, '0')}`;

    const expenses = db.find('expenses', e => {
      const d = new Date(e.expense_date);
      return e.room_code === user.room_code && d.getMonth() === month && d.getFullYear() === year;
    });

    const totalAll = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const totalPersonal = expenses.filter(e => e.expense_type === 'personal').reduce((s, e) => s + Number(e.amount), 0);
    const totalShared = expenses.filter(e => e.expense_type === 'shared').reduce((s, e) => s + Number(e.amount), 0);

    const monthName = now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

    // สร้างข้อความสรุป
    let msg = `📊 สรุปเดือน ${monthName}\n\n`;
    msg += `💰 ยอดรวม: ${totalAll.toLocaleString()} ฿\n`;
    msg += `🔵 ส่วนตัว: ${totalPersonal.toLocaleString()} ฿\n`;
    msg += `🟢 ร่วม: ${totalShared.toLocaleString()} ฿\n`;
    msg += `📦 รายการทั้งหมด: ${expenses.length} รายการ\n`;

    // รายการรายจ่ายร่วม
    const sharedExpenses = expenses.filter(e => e.expense_type === 'shared');
    if (sharedExpenses.length > 0) {
      msg += `\n📋 รายจ่ายร่วม:\n`;
      sharedExpenses.forEach(exp => {
        msg += `• ${exp.category_icon || ''} ${exp.category_name}: ${Number(exp.amount).toLocaleString()} ฿\n`;
      });
    }

    // คำนวณสรุปรายบุคคล
    const members = db.find('users', u => u.room_code === user.room_code);
    const userStats = {};
    members.forEach(m => {
      userStats[m.id] = {
        name: m.full_name,
        paid: 0,
        share: 0
      };
    });

    // เพิ่ม phantom user สำหรับสมาชิกที่ออกไปแล้ว
    sharedExpenses.forEach(exp => {
      const payerId = exp.created_by;
      if (!userStats[payerId]) {
        userStats[payerId] = {
          name: '(สมาชิกที่ออกไปแล้ว)',
          paid: 0,
          share: 0,
          isPhantom: true
        };
      }
      userStats[payerId].paid += Number(exp.amount);
    });

    // คำนวณ share
    sharedExpenses.forEach(exp => {
      const splits = db.find('expense_splits', s => s.expense_id === exp.id);
      splits.forEach(s => {
        if (userStats[s.user_id]) {
          userStats[s.user_id].share += Number(s.share_amount);
        }
      });
    });

    // คำนวณ net balance
    const debts = [];
    const currentMembers = [];
    Object.entries(userStats).forEach(([id, stats]) => {
      if (stats.isPhantom) return;
      stats.net = Math.round((stats.paid - stats.share) * 100) / 100;
      currentMembers.push({ id, ...stats });
    });

    // หา债权人และลูกหนี้
    const creditors = currentMembers.filter(m => m.net > 0.01).sort((a, b) => b.net - a.net);
    const debtors = currentMembers.filter(m => m.net < -0.01).sort((a, b) => a.net - b.net);

    let cIdx = 0, dIdx = 0;
    while (cIdx < creditors.length && dIdx < debtors.length) {
      const amount = Math.min(creditors[cIdx].net, Math.abs(debtors[dIdx].net));
      const rounded = Math.round(amount * 100) / 100;
      if (rounded > 0) {
        debts.push({
          from: debtors[dIdx].name,
          to: creditors[cIdx].name,
          amount: rounded
        });
        creditors[cIdx].net -= rounded;
        debtors[dIdx].net += rounded;
      }
      if (creditors[cIdx].net < 0.01) cIdx++;
      if (debtors[dIdx].net > -0.01) dIdx++;
    }

    // แสดงสรุปรายบุคคล
    if (currentMembers.some(m => m.paid > 0 || m.share > 0)) {
      msg += `\n👥 สรุปรายบุคคล:\n`;
      currentMembers.forEach(m => {
        if (m.paid > 0 || m.share > 0) {
          const status = m.paid > m.share ? `จ่ายเกิน +${(m.paid - m.share).toLocaleString()}` : m.paid < m.share ? `ยังขาด ${(m.share - m.paid).toLocaleString()}` : 'พอดี';
          msg += `👤 ${m.name}: จ่าย ${m.paid.toLocaleString()} ฿ / ส่วนแบ่ง ${m.share.toLocaleString()} ฿ → ${status}\n`;
        }
      });
    }

    // แสดงหนี้
    if (debts.length > 0) {
      msg += `\n💸 ต้องโอนเงินคืน:\n`;
      debts.forEach(d => {
        msg += `👉 ${d.from} โอนให้ ${d.to} ${d.amount.toLocaleString()} ฿\n`;
      });
    }

    await replyMessage(replyToken, {
      type: 'text',
      text: msg,
    });
    return;
  }

  // งบประมาณ
  if (['งบ', 'budget', 'งบประมาณ'].includes(command)) {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const monthYear = `${year}-${String(month + 1).padStart(2, '0')}`;

    const budgets = db.find('budgets', b => {
      return b.room_code === user.room_code && b.month_year === monthYear;
    });

    if (budgets.length === 0) {
      await replyMessage(replyToken, {
        type: 'text',
        text: '🐷 ยังไม่ได้ตั้งงบประมาณเดือนนี้\nกรุณาตั้งค่าผ่านเว็บ MyMonth',
      });
      return;
    }

    let msg = '🐷 งบประมาณเดือนนี้\n\n';
    for (const b of budgets) {
      const cat = db.findById('categories', b.category_id);
      const catName = cat ? `${cat.icon} ${cat.name}` : (b.category_id || 'ไม่ระบุ');

      const spent = db.find('expenses', e => {
        const d = new Date(e.expense_date);
        return e.room_code === user.room_code && e.category_id === b.category_id &&
          d.getMonth() === month && d.getFullYear() === year;
      }).reduce((s, e) => s + Number(e.amount), 0);

      const pct = b.budget_amount > 0 ? Math.round((spent / b.budget_amount) * 100) : 0;
      const bar = pct >= 100 ? '🔴' : pct >= 70 ? '🟡' : '🟢';

      msg += `${bar} ${catName}: ${spent.toLocaleString()} / ${Number(b.budget_amount).toLocaleString()} ฿ (${pct}%)\n`;
    }

    await replyMessage(replyToken, { type: 'text', text: msg });
    return;
  }

  // รายการล่าสุด
  if (['รายการล่าสุด', 'latest', 'list'].includes(command)) {
    const expenses = db.find('expenses', e => e.room_code === user.room_code)
      .sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date))
      .slice(0, 5);

    if (expenses.length === 0) {
      await replyMessage(replyToken, {
        type: 'text',
        text: '📋 ยังไม่มีรายการรายจ่าย',
      });
      return;
    }

    let msg = '📋 5 รายการล่าสุด\n\n';
    for (const e of expenses) {
      const icon = e.type === 'shared' ? '🟢' : '🔵';
      msg += `${icon} ${e.description} — ${Number(e.amount).toLocaleString()} ฿\n`;
    }

    await replyMessage(replyToken, { type: 'text', text: msg });
    return;
  }



  // ===== บันทึกรายจ่าย =====
  // ตรวจสอบว่าข้อความมีตัวเลข (จำนวนเงิน) - รับทั้ง "ค่าไฟ 500" และ "500 ค่าไฟ"
  const amountMatch = text.match(/(\d+(?:\.\d{1,2})?)\s+(.*)/) || text.match(/(.+?)\s+(\d+(?:\.\d{1,2})?)$/);
  if (amountMatch) {
    // ตรวจสอบว่าตัวเลขอยู่ตำแหน่งไหน
    let amount, description;
    if (/^\d/.test(amountMatch[1])) {
      // แบบ "500 ค่าไฟ" - ตัวเลขข้างหน้า
      amount = parseFloat(amountMatch[1]);
      description = amountMatch[2] || 'ไม่มีคำอธิบาย';
    } else {
      // แบบ "ค่าไฟ 500" - ตัวเลขข้างหลัง
      description = amountMatch[1] || 'ไม่มีคำอธิบาย';
      amount = parseFloat(amountMatch[2]);
    }

    if (amount <= 0 || amount > 1000000) {
      await replyMessage(replyToken, {
        type: 'text',
        text: '❌ จำนวนเงินไม่ถูกต้อง\nกรุณาพิมพ์ เช่น "500 ค่าอาหาร"',
      });
      return;
    }

    // หาหมวดหมู่อัตโนมัติจากคำอธิบาย (ใช้ keyword matching)
    const categories = db.find('categories', c => true);
    const descLower = description.toLowerCase();
    
    // แมพ keywords กับหมวดหมู่
    const categoryKeywords = {
      'อาหาร': ['ค่าอาหาร', 'อาหาร', 'ข้าว', 'กินข้าว', 'ค่ากิน', 'กาแฟ', 'อาหารเช้า', 'อาหารกลางวัน', 'อาหารเย็น', 'สแน็ค', 'ขนม', 'น้ำ'],
      'ค่าเดินทาง': ['ค่าเดินทาง', 'ค่าเดิน', 'ค่ารถ', 'ค่าน้ำมัน', 'ค่าแท็กซี่', 'ค่ามอเตอร์ไซค์', 'ค่า BTS', 'ค่า MRT', 'ค่ารถไฟ', 'ค่าตั๋ว'],
      'ค่าที่พัก': ['ค่าที่พัก', 'ค่าเช่า', 'ค่าเช่าบ้าน', 'ค่าเช่าห้อง', 'ค่าน้ำ', 'ค่าไฟ', 'ค่าไฟฟ้า', 'ค่าอินเทอร์เน็ต', 'ค่าเน็ต', 'ค่าเคเบิ้ล'],
      'ค่าสาธารณูปโภค': ['ค่าสาธารณูปโภค', 'ค่าไฟ', 'ค่าน้ำ', 'ค่าไฟฟ้า', 'ค่าอินเทอร์เน็ต', 'ค่าเน็ต', 'ค่าเคเบิ้ล', 'ค่าทำความสะอาด', 'ค่าซ่อมบำรุง'],
      'บันเทิง': ['ค่าบันเทิง', 'ค่าเที่ยว', 'ค่าดูหนัง', 'ค่าคอนเสิร์ต', 'ค่าเกม', 'ค่า Netflix', 'ค่าหนังสือ', 'ค่าหนังสือเสียง'],
      'ของใช้จำเป็น': ['ค่าของใช้', 'ของใช้จำเป็น', 'ค่าซื้อของ', 'ค่าของใช้ในบ้าน', 'ค่าทำความสะอาด'],
      'ค่าโทรศัพท์': ['ค่าโทรศัพท์', 'ค่ามือถือ', 'ค่าโทร', 'ค่าเน็ตมือถือ', 'ค่า AIS', 'ค่า True', 'ค่า Dtac'],
      'ค่ารักษาพยาบาล': ['ค่ารักษา', 'ค่ารักษาพยาบาล', 'ค่าหมอ', 'ค่ายา', 'ค่าโรงพยาบาล', 'ค่าประกันสุขภาพ'],
      'ค่าเล่าเรียน': ['ค่าเล่าเรียน', 'ค่าเรียน', 'ค่าสอนพิเศษ', 'ค่าหนังสือเรียน', 'ค่าคู่มือ'],
      'ค่าไฟฟ้า': ['ค่าไฟฟ้า', 'ค่าไฟ'],
      'ค่าน้ำ': ['ค่าน้ำ', 'ค่าน้ำประปา'],
    };

    let matchedCategory = categories.find(c =>
      description.includes(c.name) || c.name.includes(description)
    );

    // ถ้าไม่เจอ ลองจับคู่จาก keywords
    if (!matchedCategory) {
      for (const [catName, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(kw => descLower.includes(kw))) {
          matchedCategory = categories.find(c => c.name === catName || c.name.includes(catName));
          if (matchedCategory) break;
        }
      }
    }

    // fallback เป็น "อื่นๆ"
    matchedCategory = matchedCategory || categories.find(c => c.name === 'อื่นๆ') || { id: null, name: 'อื่นๆ', icon: '➕' };

    // เอา description ไปใส่ใน note เสมอ
    const noteText = description;

    // เก็บข้อมูลชั่วคราวใน user object เพื่อรอการยืนยัน
    db.update('users', user.id, {
      pending_expense: {
        amount,
        description,
        category_id: matchedCategory.id,
        category_name: matchedCategory.name,
        category_icon: matchedCategory.icon,
        note: noteText,
        timestamp: new Date().toISOString(),
      }
    });

    await replyMessage(replyToken, {
      type: 'template',
      altText: `💰 ${description} — ${amount.toLocaleString()} ฿\n\nเลือกประเภทรายจ่าย:`,
      template: {
        type: 'buttons',
        text: `${matchedCategory.icon} ${matchedCategory.name}\n💵 ${amount.toLocaleString()} ฿\n📝 ${description}\n\nเลือกประเภทรายจ่าย:`,
        actions: [
          {
            type: 'message',
            label: '🔵 รายจ่ายส่วนตัว',
            text: 'ส่วนตัว',
          },
          {
            type: 'message',
            label: '🟢 รายจ่ายร่วม',
            text: 'ร่วม',
          },
          {
            type: 'message',
            label: '❌ ยกเลิก',
            text: 'ยกเลิก',
          },
        ],
      },
    });
    return;
  }

  // ===== ยืนยันประเภทรายจ่าย =====
  if (pendingExpense && (command === 'ส่วนตัว' || command === 'ร่วม' || command === 'ยกเลิก')) {
    // ยกเลิก
    if (command === 'ยกเลิก') {
      db.update('users', user.id, { pending_expense: null });
      await replyMessage(replyToken, {
        type: 'text',
        text: '❌ ยกเลิกการบันทึกรายจ่ายแล้ว',
      });
      return;
    }

    // ส่วนตัว - บันทึกทันที
    if (command === 'ส่วนตัว') {
      const typeLabel = '🔵 ส่วนตัว';
      
      // ใช้หมวดหมู่ที่เลือกไว้ หรือหาอัตโนมัติ
      let category;
      if (pendingExpense.category_id) {
        category = { id: pendingExpense.category_id, name: pendingExpense.category_name, icon: pendingExpense.category_icon };
      } else {
        const categories = db.find('categories', c => true);
        category = categories.find(c =>
          pendingExpense.description.includes(c.name) ||
          c.name.includes(pendingExpense.description)
        ) || categories.find(c => c.name === 'อื่นๆ') || { id: null, name: 'อื่นๆ', icon: '💰' };
      }

      // สร้าง note ที่มีทั้ง [via LINE Bot] และ description (ถ้าเป็นอื่นๆ)
      const expenseNote = pendingExpense.note ? `${pendingExpense.note} [via LINE Bot]` : '[via LINE Bot]';

      db.insert('expenses', {
        description: pendingExpense.description,
        amount: pendingExpense.amount,
        category_id: category.id,
        category_name: category.name,
        category_icon: category.icon,
        expense_type: 'personal',
        paid_by: user.id,
        creator_name: user.full_name,
        room_code: user.room_code,
        expense_date: new Date().toISOString(),
        note: expenseNote,
        tags: [],
        created_by: user.id,
      });

      db.update('users', user.id, { pending_expense: null });

      await replyMessage(replyToken, {
        type: 'text',
        text: `📝 ปั้นดาวจดให้แล้วนะคะ\n\n💰 ${pendingExpense.description}\n💵 ${pendingExpense.amount.toLocaleString()} ฿\n📁 หมวด: ${category.icon} ${category.name}\n${typeLabel}`,
      });
      return;
    }

    // ร่วม - แสดงปุ่มเลือกสัดส่วนแบ่งจ่าย
    if (command === 'ร่วม') {
      // หาสมาชิกในห้อง
      const members = db.find('users', u => u.room_code === user.room_code && u.id !== user.id);
      const otherMember = members[0];
      const otherName = otherMember ? otherMember.full_name : 'สมาชิกอื่น';

      await replyMessage(replyToken, {
        type: 'template',
        altText: `🟢 ${pendingExpense.description} — ${pendingExpense.amount.toLocaleString()} ฿\n\nเลือกสัดส่วนแบ่งจ่าย:`,
        template: {
          type: 'buttons',
          text: `🟢 ${pendingExpense.description}\n💵 ${pendingExpense.amount.toLocaleString()} ฿\n\nเลือกสัดส่วนแบ่งจ่าย\n(คุณ/${otherName}):`,
          actions: [
            {
              type: 'message',
              label: '50/50 หารเท่ากัน',
              text: 'ร่วม 50/50',
            },
            {
              type: 'message',
              label: '70/30',
              text: 'ร่วม 70/30',
            },
            {
              type: 'message',
              label: '80/20',
              text: 'ร่วม 80/20',
            },
            {
              type: 'message',
              label: '📝 กำหนดเอง',
              text: 'ร่วม custom',
            },
          ],
        },
      });
      return;
    }
  }

  // ===== ยืนยันสัดส่วนแบ่งจ่าย =====
  if (pendingExpense && command.startsWith('ร่วม ')) {
    const splitOption = command.replace('ร่วม ', '').trim();
    let myPct = 50;
    let splitLabel = '50/50';

    if (splitOption === '50/50') {
      myPct = 50;
      splitLabel = '50/50';
    } else if (splitOption === '70/30') {
      myPct = 70;
      splitLabel = '70/30';
    } else if (splitOption === '80/20') {
      myPct = 80;
      splitLabel = '80/20';
    } else if (splitOption === 'custom') {
      // ให้พิมพ์สัดส่วนเอง
      await replyMessage(replyToken, {
        type: 'text',
        text: `📝 พิมพ์สัดส่วนของคุณ:\n\nเช่น "60" หมายถึง คุณจ่าย 60% สมาชิกอื่นจ่าย 40%\n\n(ค่าที่ใช้ได้: 1-99)`,
      });
      db.update('users', user.id, {
        pending_expense: { ...pendingExpense, waiting_custom_split: true }
      });
      return;
    }

    // คำนวณเงินแบ่ง
    const totalAmount = pendingExpense.amount;
    const myAmount = Math.round((totalAmount * myPct) / 100);
    const otherAmount = totalAmount - myAmount;

    // หาสมาชิกในห้อง
    const members = db.find('users', u => u.room_code === user.room_code && u.id !== user.id);
    const otherMember = members[0];
    const otherName = otherMember ? otherMember.full_name : 'สมาชิกอื่น';

    // หาหมวดหมู่
    const categories = db.find('categories', c => true);
    const matchedCategory = categories.find(c =>
      pendingExpense.description.includes(c.name) ||
      c.name.includes(pendingExpense.description)
    ) || categories.find(c => c.name === 'อื่นๆ') || { id: null, name: 'อื่นๆ', icon: '💰' };

    // สร้าง note ที่มีทั้ง description (ถ้าเป็นอื่นๆ) และ [via LINE Bot]
    const splitNoteBase = pendingExpense.note ? `${pendingExpense.note} [via LINE Bot]` : '[via LINE Bot]';

    // บันทึกรายจ่าย
    db.insert('expenses', {
      description: pendingExpense.description,
      amount: totalAmount,
      category_id: matchedCategory.id,
      category_name: matchedCategory.name,
      category_icon: matchedCategory.icon,
      expense_type: 'shared',
      paid_by: user.id,
      creator_name: user.full_name,
      room_code: user.room_code,
      expense_date: new Date().toISOString(),
      note: `${splitNoteBase} แบ่งจ่าย ${splitLabel}`,
      tags: [],
      created_by: user.id,
    });

    // บันทึก splits (แยก row แต่ละคน)
    const newExpense = db.find('expenses', e => e.description === pendingExpense.description && e.paid_by === user.id).slice(-1)[0];
    if (newExpense && otherMember) {
      db.insert('expense_splits', {
        expense_id: newExpense.id,
        user_id: user.id,
        percentage: myPct,
        share_amount: myAmount,
        is_paid: false,
      });
      db.insert('expense_splits', {
        expense_id: newExpense.id,
        user_id: otherMember.id,
        percentage: 100 - myPct,
        share_amount: otherAmount,
        is_paid: false,
      });
    }

    db.update('users', user.id, { pending_expense: null });

    await replyMessage(replyToken, {
      type: 'text',
      text: `📝 ปั้นดาวจดให้แล้วนะคะ\n\n💰 ${pendingExpense.description}\n💵 ${totalAmount.toLocaleString()} ฿\n📁 หมวด: ${matchedCategory.icon} ${matchedCategory.name}\n🟢 แบ่งจ่าย ${splitLabel}\n\n👤 คุณ: ${myAmount.toLocaleString()} ฿\n👤 ${otherName}: ${otherAmount.toLocaleString()} ฿`,
    });
    return;
  }

  // ===== รับสัดส่วน custom =====
  if (pendingExpense?.waiting_custom_split) {
    const customPct = parseInt(command);
    if (isNaN(customPct) || customPct < 1 || customPct > 99) {
      await replyMessage(replyToken, {
        type: 'text',
        text: '❌ กรุณาพิมพ์ตัวเลข 1-99\nเช่น "60" หมายถึง คุณจ่าย 60%',
      });
      return;
    }

    const totalAmount = pendingExpense.amount;
    const myAmount = Math.round((totalAmount * customPct) / 100);
    const otherAmount = totalAmount - myAmount;
    const splitLabel = `${customPct}/${100 - customPct}`;

    const members = db.find('users', u => u.room_code === user.room_code && u.id !== user.id);
    const otherMember = members[0];
    const otherName = otherMember ? otherMember.full_name : 'สมาชิกอื่น';

    const categories = db.find('categories', c => true);
    const matchedCategory = categories.find(c =>
      pendingExpense.description.includes(c.name) ||
      c.name.includes(pendingExpense.description)
    ) || categories.find(c => c.name === 'อื่นๆ') || { id: null, name: 'อื่นๆ', icon: '💰' };

    const customNoteBase = pendingExpense.note ? `${pendingExpense.note} [via LINE Bot]` : '[via LINE Bot]';

    db.insert('expenses', {
      description: pendingExpense.description,
      amount: totalAmount,
      category_id: matchedCategory.id,
      category_name: matchedCategory.name,
      category_icon: matchedCategory.icon,
      expense_type: 'shared',
      paid_by: user.id,
      creator_name: user.full_name,
      room_code: user.room_code,
      expense_date: new Date().toISOString(),
      note: `${customNoteBase} แบ่งจ่าย ${splitLabel}`,
      tags: [],
      created_by: user.id,
    });

    // บันทึก splits (แยก row แต่ละคน)
    const customExpense = db.find('expenses', e => e.description === pendingExpense.description && e.paid_by === user.id).slice(-1)[0];
    if (customExpense && otherMember) {
      db.insert('expense_splits', {
        expense_id: customExpense.id,
        user_id: user.id,
        percentage: customPct,
        share_amount: myAmount,
        is_paid: false,
      });
      db.insert('expense_splits', {
        expense_id: customExpense.id,
        user_id: otherMember.id,
        percentage: 100 - customPct,
        share_amount: otherAmount,
        is_paid: false,
      });
    }

    db.update('users', user.id, { pending_expense: null });

    await replyMessage(replyToken, {
      type: 'text',
      text: `📝 ปั้นดาวจดให้แล้วนะคะ\n\n💰 ${pendingExpense.description}\n💵 ${totalAmount.toLocaleString()} ฿\n📁 หมวด: ${matchedCategory.icon} ${matchedCategory.name}\n🟢 แบ่งจ่าย ${splitLabel}\n\n👤 คุณ: ${myAmount.toLocaleString()} ฿\n👤 ${otherName}: ${otherAmount.toLocaleString()} ฿`,
    });
    return;
  }

  // ถ้าไม่ตรงคำสั่งไหน
  await replyMessage(replyToken, {
    type: 'text',
    text: `🤔 ไม่เข้าใจคำสั่ง\n\nพิมพ์ "ช่วย" เพื่อดูคำสั่งที่ใช้ได้\nหรือพิมพ์จำนวนเงิน เช่น "500 ค่าอาหาร" เพื่อบันทึกรายจ่าย`,
  });
}

// ===== Menu & Rich Menu =====

// สร้าง Rich Menu (ปุ่มลัดด้านล่าง LINE)
router.post('/setup-menu', async (req, res) => {
  const { channelAccessToken } = LINE_CONFIG.messaging;
  if (!channelAccessToken) {
    return res.status(503).json({ error: 'LINE Messaging ยังไม่ได้ตั้งค่า' });
  }

  try {
    // สร้าง Rich Menu
    const menuResponse = await fetch('https://api.line.me/v2/bot/richmenu', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        size: { width: 2500, height: 1686 },
        selected: false,
        name: 'MyMonth Menu',
        chatBarText: 'พิมพ์คำสั่ง',
        areas: [
          // Row 1 - ปุ่มใหญ่ จดรายจ่าย
          {
            bounds: { x: 0, y: 0, width: 1250, height: 843 },
            action: { type: 'postback', data: 'action=record_expense', displayText: '💰 จดรายจ่าย' },
          },
          // Row 1 - สรุป
          {
            bounds: { x: 1250, y: 0, width: 625, height: 421 },
            action: { type: 'postback', data: 'action=summary', displayText: '📊 สรุป' },
          },
          // Row 1 - ประวัติ
          {
            bounds: { x: 1875, y: 0, width: 625, height: 421 },
            action: { type: 'message', text: 'รายการล่าสุด' },
          },
          // Row 2 - ข้อมูล/งบ
          {
            bounds: { x: 1250, y: 421, width: 625, height: 422 },
            action: { type: 'message', text: 'งบ' },
          },
          // Row 2 - รายการ
          {
            bounds: { x: 1875, y: 421, width: 625, height: 422 },
            action: { type: 'message', text: 'ช่วย' },
          },
          // Row 3 - โปรโมชั่น
          {
            bounds: { x: 0, y: 843, width: 833, height: 421 },
            action: { type: 'uri', uri: LINE_CONFIG.frontendUrl },
          },
          // Row 3 - ประกาศ
          {
            bounds: { x: 833, y: 843, width: 417, height: 421 },
            action: { type: 'message', text: 'สรุป' },
          },
          // Row 3 - ตั้งค่า
          {
            bounds: { x: 1250, y: 843, width: 417, height: 421 },
            action: { type: 'message', text: 'ตั้งค่า' },
          },
          // Row 3 - Help
          {
            bounds: { x: 1667, y: 843, width: 417, height: 421 },
            action: { type: 'postback', data: 'action=help', displayText: '❓ Help' },
          },
          // Row 4 - Bottom bar
          {
            bounds: { x: 0, y: 1264, width: 1250, height: 422 },
            action: { type: 'uri', uri: LINE_CONFIG.frontendUrl },
          },
        ],
      }),
    });

    const menuData = await menuResponse.json();

    if (menuData.richMenuId) {
      // ตั้งเป็น default menu
      await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${menuData.richMenuId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${channelAccessToken}` },
      });

      res.json({ message: '✅ สร้าง Rich Menu สำเร็จ', richMenuId: menuData.richMenuId });
    } else {
      res.status(500).json({ error: 'สร้าง Rich Menu ไม่สำเร็จ', detail: menuData });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// สถานะ LINE Bot
router.get('/status', (req, res) => {
  const { channelAccessToken, channelSecret } = LINE_CONFIG.messaging;
  res.json({
    configured: !!(channelAccessToken && channelSecret),
    webhookUrl: channelAccessToken ? `${req.protocol}://${req.get('host')}/api/line/webhook` : null,
  });
});

export { replyMessage, pushMessage };
export default router;
