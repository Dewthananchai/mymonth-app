import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  PlusCircle,
  Trash2,
  Edit2,
  Copy,
  Download,
  Printer,
  CheckSquare,
  Square,
  Tag,
  Check,
  Repeat
} from 'lucide-react';
import { formatCurrency, formatNumber, formatShortDate } from '../utils/formatters';
import { exportToExcel } from '../utils/imageExport';
import { useRoom } from '../context/RoomContext';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function ExpensesPage({ onOpenAddExpense, onEditExpense, onNavigateTab }) {
  const { user, roomMembers } = useAuth();
  const { selectedMonth, setSelectedMonth, categories, expenses, summary, fetchExpenses, showToast } = useRoom();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'personal' | 'shared'
  const [selectedIds, setSelectedIds] = useState([]);

  // Fetch with active filters
  useEffect(() => {
    fetchExpenses({
      search: searchQuery,
      category_id: categoryFilter,
      user_id: userFilter,
      type: typeFilter
    });
  }, [searchQuery, categoryFilter, userFilter, typeFilter, selectedMonth, fetchExpenses]);

  // Handle Multi-Select Checkboxes
  const handleToggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === expenses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(expenses.map(e => e.id));
    }
  };

  // Handle Single Delete
  const handleDelete = async (id) => {
    if (!window.confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      showToast('ลบรายการสำเร็จแล้ว', 'success');
      await fetchExpenses();
    } catch (err) {
      showToast(err.message || 'ลบรายการไม่สำเร็จ', 'error');
    }
  };

  // Handle Batch Delete
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`คุณต้องการลบ ${selectedIds.length} รายการที่เลือกใช่หรือไม่?`)) return;
    try {
      const res = await api.post('/expenses/batch-delete', { ids: selectedIds });
      showToast(res.message || 'ลบรายการสำเร็จ', 'success');
      setSelectedIds([]);
      await fetchExpenses();
    } catch (err) {
      showToast(err.message || 'ลบไม่สำเร็จ', 'error');
    }
  };

  // Handle Duplicate / Copy Expense
  const handleCopyExpense = async (exp) => {
    try {
      const newExp = {
        category_id: exp.category_id,
        amount: exp.amount,
        expense_date: new Date().toISOString().substring(0, 10),
        payment_method: exp.payment_method,
        expense_type: exp.expense_type,
        note: `${exp.note || ''} (สำเนา)`.trim(),
        tags: exp.tags || [],
        is_recurring: exp.is_recurring,
        splits: exp.splits
      };
      await api.post('/expenses', newExp);
      showToast('คัดลอกรายการเรียบร้อยแล้ว', 'success');
      await fetchExpenses();
    } catch (err) {
      showToast('คัดลอกไม่สำเร็จ: ' + err.message, 'error');
    }
  };

  // Export Selected / All to Excel
  const handleExportExcel = () => {
    const targetExpenses = selectedIds.length > 0
      ? expenses.filter(e => selectedIds.includes(e.id))
      : expenses;

    if (targetExpenses.length === 0) {
      showToast('ไม่มีรายการสำหรับส่งออก', 'error');
      return;
    }

    const rows = targetExpenses.map(exp => ({
      'วันที่': exp.expense_date,
      'ประเภท': exp.expense_type === 'personal' ? 'ส่วนตัว' : 'ร่วม',
      'หมวดหมู่': `${exp.category_icon || ''} ${exp.category_name}`,
      'จำนวนเงิน': exp.amount,
      'ผู้จ่าย': exp.creator_name,
      'วิธีชำระ': exp.payment_method,
      'โน้ต': exp.note || '',
      'แท็ก': (exp.tags || []).join(', ')
    }));

    exportToExcel(rows, `MyMonth-${selectedMonth}-Expenses.xlsx`);
    showToast(`ส่งออก ${rows.length} รายการเป็นไฟล์ Excel สำเร็จ`, 'success');
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>📋 รายการค่าใช้จ่ายทั้งหมด</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">ค้นหา กรอง และจัดการรายจ่ายประจำเดือน</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            onClick={onOpenAddExpense}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/20 transition active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">➕ เพิ่มรายจ่าย</span>
            <span className="sm:hidden">เพิ่ม</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95"
            title="ส่งออกเป็น Excel (.xlsx)"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">📤 ส่งออก</span>
            <span className="sm:hidden">ส่งออก</span>
          </button>
          <button
            onClick={() => onNavigateTab('bills')}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95"
            title="พิมพ์บิล"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">🖨️ ปริ้น</span>
            <span className="sm:hidden">ปริ้น</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 ค้นหารายการ... (ชื่อหมวด, โน้ต, แท็ก #จำเป็น)"
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500 transition"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">📂 หมวดทั้งหมด</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>

          {/* User Filter */}
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">👤 ทุกคน</option>
            {roomMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </select>

          {/* Month Filter */}
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
          />

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-emerald-500 font-semibold"
          >
            <option value="all">📌 แสดงทั้งหมด</option>
            <option value="personal">🔵 ส่วนตัว (Personal)</option>
            <option value="shared">🟢 ร่วม (Shared)</option>
          </select>
        </div>
      </div>

      {/* Multi-Select Action Bar (Shows when items selected) */}
      {selectedIds.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2 text-xs text-emerald-900 font-bold">
            <CheckSquare className="w-4 h-4 text-emerald-600" />
            <span>เลือกแล้ว {selectedIds.length} รายการ</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchDelete}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>🗑️ ลบที่เลือก</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>📤 ส่งออกที่เลือก</span>
            </button>
          </div>
        </div>
      )}

      {/* Expense Items List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Header / Select All */}
        <div className="p-3.5 px-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 text-slate-700 hover:text-emerald-700 transition"
          >
            {selectedIds.length === expenses.length && expenses.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-emerald-600" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>เลือกทั้งหมด ({expenses.length} รายการ)</span>
          </button>
          <span className="text-slate-400">สัดส่วน / จัดการ</span>
        </div>

        <div className="divide-y divide-slate-100">
          {expenses.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl">
                📋
              </div>
              <p className="text-sm font-semibold text-slate-500 mb-1">ไม่พบรายการค่าใช้จ่าย</p>
              <p className="text-xs text-slate-400 mb-4">ลองปรับเงื่อนไขการค้นหาหรือเพิ่มรายการใหม่</p>
              <button
                onClick={onOpenAddExpense}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>➕ เพิ่มรายจ่ายใหม่</span>
              </button>
            </div>
          ) : (
            expenses.map((exp) => {
              const isSelected = selectedIds.includes(exp.id);
              const isPersonal = exp.expense_type === 'personal';

              return (
                <div
                  key={exp.id}
                  className={`relative p-4 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected ? 'bg-emerald-50/40' : 'hover:bg-slate-50/60'
                  }`}
                >
                  {/* Left: Checkbox + Badges + Category + Note + Tags */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-full ${isPersonal ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                    <button
                      type="button"
                      onClick={() => handleToggleSelect(exp.id)}
                      className="mt-0.5 ml-1 text-slate-400 hover:text-emerald-600 transition flex-shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300" />
                      )}
                    </button>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Type Badge */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isPersonal ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          <span>{isPersonal ? '🔵 ส่วนตัว' : '🟢 ร่วม'}</span>
                        </span>

                        {/* Category Name */}
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                          <span>{exp.category_icon}</span>
                          <span>{exp.category_name}</span>
                        </span>

                        {exp.is_recurring && (
                          <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded font-medium flex items-center gap-0.5">
                            <Repeat className="w-2.5 h-2.5" /> ประจำ
                          </span>
                        )}
                      </div>

                      {/* Note & Tags */}
                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
                        {exp.note && <span>📝 {exp.note}</span>}
                        {exp.tags && exp.tags.map((t, idx) => (
                          <span key={idx} className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded text-[10px]">
                            {t}
                          </span>
                        ))}
                      </div>

                      {/* Splits breakdown if shared */}
                      {!isPersonal && exp.splits && exp.splits.length > 0 && (
                        <div className="text-[10px] text-slate-400">
                          ส่วนแบ่ง: {exp.splits.map(s => `${s.user_name} (${s.share_amount}฿)`).join(' | ')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Amount, Payer, Date & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 pl-7 sm:pl-0">
                    <div className="text-left sm:text-right">
                      <div className="text-sm font-extrabold text-slate-900">
                        {formatCurrency(exp.amount)}
                      </div>
                      <div className="text-[10px] text-slate-400 flex sm:justify-end items-center gap-1.5">
                        <span className="font-semibold text-slate-600">{exp.creator_name}</span>
                        <span>•</span>
                        <span>{formatShortDate(exp.expense_date)}</span>
                      </div>
                    </div>

                    {/* Action Buttons: Edit, Copy, Delete */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditExpense(exp)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                        title="แก้ไขรายการ"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleCopyExpense(exp)}
                        className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"
                        title="คัดลอกรายการ"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="ลบรายการ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Summary Footer Bar as specified in Section 7 */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-700">
          <div className="font-semibold">
            📊 สรุปยอด: ส่วนตัว <strong className="text-blue-700">{formatNumber(summary.totalPersonal)}.-</strong> | ร่วม <strong className="text-emerald-700">{formatNumber(summary.totalShared)}.-</strong> | รวมทั้งหมด <strong className="text-slate-900">{formatNumber(summary.totalAll)}.-</strong>
          </div>
          <span className="text-[11px] text-slate-400">
            แสดง {expenses.length} รายการ
          </span>
        </div>
      </div>
    </div>
  );
}
