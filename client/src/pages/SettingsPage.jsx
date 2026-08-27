import React, { useState, useRef, useEffect } from 'react';
import {
  User, Shield, Users, Receipt, PiggyBank, TrendingUp, Trash2, Edit2,
  UserPlus, AlertTriangle, Activity, Settings, Database, Download,
  BarChart3, RefreshCw, CheckCircle2, XCircle, Crown, Clock, Home,
  Key, Save, Check, Copy, UserCheck, Camera, Upload, X, Image
} from 'lucide-react';
import { formatCurrency, formatNumber, formatThaiDate } from '../utils/formatters';
import { useRoom } from '../context/RoomContext';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import UserManagementModal from '../components/UserManagementModal';

const PRESET_AVATARS = [
  { id: 'default', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', label: '👤 รูปเริ่มต้น' },
  { id: 'male1', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', label: '👨 ผู้ชาย 1' },
  { id: 'female1', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', label: '👩 ผู้หญิง 1' },
  { id: 'male2', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', label: '👨 ผู้ชาย 2' },
  { id: 'female2', url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', label: '👩 ผู้หญิง 2' },
  { id: 'couple', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', label: '👩 ผู้หญิง 3' },
];

function generateInitialAvatar(name, colorIndex = 0) {
  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
  const color = colors[colorIndex % colors.length];
  const initial = (name || '?').charAt(0).toUpperCase();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150'><rect width='150' height='150' rx='30' fill='${color}'/><text x='75' y='95' font-size='64' text-anchor='middle' font-family='sans-serif' fill='white' font-weight='bold'>${initial}</text></svg>`
  )}`;
}

export default function SettingsPage() {
  const { user, room, roomMembers, updateProfile, joinRoom } = useAuth();
  const { selectedMonth, summary, expenses, budgetsData, settlementData, showToast } = useAuth();
  const [mainTab, setMainTab] = useState('profile'); // 'profile' | 'admin'

  const isAdmin = user?.role === 'Admin';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={user?.avatar_url || generateInitialAvatar(user?.full_name)}
            alt={user?.full_name}
            className="w-14 h-14 rounded-2xl object-cover ring-4 ring-emerald-500/20"
          />
          <div>
            <h1 className="text-xl font-bold text-slate-900">{user?.full_name}</h1>
            <p className="text-xs text-slate-500">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                user?.role === 'Admin' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
              }`}>
                {user?.role || 'Member'}
              </span>
              <span className="text-[10px] text-slate-400">ห้อง: {user?.room_code}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex gap-1">
        <button
          onClick={() => setMainTab('profile')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            mainTab === 'profile'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <User className="w-4 h-4" />
          <span>👤 โปรไฟล์</span>
        </button>
        {isAdmin && (
          <button
            onClick={() => setMainTab('admin')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              mainTab === 'admin'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>⚙️ หลังบ้าน</span>
          </button>
        )}
      </div>

      {/* Profile Tab */}
      {mainTab === 'profile' && <ProfileSection />}

      {/* Admin Tab */}
      {mainTab === 'admin' && isAdmin && <AdminSection />}
    </div>
  );
}

// ==================== PROFILE SECTION ====================
function ProfileSection() {
  const { user, room, roomMembers, updateProfile, joinRoom } = useAuth();
  const { showToast } = useRoom();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [promptpayId, setPromptpayId] = useState(user?.promptpay_id || '');
  const [roomName, setRoomName] = useState(room?.room_name || '');
  const [targetRoomCode, setTargetRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userManageOpen, setUserManageOpen] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState(null);
  const fileInputRef = useRef(null);

  const [lineStatus, setLineStatus] = useState(null);

  useEffect(() => {
    fetch('/api/line/status').then(r => r.json()).then(setLineStatus).catch(() => {});
  }, []);

  const currentAvatar = previewAvatar || user?.avatar_url || generateInitialAvatar(user?.full_name);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const updates = { full_name: fullName, promptpay_id: promptpayId, room_name: roomName };
      if (previewAvatar) updates.avatar_url = previewAvatar;
      await updateProfile(updates);
      setPreviewAvatar(null);
      showToast('อัปเดตข้อมูลส่วนตัวสำเร็จ', 'success');
    } catch (err) {
      showToast(err.message || 'อัปเดตไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinNewRoom = async (e) => {
    e.preventDefault();
    if (!targetRoomCode.trim()) return;
    try {
      setLoading(true);
      await joinRoom(targetRoomCode);
      showToast(`ย้ายไปห้อง ${targetRoomCode.toUpperCase()} เรียบร้อยแล้ว`, 'success');
      setTargetRoomCode('');
    } catch (err) {
      showToast(err.message || 'เข้าร่วมห้องไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (user?.room_code) {
      navigator.clipboard.writeText(user.room_code);
      setCopied(true);
      showToast('คัดลอกรหัสห้องแล้ว', 'info');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('กรุณาเลือกไฟล์รูปภาพเท่านั้น', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5 MB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { setPreviewAvatar(ev.target.result); showToast('เลือกรูปภาพใหม่แล้ว กดบันทึกเพื่ออัปเดต', 'info'); };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (url) => { setPreviewAvatar(url); setAvatarModalOpen(false); showToast('เลือกรูปภาพใหม่แล้ว กดบันทึกเพื่ออัปเดต', 'info'); };

  const handleGenerateInitial = () => {
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const colorIdx = (user?.full_name?.charCodeAt(0) || 0) % colors.length;
    setPreviewAvatar(generateInitialAvatar(user?.full_name, colorIdx));
    setAvatarModalOpen(false);
    showToast('สร้างรูปจากตัวอักษรแล้ว กดบันทึกเพื่ออัปเดต', 'info');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Edit Form */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" />
            <span>⚙️ ตั้งค่าข้อมูลส่วนตัว</span>
          </h3>
          <form onSubmit={handleUpdateProfile} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ชื่อที่แสดงในระบบ *</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500" required />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">📱 หมายเลขพร้อมเพย์</label>
              <input type="text" value={promptpayId} onChange={(e) => setPromptpayId(e.target.value)} placeholder="เช่น 0812345678" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-emerald-500" />
              <p className="text-[10px] text-slate-400 mt-1">ใช้สำหรับ QR Code พร้อมเพย์อัตโนมัติ</p>
            </div>
            {user?.role === 'Admin' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">🏢 ชื่อห้อง (Admin)</label>
                <input type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500" />
              </div>
            )}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">🖼️ รูปโปรไฟล์</label>
              <div className="flex items-center gap-3">
                <img src={currentAvatar} alt="avatar" className="w-10 h-10 rounded-xl object-cover" />
                <div className="flex-1 flex gap-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition">
                    <Upload className="w-3.5 h-3.5" /> อัปโหลด
                  </button>
                  <button type="button" onClick={() => setAvatarModalOpen(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition">
                    <Image className="w-3.5 h-3.5" /> เลือกรูป
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-98 disabled:opacity-50 flex items-center justify-center gap-1.5">
              <Save className="w-4 h-4" /> บันทึกการเปลี่ยนแปลง
            </button>
          </form>
        </div>

        {/* Room Info & Members */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Home className="w-4 h-4 text-emerald-600" /> 🏢 ห้องปัจจุบัน
            </h3>
            <button onClick={handleCopyCode} className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-mono font-bold">
              <span>{user?.room_code}</span>
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <p className="text-xs text-slate-500">ชื่อห้อง: {room?.room_name || '-'}</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-xs font-semibold text-slate-500">👥 สมาชิก ({roomMembers.length} คน)</p>
              {user?.role === 'Admin' && (
                <button type="button" onClick={() => setUserManageOpen(true)} className="text-xs text-amber-700 font-bold hover:underline">⚙️ จัดการสมาชิก</button>
              )}
            </div>
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
              {roomMembers.map((m) => (
                <div key={m.id} className="p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <img src={m.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'} alt={m.full_name} className="w-7 h-7 rounded-lg object-cover" />
                    <div>
                      <span className="font-semibold text-slate-800">{m.full_name}</span>
                      <span className="text-[10px] text-slate-400 block">{m.email}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${m.role === 'Admin' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'}`}>{m.role}</span>
                    {m.promptpay_id && <div className="text-[10px] text-slate-400 font-mono mt-0.5">PP: {m.promptpay_id}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <form onSubmit={handleJoinNewRoom} className="pt-2 border-t border-slate-100 space-y-2 text-xs">
            <label className="block font-semibold text-slate-700">🔑 เข้าร่วม/ย้ายห้อง:</label>
            <div className="flex gap-2">
              <input type="text" value={targetRoomCode} onChange={(e) => setTargetRoomCode(e.target.value.toUpperCase())} placeholder="รหัสห้อง" className="flex-1 uppercase font-mono px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-500" />
              <button type="submit" className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition">ย้ายห้อง</button>
            </div>
          </form>
        </div>
      </div>

      {/* LINE Connection Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <span className="text-lg">💬</span>
          <span>เชื่อมต่อ LINE OA</span>
          {user?.line_user_id && <span className="text-[10px] px-2 py-0.5 bg-[#06C755] text-white rounded-full font-bold">✓ เชื่อมแล้ว</span>}
        </h3>
        <p className="text-xs text-slate-500">
          เชื่อมต่อบัญชี LINE ของคุณกับ MyMonth เพื่อบันทึกรายจ่ายผ่านแชท LINE OA
        </p>
        {!user?.line_user_id ? (
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <p className="font-semibold text-slate-700">วิธีเชื่อมต่อ:</p>
              <ol className="space-y-1 text-slate-600">
                <li>1. กดปุ่ม "สร้างโค้ดเชื่อมต่อ" ด้านล่าง</li>
                <li>2. เปิดแชท LINE OA "MyMonth"</li>
                <li>3. พิมพ์ "เชื่อม [โค้ด]" ในแชท</li>
                <li>4. รอจนกว่าจะได้ข้อความยืนยัน</li>
              </ol>
            </div>
            <LineConnectButton />
          </div>
        ) : (
          <div className="p-3 bg-[#06C755]/10 rounded-2xl border border-[#06C755]/30">
            <p className="text-xs font-semibold text-[#06C755]">✅ เชื่อมต่อ LINE สำเร็จแล้ว</p>
            <p className="text-[11px] text-slate-600 mt-1">คุณสามารถบันทึกรายจ่ายผ่านแชท LINE OA ได้แล้ว</p>
            <div className="mt-3 space-y-1 text-[11px] text-slate-600">
              <p>💡 <strong>คำสั่งที่ใช้ได้:</strong></p>
              <p>• พิมพ์ <code className="bg-slate-100 px-1 rounded">500 ค่าอาหาร</code> → บันทึกรายจ่าย</p>
              <p>• พิมพ์ <code className="bg-slate-100 px-1 rounded">สรุป</code> → ดูสรุปเดือน</p>
              <p>• พิมพ์ <code className="bg-slate-100 px-1 rounded">ช่วย</code> → ดูคำสั่งทั้งหมด</p>
            </div>
          </div>
        )}
      </div>

      {/* Avatar Picker Modal */}
      {avatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">🖼️ เลือกรูปโปรไฟล์</h3>
              <button onClick={() => setAvatarModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="mt-4 space-y-4">
              <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 hover:border-emerald-400 rounded-2xl text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50 transition">
                <Upload className="w-4 h-4" /> 📁 อัปโหลดรูปจากตัวเครื่อง
              </button>
              <button onClick={handleGenerateInitial} className="w-full flex items-center justify-center gap-2 py-3 border border-slate-200 hover:border-emerald-400 rounded-2xl text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50 transition">
                🔤 สร้างรูปจากตัวอักษร
              </button>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 mb-2">หรือเลือกรูปสำเร็จรูป:</p>
                <div className="grid grid-cols-3 gap-3">
                  {PRESET_AVATARS.map((avatar) => (
                    <button key={avatar.id} onClick={() => handleSelectPreset(avatar.url)} className="group relative rounded-xl overflow-hidden border-2 border-slate-200 hover:border-emerald-500 transition">
                      <img src={avatar.url} alt={avatar.label} className="w-full aspect-square object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center">
                        <Check className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition drop-shadow-lg" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => setAvatarModalOpen(false)} className="mt-4 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition">ปิด</button>
          </div>
        </div>
      )}

      <UserManagementModal isOpen={userManageOpen} onClose={() => setUserManageOpen(false)} />
    </div>
  );
}

// ==================== ADMIN SECTION ====================
function AdminSection() {
  const { user, room, roomMembers } = useAuth();
  const { selectedMonth, summary, expenses, budgetsData, settlementData } = useRoom();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [systemStats, setSystemStats] = useState(null);
  const [activityLog, setActivityLog] = useState([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  useEffect(() => { fetchAdminData(); }, [selectedMonth]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const data = await api.get('/admin/stats', { month: selectedMonth });
      setSystemStats(data.stats);
      setActivityLog(data.activity || []);
    } catch (err) { console.error('Admin data fetch error:', err); }
    finally { setLoading(false); }
  };

  const totalExpenses = summary.totalAll || 0;
  const totalShared = summary.totalShared || 0;
  const totalPersonal = summary.totalPersonal || 0;
  const memberCount = roomMembers.length;
  const totalBudget = budgetsData?.total_budget || 0;
  const totalSpent = budgetsData?.total_spent || 0;

  const sections = [
    { id: 'dashboard', label: '📊 ภาพรวม', icon: BarChart3 },
    { id: 'members', label: '👥 จัดการสมาชิก', icon: Users },
    { id: 'settings', label: '⚙️ ตั้งค่าห้อง', icon: Settings },
    { id: 'activity', label: '📋 กิจกรรม', icon: Activity },
    { id: 'export', label: '📤 ส่งออกข้อมูล', icon: Download },
  ];

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-900 p-5 sm:p-6 rounded-3xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full">Admin Panel</span>
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">จัดการระบบหลังบ้าน</h2>
            <p className="text-xs text-slate-300 mt-1">ห้อง: {room?.room_name || user?.room_code}</p>
          </div>
          <button onClick={fetchAdminData} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-xs font-semibold transition active:scale-95 border border-white/10">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> รีเฟรช
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-1">
        {sections.map(s => {
          const Icon = s.icon;
          return (
            <button key={s.id} onClick={() => setActiveSection(s.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${activeSection === s.id ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
              <Icon className="w-4 h-4" /> <span className="hidden sm:inline">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* DASHBOARD */}
      {activeSection === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="👥" label="สมาชิก" value={memberCount} sub="คน" color="emerald" />
            <StatCard icon="💰" label="รายจ่ายเดือนนี้" value={formatNumber(totalExpenses)} sub="฿" color="blue" />
            <StatCard icon="🏦" label="งบประมาณ" value={formatNumber(totalBudget)} sub="฿" color="amber" />
            <StatCard icon="📊" label="ใช้ไปแล้ว" value={`${budgetsData?.percentage_used || 0}%`} sub={formatNumber(totalSpent)} color="rose" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Crown className="w-4 h-4 text-amber-500" /> ข้อมูลห้อง</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100"><span className="text-slate-500">รหัสห้อง</span><span className="font-mono font-bold text-slate-800">{user?.room_code}</span></div>
                <div className="flex justify-between py-2 border-b border-slate-100"><span className="text-slate-500">ชื่อห้อง</span><span className="font-semibold text-slate-800">{room?.room_name}</span></div>
                <div className="flex justify-between py-2"><span className="text-slate-500">Admin</span><span className="font-semibold text-emerald-700">{user?.full_name}</span></div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" /> สรุปรายเดือน</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100"><span className="text-slate-500">รายจ่ายทั้งหมด</span><span className="font-bold text-slate-900">{formatCurrency(totalExpenses)}</span></div>
                <div className="flex justify-between py-2 border-b border-slate-100"><span className="text-slate-500">รายจ่ายร่วม</span><span className="font-bold text-emerald-700">{formatCurrency(totalShared)}</span></div>
                <div className="flex justify-between py-2"><span className="text-slate-500">รายจ่ายส่วนตัว</span><span className="font-bold text-blue-700">{formatCurrency(totalPersonal)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MEMBERS */}
      {activeSection === 'members' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">👥 สมาชิกทั้งหมด ({roomMembers.length} คน)</h3>
              <button onClick={() => setShowAddMember(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition active:scale-95"><UserPlus className="w-3.5 h-3.5" /> เพิ่มสมาชิก</button>
            </div>
            <div className="divide-y divide-slate-100">
              {roomMembers.map((m) => (
                <div key={m.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition">
                  <div className="flex items-center gap-3">
                    <img src={m.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.full_name}`} alt={m.full_name} className="w-10 h-10 rounded-xl object-cover ring-2 ring-slate-100" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{m.full_name}</span>
                        {m.role === 'Admin' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">👑 Admin</span>}
                      </div>
                      <p className="text-[11px] text-slate-500">{m.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditingMember(m)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="แก้ไข"><Edit2 className="w-3.5 h-3.5" /></button>
                    {m.id !== user?.id && (
                      <button onClick={async () => { if (!window.confirm(`ลบ ${m.full_name}?`)) return; try { await api.delete(`/admin/users/${m.id}`); window.location.reload(); } catch (err) { alert(err.message); } }} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="ลบ"><Trash2 className="w-3.5 h-3.5" /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {showAddMember && <AddMemberModal onClose={() => setShowAddMember(false)} />}
          {editingMember && <EditMemberModal member={editingMember} onClose={() => setEditingMember(null)} />}
        </div>
      )}

      {/* SETTINGS */}
      {activeSection === 'settings' && <RoomSettingsSection />}

      {/* ACTIVITY */}
      {activeSection === 'activity' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-500" /> กิจกรรมล่าสุด</h3>
          {activityLog.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">📋</div>
              <p className="text-sm font-semibold text-slate-500">ยังไม่มีกิจกรรม</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activityLog.map((log, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 text-sm">{log.icon || '📝'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800">{log.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{log.message}</p>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1"><Clock className="w-3 h-3" /> {formatThaiDate(log.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EXPORT */}
      {activeSection === 'export' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Download className="w-4 h-4 text-emerald-500" /> ส่งออกข้อมูล</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={async () => { try { const data = await api.get('/admin/export'); const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `MyMonth-${user?.room_code}-backup.json`; a.click(); URL.revokeObjectURL(url); } catch (err) { alert('ไม่สามารถส่งออกได้: ' + err.message); } }} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-left transition">
              <div className="text-2xl mb-2">📊</div>
              <h4 className="text-sm font-bold text-slate-800">ส่งออกข้อมูลทั้งหมด</h4>
              <p className="text-[11px] text-slate-500 mt-1">ดาวน์โหลด backup JSON</p>
            </button>
            <button onClick={async () => { if (!window.confirm('⚠️ ลบข้อมูลเดือนนี้ทั้งหมด?')) return; if (!window.confirm('⚠️ ไม่สามารถย้อนกลับได้ ยืนยัน?')) return; try { await api.delete('/admin/clear-month', { month: selectedMonth }); alert('ลบสำเร็จ'); window.location.reload(); } catch (err) { alert(err.message); } }} className="p-4 rounded-2xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-left transition">
              <div className="text-2xl mb-2">🗑️</div>
              <h4 className="text-sm font-bold text-rose-800">ลบข้อมูลเดือนนี้</h4>
              <p className="text-[11px] text-slate-500 mt-1">ลบรายจ่ายเดือนที่เลือก</p>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== SUB COMPONENTS ====================
function StatCard({ icon, label, value, sub, color }) {
  const colors = { emerald: 'bg-emerald-50 text-emerald-600', blue: 'bg-blue-50 text-blue-600', amber: 'bg-amber-50 text-amber-600', rose: 'bg-rose-50 text-rose-600' };
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-xl ${colors[color]} flex items-center justify-center text-sm`}>{icon}</div>
        <span className="text-[11px] text-slate-500 font-medium">{label}</span>
      </div>
      <div>
        <span className="text-xl font-extrabold text-slate-900">{value}</span>
        {sub && <span className="text-xs text-slate-400 ml-1">{sub}</span>}
      </div>
    </div>
  );
}

function RoomSettingsSection() {
  const { room } = useAuth();
  const [roomName, setRoomName] = useState(room?.room_name || '');
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    try { setSaving(true); await api.put('/auth/profile', { room_name: roomName }); alert('บันทึกสำเร็จ'); }
    catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Settings className="w-4 h-4 text-emerald-500" /> ตั้งค่าห้อง</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">🏢 ชื่อห้อง</label>
          <input type="text" value={roomName} onChange={(e) => setRoomName(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">🔑 รหัสห้อง</label>
          <input type="text" value={room?.room_code || ''} readOnly className="w-full px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-500" />
          <p className="text-[10px] text-slate-400 mt-1">รหัสห้องไม่สามารถเปลี่ยนได้</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-50">
          {saving ? 'กำลังบันทึก...' : '💾 บันทึกการตั้งค่า'}
        </button>
      </div>
    </div>
  );
}

function AddMemberModal({ onClose }) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => { e.preventDefault(); try { setLoading(true); await api.post('/admin/users', { full_name: name, email, password }); onClose(); window.location.reload(); } catch (err) { alert(err.message); } finally { setLoading(false); } };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
        <h3 className="font-bold text-slate-900 text-base mb-4">👤 เพิ่มสมาชิกใหม่</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="ชื่อ-นามสกุล" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500" required />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="อีเมล" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500" required />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="รหัสผ่าน (≥6 ตัว)" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500" required minLength={6} />
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">ยกเลิก</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50">{loading ? 'กำลังเพิ่ม...' : '✅ เพิ่มสมาชิก'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditMemberModal({ member, onClose }) {
  const [name, setName] = useState(member.full_name); const [role, setRole] = useState(member.role); const [promptpay, setPromptpay] = useState(member.promptpay_id || ''); const [password, setPassword] = useState(''); const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => { e.preventDefault(); try { setLoading(true); const updates = { full_name: name, role, promptpay_id: promptpay }; if (password) updates.password = password; await api.put(`/admin/users/${member.id}`, updates); onClose(); window.location.reload(); } catch (err) { alert(err.message); } finally { setLoading(false); } };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
        <h3 className="font-bold text-slate-900 text-base mb-4">✏️ แก้ไขข้อมูลสมาชิก</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500" required />
          <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500">
            <option value="Admin">Admin</option><option value="Member">Member</option>
          </select>
          <input type="text" value={promptpay} onChange={e => setPromptpay(e.target.value)} placeholder="PromptPay ID" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="รหัสผ่านใหม่ (ไม่ต้องใส่ถ้าไม่เปลี่ยน)" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500" />
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">ยกเลิก</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50">{loading ? 'กำลังบันทึก...' : '💾 บันทึก'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LineConnectButton() {
  const [linkCode, setLinkCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerateCode = async () => {
    try {
      setLoading(true);
      const data = await api.post('/auth/line-link-code');
      setLinkCode(data.code);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (linkCode) {
      navigator.clipboard.writeText(`เชื่อม ${linkCode}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleGenerateCode}
        disabled={loading}
        className="w-full py-2.5 px-4 bg-[#06C755] hover:bg-[#05a847] text-white rounded-xl text-xs font-bold shadow-md transition active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? 'กำลังสร้างโค้ด...' : '🔗 สร้างโค้ดเชื่อมต่อ LINE'}
      </button>
      {linkCode && (
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
          <p className="text-[11px] text-slate-500 mb-2">โค้ดเชื่อมต่อของคุณ:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800">
              เชื่อม {linkCode}
            </code>
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition flex items-center gap-1"
            >
              {copied ? <><Check className="w-3.5 h-3.5 text-emerald-600" /> คัดลอกแล้ว</> : <><Copy className="w-3.5 h-3.5" /> คัดลอก</>}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">เปิดแชท LINE OA "MyMonth" แล้วพิมพ์โค้ดนี้</p>
        </div>
      )}
    </div>
  );
}
