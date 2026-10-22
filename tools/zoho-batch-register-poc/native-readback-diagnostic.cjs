'use strict';

const BASE_URL = 'https://www.zohoapis.com/books/v3/';
const SOURCES = ['register', 'movement', 'item'];
const MAX_PAGES = 10;
const MAX_BODY = 1024 * 1024;
const TIMEOUT_MS = 15_000;
const SAFE = /^[A-Za-z0-9_:-]+$/;
const MODULE = /^cm_[A-Za-z0-9_]+$/;

function scalar(value, name) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 200 || !SAFE.test(value)) {
    throw new TypeError(`${name} must be a safe scalar`);
  }
  return value;
}

function expectedScalar(value, name) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 200 || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new TypeError(`${name} must be a safe scalar`);
  }
  return value;
}

function pathPart(value, name) {
  const result = scalar(value, name);
  if (result.includes('..') || result.includes('/') || result.includes('\\')) throw new TypeError(`${name} has unsafe path`);
  return result;
}

function copyConfig(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('config must be an object');
  const allowed = new Set(['organizationId', 'connectionName', 'modules', 'collections', 'fields', 'expected']);
  for (const key of Object.keys(input)) if (!allowed.has(key)) throw new TypeError('unknown config value');
  const config = structuredClone(input);
  scalar(config.organizationId, 'organizationId');
  scalar(config.connectionName, 'connectionName');
  for (const source of SOURCES) {
    if (!config.modules || typeof config.modules[source] !== 'string' || !MODULE.test(config.modules[source])) {
      throw new TypeError(`module ${source} must be a cm_ identifier`);
    }
    pathPart(config.collections?.[source], `collection ${source}`);
    if (!config.fields?.[source] || typeof config.fields[source] !== 'object') throw new TypeError(`fields ${source} required`);
    for (const name of Object.values(config.fields[source])) pathPart(name, `field ${source}`);
  }
  const expected = config.expected;
  if (!expected || typeof expected !== 'object' || Array.isArray(expected)) throw new TypeError('expected values required');
  for (const name of ['movementId', 'registerId', 'itemId', 'itemUnit', 'registerStatus']) expectedScalar(expected[name], `expected ${name}`);
  const opening = expected.opening;
  if (!opening || typeof opening !== 'object' || Array.isArray(opening)) throw new TypeError('expected opening required');
  for (const name of ['type', 'date', 'key']) expectedScalar(opening[name], `expected opening ${name}`);
  if (typeof opening.quantity !== 'number' || !Number.isFinite(opening.quantity) || opening.quantity < 0) {
    throw new TypeError('expected opening quantity must be a number');
  }
  for (const name of ['registerDate']) expectedScalar(expected[name], `expected ${name}`);
  return Object.freeze(config);
}

function safeError(category, stage, source, page, extra = {}) {
  return { category, stage, ...(source ? { source } : {}), ...(page ? { page } : {}), ...extra };
}

function requestPage(context, config, source, page) {
  const connector = context?.getConnection?.(config.connectionName);
  if (!connector || typeof connector.makeRequest !== 'function') {
    return Promise.reject(safeError('connection', 'connection', source, page));
  }
  const query = new URLSearchParams({
    organization_id: config.organizationId,
    page: String(page),
    per_page: '200',
  });
  const url = `${BASE_URL}${encodeURIComponent(config.modules[source])}?${query.toString()}`;
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
      resolve(value);
    };
    try {
      request = connector.makeRequest({ url, method: 'GET' }, (response) => {
        let body = '';
        let bytes = 0;
        if (!response || response.statusCode !== 200 || typeof response.on !== 'function') {
          fail(safeError('http', 'response', source, page));
          return;
        }
        response.on('data', (chunk) => {
          if (settled) return;
          const value = Buffer.isBuffer(chunk) ? chunk : String(chunk);
          bytes += Buffer.byteLength(value);
          if (bytes > MAX_BODY) fail(safeError('response_too_large', 'response', source, page));
          else body += value;
        });
        response.on('error', () => fail(safeError('http', 'response', source, page)));
        response.on('end', () => {
          if (settled) return;
          let parsed;
          try { parsed = JSON.parse(body); } catch { fail(safeError('parse', 'response', source, page)); return; }
          succeed({ parsed, statusCode: response.statusCode });
        });
      });
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
  const read = (page) => requestPage(context, config, source, page).then(({ parsed, statusCode }) => {
    const collection = config.collections[source];
    const pageContext = parsed && parsed.page_context;
    const rows = parsed && parsed[collection];
    const attestedOrg = parsed && parsed.organization_id;
    if (parsed?.code !== 0 || typeof attestedOrg !== 'string' || attestedOrg !== config.organizationId ||
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
    pages.push({ requestedOrganizationId: config.organizationId, attestedOrganizationId: attestedOrg,
      module: config.modules[source], page, method: 'GET', responseHttpStatus: statusCode,
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
      base.error = error && typeof error.category === 'string' ? error : safeError('diagnostic', 'execution');
    }
    try { basicIO.write(JSON.stringify(base)); } catch { /* native host owns output failures */ }
    return base;
  };
}

module.exports = { createNativeReadbackDiagnostic };
