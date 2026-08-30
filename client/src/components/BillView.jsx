import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Printer, Download, Copy, Share2, FileText, Check, QrCode,
  CreditCard, CheckCircle2, Users, Smartphone, Clock
} from 'lucide-react';
import { formatCurrency, formatNumber, formatThaiDateFull, formatThaiMonthYear } from '../utils/formatters';
import { copyElementAsImage, downloadElementAsPdf } from '../utils/imageExport';
import { useRoom } from '../context/RoomContext';
import { useAuth } from '../context/AuthContext';
import PromptPayQR from '../components/PromptPayQR';
import api from '../utils/api';

export default function BillView() {
  const { user } = useAuth();
  const { room, roomMembers } = useAuth();
  const { selectedMonth, summary, expenses, settlementData, fetchSettlement, showToast } = useRoom();

  // 'settlement' | 'summary' | 'personal'
  const [billType, setBillType] = useState('settlement');
  const [copyingImage, setCopyingImage] = useState(false);
  const [copyingText, setCopyingText] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);

  const debts = settlementData?.debts || [];
  const userSummaries = settlementData?.user_summaries || [];
  const settlementExpenses = settlementData?.expenses || [];
  const primaryDebt = debts.length > 0 ? debts[0] : null;

  // --- Settlement logic (from DebtSettlementPage) ---
  const handleConfirmTransfer = async (debt) => {
    try {
      setConfirmingId(debt.from_user_id + debt.to_user_id);
      await api.post('/settlements/confirm', {
        from_user_id: debt.from_user_id,
        to_user_id: debt.to_user_id,
        amount: debt.amount,
        month: selectedMonth,
        method: 'promptpay'
      });
      showToast(`บันทึกการโอนเงิน ${formatCurrency(debt.amount)} เรียบร้อยแล้ว`, 'success');
      await fetchSettlement();
    } catch (err) {
      showToast(err.message || 'บันทึกการโอนเงินไม่สำเร็จ', 'error');
    } finally {
      setConfirmingId(null);
    }
  };

  // --- Bill filtering logic ---
  const filteredExpenses = expenses.filter(exp => {
    if (billType === 'shared') return exp.expense_type === 'shared';
    if (billType === 'personal') return exp.expense_type === 'personal' && exp.created_by === user?.id;
    return true;
  });

  const myPersonalTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // --- Export actions ---
  const handlePrint = () => { window.print(); };

  const handleDownloadPdf = async () => {
    try {
      showToast('กำลังสร้างไฟล์ PDF...', 'info');
      await downloadElementAsPdf('printable-bill', `MyMonth-Bill-${selectedMonth}.pdf`);
      showToast('ดาวน์โหลด PDF สำเร็จแล้ว', 'success');
    } catch (err) {
      showToast('ดาวน์โหลด PDF ไม่สำเร็จ: ' + err.message, 'error');
    }
  };

  const handleCopyAsImage = async () => {
    try {
      setCopyingImage(true);
      const res = await copyElementAsImage('printable-bill');
      showToast(res.message, 'success');
    } catch (err) {
      showToast('ไม่สามารถคัดลอกรูปภาพได้: ' + err.message, 'error');
    } finally {
      setCopyingImage(false);
    }
  };

  const handleCopyText = () => {
    try {
      setCopyingText(true);
      let text = `🏠 MyMonth - ใบสรุปค่าใช้จ่ายประจำเดือน ${formatThaiMonthYear(selectedMonth)}\n`;
      text += `🏢 ห้อง: ${room?.room_name || '-'} (รหัส ${user?.room_code})\n`;
      text += `💰 สรุปยอดรวม: ${formatCurrency(summary.totalAll)}\n`;
      text += `• ส่วนตัว: ${formatCurrency(summary.totalPersonal)}\n`;
      text += `• ร่วม: ${formatCurrency(summary.totalShared)}\n\n`;
      text += `📋 รายการรายจ่ายร่วม:\n`;
      expenses.filter(e => e.expense_type === 'shared').forEach(e => {
        text += `- ${e.category_icon || ''} ${e.category_name}: ${e.amount.toLocaleString()} ฿ (${e.creator_name})\n`;
      });
      if (debts.length > 0) {
        text += `\n💸 สรุปการโอนเงินคืน:\n`;
        debts.forEach(d => {
          text += `👉 ${d.from_user_name} ต้องโอนให้ ${d.to_user_name} จำนวน ${d.amount.toLocaleString()} ฿\n`;
        });
      }
      navigator.clipboard.writeText(text);
      showToast('✅ คัดลอกข้อความสรุปบิลเรียบร้อยแล้ว', 'success');
      setTimeout(() => setCopyingText(false), 2000);
    } catch (err) {
      showToast('คัดลอกข้อความไม่สำเร็จ', 'error');
      setCopyingText(false);
    }
  };

  const isPrintMode = billType === 'summary' || billType === 'personal';

  return (
    <div className="space-y-6">
      {/* Top Controls & Action Bar */}
      <div className="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Bill Type Selector */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-medium w-full md:w-auto">
          <button
            onClick={() => setBillType('settlement')}
            className={`px-3 py-2 rounded-lg transition ${
              billType === 'settlement' ? 'bg-white text-emerald-700 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🔄 สรุปหนี้
          </button>
          <button
            onClick={() => setBillType('summary')}
            className={`px-3 py-2 rounded-lg transition ${
              billType === 'summary' ? 'bg-white text-emerald-700 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 บิลสรุปรวม
          </button>
          <button
            onClick={() => setBillType('personal')}
            className={`px-3 py-2 rounded-lg transition ${
              billType === 'personal' ? 'bg-white text-emerald-700 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🔵 รายจ่ายส่วนตัว
          </button>
        </div>

        {/* Action Buttons (only for printable bill modes) */}
        {isPrintMode && (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full md:w-auto justify-end">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95"
              title="พิมพ์บิล"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">📄 ปริ้นบิล</span>
              <span className="sm:hidden">ปริ้น</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95"
              title="ดาวน์โหลด PDF"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>💾 PDF</span>
            </button>
            <button
              onClick={handleCopyAsImage}
              disabled={copyingImage}
              className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50"
              title="คัดลอกบิลเป็นรูปภาพ PNG"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">{copyingImage ? 'กำลังคัดลอก...' : '📋 คัดลอกบิลเป็นรูปภาพ'}</span>
              <span className="sm:hidden">{copyingImage ? 'กำลัง...' : '📋 คัดลอก'}</span>
            </button>
            <button
              onClick={handleCopyText}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition active:scale-95"
              title="คัดลอกข้อความสรุป"
            >
              {copyingText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>ข้อความ</span>
            </button>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  TAB: สรุปหนี้ (Settlement)                                  */}
      {/* ============================================================ */}
      {billType === 'settlement' && (
        <div className="space-y-6">
          {/* Itemized Shared Expenses Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center text-xs font-bold text-slate-700">
              <span>📋 รายการรายจ่ายร่วมประจำเดือน ({settlementExpenses.length} รายการ)</span>
              <span>ยอดรวม: {formatCurrency(settlementData?.total_shared || 0)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="p-3 pl-4">รายการ</th>
                    <th className="p-3 text-right">จำนวน</th>
                    <th className="p-3 text-center">ผู้จ่าย</th>
                    <th className="p-3">ส่วนแบ่ง</th>
                    <th className="p-3 text-center pr-4">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {settlementExpenses.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-10 text-center">
                        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-50 flex items-center justify-center text-2xl">🟢</div>
                        <p className="text-sm font-semibold text-slate-500">ไม่มีรายการรายจ่ายร่วมในเดือนนี้</p>
                        <p className="text-xs text-slate-400 mt-1">เริ่มเพิ่มรายจ่ายร่วมเพื่อดูการสรุปหนี้</p>
                      </td>
                    </tr>
                  ) : (
                    settlementExpenses.map((exp) => {
                      const splitText = (exp.splits || []).map(s => `${s.user_name} ${formatNumber(s.share_amount)}`).join(' / ');
                      return (
                        <tr key={exp.id} className="hover:bg-slate-50/60 transition">
                          <td className="p-3 pl-4 font-semibold text-slate-800 flex items-center gap-1.5">
                            <span>{exp.category_icon}</span>
                            <span>{exp.category_name}</span>
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900">{formatCurrency(exp.amount)}</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-medium">{exp.payer_name}</span>
                          </td>
                          <td className="p-3 text-slate-600">{splitText}</td>
                          <td className="p-3 text-center pr-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                              <CheckCircle2 className="w-3 h-3" /> จ่ายแล้ว
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Individual Breakdown */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>📊 สรุปรายบุคคล (เฉพาะรายจ่ายร่วม)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userSummaries.map((us) => (
                <div key={us.user_id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-sm">👤 {us.user_name}</span>
                    {us.net_balance > 0 ? (
                      <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold">🔴 จ่ายเกิน +{formatNumber(us.net_balance)}</span>
                    ) : us.net_balance < 0 ? (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold">🟢 ยังขาด {formatNumber(Math.abs(us.net_balance))}</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">พอดี 0.00</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-slate-200/60">
                    <div className="flex justify-between">
                      <span className="text-slate-400">ออกเงินล่วงหน้าไป:</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(us.paid_total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ส่วนแบ่งที่ต้องรับผิดชอบ:</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(us.share_total)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* QR Code & Settlement Cards */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>🔄 ยอดที่ต้องโอนเงินคืน & QR Code พร้อมเพย์</span>
            </h3>
            {debts.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-3xl text-center text-emerald-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h4 className="font-bold text-sm">ยอดค่าใช้จ่ายลงตัวเรียบร้อยแล้ว</h4>
                <p className="text-xs text-emerald-600 mt-1">ไม่มีหนี้ค้างชำระระหว่างสมาชิกในเดือนนี้</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {debts.map((debt, index) => (
                  <div key={index} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="text-xs text-slate-600">
                        <span>🔄 </span>
                        <strong className="text-slate-900">{debt.from_user_name}</strong>
                        <span> ต้องโอนให้ </span>
                        <strong className="text-emerald-700">{debt.to_user_name}</strong>
                      </div>
                      <span className="text-base font-extrabold text-emerald-700">{formatCurrency(debt.amount)}</span>
                    </div>

                    <PromptPayQR
                      payload={debt.qr_payload}
                      targetId={debt.promptpay_id}
                      recipientName={debt.to_user_name}
                      amount={debt.amount}
                      note={debt.note}
                      size={160}
                    />

                    <div className="pt-2">
                      {debt.is_settled ? (
                        <div className="py-2.5 px-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>โอนเงินเสร็จสิ้นแล้ว</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleConfirmTransfer(debt)}
                          disabled={confirmingId === debt.from_user_id + debt.to_user_id}
                          className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition active:scale-98 disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>✅ ยืนยันว่า {debt.from_user_name} โอนแล้ว</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  TAB: บิลสรุปรวม & เฉพาะรายจ่ายส่วนตัว (Printable Bill)     */}
      {/* ============================================================ */}
      {(billType === 'summary' || billType === 'personal') && (
        <div className="flex justify-center">
          <div
            id="printable-bill"
            className="w-full max-w-3xl bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl relative text-slate-800"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b-2 border-dashed border-slate-200 pb-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">🏠</span>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">MyMonth</h1>
                    <p className="text-xs text-slate-500 font-medium">ใบสรุปค่าใช้จ่ายประจำเดือน</p>
                    <p className="text-[11px] text-slate-600 font-semibold mt-0.5">👤 {user?.full_name || 'ผู้ใช้งาน'}</p>
                  </div>
                </div>
                <div className="pt-2 text-xs text-slate-600 space-y-1">
                  <div><span className="font-semibold text-slate-700">📆 เดือน/ปี:</span> {formatThaiMonthYear(selectedMonth)}</div>
                  <div><span className="font-semibold text-slate-700">🏢 ห้อง:</span> {room?.room_name || '-'} (รหัส {user?.room_code})</div>
                  <div><span className="font-semibold text-slate-700">📅 วันที่ออกบิล:</span> {formatThaiDateFull(new Date().toISOString())}</div>
                </div>
              </div>

              {/* PromptPay QR */}
              {billType !== 'personal' && (
                primaryDebt && primaryDebt.qr_payload ? (
                  <div className="border-2 border-slate-800 rounded-2xl p-3 bg-slate-50/70 text-center w-48 flex-shrink-0 self-center sm:self-auto shadow-xs">
                    <div className="text-[11px] font-bold text-slate-800 flex items-center justify-center gap-1 mb-1.5">
                      <span>📱 QR พร้อมเพย์</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200 flex justify-center mb-1.5">
                      <QRCodeSVG value={primaryDebt.qr_payload} size={110} level="M" />
                    </div>
                    <div className="text-xs font-bold text-emerald-700">{formatCurrency(primaryDebt.amount)}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">พร้อมเพย์: {primaryDebt.promptpay_id}</div>
                    <div className="text-[9px] text-slate-400 mt-0.5">สแกนเพื่อโอนเงินคืน ({primaryDebt.to_user_name})</div>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50 text-center w-48 flex-shrink-0 self-center sm:self-auto">
                    <QrCode className="w-8 h-8 mx-auto text-slate-400 mb-1 opacity-60" />
                    <div className="text-[10px] text-slate-500 font-medium">MyMonth Digital Bill</div>
                    <div className="text-[9px] text-slate-400 mt-1">ชำระเสร็จสิ้นแล้ว</div>
                  </div>
                )
              )}
            </div>

            {/* Total Summary Row */}
            <div className={`py-5 border-b border-slate-100 text-center bg-slate-50/50 my-4 rounded-2xl p-3 ${billType === 'personal' ? 'grid grid-cols-1' : 'grid grid-cols-3 gap-4'}`}>
              {billType !== 'personal' && (
                <div>
                  <p className="text-[11px] text-slate-500 font-medium">รายจ่ายทั้งหมด</p>
                  <p className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">{formatCurrency(summary.totalAll)}</p>
                </div>
              )}
              <div>
                <p className="text-[11px] text-slate-500 font-medium">
                  {billType === 'personal' ? `รายจ่ายส่วนตัวของ ${user?.full_name || 'ฉัน'}` : 'รายจ่ายส่วนตัว'}
                </p>
                <p className="text-base sm:text-lg font-bold text-blue-600 mt-0.5">
                  {billType === 'personal' ? formatCurrency(myPersonalTotal) : formatCurrency(summary.totalPersonal)}
                </p>
              </div>
              {billType !== 'personal' && (
                <div>
                  <p className="text-[11px] text-slate-500 font-medium">รายจ่ายร่วม</p>
                  <p className="text-base sm:text-lg font-bold text-emerald-600 mt-0.5">{formatCurrency(summary.totalShared)}</p>
                </div>
              )}
            </div>

            {/* Expenses Table */}
            <div className="space-y-4 my-6">
              <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase flex items-center justify-between">
                <span>📋 รายการค่าใช้จ่าย ({filteredExpenses.length} รายการ)</span>
                <span className="text-[11px] font-normal text-slate-500">จำนวนเงิน</span>
              </h3>
              <div className="divide-y divide-slate-100 border-t border-b border-slate-200">
                {filteredExpenses.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">📄</div>
                    <p className="text-xs font-semibold text-slate-500">ไม่มีรายการรายจ่ายสำหรับตัวเลือกนี้</p>
                  </div>
                ) : (
                  filteredExpenses.map((exp) => (
                    <div key={exp.id} className="py-2.5 flex items-start justify-between text-xs gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <span>{exp.category_icon}</span>
                          <span>{exp.category_name}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
                            exp.expense_type === 'personal' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {exp.expense_type === 'personal' ? 'ส่วนตัว' : 'ร่วม'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
                          <span>จ่ายโดย: {exp.creator_name}</span>
                          {exp.splits && exp.splits.length > 0 && (
                            <span className="text-slate-400">
                              ({exp.splits.map(s => `${s.user_name} ${s.share_amount}฿`).join(', ')})
                            </span>
                          )}
                          {exp.note && <span className="italic text-slate-400">- {exp.note}</span>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-bold text-slate-900">{formatCurrency(exp.amount)}</span>
                        <div className="text-[10px] text-slate-400">{exp.expense_date}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Individual Summary (shared only) */}
            {billType !== 'personal' && settlementData && settlementData.user_summaries && (
              <div className="my-6 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-bold text-slate-800">💰 สรุปยอดรายบุคคล (เฉพาะรายจ่ายร่วม)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {settlementData.user_summaries.map(us => (
                    <div key={us.user_id} className="p-2.5 rounded-xl bg-white border border-slate-100 shadow-2xs flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-slate-800">👤 {us.user_name}</span>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          จ่าย: {us.paid_total.toLocaleString()}.- | ส่วนแบ่ง: {us.share_total.toLocaleString()}.-
                        </div>
                      </div>
                      <div className="text-right">
                        {us.net_balance > 0 ? (
                          <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg">จ่ายเกิน +{us.net_balance.toLocaleString()}.-</span>
                        ) : us.net_balance < 0 ? (
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">ยังขาด {Math.abs(us.net_balance).toLocaleString()}.-</span>
                        ) : (
                          <span className="text-xs font-medium text-slate-500">พอดี 0.-</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {debts.length > 0 && (
                  <div className="mt-3 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1 text-emerald-900">
                    {debts.map((d, i) => (
                      <div key={i} className="flex flex-wrap items-center justify-between font-semibold">
                        <span>🔄 {d.from_user_name} ต้องโอนให้ {d.to_user_name}</span>
                        <span className="text-sm font-bold text-emerald-800">{formatCurrency(d.amount)}</span>
                      </div>
                    ))}
                    <div className="text-[10px] text-slate-500 pt-1 flex justify-between">
                      <span>วันที่โอน: _____________________</span>
                      <span>วิธีโอน: พร้อมเพย์ / โอนธนาคาร</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
              <span>📱 จัดทำโดย MyMonth - แอปบันทึกรายจ่ายประจำเดือน (v2.0)</span>
              <span>https://mymonth.app</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
