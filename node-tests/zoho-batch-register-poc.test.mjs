import test from 'node:test';
import assert from 'node:assert/strict';
import { BatchLedger, planAllocation } from '../tools/zoho-batch-register-poc/core.mjs';

const batches = [
  { batchId: 'a', itemId: 'serum', lotNumber: 'A', expiryDate: '2026-12-01', status: 'available', balanceQuantity: 6, reservedQuantity: 0, unit: 'each', version: 1, receivedDate: '2026-09-01' },
  { batchId: 'b', itemId: 'serum', lotNumber: 'B', expiryDate: '2027-03-01', status: 'available', balanceQuantity: 10, reservedQuantity: 0, unit: 'each', version: 1, receivedDate: '2026-10-01' },
  { batchId: 'reserved', itemId: 'serum', lotNumber: 'R', expiryDate: '2027-06-01', status: 'available', balanceQuantity: 5, reservedQuantity: 4, unit: 'each', version: 1, receivedDate: '2026-08-01' },
  { batchId: 'other', itemId: 'other', lotNumber: 'A', expiryDate: '2027-01-01', status: 'available', balanceQuantity: 99, reservedQuantity: 0, unit: 'each', version: 1, receivedDate: '2026-08-01' },
  { batchId: 'quarantine', itemId: 'serum', lotNumber: 'Q', expiryDate: '2027-01-01', status: 'quarantined', balanceQuantity: 99, reservedQuantity: 0, unit: 'each', version: 1, receivedDate: '2026-08-01' },
  { batchId: 'undated', itemId: 'serum', lotNumber: 'U', status: 'available', balanceQuantity: 99, reservedQuantity: 0, unit: 'each', version: 1, receivedDate: '2026-08-01' },
];

const request = (quantity = 8) => ({ itemId: 'serum', quantity, unit: 'each', asOfDate: '2026-10-18' });

test('plans FEFO split of 8 as A6 plus B2', () => {
  const plan = planAllocation({ ...request(), batches });
  assert.equal(plan.ok, true);
  assert.deepEqual(plan.allocations.map(({ lotNumber, quantity }) => [lotNumber, quantity]), [['A', 6], ['B', 2]]);
});

test('reservations reduce available quantity and excluded stock is ignored', () => {
  const plan = planAllocation({ ...request(3), batches });
  assert.equal(plan.allocations[0].lotNumber, 'A');
  assert.equal(planAllocation({ ...request(100), batches }).ok, false);
});

test('shortage does not mutate ledger', () => {
  const ledger = new BatchLedger(batches);
  assert.equal(ledger.plan(request(100)).ok, false);
  assert.deepEqual(ledger.batches, batches);
});

test('same lot can exist for another product, but duplicate product lot is rejected', () => {
  assert.doesNotThrow(() => new BatchLedger(batches));
  assert.throws(() => new BatchLedger([{ ...batches[0] }, { ...batches[0], batchId: 'duplicate' }]), /duplicate item and lot/);
});

test('validates dates, units, quantities, precision, and overflow', () => {
  assert.throws(() => planAllocation({ ...request(), asOfDate: '2026-02-29', batches }), /real Gregorian/);
  assert.throws(() => planAllocation({ ...request(), unit: 'pint', batches }), /unsupported/);
  assert.throws(() => planAllocation({ ...request(), quantity: 0, batches }), /positive/);
  assert.throws(() => planAllocation({ ...request(), quantity: '1.0000001', batches }), /at most/);
  assert.throws(() => planAllocation({ ...request(), quantity: '999999999999999999999', batches }), /too large/);
});

test('keeps six-place fractions exact during split', () => {
  const plan = planAllocation({
    itemId: 'serum', quantity: '0.300003', unit: 'each', asOfDate: '2026-10-18',
    batches: [{ ...batches[0], balanceQuantity: '0.100001' }, { ...batches[1], balanceQuantity: '0.200002' }],
  });
  assert.deepEqual(plan.allocations.map(({ quantity }) => quantity), [0.100001, 0.200002]);
});

test('uses received date then batch id for deterministic ties', () => {
  const tied = batches.slice(0, 2).map((batch, index) => ({ ...batch, batchId: index ? 'z' : 'a', expiryDate: '2027-01-01', receivedDate: '2026-01-01' }));
  assert.deepEqual(planAllocation({ ...request(1), batches: tied }).allocations.map(({ batchId }) => batchId), ['a']);
});

test('receives into a lot, rejects expiry conflict, and replays idempotently', () => {
  const ledger = new BatchLedger(batches);
  const receipt = { batchId: 'a', itemId: 'serum', lotNumber: 'A', expiryDate: '2026-12-01', unit: 'each', quantity: 2, idempotencyKey: 'r1' };
  assert.equal(ledger.receive(receipt).batch.balanceQuantity, 8);
  assert.equal(ledger.receive(receipt).batch.balanceQuantity, 8);
  assert.throws(() => ledger.receive({ ...receipt, expiryDate: '2027-01-01' }), /different payload/);
});

test('stale second plan is rejected and successful commit is idempotent', () => {
  const ledger = new BatchLedger(batches);
  const first = ledger.plan(request(6));
  const second = ledger.plan(request(6));
  const committed = ledger.commit(first, { idempotencyKey: 'a1' });
  assert.equal(ledger.commit(first, { idempotencyKey: 'a1' }).allocationId, committed.allocationId);
  assert.throws(() => ledger.commit(second, { idempotencyKey: 'a2' }), /stale/);
});

test('malformed split is atomic and reversal restores exact original lots once', () => {
  const ledger = new BatchLedger(batches);
  const plan = ledger.plan(request(8));
  const malformed = { ...plan, allocations: plan.allocations.map((line, index) => index ? { ...line, quantity: 999 } : line) };
  const before = ledger.batches;
  assert.throws(() => ledger.commit(malformed, { idempotencyKey: 'bad' }), /exceeds available/);
  assert.deepEqual(ledger.batches, before);
  const committed = ledger.commit(plan, { idempotencyKey: 'good' });
  ledger.reverse(committed.allocationId);
  assert.deepEqual(
    ledger.batches.map(({ batchId, balanceQuantity, reservedQuantity }) => ({ batchId, balanceQuantity, reservedQuantity })),
    before.map(({ batchId, balanceQuantity, reservedQuantity }) => ({ batchId, balanceQuantity, reservedQuantity })),
  );
  assert.throws(() => ledger.reverse(committed.allocationId), /already reversed/);
});
