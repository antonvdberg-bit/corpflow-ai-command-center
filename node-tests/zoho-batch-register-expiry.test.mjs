import test from 'node:test';
import assert from 'node:assert/strict';
import { BatchLedger, normalizeItemPolicy, planAllocation } from '../tools/zoho-batch-register-poc/core.mjs';
import { buildExpiryReview } from '../tools/zoho-batch-register-poc/expiry-review.mjs';

const base = [
  { batchId: 'u1', itemId: 'exempt', lotNumber: 'U1', unit: 'each', status: 'available', balanceQuantity: 2, reservedQuantity: 0, receivedDate: '2026-01-02', expiryDate: undefined, version: 1 },
  { batchId: 'u2', itemId: 'exempt', lotNumber: 'U2', unit: 'each', status: 'available', balanceQuantity: 2, reservedQuantity: 0, receivedDate: '2026-01-01', expiryDate: '2020-01-01', version: 1 },
];

test('B/C: exempt undated and legacy-past lots allocate by receipt order', () => {
  const plan = planAllocation({
    itemId: 'exempt', quantity: 3, unit: 'each', asOfDate: '2026-10-18', batches: base,
    itemPolicyContext: { exempt: 'not_applicable' },
  });
  assert.deepEqual(plan.allocations.map(({ batchId, quantity }) => [batchId, quantity]), [['u2', 2], ['u1', 1]]);
  const report = buildExpiryReview({ items: [{ itemId: 'exempt', policy: 'not_applicable' }], batches: base, asOfDate: '2026-10-18' });
  assert.equal(report.excluded.count, 2);
  assert.equal(report.expired.count, 0);
});

test('D/E: review blocks allocation and required date exceptions are explicit', () => {
  assert.equal(normalizeItemPolicy(null), 'review');
  const review = planAllocation({
    itemId: 'unknown', quantity: 1, unit: 'each', asOfDate: '2026-10-18',
    batches: [{ ...base[0], itemId: 'unknown' }], itemPolicyContext: { unknown: '' },
  });
  assert.equal(review.ok, false);
  const report = buildExpiryReview({
    items: [{ itemId: 'review', policy: null }, { itemId: 'required', policy: 'required' }],
    batches: [
      { ...base[0], batchId: 'r', itemId: 'review' },
      { ...base[0], batchId: 'missing', itemId: 'required' },
      { ...base[0], batchId: 'invalid', itemId: 'required', expiryDate: '2026-02-30' },
    ],
    asOfDate: '2026-10-18',
  });
  assert.equal(report.needsClassification.count, 1);
  assert.equal(report.missingOrInvalidExpiry.count, 2);
  assert.equal(report.complete, false);
});

test('F/G: exemption cannot bypass quarantine, reservation, or stale policy checks', () => {
  const quarantined = { ...base[0], status: 'quarantined' };
  assert.equal(planAllocation({
    itemId: 'exempt', quantity: 1, unit: 'each', asOfDate: '2026-10-18',
    batches: [quarantined], itemPolicyContext: { exempt: 'not_applicable' },
  }).ok, false);
  const ledger = new BatchLedger(base, { exempt: 'not_applicable' });
  const plan = ledger.plan({ itemId: 'exempt', quantity: 1, unit: 'each', asOfDate: '2026-10-18' });
  ledger.setItemPolicy('exempt', 'required');
  assert.throws(() => ledger.commit(plan, { idempotencyKey: 'policy-stale' }), /policy changed/);
  assert.deepEqual(ledger.batches, base);
});

test('H/I/J: boundaries, validation, positive stock, status, and determinism', () => {
  const dates = [-1, 0, 1, 30, 31, 60, 61, 90, 91].map((days, index) => {
    const value = new Date(Date.parse('2026-10-18T00:00:00Z') + days * 86400000).toISOString().slice(0, 10);
    return { batchId: `b${index}`, itemId: 'required', lotNumber: `L${index}`, unit: 'each', status: 'available', balanceQuantity: 1, expiryDate: value };
  });
  const input = { items: [{ itemId: 'required', policy: 'required' }], batches: dates, asOfDate: '2026-10-18' };
  const first = buildExpiryReview(input);
  assert.equal(first.expired.count, 1);
  assert.equal(first.today.count, 1);
  assert.equal(first.days1to30.count, 2);
  assert.equal(first.days31to60.count, 2);
  assert.equal(first.days61to90.count, 2);
  assert.equal(first.over90.count, 1);
  assert.deepEqual(first, buildExpiryReview(input));
  assert.throws(() => buildExpiryReview({ ...input, asOfDate: '2026-02-29' }), /real Gregorian/);
  const quarantined = buildExpiryReview({
    items: [{ itemId: 'required', policy: 'required' }],
    batches: [{ ...dates[0], batchId: 'q', status: 'quarantined', balanceQuantity: 2 }],
    asOfDate: '2026-10-18',
  });
  assert.equal(quarantined.expired.lots[0].status, 'quarantined');
});

test('rejects malformed quantities and duplicate identities before zero filtering', () => {
  for (const balanceQuantity of [null, undefined, '', true, false, [], {}, -1, NaN, Infinity, '1.0000001', '9007199254.740992']) {
    const report = buildExpiryReview({
      items: [{ itemId: 'required', policy: 'required' }],
      batches: [{ ...base[0], itemId: 'required', batchId: `bad-${String(balanceQuantity)}`, balanceQuantity }],
      asOfDate: '2026-10-18',
    });
    assert.equal(report.complete, false, String(balanceQuantity));
    assert.ok(report.errors.length > 0, String(balanceQuantity));
  }
  const duplicate = buildExpiryReview({
    items: [{ itemId: 'required', policy: 'required' }],
    batches: [
      { ...base[0], itemId: 'required', batchId: 'zero', lotNumber: 'DUP', balanceQuantity: '0' },
      { ...base[0], itemId: 'required', batchId: 'positive', lotNumber: 'DUP', balanceQuantity: '1' },
    ],
    asOfDate: '2026-10-18',
  });
  assert.equal(duplicate.complete, false);
  assert.match(duplicate.errors.join('\n'), /duplicate item\/lot identity/);
});

test('reports an orphan batch item as an incomplete source', () => {
  const report = buildExpiryReview({
    items: [{ itemId: 'required', policy: 'required' }],
    batches: [{ ...base[0], itemId: 'missing-canonical-item', balanceQuantity: '1' }],
    asOfDate: '2026-10-18',
  });
  assert.equal(report.complete, false);
  assert.match(report.errors.join('\n'), /missing canonical item identity/);
});
