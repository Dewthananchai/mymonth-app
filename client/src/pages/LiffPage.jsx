// LIFF Page — เปิด MyMonth ภายใน LINE (พร้อม Onboarding)
// =======================================================
// ขั้นตอน:
// 1. LIFF Login → ดึง profile จาก LINE
// 2. Onboarding — เบอร์โทร + สร้าง/เข้าร่วมห้อง
// 3. Redirect ไปหน้าหลัก

import { useEffect, useState, useCallback } from 'react';

const LIFF_ID = import.meta.env.VITE_LIFF_ID || '';
const API_BASE = window.location.origin;

export default function LiffPage() {
  const [step, setStep] = useState('loading'); // loading | onboarding | phone | room | creating | joining | success | error
  const [lineProfile, setLineProfile] = useState(null);
  const [phone, setPhone] = useState('');
  const [roomMode, setRoomMode] = useState(''); // 'create' | 'join'
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!LIFF_ID) {
      setStep('no_liff_id');
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

        // ตรวจสอบว่า user มีในระบบแล้วหรือยัง
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
            // user มีในระบบแล้ว — เช็คว่ามีห้องไหม
            if (data.user.room_code) {
              // มีห้องแล้ว → login สำเร็จ
              localStorage.setItem('auth_token', data.token);
              localStorage.setItem('user', JSON.stringify(data.user));
              setStep('success');
              setTimeout(() => { window.location.href = '/'; }, 1500);
            } else {
              // ยังไม่มีห้อง → onboarding
              localStorage.setItem('auth_token', data.token);
              localStorage.setItem('user', JSON.stringify(data.user));
              setStep('phone');
            }
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

  // บันทึกเบอร์โทร → ไปขั้นตอนเลือกห้อง
  const handleSavePhone = useCallback(() => {
    if (phone && !/^[0-9]{9,10}$/.test(phone.replace(/[-\s]/g, ''))) {
      setError('กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (9-10 หลัก)');
      return;
    }
    setError('');
    setStep('room');
  }, [phone]);

  // สร้างห้องใหม่
  const handleCreateRoom = useCallback(async () => {
    if (!roomName.trim()) {
      setError('กรุณากรอกชื่อห้อง');
      return;
    }
    setError('');
    setCreating(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/api/line/liff-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'create', roomName: roomName.trim(), phone }),
      });
      const data = await res.json();
      if (data.success) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        user.room_code = data.room_code;
        localStorage.setItem('user', JSON.stringify(user));
        setStep('success');
        setTimeout(() => { window.location.href = '/'; }, 1500);
      } else {
        setError(data.error || 'สร้างห้องไม่สำเร็จ');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาด');
    }
    setCreating(false);
  }, [roomName, phone]);

  // เข้าร่วมห้อง
  const handleJoinRoom = useCallback(async () => {
    if (!roomCode.trim()) {
      setError('กรุณากรอกรหัสห้อง');
      return;
    }
    setError('');
    setCreating(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/api/line/liff-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'join', roomCode: roomCode.trim().toUpperCase(), phone }),
      });
      const data = await res.json();
      if (data.success) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        user.room_code = data.room_code;
        localStorage.setItem('user', JSON.stringify(user));
        setStep('success');
        setTimeout(() => { window.location.href = '/'; }, 1500);
      } else {
        setError(data.error || 'เข้าร่วมห้องไม่สำเร็จ');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาด');
    }
    setCreating(false);
  }, [roomCode, phone]);

  // ===== Loading =====
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-400 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4 animate-bounce">🏠</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">MyMonth</h2>
          <p className="text-slate-500 text-sm mb-4">กำลังเชื่อมต่อกับ LINE...</p>
          <div className="flex justify-center"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
        </div>
      </div>
    );
  }

  // ===== Success =====
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4">✅</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">ตั้งค่าสำเร็จ!</h2>
          <p className="text-slate-500 text-sm">กำลังเปิด MyMonth...</p>
        </div>
      </div>
    );
  }

  // ===== Error =====
  if (step === 'error' || step === 'no_liff_id') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4">❌</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-slate-500 text-sm mb-4">{error}</p>
          <a href="/" className="inline-block bg-emerald-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-600 transition">🏠 ไปหน้าหลัก</a>
        </div>
      </div>
    );
  }

  // ===== Onboarding Steps =====
  const progressPercent = step === 'phone' ? 33 : step === 'room' ? 66 : 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-sm w-full overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-6 text-center text-white">
          {lineProfile?.pictureUrl && (
            <img src={lineProfile.pictureUrl} alt="" className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-white/50 shadow-lg" />
          )}
          <h2 className="text-lg font-bold">สวัสดี {lineProfile?.displayName || 'ผู้ใช้'}!</h2>
          <p className="text-sm text-white/80 mt-1">ตั้งค่า MyMonth ของคุณ</p>
          {/* Progress Bar */}
          <div className="mt-4 bg-white/20 rounded-full h-2">
            <div className="bg-white rounded-full h-2 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="text-xs text-white/70 mt-1">ขั้นตอน {step === 'phone' ? '1' : '2'}/2</p>
        </div>

        <div className="p-6">

          {/* ===== Step 1: เบอร์โทรศัพท์ ===== */}
          {step === 'phone' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">📱</div>
                <h3 className="font-bold text-slate-800 text-lg">เบอร์โทรศัพท์</h3>
                <p className="text-sm text-slate-500 mt-1">用于ติดต่อและชำระเงิน (พร้อมเพย์)</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">เบอร์โทรศัพท์</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🇹🇭 +66</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="0812345678"
                    className="w-full pl-16 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 outline-none text-lg font-mono transition"
                    maxLength={10}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-xl">{error}</div>
              )}

              <div className="flex gap-2">
                <button onClick={() => { setPhone(''); setStep('room'); }}
                  className="flex-1 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition">
                  ข้าม
                </button>
                <button onClick={handleSavePhone}
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition">
                  ถัดไป →
                </button>
              </div>
            </div>
          )}

          {/* ===== Step 2: เลือกห้อง ===== */}
          {step === 'room' && !roomMode && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">🏠</div>
                <h3 className="font-bold text-slate-800 text-lg">จัดการห้อง</h3>
                <p className="text-sm text-slate-500 mt-1">สร้างห้องใหม่หรือเข้าร่วมห้องที่มีอยู่</p>
              </div>

              {/* ปุ่มสร้างห้องใหม่ */}
              <button onClick={() => setRoomMode('create')}
                className="w-full p-4 border-2 border-emerald-200 bg-emerald-50 rounded-2xl text-left hover:border-emerald-400 transition group">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">➕</span>
                  <div>
                    <p className="font-bold text-slate-800 group-hover:text-emerald-700">สร้างห้องใหม่</p>
                    <p className="text-xs text-slate-500">เป็น Admin ของห้อง ชวนคนอื่นมาเข้าร่วม</p>
                  </div>
                </div>
              </button>

              {/* ปุ่มเข้าร่วมห้อง */}
              <button onClick={() => setRoomMode('join')}
                className="w-full p-4 border-2 border-blue-200 bg-blue-50 rounded-2xl text-left hover:border-blue-400 transition group">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🔑</span>
                  <div>
                    <p className="font-bold text-slate-800 group-hover:text-blue-700">เข้าร่วมห้อง</p>
                    <p className="text-xs text-slate-500">ใส่รหัสห้องที่ได้รับจากเพื่อน</p>
                  </div>
                </div>
              </button>

              <button onClick={() => { setStep('phone'); setError(''); }}
                className="w-full py-2 text-sm text-slate-400 hover:text-slate-600 transition">
                ← ย้อนกลับ
              </button>
            </div>
          )}

          {/* ===== Step 2a: สร้างห้องใหม่ ===== */}
          {step === 'room' && roomMode === 'create' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">➕</div>
                <h3 className="font-bold text-slate-800 text-lg">สร้างห้องใหม่</h3>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">ชื่อห้อง</label>
                <input type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)}
                  placeholder="เช่น ห้อง ดิว & ป๊อบ"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-0 outline-none transition"
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700">
                💡 คุณจะเป็น <strong>Admin</strong> ของห้องนี้ สามารถจัดการสมาชิกและตั้งค่าได้
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-xl">{error}</div>
              )}

              <div className="flex gap-2">
                <button onClick={() => { setRoomMode(''); setError(''); }}
                  className="flex-1 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition">
                  ← ย้อนกลับ
                </button>
                <button onClick={handleCreateRoom} disabled={creating}
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition disabled:opacity-50">
                  {creating ? '⏳ กำลังสร้าง...' : '✅ สร้างห้อง'}
                </button>
              </div>
            </div>
          )}

          {/* ===== Step 2b: เข้าร่วมห้อง ===== */}
          {step === 'room' && roomMode === 'join' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">🔑</div>
                <h3 className="font-bold text-slate-800 text-lg">เข้าร่วมห้อง</h3>
                <p className="text-sm text-slate-500 mt-1">ใส่รหัสห้องที่ได้รับจากเพื่อน</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">รหัสห้อง</label>
                <input type="text" value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="เช่น ABC12345"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 outline-none text-center text-xl font-mono tracking-widest uppercase transition"
                  maxLength={12}
                />
                <p className="text-xs text-slate-400 mt-1 text-center">ตัวอักษรภาษาอังกฤษ + ตัวเลข (4-12 ตัว)</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-xl">{error}</div>
              )}

              <div className="flex gap-2">
                <button onClick={() => { setRoomMode(''); setError(''); }}
                  className="flex-1 py-3 border-2 border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition">
                  ← ย้อนกลับ
                </button>
                <button onClick={handleJoinRoom} disabled={creating}
                  className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition disabled:opacity-50">
                  {creating ? '⏳ กำลังเข้าร่วม...' : '🔑 เข้าร่วม'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
