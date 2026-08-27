import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Clock, ShoppingCart, User } from 'lucide-react';
import api from '../utils/api';
import { formatThaiDate } from '../utils/formatters';

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const data = await api.get('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Fetch notifs error:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const markSingleAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const getTypeStyle = (type) => {
    switch (type) {
      case 'expense_shared':
        return {
          bg: 'bg-emerald-50/60',
          hoverBg: 'hover:bg-emerald-50',
          iconBg: 'bg-emerald-100',
          icon: <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />,
          dot: 'bg-emerald-500',
        };
      case 'expense_personal':
        return {
          bg: 'bg-blue-50/60',
          hoverBg: 'hover:bg-blue-50',
          iconBg: 'bg-blue-100',
          icon: <User className="w-3.5 h-3.5 text-blue-600" />,
          dot: 'bg-blue-500',
        };
      default:
        return {
          bg: 'bg-slate-50/60',
          hoverBg: 'hover:bg-slate-50',
          iconBg: 'bg-slate-100',
          icon: <Bell className="w-3.5 h-3.5 text-slate-600" />,
          dot: 'bg-slate-500',
        };
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
        title="การแจ้งเตือน"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-100 z-50 overflow-hidden">
          <div className="p-3.5 px-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 text-sm">🔔 การแจ้งเตือน</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-medium">
                  {unreadCount} ใหม่
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 transition"
              >
                <Check className="w-3.5 h-3.5" /> อ่านทั้งหมด
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100/60">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">
                  🔕
                </div>
                <p className="text-xs font-semibold text-slate-500">ไม่มีการแจ้งเตือน</p>
                <p className="text-[11px] text-slate-400 mt-0.5">เมื่อมีรายการใหม่จะปรากฏที่นี่</p>
              </div>
            ) : (
              notifications.map((item) => {
                const style = getTypeStyle(item.type);
                return (
                  <div
                    key={item.id}
                    onClick={() => markSingleAsRead(item.id)}
                    className={`p-3.5 px-4 transition cursor-pointer flex gap-3 items-start ${
                      item.is_read
                        ? 'bg-white hover:bg-slate-50 opacity-70'
                        : `${style.bg} ${style.hoverBg}`
                    }`}
                  >
                    {/* Type icon */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      item.is_read ? 'bg-slate-100' : style.iconBg
                    }`}>
                      {style.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${item.is_read ? 'text-slate-600' : 'text-slate-900'}`}>
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5 break-words leading-relaxed">
                        {item.message}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatThaiDate(item.createdAt)}
                      </span>
                    </div>

                    {!item.is_read && (
                      <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${style.dot}`} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
