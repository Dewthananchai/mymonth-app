import React, { useState } from 'react';
import { User, Mail, Lock, Smartphone, Home, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage({ onNavigateLogin }) {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [promptpayId, setPromptpayId] = useState('');
  const [roomChoice, setRoomChoice] = useState('create'); // 'create' | 'join'
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    try {
      setLoading(true);
      await register({
        full_name: fullName,
        email,
        password,
        promptpay_id: promptpayId,
        room_code: roomChoice === 'join' ? roomCode : null
      });
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-emerald-50/40 to-teal-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 sm:p-10">
        <button
          type="button"
          onClick={onNavigateLogin}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" /> กลับไปหน้าเข้าสู่ระบบ
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>📝 สมัครสมาชิกใหม่</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">เริ่มต้นจัดการค่าใช้จ่ายของคุณและเพื่อนร่วมห้อง</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              👤 ชื่อ - นามสกุล หรือ ชื่อเล่น *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="เช่น ดิว, ป๊อบ"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              📧 อีเมล *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              🔒 รหัสผ่าน (อย่างน้อย 6 ตัวอักษร) *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              📱 เบอร์โทรศัพท์ หรือ พร้อมเพย์ ID
            </label>
            <div className="relative">
              <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={promptpayId}
                onChange={(e) => setPromptpayId(e.target.value)}
                placeholder="0812345678 (สำหรับสร้าง QR โอนเงินคืน)"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Room Selection */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              🏢 การจัดการห้อง (Room):
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setRoomChoice('create')}
                className={`py-2 px-3 rounded-xl border text-center font-medium transition ${
                  roomChoice === 'create'
                    ? 'bg-white border-emerald-500 text-emerald-700 font-bold shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                🏠 สร้างห้องใหม่
              </button>
              <button
                type="button"
                onClick={() => setRoomChoice('join')}
                className={`py-2 px-3 rounded-xl border text-center font-medium transition ${
                  roomChoice === 'join'
                    ? 'bg-white border-emerald-500 text-emerald-700 font-bold shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                🔑 เข้าร่วมห้องที่มีอยู่
              </button>
            </div>

            {roomChoice === 'join' && (
              <div className="pt-2">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="กรอกรหัสห้อง 8 ตัว เช่น ROOM2026"
                  className="w-full px-3 py-2 border border-slate-200 uppercase font-mono rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition active:scale-98 disabled:opacity-50"
          >
            {loading ? 'กำลังบันทึกข้อมูล...' : '✨ ยืนยันสมัครสมาชิก'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          มีบัญชีอยู่แล้ว?{' '}
          <button
            type="button"
            onClick={onNavigateLogin}
            className="text-emerald-700 font-bold hover:underline"
          >
            เข้าสู่ระบบที่นี่
          </button>
        </div>
      </div>
    </div>
  );
}
