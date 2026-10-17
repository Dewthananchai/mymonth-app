// Slip OCR — Google Gemini Vision
// ===============================
// อ่านสลิปโอนเงินจากรูปด้วย Gemini (free tier) ผ่าน REST API ตรง
// ไม่เพิ่ม dependency (ใช้ fetch ของ Node 20+)
//
// ENV: GEMINI_API_KEY (จำเป็น), GEMINI_MODEL (ไม่บังคับ)

import { normalizeSlip, validateSlip } from './slip-parse.js';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// เรียงจากโมเดลที่โควตาฟรีเยอะสุด → สำรอง
const FALLBACK_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite'];

const PROMPT = `คุณเป็นระบบอ่านสลิปโอนเงินของธนาคารไทย
อ่านข้อความทั้งหมดในภาพ แล้วตอบกลับเป็น JSON ตาม schema ที่กำหนดเท่านั้น

กติกา:
- ถ้าภาพไม่ใช่สลิปโอนเงิน/สลิปธนาคาร ให้ is_slip = false และปล่อยช่องอื่นว่าง
- amount ต้องเป็นตัวเลขเท่านั้น (ไม่ต้องมี comma หรือคำว่าบาท) เช่น 1250.00
- date ต้องเป็นรูปแบบ YYYY-MM-DD (ค.ศ.) แปลงจากปี พ.ศ. บนสลิป เช่น 12 ต.ค. 69 → 2026-10-12 หรือ 12/10/2569 → 2026-10-12
- time ต้องเป็น HH:mm (24 ชั่วโมง)
- trans_ref คือเลขที่อ้างอิง/รหัสรายการ (Ref. No. / เลขที่รายการ) เอาเฉพาะตัวอักษรและตัวเลข
- sender_name = ชื่อผู้โอน, receiver_name = ชื่อผู้รับ
- sender_bank / receiver_bank = ชื่อหรือรหัสธนาคาร เช่น KBANK, SCB, KTB, BBL, TTB, BAY, GSB, PROMPTPAY
- confidence = ความมั่นใจในการอ่าน 0 ถึง 1
- raw_text = ข้อความดิบที่อ่านได้จากภาพ (ไม่เกิน 1500 ตัวอักษร)
- ห้ามเดาตัวเลข ถ้าอ่านไม่ชัดให้ใส่ค่าว่าง`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    is_slip: { type: 'BOOLEAN' },
    amount: { type: 'NUMBER' },
    currency: { type: 'STRING' },
    trans_ref: { type: 'STRING' },
    date: { type: 'STRING' },
    time: { type: 'STRING' },
    sender_name: { type: 'STRING' },
    sender_bank: { type: 'STRING' },
    receiver_name: { type: 'STRING' },
    receiver_bank: { type: 'STRING' },
    confidence: { type: 'NUMBER' },
    raw_text: { type: 'STRING' },
  },
  required: ['is_slip', 'amount', 'date', 'trans_ref'],
};

function candidateModels() {
  const preferred = process.env.GEMINI_MODEL;
  const list = preferred ? [preferred, ...FALLBACK_MODELS] : FALLBACK_MODELS;
  return [...new Set(list.filter(Boolean))];
}

export function isOcrConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function getOcrModel() {
  return candidateModels()[0];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callGemini({ model, apiKey, buffer, mime }) {
  const url = `${API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    contents: [{
      parts: [
        { text: PROMPT },
        { inline_data: { mime_type: mime, data: buffer.toString('base64') } },
      ],
    }],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    const message = json?.error?.message || text.substring(0, 300);
    return { ok: false, status: response.status, message };
  }

  const candidateText = json?.candidates?.[0]?.content?.parts
    ?.map(part => part.text || '')
    .join('')
    .trim();

  if (!candidateText) {
    return { ok: false, status: 502, message: 'โมเดลไม่ได้ส่งข้อความกลับมา' };
  }

  let parsed;
  try {
    parsed = JSON.parse(candidateText);
  } catch {
    // เผื่อโมเดลห่อด้วย ```json
    const match = candidateText.match(/\{[\s\S]*\}/);
    if (!match) return { ok: false, status: 502, message: 'ผลลัพธ์ไม่ใช่ JSON' };
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return { ok: false, status: 502, message: 'ผลลัพธ์ไม่ใช่ JSON' };
    }
  }

  return { ok: true, data: parsed };
}

/**
 * อ่านสลิปจาก buffer รูปภาพ
 * @returns {Promise<{ok:boolean, reason?:string, message?:string, model?:string,
 *   slip?:object, validation?:object, raw?:object}>}
 */
export async function extractSlip({ buffer, mime = 'image/jpeg' }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, reason: 'no_key', message: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY' };
  }
  if (!buffer || buffer.length === 0) {
    return { ok: false, reason: 'empty', message: 'ไม่พบไฟล์รูปภาพ' };
  }

  let lastError = null;

  for (const model of candidateModels()) {
    const attempt = await callGemini({ model, apiKey, buffer, mime }).catch(err => ({
      ok: false,
      status: 0,
      message: err.name === 'TimeoutError' ? 'หมดเวลารอ AI' : err.message,
      timedOut: err.name === 'TimeoutError',
    }));

    if (attempt.ok) {
      const slip = normalizeSlip(attempt.data);
      const validation = validateSlip(slip);
      return { ok: true, model, slip, validation, raw: attempt.data };
    }

    lastError = attempt;

    // โมเดลนี้ไม่มี/ถูกยกเลิก → ลองตัวถัดไป
    if (attempt.status === 404 || attempt.status === 400) {
      console.warn(`⚠️ OCR model ${model} ใช้งานไม่ได้ (${attempt.status}) — ลองโมเดลถัดไป`);
      continue;
    }

    // โควตาหมด → ลองโมเดลถัดไป ถ้าตัวสุดท้ายแล้วคืน quota
    if (attempt.status === 429) {
      await sleep(800);
      continue;
    }

    if (attempt.timedOut) {
      continue;
    }

    if (attempt.status >= 500) {
      continue;
    }

    // 401/403 = key ผิด → ไม่ต้องลองต่อ
    if (attempt.status === 401 || attempt.status === 403) {
      return { ok: false, reason: 'auth', message: 'GEMINI_API_KEY ไม่ถูกต้องหรือไม่มีสิทธิ์' };
    }

    break;
  }

  if (lastError?.status === 429) {
    return { ok: false, reason: 'quota', message: 'โควตา AI ฟรีของวันนี้เต็มแล้ว กรุณาลองใหม่พรุ่งนี้' };
  }

  return {
    ok: false,
    reason: 'failed',
    message: lastError?.message || 'อ่านสลิปไม่สำเร็จ',
  };
}

export default { extractSlip, isOcrConfigured, getOcrModel };
