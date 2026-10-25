'use strict';

const BASE_URL = 'https://www.zohoapis.com/books/v3/';
const SOURCES = ['register', 'movement', 'item'];
const MODULE_SOURCES = ['register', 'movement'];
const MAX_PAGES = 10;
const MAX_BODY = 1024 * 1024;
const TIMEOUT_MS = 15_000;
const SAFE = /^[A-Za-z0-9_:-]+$/;
const MODULE = /^cm_[A-Za-z0-9_]+$/;

function timestamp() {
  try {
    return new Date().toISOString();
  } catch {
    return null;
  }
}

function ownDataObject(value, name) {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
      throw new TypeError(`${name} must be a plain object`);
    }
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string' || key === '__proto__' || key === 'prototype' || key === 'constructor') {
        throw new TypeError(`${name} has unsafe property`);
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !('value' in descriptor)) throw new TypeError(`${name} must not contain accessors`);
    }
    return value;
  } catch (error) {
    if (error instanceof TypeError) throw error;
    throw new TypeError(`${name} must be a plain object`);
  }
}

function scalar(value, name) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 200 || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new TypeError(`${name} must be a safe scalar`);
  }
  return value;
}

function dateValue(value, name, allowBlank = false) {
  if (allowBlank && value === '') return value;
  scalar(value, name);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError(`${name} must be a real date`);
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new TypeError(`${name} must be a real date`);
  }
  return value;
}

function copyAndFreeze(value, name) {
  if (typeof value !== 'object' || value === null) return value;
  ownDataObject(value, name);
  const copy = {};
  for (const key of Object.keys(value)) copy[key] = copyAndFreeze(value[key], `${name}.${key}`);
  return Object.freeze(copy);
}

function pathPart(value, name) {
  const result = scalar(value, name);
  if (result.includes('..') || result.includes('/') || result.includes('\\')) throw new TypeError(`${name} has unsafe path`);
  return result;
}

function copyConfig(input) {
  ownDataObject(input, 'config');
  const allowed = new Set(['organizationId', 'connectionName', 'modules', 'collections', 'fields', 'expected']);
  for (const key of Reflect.ownKeys(input)) if (typeof key !== 'string' || !allowed.has(key)) throw new TypeError('unknown config value');
  const config = {};
  for (const key of allowed) config[key] = copyAndFreeze(input[key], `config.${key}`);
  scalar(config.organizationId, 'organizationId');
  pathPart(config.connectionName, 'connectionName');
  ownDataObject(config.modules, 'modules');
  ownDataObject(config.collections, 'collections');
  ownDataObject(config.fields, 'fields');
  ownDataObject(config.expected, 'expected');
  for (const key of Reflect.ownKeys(config.modules)) if (!MODULE_SOURCES.includes(key)) throw new TypeError('unknown module');
  for (const key of Reflect.ownKeys(config.collections)) if (!SOURCES.includes(key)) throw new TypeError('unknown collection');
  for (const key of Reflect.ownKeys(config.fields)) if (!SOURCES.includes(key)) throw new TypeError('unknown fields');
  if (config.collections.item !== 'items') throw new TypeError('collection item must be items');
  for (const source of MODULE_SOURCES) {
    if (!config.modules || typeof config.modules[source] !== 'string' || !MODULE.test(config.modules[source])) {
      throw new TypeError(`module ${source} must be a cm_ identifier`);
    }
    pathPart(config.collections?.[source], `collection ${source}`);
  }
  pathPart(config.collections.item, 'collection item');
  for (const source of SOURCES) {
    if (!config.fields[source]) throw new TypeError(`fields ${source} required`);
    ownDataObject(config.fields[source], `fields ${source}`);
    const required = source === 'register' ? ['id', 'itemId', 'status', 'date'] :
      source === 'movement' ? ['id', 'lotId', 'itemId', 'key', 'type', 'quantity', 'date', 'reversal'] : ['id', 'unit'];
    const allowedFields = new Set(required);
    for (const key of Reflect.ownKeys(config.fields[source])) {
      if (typeof key !== 'string' || !allowedFields.has(key)) throw new TypeError(`unknown field ${source}`);
    }
    if (source === 'item' &&
        (config.fields.item.id !== 'item_id' || config.fields.item.unit !== 'unit')) {
      throw new TypeError('item fields must use native names');
    }
    for (const name of required) pathPart(config.fields[source][name], `field ${source}.${name}`);
  }
  const expected = config.expected;
  const expectedKeys = new Set(['movementId', 'registerId', 'itemId', 'itemUnit', 'registerStatus', 'registerDate', 'opening']);
  for (const key of Reflect.ownKeys(expected)) if (typeof key !== 'string' || !expectedKeys.has(key)) throw new TypeError('unknown expected value');
  for (const name of ['movementId', 'registerId', 'itemId', 'itemUnit', 'registerStatus']) scalar(expected[name], `expected ${name}`);
  const opening = expected.opening;
  ownDataObject(opening, 'expected opening');
  for (const key of Reflect.ownKeys(opening)) if (!['type', 'date', 'key', 'quantity', 'reversal'].includes(key)) throw new TypeError('unknown opening value');
  for (const name of ['type', 'date', 'key']) scalar(opening[name], `expected opening ${name}`);
  if (opening.reversal !== '') scalar(opening.reversal, 'expected opening reversal');
  if (opening.type !== 'Opening Balance' || opening.quantity !== 0 || opening.reversal !== '') throw new TypeError('opening must be explicit zero balance');
  dateValue(expected.registerDate, 'expected register date', true);
  dateValue(opening.date, 'expected opening date');
  return Object.freeze(config);
}

const ERROR_MARKER = Symbol('native-readback-error');
function internalError(category, stage, source, page, extra = {}) {
  return Object.assign({ [ERROR_MARKER]: true, category, stage, ...(source ? { source } : {}), ...(page ? { page } : {}) }, extra);
}
function projectError(error) {
  try {
    if (!error || error[ERROR_MARKER] !== true) return { category: 'diagnostic', stage: 'execution' };
    const allowed = new Set(['category', 'stage', 'source', 'page', 'identity']);
    const result = {};
    for (const key of allowed) {
      const descriptor = Object.getOwnPropertyDescriptor(error, key);
      if (!descriptor || !('value' in descriptor)) continue;
      const value = descriptor.value;
      if (key === 'page' ? Number.isInteger(value) && value > 0 : typeof value === 'string' && value.length <= 40 && SAFE.test(value)) {
        result[key] = value;
      } else if (key === 'identity' && ownSafeIdentity(value)) result.identity = value;
    }
    return result.category ? result : { category: 'diagnostic', stage: 'execution' };
  } catch {
    return { category: 'diagnostic', stage: 'execution' };
  }
}
function safeError(category, stage, source, page, extra = {}) {
  return internalError(category, stage, source, page, extra);
}
function ownSafeIdentity(value) {
  return value && typeof value === 'object' && Object.keys(value).every((key) => ['type', 'equal'].includes(key)) &&
    (value.type === 'string' || value.type === 'null') && typeof value.equal === 'boolean';
}

function requestPage(context, config, source, page) {
  const requestStartedAt = timestamp();
  let connector;
  try {
    connector = context?.getConnection?.(config.connectionName);
  } catch {
    return Promise.reject(safeError('connection', 'connection', source, page));
  }
  if (!connector || typeof connector.makeRequest !== 'function') {
    return Promise.reject(safeError('connection', 'connection', source, page));
  }
  const query = new URLSearchParams({
    organization_id: config.organizationId,
    page: String(page),
    per_page: '200',
  });
  const resource = source === 'item' ? 'items' : encodeURIComponent(config.modules[source]);
  const url = `${BASE_URL}${resource}?${query.toString()}`;
  return new Promise((resolve, reject) => {
    let settled = false;
    let request;
    let timer;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { request?.destroy?.(); } catch { /* connector cleanup is best effort */ }
      reject(error);
    };
    const succeed = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ...value, requestStartedAt, requestEndedAt: timestamp() });
    };
    const callback = (response) => {
      try {
        let body = '';
        let bytes = 0;
        const statusCode = response?.statusCode;
        if (!response || statusCode !== 200 || typeof response.on !== 'function') {
          fail(safeError('http', 'response', source, page));
          return;
        }
        response.on('data', (chunk) => {
          try {
            if (settled) return;
            const value = Buffer.isBuffer(chunk) ? chunk : String(chunk);
            bytes += Buffer.byteLength(value);
            if (bytes > MAX_BODY) fail(safeError('response_too_large', 'response', source, page));
            else body += value;
          } catch {
            fail(safeError('response', 'response', source, page));
          }
        });
        response.on('error', () => fail(safeError('http', 'response', source, page)));
        response.on('end', () => {
          try {
            if (settled) return;
            let parsed;
            try { parsed = JSON.parse(body); } catch { fail(safeError('parse', 'response', source, page)); return; }
            succeed({ parsed, statusCode });
          } catch {
            fail(safeError('response', 'response', source, page));
          }
        });
      } catch {
        fail(safeError('response', 'response', source, page));
      }
    };
    try {
      request = connector.makeRequest({ url, method: 'GET' }, callback);
      if (!request || typeof request.on !== 'function' || typeof request.end !== 'function') {
        fail(safeError('connector', 'request', source, page));
        return;
      }
      request.on('error', () => fail(safeError('http', 'request', source, page)));
      request.on('timeout', () => fail(safeError('timeout', 'request', source, page)));
      timer = setTimeout(() => fail(safeError('timeout', 'request', source, page)), TIMEOUT_MS);
      request.end();
    } catch {
      fail(safeError('connector', 'request', source, page));
    }
  });
}

function readSource(context, config, source, provenance) {
  const records = [];
  const ids = new Set();
  const pages = [];
  const read = (page) => requestPage(context, config, source, page).then(({ parsed, statusCode,
    requestStartedAt, requestEndedAt }) => {
    const collection = config.collections[source];
    const pageContext = parsed && parsed.page_context;
    const rows = parsed && parsed[collection];
    const attestedOrg = parsed && parsed.organization_id;
    if (parsed?.code !== 0 || (attestedOrg !== undefined && (typeof attestedOrg !== 'string' || attestedOrg !== config.organizationId)) ||
        !Array.isArray(rows) || !pageContext || pageContext.page !== page ||
        typeof pageContext.has_more_page !== 'boolean') {
      throw safeError('schema', 'envelope', source, page);
    }
    if (pageContext.has_more_page && rows.length === 0) throw safeError('schema', 'pagination', source, page);
    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) throw safeError('record', 'mapping', source, page);
      const id = row[config.fields[source].id];
      if (typeof id !== 'string' || id.length === 0 || ids.has(id)) throw safeError('duplicate_or_invalid_id', 'mapping', source, page);
      ids.add(id);
      records.push(row);
    }
    const resource = source === 'item' ? 'items' : config.modules[source];
    pages.push({ requestedOrganizationId: config.organizationId, attestedOrganizationId: typeof attestedOrg === 'string' ? attestedOrg : null,
      accountScopeVerified: false,
      module: resource, resource, page, method: 'GET', responseHttpStatus: statusCode,
      requestStartedAt, requestEndedAt,
      hasMorePage: pageContext.has_more_page });
    if (pageContext.has_more_page) {
      if (page >= MAX_PAGES) throw safeError('page_cap', 'pagination', source, page);
      return read(page + 1);
    }
    return { records, pages };
  });
  return read(1);
}

function value(record, fields, name) {
  return record?.[fields[name]];
}

function typeEquality(actual, expected) {
  return { actualType: actual === null ? 'null' : typeof actual, equal: typeof actual === typeof expected && actual === expected };
}

function createNativeReadbackDiagnostic(inputConfig) {
  const config = copyConfig(inputConfig);
  return async function nativeReadback(context, basicIO) {
    const base = { readOnly: true, stockChanged: false, operational: false, sampleOnly: false,
      accountScopeVerified: false,
      allocationReady: false, identityReadbackPassed: false, ok: false, provenance: [] };
    try {
      if (!basicIO || typeof basicIO.write !== 'function') throw safeError('io', 'output');
      const data = {};
      for (const source of SOURCES) {
        const result = await readSource(context, config, source, base.provenance);
        data[source] = result.records;
        base.provenance.push(...result.pages);
      }
      const selected = {};
      for (const source of SOURCES) {
        const id = config.expected[`${source}Id`];
        const matches = data[source].filter((row) => row[config.fields[source].id] === id);
        if (matches.length !== 1) throw safeError('identity', 'lookup', source);
        selected[source] = matches[0];
      }
      const rf = config.fields.register;
      const mf = config.fields.movement;
      const itemf = config.fields.item;
      const movementLot = value(selected.movement, mf, 'lotId');
      const registerItem = value(selected.register, rf, 'itemId');
      const itemUnit = value(selected.item, itemf, 'unit');
      const identity = {
        movementLot: { type: movementLot === null ? 'null' : typeof movementLot, equal: movementLot === config.expected.registerId },
        registerItem: { type: registerItem === null ? 'null' : typeof registerItem, equal: registerItem === config.expected.itemId },
      };
      if (!identity.movementLot.equal || !identity.registerItem.equal) throw safeError('identity_mismatch', 'equality', 'movement', undefined, { identity });
      if (itemUnit !== config.expected.itemUnit) throw safeError('metadata_mismatch', 'unit', 'item', undefined, { itemUnitType: typeof itemUnit });
      const movements = data.movement.filter((row) => value(row, mf, 'lotId') === config.expected.registerId);
      const openings = movements.filter((row) => value(row, mf, 'type') === config.expected.opening.type);
      if (openings.length !== 1) throw safeError('opening_count', 'metadata', 'movement');
      const opening = openings[0];
      const checks = {
        openingDate: typeEquality(value(opening, mf, 'date'), config.expected.opening.date),
        openingKey: typeEquality(value(opening, mf, 'key'), config.expected.opening.key),
        openingQuantity: typeEquality(value(opening, mf, 'quantity'), config.expected.opening.quantity),
        openingReversalBlank: value(opening, mf, 'reversal') === '' ? { type: 'string', equal: true } :
          { type: value(opening, mf, 'reversal') === null ? 'null' : typeof value(opening, mf, 'reversal'), equal: false },
        registerStatus: typeEquality(value(selected.register, rf, 'status'), config.expected.registerStatus),
        registerDate: typeEquality(value(selected.register, rf, 'date'), config.expected.registerDate),
      };
      if (Object.values(checks).some((check) => !check.equal)) throw safeError('metadata_mismatch', 'metadata', 'movement', undefined, { checks });
      if (selected.movement[config.fields.movement.id] !== config.expected.movementId ||
          selected.movement[config.fields.movement.type] !== config.expected.opening.type) {
        throw safeError('identity_mismatch', 'selected_movement', 'movement');
      }
      base.selected = {
        movementId: config.expected.movementId, registerId: config.expected.registerId, itemId: config.expected.itemId,
        itemUnit, movement: { quantity: value(selected.movement, mf, 'quantity'), type: value(selected.movement, mf, 'type'),
          date: value(selected.movement, mf, 'date'), key: value(selected.movement, mf, 'key'), reversal: value(selected.movement, mf, 'reversal') },
        register: { status: value(selected.register, rf, 'status'), date: value(selected.register, rf, 'date') },
        rawLookupTypes: { movementLot: identity.movementLot.type, registerItem: identity.registerItem.type },
      };
      base.identityReadbackPassed = true;
      base.ok = true;
    } catch (error) {
      base.error = projectError(error);
    }
    try {
      basicIO.write(JSON.stringify(base));
    } catch {
      base.ok = false;
      base.identityReadbackPassed = false;
      base.error = { category: 'io', stage: 'output' };
    }
    return base;
  };
}

module.exports = { createNativeReadbackDiagnostic };
