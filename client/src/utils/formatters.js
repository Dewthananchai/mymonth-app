/**
 * Formatting utilities for Thai Currency, Dates, and Percentages
 */

export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '0.00 ฿';
  return `${Number(amount).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} ฿`;
}

export function formatNumber(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '0';
  return Number(amount).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatThaiDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  
  const day = date.getDate();
  const month = thaiMonths[date.getMonth()];
  const thaiYear = (date.getFullYear() + 543).toString().substring(2);

  return `${day} ${month} ${thaiYear}`;
}

export function formatThaiDateFull(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const thaiMonthsFull = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  
  const day = date.getDate();
  const month = thaiMonthsFull[date.getMonth()];
  const thaiYear = date.getFullYear() + 543;

  return `${day} ${month} ${thaiYear}`;
}

export function formatThaiMonthYear(monthYearStr) {
  if (!monthYearStr) return '';
  const [year, month] = monthYearStr.split('-');
  const thaiMonthsFull = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const mIndex = parseInt(month, 10) - 1;
  const thaiYear = parseInt(year, 10) + 543;
  return `${thaiMonthsFull[mIndex]} ${thaiYear}`;
}

export function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = (d.getFullYear() + 543).toString().substring(2);
  return `${day}/${month}/${year}`;
}
