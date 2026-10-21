import { normalizeItemPolicies } from './core.mjs';

const DAY = 86400000;
const VALID_STATUSES = new Set(['available', 'quarantined', 'expired']);
const VALID_UNITS = new Set(['each', 'kg', 'g', 'l', 'ml', 'box']);

function fail(message) {
  throw new TypeError(message);
}

function date(value, field) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(`${field} must be a real Gregorian date`);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) fail(`${field} must be a real Gregorian date`);
  return value;
}

function positive(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) fail(`${field} must be a positive quantity`);
  return number;
}

function emptyBucket() {
  return { count: 0, lots: [] };
}

export function buildExpiryReview({ items, batches, asOfDate, source = 'synthetic' }) {
  date(asOfDate, 'asOfDate');
  if (!Array.isArray(items) || !Array.isArray(batches)) fail('items and batches must be arrays');
  const policies = normalizeItemPolicies(items);
  const report = {
    asOfDate, source, synthetic: true, readOnly: true, complete: true, errors: [],
    excluded: emptyBucket(), needsClassification: emptyBucket(),
    missingOrInvalidExpiry: emptyBucket(),
    expired: emptyBucket(), today: emptyBucket(), days1to30: emptyBucket(),
    days31to60: emptyBucket(), days61to90: emptyBucket(), over90: emptyBucket(),
  };
  const seen = new Set();
  for (const batch of batches) {
    try {
      if (!batch?.batchId || !batch.itemId || !VALID_UNITS.has(batch.unit)) fail('batch identity or unit is invalid');
      if (!VALID_STATUSES.has(batch.status)) fail(`invalid status for ${batch.batchId}`);
      const rawQuantity = Number(batch.balanceQuantity);
      if (!Number.isFinite(rawQuantity) || rawQuantity < 0) fail(`balanceQuantity for ${batch.batchId} must be nonnegative`);
      if (rawQuantity === 0) continue;
      const quantity = positive(rawQuantity, `balanceQuantity for ${batch.batchId}`);
      if (seen.has(batch.batchId)) fail(`duplicate batchId: ${batch.batchId}`);
      seen.add(batch.batchId);
      const entry = {
        batchId: batch.batchId, itemId: batch.itemId, lotNumber: batch.lotNumber,
        status: batch.status, unit: batch.unit, quantity,
      };
      const policy = policies.get(batch.itemId) ?? 'review';
      if (policy === 'not_applicable') {
        report.excluded.count += 1; report.excluded.lots.push(entry); continue;
      }
      if (policy === 'review') {
        report.needsClassification.count += 1; report.needsClassification.lots.push(entry); continue;
      }
      if (!batch.expiryDate) {
        report.missingOrInvalidExpiry.count += 1; report.missingOrInvalidExpiry.lots.push(entry); continue;
      }
      try {
        date(batch.expiryDate, `expiryDate for ${batch.batchId}`);
      } catch (error) {
        report.complete = false;
        report.errors.push(error.message);
        report.missingOrInvalidExpiry.count += 1;
        report.missingOrInvalidExpiry.lots.push(entry);
        continue;
      }
      const days = Math.round((Date.parse(`${batch.expiryDate}T00:00:00Z`) - Date.parse(`${asOfDate}T00:00:00Z`)) / DAY);
      const bucket = days < 0 ? report.expired : days === 0 ? report.today :
        days <= 30 ? report.days1to30 : days <= 60 ? report.days31to60 :
          days <= 90 ? report.days61to90 : report.over90;
      bucket.count += 1; bucket.lots.push({ ...entry, expiryDate: batch.expiryDate, daysUntilExpiry: days });
    } catch (error) {
      report.complete = false;
      report.errors.push(error.message);
    }
  }
  return report;
}
