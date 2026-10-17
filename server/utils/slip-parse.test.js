// Tests for slip parsing helpers
// รัน: node --experimental-default-type=module --test server/utils/slip-parse.test.js
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseAmount,
  parseSlipDate,
  sanitizeTransRef,
  normalizeBank,
  normalizeSlip,
  validateSlip,
  toBangkokIso,
} from './slip-parse.js';

test('parseAmount — รูปแบบที่พบบนสลิป', () => {
  assert.equal(parseAmount('1,234.00'), 1234);
  assert.equal(parseAmount('350'), 350);
  assert.equal(parseAmount('350.00 บาท'), 350);
  assert.equal(parseAmount('฿ 1,200'), 1200);
  assert.equal(parseAmount('๑,๒๓๔.๕๐'), 1234.5);
  assert.equal(parseAmount(890.5), 890.5);
  assert.equal(parseAmount('1,234.567'), 1234.57);
});

test('parseAmount — ค่าที่อ่านไม่ได้ต้องคืน null', () => {
  assert.equal(parseAmount(''), null);
  assert.equal(parseAmount(null), null);
  assert.equal(parseAmount('abc'), null);
  assert.equal(parseAmount('-250'), null);
  assert.equal(parseAmount('0'), null);
});

test('parseSlipDate — วันที่แบบไทย/ค.ศ./ISO', () => {
  assert.deepEqual(parseSlipDate('12 ต.ค. 69', '14:30'), { date: '2026-10-12', time: '14:30' });
  assert.deepEqual(parseSlipDate('12 ต.ค. 2569', '09:05'), { date: '2026-10-12', time: '09:05' });
  assert.deepEqual(parseSlipDate('12/10/2569'), { date: '2026-10-12', time: null });
  assert.deepEqual(parseSlipDate('12-10-2026'), { date: '2026-10-12', time: null });
  assert.deepEqual(parseSlipDate('2026-10-12 14:30'), { date: '2026-10-12', time: '14:30' });
});

test('parseSlipDate — วันที่ไม่ถูกต้องต้องคืน null', () => {
  assert.equal(parseSlipDate('31/02/2569'), null);
  assert.equal(parseSlipDate('ไม่มีวันที่'), null);
  assert.equal(parseSlipDate(''), null);
});

test('sanitizeTransRef', () => {
  assert.equal(sanitizeTransRef('016163 0000-1234'), '01616300001234');
  assert.equal(sanitizeTransRef('abc1234'), 'ABC1234');
  assert.equal(sanitizeTransRef('abc'), null);
  assert.equal(sanitizeTransRef(''), null);
});

test('normalizeBank', () => {
  assert.equal(normalizeBank('ธนาคารกสิกรไทย'), 'KBANK');
  assert.equal(normalizeBank('SCB'), 'SCB');
  assert.equal(normalizeBank('พร้อมเพย์'), 'PROMPTPAY');
  assert.equal(normalizeBank('ธนาคารกรุงไทย'), 'KTB');
  assert.equal(normalizeBank('ซิตี้แบงก์'), 'ซิตี้แบงก์');
  assert.equal(normalizeBank(''), null);
});

test('normalizeSlip — แปลงข้อมูลดิบครบถ้วน', () => {
  const slip = normalizeSlip({
    is_slip: true,
    amount: '1,250.00',
    trans_ref: '016163000012345678',
    date: '3 ต.ค. 69',
    time: '18:42',
    sender_name: 'นาย ป๊อบ',
    sender_bank: 'กสิกรไทย',
    receiver_name: 'นางสาว ดิว',
    receiver_bank: 'ไทยพาณิชย์',
    confidence: 92,
  });

  assert.equal(slip.amount, 1250);
  assert.equal(slip.date, '2026-10-03');
  assert.equal(slip.time, '18:42');
  assert.equal(slip.transRef, '016163000012345678');
  assert.equal(slip.senderBank, 'KBANK');
  assert.equal(slip.receiverBank, 'SCB');
  assert.equal(slip.confidence, 0.92);
});

test('validateSlip — สลิปครบถ้วน = parsed', () => {
  const result = validateSlip(normalizeSlip({
    is_slip: true,
    amount: '350.00',
    trans_ref: '016163000012345678',
    date: '12/10/2569',
    time: '10:00',
    confidence: 0.95,
  }));

  assert.equal(result.status, 'parsed');
  assert.equal(result.needsReview, false);
  assert.deepEqual(result.reasons, []);
});

test('validateSlip — ไม่มียอดเงิน = failed', () => {
  const result = validateSlip(normalizeSlip({ is_slip: true, trans_ref: '016163000012345678' }));
  assert.equal(result.status, 'failed');
  assert.ok(result.reasons.includes('อ่านยอดเงินไม่ได้'));
});

test('validateSlip — ไม่ใช่สลิป = failed', () => {
  const result = validateSlip(normalizeSlip({ is_slip: false, amount: '100' }));
  assert.equal(result.status, 'failed');
  assert.ok(result.reasons.includes('ไม่ใช่สลิปโอนเงิน'));
});

test('validateSlip — confidence ต่ำ = parsed แต่ต้องตรวจสอบ', () => {
  const result = validateSlip(normalizeSlip({
    is_slip: true,
    amount: '120',
    trans_ref: '016163000012345678',
    date: '12/10/2569',
    confidence: 0.4,
  }));

  assert.equal(result.status, 'parsed');
  assert.equal(result.needsReview, true);
});

test('validateSlip — ยอดเกิน 1 ล้าน = failed', () => {
  const result = validateSlip(normalizeSlip({ is_slip: true, amount: '5,000,000', trans_ref: '016163000012345678' }));
  assert.equal(result.status, 'failed');
  assert.ok(result.reasons.includes('ยอดเงินสูงผิดปกติ'));
});

test('toBangkokIso', () => {
  assert.equal(toBangkokIso('2026-10-12', '14:30'), '2026-10-12T14:30:00+07:00');
  assert.match(toBangkokIso(null, null), /T00:00:00\+07:00$/);
});
