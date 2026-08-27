import React, { useState } from 'react';
import {
  LayoutDashboard,
  Receipt,
  PiggyBank,
  FileSpreadsheet,
  PlusCircle,
  Copy,
  Check,
  LogOut,
  User,
  UserCog
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../context/RoomContext';
import NotificationDropdown from './NotificationDropdown';

export default function Navbar({ currentTab, setCurrentTab, onOpenAddExpense }) {
  const { user, room, logout } = useAuth();
  const { selectedMonth, setSelectedMonth, showToast } = useRoom();
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyRoomCode = () => {
    if (user?.room_code) {
      navigator.clipboard.writeText(user.room_code);
      setCopiedCode(true);
      showToast(`คัดลอกรหัสห้อง ${user.room_code} เรียบร้อยแล้ว`, 'info');
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'ภาพรวม', icon: LayoutDashboard },
    { id: 'expenses', label: 'รายการจ่าย', icon: Receipt },
    { id: 'budgets', label: 'งบประมาณ', icon: PiggyBank },
    { id: 'bills', label: 'สรุป & บิล', icon: FileSpreadsheet },
    { id: 'settings', label: '⚙️ ตั้งค่า', icon: UserCog }
  ];

  const mobileNavItems = navItems;

  return (
    <>
      {/* Top Header (Desktop & Mobile) */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Brand & Room Info */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentTab('dashboard')}>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md text-lg sm:text-xl font-bold flex-shrink-0">
                  🏠
                </div>
                <div>
                  <span className="font-bold text-base sm:text-lg text-slate-900 tracking-tight flex items-center gap-1">
                    MyMonth <span className="text-[9px] sm:text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.2 rounded-full">v2.0</span>
                  </span>
                  <p className="text-[10px] text-slate-500 hidden sm:block">บันทึก แบ่งปัน จ่ายง่าย</p>
                </div>
              </div>

              {/* Room Code Badge */}
              {user?.room_code && (
                <button
                  onClick={handleCopyRoomCode}
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition border border-slate-200/80 ml-2"
                  title="คลิกเพื่อคัดลอกรหัสห้อง"
                >
                  <span className="text-slate-400 font-normal">ห้อง:</span>
                  <span className="font-mono font-bold text-slate-800">{user.room_code}</span>
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                </button>
              )}
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {/* Month Filter */}
              <div className="relative">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="pl-2.5 pr-1 py-1 sm:pl-3 sm:pr-1 sm:py-1.5 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 rounded-xl text-[11px] sm:text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer transition-colors"
                />
              </div>

              {/* Add Expense Button */}
              <button
                onClick={onOpenAddExpense}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3.5 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95 flex-shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">➕ เพิ่มรายจ่าย</span>
                <span className="sm:hidden">เพิ่ม</span>
              </button>

              {/* Notifications */}
              <NotificationDropdown />

              {/* User Avatar */}
              <div className="flex items-center gap-1 pl-1 sm:pl-2 border-l border-slate-200">
                <button
                  onClick={() => setCurrentTab('settings')}
                  className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-slate-100 transition"
                  title="ตั้งค่า"
                >
                  <img
                    src={user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                    alt={user?.full_name}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl object-cover ring-2 ring-emerald-500/30"
                  />
                  <div className="hidden xl:block text-left">
                    <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.full_name}</p>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                      user?.role === 'Admin' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {user?.role || 'Member'}
                    </span>
                  </div>
                </button>

                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                  title="ออกจากระบบ"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Optimized for Phones & Tablets) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-1 py-1 shadow-lg safe-area-bottom">
        <div className="flex items-center justify-around">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-1.5 sm:px-2 rounded-xl transition-all duration-200 min-w-0 ${
                  isActive
                    ? 'text-emerald-600 font-bold bg-emerald-50'
                    : 'text-slate-400 hover:text-slate-600 font-medium active:bg-slate-100'
                }`}
              >
                <Icon className={`w-[18px] h-[18px] transition-transform duration-200 ${isActive ? 'text-emerald-600 scale-110' : 'text-slate-400'}`} />
                <span className="text-[9px] sm:text-[10px] mt-0.5 leading-tight whitespace-nowrap">{item.label}</span>
                {isActive && (
                  <div className="absolute -bottom-1 w-4 h-0.5 bg-emerald-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
