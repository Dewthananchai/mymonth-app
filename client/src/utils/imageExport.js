import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

/**
 * Capture an HTML element and copy it as PNG image directly to clipboard
 */
export async function copyElementAsImage(elementId) {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('ไม่พบองค์ประกอบบิลที่ต้องการคัดลอก');
  }

  // Render element to canvas with high resolution scale
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('ไม่สามารถแปลงบิลเป็นรูปภาพได้'));
        return;
      }

      try {
        if (navigator.clipboard && window.ClipboardItem) {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          resolve({ mode: 'clipboard', message: '✅ คัดลอกบิลเป็นรูปภาพเรียบร้อย (วางในแชท LINE/Messenger ได้ทันที)' });
        } else {
          // Fallback: Download image
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `MyMonth-Bill-${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(url);
          resolve({ mode: 'download', message: '📥 ดาวน์โหลดรูปภาพบิลเรียบร้อยแล้ว' });
        }
      } catch (err) {
        console.warn('Clipboard write error, falling back to download:', err);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MyMonth-Bill-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        resolve({ mode: 'download', message: '📥 บันทึกรูปภาพบิลเรียบร้อยแล้ว' });
      }
    }, 'image/png');
  });
}

/**
 * Download an HTML element as PDF
 */
export async function downloadElementAsPdf(elementId, filename = 'MyMonth-Bill.pdf') {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('ไม่พบบิล');
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff'
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const imgWidth = 210 - 20; // 10mm margins
  const pageHeight = 297;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
  pdf.save(filename);
}

/**
 * Export data array to Excel (.xlsx) file
 */
export function exportToExcel(data, filename = 'MyMonth-Expenses.xlsx') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'รายการค่าใช้จ่าย');
  XLSX.writeFile(wb, filename);
}
