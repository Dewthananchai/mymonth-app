// LIFF Expense Form — จดรายจ่ายผ่าน LIFF (ใช้ฟอร์มเดิม)
// ============================================================
// Flow: กดปุ่ม "จดเลย" → เปิด LIFF → โหลดฟอร์ม AddExpenseModal
//       → กรอกข้อมูล → กดบันทึก → บันทึกลง database ตรงๆ
//       → liff.closeWindow() ปิดกลับมาแชท

import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { RoomProvider, useRoom } from '../context/RoomContext';
import AddExpenseModal from './AddExpenseModal';

const LIFF_ID = import.meta.env.VITE_LIFF_ID || '';
const API_BASE = window.location.origin;

// Inner component ที่ใช้ Auth + Room context
function LiffExpenseFormInner() {
  const [step, setStep] = useState('loading'); // loading | form | success | error
  const [error, setError] = useState('');
  const [lineProfile, setLineProfile] = useState(null);
  const { user, loading: authLoading } = useAuth();
  const { fetchExpenses } = useRoom();

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

        // Login user เข้าระบบ
        try {
          const res = await fetch(`${API_BASE}/api/line/liff-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lineUserId: profile.userId,
              displayName: profile.displayName,
              pictureUrl: profile.pictureUrl || '',
            }),
          });

          const data = await res.json();

          if (data.token && data.user) {
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            if (!data.user.room_code) {
              // ยังไม่มีห้อง → ไป onboarding
              window.location.href = '/liff';
              return;
            }

            // มีห้องแล้ว → แสดงฟอร์ม
            setStep('form');
          } else {
            setError(data.error || 'Login failed');
            setStep('error');
          }
        } catch (err) {
          setError('ไม่สามารถเชื่อมต่อ server ได้');
          setStep('error');
        }
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

  // ปิด LIFF
  const handleClose = () => {
    try {
      window.liff.closeWindow();
    } catch {
      window.history.back();
    }
  };

  // บันทึกสำเร็จ → ปิด LIFF
  const handleSaveSuccess = async () => {
    setStep('success');
    // รอให้ fetchExpenses เสร็จก่อน
    setTimeout(() => {
      handleClose();
    }, 1500);
  };

  // ===== Loading =====
  if (step === 'loading' || authLoading) {
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
          <button onClick={handleClose}
            className="bg-slate-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-600 transition">
            ปิด
          </button>
        </div>
      </div>
    );
  }

  // ===== Form (AddExpenseModal) =====
  return (
    <div className="min-h-screen bg-slate-100">
      <AddExpenseModal
        isOpen={true}
        onClose={handleSaveSuccess}
      />
    </div>
  );
}

// Wrapper ที่มี Auth + Room context
export default function LiffExpenseForm() {
  return (
    <AuthProvider>
      <RoomProvider>
        <LiffExpenseFormInner />
      </RoomProvider>
    </AuthProvider>
  );
}
