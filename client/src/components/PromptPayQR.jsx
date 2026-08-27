import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, QrCode, Smartphone } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export default function PromptPayQR({ payload, targetId, recipientName, amount, note, size = 180 }) {
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    if (targetId) {
      navigator.clipboard.writeText(targetId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
      {/* Thai PromptPay Top Banner Header */}
      <div className="w-full bg-[#1A3762] text-white py-1.5 px-3 rounded-lg mb-4 flex items-center justify-center gap-2 text-xs font-semibold tracking-wider">
        <Smartphone className="w-4 h-4 text-emerald-400" />
        <span>THAI QR PAYMENT (PROMPTPAY)</span>
      </div>

      {/* QR Code */}
      <div className="p-3 bg-white border-2 border-slate-100 rounded-2xl shadow-inner relative group mb-3">
        {payload ? (
          <QRCodeSVG
            value={payload}
            size={size}
            level="M"
            includeMargin={true}
            className="rounded-lg"
          />
        ) : (
          <div style={{ width: size, height: size }} className="flex flex-col items-center justify-center bg-slate-50 text-slate-400 text-xs text-center p-4">
            <QrCode className="w-8 h-8 mb-2 opacity-50" />
            <span>กรุณากรอกพร้อมเพย์ ID ในโปรไฟล์</span>
          </div>
        )}
      </div>

      {/* Amount Display */}
      {amount !== undefined && amount !== null && (
        <div className="text-xl font-bold text-slate-800 mb-1">
          {formatCurrency(amount)}
        </div>
      )}

      {/* Recipient info */}
      <div className="w-full text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3 space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">ผู้รับเงิน:</span>
          <span className="font-semibold text-slate-800">{recipientName || 'สมาชิก'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">พร้อมเพย์ ID:</span>
          <span className="font-mono font-medium text-slate-700">{targetId || '-'}</span>
        </div>
        {note && (
          <div className="flex justify-between items-center text-left">
            <span className="text-slate-400 flex-shrink-0 mr-2">หมายเหตุ:</span>
            <span className="truncate text-slate-600 font-medium">{note}</span>
          </div>
        )}
      </div>

      {/* Copy PromptPay ID Button */}
      <button
        type="button"
        onClick={handleCopyId}
        disabled={!targetId}
        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition active:scale-95 disabled:opacity-50"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-emerald-600 font-bold">คัดลอกพร้อมเพย์ ID แล้ว</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            <span>📱 คัดลอกพร้อมเพย์ ID</span>
          </>
        )}
      </button>
    </div>
  );
}
