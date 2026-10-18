import { planAllocation } from './core.mjs';

const UNITS = new Set(['each', 'kg', 'g', 'l', 'ml', 'box']);
const MOVEMENT_TYPES = new Set(['receipt', 'allocation', 'reversal']);

function fail(message) {
  throw new TypeError(message);
}

function required(value, name) {
  if (value === undefined || value === null || value === '') fail(`${name} is required`);
  return value;
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
  if ((typeof value !== 'number' && typeof value !== 'string') || !/^(?:\d+|\d+\.\d{1,6})$/.test(String(value))) {
    fail(`${name} must be a nonnegative quantity with at most six decimals`);
  }
  const number = Number(value);
  if (!Number.isFinite(number)) fail(`${name} must be finite`);
  return number;
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
  if (!map?.register?.module || !map?.movement?.module) fail('register and movement mappings are required');
  for (const source of ['register', 'movement']) {
    const fields = map[source].fields;
    for (const field of source === 'register'
      ? ['id', 'orgId', 'itemId', 'lotNumber', 'unit', 'status', 'expiryDate', 'baselineQuantity', 'baselineVerified', 'receivedDate']
      : ['id', 'orgId', 'movementKey', 'itemId', 'lotNumber', 'unit', 'type', 'quantity', 'date', 'sequence']) {
      if (!fields?.[field]) fail(`missing required mapping: ${source}.${field}`);
    }
  }
}

function normalizeMovement(record, fields, asOfDate) {
  const result = { ...identity(record, fields, 'movement'), orgId: read(record, fields.orgId, 'movement.orgId'), movementId: read(record, fields.id, 'movement.id') };
  result.movementKey = read(record, fields.movementKey, 'movement.movementKey');
  result.type = read(record, fields.type, 'movement.type');
  if (!MOVEMENT_TYPES.has(result.type)) fail(`unsupported movement type: ${result.type}`);
  result.quantity = quantity(read(record, fields.quantity, 'movement.quantity'), 'movement.quantity');
  if (result.quantity <= 0) fail('movement.quantity must be positive');
  result.date = date(read(record, fields.date, 'movement.date'), 'movement.date');
  if (result.date > asOfDate) fail('future movement date is not allowed');
  result.sequence = read(record, fields.sequence, 'movement.sequence');
  if (!Number.isInteger(result.sequence) || result.sequence < 1) fail('movement.sequence must be a positive integer');
  result.reversalOf = fields.reversalOf ? record[fields.reversalOf] : undefined;
  if (result.type === 'reversal') required(result.reversalOf, 'movement.reversalOf');
  else if (result.reversalOf !== undefined) fail('reversal reference on non-reversal');
  return result;
}

export async function previewBooksRecords({ transport, orgId, asOfDate, itemId, unit, quantity: requestedQuantity, map }) {
  required(transport?.fetchPage, 'read-only transport.fetchPage');
  required(orgId, 'orgId');
  date(asOfDate, 'asOfDate');
  required(itemId, 'itemId');
  if (!UNITS.has(unit)) fail(`unknown or incompatible stock unit: ${unit}`);
  validateMapping(map);
  const [registers, rawMovements] = await Promise.all([
    fetchAll(transport, 'register', orgId, map.register),
    fetchAll(transport, 'movement', orgId, map.movement),
  ]);
  const lots = new Map();
  for (const record of registers) {
    const id = read(record, map.register.fields.id, 'register.id');
    if (read(record, map.register.fields.orgId, 'register.orgId') !== orgId) fail(`register organization mismatch: ${id}`);
    const identityValue = identity(record, map.register.fields, 'register');
    if (identityValue.itemId !== itemId || identityValue.unit !== unit) continue;
    const baselineVerified = record[map.register.fields.baselineVerified] === true;
    if (!baselineVerified) fail(`missing verified opening baseline for ${identityValue.lotNumber}`);
    if (lots.has(id)) fail(`duplicate register record ID: ${id}`);
    lots.set(id, {
      id, ...identityValue,
      expiryDate: read(record, map.register.fields.expiryDate, 'register.expiryDate'),
      receivedDate: date(read(record, map.register.fields.receivedDate, 'register.receivedDate'), 'register.receivedDate'),
      status: normalizeStatus(read(record, map.register.fields.status, 'register.status')),
      baseline: quantity(read(record, map.register.fields.baselineQuantity, 'register.baselineQuantity'), 'baselineQuantity'),
      delta: 0,
    });
  }
  const movements = rawMovements.map((record) => normalizeMovement(record, map.movement.fields, asOfDate));
  const keys = new Map();
  const sequences = new Set();
  for (const movement of movements) {
    if (movement.orgId !== orgId) fail(`movement organization mismatch: ${movement.movementId}`);
    const prior = keys.get(movement.movementKey);
    if (prior && JSON.stringify(prior) !== JSON.stringify(movement)) fail(`duplicate/conflicting movement key: ${movement.movementKey}`);
    if (prior) fail(`duplicate movement key: ${movement.movementKey}`);
    keys.set(movement.movementKey, movement);
    const sequenceKey = `${movement.itemId}\u0000${movement.lotNumber}\u0000${movement.sequence}`;
    if (sequences.has(sequenceKey)) fail(`ambiguous movement sequence: ${movement.sequence}`);
    sequences.add(sequenceKey);
    const lot = [...lots.values()].find((candidate) => candidate.itemId === movement.itemId && candidate.lotNumber === movement.lotNumber);
    if (!lot) fail(`movement does not match requested register identity: ${movement.movementId}`);
    if (movement.unit !== lot.unit) fail(`movement unit mismatch: ${movement.movementId}`);
    if (movement.type === 'receipt') lot.delta += movement.quantity;
    if (movement.type === 'allocation') lot.delta -= movement.quantity;
  }
  for (const movement of movements.filter(({ type }) => type === 'reversal')) {
    const original = movements.find(({ movementId }) => movementId === movement.reversalOf);
    if (!original) fail(`dangling reversal: ${movement.movementId}`);
    if (original.type !== 'allocation') fail('only allocation reversals are supported');
    if (original.reversalOf) fail('reversal of reversal is not supported');
    if (movement.sequence <= original.sequence) fail('reversal sequence must follow its original movement');
    if (original.itemId !== movement.itemId || original.lotNumber !== movement.lotNumber ||
      original.unit !== movement.unit || original.quantity !== movement.quantity) {
      fail(`reversal identity or quantity mismatch: ${movement.movementId}`);
    }
    if (movements.filter(({ reversalOf }) => reversalOf === original.movementId).length > 1) fail(`double reversal: ${original.movementId}`);
    const lot = [...lots.values()].find(({ lotNumber }) => lotNumber === movement.lotNumber);
    lot.delta += original.quantity;
  }
  const batches = [...lots.values()].map((lot) => ({
    batchId: lot.id, itemId: lot.itemId, lotNumber: lot.lotNumber, unit: lot.unit,
    status: lot.status, expiryDate: date(lot.expiryDate, 'register.expiryDate'),
    receivedDate: lot.receivedDate, balanceQuantity: lot.baseline + lot.delta, reservedQuantity: 0, version: 1,
  }));
  if (batches.some(({ balanceQuantity }) => balanceQuantity < 0)) fail('negative resulting balance');
  const plan = planAllocation({ itemId, quantity: required(requestedQuantity, 'quantity'), unit, asOfDate, batches });
  const exclusions = batches.filter((batch) => batch.status !== 'available' || !batch.expiryDate || batch.expiryDate <= asOfDate)
    .map(({ batchId, status, expiryDate }) => ({ batchId, reason: status !== 'available' ? `status:${status}` : `expiry:${expiryDate ?? 'absent'}` }));
  return clone({
    synthetic: true, connected: false, readOnly: true, physicalQuantity: batches.reduce((sum, batch) => sum + batch.balanceQuantity, 0),
    availableQuantity: batches.filter(({ status, expiryDate }) => status === 'available' && expiryDate > asOfDate)
      .reduce((sum, batch) => sum + batch.balanceQuantity, 0),
    exclusions, proposedSplit: plan.allocations, shortage: plan.ok ? 0 : plan.unallocatedQuantity,
    blockers: plan.ok ? [] : [plan.message], request: plan.request,
  });
}
