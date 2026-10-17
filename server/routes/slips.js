// Slip Routes — OCR สลิปโอนเงิน
// ============================
// POST /api/slips/scan          → อัปโหลดรูปสลิป + อ่านด้วย Gemini Vision
// GET  /api/slips/:id           → ข้อมูลสลิป
// GET  /api/slips/:id/image     → รูปสลิป (ใช้ ?token=JWT เพราะ <img> ส่ง header ไม่ได้)

import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';

import { db } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { extractSlip, isOcrConfigured } from '../utils/slip-ocr.js';
import { putSlipImage, getSlipImage, deleteSlipImage, sha256 } from '../slip-store.js';
import { toBangkokIso } from '../utils/slip-parse.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'mymonth-jwt-secret-key-2026-v2';

const MAX_IMAGES_PER_ROOM = 200;
const DAILY_LIMIT = parseInt(process.env.SLIP_OCR_DAILY_LIMIT || '150', 10);
const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase();
    if (ALLOWED_MIME.includes(mime)) return cb(null, true);
    cb(new Error('รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP)'));
  },
});

// ห่อ multer เพื่อให้ error ตอบเป็น JSON (ไม่ใช่ HTML 500)
function uploadSlip(req, res, next) {
  upload.single('slip_image')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'รูปใหญ่เกิน 8MB กรุณาส่งรูปที่เล็กลง' });
    }
    return res.status(400).json({ error: err.message || 'อัปโหลดรูปไม่สำเร็จ' });
  });
}

// 20 ครั้ง / ชั่วโมง / ผู้ใช้
const scanLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: { error: 'สแกนสลิปบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่' },
});

function bangkokDateKey(isoString) {
  const time = new Date(isoString).getTime();
  if (!Number.isFinite(time)) return '';
  return new Date(time + 7 * 60 * 60 * 1000).toISOString().substring(0, 10);
}

function todayKey() {
  return bangkokDateKey(new Date().toISOString());
}

function serializeSlip(slip) {
  return {
    id: slip.id,
    amount: slip.amount,
    currency: slip.currency || 'THB',
    date: slip.trans_date,
    time: slip.trans_time,
    transRef: slip.trans_ref,
    senderName: slip.sender_name,
    senderBank: slip.sender_bank,
    receiverName: slip.receiver_name,
    receiverBank: slip.receiver_bank,
    confidence: slip.confidence,
    status: slip.status,
    source: slip.source,
    needsReview: Boolean(slip.needs_review),
    reasons: slip.reasons || [],
    expenseId: slip.expense_id || null,
    imageUrl: slip.image_id ? `/api/slips/${slip.id}/image` : null,
    createdAt: slip.createdAt,
  };
}

function dailyUsageForRoom(roomCode) {
  const today = todayKey();
  return db.find('slips', s => s.room_code === roomCode && bangkokDateKey(s.createdAt) === today).length;
}

function pruneOldImages(roomCode) {
  const slips = db.find('slips', s => s.room_code === roomCode).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  if (slips.length <= MAX_IMAGES_PER_ROOM) return;

  const toRemove = slips.slice(0, slips.length - MAX_IMAGES_PER_ROOM);
  toRemove.forEach(slip => {
    if (slip.image_id) {
      deleteSlipImage(slip.image_id).catch(() => {});
    }
    db.delete('slips', slip.id);
  });
}

// ===== 1. สแกนสลิป =====
router.post('/scan', authenticateToken, scanLimiter, uploadSlip, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'กรุณาแนบรูปสลิป' });
    }

    if (!isOcrConfigured()) {
      return res.status(503).json({ error: 'ยังไม่ได้ตั้งค่าระบบอ่านสลิป (GEMINI_API_KEY)' });
    }

    const roomCode = req.user.room_code;
    const mime = req.file.mimetype === 'image/jpg' ? 'image/jpeg' : req.file.mimetype;
    const hash = sha256(req.file.buffer);

    // สลิปซ้ำ (รูปเดิม) → คืนผลเดิม ไม่เรียก AI ซ้ำ
    const existing = db.findOne('slips', s => s.room_code === roomCode && s.sha256 === hash);
    if (existing) {
      return res.json({
        ...serializeSlip(existing),
        duplicate: true,
        duplicateNote: 'สลิปนี้เคยสแกนแล้ว',
        usage: { used: dailyUsageForRoom(roomCode), limit: DAILY_LIMIT },
      });
    }

    const usedToday = dailyUsageForRoom(roomCode);
    if (usedToday >= DAILY_LIMIT) {
      return res.status(429).json({
        error: `โควตาอ่านสลิปวันนี้ครบแล้ว (${DAILY_LIMIT} รูป) กรุณาลองใหม่พรุ่งนี้`,
      });
    }

    const ocr = await extractSlip({ buffer: req.file.buffer, mime });

    if (!ocr.ok) {
      const status = ocr.reason === 'quota' ? 429 : ocr.reason === 'auth' ? 502 : 422;
      return res.status(status).json({ error: ocr.message || 'อ่านสลิปไม่สำเร็จ', reason: ocr.reason });
    }

    if (ocr.validation.status === 'failed') {
      return res.status(422).json({
        error: `อ่านสลิปไม่สำเร็จ: ${ocr.validation.reasons.join(', ')}`,
        reasons: ocr.validation.reasons,
        needsReview: true,
      });
    }

    const image = await putSlipImage({
      buffer: req.file.buffer,
      mime,
      roomCode,
    });

    const slip = db.insert('slips', {
      room_code: roomCode,
      user_id: req.user.id,
      user_name: req.user.full_name,
      source: 'web',
      image_id: image.id,
      mime,
      sha256: hash,
      amount: ocr.slip.amount,
      currency: ocr.slip.currency,
      trans_ref: ocr.slip.transRef,
      trans_date: ocr.slip.date,
      trans_time: ocr.slip.time,
      occurred_at: toBangkokIso(ocr.slip.date, ocr.slip.time),
      sender_name: ocr.slip.senderName,
      sender_bank: ocr.slip.senderBank,
      receiver_name: ocr.slip.receiverName,
      receiver_bank: ocr.slip.receiverBank,
      confidence: ocr.slip.confidence,
      needs_review: ocr.validation.needsReview,
      reasons: ocr.validation.reasons,
      status: 'parsed',
      model: ocr.model,
      raw_text: ocr.slip.rawText,
    });

    pruneOldImages(roomCode);

    res.status(201).json({
      ...serializeSlip(slip),
      duplicate: false,
      usage: { used: usedToday + 1, limit: DAILY_LIMIT },
    });
  } catch (err) {
    console.error('Slip scan error:', err.message);
    if (err.message?.includes('รูปภาพ')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'สแกนสลิปไม่สำเร็จ กรุณาลองใหม่' });
  }
});

// ===== 2. ข้อมูลสลิป =====
router.get('/:id', authenticateToken, (req, res) => {
  const slip = db.findById('slips', req.params.id);
  if (!slip || slip.room_code !== req.user.room_code) {
    return res.status(404).json({ error: 'ไม่พบสลิปนี้' });
  }
  res.json(serializeSlip(slip));
});

// ===== 3. รูปสลิป =====
router.get('/:id/image', (req, res) => {
  const rawToken = req.query.token || (req.headers.authorization || '').split(' ')[1];
  if (!rawToken) return res.status(401).json({ error: 'Unauthorized' });

  let payload;
  try {
    payload = jwt.verify(rawToken, JWT_SECRET);
  } catch {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const slip = db.findById('slips', req.params.id);
  if (!slip || (slip.room_code !== payload.room_code)) {
    return res.status(404).json({ error: 'ไม่พบสลิปนี้' });
  }

  getSlipImage(slip.image_id)
    .then(image => {
      if (!image) return res.status(404).json({ error: 'ไม่พบไฟล์รูปสลิป' });
      res.setHeader('Content-Type', image.mime);
      res.setHeader('Cache-Control', 'private, max-age=86400');
      res.send(image.buffer);
    })
    .catch(err => {
      console.error('Slip image error:', err.message);
      res.status(500).json({ error: 'โหลดรูปสลิปไม่สำเร็จ' });
    });
});

export default router;
