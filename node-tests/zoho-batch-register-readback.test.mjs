import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createNativeReadbackDiagnostic } = require('../tools/zoho-batch-register-poc/native-readback-diagnostic.cjs');

const config = {
  organizationId: 'cf_demo_org',
  connectionName: 'cf_demo_connection',
  modules: { register: 'cm_demo_lots', movement: 'cm_demo_moves' },
  collections: { register: 'module_records', movement: 'module_records', item: 'items' },
  fields: {
    register: { id: 'cf_demo_id', itemId: 'cf_demo_item', status: 'cf_demo_status', date: 'cf_demo_date' },
    movement: { id: 'cf_demo_id', lotId: 'cf_demo_lot', itemId: 'cf_demo_item', key: 'cf_demo_key',
      type: 'cf_demo_type', quantity: 'cf_demo_quantity', date: 'cf_demo_date', reversal: 'cf_demo_reversal' },
    item: { id: 'item_id', unit: 'unit' },
  },
  expected: {
    movementId: 'cf_demo_movement_target', registerId: 'cf_demo_register_target', itemId: 'cf_demo_item_target',
    itemUnit: 'each', registerStatus: 'quarantine', registerDate: '2026-10-01',
    opening: { type: 'Opening Balance', date: '2026-09-30', key: 'cf_demo_opening_key', quantity: 0, reversal: '' },
  },
};

function page(organization_id, key, rows, number, more = false) {
  return { organization_id, code: 0, [key]: rows, page_context: { page: number, has_more_page: more } };
}

function connector(responses, calls = []) {
  return {
    calls,
    makeRequest(options, callback) {
      calls.push(options);
      const response = responses.shift();
      const request = {
        on(event, handler) { if (event === 'error') this.error = handler; if (event === 'timeout') this.timeout = handler; return this; },
        end() {
          queueMicrotask(() => {
            if (response instanceof Error) return request.error?.();
            const chunks = typeof response === 'string' ? [response] : [JSON.stringify(response)];
            const res = { statusCode: 200, on(event, handler) {
              if (event === 'data') chunks.forEach(handler);
              if (event === 'end') queueMicrotask(handler);
              return this;
            } };
            callback(res);
          });
        },
        destroy() {},
      };
      return request;
    },
  };
}

function records() {
  return {
    register: [
      page(config.organizationId, 'module_records', [{ cf_demo_id: 'cf_demo_register_other', cf_demo_item: 'cf_demo_other',
        cf_demo_status: 'available', cf_demo_date: '2026-09-01' }], 1, true),
      page(config.organizationId, 'module_records', [{ cf_demo_id: config.expected.registerId, cf_demo_item: config.expected.itemId,
        cf_demo_status: config.expected.registerStatus, cf_demo_date: config.expected.registerDate }], 2),
    ],
    movement: [
      page(config.organizationId, 'module_records', [{ cf_demo_id: 'cf_demo_movement_other', cf_demo_lot: 'cf_demo_other',
        cf_demo_key: 'cf_demo_other_key', cf_demo_type: 'Receipt', cf_demo_quantity: 1,
        cf_demo_date: '2026-09-01', cf_demo_reversal: '' }], 1, true),
      page(config.organizationId, 'module_records', [{ cf_demo_id: 'cf_demo_opening', cf_demo_lot: config.expected.registerId,
        cf_demo_key: 'cf_demo_receipt_key', cf_demo_type: 'Receipt', cf_demo_quantity: 1,
        cf_demo_date: config.expected.opening.date, cf_demo_reversal: '' },
      { cf_demo_id: config.expected.movementId, cf_demo_lot: config.expected.registerId, cf_demo_key: config.expected.opening.key,
        cf_demo_type: config.expected.opening.type, cf_demo_quantity: 0, cf_demo_date: config.expected.opening.date,
        cf_demo_reversal: '' }], 2),
    ],
    item: [
      page(config.organizationId, 'items', [{ item_id: 'cf_demo_item_other', unit: 'each' }], 1, true),
      page(config.organizationId, 'items', [{ item_id: config.expected.itemId, unit: config.expected.itemUnit }], 2),
    ],
  };
}

async function run(overrides = {}, mutate = () => {}) {
  const source = records();
  for (const rows of Object.values(source)) {
    for (const body of rows) {
      mutate(body);
      for (const key of ['items', 'module_records']) for (const record of body[key] ?? []) mutate(record);
    }
  }
  const responses = [source.register, source.movement, source.item].flat();
  const calls = [];
  const context = { getConnection: (name) => name === config.connectionName ? connector(responses, calls) : null };
  let output;
  const diagnostic = createNativeReadbackDiagnostic({ ...config, ...overrides });
  const result = await diagnostic(context, { write(value) { output = JSON.parse(value); } });
  return { result, output, calls };
}

test('native connector reads later pages sequentially and proves the explicit zero opening chain', async () => {
  const { result, output, calls } = await run();
  assert.equal(result.ok, true);
  assert.equal(output.identityReadbackPassed, true);
  assert.equal(output.selected.itemUnit, 'each');
  assert.equal(output.selected.movement.quantity, 0);
  assert.equal(calls.every((call) => call.method === 'GET'), true);
  assert.equal(calls.every((call) => call.url.startsWith('https://www.zohoapis.com/books/v3/')), true);
  assert.equal(calls.filter((call) => call.url.includes('/items?')).length, 2);
  assert.equal(calls.filter((call) => call.url.includes('organization_id=cf_demo_org')).length, 6);
  assert.equal(calls.length, 6);
  const itemProvenance = output.provenance.filter((entry) => entry.resource === 'items');
  assert.equal(itemProvenance.length, 2);
  assert.equal(itemProvenance.every((entry) => entry.module === 'items' &&
    typeof entry.requestStartedAt === 'string' && typeof entry.requestEndedAt === 'string'), true);
  assert.equal(itemProvenance.every((entry) => entry.requestStartedAt <= entry.requestEndedAt), true);
});

test('wrong scalar lookup and wrong unit are blocked without raw values', async () => {
  const wrongLookup = await run({}, (body) => {
    if (body.cf_demo_lot === config.expected.registerId) body.cf_demo_lot = 'private-marker';
  });
  assert.equal(wrongLookup.result.ok, false);
  assert.equal(wrongLookup.result.error.category, 'identity_mismatch');
  assert.doesNotMatch(JSON.stringify(wrongLookup.output), /private-marker/);
  const wrongUnit = await run({}, (body) => { if (body.unit) body.unit = 'box'; });
  assert.equal(wrongUnit.result.ok, false);
  assert.equal(wrongUnit.result.error.category, 'metadata_mismatch');
});

test('missing, object, duplicate, wrong envelope, later failure and cap fail closed', async () => {
  const missing = await run({}, (body) => { if (body.cf_demo_quantity === 0) delete body.cf_demo_quantity; });
  assert.equal(missing.result.ok, false);
  const objectLookup = await run({}, (body) => { if (body.cf_demo_lot) body.cf_demo_lot = {}; });
  assert.equal(objectLookup.result.ok, false);
  const duplicate = await run({}, (body) => { if (body.cf_demo_id === config.expected.registerId) body.cf_demo_id = 'cf_demo_opening'; });
  assert.equal(duplicate.result.ok, false);
  const malformed = await run({}, (body) => { if (body.page_context) body.page_context.has_more_page = 'false'; });
  assert.equal(malformed.result.ok, false);
  const cap = await run({}, (body) => { if (body.page_context) body.page_context.has_more_page = true; });
  assert.equal(cap.result.ok, false);
  assert.equal(typeof cap.result.error.category, 'string');
});

test('construction does not request and rejects unknown top-level configuration', async () => {
  let called = false;
  const diagnostic = createNativeReadbackDiagnostic(config);
  assert.equal(called, false);
  await assert.rejects(async () => createNativeReadbackDiagnostic({ ...config, unknown: true }));
  await assert.rejects(async () => createNativeReadbackDiagnostic({ ...config, connectionName: '../token' }));
});

test('configuration rejects private collection and non-native item field aliases', async () => {
  await assert.rejects(async () => createNativeReadbackDiagnostic({
    ...config, collections: { ...config.collections, item: 'private_rows' },
  }));
  await assert.rejects(async () => createNativeReadbackDiagnostic({
    ...config, fields: { ...config.fields, item: { id: 'cf_demo_id', unit: 'unit' } },
  }));
});

test('configuration rejects unsafe field property names and invalid dates', async () => {
  const unsafeFields = { ...config.fields.register };
  Object.defineProperty(unsafeFields, '__proto__', { value: 'private_marker', enumerable: true });
  await assert.rejects(async () => createNativeReadbackDiagnostic({
    ...config, fields: { ...config.fields, register: unsafeFields },
  }));
  await assert.rejects(async () => createNativeReadbackDiagnostic({
    ...config, expected: { ...config.expected, opening: { ...config.expected.opening, date: 'not-a-date' } },
  }));
});

test('constructor rejects unsafe register field-name values before any connection use', () => {
  for (const unsafeName of ['__proto__', 'prototype', 'constructor']) {
    assert.throws(() => createNativeReadbackDiagnostic({
      ...config,
      fields: { ...config.fields, register: { ...config.fields.register, id: unsafeName } },
    }), TypeError);
  }
});

test('constructor rejects unsafe movement field-name values before any connection use', () => {
  for (const unsafeName of ['__proto__', 'prototype', 'constructor']) {
    assert.throws(() => createNativeReadbackDiagnostic({
      ...config,
      fields: { ...config.fields, movement: { ...config.fields.movement, id: unsafeName } },
    }), TypeError);
  }
});

test('absent organization attestation is explicit and a selected receipt cannot pass as opening', async () => {
  const unattested = await run({}, (body) => { delete body.organization_id; });
  assert.equal(unattested.result.ok, true);
  assert.equal(unattested.output.accountScopeVerified, false);
  assert.equal(unattested.output.provenance.every((entry) => entry.attestedOrganizationId === null), true);

  const receipt = await run({}, (body) => {
    if (body.cf_demo_id === config.expected.movementId) {
      body.cf_demo_type = 'Receipt';
      body.cf_demo_quantity = 1;
    }
  });
  assert.equal(receipt.result.ok, false);
  assert.equal(receipt.result.error.category, 'opening_count');
});

test('factory owns an immutable recursive configuration snapshot', async () => {
  const mutable = {
    ...config,
    modules: { ...config.modules },
    expected: { ...config.expected, opening: { ...config.expected.opening } },
  };
  const diagnostic = createNativeReadbackDiagnostic(mutable);
  mutable.modules.register = 'cm_private_mutation';
  mutable.expected.opening.date = 'not-a-date';
  const source = records();
  const responses = [source.register, source.movement, source.item].flat();
  const calls = [];
  const result = await diagnostic(
    { getConnection: () => connector(responses, calls) },
    { write() {} },
  );
  assert.equal(result.ok, true);
  assert.match(calls[0].url, /cm_demo_lots/);
  assert.doesNotMatch(calls[0].url, /private_mutation/);
});

test('response accessor failures become bounded rejections without uncaught events', async () => {
  const events = [];
  const onUncaught = (error) => events.push(error);
  process.once('uncaughtException', onUncaught);
  const request = {
    on() { return this; },
    end() {
      queueMicrotask(() => diagnosticCallback({
        get statusCode() { throw new Error('private status marker'); },
        on() { return this; },
      }));
    },
    destroy() {},
  };
  let diagnosticCallback;
  const diagnostic = createNativeReadbackDiagnostic(config);
  const resultPromise = diagnostic(
    { getConnection: () => ({ makeRequest(_options, callback) {
      diagnosticCallback = callback;
      return request;
    } }) },
    { write() {} },
  );
  const result = await resultPromise;
  await new Promise((resolve) => setImmediate(resolve));
  process.removeListener('uncaughtException', onUncaught);
  assert.equal(result.ok, false);
  assert.equal(events.length, 0);
  assert.doesNotMatch(JSON.stringify(result), /private status marker/);
});
