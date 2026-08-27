import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  LayoutDashboard, Users, Home, LogOut, Shield, Database,
  Activity, BarChart3, Settings, Menu, X, Eye, Trash2
} from 'lucide-react';
import api from './api';

// ========== AUTH CONTEXT ==========
function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      api.get('/super-admin/me').then(data => {
        setAdmin(data.user);
      }).catch(() => {
        localStorage.removeItem('admin_token');
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await api.post('/super-admin/login', { email, password });
    localStorage.setItem('admin_token', data.token);
    setAdmin(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    setAdmin(null);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-slate-400 text-sm">กำลังโหลด...</div></div>;

  return (
    <AdminContext.Provider value={{ admin, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
}

import { createContext, useContext } from 'react';
const AdminContext = createContext(null);
export function useAdmin() { return useContext(AdminContext); }

// ========== LOGIN PAGE ==========
function LoginPage() {
  const { login } = useAdmin();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-700 flex items-center justify-center text-3xl mb-4">
            ⚙️
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">MyMonth Admin</h1>
          <p className="text-xs text-slate-500 mt-1">ระบบจัดการหลังบ้าน</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">อีเมล Super Admin</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
              placeholder="admin@mymonth.app" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสผ่าน</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
              placeholder="••••••••" required />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition disabled:opacity-50">
            {loading ? 'กำลังเข้าสู่ระบบ...' : '🔑 เข้าสู่ระบบ Admin'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ========== SIDEBAR ==========
function Sidebar({ children }) {
  const { admin, logout } = useAdmin();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { path: '/', label: '📊 ภาพรวม', icon: LayoutDashboard },
    { path: '/rooms', label: '🏠 จัดการห้อง', icon: Home },
    { path: '/users', label: '👥 จัดการผู้ใช้', icon: Users },
    { path: '/system', label: '⚙️ ระบบ', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-white flex-col flex-shrink-0">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚙️</span>
            <div>
              <h1 className="font-extrabold text-sm">MyMonth Admin</h1>
              <p className="text-[10px] text-slate-400">Super Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <Link key={item.path} to={item.path}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                location.pathname === item.path ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-2 mb-3 px-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-300">{admin?.full_name}</span>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <LogOut className="w-4 h-4" /> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <span className="font-bold text-sm">MyMonth Admin</span>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-slate-600">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {mobileOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 p-4 space-y-1">
            {navItems.map(item => (
              <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 rounded-xl text-xs font-semibold ${
                  location.pathname === item.path ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600'
                }`}>
                {item.label}
              </Link>
            ))}
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

// ========== DASHBOARD PAGE ==========
function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await api.get('/super-admin/stats');
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-400 text-sm animate-pulse">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">📊 ภาพรวมระบบ</h2>
        <p className="text-xs text-slate-500 mt-1">สถิติทั้งหมดของ MyMonth</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="🏠" label="ห้องทั้งหมด" value={stats?.totalRooms || 0} color="emerald" />
        <StatCard icon="👥" label="ผู้ใช้ทั้งหมด" value={stats?.totalUsers || 0} color="blue" />
        <StatCard icon="💰" label="รายจ่ายทั้งหมด" value={`${(stats?.totalExpenses || 0).toLocaleString()} ฿`} color="amber" />
        <StatCard icon="📋" label="รายการทั้งหมด" value={stats?.totalExpenseItems || 0} color="rose" />
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200">
        <h3 className="text-sm font-bold text-slate-800 mb-4">📋 กิจกรรมล่าสุด</h3>
        {stats?.recentActivity?.length > 0 ? (
          <div className="space-y-2">
            {stats.recentActivity.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl text-xs">
                <span className="text-lg">{a.icon}</span>
                <div className="flex-1">
                  <span className="font-semibold text-slate-800">{a.title}</span>
                  <span className="text-slate-500 ml-2">{a.message}</span>
                </div>
                <span className="text-slate-400 text-[10px]">{a.time}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-6">ยังไม่มีกิจกรรม</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const colors = { emerald: 'bg-emerald-50', blue: 'bg-blue-50', amber: 'bg-amber-50', rose: 'bg-rose-50' };
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
      <div className={`w-10 h-10 rounded-xl ${colors[color]} flex items-center justify-center text-xl`}>{icon}</div>
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

// ========== ROOMS PAGE ==========
function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingRoom, setDeletingRoom] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { loadRooms(); }, []);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const data = await api.get('/super-admin/rooms');
      setRooms(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filteredRooms = rooms.filter(r => {
    const q = search.toLowerCase();
    return !q || r.room_code.toLowerCase().includes(q) || r.room_name.toLowerCase().includes(q);
  });

  const handleDeleteRoom = async (roomCode) => {
    try {
      await api.delete(`/super-admin/rooms/${roomCode}`);
      setDeletingRoom(null);
      setDeleteConfirmText('');
      loadRooms();
    } catch (err) {
      alert(err.message || 'ไม่สามารถลบห้องได้');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">🏠 จัดการห้อง</h2>
          <p className="text-xs text-slate-500 mt-1">รายชื่อห้องทั้งหมดในระบบ</p>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 ค้นหาห้อง..."
          className="px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 w-full sm:w-64"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500 font-semibold">
            <tr>
              <th className="p-3.5 text-left">รหัสห้อง</th>
              <th className="p-3.5 text-left">ชื่อห้อง</th>
              <th className="p-3.5 text-center">สมาชิก</th>
              <th className="p-3.5 text-center">รายการ</th>
              <th className="p-3.5 text-right">ยอดรวม</th>
              <th className="p-3.5 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="6" className="p-8 text-center text-slate-400 animate-pulse">กำลังโหลด...</td></tr>
            ) : filteredRooms.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-slate-400">{search ? 'ไม่พบห้องที่ค้นหา' : 'ยังไม่มีห้องในระบบ'}</td></tr>
            ) : filteredRooms.map(room => (
              <tr key={room.room_code} className="hover:bg-slate-50/60">
                <td className="p-3 font-mono font-bold text-slate-800">{room.room_code}</td>
                <td className="p-3 text-slate-700">{room.room_name}</td>
                <td className="p-3 text-center">{room.memberCount}</td>
                <td className="p-3 text-center">{room.expenseCount}</td>
                <td className="p-3 text-right font-bold text-slate-900">{room.totalExpenses.toLocaleString()} ฿</td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Link to={`/rooms/${room.room_code}`}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 transition">
                      <Eye className="w-3.5 h-3.5 inline mr-1" />ดู
                    </Link>
                    {room.room_code !== 'SYSADMIN' && (
                      <button
                        onClick={() => { setDeletingRoom(room); setDeleteConfirmText(''); }}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 rounded-lg text-[11px] font-semibold text-rose-600 transition">
                        <Trash2 className="w-3.5 h-3.5 inline mr-1" />ลบ
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Room Confirm Modal */}
      {deletingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">🗑️ ลบห้อง</h3>
                <p className="text-xs text-slate-500">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 rounded-xl text-[11px] text-rose-700 space-y-1">
              <p className="font-bold">ห้อง: {deletingRoom.room_name} ({deletingRoom.room_code})</p>
              <p>จะลบข้อมูลทั้งหมด:</p>
              <ul className="list-disc list-inside ml-2">
                <li>รายจ่าย {deletingRoom.expenseCount} รายการ</li>
                <li>สมาชิก {deletingRoom.memberCount} คน (จะถูกนำออก)</li>
                <li>งบประมาณ, การชำระเงิน, การแจ้งเตือนทั้งหมด</li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-rose-800 mb-1">
                พิมพ์ <span className="font-mono bg-rose-100 px-1 rounded">ลบห้อง</span> เพื่อยืนยัน
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="พิมพ์ ลบห้อง"
                className="w-full px-3 py-2.5 border-2 border-rose-300 rounded-xl text-xs focus:outline-none focus:border-rose-500 font-bold"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setDeletingRoom(null); setDeleteConfirmText(''); }}
                className="flex-1 py-2.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition">
                ยกเลิก
              </button>
              <button
                onClick={() => handleDeleteRoom(deletingRoom.room_code)}
                disabled={deleteConfirmText !== 'ลบห้อง'}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition disabled:opacity-40 disabled:cursor-not-allowed">
                🗑️ ลบห้องถาวร
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== ROOM DETAIL PAGE ==========
function RoomDetailPage() {
  const { roomCode } = useParams();
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  useEffect(() => { loadRoom(); }, [roomCode]);

  const loadRoom = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/super-admin/rooms/${roomCode}`);
      setRoomData(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDeleteMember = async (userId, name) => {
    if (!window.confirm(`นำ ${name} ออกจากห้องนี้?`)) return;
    try {
      await api.delete(`/super-admin/rooms/${roomCode}/members/${userId}`);
      loadRoom();
    } catch (err) { alert(err.message); }
  };

  if (loading) return <div className="text-center py-20 text-slate-400 text-sm animate-pulse">กำลังโหลด...</div>;
  if (!roomData) return <div className="text-center py-20 text-slate-400 text-sm">ไม่พบห้องนี้</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/rooms" className="text-xs text-slate-500 hover:text-emerald-600 transition">← กลับ</Link>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">🏠 {roomData.room.room_name}</h2>
          <p className="text-xs text-slate-500 mt-1">รหัสห้อง: <span className="font-mono font-bold text-slate-700">{roomData.room.room_code}</span></p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-[11px] text-slate-500">👥 สมาชิก</p>
          <p className="text-xl font-extrabold text-slate-900">{roomData.members.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-[11px] text-slate-500">📋 รายการ</p>
          <p className="text-xl font-extrabold text-slate-900">{roomData.expenses}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-[11px] text-slate-500">💰 ยอดรวม</p>
          <p className="text-xl font-extrabold text-slate-900">{roomData.totalExpenses.toLocaleString()} ฿</p>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">👥 สมาชิกในห้อง ({roomData.members.length} คน)</h3>
          <button onClick={() => setShowAddModal(true)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold transition">
            ➕ เพิ่มสมาชิก
          </button>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-slate-50/50 text-slate-500 font-semibold">
            <tr>
              <th className="p-3.5 text-left">ชื่อ</th>
              <th className="p-3.5 text-left">อีเมล</th>
              <th className="p-3.5 text-center">บทบาท</th>
              <th className="p-3.5 text-center">พร้อมเพย์</th>
              <th className="p-3.5 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {roomData.members.length === 0 ? (
              <tr><td colSpan="5" className="p-8 text-center text-slate-400">ยังไม่มีสมาชิก</td></tr>
            ) : roomData.members.map(m => (
              <tr key={m.id} className="hover:bg-slate-50/60">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <img src={m.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.full_name}`} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    <span className="font-semibold text-slate-800">{m.full_name}</span>
                  </div>
                </td>
                <td className="p-3 text-slate-600">{m.email}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    m.role === 'Admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                  }`}>{m.role}</span>
                </td>
                <td className="p-3 text-center font-mono text-[11px] text-slate-500">{m.promptpay_id || '-'}</td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => setEditingMember(m)} className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold transition">
                      ✏️ แก้ไข
                    </button>
                    <button onClick={() => handleDeleteMember(m.id, m.full_name)} className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold transition">
                      🗑️ ลบ
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Member Modal */}
      {showAddModal && <AddMemberModal roomCode={roomCode} onClose={() => { setShowAddModal(false); loadRoom(); }} />}
      {editingMember && <EditMemberModal roomCode={roomCode} member={editingMember} onClose={() => { setEditingMember(null); loadRoom(); }} />}
    </div>
  );
}

function AddMemberModal({ roomCode, onClose }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post(`/super-admin/rooms/${roomCode}/members`, { full_name: name, email, password, role });
      onClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <h3 className="font-bold text-slate-900 text-base">➕ เพิ่มสมาชิกใหม่</h3>
        {error && <div className="p-2 bg-rose-50 rounded-xl text-rose-700 text-xs">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="ชื่อ-นามสกุล" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500" required />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="อีเมล" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500" required />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="รหัสผ่าน (≥6 ตัว)" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500" required minLength={6} />
          <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500">
            <option value="Member">Member</option>
            <option value="Admin">Admin</option>
          </select>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">ยกเลิก</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50">{loading ? 'กำลังเพิ่ม...' : '✅ เพิ่มสมาชิก'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditMemberModal({ roomCode, member, onClose }) {
  const [name, setName] = useState(member.full_name);
  const [email, setEmail] = useState(member.email);
  const [role, setRole] = useState(member.role);
  const [promptpay, setPromptpay] = useState(member.promptpay_id || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const updates = { full_name: name, email, role, promptpay_id: promptpay };
      if (password) updates.password = password;
      await api.put(`/super-admin/rooms/${roomCode}/members/${member.id}`, updates);
      onClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <h3 className="font-bold text-slate-900 text-base">✏️ แก้ไขข้อมูลสมาชิก</h3>
        {error && <div className="p-2 bg-rose-50 rounded-xl text-rose-700 text-xs">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="ชื่อ" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500" required />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="อีเมล" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500" required />
          <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500">
            <option value="Member">Member</option>
            <option value="Admin">Admin</option>
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

// ========== USERS PAGE ==========
function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.get('/super-admin/users');
      setUsers(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    return !q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.room_code || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">👥 จัดการผู้ใช้</h2>
          <p className="text-xs text-slate-500 mt-1">รายชื่อผู้ใช้ทั้งหมดในระบบ</p>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 ค้นหาชื่อ, อีเมล, รหัสห้อง..."
          className="px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 w-full sm:w-72"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500 font-semibold">
            <tr>
              <th className="p-3.5 text-left">ชื่อ</th>
              <th className="p-3.5 text-left">อีเมล</th>
              <th className="p-3.5 text-center">บทบาท</th>
              <th className="p-3.5 text-center">ห้อง</th>
              <th className="p-3.5 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="5" className="p-8 text-center text-slate-400 animate-pulse">กำลังโหลด...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan="5" className="p-8 text-center text-slate-400">{search ? 'ไม่พบผู้ใช้ที่ค้นหา' : 'ยังไม่มีผู้ใช้ในระบบ'}</td></tr>
            ) : filteredUsers.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/60">
                <td className="p-3 font-semibold text-slate-800">{u.full_name}</td>
                <td className="p-3 text-slate-600">{u.email}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    u.role === 'SuperAdmin' ? 'bg-red-100 text-red-700' :
                    u.role === 'Admin' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>{u.role}</span>
                </td>
                <td className="p-3 text-center font-mono text-[11px] text-slate-500">{u.room_code}</td>
                <td className="p-3 text-center">
                  {u.role !== 'SuperAdmin' && (
                    <button onClick={async () => {
                      if (!window.confirm(`ลบ ${u.full_name}?`)) return;
                      await api.delete(`/super-admin/users/${u.id}`);
                      loadUsers();
                    }} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ========== SYSTEM PAGE ==========
function SystemPage() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(setHealth).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">⚙️ สถานะระบบ</h2>
        <p className="text-xs text-slate-500 mt-1">ข้อมูลระบบ MyMonth API</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${health?.status === 'ok' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="text-sm font-bold text-slate-800">
            {health?.status === 'ok' ? 'ระบบทำงานปกติ' : 'ระบบขัดข้อง'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-500">App</span>
            <p className="font-bold text-slate-800">{health?.app || '-'}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-slate-500">Timestamp</span>
            <p className="font-bold text-slate-800">{health?.timestamp || '-'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== MAIN APP ==========
export default function App() {
  return (
    <BrowserRouter basename="/admin">
      <AdminAuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <Sidebar>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/rooms" element={<RoomsPage />} />
                  <Route path="/rooms/:roomCode" element={<RoomDetailPage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/system" element={<SystemPage />} />
                </Routes>
              </Sidebar>
            </ProtectedRoute>
          } />
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}

function ProtectedRoute({ children }) {
  const { admin } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!admin) navigate('/login');
  }, [admin]);

  if (!admin) return null;
  return children;
}
