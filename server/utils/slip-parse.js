// Slip Parsing Helpers
// =====================
// Pure functions (no deps) ที่ใช้แปลงข้อมูลดิบจาก OCR ให้เป็นค่าที่บันทึกได้
// ทุกฟังก์ชันคืนค่า null เมื่ออ่านไม่ได้ เพื่อให้ผู้เรียกตัดสินใจเอง

// ===== Thai digits & months =====
const THAI_DIGITS = { '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4', '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9' };

const THAI_MONTHS = {
  'ม.ค.': 1, 'มกราคม': 1, 'มกรา': 1,
  'ก.พ.': 2, 'กุมภาพันธ์': 2, 'กุมภา': 2,
  'มี.ค.': 3, 'มีนาคม': 3, 'มีนา': 3,
  'เม.ย.': 4, 'เมษายน': 4, 'เมษา': 4,
  'พ.ค.': 5, 'พฤษภาคม': 5, 'พฤษภา': 5,
  'มิ.ย.': 6, 'มิถุนายน': 6, 'มิถุนา': 6,
  'ก.ค.': 7, 'กรกฎาคม': 7, 'กรกฎา': 7,
  'ส.ค.': 8, 'สิงหาคม': 8, 'สิงหา': 8,
  'ก.ย.': 9, 'กันยายน': 9, 'กันยา': 9,
  'ต.ค.': 10, 'ตุลาคม': 10, 'ตุลา': 10,
  'พ.ย.': 11, 'พฤศจิกายน': 11, 'พฤศจิกา': 11,
  'ธ.ค.': 12, 'ธันวาคม': 12, 'ธันวา': 12,
};

const EN_MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

// ===== Bank aliases =====
const BANK_ALIASES = [
  ['KBANK', ['kbank', 'k bank', 'กสิกรไทย', 'กสิกร', 'kasikorn', 'k+']],
  ['SCB', ['scb', 'ไทยพาณิชย์', 'siam commercial', 'ไทยพาณิช']],
  ['BBL', ['bbl', 'กรุงเทพ', 'bangkok bank']],
  ['KTB', ['ktb', 'กรุงไทย', 'krungthai']],
  ['BAY', ['bay', 'กรุงศรี', 'krungsri', 'ayudhya', 'krungsri ayudhya']],
  ['TTB', ['ttb', 'ทหารไทย', 'ธนชาต', 'thanachart', 'tmb']],
  ['GSB', ['gsb', 'ออมสิน', 'government savings']],
  ['BAAC', ['baac', 'ธ.ก.ส.', 'ธกส', 'เพื่อการเกษตร']],
  ['KKP', ['kkp', 'เกียรตินาคิน', 'kiatnakin']],
  ['TISCO', ['tisco', 'ทิสโก้']],
  ['CIMB', ['cimb', 'ซีไอเอ็มบี']],
  ['UOB', ['uob', 'ยูโอบี']],
  ['LHBANK', ['lh bank', 'lhb', 'แลนด์ แอนด์ เฮ้าส์', 'land and houses']],
  ['PROMPTPAY', ['promptpay', 'พร้อมเพย์', 'พร้อมเพย']],
  ['TRUEMONEY', ['truemoney', 'ทรูมันนี่', 'true wallet', 'truewallet']],
];

function toThaiDigitsNormalized(value) {
  return String(value).replace(/[๐-๙]/g, ch => THAI_DIGITS[ch] || ch);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * แปลงยอดเงินจาก OCR เป็น number
 * รองรับ "1,234.00", "350", "350.00 บาท", "๑,๒๓๔.๕๐", 1234
 * คืน null ถ้าอ่านไม่ได้หรือติดลบ
 */
export function parseAmount(input) {
  if (input === null || input === undefined) return null;

  if (typeof input === 'number') {
    return Number.isFinite(input) && input > 0 ? round2(input) : null;
  }

  let text = toThaiDigitsNormalized(input).trim();
  if (!text) return null;

  // ยอดติดลบ = ไม่ใช่ยอดโอนปกติ (เช่น รายการหักเงิน)
  if (text.startsWith('-')) return null;

  // ตัดคำที่ไม่ใช่ตัวเลขออก (บาท, THB, ฿ ฯลฯ)
  text = text.replace(/[^\d.,]/g, '');
  if (!text) return null;

  // ถ้ามีทั้ง "," และ "." → "," คือตัวคั่นหลักพัน
  if (text.includes(',')) {
    // รูปแบบไทยที่ใช้ "," เป็นทศนิยม (เช่น 350,50) พบได้น้อย — ถือว่า "," ตามหลัง "." ไม่มี
    text = text.replace(/,/g, '');
  }

  // ตัดจุดที่เกินมา (เช่น "350.00.00")
  const parts = text.split('.');
  if (parts.length > 2) {
    text = `${parts[0]}.${parts[1]}`;
  }

  const value = parseFloat(text);
  if (!Number.isFinite(value) || value <= 0) return null;
  return round2(value);
}

function buildDate(year, month, day) {
  if (!year || !month || !day) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  // แปลงปีพุทธศักราช → ค.ศ.
  let y = year;
  if (y > 2400) y -= 543;
  else if (y < 100) y = 2500 + y - 543;

  if (y < 2000 || y > 2100) return null;

  const probe = new Date(Date.UTC(y, month - 1, day));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    return null;
  }

  const pad = n => String(n).padStart(2, '0');
  return `${y}-${pad(month)}-${pad(day)}`;
}

function parseTimeFrom(text) {
  const match = String(text || '').match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return null;
  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * แปลงวันที่จากสลิป (ไทย/อังกฤษ/ISO) เป็น { date: 'YYYY-MM-DD', time: 'HH:mm'|null }
 * รองรับ "12 ต.ค. 69", "12 ต.ค. 2569 14:30", "12/10/2569", "12-10-2026", "2026-10-12"
 */
export function parseSlipDate(input, timeInput = null) {
  if (!input) return null;

  const raw = toThaiDigitsNormalized(input).trim();
  if (!raw) return null;

  let date = null;

  // ISO: 2026-10-12
  let m = raw.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) date = buildDate(+m[1], +m[2], +m[3]);

  // 12/10/2569 หรือ 12-10-2026 (dd/mm/yyyy)
  if (!date) {
    m = raw.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
    if (m) {
      // สลิปไทยเป็น dd/mm/yyyy (ถ้าหลักแรก > 12 ก็ยังเป็น dd/mm)
      date = buildDate(+m[3], +m[2], +m[1]);
    }
  }

  // 12 ต.ค. 69 / 12 ตุลาคม 2569 / 12 Oct 2026
  if (!date) {
    const thaiMonthKeys = Object.keys(THAI_MONTHS).sort((a, b) => b.length - a.length);
    const monthMatch = thaiMonthKeys.find(key => raw.includes(key));
    if (monthMatch) {
      const dayMatch = raw.match(/(\d{1,2})\s*(?:เดือน)?/);
      const yearMatch = raw.match(/(?:^|\s)(\d{2,4})(?:\s|$)/g);
      const day = dayMatch ? +dayMatch[1] : null;
      let year = null;
      if (yearMatch) {
        // เลือกตัวเลขสุดท้ายที่ไม่ใช่วัน
        for (const token of yearMatch) {
          const n = parseInt(token.trim(), 10);
          if (n !== day && n >= 60 && n <= 2700) year = n;
        }
      }
      date = buildDate(year, THAI_MONTHS[monthMatch], day);
    }
  }

  if (!date) {
    const en = raw.toLowerCase().match(/(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(\d{4})/);
    if (en) date = buildDate(+en[3], EN_MONTHS[en[2]], +en[1]);
  }

  if (!date) return null;

  const timeSource = timeInput || raw;
  return { date, time: parseTimeFrom(timeSource) };
}

/**
 * ทำความสะอาดเลขที่อ้างอิง (transRef) เช่น "016163 0000-1234" → "01616300001234"
 */
export function sanitizeTransRef(input) {
  if (!input) return null;
  const cleaned = toThaiDigitsNormalized(input).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length < 6 || cleaned.length > 40) return null;
  // ต้องมีตัวเลขอย่างน้อย 4 ตัว ไม่งั้นไม่ใช่เลขอ้างอิง
  if ((cleaned.match(/\d/g) || []).length < 4) return null;
  return cleaned;
}

/**
 * แปลงชื่อธนาคาร/รหัสธนาคารเป็นรหัสมาตรฐาน
 */
export function normalizeBank(input) {
  if (!input) return null;
  const text = String(input).toLowerCase().trim();
  if (!text) return null;

  for (const [code, aliases] of BANK_ALIASES) {
    if (aliases.some(alias => text.includes(alias))) return code;
  }

  // ถ้าเป็นรหัสอยู่แล้ว
  const upper = String(input).toUpperCase().trim();
  if (BANK_ALIASES.some(([code]) => code === upper)) return upper;

  // ไม่รู้จัก → เก็บข้อความเดิมไว้โชว์ แต่ตัดความยาว
  return String(input).trim().substring(0, 40);
}

/**
 * ทำความสะอาดชื่อบุคคล/ร้านค้า
 */
export function cleanName(input) {
  if (!input) return null;
  const text = String(input).replace(/\s+/g, ' ').trim();
  if (!text) return null;
  // ตัดคำว่า "นาย/นาง/นางสาว" ออกให้อ่านง่ายขึ้น (แต่ยังเก็บชื่อเต็มไว้)
  return text.substring(0, 80);
}

/**
 * แปลงผลลัพธ์ดิบจาก OCR ให้เป็นโครงสร้างมาตรฐาน
 */
export function normalizeSlip(raw = {}) {
  const parsedDate = parseSlipDate(raw.date || raw.trans_date || raw.raw_date, raw.time || raw.trans_time);

  return {
    isSlip: raw.is_slip !== false && raw.isSlip !== false,
    amount: parseAmount(raw.amount),
    currency: (raw.currency || 'THB').toString().toUpperCase().substring(0, 3),
    transRef: sanitizeTransRef(raw.trans_ref || raw.transRef),
    date: parsedDate ? parsedDate.date : null,
    time: parsedDate ? parsedDate.time : null,
    senderName: cleanName(raw.sender_name || raw.senderName),
    senderBank: normalizeBank(raw.sender_bank || raw.senderBank),
    receiverName: cleanName(raw.receiver_name || raw.receiverName),
    receiverBank: normalizeBank(raw.receiver_bank || raw.receiverBank),
    confidence: normalizeConfidence(raw.confidence),
    rawText: typeof raw.raw_text === 'string' ? raw.raw_text.substring(0, 4000) : null,
  };
}

function normalizeConfidence(value) {
  if (value === null || value === undefined) return null;
  let n = parseFloat(value);
  if (!Number.isFinite(n)) return null;
  if (n > 1) n = n / 100;
  if (n < 0) n = 0;
  if (n > 1) n = 1;
  return Math.round(n * 100) / 100;
}

const MAX_AMOUNT = 1000000;

/**
 * ตรวจความถูกต้องของข้อมูลที่ normalize แล้ว
 * คืน { status: 'parsed'|'failed', needsReview, reasons }
 */
export function validateSlip(slip) {
  const reasons = [];

  if (!slip || slip.isSlip === false) {
    return { status: 'failed', needsReview: true, reasons: ['ไม่ใช่สลิปโอนเงิน'] };
  }

  if (!slip.amount) {
    reasons.push('อ่านยอดเงินไม่ได้');
  } else if (slip.amount > MAX_AMOUNT) {
    reasons.push('ยอดเงินสูงผิดปกติ');
  } else if (slip.amount < 1) {
    reasons.push('ยอดเงินต่ำกว่า 1 บาท');
  }

  if (!slip.date) {
    reasons.push('อ่านวันที่ไม่ได้');
  } else {
    const parsed = new Date(`${slip.date}T00:00:00Z`);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (parsed.getTime() > tomorrow.getTime()) {
      reasons.push('วันที่อยู่ในอนาคต');
    }
  }

  if (!slip.transRef) {
    reasons.push('ไม่พบเลขที่อ้างอิง');
  }

  const blocking = reasons.filter(r =>
    ['ไม่ใช่สลิปโอนเงิน', 'อ่านยอดเงินไม่ได้', 'ยอดเงินสูงผิดปกติ', 'ยอดเงินต่ำกว่า 1 บาท', 'วันที่อยู่ในอนาคต'].includes(r)
  );

  if (blocking.length > 0) {
    return { status: 'failed', needsReview: true, reasons };
  }

  const needsReview = reasons.length > 0 || (slip.confidence !== null && slip.confidence < 0.7);

  return { status: 'parsed', needsReview, reasons };
}

/**
 * แปลงวันที่ (YYYY-MM-DD) + เวลา (HH:mm) → ISO string ตามเวลาไทย
 */
export function toBangkokIso(date, time) {
  const safeDate = date || new Date().toISOString().substring(0, 10);
  const safeTime = time && /^\d{2}:\d{2}$/.test(time) ? time : '00:00';
  return `${safeDate}T${safeTime}:00+07:00`;
}

export default {
  parseAmount,
  parseSlipDate,
  sanitizeTransRef,
  normalizeBank,
  cleanName,
  normalizeSlip,
  validateSlip,
  toBangkokIso,
};
