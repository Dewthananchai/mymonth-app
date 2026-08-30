import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Receipt,
  Users,
  User,
  ArrowRight,
  PlusCircle,
  Printer,
  CreditCard,
  PieChart,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  BarChart3
} from 'lucide-react';
import { DonutChart, HorizontalBarChart, VerticalBarChart } from '../components/Charts';
import api from '../utils/api';
import { formatCurrency, formatNumber, formatThaiMonthYear } from '../utils/formatters';
import { useRoom } from '../context/RoomContext';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage({ onNavigateTab, onOpenAddExpense }) {
  const { user } = useAuth();
  const { selectedMonth, summary, expenses, budgetsData, settlementData } = useRoom();
  const [monthlyHistory, setMonthlyHistory] = useState([]);

  // Fetch monthly history for comparison chart
  useEffect(() => {
    const fetchMonthlyHistory = async () => {
      try {
        const data = await api.get('/admin/stats');
        setMonthlyHistory(data.monthlyHistory || []);
      } catch (err) {
        console.error('Failed to fetch monthly history:', err);
        // Generate from local data if API fails
        generateMonthlyHistory();
      }
    };
    fetchMonthlyHistory();
  }, []);

  // Fallback: generate monthly data from local expenses
  const generateMonthlyHistory = () => {
    // Use all expenses from all rooms (for fallback)
    const monthMap = {};
    expenses.forEach(exp => {
      const d = new Date(exp.expense_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap[key] = (monthMap[key] || 0) + exp.amount;
    });
    // Also add current month from summary
    if (selectedMonth && summary.totalAll > 0) {
      monthMap[selectedMonth] = (monthMap[selectedMonth] || 0) + summary.totalAll;
    }
    const history = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, total]) => ({ month, total }));
    setMonthlyHistory(history);
  };

  const totalAll = summary.totalAll || 0;
  const totalPersonal = summary.totalPersonal || 0;
  const totalShared = summary.totalShared || 0;

  const personalPct = totalAll > 0 ? Math.round((totalPersonal / totalAll) * 100) : 0;
  const sharedPct = totalAll > 0 ? (100 - personalPct) : 0;

  const totalBudget = budgetsData?.total_budget || 15000;
  const totalSpent = budgetsData?.total_spent || totalAll;
  const totalRemaining = budgetsData?.total_remaining !== undefined ? budgetsData.total_remaining : (totalBudget - totalSpent);
  const budgetUsagePct = budgetsData?.percentage_used || (totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) : 0);

  // Filter My Personal Expenses breakdown
  const myPersonalExpenses = expenses.filter(
    exp => exp.expense_type === 'personal' && exp.created_by === user?.id
  );

  // Group My Personal expenses by category
  const myPersonalCategoryMap = {};
  myPersonalExpenses.forEach(exp => {
    const key = exp.category_name || 'อื่นๆ';
    myPersonalCategoryMap[key] = (myPersonalCategoryMap[key] || 0) + exp.amount;
  });

  const debts = settlementData?.debts || [];
  const primaryDebt = debts.length > 0 ? debts[0] : null;

  // --- Chart Data: Spending by Category (all expenses) ---
  const categoryMap = {};
  expenses.forEach(exp => {
    const key = exp.category_name || 'อื่นๆ';
    if (!categoryMap[key]) {
      categoryMap[key] = { name: key, icon: exp.category_icon || '📦', amount: 0, color: '#10b981' };
    }
    categoryMap[key].amount += exp.amount;
  });

  const categoryColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#06b6d4'];
  const categoryItems = Object.values(categoryMap)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)
    .map((item, i) => ({
      label: `${item.icon} ${item.name}`,
      value: item.amount,
      color: categoryColors[i % categoryColors.length],
      icon: item.icon,
    }));

  // --- Chart Data: Donut personal vs shared ---
  const donutSegments = [
    { value: totalPersonal, color: '#3b82f6', label: 'ส่วนตัว' },
    { value: totalShared, color: '#10b981', label: 'ร่วม' },
  ].filter(s => s.value > 0);

  // --- Chart Data: Monthly Comparison ---
  const monthlyColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
  const monthlyItems = monthlyHistory.map((item, i) => {
    const [year, month] = item.month.split('-');
    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const monthIdx = parseInt(month) - 1;
    return {
      label: `${monthNames[monthIdx]} ${(parseInt(year) + 543) % 100}`,
      value: item.total,
      color: monthlyColors[i % monthlyColors.length],
    };
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Month Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-slate-900">📊 {formatThaiMonthYear(selectedMonth)}</span>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full">
              👤 {user?.full_name} ({user?.role})
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">สรุปภาพรวมค่าใช้จ่ายส่วนตัวและส่วนกลาง</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            onClick={onOpenAddExpense}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-600/20 transition active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>➕ เพิ่มรายจ่าย</span>
          </button>
          <button
            onClick={() => onNavigateTab('bills')}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-semibold transition active:scale-95"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">🖨️ ปริ้นบิล</span>
            <span className="sm:hidden">ปริ้น</span>
          </button>
          <button
            onClick={() => onNavigateTab('settlements')}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-semibold transition active:scale-95"
          >
            <CreditCard className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">📱 สรุปหนี้ & QR</span>
            <span className="sm:hidden">สรุปหนี้</span>
          </button>
        </div>
      </div>

      {/* Main Stats: Monthly Total Card with Personal vs Shared Ratio */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl">
        {/* Gradient background with decorative blobs */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-emerald-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
        <div className="absolute top-1/2 right-1/4 w-40 h-40 bg-cyan-400/10 rounded-full blur-2xl" />

        <div className="relative z-10 p-6 sm:p-8 text-white">
          {/* Top: Month Label + Total */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] font-semibold text-white/90 mb-3">
                <span>💰</span>
                <span>ยอดรวมทั้งเดือน</span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg">
                {formatCurrency(totalAll)}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/15 text-[11px] text-emerald-100 font-medium self-start sm:self-auto">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>เดือนที่แล้ว +5%</span>
            </div>
          </div>

          {/* Stacked progress bar */}
          <div className="mb-5">
            <div className="w-full h-3 bg-white/15 rounded-full overflow-hidden flex">
              {personalPct > 0 && (
                <div
                  className="h-full bg-blue-400 transition-all duration-700"
                  style={{ width: `${personalPct}%` }}
                />
              )}
              {sharedPct > 0 && (
                <div
                  className="h-full bg-white/70 transition-all duration-700"
                  style={{ width: `${sharedPct}%` }}
                />
              )}
            </div>
          </div>

          {/* 2-Column: Personal vs Shared */}
          <div className="grid grid-cols-2 gap-3">
            {/* Personal */}
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/15">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/30 flex items-center justify-center">
                  <span className="text-sm">🔵</span>
                </div>
                <div>
                  <p className="text-[11px] text-blue-200 font-medium">ส่วนตัว</p>
                  <p className="text-base font-extrabold text-white">{formatCurrency(totalPersonal)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                <span className="text-[10px] text-white/60">สัดส่วน</span>
                <span className="text-xs font-bold text-blue-200">{personalPct}%</span>
              </div>
            </div>

            {/* Shared */}
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/15">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/30 flex items-center justify-center">
                  <span className="text-sm">🟢</span>
                </div>
                <div>
                  <p className="text-[11px] text-emerald-200 font-medium">ร่วม</p>
                  <p className="text-base font-extrabold text-white">{formatCurrency(totalShared)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                <span className="text-[10px] text-white/60">สัดส่วน</span>
                <span className="text-xs font-bold text-emerald-200">{sharedPct}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Budget Progress Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              📊
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">งบประมาณรวมประจำเดือน</h3>
              <p className="text-[11px] text-slate-500">
                งบประมาณ: <strong className="text-slate-800">{formatNumber(totalBudget)}.-</strong> | ใช้ไป: <strong className="text-slate-800">{formatNumber(totalSpent)}.-</strong> | คงเหลือ: <strong className={totalRemaining >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatNumber(totalRemaining)}.-</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-xl ${
              budgetUsagePct >= 100 ? 'bg-rose-100 text-rose-700' : budgetUsagePct >= 80 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {budgetUsagePct}% ใช้ไป
            </span>
            <button
              onClick={() => onNavigateTab('budgets')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold underline ml-1"
            >
              แก้ไขงบ
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              budgetUsagePct >= 100 ? 'bg-gradient-to-r from-rose-500 to-red-600' : budgetUsagePct >= 80 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'
            }`}
            style={{ width: `${Math.min(budgetUsagePct, 100)}%` }}
          />
        </div>
      </div>

      {/* 📊 Monthly Comparison Chart */}
      {monthlyItems.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              📈
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">📊 เปรียบเทียบรายจ่ายรายเดือน</h3>
              <p className="text-[11px] text-slate-500">แสดง 6 เดือนล่าสุด</p>
            </div>
          </div>
          <VerticalBarChart items={monthlyItems} />
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-3 pt-2 border-t border-slate-100">
            {monthlyItems.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px]">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                <span className="text-slate-600">{item.label}</span>
                <span className="font-bold text-slate-800">{item.value.toLocaleString()}฿</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 📊 Dashboard Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Donut Chart: Personal vs Shared Ratio */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">สัดส่วนค่าใช้จ่าย</h3>
              <p className="text-[11px] text-slate-500">เปรียบเทียบส่วนตัว vs ร่วม</p>
            </div>
          </div>
          <DonutChart
            segments={donutSegments}
            size={180}
            centerValue={formatCurrency(totalAll)}
            centerLabel="รวมทั้งหมด"
          />
        </div>

        {/* Bar Chart: Spending by Category */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">ค่าใช้จ่ายตามหมวด</h3>
              <p className="text-[11px] text-slate-500">เรียงจากมากไปน้อย</p>
            </div>
          </div>
          <HorizontalBarChart items={categoryItems} />
        </div>
      </div>

      {/* 2 Detail Sections: My Personal Expenses & Room Shared Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: My Personal Expenses */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">🍽️</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">รายจ่ายส่วนตัวของฉัน (เฉพาะของฉัน)</h3>
                  <p className="text-[11px] text-slate-500">บันทึกค่าใช้จ่ายส่วนตัว ไม่รวมในยอดหนี้ร่วม</p>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl">
                รวม: {formatCurrency(summary.myPersonalTotal)}
              </span>
            </div>

            {/* Category breakdown pills */}
            <div className="pt-4 flex flex-wrap gap-2">
              {Object.keys(myPersonalCategoryMap).length === 0 ? (
                <div className="w-full text-center py-6">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-blue-50 flex items-center justify-center text-xl">
                    💰
                  </div>
                  <p className="text-xs font-semibold text-slate-500">ยังไม่มีรายจ่ายส่วนตัว</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">เริ่มบันทึกค่าใช้จ่ายส่วนตัวของคุณได้เลย</p>
                </div>
              ) : (
                Object.entries(myPersonalCategoryMap).map(([catName, amt]) => (
                  <div
                    key={catName}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs"
                  >
                    <span className="font-medium text-slate-700">{catName}</span>
                    <span className="font-bold text-slate-900">{formatNumber(amt)}.-</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('expenses')}
            className="w-full mt-4 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1 border border-slate-100"
          >
            <span>ดูรายการค่าใช้จ่ายส่วนตัวทั้งหมด</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Room Shared Expenses & Net Debt Summary */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">👥</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">รายจ่ายร่วมของห้อง</h3>
                  <p className="text-[11px] text-slate-500">สรุปยอดที่แต่ละคนออกล่วงหน้า</p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
                รวมร่วม: {formatCurrency(totalShared)}
              </span>
            </div>

            {/* Member Paid summary */}
            <div className="pt-4 space-y-2">
              {settlementData?.user_summaries?.map((us) => {
                const pct = totalShared > 0 ? Math.round((us.paid_total / totalShared) * 100) : 0;
                return (
                  <div key={us.user_id} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">👤 {us.user_name}</span>
                      <span className="text-slate-500 text-[11px]">จ่าย {formatNumber(us.paid_total)}.- ({pct}%)</span>
                    </div>
                    {us.net_balance > 0 ? (
                      <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg">
                        จ่ายเกิน +{formatNumber(us.net_balance)}.-
                      </span>
                    ) : us.net_balance < 0 ? (
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                        ยังขาด {formatNumber(Math.abs(us.net_balance))}.-
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">0.-</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Debt Callout */}
            {primaryDebt && (
              <div className="mt-4 p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
                <div className="text-xs text-emerald-950">
                  <span className="font-bold">💸 {primaryDebt.from_user_name}</span> ต้องโอนให้ <span className="font-bold">{primaryDebt.to_user_name}</span>
                  <div className="text-sm font-extrabold text-emerald-700 mt-0.5">
                    {formatCurrency(primaryDebt.amount)}
                  </div>
                </div>
                <button
                  onClick={() => onNavigateTab('settlements')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 flex-shrink-0"
                >
                  📱 ดู QR โอนเงิน
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateTab('settlements')}
            className="w-full mt-4 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1 border border-slate-100"
          >
            <span>ดูรายละเอียดการสรุปหนี้ทั้งหมด</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floating Action Button - เพิ่มรายจ่าย */}
      <button
        onClick={onOpenAddExpense}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg shadow-emerald-600/30 transition active:scale-95 sm:hidden"
      >
        <PlusCircle className="w-5 h-5" />
        <span className="font-bold text-sm">เพิ่มรายจ่าย</span>
      </button>
    </div>
  );
}
