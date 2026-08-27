/**
 * PromptPay EMVCo QR Code Payload Generator
 * Conforms to EMVCo Merchant-Presented QR Specification & Bank of Thailand PromptPay standard
 */

function crc16(data) {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    let x = ((crc >> 8) ^ data.charCodeAt(i)) & 0xff;
    x ^= x >> 4;
    crc = ((crc << 8) ^ (x << 12) ^ (x << 5) ^ x) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatTag(id, value) {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

export function generatePromptPayPayload(target, amount = null) {
  // Clean target (Phone number or National ID / Tax ID)
  const cleaned = target.replace(/[^0-9]/g, '');
  let formattedTarget = '';
  let targetTag = '01'; // 01 for phone (mobile), 02 for national ID

  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    // Mobile phone: prefix with 0066 and drop leading 0
    formattedTarget = `0066${cleaned.substring(1)}`;
    targetTag = '01';
  } else if (cleaned.length === 13) {
    // National ID
    formattedTarget = cleaned;
    targetTag = '02';
  } else {
    // Fallback directly
    formattedTarget = cleaned.padStart(13, '0');
  }

  // Tag 29 - Merchant Account Info (PromptPay)
  // Subtag 00: AID A000000677010111
  // Subtag 01/02: Target
  const aid = formatTag('00', 'A000000677010111');
  const targetFormatted = formatTag(targetTag, formattedTarget);
  const tag29 = formatTag('29', aid + targetFormatted);

  // Tag 00: Format Indicator (01)
  const tag00 = formatTag('00', '01');
  // Tag 01: Point of Initiation (11: Static, 12: Dynamic with amount)
  const tag01 = formatTag('01', amount && parseFloat(amount) > 0 ? '12' : '11');
  // Tag 53: Transaction Currency (764 = THB)
  const tag53 = formatTag('53', '764');
  // Tag 58: Country Code (TH)
  const tag58 = formatTag('58', 'TH');

  let raw = tag00 + tag01 + tag29 + tag53;

  // Tag 54: Transaction Amount
  if (amount && parseFloat(amount) > 0) {
    const formattedAmount = parseFloat(amount).toFixed(2);
    raw += formatTag('54', formattedAmount);
  }

  raw += tag58;

  // Tag 63: CRC16 Checksum
  const rawWithCrcTag = raw + '6304';
  const checksum = crc16(rawWithCrcTag);

  return rawWithCrcTag + checksum;
}

export default { generatePromptPayPayload };
