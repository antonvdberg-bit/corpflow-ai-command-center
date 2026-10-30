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

function validateReceipt(receipt, organizationId) {
  if (!receipt || typeof receipt !== 'object') throw new TypeError('receipt must be an object');
  if (receipt.organizationId !== organizationId) throw new TypeError('receipt organization mismatch');
  identity(receipt.receiptId, 'receipt.receiptId');
  identity(receipt.eventId, 'receipt.eventId');
  identity(receipt.invoiceId, 'receipt.invoiceId');
  identity(String(receipt.invoiceVersion ?? ''), 'receipt.invoiceVersion');
  if (receipt.status !== 'accepted') throw new TypeError('prior receipt is not accepted');
  if (typeof receipt.payloadFingerprint !== 'string' || !receipt.payloadFingerprint) {
    throw new TypeError('accepted receipt is missing payload fingerprint');
  }
  if (receipt.evidenceVerified !== true || !Array.isArray(receipt.allocations) || receipt.allocations.length === 0) {
    throw new TypeError('accepted receipt is missing allocation evidence');
  }
  if (typeof receipt.snapshotFingerprint !== 'string' || !receipt.snapshotFingerprint) {
    throw new TypeError('accepted receipt is missing snapshot evidence');
  }
}

function validateSnapshotAttestations(input, snapshot, computedFingerprint) {
  const fingerprintAttestations = [
    ['expectedSnapshotFingerprint', input.expectedSnapshotFingerprint],
    ['snapshot.expectedFingerprint', snapshot.expectedFingerprint],
    ['snapshot.fingerprint', snapshot.fingerprint],
  ].filter(([, value]) => value !== undefined && value !== null);
  if (fingerprintAttestations.length === 0) return blocked('missing_snapshot_fingerprint');
  if (fingerprintAttestations.some(([, value]) => typeof value !== 'string' || !value)) {
    return blocked('invalid_snapshot_fingerprint');
  }
  if (fingerprintAttestations.some(([, value]) => value !== computedFingerprint)) {
    return blocked(fingerprintAttestations.length === 1 ? 'stale_snapshot_fingerprint' : 'contradictory_snapshot_fingerprint');
  }

  const versionAttestations = [
    ['expectedSnapshotVersion', input.expectedSnapshotVersion],
    ['snapshot.expectedVersion', snapshot.expectedVersion],
    ['snapshot.version', snapshot.version],
  ].filter(([, value]) => value !== undefined && value !== null);
  if (versionAttestations.length === 0) return blocked('missing_snapshot_version');
  if (versionAttestations.some(([, value]) => !Number.isInteger(value) || value < 1)) {
    return blocked('invalid_snapshot_version');
  }
  const authoritativeVersion = versionAttestations[versionAttestations.length - 1][1];
  if (versionAttestations.some(([, value]) => value !== authoritativeVersion)) {
    return blocked('contradictory_snapshot_version');
  }
  return { fingerprint: computedFingerprint, version: authoritativeVersion };
}

function validateReceiptAllocations(receipt, expectedIntents, snapshotFingerprint) {
  const allocations = receipt.allocations;
  if (!Array.isArray(allocations) || allocations.length !== expectedIntents.length) {
    throw new TypeError('accepted receipt has incomplete allocation evidence');
  }
  const expected = new Map(expectedIntents.map((intent) => [
    `${intent.lineId}\u0000${intent.batchId}`,
    intent,
  ]));
  const seen = new Set();
  for (const allocation of allocations) {
    if (!allocation || typeof allocation !== 'object' || Array.isArray(allocation)) {
      throw new TypeError('accepted receipt has malformed allocation evidence');
    }
    for (const name of ['organizationId', 'invoiceId', 'invoiceVersion', 'lineId', 'itemId', 'batchId', 'unit', 'inputSnapshotFingerprint']) {
      identity(allocation[name], `accepted allocation.${name}`);
    }
    if (allocation.organizationId !== receipt.organizationId ||
      allocation.invoiceId !== receipt.invoiceId ||
      String(allocation.invoiceVersion) !== String(receipt.invoiceVersion) ||
      allocation.inputSnapshotFingerprint !== snapshotFingerprint) {
      throw new TypeError('accepted receipt allocation identity mismatch');
    }
    const key = `${allocation.lineId}\u0000${allocation.batchId}`;
    const expectedIntent = expected.get(key);
    if (!expectedIntent || seen.has(key)) throw new TypeError('accepted receipt allocation set mismatch');
    seen.add(key);
    const exact = scaled(allocation.quantityExact, 'accepted allocation.quantityExact');
    if (exact <= 0n || allocation.quantity !== quantity(exact).number ||
      allocation.quantityExact !== expectedIntent.quantityExact ||
      allocation.itemId !== expectedIntent.itemId ||
      allocation.unit !== expectedIntent.unit ||
      allocation.expectedVersion !== expectedIntent.expectedVersion) {
      throw new TypeError('accepted receipt allocation value mismatch');
    }
  }
  if (seen.size !== expected.size) throw new TypeError('accepted receipt allocation coverage mismatch');
}

export function snapshotFingerprint(snapshot) {
  return digest({
    batches: snapshot.batches,
    organizationId: snapshot.organizationId,
    asOfDate: snapshot.asOfDate,
    openingEvidence: snapshot.openingEvidence,
    reservationEvidence: snapshot.reservationEvidence,
  });
}

export function planInvoiceBatchIntent(input = {}) {
  let original;
  try {
    original = clone(input);
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
    const computedSnapshotFingerprint = snapshotFingerprint(snapshot);
    const snapshotEvidence = validateSnapshotAttestations(input, snapshot, computedSnapshotFingerprint);
    if (snapshotEvidence.outcome === 'blocked') return snapshotEvidence;
    const inputSnapshotFingerprint = snapshotEvidence.fingerprint;
    const expectedSnapshotVersion = snapshotEvidence.version;
    if (!EVENT_TYPES.has(event.type)) {
      return blocked(BLOCKED_TYPES.has(event.type) && event.type === 'revision'
        ? 'accepted_revision_requires_reconciliation'
        : BLOCKED_TYPES.has(event.type) ? 'physical_disposition_unverified' : 'unsupported_event_type');
    }
    if (event.status === 'draft' || event.status === 'unsent') return { outcome: 'blocked', reason: 'event_not_stock_effective', intents: [] };
    if (event.status !== 'sent' || event.stockEffective !== true ||
      event.cancelled === true || event.voided === true || event.revised === true) {
      return blocked('contradictory_invoice_lifecycle');
    }
    if (!Array.isArray(event.lines) || event.lines.length === 0) return blocked('missing_invoice_lines');

    const payloadFingerprint = digest({
      organizationId, eventId, invoiceId, invoiceVersion, eventType: event.type,
      lines: event.lines,
      snapshotFingerprint: inputSnapshotFingerprint,
    });
    const receipts = input.acceptedReceipts ?? [];
    if (!Array.isArray(receipts)) return blocked('invalid_receipts');
    try {
      for (const receipt of receipts) validateReceipt(receipt, organizationId);
    } catch (error) {
      return blocked('invalid_accepted_receipt', asError(error));
    }
    const matching = receipts.filter((receipt) =>
      receipt.organizationId === organizationId &&
      receipt.eventId === eventId &&
      receipt.invoiceId === invoiceId &&
      String(receipt.invoiceVersion) === invoiceVersion);
    const invoiceHistory = receipts.filter((receipt) =>
      receipt.organizationId === organizationId && receipt.invoiceId === invoiceId);
    const eventHistory = receipts.filter((receipt) =>
      receipt.organizationId === organizationId && receipt.eventId === eventId);
    if (matching.length > 1) return blocked('ambiguous_prior_receipts');
    if (eventHistory.some((receipt) =>
      receipt.invoiceId !== invoiceId || String(receipt.invoiceVersion) !== invoiceVersion)) {
      return blocked('event_identity_reused_for_different_invoice');
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
      const policy = Array.isArray(policies) ? policies.find((candidate) => candidate?.itemId === itemId) : undefined;
      if (!policy || policy.organizationId !== organizationId ||
        policy.provenance?.organizationId !== organizationId ||
        policy.provenance?.snapshotFingerprint !== inputSnapshotFingerprint ||
        !Number.isInteger(policy.provenance?.version) || policy.provenance.version < 1) {
        return blocked('contradictory_policy_provenance');
      }
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
          expectedVersion: allocation.version, inputSnapshotFingerprint,
        };
      });
      intents.push(...lineSlices);
    }
    if (matching.length === 1) {
      if (matching[0].payloadFingerprint !== payloadFingerprint ||
        matching[0].snapshotFingerprint !== inputSnapshotFingerprint ||
        matching[0].eventId !== eventId) {
        return blocked('event_identity_reused_with_changed_payload');
      }
      try {
        validateReceiptAllocations(matching[0], intents, inputSnapshotFingerprint);
      } catch (error) {
        return blocked('invalid_accepted_receipt', asError(error));
      }
      return { outcome: 'no_op', eventId, invoiceId, invoiceVersion, receiptId: matching[0].receiptId, expectedSnapshotVersion };
    }
    if (invoiceHistory.length > 0) return blocked('invoice_already_accepted_requires_reconciliation');
    return clone({
      outcome: 'proposed', synthetic: true, connected: false, readOnly: true,
      organizationId, eventId, invoiceId, invoiceVersion,
      payloadFingerprint, snapshotFingerprint: inputSnapshotFingerprint, expectedSnapshotVersion,
      intents, expectedVersions: Object.fromEntries(intents.map((intent) => [intent.batchId, intent.expectedVersion])),
      atomicCommit: false,
    });
  } catch (error) {
    return blocked('invalid_input', asError(error));
  } finally {
    try {
      if (original !== undefined && digest(input) !== digest(original)) throw new TypeError('invoice intent input was mutated');
    } catch (error) {
      if (error instanceof TypeError && error.message === 'invoice intent input was mutated') throw error;
    }
  }
}
