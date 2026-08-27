import React, { useState } from 'react';
import { Users, UserPlus, Edit2, Trash2, Shield, X, Check, Key, Smartphone, Mail } from 'lucide-react';
import api from '../utils/api';
import { useRoom } from '../context/RoomContext';
import { useAuth } from '../context/AuthContext';

export default function UserManagementModal({ isOpen, onClose }) {
  const { user, roomMembers, setRoomMembers, refreshProfile } = useAuth();
  const { showToast, refreshAll } = useRoom();

  const [isAdding, setIsAdding] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Member');
  const [promptpayId, setPromptpayId] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setEditingUserId(null);
    setFullName('');
    setEmail('');
    setPassword('123456');
    setRole('Member');
    setPromptpayId('');
    setIsAdding(true);
  };

  const handleStartEdit = (targetUser) => {
    setIsAdding(false);
    setEditingUserId(targetUser.id);
    setFullName(targetUser.full_name);
    setEmail(targetUser.email);
    setPassword('');
    setRole(targetUser.role);
    setPromptpayId(targetUser.promptpay_id || '');
  };

  const updateLocalFallback = (updatedMembers) => {
    // If backend fails, update local state and localStorage directly to keep app working
    if (setRoomMembers) {
      setRoomMembers(updatedMembers);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    try {
      setLoading(true);
      if (isAdding) {
        try {
          await api.post('/auth/admin/users', {
            full_name: fullName,
            email,
            password,
            role,
            promptpay_id: promptpayId
          });
          showToast(`เพิ่มสมาชิก ${fullName} เรียบร้อยแล้ว`, 'success');
        } catch (apiErr) {
          // Fallback if no backend
          const colors = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6'];
          const color = colors[roomMembers.length % colors.length];
          const initial = fullName.charAt(0).toUpperCase();
          const svgAvatar = `data:image/svg+xml;charset=utf-8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'><rect width='60' height='60' rx='12' fill='${encodeURIComponent(color)}'/><text x='30' y='39' font-size='26' text-anchor='middle' font-family='sans-serif' fill='white' font-weight='bold'>${initial}</text></svg>`;

          const newUser = {
            id: `user_${Date.now()}`,
            full_name: fullName,
            email: email || `${Date.now()}@mymonth.app`,
            role,
            room_code: user.room_code,
            promptpay_id: promptpayId,
            avatar_url: svgAvatar
          };
          updateLocalFallback([...roomMembers, newUser]);
          showToast(`เพิ่มสมาชิก ${fullName} เรียบร้อยแล้ว (โหมดออฟไลน์)`, 'success');
        }
      } else if (editingUserId) {
        try {
          await api.put(`/auth/admin/users/${editingUserId}`, {
            full_name: fullName,
            email,
            role,
            promptpay_id: promptpayId,
            ...(password ? { password } : {})
          });
          showToast(`แก้ไขข้อมูลผู้ใช้งานสำเร็จ`, 'success');
        } catch (apiErr) {
          // Fallback if no backend
          const updatedMembers = roomMembers.map(m => 
            m.id === editingUserId 
              ? { ...m, full_name: fullName, email, role, promptpay_id: promptpayId } 
              : m
          );
          updateLocalFallback(updatedMembers);
          showToast(`แก้ไขข้อมูลผู้ใช้งานสำเร็จ (โหมดออฟไลน์)`, 'success');
        }
      }
      setIsAdding(false);
      setEditingUserId(null);
      await refreshProfile();
      refreshAll();
    } catch (err) {
      showToast(err.message || 'ทำรายการไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (targetUser.id === user.id) {
      showToast('ไม่สามารถลบบัญชีของตัวเองได้', 'error');
      return;
    }
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งาน "${targetUser.full_name}" ออกจากห้อง?`)) return;

    try {
      setLoading(true);
      try {
        await api.delete(`/auth/admin/users/${targetUser.id}`);
        showToast(`ลบ ${targetUser.full_name} เรียบร้อยแล้ว`, 'success');
      } catch (apiErr) {
        // Fallback if no backend
        updateLocalFallback(roomMembers.filter(m => m.id !== targetUser.id));
        showToast(`ลบ ${targetUser.full_name} เรียบร้อยแล้ว (โหมดออฟไลน์)`, 'success');
      }
      await refreshProfile();
      refreshAll();
    } catch (err) {
      showToast(err.message || 'ลบผู้ใช้งานไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Safe Avatar component
  const UserAvatar = ({ member }) => {
    const initials = (member.full_name || '?').charAt(0).toUpperCase();
    const colors = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6'];
    const bgColor = colors[member.full_name?.charCodeAt(0) % colors.length || 0];

    return (
      <div className="w-9 h-9 rounded-xl overflow-hidden bg-emerald-100 flex items-center justify-center font-bold text-white flex-shrink-0" style={{ backgroundColor: bgColor }}>
        {member.avatar_url && !member.avatar_url.includes('unsplash') === false ? (
          <img
            src={member.avatar_url}
            alt={member.full_name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentNode.textContent = initials;
            }}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 my-8 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">จัดการสมาชิกในห้อง (Admin Panel)</h3>
              <p className="text-[11px] text-slate-500">เพิ่ม, แก้ไขสิทธิ์, เปลี่ยนบทบาท และลบสมาชิก</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member List */}
        {!isAdding && !editingUserId && (
          <div className="my-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-600">สมาชิกทั้งหมด ({roomMembers.length} คน)</span>
              <button
                type="button"
                onClick={handleStartAdd}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>เพิ่มสมาชิกใหม่</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
              {roomMembers.map((m) => (
                <div key={m.id} className="p-3 flex items-center justify-between text-xs hover:bg-white transition">
                  <div className="flex items-center gap-2.5">
                    <UserAvatar member={m} />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-800">{m.full_name}</span>
                        {m.id === user.id && <span className="text-[10px] text-emerald-600 font-semibold">(ฉัน)</span>}
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                          m.role === 'Admin' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {m.role}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {m.email} {m.promptpay_id && `• พร้อมเพย์: ${m.promptpay_id}`}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(m)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                      title="แก้ไขข้อมูล"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {m.id !== user.id && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(m)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="ลบสมาชิกออกจากห้อง"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add or Edit Form */}
        {(isAdding || editingUserId) && (
          <form onSubmit={handleSave} className="my-4 space-y-3 text-xs animate-in fade-in">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
              <span className="font-bold text-slate-800">
                {isAdding ? '➕ เพิ่มสมาชิกใหม่ในห้อง' : '✏️ แก้ไขข้อมูลสมาชิก'}
              </span>
              <button
                type="button"
                onClick={() => { setIsAdding(false); setEditingUserId(null); }}
                className="text-slate-400 hover:text-slate-600 font-semibold"
              >
                ← ยกเลิก
              </button>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">ชื่อ - นามสกุล หรือ ชื่อเล่น *</label>
              <input
                type="text"
                value={fullName}
                autoFocus
                onChange={(e) => setFullName(e.target.value)}
                placeholder="เช่น สมชาย, มานี"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">อีเมล *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@mymonth.app"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isAdding ? 'รหัสผ่านเริ่มต้น *' : 'เปลี่ยนรหัสผ่าน'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isAdding ? '••••••••' : 'เว้นว่างถ้าไม่เปลี่ยน'}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500"
                  {...(isAdding ? { required: true } : {})}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">บทบาท (Role) *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:outline-none focus:border-emerald-500"
                >
                  <option value="Member">👤 Member (สมาชิกทั่วไป)</option>
                  <option value="Admin">👑 Admin (ผู้ดูแลห้อง)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">หมายเลขพร้อมเพย์ (PromptPay ID)</label>
              <input
                type="text"
                value={promptpayId}
                onChange={(e) => setPromptpayId(e.target.value)}
                placeholder="0812345678"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setIsAdding(false); setEditingUserId(null); }}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition disabled:opacity-50"
              >
                {loading ? 'กำลังบันทึก...' : '💾 บันทึกข้อมูล'}
              </button>
            </div>
          </form>
        )}

        {/* Close Button Only on List view */}
        {!isAdding && !editingUserId && (
          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              ปิด
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
