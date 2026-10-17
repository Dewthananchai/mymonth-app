// Slip Image Store
// ================
// เก็บ "ไฟล์รูปสลิป" แยกจาก documents cache เพื่อไม่ให้ RAM บวม
// - มี DATABASE_URL → เก็บใน PostgreSQL ตาราง slip_images (BYTEA)
// - ไม่มี (โหมด dev JSON) → เก็บไฟล์ใน server/uploads/slips/

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { getPgPool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGE_DIR = path.join(__dirname, 'uploads', 'slips');

let tableReady = false;

async function ensureTable(pool) {
  if (tableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS slip_images (
      id TEXT PRIMARY KEY,
      room_code TEXT,
      mime TEXT NOT NULL,
      bytes BYTEA NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_slip_images_room ON slip_images(room_code);
  `);
  tableReady = true;
}

function ensureImageDir() {
  if (!fs.existsSync(IMAGE_DIR)) {
    fs.mkdirSync(IMAGE_DIR, { recursive: true });
  }
}

export function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function extensionFor(mime) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return 'jpg';
}

function mimeForExtension(ext) {
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

/**
 * บันทึกรูปสลิป
 * @returns {Promise<{id: string, mime: string}>}
 */
export async function putSlipImage({ buffer, mime = 'image/jpeg', roomCode = '' }) {
  const id = `slip_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const pool = getPgPool();

  if (pool) {
    await ensureTable(pool);
    await pool.query(
      'INSERT INTO slip_images (id, room_code, mime, bytes) VALUES ($1, $2, $3, $4)',
      [id, roomCode, mime, buffer]
    );
    return { id, mime };
  }

  // โหมด dev: เขียนไฟล์
  ensureImageDir();
  const ext = extensionFor(mime);
  fs.writeFileSync(path.join(IMAGE_DIR, `${id}.${ext}`), buffer);
  return { id, mime };
}

/**
 * อ่านรูปสลิป
 * @returns {Promise<{buffer: Buffer, mime: string}|null>}
 */
export async function getSlipImage(id) {
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) return null;

  const pool = getPgPool();
  if (pool) {
    await ensureTable(pool);
    const result = await pool.query('SELECT mime, bytes FROM slip_images WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return { buffer: result.rows[0].bytes, mime: result.rows[0].mime };
  }

  ensureImageDir();
  const files = fs.readdirSync(IMAGE_DIR).filter(name => name.startsWith(`${id}.`));
  if (files.length === 0) return null;

  const filePath = path.join(IMAGE_DIR, files[0]);
  const ext = path.extname(files[0]).replace('.', '');
  return { buffer: fs.readFileSync(filePath), mime: mimeForExtension(ext) };
}

/**
 * ลบรูปสลิป (ใช้ตอน prune ของเก่า)
 */
export async function deleteSlipImage(id) {
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) return false;

  const pool = getPgPool();
  if (pool) {
    await ensureTable(pool);
    await pool.query('DELETE FROM slip_images WHERE id = $1', [id]);
    return true;
  }

  ensureImageDir();
  const files = fs.readdirSync(IMAGE_DIR).filter(name => name.startsWith(`${id}.`));
  files.forEach(name => {
    try {
      fs.unlinkSync(path.join(IMAGE_DIR, name));
    } catch {
      // ไม่เป็นไร ถ้าลบไม่ได้
    }
  });
  return files.length > 0;
}

export default { putSlipImage, getSlipImage, deleteSlipImage, sha256 };
