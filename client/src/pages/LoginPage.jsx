import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, Mail, Key, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage({ onNavigateRegister }) {
  const { login, googleLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotModal, setForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);
    try {
      // In production, replace with real Google OAuth flow using Google Identity Services
      // https://developers.google.com/identity/gsi/web/guides/overview
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!googleClientId) {
        throw new Error('ระบบ Google Login ยังไม่ได้ตั้งค่า กรุณาเข้าสู่ระบบด้วยอีเมล');
      }
      // TODO: Integrate real Google One-Tap or redirect flow here
      throw new Error('ระบบ Google Login ยังอยู่ในระหว่างการพัฒนา กรุณาเข้าสู่ระบบด้วยอีเมล');
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotSent(true);
    setTimeout(() => {
      setForgotModal(false);
      setForgotSent(false);
      setForgotEmail('');
    }, 3000);
  };

  // Handle LINE Login callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lineSuccess = params.get('line_success');
    const token = params.get('token');
    const userData = params.get('user');
    const error = params.get('error');

    if (lineSuccess && token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        localStorage.setItem('mymonth_token', token);
        window.location.href = '/';
      } catch (e) {
        setError('เข้าสู่ระบบ LINE ไม่สำเร็จ');
      }
    } else if (error) {
      const errorMessages = {
        line_invalid_state: 'การยืนยันตัวตนไม่ถูกต้อง กรุณาลองใหม่',
        line_no_code: 'ไม่ได้รับอนุญาตจาก LINE',
        line_not_configured: 'LINE Login ยังไม่ได้ตั้งค่า',
        line_token_failed: 'แลก token ไม่สำเร็จ กรุณาลองใหม่',
        line_profile_failed: 'ดึงข้อมูล profile ไม่สำเร็จ',
        line_server_error: 'เกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์',
      };
      setError(errorMessages[error] || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ LINE');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-emerald-50/40 to-teal-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left Side: Brand Illustration & Info */}
        <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-emerald-400/20 rounded-full blur-2xl" />

          <div className="relative z-10 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shadow-inner">
              🏠
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">MyMonth</h1>
            <p className="text-emerald-100 text-sm font-medium">
              บันทึก แบ่งปัน จ่ายง่าย <br />
              แอปบริหารค่าใช้จ่ายร่วมสำหรับคู่รักและรูมเมท
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="relative z-10 my-8 space-y-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2.5 text-xs text-emerald-50">
              <Sparkles className="w-4 h-4 text-emerald-300 flex-shrink-0" />
              <span>แยกรายจ่ายส่วนตัว และรายจ่ายร่วมชัดเจน</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-emerald-50">
              <Sparkles className="w-4 h-4 text-emerald-300 flex-shrink-0" />
              <span>ระบบแบ่ง Smart Split ปรับ % ↔ เงิน อัตโนมัติ</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-emerald-50">
              <Sparkles className="w-4 h-4 text-emerald-300 flex-shrink-0" />
              <span>สรุปหนี้พร้อมสร้าง QR Code พร้อมเพย์สแกนจ่ายทันที</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-emerald-50">
              <Sparkles className="w-4 h-4 text-emerald-300 flex-shrink-0" />
              <span>คัดลอกบิลเป็นรูปภาพ วางในแชท LINE ได้ทันที</span>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="relative z-10 text-[11px] text-emerald-200">
            © 2026 MyMonth - เวอร์ชัน 2.0 (ไทย)
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>🔐 เข้าสู่ระบบ</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">ยินดีต้อนรับกลับสู่ MyMonth</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                📧 อีเมล
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                🔒 รหัสผ่าน
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Key className="w-4 h-4" />
              <span>{loading ? 'กำลังเข้าสู่ระบบ...' : '🔑 เข้าสู่ระบบ'}</span>
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center text-[11px] uppercase"><span className="bg-white px-2 text-slate-400">หรือ</span></div>
          </div>

          {/* Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition flex items-center justify-center gap-2 active:scale-98"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>🅶 เข้าสู่ระบบด้วย Google</span>
          </button>

          {/* LINE Login Button */}
          <button
            type="button"
            onClick={() => window.location.href = '/api/line/login'}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#06C755] hover:bg-[#05a847] text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2 active:scale-98 mt-3"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
            </svg>
            <span>💬 เข้าสู่ระบบด้วย LINE</span>
          </button>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onNavigateRegister}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold hover:underline"
            >
              📝 ยังไม่มีบัญชี? สมัครสมาชิกใหม่
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="font-bold text-slate-800 text-base mb-2">ลืมรหัสผ่าน?</h3>
            <p className="text-xs text-slate-500 mb-4">
              กรอกอีเมลของคุณ ระบบจะส่งลิงก์รีเซ็ตรหัสผ่านให้
            </p>
            {forgotSent ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium text-center">
                ✅ ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลเรียบร้อยแล้ว
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotModal(false)}
                    className="flex-1 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700"
                  >
                    ส่งอีเมล
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
