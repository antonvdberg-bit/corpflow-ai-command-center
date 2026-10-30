import { normalizeItemPolicies, planAllocation } from './core.mjs';

const UNITS = new Set(['each', 'kg', 'g', 'l', 'ml', 'box']);
const MOVEMENT_TYPES = new Set(['receipt', 'allocation', 'reversal']);
const SCALE = 1000000n;
const MAX_SAFE_SCALED = BigInt(Number.MAX_SAFE_INTEGER);

function fail(message) {
  throw new TypeError(message);
}

function required(value, name) {
  if (value === undefined || value === null || value === '') fail(`${name} is required`);
  return value;
}

function optional(record, path) {
  if (!path) return undefined;
  return path.split('.').reduce((current, key) => current?.[key], record);
}

function date(value, name) {
  required(value, name);
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(`${name} must be YYYY-MM-DD`);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) fail(`${name} is invalid`);
  return value;
}

function quantity(value, name) {
  required(value, name);
  if ((typeof value !== 'number' && typeof value !== 'string') ||
    (typeof value === 'number' && !Number.isFinite(value)) ||
    !/^(?:\d+|\d+\.\d{1,6})$/.test(String(value))) {
    fail(`${name} must be a nonnegative quantity with at most six decimals`);
  }
  const [whole, fraction = ''] = String(value).split('.');
  const scaled = BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, '0'));
  if (scaled > MAX_SAFE_SCALED) fail(`${name} exceeds safe quantity limit`);
  return scaled;
}

function exactQuantity(value) {
  if (value < 0n) fail('quantity cannot be negative');
  const whole = value / SCALE;
  const fraction = String(value % SCALE).padStart(6, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : String(whole);
}

function displayedQuantity(value, name) {
  if (value < 0n || value > MAX_SAFE_SCALED) fail(`${name} exceeds safe quantity limit`);
  return Number(exactQuantity(value));
}

function clone(value) {
  return structuredClone(value);
}

function read(record, field, name) {
  if (!field) fail(`missing required mapping for ${name}`);
  const value = field.split('.').reduce((current, key) => current?.[key], record);
  return required(value, name);
}

function identity(record, fields, name) {
  return {
    itemId: read(record, fields.itemId, `${name}.itemId`),
    lotNumber: read(record, fields.lotNumber, `${name}.lotNumber`),
    unit: read(record, fields.unit, `${name}.unit`),
  };
}

function normalizeStatus(value) {
  const statuses = {
    available: 'available',
    quarantined: 'quarantined',
    quarantine: 'quarantined',
    expired: 'expired',
    blank: 'quarantined',
    pending: 'quarantined',
    closed: 'quarantined',
  };
  if (value === undefined || value === null || value === '') return 'quarantined';
  if (!Object.hasOwn(statuses, value)) fail(`unknown lookup encoding: ${value}`);
  return statuses[value];
}

async function fetchAll(transport, source, orgId, map) {
  const records = [];
  const ids = new Set();
  const cursors = new Set();
  let page = 1;
  let cursor;
  while (true) {
    if (cursors.has(cursor ?? `page:${page}`)) fail(`repeated ${source} page/cursor`);
    cursors.add(cursor ?? `page:${page}`);
    const envelope = await transport.fetchPage({ source, module: map.module, orgId, page, cursor });
    if (!envelope || !Array.isArray(envelope.records) || typeof envelope.hasMore !== 'boolean') {
      fail(`malformed ${source} page`);
    }
    for (const record of envelope.records) {
      if (!record || typeof record !== 'object') fail(`malformed ${source} record`);
      const id = read(record, map.fields.id, `${source}.id`);
      if (ids.has(id)) fail(`duplicate ${source} record ID: ${id}`);
      ids.add(id);
      records.push(record);
    }
    if (!envelope.hasMore) {
      if (envelope.nextCursor !== undefined && envelope.nextCursor !== null) fail(`${source} has cursor after completion`);
      return records;
    }
    if (envelope.nextCursor === undefined || envelope.nextCursor === null || envelope.nextCursor === '') {
      fail(`${source} page is missing nextCursor`);
    }
    if (cursors.has(envelope.nextCursor)) fail(`repeated ${source} cursor`);
    cursor = envelope.nextCursor;
    page += 1;
  }
}

function validateMapping(map) {
  if (!map?.item?.module || !map?.register?.module || !map?.movement?.module) {
    fail('item, register, and movement mappings are required');
  }
  for (const field of ['id', 'orgId', 'itemId', 'unit', 'policy']) {
    if (!map.item.fields?.[field]) fail(`missing required mapping: item.${field}`);
  }
  for (const source of ['register', 'movement']) {
    const fields = map[source].fields;
    for (const field of source === 'register'
      ? ['id', 'orgId', 'itemId', 'lotNumber', 'unit', 'status', 'expiryDate', 'baselineQuantity', 'baselineVerified', 'receivedDate', 'reservedQuantity']
      : ['id', 'orgId', 'movementKey', 'itemId', 'lotNumber', 'unit', 'type', 'quantity', 'date', 'sequence']) {
      if (!fields?.[field]) fail(`missing required mapping: ${source}.${field}`);
    }
    if (source === 'register' && (!fields.baselineDate || !fields.baselineSequence)) {
      fail('missing required mapping: register.baselineDate and register.baselineSequence');
    }
  }
}

function normalizeMovement(record, fields, asOfDate) {
  const result = { ...identity(record, fields, 'movement'), orgId: read(record, fields.orgId, 'movement.orgId'), movementId: read(record, fields.id, 'movement.id') };
  result.movementKey = read(record, fields.movementKey, 'movement.movementKey');
  result.type = read(record, fields.type, 'movement.type');
  if (!MOVEMENT_TYPES.has(result.type)) fail(`unsupported movement type: ${result.type}`);
  result.quantity = quantity(read(record, fields.quantity, 'movement.quantity'), 'movement.quantity');
  if (result.quantity <= 0n) fail('movement.quantity must be positive');
  result.date = date(read(record, fields.date, 'movement.date'), 'movement.date');
  if (result.date > asOfDate) fail('future movement date is not allowed');
  result.sequence = read(record, fields.sequence, 'movement.sequence');
  if (!Number.isSafeInteger(result.sequence) || result.sequence < 1) fail('movement.sequence must be a positive integer');
  result.reversalOf = optional(record, fields.reversalOf);
  if (result.type === 'reversal') required(result.reversalOf, 'movement.reversalOf');
  else if (result.reversalOf !== undefined) fail('reversal reference on non-reversal');
  return result;
}

function sameMovement(left, right) {
  return ['movementId', 'orgId', 'movementKey', 'itemId', 'lotNumber', 'unit', 'type',
    'date', 'sequence', 'reversalOf'].every((field) => left[field] === right[field]) &&
    left.quantity === right.quantity;
}

export async function previewBooksRecords({ transport, orgId, asOfDate, itemId, unit, quantity: requestedQuantity, map }) {
  required(transport?.fetchPage, 'read-only transport.fetchPage');
  required(orgId, 'orgId');
  date(asOfDate, 'asOfDate');
  required(itemId, 'itemId');
  if (!UNITS.has(unit)) fail(`unknown or incompatible stock unit: ${unit}`);
  validateMapping(map);
  const [items, registers, rawMovements] = await Promise.all([
    fetchAll(transport, 'item', orgId, map.item),
    fetchAll(transport, 'register', orgId, map.register),
    fetchAll(transport, 'movement', orgId, map.movement),
  ]);
  const canonicalItems = [];
  for (const record of items) {
    const id = read(record, map.item.fields.id, 'item.id');
    if (read(record, map.item.fields.orgId, 'item.orgId') !== orgId) fail(`item organization mismatch: ${id}`);
    const canonicalItemId = read(record, map.item.fields.itemId, 'item.itemId');
    const canonicalUnit = read(record, map.item.fields.unit, 'item.unit');
    if (!UNITS.has(canonicalUnit)) fail(`unknown or incompatible canonical item unit: ${canonicalItemId}`);
    canonicalItems.push({
      itemId: canonicalItemId,
      unit: canonicalUnit,
      policy: optional(record, map.item.fields.policy),
    });
  }
  const matchingItems = canonicalItems.filter((record) => record.itemId === itemId);
  if (matchingItems.length === 0) fail(`missing canonical item identity: ${itemId}`);
  if (matchingItems.some((record) => record.unit !== unit)) fail(`canonical item unit mismatch: ${itemId}`);
  const itemPolicyContext = normalizeItemPolicies(matchingItems);
  const lots = new Map();
  for (const record of registers) {
    const id = read(record, map.register.fields.id, 'register.id');
    if (read(record, map.register.fields.orgId, 'register.orgId') !== orgId) fail(`register organization mismatch: ${id}`);
    const identityValue = identity(record, map.register.fields, 'register');
    if (identityValue.itemId !== itemId || identityValue.unit !== unit) continue;
    if (read(record, map.register.fields.baselineVerified, 'register.baselineVerified') !== true) {
      fail(`missing verified opening baseline for ${identityValue.lotNumber}`);
    }
    if (lots.has(id)) fail(`duplicate register record ID: ${id}`);
    const baselineDate = date(read(record, map.register.fields.baselineDate, 'register.baselineDate'), 'register.baselineDate');
    if (baselineDate > asOfDate) fail(`baselineDate is after asOfDate for ${identityValue.lotNumber}`);
    const baselineSequence = read(record, map.register.fields.baselineSequence, 'register.baselineSequence');
    if (!Number.isSafeInteger(baselineSequence) || baselineSequence < 0) fail('register.baselineSequence must be a safe nonnegative integer');
    lots.set(id, {
      id, ...identityValue, baselineDate, baselineSequence,
      expiryDate: optional(record, map.register.fields.expiryDate) || undefined,
      receivedDate: date(read(record, map.register.fields.receivedDate, 'register.receivedDate'), 'register.receivedDate'),
      status: normalizeStatus(optional(record, map.register.fields.status)),
      baseline: quantity(read(record, map.register.fields.baselineQuantity, 'register.baselineQuantity'), 'baselineQuantity'),
      reserved: quantity(read(record, map.register.fields.reservedQuantity, 'register.reservedQuantity'), 'reservedQuantity'),
    });
  }
  const movements = rawMovements.map((record) => normalizeMovement(record, map.movement.fields, asOfDate));
  const keys = new Map();
  const sequences = new Set();
  for (const movement of movements) {
    if (movement.orgId !== orgId) fail(`movement organization mismatch: ${movement.movementId}`);
    const prior = keys.get(movement.movementKey);
    if (prior && !sameMovement(prior, movement)) fail(`duplicate/conflicting movement key: ${movement.movementKey}`);
    if (prior) fail(`duplicate movement key: ${movement.movementKey}`);
    keys.set(movement.movementKey, movement);
    const sequenceKey = `${movement.itemId}\u0000${movement.lotNumber}\u0000${movement.sequence}`;
    if (sequences.has(sequenceKey)) fail(`ambiguous movement sequence: ${movement.sequence}`);
    sequences.add(sequenceKey);
    const lot = [...lots.values()].find((candidate) => candidate.itemId === movement.itemId && candidate.lotNumber === movement.lotNumber);
    if (!lot) fail(`movement does not match requested register identity: ${movement.movementId}`);
    if (movement.unit !== lot.unit) fail(`movement unit mismatch: ${movement.movementId}`);
    if (movement.date < lot.baselineDate || movement.sequence <= lot.baselineSequence) {
      fail(`movement is before opening baseline boundary: ${movement.movementId}`);
    }
  }
  const movementsById = new Map(movements.map((movement) => [movement.movementId, movement]));
  for (const movement of movements.filter(({ type }) => type === 'reversal')) {
    const original = movementsById.get(movement.reversalOf);
    if (!original) fail(`dangling reversal: ${movement.movementId}`);
    if (original.type !== 'allocation') fail('only allocation reversals are supported');
    if (original.reversalOf) fail('reversal of reversal is not supported');
    if (movement.date < original.date || movement.sequence <= original.sequence) {
      fail('reversal sequence must follow its original movement');
    }
    if (original.itemId !== movement.itemId || original.lotNumber !== movement.lotNumber ||
      original.unit !== movement.unit || original.quantity !== movement.quantity) {
      fail(`reversal identity or quantity mismatch: ${movement.movementId}`);
    }
    if (movements.filter(({ reversalOf }) => reversalOf === original.movementId).length > 1) fail(`double reversal: ${original.movementId}`);
  }
  for (const lot of lots.values()) {
    let balance = lot.baseline;
    const related = movements
      .filter(({ lotNumber }) => lotNumber === lot.lotNumber)
      .sort((a, b) => a.sequence - b.sequence);
    for (let index = 1; index < related.length; index += 1) {
      if (related[index - 1].date > related[index].date) {
        fail(`movement date contradicts authoritative sequence for ${lot.lotNumber}`);
      }
    }
    for (const movement of related) {
      if (movement.type === 'receipt') balance += movement.quantity;
      if (movement.type === 'allocation') balance -= movement.quantity;
      if (movement.type === 'reversal') balance += movementsById.get(movement.reversalOf).quantity;
      if (balance < 0n) fail(`negative intermediate balance for ${lot.lotNumber}`);
    }
    if (lot.reserved > balance) fail(`reservedQuantity cannot exceed current balance for ${lot.lotNumber}`);
    lot.balance = balance;
  }
  const batches = [...lots.values()].map((lot) => ({
    batchId: lot.id, itemId: lot.itemId, lotNumber: lot.lotNumber, unit: lot.unit,
    status: lot.status, expiryDate: lot.expiryDate ? date(lot.expiryDate, 'register.expiryDate') : undefined,
    receivedDate: lot.receivedDate, balanceQuantity: exactQuantity(lot.balance),
    reservedQuantity: exactQuantity(lot.reserved), version: 1,
  }));
  const plan = planAllocation({
    itemId, quantity: required(requestedQuantity, 'quantity'), unit, asOfDate, batches, itemPolicyContext,
  });
  const policy = plan.itemPolicy;
  const exclusions = batches.filter((batch) =>
    batch.status !== 'available' ||
    (policy === 'required' && (!batch.expiryDate || batch.expiryDate <= asOfDate)) ||
    policy === 'review'
  ).map(({ batchId, status, expiryDate }) => ({
    batchId,
    reason: policy === 'review' ? 'classification:review' : status !== 'available' ? `status:${status}` : `expiry:${expiryDate ?? 'absent'}`,
  }));
  return clone({
    synthetic: true, connected: false, readOnly: true,
    physicalQuantity: displayedQuantity([...lots.values()].reduce((sum, lot) => sum + lot.balance, 0n), 'physicalQuantity'),
    availableQuantity: displayedQuantity([...lots.values()]
      .filter((lot) => lot.status === 'available' &&
        (policy === 'not_applicable' || (lot.expiryDate && lot.expiryDate > asOfDate)))
      .reduce((sum, lot) => sum + lot.balance - lot.reserved, 0n), 'availableQuantity'),
    exclusions, proposedSplit: plan.allocations, shortage: plan.ok ? 0 : plan.unallocatedQuantity,
    blockers: plan.ok ? [] : [plan.message], request: plan.request,
  });
}
