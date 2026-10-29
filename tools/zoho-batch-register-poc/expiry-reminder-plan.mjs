import { createHash } from 'node:crypto';
import { buildExpiryReview } from './expiry-review.mjs';

const DAY = 86400000;
const MAX_ITEMS = 1000;
const MAX_BATCHES = 5000;
const MAX_RECEIPTS = 5000;
const MAX_TEXT = 256;
const REASONS = Object.freeze({
  invalid_input: 'invalid_input',
  invalid_source: 'invalid_source',
  incomplete_source: 'incomplete_source',
  invalid_receipts: 'invalid_receipts',
  incomplete_receipts: 'incomplete_receipts',
  invalid_review: 'invalid_review',
});

function bounded(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_TEXT;
}

function realDate(value, field) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(field);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) throw new Error(field);
  return value;
}

function realUtcTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === (
    value.includes('.') ? value : value.replace('Z', '.000Z')
  );
}

function stable(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
}

function identityParts({ organizationId, itemId, batchId, expiryDate, thresholdDays, recipientSetId }) {
  return [organizationId, itemId, batchId, expiryDate, thresholdDays, recipientSetId];
}

function warningIdentity(fields) {
  const parts = identityParts(fields);
  return {
    organizationId: parts[0],
    itemId: parts[1],
    batchId: parts[2],
    expiryDate: parts[3],
    thresholdDays: parts[4],
    recipientSetId: parts[5],
    warningId: createHash('sha256').update(stable(parts)).digest('hex'),
  };
}

function base(status, scope, sourceEvidence, coverage) {
  return {
    status,
    outcome: status,
    intents: [],
    orderedIntents: [],
    suppressed: [],
    review: [],
    synthetic: true,
    readOnly: true,
    operational: false,
    sendPath: false,
    scope,
    sourceEvidence,
    coverage,
  };
}

function blocked(reason, scope = {}, sourceEvidence = {}) {
  return {
    ...base('blocked', scope, sourceEvidence, { complete: false }),
    reason,
    blockedReason: reason,
  };
}

function sourceAttestation(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (!bounded(value.snapshotId) || !bounded(String(value.version)) ||
      !bounded(value.fingerprint) || !realUtcTimestamp(value.observedAt) || value.complete !== true) return null;
  return {
    snapshotId: value.snapshotId,
    version: value.version,
    fingerprint: value.fingerprint,
    observedAt: value.observedAt,
    complete: true,
  };
}

function sameAttestation(left, right) {
  return stable(left) === stable(right);
}

function validateReceipts(history, scope) {
  if (!history || typeof history !== 'object' || history.complete !== true || !Array.isArray(history.receipts)) {
    return { reason: REASONS.incomplete_receipts };
  }
  if (history.receipts.length > MAX_RECEIPTS) return { reason: REASONS.invalid_receipts };
  const seen = new Set();
  const seenReceiptIds = new Set();
  for (const receipt of history.receipts) {
    if (!receipt || typeof receipt !== 'object' || receipt.status !== 'sent' ||
        !bounded(receipt.receiptId) || !realUtcTimestamp(receipt.sentAt)) {
      return { reason: REASONS.invalid_receipts };
    }
    if (seenReceiptIds.has(receipt.receiptId) ||
        (receipt.organizationId !== undefined && receipt.organizationId !== scope.organizationId) ||
        (receipt.recipientSetId !== undefined && receipt.recipientSetId !== scope.recipientSetId)) {
      return { reason: REASONS.invalid_receipts };
    }
    seenReceiptIds.add(receipt.receiptId);
    const identity = receipt.warningIdentity;
    if (!identity || typeof identity !== 'object' || Array.isArray(identity) ||
        identity.organizationId !== scope.organizationId ||
        identity.recipientSetId !== scope.recipientSetId ||
        !bounded(identity.itemId) || !bounded(identity.batchId) ||
        typeof identity.expiryDate !== 'string' ||
        ![30, 60, 90].includes(identity.thresholdDays)) {
      return { reason: REASONS.invalid_receipts };
    }
    let expected;
    try {
      realDate(identity.expiryDate, 'receipt expiryDate');
      expected = warningIdentity(identity);
    } catch {
      return { reason: REASONS.invalid_receipts };
    }
    if (receipt.warningId !== expected.warningId ||
        stable(identity) !== stable(Object.fromEntries(Object.entries(expected).filter(([key]) => key !== 'warningId')))) {
      return { reason: REASONS.invalid_receipts };
    }
    if (seen.has(receipt.warningId)) return { reason: REASONS.invalid_receipts };
    seen.add(receipt.warningId);
  }
  return { sent: new Set(history.receipts.map((receipt) => receipt.warningId)) };
}

function candidateFor(lot, thresholdDays, scope) {
  const identity = warningIdentity({
    organizationId: scope.organizationId,
    itemId: lot.itemId,
    batchId: lot.batchId,
    expiryDate: lot.expiryDate,
    thresholdDays,
    recipientSetId: scope.recipientSetId,
  });
  return {
    ...identity,
    lotNumber: lot.lotNumber,
    status: lot.status,
    quantity: lot.quantity,
    unit: lot.unit,
    allocationPermitted: false,
    disposalPermitted: false,
  };
}

export function planExpiryReminderPlan(input = {}) {
  const scope = {
    organizationId: input.organizationId,
    asOfDate: input.asOfDate,
    recipientSetId: input.recipientSetId,
  };
  if (!bounded(scope.organizationId) || !bounded(scope.recipientSetId)) return blocked(REASONS.invalid_input, scope);
  try {
    realDate(scope.asOfDate, 'asOfDate');
  } catch {
    return blocked(REASONS.invalid_input, scope);
  }
  if (!Array.isArray(input.items) || !Array.isArray(input.batches) ||
      input.items.length > MAX_ITEMS || input.batches.length > MAX_BATCHES) {
    return blocked(REASONS.invalid_input, scope);
  }
  const source = sourceAttestation(input.sourceEvidence);
  const expected = sourceAttestation(input.expectedSourceEvidence);
  if (!source || !expected) return blocked(REASONS.invalid_source, scope);
  if (!sameAttestation(source, expected)) return blocked(REASONS.invalid_source, scope, source);
  const receipts = validateReceipts(input.receiptHistory, scope);
  if (receipts.reason) return blocked(receipts.reason, scope, source);

  let report;
  try {
    report = buildExpiryReview({ items: input.items, batches: input.batches, asOfDate: scope.asOfDate });
  } catch {
    return blocked(REASONS.invalid_review, scope, source);
  }
  const coverage = {
    complete: report.complete && report.needsClassification.count === 0 &&
      report.missingOrInvalidExpiry.count === 0,
    reviewed: report.today.count + report.expired.count,
    excluded: report.excluded.count,
  };
  if (!coverage.complete) return blocked(REASONS.invalid_review, scope, source);

  const result = base('no_op', scope, source, coverage);
  const candidates = [];
  for (const [bucket, thresholdDays] of [
    ['days61to90', 90], ['days31to60', 60], ['days1to30', 30],
  ]) {
    for (const lot of report[bucket].lots) candidates.push(candidateFor(lot, thresholdDays, scope));
  }
  for (const lot of report.today.lots) result.review.push({ code: 'today', batchId: lot.batchId, status: lot.status });
  for (const lot of report.expired.lots) result.review.push({ code: 'expired', batchId: lot.batchId, status: lot.status });
  candidates.sort((a, b) => a.warningId.localeCompare(b.warningId));
  for (const candidate of candidates) {
    if (receipts.sent.has(candidate.warningId)) result.suppressed.push(candidate);
    else result.intents.push(candidate);
  }
  result.status = result.intents.length ? 'proposed' : 'no_op';
  result.outcome = result.status;
  result.orderedIntents = result.intents;
  return result;
}

export const planExpiryReminder = planExpiryReminderPlan;
export const BLOCKED_REASON_CODES = REASONS;
