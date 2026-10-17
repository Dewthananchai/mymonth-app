// Image helpers — ย่อรูปก่อนอัปโหลดสลิป
// ลดขนาดรูปจากกล้องมือถือ (3–8MB) เหลือ ~200–500KB
// เพื่อประหยัดพื้นที่ DB และทำให้ AI อ่านเร็วขึ้น

export async function compressImage(file, { maxSize = 1600, quality = 0.82 } = {}) {
  if (!file) throw new Error('ไม่พบไฟล์รูปภาพ');
  if (!file.type?.startsWith('image/')) throw new Error('ไฟล์ต้องเป็นรูปภาพเท่านั้น');

  // HEIC/HEIF บางเบราว์เซอร์ decode ไม่ได้ → ส่งไฟล์เดิมให้ server
  if (file.type === 'image/heic' || file.type === 'image/heif') return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close?.();
    return file;
  }

  // พื้นขาวรองรับ PNG โปร่งใส
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) return file;

  const name = (file.name || 'slip').replace(/\.[^.]+$/, '') + '.jpg';
  return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
}

export default { compressImage };
