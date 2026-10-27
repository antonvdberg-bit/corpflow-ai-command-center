import test from 'node:test';
import assert from 'node:assert/strict';
import { planInvoiceBatchIntent } from '../tools/zoho-batch-register-poc/invoice-allocation-intent.mjs';

const baseSnapshot = {
  organizationId: 'org-synthetic',
  asOfDate: '2026-10-27',
  verified: true,
  openingEvidence: true,
  reservationEvidence: true,
  batches: [
    { batchId: 'batch-fefo', itemId: 'item-a', lotNumber: 'LOT-F', unit: 'each', status: 'available', expiryDate: '2026-11-01', receivedDate: '2026-01-01', balanceQuantity: '1.250000', reservedQuantity: '0.250000', version: 4 },
    { batchId: 'batch-fifo', itemId: 'item-a', lotNumber: 'LOT-I', unit: 'each', status: 'available', expiryDate: '2027-01-01', receivedDate: '2026-02-01', balanceQuantity: '3.000000', reservedQuantity: '0', version: 7 },
  ],
};

function input(lines, overrides = {}) {
  const snapshot = structuredClone(baseSnapshot);
  snapshot.fingerprint = undefined;
  return {
    organizationId: 'org-synthetic',
    asOfDate: '2026-10-27',
    itemPolicies: [{ itemId: 'item-a', policy: 'required' }],
    snapshot,
    event: { eventId: 'event-1', type: 'invoice', status: 'sent', stockEffective: true, invoiceId: 'invoice-1', invoiceVersion: '1', lines },
    ...overrides,
  };
}

test('plans exact invoiced quantity with FEFO split and six-decimal fraction', () => {
  const result = planInvoiceBatchIntent(input([{ lineId: 'line-1', itemId: 'item-a', unit: 'each', quantity: '2.500000' }]));
  assert.equal(result.outcome, 'proposed');
  assert.deepEqual(result.intents.map(({ batchId, quantityExact }) => [batchId, quantityExact]), [
    ['batch-fefo', '1'],
    ['batch-fifo', '1.5'],
  ]);
});

test('plans multiple lines together and blocks later shortage without partial intents', () => {
  const result = planInvoiceBatchIntent(input([
    { lineId: 'line-1', itemId: 'item-a', unit: 'each', quantity: '2' },
    { lineId: 'line-2', itemId: 'item-a', unit: 'each', quantity: '3' },
  ]));
  assert.equal(result.outcome, 'blocked');
  assert.equal(result.reason, 'line_unsatisfied');
});

test('returns no-op for matching receipt and blocks reused identity conflicts', () => {
  const first = planInvoiceBatchIntent(input([{ lineId: 'line-1', itemId: 'item-a', unit: 'each', quantity: '1' }]));
  const noop = planInvoiceBatchIntent(input([{ lineId: 'line-1', itemId: 'item-a', unit: 'each', quantity: '1' }], {
    acceptedReceipts: [{ organizationId: 'org-synthetic', eventId: 'event-1', status: 'accepted', receiptId: 'receipt-1', payloadFingerprint: first.payloadFingerprint }],
  }));
  assert.equal(noop.outcome, 'no_op');
  const conflict = planInvoiceBatchIntent(input([{ lineId: 'line-1', itemId: 'item-a', unit: 'each', quantity: '2' }], {
    acceptedReceipts: [{ organizationId: 'org-synthetic', eventId: 'event-1', status: 'accepted', receiptId: 'receipt-1', payloadFingerprint: first.payloadFingerprint }],
  }));
  assert.equal(conflict.reason, 'event_identity_reused_with_changed_payload');
});

test('fails closed for lifecycle, organization, evidence, policy and unit boundaries', () => {
  assert.equal(planInvoiceBatchIntent(input([], { event: { ...input([]).event, status: 'draft' } })).reason, 'event_not_stock_effective');
  assert.equal(planInvoiceBatchIntent(input([], { event: { ...input([]).event, type: 'credit' } })).reason, 'physical_disposition_unverified');
  assert.equal(planInvoiceBatchIntent(input([{ lineId: 'line-1', itemId: 'item-a', unit: 'kg', quantity: '1' }])).reason, 'unit_conversion_or_unsupported_unit');
  assert.equal(planInvoiceBatchIntent(input([{ lineId: 'line-1', itemId: 'item-a', unit: 'each', quantity: '1' }], {
    snapshot: { ...baseSnapshot, organizationId: 'other-org' },
  })).reason, 'cross_organization_snapshot');
  assert.equal(planInvoiceBatchIntent(input([{ lineId: 'line-1', itemId: 'item-a', unit: 'each', quantity: '1' }], {
    itemPolicies: undefined,
  })).reason, 'missing_canonical_policy');
});

test('does not mutate deterministic input', () => {
  const request = input([{ lineId: 'line-1', itemId: 'item-a', unit: 'each', quantity: '0.125000' }]);
  const before = structuredClone(request);
  planInvoiceBatchIntent(request);
  assert.deepEqual(request, before);
});
