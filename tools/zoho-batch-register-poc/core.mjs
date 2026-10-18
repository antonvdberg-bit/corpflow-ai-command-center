const MAX_SCALE = 6;
const MAX_SAFE_SCALED = BigInt(Number.MAX_SAFE_INTEGER);
const VALID_UNITS = new Set(['each', 'kg', 'g', 'l', 'ml', 'box']);
const VALID_STATUSES = new Set(['available', 'quarantined', 'expired']);

function fail(message) {
  throw new TypeError(message);
}

function assertDate(value, field = 'date', { allowUndefined = false } = {}) {
  if (allowUndefined && value === undefined) return;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    fail(`${field} must be a Gregorian YYYY-MM-DD date`);
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    fail(`${field} must be a real Gregorian date`);
  }
}

function decimalParts(value, field) {
  if ((typeof value !== 'number' && typeof value !== 'string') || value === '') {
    fail(`${field} must be a finite nonnegative number`);
  }
  const text = String(value);
  if (!/^(?:\d+|\d+\.\d+)$/.test(text) || !Number.isFinite(Number(value))) {
    fail(`${field} must be a finite nonnegative number`);
  }
  const [whole, fraction = ''] = text.split('.');
  if (fraction.length > MAX_SCALE) fail(`${field} supports at most ${MAX_SCALE} decimal places`);
  const scale = 10 ** fraction.length;
  const scaled = BigInt(whole) * BigInt(scale) + BigInt(fraction || 0);
  const normalized = scaled * BigInt(10 ** (MAX_SCALE - fraction.length));
  if (normalized > MAX_SAFE_SCALED) {
    fail(`${field} is too large`);
  }
  return { scaled, scale };
}

function toScaled(value, field) {
  const { scaled, scale } = decimalParts(value, field);
  return scaled * BigInt(10 ** (MAX_SCALE - Math.log10(scale)));
}

function fromScaled(value) {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const text = absolute.toString().padStart(MAX_SCALE + 1, '0');
  const whole = text.slice(0, -MAX_SCALE);
  const fraction = text.slice(-MAX_SCALE).replace(/0+$/, '');
  return Number(`${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`);
}

function clone(value) {
  return structuredClone(value);
}

function fingerprint(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(fingerprint).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${fingerprint(value[key])}`).join(',')}}`;
}

function validateBatch(batch, index, seenIds, seenLots) {
  if (!batch || typeof batch !== 'object') fail(`batch ${index} must be an object`);
  for (const field of ['batchId', 'itemId', 'lotNumber', 'unit', 'version', 'receivedDate']) {
    if (batch[field] === undefined || batch[field] === '') fail(`batch ${index} requires ${field}`);
  }
  if (seenIds.has(batch.batchId)) fail(`duplicate batchId: ${batch.batchId}`);
  const lotKey = `${batch.itemId}\u0000${batch.lotNumber}`;
  if (seenLots.has(lotKey)) fail(`duplicate item and lot: ${batch.itemId}/${batch.lotNumber}`);
  seenIds.add(batch.batchId);
  seenLots.add(lotKey);
  assertDate(batch.expiryDate, `batch ${index}.expiryDate`, { allowUndefined: true });
  assertDate(batch.receivedDate, `batch ${index}.receivedDate`);
  if (!VALID_UNITS.has(batch.unit)) fail(`batch ${index}.unit is unsupported`);
  if (!VALID_STATUSES.has(batch.status)) fail(`batch ${index}.status is unsupported`);
  if (!Number.isInteger(batch.version) || batch.version < 1) fail(`batch ${index}.version must be a positive integer`);
  const balance = toScaled(batch.balanceQuantity, `batch ${index}.balanceQuantity`);
  const reserved = toScaled(batch.reservedQuantity ?? 0, `batch ${index}.reservedQuantity`);
  if (reserved > balance) fail(`batch ${index}.reservedQuantity cannot exceed balanceQuantity`);
  return { ...clone(batch), balanceQuantity: fromScaled(balance), reservedQuantity: fromScaled(reserved) };
}

function validateBatches(batches) {
  if (!Array.isArray(batches)) fail('batches must be an array');
  const ids = new Set();
  const lots = new Set();
  return batches.map((batch, index) => validateBatch(batch, index, ids, lots));
}

export function planAllocation({ itemId, quantity, unit, asOfDate, batches }) {
  if (!itemId) fail('itemId is required');
  assertDate(asOfDate, 'asOfDate');
  if (!VALID_UNITS.has(unit)) fail('unit is unsupported');
  const requested = toScaled(quantity, 'quantity');
  if (requested <= 0n) fail('quantity must be positive');
  const validated = validateBatches(batches);
  const eligible = validated
    .map((batch) => {
      const available = toScaled(batch.balanceQuantity, 'balanceQuantity') - toScaled(batch.reservedQuantity, 'reservedQuantity');
      return { batch, available };
    })
    .filter(({ batch, available }) =>
      batch.itemId === itemId &&
      batch.unit === unit &&
      batch.status === 'available' &&
      batch.expiryDate &&
      batch.expiryDate > asOfDate &&
      available > 0n
    )
    .sort((a, b) =>
      a.batch.expiryDate.localeCompare(b.batch.expiryDate) ||
      a.batch.receivedDate.localeCompare(b.batch.receivedDate) ||
      a.batch.batchId.localeCompare(b.batch.batchId)
    );
  let remaining = requested;
  const allocations = [];
  for (const { batch, available } of eligible) {
    if (remaining <= 0n) break;
    const amount = remaining < available ? remaining : available;
    allocations.push({
      batchId: batch.batchId,
      itemId: batch.itemId,
      lotNumber: batch.lotNumber,
      quantity: fromScaled(amount),
      expiryDate: batch.expiryDate,
      remainingBalance: fromScaled(available - amount),
      unit: batch.unit,
      version: batch.version,
    });
    remaining -= amount;
  }
  const ok = remaining === 0n;
  return {
    ok,
    allocations: ok ? allocations : [],
    unallocatedQuantity: fromScaled(remaining),
    message: ok ? 'Allocation planned' : `Shortage: ${fromScaled(remaining)} ${unit} unallocated`,
    expectedVersions: Object.fromEntries(eligible.map(({ batch }) => [batch.batchId, batch.version])),
    request: { itemId, quantity: fromScaled(requested), unit, asOfDate },
    sourceFingerprint: fingerprint({
      request: { itemId, quantity: fromScaled(requested), unit, asOfDate },
      allocations,
      expectedVersions: Object.fromEntries(eligible.map(({ batch }) => [batch.batchId, batch.version])),
    }),
  };
}

export class BatchLedger {
  #batches;
  #history = [];
  #replays = new Map();
  constructor(batches) {
    this.#batches = validateBatches(batches);
  }

  get batches() {
    return clone(this.#batches);
  }

  get history() {
    return clone(this.#history);
  }

  plan(request) {
    return planAllocation({ ...request, batches: this.#batches });
  }

  receive({ batchId, quantity, idempotencyKey, lotNumber, itemId, expiryDate, unit, receivedDate = new Date().toISOString().slice(0, 10) }) {
    if (!idempotencyKey) fail('idempotencyKey is required');
    const payload = { batchId, quantity, lotNumber, itemId, expiryDate, unit, receivedDate };
    const digest = fingerprint({ type: 'receipt', payload });
    const previous = this.#replays.get(idempotencyKey);
    if (previous) {
      if (previous.digest !== digest) fail('idempotency key was already used with a different payload');
      return clone(previous.result);
    }
    const index = this.#batches.findIndex((batch) => batch.batchId === batchId);
    if (index < 0) fail(`unknown batchId: ${batchId}`);
    const batch = this.#batches[index];
    if (batch.itemId !== itemId || batch.lotNumber !== lotNumber || batch.expiryDate !== expiryDate || batch.unit !== unit) {
      fail('receipt conflicts with existing lot identity or expiry');
    }
    const amount = toScaled(quantity, 'quantity');
    if (amount <= 0n) fail('quantity must be positive');
    const updated = { ...batch, balanceQuantity: fromScaled(toScaled(batch.balanceQuantity, 'balanceQuantity') + amount), version: batch.version + 1 };
    const result = { ok: true, batch: clone(updated), message: `Received ${quantity} ${unit} into ${lotNumber}` };
    this.#batches[index] = updated;
    this.#history.push({ type: 'receipt', ...clone(result) });
    this.#replays.set(idempotencyKey, { digest, result });
    return clone(result);
  }

  commit(plan, { idempotencyKey }) {
    if (!idempotencyKey) fail('idempotencyKey is required');
    const digest = fingerprint({ type: 'allocation', request: plan?.request, allocations: plan?.allocations, sourceFingerprint: plan?.sourceFingerprint });
    const previous = this.#replays.get(idempotencyKey);
    if (previous) {
      if (previous.digest !== digest) fail('idempotency key was already used with a different payload');
      return clone(previous.result);
    }
    if (!plan?.ok || !Array.isArray(plan.allocations) || !plan.expectedVersions) fail('invalid allocation plan');
    if (!plan.request || typeof plan.request !== 'object') fail('allocation plan is missing its request');
    assertDate(plan.request.asOfDate, 'plan.request.asOfDate');
    if (!plan.request.itemId || !VALID_UNITS.has(plan.request.unit)) fail('allocation plan request identity is invalid');
    const requested = toScaled(plan.request.quantity, 'plan.request.quantity');
    if (requested <= 0n) fail('plan.request.quantity must be positive');
    if (plan.allocations.length === 0) fail('allocation plan must contain allocations');
    if (plan.sourceFingerprint !== fingerprint({
      request: {
        itemId: plan.request.itemId,
        quantity: fromScaled(requested),
        unit: plan.request.unit,
        asOfDate: plan.request.asOfDate,
      },
      allocations: plan.allocations,
      expectedVersions: plan.expectedVersions,
    })) fail('allocation plan fingerprint is invalid');
    const originals = new Map();
    let allocated = 0n;
    for (const allocation of plan.allocations) {
      if (!allocation || typeof allocation !== 'object' || !allocation.batchId || originals.has(allocation.batchId)) {
        fail('allocation plan contains a duplicate or malformed batch slice');
      }
      const index = this.#batches.findIndex((batch) => batch.batchId === allocation.batchId);
      if (index < 0) fail(`unknown batchId: ${allocation.batchId}`);
      const batch = this.#batches[index];
      const expected = plan.expectedVersions[batch.batchId];
      const available = toScaled(batch.balanceQuantity, 'balanceQuantity') - toScaled(batch.reservedQuantity, 'reservedQuantity');
      if (batch.version !== expected) fail(`stale allocation plan for ${batch.batchId}`);
      if (allocation.itemId !== batch.itemId || allocation.lotNumber !== batch.lotNumber ||
        allocation.unit !== batch.unit || allocation.unit !== plan.request.unit ||
        batch.itemId !== plan.request.itemId || batch.status !== 'available' ||
        !batch.expiryDate || batch.expiryDate <= plan.request.asOfDate ||
        allocation.expiryDate !== batch.expiryDate) {
        fail(`allocation identity or eligibility changed for ${batch.batchId}`);
      }
      const amount = toScaled(allocation.quantity, 'allocation.quantity');
      if (amount <= 0n || amount > available) fail(`allocation exceeds available quantity for ${batch.batchId}`);
      allocated += amount;
      if (!originals.has(batch.batchId)) originals.set(batch.batchId, clone(batch));
    }
    if (allocated !== requested) fail('allocation total does not match requested quantity');
    const changes = plan.allocations.map((allocation) => {
      const index = this.#batches.findIndex((batch) => batch.batchId === allocation.batchId);
      const batch = this.#batches[index];
      const remaining = toScaled(batch.balanceQuantity, 'balanceQuantity') - toScaled(allocation.quantity, 'allocation.quantity');
      return { index, batch: { ...batch, balanceQuantity: fromScaled(remaining), version: batch.version + 1 } };
    });
    for (const { index, batch } of changes) this.#batches[index] = batch;
    const result = { ok: true, allocationId: `allocation-${this.#history.length + 1}`, allocations: clone(plan.allocations) };
    this.#history.push({ type: 'allocation', ...clone(result), originals: Object.fromEntries(originals) });
    this.#replays.set(idempotencyKey, { digest, result });
    return clone(result);
  }

  reverse(allocationId) {
    const entry = this.#history.find((event) => event.type === 'allocation' && event.allocationId === allocationId);
    if (!entry) fail(`unknown allocation: ${allocationId}`);
    if (this.#history.some((event) => event.type === 'reversal' && event.allocationId === allocationId)) {
      fail(`allocation already reversed: ${allocationId}`);
    }
    const changes = [];
    for (const allocation of entry.allocations) {
      const batchId = allocation.batchId;
      const index = this.#batches.findIndex((batch) => batch.batchId === batchId);
      if (index < 0) fail(`cannot reverse missing batch: ${batchId}`);
      const current = this.#batches[index];
      if (current.itemId !== allocation.itemId || current.lotNumber !== allocation.lotNumber ||
        current.unit !== allocation.unit || current.expiryDate !== allocation.expiryDate) {
        fail(`cannot reverse changed batch identity: ${batchId}`);
      }
      changes.push({
        index,
        batch: {
          ...current,
          balanceQuantity: fromScaled(
            toScaled(current.balanceQuantity, 'balanceQuantity') +
            toScaled(allocation.quantity, 'allocation.quantity'),
          ),
          version: current.version + 1,
        },
      });
    }
    for (const change of changes) this.#batches[change.index] = change.batch;
    const result = { ok: true, allocationId, message: `Reversed ${allocationId}` };
    this.#history.push({ type: 'reversal', ...result });
    return result;
  }
}
