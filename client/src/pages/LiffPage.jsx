// LIFF Page — เปิด MyMonth ภายใน LINE
// ================================
// เมื่อกดปุ่ม "เปิด MyMonth" ใน LINE OA จะเปิดหน้านี้
// LIFF จะ auto-login แล้ว redirect ไปหน้าหลักของ MyMonth

import { useEffect, useState } from 'react';

const LIFF_ID = import.meta.env.VITE_LIFF_ID || '';

export default function LiffPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    // ตรวจสอบว่า LIFF ID ตั้งค่าแล้ว
    if (!LIFF_ID) {
      setStatus('no_liff_id');
      return;
    }

    // โหลด LIFF SDK
    const script = document.createElement('script');
    script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
    script.async = true;
    script.onload = async () => {
      try {
        // @ts-ignore
        await window.liff.init({ liffId: LIFF_ID });

        // @ts-ignore
        const isLoggedIn = window.liff.isLoggedIn();

        if (!isLoggedIn) {
          // Login ผ่าน LINE
          // @ts-ignore
          window.liff.login();
          return;
        }

        // ดึง profile
        // @ts-ignore
        const profile = await window.liff.getProfile();

        // ส่ง profile ไป server เพื่อ login/register
        try {
          const API_BASE = window.location.origin;
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
            // เก็บ token ใน localStorage
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            setStatus('success');

            // Redirect ไปหน้าหลัก
            setTimeout(() => {
              window.location.href = '/';
            }, 1500);
          } else {
            setStatus('login_failed');
            setError(data.error || 'Login failed');
          }
        } catch (err) {
          setStatus('login_failed');
          setError('ไม่สามารถเชื่อมต่อ server ได้');
        }
      } catch (err) {
        setStatus('init_failed');
        setError(err.message || 'LIFF init failed');
      }
    };
    script.onerror = () => {
      setStatus('script_error');
      setError('ไม่สามารถโหลด LIFF SDK ได้');
    };
    document.head.appendChild(script);
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-400 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4 animate-bounce">
            🏠
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">MyMonth</h2>
          <p className="text-slate-500 text-sm mb-4">กำลังเชื่อมต่อกับ LINE...</p>
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4">
            ✅
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">เข้าสู่ระบบสำเร็จ!</h2>
          <p className="text-slate-500 text-sm">กำลังเปิด MyMonth...</p>
        </div>
      </div>
    );
  }

  if (status === 'no_liff_id') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="w-20 h-20 bg-yellow-100 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">LIFF ยังไม่ได้ตั้งค่า</h2>
          <p className="text-slate-500 text-sm mb-4">กรุณาตั้งค่า LINE_LIFF_ID ใน environment variables</p>
          <a
            href="/"
            className="inline-block bg-emerald-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-600 transition"
          >
            🏠 ไปหน้าหลัก
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
        <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4">
          ❌
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">เกิดข้อผิดพลาด</h2>
        <p className="text-slate-500 text-sm mb-4">{error}</p>
        <a
          href="/"
          className="inline-block bg-emerald-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-600 transition"
        >
          🏠 ไปหน้าหลัก
        </a>
      </div>
    </div>
  );
}
