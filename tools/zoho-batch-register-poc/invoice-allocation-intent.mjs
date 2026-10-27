import { planAllocation } from './core.mjs';

const SCALE = 1000000n;
const UNITS = new Set(['each', 'kg', 'g', 'l', 'ml', 'box']);
const EVENT_TYPES = new Set(['invoice']);
const BLOCKED_TYPES = new Set(['void', 'cancel', 'credit', 'return', 'revision']);

function blocked(reason, detail) {
  return { outcome: 'blocked', reason, ...(detail ? { detail } : {}) };
}

function clone(value) {
  return structuredClone(value);
}

function required(value, name) {
  if (value === undefined || value === null || value === '') throw new TypeError(`${name} is required`);
  return value;
}

function date(value, name) {
  required(value, name);
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError(`${name} must be YYYY-MM-DD`);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) throw new TypeError(`${name} is invalid`);
  return value;
}

function scaled(value, name) {
  required(value, name);
  const text = String(value);
  if (!/^(?:\d+|\d+\.\d{1,6})$/.test(text)) throw new TypeError(`${name} must be a nonnegative quantity with at most six decimals`);
  const [whole, fraction = ''] = text.split('.');
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, '0'));
}

function quantity(value) {
  const whole = value / SCALE;
  const fraction = String(value % SCALE).padStart(6, '0').replace(/0+$/, '');
  return { exact: fraction ? `${whole}.${fraction}` : String(whole), number: Number(whole) + Number(value % SCALE) / 1e6 };
}

function digest(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(digest).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${digest(value[key])}`).join(',')}}`;
}

function identity(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} must be a stable ID`);
  return value;
}

function asError(error) {
  return error instanceof Error ? error.message : String(error);
}

function validateReceipt(receipt, organizationId, eventId) {
  if (!receipt || typeof receipt !== 'object') throw new TypeError('receipt must be an object');
  if (receipt.organizationId !== organizationId) throw new TypeError('receipt organization mismatch');
  if (receipt.eventId !== eventId) return;
  if (receipt.status !== 'accepted') throw new TypeError('prior receipt is not accepted');
  if (receipt.payloadFingerprint === undefined) throw new TypeError('accepted receipt is missing payload fingerprint');
}

function snapshotFingerprint(snapshot) {
  return digest({
    batches: snapshot.batches,
    organizationId: snapshot.organizationId,
    asOfDate: snapshot.asOfDate,
    openingEvidence: snapshot.openingEvidence,
    reservationEvidence: snapshot.reservationEvidence,
  });
}

export function planInvoiceBatchIntent(input = {}) {
  const original = clone(input);
  try {
    const organizationId = identity(input.organizationId, 'organizationId');
    const event = required(input.event, 'event');
    const eventId = identity(event.eventId, 'event.eventId');
    const invoiceId = identity(event.invoiceId, 'event.invoiceId');
    const invoiceVersion = identity(String(event.invoiceVersion ?? ''), 'event.invoiceVersion');
    const asOfDate = date(input.asOfDate ?? event.asOfDate, 'asOfDate');
    const snapshot = required(input.snapshot, 'snapshot');
    if (snapshot.organizationId !== organizationId) return blocked('cross_organization_snapshot');
    if (snapshot.verified !== true || snapshot.openingEvidence !== true || snapshot.reservationEvidence !== true) {
      return blocked('unverified_snapshot_evidence');
    }
    if (!Array.isArray(snapshot.batches)) return blocked('missing_snapshot_batches');
    if (snapshot.asOfDate !== asOfDate) return blocked('inconsistent_snapshot');
    if (snapshot.fingerprint !== undefined && snapshot.fingerprint !== snapshotFingerprint(snapshot)) return blocked('stale_snapshot_fingerprint');
    if (!EVENT_TYPES.has(event.type) && !BLOCKED_TYPES.has(event.type)) return blocked('unsupported_event_type');
    if (BLOCKED_TYPES.has(event.type)) return blocked(event.type === 'revision' ? 'accepted_revision_requires_reconciliation' : 'physical_disposition_unverified');
    if (event.status === 'draft' || event.status === 'unsent' || event.stockEffective !== true) return { outcome: 'blocked', reason: 'event_not_stock_effective', intents: [] };
    if (!Array.isArray(event.lines) || event.lines.length === 0) return blocked('missing_invoice_lines');

    const payloadFingerprint = digest({
      organizationId, eventId, invoiceId, invoiceVersion, eventType: event.type,
      lines: event.lines,
      snapshotFingerprint: snapshot.fingerprint ?? snapshotFingerprint(snapshot),
    });
    const receipts = input.acceptedReceipts ?? [];
    if (!Array.isArray(receipts)) return blocked('invalid_receipts');
    const matching = receipts.filter((receipt) => receipt?.organizationId === organizationId && receipt?.eventId === eventId);
    for (const receipt of receipts) validateReceipt(receipt, organizationId, eventId);
    if (matching.length > 1) return blocked('ambiguous_prior_receipts');
    if (matching.length === 1) {
      return matching[0].payloadFingerprint === payloadFingerprint
        ? { outcome: 'no_op', eventId, invoiceId, invoiceVersion, receiptId: matching[0].receiptId }
        : blocked('event_identity_reused_with_changed_payload');
    }

    const seenLines = new Set();
    const seenItems = new Set();
    const batches = clone(snapshot.batches);
    const intents = [];
    for (const line of event.lines) {
      const lineId = identity(line?.lineId, 'invoice lineId');
      if (seenLines.has(lineId)) return blocked('duplicate_line_identity');
      seenLines.add(lineId);
      const itemId = identity(line?.itemId, `line ${lineId}.itemId`);
      const unit = required(line?.unit, `line ${lineId}.unit`);
      if (!UNITS.has(unit)) return blocked('unit_conversion_or_unsupported_unit');
      if (batches.some((batch) => batch.itemId === itemId && batch.unit !== unit)) {
        return blocked('unit_conversion_or_unsupported_unit');
      }
      const requested = scaled(line?.quantity, `line ${lineId}.quantity`);
      if (requested <= 0n) return blocked('invoice_quantity_must_be_positive');
      if (seenItems.has(`${itemId}\u0000${unit}`) === false) seenItems.add(`${itemId}\u0000${unit}`);
      const policies = input.itemPolicies ?? input.itemPolicyContext;
      if (!policies) return blocked('missing_canonical_policy');
      const plan = planAllocation({ itemId, quantity: quantity(requested).exact, unit, asOfDate, batches, itemPolicies: policies });
      if (!plan.ok) return blocked('line_unsatisfied', plan.message);
      const lineSlices = plan.allocations.map((allocation) => {
        const amount = scaled(allocation.quantity, 'allocation.quantity');
        const displayed = quantity(amount);
        const batch = batches.find((candidate) => candidate.batchId === allocation.batchId);
        batch.balanceQuantity = quantity(scaled(batch.balanceQuantity, 'balanceQuantity') - amount).exact;
        return {
          organizationId, invoiceId, invoiceVersion, lineId, itemId, batchId: allocation.batchId,
          lotNumber: allocation.lotNumber, unit, quantity: displayed.number, quantityExact: displayed.exact,
          expectedVersion: allocation.version, inputSnapshotFingerprint: plan.sourceFingerprint,
        };
      });
      intents.push(...lineSlices);
    }
    return clone({
      outcome: 'proposed', synthetic: true, connected: false, readOnly: true,
      organizationId, eventId, invoiceId, invoiceVersion,
      payloadFingerprint, snapshotFingerprint: snapshot.fingerprint ?? snapshotFingerprint(snapshot),
      intents, expectedVersions: Object.fromEntries(intents.map((intent) => [intent.batchId, intent.expectedVersion])),
      atomicCommit: false,
    });
  } catch (error) {
    return blocked('invalid_input', asError(error));
  } finally {
    if (digest(input) !== digest(original)) throw new TypeError('invoice intent input was mutated');
  }
}
