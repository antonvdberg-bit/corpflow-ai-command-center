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

test('fails closed for every malformed required source field on both attestations', () => {
  for (const field of ['snapshotId', 'version', 'fingerprint', 'observedAt']) {
    for (const value of [undefined, null, true, {}, '   ', 'x'.repeat(257)]) {
      const left = { ...evidence, [field]: value };
      const right = { ...evidence, [field]: value };
      const result = planExpiryReminderPlan({
        ...source, sourceEvidence: left, expectedSourceEvidence: right,
      });
      assert.equal(result.status, 'blocked');
      assert.equal(result.blockedReason, 'invalid_source');
      assert.deepEqual(result.sourceEvidence, {});
    }
  }
});

test('fails closed for malformed roots, scope, and identities without echoing input', () => {
  for (const input of [null, [], 'text', 42, true]) {
    const result = planExpiryReminderPlan(input);
    assert.deepEqual(result.scope, {});
    assert.equal(result.blockedReason, 'invalid_input');
  }
  for (const change of [
    { organizationId: {}, recipientSetId: 'ops' },
    { organizationId: 'org-1', recipientSetId: ' '.repeat(3) },
    { organizationId: 'x'.repeat(257), recipientSetId: 'ops' },
    { batches: [{ ...source.batches[0], batchId: {} }] },
    { items: [{ itemId: 'x'.repeat(257), policy: 'required' }] },
  ]) {
    const result = planExpiryReminderPlan({ ...source, ...change });
    assert.equal(result.status, 'blocked');
    assert.equal(result.blockedReason, 'invalid_input');
    assert.ok(result.scope.organizationId === null || typeof result.scope.organizationId === 'string');
    assert.ok(result.scope.recipientSetId === null || typeof result.scope.recipientSetId === 'string');
    assert.ok(!Object.values(result.scope).some((value) => value && typeof value === 'object'));
    assert.deepEqual(result.sourceEvidence, {});
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

test('returns the same ordered result for shuffled today, expired, and candidate lots', () => {
  const extra = [
    { ...source.batches[0], batchId: 'today', expiryDate: source.asOfDate },
    { ...source.batches[1], batchId: 'expired', expiryDate: '2026-10-17' },
  ];
  const left = { ...source, batches: [...source.batches, ...extra] };
  const right = { ...source, batches: [extra[1], ...source.batches.slice(3), extra[0], ...source.batches.slice(0, 3)] };
  const leftBefore = structuredClone(left);
  const rightBefore = structuredClone(right);
  assert.deepEqual(planExpiryReminderPlan(left), planExpiryReminderPlan(right));
  assert.deepEqual(left, leftBefore);
  assert.deepEqual(right, rightBefore);
});
