import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Calendar, CreditCard, Tag, Upload, Repeat, User, DollarSign, Camera, Loader2, Check } from 'lucide-react';
import { useRoom } from '../context/RoomContext';
import { useAuth } from '../context/AuthContext';
import CategoryModal from '../components/CategoryModal';
import api from '../utils/api';
import { compressImage } from '../utils/image';
import { formatNumber } from '../utils/formatters';

export default function AddExpenseModal({ isOpen, onClose, initialData = null }) {
  const { user, roomMembers } = useAuth();
  const { categories, fetchExpenses, showToast, selectedMonth } = useRoom();

  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('1200');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().substring(0, 10));

  const [expenseType, setExpenseType] = useState('shared'); // 'personal' | 'shared'
  const [payerId, setPayerId] = useState(user?.id || '');
  const [note, setNote] = useState('');
  const [tagsInput, setTagsInput] = useState('#จำเป็น, #ค่าบ้าน');
  const [isRecurring, setIsRecurring] = useState(false);
  const [billFile, setBillFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openCategoryModal, setOpenCategoryModal] = useState(false);

  // 📷 สลิปโอนเงิน (OCR)
  const [slipScanning, setSlipScanning] = useState(false);
  const [slipError, setSlipError] = useState('');
  const [scannedSlip, setScannedSlip] = useState(null);
  const [slipPreview, setSlipPreview] = useState(null);
  const slipInputRef = useRef(null);

  // 🌟 2-Way Reactive Smart Split States for 2 Members
  const [m1Pct, setM1Pct] = useState(70);
  const [m1Amt, setM1Amt] = useState('840');
  const [m2Pct, setM2Pct] = useState(30);
  const [m2Amt, setM2Amt] = useState('360');

  const numAmount = parseFloat(amount) || 0;

  // Initialize or reset form
  useEffect(() => {
    if (initialData) {
      setCategoryId(initialData.category_id || '');
      setAmount(initialData.amount ? initialData.amount.toString() : '1200');
      setExpenseDate(initialData.expense_date || new Date().toISOString().substring(0, 10));
      setExpenseType(initialData.expense_type || 'shared');
      setPayerId(initialData.created_by || user?.id || '');
      setNote(initialData.note || '');
      setTagsInput((initialData.tags || []).join(', '));
      setIsRecurring(!!initialData.is_recurring);

      setSlipScanning(false);
      setSlipError('');
      setSlipPreview(null);
      setScannedSlip(initialData.slip_id ? {
        id: initialData.slip_id,
        imageUrl: initialData.slip_image_url || `/api/slips/${initialData.slip_id}/image`,
        amount: initialData.amount,
      } : null);

      if (initialData.splits && initialData.splits.length >= 2) {
        setM1Pct(initialData.splits[0].percentage);
        setM1Amt(initialData.splits[0].share_amount.toString());
        setM2Pct(initialData.splits[1].percentage);
        setM2Amt(initialData.splits[1].share_amount.toString());
      }
    } else {
      setCategoryId('');
      setPayerId(user?.id || '');
      setAmount('');
      setNote('');
      setTagsInput('#จำเป็น, #ค่าบ้าน');
      setIsRecurring(false);
      setBillFile(null);
      setM1Pct(50);
      setM2Pct(50);
      setM1Amt('0');
      setM2Amt('0');
      setSlipScanning(false);
      setSlipError('');
      setScannedSlip(null);
      setSlipPreview(null);
    }
  }, [initialData, categories, user, isOpen]);

  // Recalculate helper from %
  const recalcFromM1Pct = (pctVal, total = numAmount) => {
    const p1 = Math.min(Math.max(parseFloat(pctVal) || 0, 0), 100);
    const p2 = Math.round((100 - p1) * 100) / 100;
    setM1Pct(p1);
    setM2Pct(p2);
    if (total > 0) {
      const a1 = Math.round(((total * p1) / 100) * 100) / 100;
      const a2 = Math.round((total - a1) * 100) / 100;
      setM1Amt(a1.toString());
      setM2Amt(a2.toString());
    }
  };

  const recalcFromM2Pct = (pctVal, total = numAmount) => {
    const p2 = Math.min(Math.max(parseFloat(pctVal) || 0, 0), 100);
    const p1 = Math.round((100 - p2) * 100) / 100;
    setM2Pct(p2);
    setM1Pct(p1);
    if (total > 0) {
      const a2 = Math.round(((total * p2) / 100) * 100) / 100;
      const a1 = Math.round((total - a2) * 100) / 100;
      setM2Amt(a2.toString());
      setM1Amt(a1.toString());
    }
  };

  // Recalculate helper from Amount
  const recalcFromM1Amt = (amtVal, total = numAmount) => {
    setM1Amt(amtVal);
    const a1 = Math.max(parseFloat(amtVal) || 0, 0);
    if (total > 0) {
      const a2 = Math.max(0, Math.round((total - a1) * 100) / 100);
      const p1 = Math.min(100, Math.round(((a1 / total) * 100) * 100) / 100);
      const p2 = Math.round((100 - p1) * 100) / 100;
      setM2Amt(a2.toString());
      setM1Pct(p1);
      setM2Pct(p2);
    }
  };

  const recalcFromM2Amt = (amtVal, total = numAmount) => {
    setM2Amt(amtVal);
    const a2 = Math.max(parseFloat(amtVal) || 0, 0);
    if (total > 0) {
      const a1 = Math.max(0, Math.round((total - a2) * 100) / 100);
      const p2 = Math.min(100, Math.round(((a2 / total) * 100) * 100) / 100);
      const p1 = Math.round((100 - p2) * 100) / 100;
      setM1Amt(a1.toString());
      setM2Pct(p2);
      setM1Pct(p1);
    }
  };

  const handleTotalAmountChange = (newTotalStr) => {
    setAmount(newTotalStr);
    const newTotal = parseFloat(newTotalStr) || 0;
    if (newTotal > 0) {
      const a1 = Math.round(((newTotal * m1Pct) / 100) * 100) / 100;
      const a2 = Math.round((newTotal - a1) * 100) / 100;
      setM1Amt(a1.toString());
      setM2Amt(a2.toString());
    } else {
      setM1Amt('0');
      setM2Amt('0');
    }
  };

  // ===== 📷 สแกนสลิปโอนเงิน =====
  const handleSlipFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // เลือกไฟล์เดิมซ้ำได้
    if (!file) return;

    setSlipError('');
    setSlipScanning(true);

    try {
      const compressed = await compressImage(file);
      setSlipPreview(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(compressed);
      });

      const formData = new FormData();
      formData.append('slip_image', compressed, compressed.name || 'slip.jpg');
      const result = await api.post('/slips/scan', formData);

      applySlipResult(result);
      showToast('อ่านสลิปเรียบร้อย — ตรวจสอบตัวเลขก่อนบันทึกนะคะ', 'success');
    } catch (err) {
      setScannedSlip(null);
      setSlipError(err.message || 'อ่านสลิปไม่สำเร็จ');
    } finally {
      setSlipScanning(false);
    }
  };

  const applySlipResult = (slip) => {
    setScannedSlip(slip);

    if (slip.amount) {
      handleTotalAmountChange(String(slip.amount));
    }
    if (slip.date) {
      setExpenseDate(slip.date);
    }

    if (!note.trim()) {
      const parts = [slip.receiverName ? `สลิปโอนให้ ${slip.receiverName}` : 'สลิปโอนเงิน'];
      if (slip.transRef) parts.push(`Ref. ${slip.transRef}`);
      setNote(parts.join(' · '));
    }

    if (!categoryId) {
      const hint = `${slip.receiverName || ''} ${slip.senderName || ''}`.toLowerCase();
      const matched = categories.find(c => hint.includes(String(c.name).toLowerCase()));
      if (matched) setCategoryId(matched.id);
    }
  };

  const clearSlip = () => {
    if (slipPreview) URL.revokeObjectURL(slipPreview);
    setSlipPreview(null);
    setScannedSlip(null);
    setSlipError('');
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!categoryId || !numAmount || numAmount <= 0) {
      showToast('กรุณาระบุหมวดหมู่และจำนวนเงินที่ถูกต้อง', 'error');
      return;
    }

    try {
      setLoading(true);
      const parsedTags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)
        .map(t => t.startsWith('#') ? t : `#${t}`);

      const splits = roomMembers.length >= 2 ? [
        { user_id: roomMembers[0].id, user_name: roomMembers[0].full_name, percentage: m1Pct, share_amount: parseFloat(m1Amt) || 0 },
        { user_id: roomMembers[1].id, user_name: roomMembers[1].full_name, percentage: m2Pct, share_amount: parseFloat(m2Amt) || 0 }
      ] : [];

      const formData = new FormData();
      formData.append('category_id', categoryId);
      formData.append('amount', numAmount);
      formData.append('expense_date', expenseDate);
      formData.append('expense_type', expenseType);
      formData.append('payer_id', payerId);
      formData.append('note', note);
      formData.append('tags', JSON.stringify(parsedTags));
      formData.append('is_recurring', isRecurring ? 'true' : 'false');

      if (expenseType === 'shared') {
        formData.append('splits', JSON.stringify(splits));
      }

      if (billFile) {
        formData.append('bill_image', billFile);
      }

      if (scannedSlip?.id) {
        formData.append('slip_id', scannedSlip.id);
      }

      if (initialData?.id) {
        await api.put(`/expenses/${initialData.id}`, formData);
        showToast('แก้ไขรายจ่ายเรียบร้อยแล้ว', 'success');
      } else {
        await api.post('/expenses', formData);
        showToast('บันทึกรายจ่ายใหม่สำเร็จแล้ว', 'success');
      }

      await fetchExpenses();
      onClose();
    } catch (err) {
      showToast(err.message || 'บันทึกไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const m1 = roomMembers[0] || { full_name: 'ดิว' };
  const m2 = roomMembers[1] || { full_name: 'ป๊อบ' };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 my-4 sm:my-6">
          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 flex-shrink-0">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <span>{initialData ? '✏️ แก้ไขรายจ่าย' : '➕ บันทึกรายจ่ายใหม่'}</span>
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 text-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-4 sm:px-6 pt-3 pb-4 sm:pb-6 overflow-y-auto flex-1 min-h-0">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
            {/* Category Select */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  📂 หมวดหมู่ *
                </label>
                <button
                  type="button"
                  onClick={() => setOpenCategoryModal(true)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-0.5"
                >
                  <Plus className="w-3.5 h-3.5" /> เพิ่มหมวดหมู่ใหม่
                </button>
              </div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500"
                required
              >
                <option value="" disabled>เลือกหมวดหมู่</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Note — right below category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                📝 โน้ต / หมายเหตุ
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="เช่น เลขมิเตอร์รอบนี้ 1234"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* 📷 สแกนสลิปโอนเงิน */}
            <div className="rounded-2xl border border-pink-200 bg-pink-50/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-pink-700">📷 สแกนสลิปโอนเงิน</div>
                  <p className="text-[10px] text-pink-500 mt-0.5">ให้ AI อ่านยอดเงิน/วันที่ให้อัตโนมัติ</p>
                </div>

                <div className="flex items-center gap-1.5">
                  {(scannedSlip || slipPreview) && (
                    <button
                      type="button"
                      onClick={clearSlip}
                      className="text-[10px] text-pink-600 hover:text-pink-800 font-semibold px-2 py-1"
                    >
                      ลบ
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => slipInputRef.current?.click()}
                    disabled={slipScanning}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-pink-500 text-white text-[11px] font-bold hover:bg-pink-600 disabled:opacity-60 transition"
                  >
                    {slipScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                    {slipScanning ? 'กำลังอ่าน...' : 'แนบสลิป'}
                  </button>
                </div>
              </div>

              <input
                ref={slipInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleSlipFile}
              />

              {slipPreview && (
                <img
                  src={slipPreview}
                  alt="สลิปที่แนบ"
                  className="mt-2 h-24 w-auto max-w-full rounded-xl object-contain border border-pink-200 bg-white"
                />
              )}

              {!slipPreview && scannedSlip?.id && scannedSlip.imageUrl && (
                <img
                  src={`${scannedSlip.imageUrl}?token=${localStorage.getItem('mymonth_token') || ''}`}
                  alt="สลิปเดิม"
                  className="mt-2 h-24 w-auto max-w-full rounded-xl object-contain border border-pink-200 bg-white"
                />
              )}

              {slipError && (
                <p className="mt-2 text-[10px] text-red-600 leading-relaxed">{slipError}</p>
              )}

              {scannedSlip && !slipError && (
                <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] text-pink-700 font-medium">
                  <Check className="w-3 h-3" />
                  <span>อ่านได้ {formatNumber(scannedSlip.amount || 0)} ฿</span>
                  {scannedSlip.date && <span>· {scannedSlip.date}</span>}
                  {scannedSlip.senderBank && <span>· {scannedSlip.senderBank}</span>}
                  {scannedSlip.needsReview && (
                    <span className="text-amber-600">· ⚠️ ตรวจสอบตัวเลขก่อนบันทึก</span>
                  )}
                </div>
              )}
            </div>

            {/* Amount & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  💰 จำนวนเงินรวม (บาท) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => handleTotalAmountChange(e.target.value)}
                  placeholder="กรอกจำนวนเงิน"
                  className="w-full px-3 py-3 border border-slate-200 rounded-xl text-base font-extrabold text-slate-900 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  📅 วันที่ *
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            {/* Personal vs Shared Toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                📌 ประเภทของรายจ่าย *
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setExpenseType('personal')}
                  style={{ cursor: 'pointer', touchAction: 'manipulation' }}
                  className={`p-2.5 sm:p-3 rounded-2xl border text-left transition ${
                    expenseType === 'personal'
                      ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="font-bold">● รายจ่ายส่วนตัว (เฉพาะฉัน)</div>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">ไม่ต้องแบ่งกับใคร ไม่แสดงในหน้าสรุปหนี้</p>
                </button>

                <button
                  type="button"
                  onClick={() => setExpenseType('shared')}
                  style={{ cursor: 'pointer', touchAction: 'manipulation' }}
                  className={`p-2.5 sm:p-3 rounded-2xl border text-left transition ${
                    expenseType === 'shared'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="font-bold">● รายจ่ายร่วม (แชร์ห้อง)</div>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">แบ่งกับสมาชิกในห้อง แสดงในหน้าสรุปหนี้</p>
                </button>
              </div>
            </div>

            {/* Payer selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">👤 ผู้จ่ายเงิน</label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
              >
                {roomMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} {m.id === user?.id ? '(ฉัน)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 🌟 2-WAY SMART SPLIT (Auto Hidden when Personal is chosen) */}
            {expenseType === 'shared' && roomMembers.length === 1 && (
              <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200 text-xs text-blue-800">
                💡 ห้องนี้ยังมีสมาชิกเพียงคนเดียว — รายจ่ายร่วมจะเป็นส่วนแบ่งของคุณ 100%
                เมื่อสมาชิกคนอื่นเข้าร่วมห้องแล้ว จะสามารถแบ่งจ่ายกันได้ที่ส่วนนี้
              </div>
            )}

            {expenseType === 'shared' && roomMembers.length >= 2 && (
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                  <span>🔀 แบ่งจ่าย</span>
                  <span className="text-[11px] text-slate-500 font-normal">ยอดรวม: <strong>{formatNumber(numAmount)} ฿</strong></span>
                </div>

                {/* Quick select presets — payer always gets the higher share */}
                <div>
                  {(() => {
                    const isPayerM1 = payerId === m1.id;
                    const payerName = isPayerM1 ? m1.full_name : m2.full_name;
                    const otherName = isPayerM1 ? m2.full_name : m1.full_name;
                    return (
                      <>
                        <span className="text-[11px] text-slate-400 mb-1.5 block">ปุ่มลัด — ผู้จ่าย ({payerName}) ได้มากกว่า:</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {[
                            { p: 50 },
                            { p: 60 },
                            { p: 70 },
                            { p: 80 },
                            { p: 90 },
                            { p: 100 }
                          ].map(r => {
                            const payerPct = r.p;
                            const otherPct = 100 - r.p;
                            const displayPayer = isPayerM1 ? m1Pct : m2Pct;
                            const isActive = displayPayer === payerPct;
                            return (
                              <button
                                key={r.p}
                                type="button"
                                onClick={() => {
                                  if (isPayerM1) {
                                    recalcFromM1Pct(payerPct);
                                  } else {
                                    recalcFromM2Pct(payerPct);
                                  }
                                }}
                                className={`px-2 py-1 rounded-xl border text-[10px] font-bold transition flex items-center gap-1 ${
                                  isActive
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <span className={`${isActive ? 'text-emerald-100' : 'text-slate-500'}`}>{payerPct}</span>
                                <span className={`${isActive ? 'text-white/60' : 'text-slate-300'}`}>/</span>
                                <span className={`${isActive ? 'text-emerald-100' : 'text-slate-500'}`}>{otherPct}</span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Member 1 Row (ดิว) */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs gap-2">
                    <span className="font-bold text-slate-800">👤 {m1.full_name}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5 border border-slate-200 rounded-lg px-2 py-1.5 focus-within:border-emerald-500">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={m1Pct}
                          onChange={(e) => recalcFromM1Pct(e.target.value)}
                          className="w-12 text-right font-bold text-slate-800 focus:outline-none bg-transparent text-base"
                        />
                        <span className="text-[10px] text-slate-400 font-semibold">%</span>
                      </div>
                      <span className="text-slate-300">↔</span>
                      <div className="flex items-center gap-0.5 border border-emerald-300 bg-emerald-50/70 rounded-lg px-2 py-1.5 focus-within:border-emerald-500">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={m1Amt}
                          onChange={(e) => recalcFromM1Amt(e.target.value)}
                          className="w-20 text-right font-extrabold text-emerald-800 focus:outline-none bg-transparent text-base"
                        />
                        <span className="text-[10px] text-emerald-600 font-bold">฿</span>
                      </div>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={m1Pct}
                    onChange={(e) => recalcFromM1Pct(e.target.value)}
                    className="w-full h-2 bg-slate-200 rounded-lg accent-emerald-600 cursor-pointer"
                  />
                </div>

                {/* Member 2 Row (ป๊อบ) */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs gap-2">
                    <span className="font-bold text-slate-800">👤 {m2.full_name}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5 border border-slate-200 rounded-lg px-2 py-1.5 focus-within:border-emerald-500">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={m2Pct}
                          onChange={(e) => recalcFromM2Pct(e.target.value)}
                          className="w-12 text-right font-bold text-slate-800 focus:outline-none bg-transparent text-base"
                        />
                        <span className="text-[10px] text-slate-400 font-semibold">%</span>
                      </div>
                      <span className="text-slate-300">↔</span>
                      <div className="flex items-center gap-0.5 border border-emerald-300 bg-emerald-50/70 rounded-lg px-2 py-1.5 focus-within:border-emerald-500">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={m2Amt}
                          onChange={(e) => recalcFromM2Amt(e.target.value)}
                          className="w-20 text-right font-extrabold text-emerald-800 focus:outline-none bg-transparent text-base"
                        />
                        <span className="text-[10px] text-emerald-600 font-bold">฿</span>
                      </div>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={m2Pct}
                    onChange={(e) => recalcFromM2Pct(e.target.value)}
                    className="w-full h-2 bg-slate-200 rounded-lg accent-emerald-600 cursor-pointer"
                  />
                </div>


              </div>
            )}

            {/* Tags */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  📌 แท็ก (คั่นด้วยเครื่องหมายจุลภาค)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="#จำเป็น, #ค่าบ้าน"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 flex gap-2 border-t border-slate-100">                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition active:scale-95"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20 transition active:scale-95 disabled:opacity-50"
                >
                {loading ? 'กำลังบันทึก...' : (initialData ? '💾 บันทึกการแก้ไข' : '✨ บันทึกรายจ่าย')}
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>

      <CategoryModal
        isOpen={openCategoryModal}
        onClose={() => setOpenCategoryModal(false)}
      />
    </>
  );
}
