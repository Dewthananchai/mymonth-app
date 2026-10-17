// ทดสอบอ่านสลิปด้วย Gemini OCR จากไฟล์ในเครื่อง
// วิธีใช้:
//   1. ใส่ GEMINI_API_KEY ใน .env (ขอฟรีที่ https://aistudio.google.com/apikey)
//   2. node server/scripts/slip-ocr-smoke.mjs path/to/slip.jpg
//
// แสดงผล JSON ที่ระบบจะใช้เติมฟอร์มจดรายจ่าย

import 'dotenv/config';
import fs from 'fs';
import path from 'path';

import { extractSlip, isOcrConfigured, getOcrModel } from '../utils/slip-ocr.js';

const filePath = process.argv[2];

if (!filePath) {
  console.error('ใช้งาน: node server/scripts/slip-ocr-smoke.mjs <path-to-image>');
  process.exit(1);
}

if (!isOcrConfigured()) {
  console.error('❌ ยังไม่ได้ตั้งค่า GEMINI_API_KEY ใน .env');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`❌ ไม่พบไฟล์: ${filePath}`);
  process.exit(1);
}

const ext = path.extname(filePath).toLowerCase();
const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
const buffer = fs.readFileSync(filePath);

console.log(`🤖 model: ${getOcrModel()} | ไฟล์: ${path.basename(filePath)} (${(buffer.length / 1024).toFixed(0)} KB)`);

const result = await extractSlip({ buffer, mime });

if (!result.ok) {
  console.error(`❌ อ่านไม่สำเร็จ: ${result.reason} — ${result.message}`);
  process.exit(1);
}

console.log('\n✅ ผลลัพธ์:');
console.log(JSON.stringify({
  model: result.model,
  validation: result.validation,
  slip: result.slip,
}, null, 2));
