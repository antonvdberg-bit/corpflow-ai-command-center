import test from 'node:test';
import assert from 'node:assert/strict';
import { planExpiryReminderPlan } from '../tools/zoho-batch-register-poc/expiry-reminder-plan.mjs';

const evidence = {
  snapshotId: 'snap-1', version: 'v1', fingerprint: 'fp-1',
  observedAt: '2026-10-18T10:00:00.000Z', complete: true,
};
const source = {
  organizationId: 'org-1', asOfDate: '2026-10-18', recipientSetId: 'ops',
  items: [{ itemId: 'food', policy: 'required' }],
  batches: [90, 60, 30, 20, 91].map((days, index) => ({
    batchId: `b${index}`, itemId: 'food', lotNumber: `lot-${index}`,
    unit: 'each', status: 'available', balanceQuantity: 1,
    expiryDate: new Date(Date.parse('2026-10-18T00:00:00Z') + days * 86400000)
      .toISOString().slice(0, 10),
  })),
  sourceEvidence: evidence, expectedSourceEvidence: evidence,
  receiptHistory: { complete: true, receipts: [] },
};

test('selects exact 90/60/30 bands and does not catch up older thresholds', () => {
  const result = planExpiryReminderPlan(source);
  assert.equal(result.status, 'proposed');
  assert.deepEqual(result.intents.map((item) => item.thresholdDays).sort((a, b) => b - a), [90, 60, 30, 30]);
  assert.equal(result.intents.some((item) => item.batchId === 'b4'), false);
  assert.equal(result.synthetic, true);
  assert.equal(result.readOnly, true);
  assert.equal(result.operational, false);
  assert.equal(result.sendPath, false);
});

test('suppresses an exactly matching sent receipt and keeps the input immutable', () => {
  const first = planExpiryReminderPlan(source);
  const receiptCandidate = first.intents[0];
  const input = structuredClone(source);
  input.receiptHistory = {
    complete: true,
    receipts: [{
      status: 'sent',
      receiptId: 'receipt-1',
      sentAt: '2026-10-18T11:00:00.000Z',
      warningId: receiptCandidate.warningId,
      warningIdentity: {
        organizationId: receiptCandidate.organizationId, itemId: receiptCandidate.itemId,
        batchId: receiptCandidate.batchId, expiryDate: receiptCandidate.expiryDate,
        thresholdDays: receiptCandidate.thresholdDays, recipientSetId: receiptCandidate.recipientSetId,
      },
    }],
  };
  const before = structuredClone(input);
  const result = planExpiryReminderPlan(input);
  assert.equal(result.suppressed.length, 1);
  assert.equal(result.intents.length, 3);
  assert.deepEqual(input, before);
});

test('blocks incomplete, mismatched, uncertain, and tampered evidence', () => {
  for (const change of [
    { receiptHistory: { complete: false, receipts: [] } },
    { expectedSourceEvidence: { ...evidence, fingerprint: 'other' } },
    { sourceEvidence: { ...evidence, complete: false } },
    { receiptHistory: { complete: true, receipts: [{ status: 'pending' }] } },
  ]) {
    const result = planExpiryReminderPlan({ ...source, ...change });
    assert.equal(result.status, 'blocked');
    assert.equal(result.intents.length, 0);
    assert.match(result.blockedReason, /^[a-z_]+$/);
  }
});

test('blocks malformed dates and unknown classification, while quarantine remains a warning status', () => {
  const malformed = planExpiryReminderPlan({
    ...source,
    batches: [{ ...source.batches[0], expiryDate: '2026-02-29' }],
  });
  assert.equal(malformed.status, 'blocked');
  const unknown = planExpiryReminderPlan({
    ...source,
    items: [{ itemId: 'food', policy: 'unknown' }],
  });
  assert.equal(unknown.status, 'blocked');
  const quarantined = planExpiryReminderPlan({
    ...source,
    batches: [{ ...source.batches[0], status: 'quarantined' }],
  });
  assert.equal(quarantined.intents[0].status, 'quarantined');
  assert.equal(quarantined.intents[0].allocationPermitted, false);
});
