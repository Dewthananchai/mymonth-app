import React, { useState, useEffect } from 'react';
import {
  PiggyBank,
  Edit3,
  Copy,
  History,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  TrendingDown,
  TrendingUp,
  Plus
} from 'lucide-react';
import { formatCurrency, formatNumber, formatThaiMonthYear, formatThaiDate } from '../utils/formatters';
import { useRoom } from '../context/RoomContext';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function BudgetPage() {
  const { user } = useAuth();
  const { selectedMonth, budgetsData, fetchBudgets, showToast } = useRoom();

  const [isEditing, setIsEditing] = useState(false);
  const [editedItems, setEditedItems] = useState([]);
  const [editNote, setEditNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyModal, setHistoryModal] = useState(false);
  const [historyList, setHistoryList] = useState([]);

  // Initialize edit form from budgetsData
  useEffect(() => {
    if (budgetsData && budgetsData.items) {
      setEditedItems(
        budgetsData.items.map(item => ({
          category_id: item.category_id,
          category_name: item.category_name,
          category_icon: item.category_icon,
          budget_amount: item.budget_amount,
          actual_spent: item.actual_spent,
          budget_type: item.budget_type || 'shared'
        }))
      );
    }
  }, [budgetsData]);

  const handleAmountChange = (catId, val) => {
    const num = parseFloat(val) || 0;
    setEditedItems(prev =>
      prev.map(item =>
        item.category_id === catId ? { ...item, budget_amount: num } : item
      )
    );
  };

  const handleSaveBudget = async () => {
    try {
      setLoading(true);
      await api.post('/budgets/save', {
        month: selectedMonth,
        items: editedItems,
        note: editNote
      });
      showToast('บันทึกงบประมาณและประวัติเรียบร้อยแล้ว', 'success');
      setIsEditing(false);
      setEditNote('');
      await fetchBudgets();
    } catch (err) {
      showToast(err.message || 'บันทึกไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPreviousMonth = async () => {
    if (!window.confirm('คุณต้องการคัดลอกงบประมาณจากเดือนก่อนหน้าใช่หรือไม่?')) return;
    try {
      setLoading(true);
      const res = await api.post('/budgets/copy-previous', { target_month: selectedMonth });
      showToast(res.message, 'success');
      await fetchBudgets();
    } catch (err) {
      showToast(err.message || 'คัดลอกไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openHistory = async () => {
    try {
      const data = await api.get('/budgets/history');
      setHistoryList(data);
      setHistoryModal(true);
    } catch (err) {
      showToast('ไม่สามารถดึงประวัติได้', 'error');
    }
  };

  const totalEditedBudget = editedItems.reduce((acc, item) => acc + (parseFloat(item.budget_amount) || 0), 0);
  const diffFromOld = totalEditedBudget - (budgetsData?.total_budget || 0);

  const getStatusBadge = (status, pct) => {
    if (status === 'exhausted' || pct >= 100) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-xs font-bold">
          🔴 หมดแล้ว ({pct}%)
        </span>
      );
    }
    if (status === 'near_limit' || pct >= 80) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">
          🟡 ใกล้เต็ม ({pct}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
        ✅ ยังเหลือ ({pct}%)
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>💰 งบประมาณรายเดือน - {formatThaiMonthYear(selectedMonth)}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">ตั้งงบรายหมวด ควบคุมค่าใช้จ่าย และดูประวัติการแก้ไข</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
              >
                <Edit3 className="w-4 h-4" />
                <span className="hidden sm:inline">✏️ แก้ไขงบประมาณ</span>
                <span className="sm:hidden">แก้ไข</span>
              </button>
              <button
                onClick={handleCopyPreviousMonth}
                disabled={loading}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95"
                title="คัดลอกงบประมาณจากเดือนก่อน"
              >
                <Copy className="w-4 h-4 text-slate-500" />
                <span className="hidden sm:inline">📋 คัดลอกจากเดือนที่แล้ว</span>
                <span className="sm:hidden">คัดลอก</span>
              </button>
              <button
                onClick={openHistory}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95"
              >
                <History className="w-4 h-4 text-slate-500" />
                <span>📜 ประวัติ</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSaveBudget}
                disabled={loading}
                className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">💾 บันทึกการแก้ไข</span>
                <span className="sm:hidden">💾 บันทึก</span>
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95"
              >
                <X className="w-4 h-4 text-slate-500" />
                <span>❌ ยกเลิก</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Monthly Budget Overview Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <PiggyBank className="w-4 h-4 text-emerald-600" />
            <span>📋 สรุปภาพรวมงบประมาณ:</span>
          </div>
          <div className="text-xs text-slate-600">
            งบประมาณ: <strong className="text-slate-900">{formatNumber(budgetsData?.total_budget || 0)} ฿</strong> | ใช้ไป: <strong className="text-slate-900">{formatNumber(budgetsData?.total_spent || 0)} ฿</strong> | คงเหลือ: <strong className={(budgetsData?.total_remaining || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatNumber(budgetsData?.total_remaining || 0)} ฿</strong>
          </div>
        </div>

        <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              (budgetsData?.percentage_used || 0) >= 100 ? 'bg-rose-500' : (budgetsData?.percentage_used || 0) >= 80 ? 'bg-amber-400' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(budgetsData?.percentage_used || 0, 100)}%` }}
          />
        </div>
      </div>

      {/* Edit Mode Notice & Note Form */}
      {isEditing && (
        <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between text-xs text-amber-900">
            <span className="font-bold flex items-center gap-1">
              <Edit3 className="w-4 h-4 text-amber-600" /> โหมดแก้ไขงบประมาณ
            </span>
            <span>
              ยอดงบรวมใหม่: <strong className="text-amber-950 font-bold">{formatNumber(totalEditedBudget)} ฿</strong>
              {diffFromOld !== 0 && (
                <span className={`ml-1 font-bold ${diffFromOld > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  [{diffFromOld > 0 ? `+${formatNumber(diffFromOld)}` : formatNumber(diffFromOld)}]
                </span>
              )}
            </span>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-amber-800 mb-1">
              📝 หมายเหตุการแก้ไขงบ:
            </label>
            <input
              type="text"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="เช่น ปรับเพิ่มงบค่าไฟเพราะเดือนนี้มีงานเลี้ยง"
              className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      )}

      {/* Categories Budget Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="p-3.5 pl-6">หมวดหมู่</th>
                <th className="p-3.5 text-right">งบประมาณ {isEditing ? '(ใหม่)' : ''}</th>
                {!isEditing && <th className="p-3.5 text-right">ใช้จริง</th>}
                {!isEditing && <th className="p-3.5 text-right">คงเหลือ</th>}
                <th className="p-3.5 text-center pr-6">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isEditing ? (
                editedItems.map((item) => {
                  const original = budgetsData?.items?.find(b => b.category_id === item.category_id);
                  const oldBudget = original?.budget_amount || 0;
                  const diff = item.budget_amount - oldBudget;

                  return (
                    <tr key={item.category_id} className="hover:bg-slate-50/50">
                      <td className="p-3 pl-6 font-semibold text-slate-800 flex items-center gap-2">
                        <span className="text-base">{item.category_icon}</span>
                        <span>{item.category_name}</span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={item.budget_amount || ''}
                            onChange={(e) => handleAmountChange(item.category_id, e.target.value)}
                            className="w-24 text-right px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                          />
                          <span className="text-slate-400">฿</span>
                          {diff !== 0 && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              diff > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {diff > 0 ? `+${diff}` : diff}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center pr-6">
                        <span className="text-[11px] text-slate-400">
                          ใช้จริง {formatNumber(item.actual_spent)} ฿
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                budgetsData?.items?.map((item) => (
                  <tr key={item.category_id} className="hover:bg-slate-50/50 transition">
                    <td className="p-3 pl-6 font-semibold text-slate-800 flex items-center gap-2">
                      <span className="text-base">{item.category_icon}</span>
                      <span>{item.category_name}</span>
                    </td>
                    <td className="p-3 text-right font-bold text-slate-800">
                      {formatNumber(item.budget_amount)} ฿
                    </td>
                    <td className="p-3 text-right font-semibold text-slate-700">
                      {formatNumber(item.actual_spent)} ฿
                    </td>
                    <td className={`p-3 text-right font-bold ${
                      item.remaining < 0 ? 'text-rose-600' : item.remaining === 0 ? 'text-slate-400' : 'text-emerald-600'
                    }`}>
                      {formatNumber(item.remaining)} ฿
                    </td>
                    <td className="p-3 text-center pr-6">
                      {getStatusBadge(item.status, item.percentage_used)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Table Footer */}
            <tfoot className="bg-slate-50/80 font-bold border-t border-slate-200">
              <tr>
                <td className="p-3.5 pl-6 text-slate-900">รวมทั้งหมด</td>
                <td className="p-3.5 text-right text-slate-900 font-extrabold">
                  {formatNumber(isEditing ? totalEditedBudget : (budgetsData?.total_budget || 0))} ฿
                </td>
                {!isEditing && (
                  <td className="p-3.5 text-right text-slate-900 font-extrabold">
                    {formatNumber(budgetsData?.total_spent || 0)} ฿
                  </td>
                )}
                {!isEditing && (
                  <td className="p-3.5 text-right text-emerald-700 font-extrabold">
                    {formatNumber(budgetsData?.total_remaining || 0)} ฿
                  </td>
                )}
                <td className="p-3.5 text-center pr-6">
                  {!isEditing && (
                    <span className="text-xs text-slate-500 font-medium">
                      ใช้ไป {budgetsData?.percentage_used || 0}%
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Budget Edit History Timeline Modal */}
      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">📜 ประวัติการแก้ไขงบประมาณ</h3>
              </div>
              <button onClick={() => setHistoryModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 max-h-80 overflow-y-auto space-y-3 pr-1">
              {historyList.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">
                    📜
                  </div>
                  <p className="text-xs font-semibold text-slate-500">ยังไม่มีประวัติการแก้ไข</p>
                  <p className="text-[11px] text-slate-400 mt-1">ประวัติจะปรากฏเมื่อมีการแก้ไขงบประมาณ</p>
                </div>
              ) : (
                historyList.map((h, i) => (
                  <div key={i} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">👤 {h.user_name}</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatThaiDate(h.changed_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span>ยอดใหม่: <strong>{formatNumber(h.new_amount)} ฿</strong></span>
                      {h.change_amount !== undefined && (
                        <span className={`font-bold ${h.change_amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {h.change_amount >= 0 ? `+${formatNumber(h.change_amount)}` : formatNumber(h.change_amount)} ฿
                        </span>
                      )}
                    </div>
                    {h.note && (
                      <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/50">
                        💬 {h.note}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setHistoryModal(false)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
