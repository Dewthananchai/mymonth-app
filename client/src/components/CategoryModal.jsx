import React, { useState } from 'react';
import { X, Plus, Tag } from 'lucide-react';
import api from '../utils/api';
import { useRoom } from '../context/RoomContext';

export default function CategoryModal({ isOpen, onClose }) {
  const { categories, fetchCategories, showToast } = useRoom();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🏷️');
  const [color, setColor] = useState('#10b981');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const emojiOptions = [
    '🛒', '⚡', '💧', '🌐', '🍶', '💳', '👶', '🏥', '🎮',
    '📚', '👕', '💄', '🍼', '🏡', '🚗', '☕', '🍿', '🎁', '🐶', '✈️'
  ];

  const colorOptions = [
    '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444',
    '#f59e0b', '#06b6d4', '#14b8a6', '#64748b', '#6366f1'
  ];

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('กรุณากรอกชื่อหมวดหมู่', 'error');
      return;
    }

    try {
      setLoading(true);
      await api.post('/categories', { name, icon, color });
      showToast('เพิ่มหมวดหมู่เรียบร้อยแล้ว', 'success');
      setName('');
      await fetchCategories();
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่นี้?')) return;
    try {
      await api.delete(`/categories/${id}`);
      showToast('ลบหมวดหมู่เรียบร้อยแล้ว', 'success');
      await fetchCategories();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">จัดการหมวดหมู่</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Categories List */}
        <div className="my-4 max-h-48 overflow-y-auto space-y-1.5 pr-1">
          <p className="text-xs font-semibold text-slate-500 mb-2">หมวดหมู่ทั้งหมด</p>
          <div className="grid grid-cols-2 gap-1.5">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-2 rounded-xl border border-slate-100 text-xs bg-slate-50/60"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-base">{cat.icon}</span>
                  <span className="font-medium text-slate-700 truncate">{cat.name}</span>
                </div>
                {!cat.is_system && (
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="text-slate-300 hover:text-rose-500 text-xs px-1"
                    title="ลบหมวดหมู่นี้"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Add New Category Form */}
        <form onSubmit={handleCreate} className="space-y-3 pt-3 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-700">➕ เพิ่มหมวดหมู่ใหม่</p>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">ชื่อหมวดหมู่ *</label>
            <input
              type="text"
              placeholder="เช่น ค่าขนม, ค่าฟิตเนส"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {/* Emoji Picker */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">เลือกไอคอน (Emoji)</label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-100">
              {emojiOptions.map((em) => (
                <button
                  type="button"
                  key={em}
                  onClick={() => setIcon(em)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm transition ${
                    icon === em ? 'bg-emerald-100 ring-2 ring-emerald-500 scale-110' : 'hover:bg-slate-200'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">สีประจำหมวดหมู่</label>
            <div className="flex gap-2">
              {colorOptions.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-5 h-5 rounded-full transition ${
                    color === c ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="pt-3 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
            >
              ปิด
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'กำลังบันทึก...' : 'เพิ่มหมวดหมู่'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
