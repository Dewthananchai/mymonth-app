// LIFF Expense Form — จดรายจ่ายผ่าน LIFF
// ==========================================
// Flow: กดปุ่ม "จดเลย" → เปิดฟอร์มนี้ → กรอกรายการ → กดบันทึก
//       → liff.sendMessages() ส่งข้อความเข้าแชท → liff.closeWindow()

import { useEffect, useState, useCallback } from 'react';

const LIFF_ID = import.meta.env.VITE_LIFF_ID || '';
const API_BASE = window.location.origin;

// หมวดหมู่expense
const CATEGORIES = [
  { id: 'food', name: 'ค่าอาหาร', icon: '🍜', keywords: ['ข้าว', 'อาหาร', 'กินข้าว', 'กาแฟ', 'ขนม', 'น้ำ'] },
  { id: 'transport', name: 'ค่าเดินทาง', icon: '🚗', keywords: ['ค่ารถ', 'ค่าน้ำมัน', 'ค่าแท็กซี่', 'ค่า BTS', 'ค่า MRT'] },
  { id: 'utility', name: 'ค่าสาธารณูปโภค', icon: '⚡', keywords: ['ค่าไฟ', 'ค่าน้ำ', 'ค่าเน็ต', 'ค่าอินเทอร์เน็ต'] },
  { id: 'entertainment', name: 'บันเทิง', icon: '🎬', keywords: ['ค่าเที่ยว', 'ค่าดูหนัง', 'ค่าเกม', 'Netflix'] },
  { id: 'health', name: 'ค่ารักษาพยาบาล', icon: '💊', keywords: ['ค่าหมอ', 'ค่ายา', 'ค่าโรงพยาบาล'] },
  { id: 'other', name: 'อื่นๆ', icon: '➕', keywords: [] },
];

export default function LiffExpenseForm() {
  const [step, setStep] = useState('loading'); // loading | form | sending | success | error
  const [lineProfile, setLineProfile] = useState(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseType, setExpenseType] = useState('personal'); // personal | shared
  const [error, setError] = useState('');
  const [matchedCategory, setMatchedCategory] = useState(null);

  // ตรวจสอบหมวดหมู่อัตโนมัติ
  useEffect(() => {
    if (!description) {
      setMatchedCategory(null);
      return;
    }
    const descLower = description.toLowerCase();
    for (const cat of CATEGORIES) {
      if (cat.keywords.some(kw => descLower.includes(kw))) {
        setMatchedCategory(cat);
        return;
      }
    }
    setMatchedCategory(CATEGORIES.find(c => c.id === 'other'));
  }, [description]);

  // LIFF Init
  useEffect(() => {
    if (!LIFF_ID) {
      setError('LIFF_ID ไม่ได้ตั้งค่า');
      setStep('error');
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
    script.async = true;
    script.onload = async () => {
      try {
        await window.liff.init({ liffId: LIFF_ID });

        if (!window.liff.isLoggedIn()) {
          window.liff.login();
          return;
        }

        const profile = await window.liff.getProfile();
        setLineProfile(profile);
        setStep('form');
      } catch (err) {
        setError(err.message || 'LIFF init failed');
        setStep('error');
      }
    };
    script.onerror = () => {
      setError('ไม่สามารถโหลด LIFF SDK ได้');
      setStep('error');
    };
    document.head.appendChild(script);
  }, []);

  // ส่งข้อความเข้าแชท
  const handleSubmit = useCallback(async () => {
    if (!description.trim()) {
      setError('กรุณากรอกรายการ');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('กรุณากรอกจำนวนเงิน');
      return;
    }

    setError('');
    setStep('sending');

    try {
      // สร้างข้อความในรูปแบบที่ webhook parse ได้
      const categoryText = matchedCategory ? ` [${matchedCategory.name}]` : '';
      const messageText = `${description.trim()} ${amount}${categoryText}`;

      // ส่งข้อความเข้าแชท
      await window.liff.sendMessages([
        {
          type: 'text',
          text: messageText,
        },
      ]);

      // ปิด LIFF window
      window.liff.closeWindow();
    } catch (err) {
      console.error('sendMessages error:', err);
      setError('ไม่สามารถส่งข้อความได้: ' + err.message);
      setStep('error');
    }
  }, [description, amount, matchedCategory]);

  // ===== Loading =====
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-rose-400 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4 animate-bounce">💰</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">จดรายจ่าย</h2>
          <p className="text-slate-500 text-sm mb-4">กำลังเชื่อมต่อกับ LINE...</p>
          <div className="flex justify-center"><div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" /></div>
        </div>
      </div>
    );
  }

  // ===== Success =====
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4">✅</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">บันทึกสำเร็จ!</h2>
          <p className="text-slate-500 text-sm">กำลังปิดหน้าต่าง...</p>
        </div>
      </div>
    );
  }

  // ===== Error =====
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4">❌</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-slate-500 text-sm mb-4">{error}</p>
          <button onClick={() => window.liff?.closeWindow()}
            className="bg-slate-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-600 transition">
            ปิด
          </button>
        </div>
      </div>
    );
  }

  // ===== Sending =====
  if (step === 'sending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4 animate-pulse">📤</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">กำลังส่ง...</h2>
          <p className="text-slate-500 text-sm">กรุณารอสักครู่</p>
        </div>
      </div>
    );
  }

  // ===== Form =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-br from-pink-500 to-rose-500 p-6 text-center text-white">
          {lineProfile?.pictureUrl && (
            <img src={lineProfile.pictureUrl} alt="" className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-white/50 shadow-lg" />
          )}
          <h2 className="text-lg font-bold">💰 จดรายจ่าย</h2>
          <p className="text-sm text-white/80 mt-1">{lineProfile?.displayName || 'ผู้ใช้'}</p>
        </div>

        <div className="p-6 space-y-4">

          {/* หมวดหมู่ที่จับคู่ได้ */}
          {matchedCategory && (
            <div className="bg-pink-50 border border-pink-200 rounded-xl p-3 text-center">
              <span className="text-2xl">{matchedCategory.icon}</span>
              <p className="text-sm font-semibold text-pink-700 mt-1">{matchedCategory.name}</p>
            </div>
          )}

          {/* รายละเอียด */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">รายละเอียด</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="เช่น ค่าไฟ, ค่าอาหารกลางวัน"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-pink-500 focus:ring-0 outline-none transition"
              autoFocus
            />
          </div>

          {/* จำนวนเงิน */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">จำนวนเงิน (฿)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-pink-500 focus:ring-0 outline-none text-xl font-bold text-center transition"
            />
          </div>

          {/* ประเภทรายจ่าย */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">ประเภท</label>
            <div className="flex gap-2">
              <button
                onClick={() => setExpenseType('personal')}
                className={`flex-1 py-3 rounded-xl font-semibold transition ${
                  expenseType === 'personal'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                🔵 ส่วนตัว
              </button>
              <button
                onClick={() => setExpenseType('shared')}
                className={`flex-1 py-3 rounded-xl font-semibold transition ${
                  expenseType === 'shared'
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                🟢 ร่วม
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-xl">{error}</div>
          )}

          {/* ปุ่มบันทึก */}
          <button
            onClick={handleSubmit}
            disabled={!description.trim() || !amount || parseFloat(amount) <= 0}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-bold text-lg hover:from-pink-600 hover:to-rose-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-pink-500/30"
          >
            💰 บันทึกรายจ่าย
          </button>

          {/* ปุ่มยกเลิก */}
          <button
            onClick={() => window.liff?.closeWindow()}
            className="w-full py-3 text-slate-500 font-semibold hover:text-slate-700 transition"
          >
            ยกเลิก
          </button>

        </div>
      </div>
    </div>
  );
}
