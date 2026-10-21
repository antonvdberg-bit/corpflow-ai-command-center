import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeBooksPageTransport } from '../tools/zoho-batch-register-poc/native-books-page-adapter.mjs';
import { previewBooksRecords } from '../tools/zoho-batch-register-poc/books-preview-adapter.mjs';
import fixture from '../tools/zoho-batch-register-poc/fixtures/native-books-pages.synthetic.json' with { type: 'json' };

const orgId = 'synthetic-org';
const modules = { item: 'cm_demo_items', register: 'cm_demo_lots', movement: 'cm_demo_moves' };
const field = (record, name) => record[name];
const scalar = (value, name) => {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${name} must be a nonblank scalar`);
  return value;
};
const pagesRecords = (pages, source, key) => pages[source].flatMap((page) => page[key]);
const canonicalItem = (pages, itemId) => {
  const matches = pagesRecords(pages, 'item', 'items')
    .filter((record) => field(record, 'cf_demo_item') === itemId);
  if (matches.length !== 1) throw new TypeError(`canonical item lookup is not unique: ${itemId}`);
  return matches[0];
};
const itemPolicy = (record) => {
  const entries = (record.custom_fields ?? []).filter(({ api_name }) => api_name === 'cf_demo_expiry_policy');
  const values = entries.map(({ value }) => value);
  if (new Set(values).size > 1) throw new TypeError('conflicting canonical item policy');
  return values[0];
};

function makeSources(pages) {
  return {
    item: { module: modules.item, recordsKey: 'items', mapRecord: (record) => ({
      id: scalar(field(record, 'cf_demo_id'), 'item id'),
      org: scalar(field(record, 'cf_demo_org'), 'item organization'),
      item: scalar(field(record, 'cf_demo_item'), 'canonical item'),
      unit: scalar(field(record, 'cf_demo_unit'), 'canonical item unit'),
      policy: itemPolicy(record),
    }) },
    register: { module: modules.register, recordsKey: 'module_records', mapRecord: (record) => {
      const id = scalar(field(record, 'cf_demo_id'), 'register id');
      const nativeItem = scalar(field(record, 'cf_demo_item'), 'register item');
      const item = canonicalItem(pages, nativeItem);
      const evidence = pages.evidenceByBatchId[id];
      if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
        throw new TypeError(`missing evidence for ${id}`);
      }
      for (const key of ['openingQuantity', 'verified', 'date', 'sequence', 'reservedQuantity', 'canonicalItemId', 'unit']) {
        if (evidence[key] === undefined || evidence[key] === null || evidence[key] === '') {
          throw new TypeError(`missing evidence ${key}`);
        }
      }
      if (evidence.verified !== true || evidence.canonicalItemId !== nativeItem ||
          evidence.unit !== item.cf_demo_unit) throw new TypeError('invalid register evidence binding');
      if (field(record, 'cf_demo_unit') !== undefined && field(record, 'cf_demo_unit') !== evidence.unit) {
        throw new TypeError('register unit mismatch');
      }
      return {
        id, org: scalar(field(record, 'cf_demo_org'), 'register organization'), item: nativeItem,
        lot: scalar(field(record, 'cf_demo_lot'), 'register lot'), unit: evidence.unit,
        status: field(record, 'cf_demo_status'), expiry: field(record, 'cf_demo_expiry'),
        opening: evidence.openingQuantity, verified: evidence.verified, baselineDate: evidence.date,
        baselineSequence: evidence.sequence, reserved: evidence.reservedQuantity,
        received: field(record, 'cf_demo_received'),
      };
    } },
    movement: { module: modules.movement, recordsKey: 'module_records', mapRecord: (record) => {
      const type = scalar(field(record, 'cf_demo_type'), 'movement type');
      if (!['receipt', 'allocation', 'reversal'].includes(type)) throw new TypeError(`unknown movement type: ${type}`);
      return {
        id: scalar(field(record, 'cf_demo_id'), 'movement id'),
        org: scalar(field(record, 'cf_demo_org'), 'movement organization'),
        key: scalar(field(record, 'cf_demo_key'), 'movement key'),
        item: scalar(field(record, 'cf_demo_item'), 'movement item'),
        lot: scalar(field(record, 'cf_demo_lot'), 'movement lot'),
        unit: scalar(field(record, 'cf_demo_unit'), 'movement unit'),
        type, quantity: field(record, 'cf_demo_quantity'), date: field(record, 'cf_demo_date'),
        sequence: field(record, 'cf_demo_sequence'), reversalOf: field(record, 'cf_demo_reversal_of'),
      };
    } },
  };
}

const genericMap = {
  item: { module: modules.item, fields: { id: 'id', orgId: 'org', itemId: 'item', unit: 'unit', policy: 'policy' } },
  register: { module: modules.register, fields: {
    id: 'id', orgId: 'org', itemId: 'item', lotNumber: 'lot', unit: 'unit', status: 'status',
    expiryDate: 'expiry', baselineQuantity: 'opening', baselineVerified: 'verified',
    baselineDate: 'baselineDate', baselineSequence: 'baselineSequence', reservedQuantity: 'reserved',
    receivedDate: 'received',
  } },
  movement: { module: modules.movement, fields: {
    id: 'id', orgId: 'org', movementKey: 'key', itemId: 'item', lotNumber: 'lot', unit: 'unit',
    type: 'type', quantity: 'quantity', date: 'date', sequence: 'sequence', reversalOf: 'reversalOf',
  } },
};

function transportFrom(pages = fixture) {
  const calls = [];
  const transport = createNativeBooksPageTransport({
    orgId, sources: makeSources(pages),
    async readPage({ module, page }) {
      calls.push({ module, page });
      const source = Object.entries(modules).find(([, value]) => value === module)[0];
      return { orgId, module, page, body: structuredClone(pages[source][page - 1]) };
    },
  });
  return { transport, calls };
}

function request(overrides = {}) {
  const { transport, calls } = transportFrom();
  return {
    transport, calls, orgId, asOfDate: '2026-10-18', itemId: 'synthetic-item',
    unit: 'each', quantity: 8, map: genericMap, ...overrides,
  };
}

test('A: native pages map through the generic preview and preserve fixtures', async () => {
  const original = structuredClone(fixture);
  const input = request();
  const result = await previewBooksRecords(input);
  assert.deepEqual(result.proposedSplit.map(({ lotNumber, quantity }) => [lotNumber, quantity]), [['A', 6], ['B', 2]]);
  assert.equal(result.physicalQuantity, 16);
  assert.deepEqual(fixture, original);
  assert.deepEqual(Object.keys(input.transport), ['fetchPage']);
  assert.deepEqual(input.calls.map(({ module, page }) => [module, page]).sort((left, right) =>
    `${left[1]}-${left[0]}`.localeCompare(`${right[1]}-${right[0]}`)), [
    [modules.item, 1], [modules.register, 1], [modules.movement, 1],
    [modules.item, 2], [modules.register, 2], [modules.movement, 2],
  ].sort((left, right) => `${left[1]}-${left[0]}`.localeCompare(`${right[1]}-${right[0]}`)));
});
test('B: canonical policy controls exempt FIFO and review blocks caller exemptions', async () => {
  const pages = structuredClone(fixture);
  pages.item[1].items[0].custom_fields[0].value = 'not_applicable';
  pages.register[0].module_records[0].cf_demo_expiry = undefined;
  const exempt = await previewBooksRecords(request({ ...transportFrom(pages), quantity: 8 }));
  assert.deepEqual(exempt.proposedSplit.map(({ lotNumber }) => lotNumber), ['A', 'B']);
  pages.register[0].module_records[0].cf_demo_expiry = '2020-01-01';
  const legacy = await previewBooksRecords(request({ ...transportFrom(pages), quantity: 8 }));
  assert.deepEqual(legacy.proposedSplit.map(({ lotNumber }) => lotNumber), ['A', 'B']);
  pages.item[1].items[0].custom_fields[0].value = 'unknown';
  const review = await previewBooksRecords(request({ ...transportFrom(pages), itemPolicyContext: { 'synthetic-item': 'not_applicable' } }));
  assert.equal(review.proposedSplit.length, 0);
  assert.match(review.blockers.join(' '), /Classification required/);
});

test('C: missing verified evidence, lookup, unit, or movement encoding blocks', async () => {
  const pages = structuredClone(fixture);
  pages.register[0].module_records[0].cf_demo_id = 'missing-evidence';
  await assert.rejects(() => previewBooksRecords(request({ ...transportFrom(pages) })), /native register mapping failed/);
  pages.register[0].module_records[0].cf_demo_id = 'lot-a';
  pages.item[1].items[0].cf_demo_unit = 'pint';
  await assert.rejects(() => previewBooksRecords(request({ ...transportFrom(pages) })), /native register mapping failed/);
  pages.item[1].items[0].cf_demo_unit = 'each';
  pages.movement[0].module_records = [{ cf_demo_id: 'm', cf_demo_key: 'm', cf_demo_org: orgId, cf_demo_item: 'synthetic-item', cf_demo_lot: 'A', cf_demo_unit: 'each', cf_demo_type: 'mystery', cf_demo_quantity: 1, cf_demo_date: '2026-10-02', cf_demo_sequence: 1 }];
  await assert.rejects(() => previewBooksRecords(request({ ...transportFrom(pages) })), /native movement mapping failed/);
});

test('C: direct supplied-page identity, evidence, and policy mutations fail closed', async () => {
  const mutations = [
    (pages) => { pages.register[0].module_records[0].cf_demo_item = 'other-item'; },
    (pages) => { delete pages.register[0].module_records[0].cf_demo_item; },
    (pages) => { delete pages.evidenceByBatchId['lot-a'].verified; },
    (pages) => { delete pages.evidenceByBatchId['lot-a'].reservedQuantity; },
    (pages) => { delete pages.evidenceByBatchId['lot-a'].openingQuantity; },
    (pages) => { delete pages.evidenceByBatchId['lot-a'].date; },
    (pages) => { delete pages.evidenceByBatchId['lot-a'].sequence; },
    (pages) => { delete pages.evidenceByBatchId['lot-a'].canonicalItemId; },
    (pages) => { delete pages.evidenceByBatchId['lot-a'].unit; },
    (pages) => { pages.item[1].items[0].custom_fields.push({ api_name: 'cf_demo_expiry_policy', value: 'not_applicable' }); },
    (pages) => { pages.evidenceByBatchId['lot-a'].canonicalItemId = 'other-item'; },
    (pages) => { pages.item[1].items[0].cf_demo_unit = 'box'; },
    (pages) => { pages.item[0].items[0].cf_demo_item = 'synthetic-item'; },
  ];
  for (const mutate of mutations) {
    const pages = structuredClone(fixture);
    mutate(pages);
    await assert.rejects(
      () => previewBooksRecords(request({ ...transportFrom(pages) })),
      /native (item|register) mapping failed/,
    );
  }
});

test('C: zero opening, reservation, quarantine, FIFO, and later-page failures use supplied pages', async () => {
  const zero = structuredClone(fixture);
  zero.evidenceByBatchId['lot-a'].openingQuantity = 0;
  zero.movement[1].module_records.find((record) => record.cf_demo_lot === 'A' && record.cf_demo_type === 'receipt').cf_demo_quantity = 4;
  const zeroResult = await previewBooksRecords(request({ ...transportFrom(zero), quantity: 3 }));
  assert.equal(zeroResult.physicalQuantity, 13);
  assert.deepEqual(zeroResult.proposedSplit.map(({ lotNumber, quantity }) => [lotNumber, quantity]), [['A', 3]]);

  const reserved = structuredClone(fixture);
  reserved.evidenceByBatchId['lot-a'].reservedQuantity = 2;
  const reservedResult = await previewBooksRecords(request({ ...transportFrom(reserved) }));
  assert.deepEqual(reservedResult.proposedSplit.map(({ lotNumber, quantity }) => [lotNumber, quantity]), [['A', 4], ['B', 4]]);

  const quarantined = structuredClone(fixture);
  quarantined.register[0].module_records[0].cf_demo_status = 'quarantined';
  const quarantinedResult = await previewBooksRecords(request({ ...transportFrom(quarantined) }));
  assert.deepEqual(quarantinedResult.proposedSplit.map(({ lotNumber, quantity }) => [lotNumber, quantity]), [['B', 8]]);

  const fifo = structuredClone(fixture);
  fifo.item[1].items[0].custom_fields[0].value = 'not_applicable';
  fifo.register[0].module_records[0].cf_demo_received = '2026-11-01';
  fifo.register[1].module_records[0].cf_demo_received = '2026-09-01';
  const fifoResult = await previewBooksRecords(request({ ...transportFrom(fifo), quantity: 12 }));
  assert.deepEqual(fifoResult.proposedSplit.map(({ lotNumber }) => lotNumber), ['B', 'A']);

  const laterFailure = structuredClone(fixture);
  laterFailure.movement[1].module_records[0].cf_demo_unit = undefined;
  await assert.rejects(
    () => previewBooksRecords(request({ ...transportFrom(laterFailure) })),
    /native movement mapping failed/,
  );
});

test('D/E: malformed native pages and unsafe ordering fail closed', async () => {
  const malformed = structuredClone(fixture);
  malformed.item[0].code = '0';
  await assert.rejects(() => previewBooksRecords(request({ ...transportFrom(malformed) })), /envelope/);
  const input = request();
  await assert.rejects(() => input.transport.fetchPage({ source: 'item', module: modules.item, orgId, page: 2, cursor: 2 }), /order mismatch/);
  await assert.rejects(() => input.transport.fetchPage({ source: 'item', module: modules.item, orgId, page: 0 }), /positive safe integer/);
  await assert.rejects(() => input.transport.fetchPage({ source: 'unknown', module: modules.item, orgId, page: 1 }), /unknown native source/);
  const empty = structuredClone(fixture);
  empty.movement = [{ code: 0, module_records: [], page_context: { page: 1, has_more_page: false } }];
  const result = await previewBooksRecords(request({ ...transportFrom(empty), quantity: 1 }));
  assert.equal(result.physicalQuantity, 13);
  assert.notEqual(result.physicalQuantity, 0);
});

function bridgeSources(itemMap) {
  return {
    item: { module: modules.item, recordsKey: 'items', mapRecord: itemMap },
    register: { module: modules.register, recordsKey: 'module_records', mapRecord: (record) => ({ id: record.id }) },
    movement: { module: modules.movement, recordsKey: 'module_records', mapRecord: (record) => ({ id: record.id }) },
  };
}

function bridgeTransport(itemMap, record = { id: 'synthetic-item' }, bodyOverrides = {}) {
  return createNativeBooksPageTransport({
    orgId,
    sources: bridgeSources(itemMap),
    readPage: async ({ module, page }) => ({
      orgId, module, page,
      body: {
        code: 0,
        items: module === modules.item ? [record] : [],
        module_records: [],
        page_context: { page, has_more_page: false },
        ...bodyOverrides,
      },
    }),
  });
}

async function assertSafeMappingFailure(run) {
  await assert.rejects(run, (error) => {
    assert.equal(error.name, 'TypeError');
    assert.equal(error.message, 'native item mapping failed');
    assert.doesNotMatch(error.message, /SYNTHETIC_PRIVATE_MARKER|private-value/);
    return true;
  });
}

test('E: native input clone, callback, async callback, wrong result, exact input, and output clone failures redact safely', async () => {
  await assertSafeMappingFailure(() => bridgeTransport(() => ({ id: 'ok' }), { private: () => 'SYNTHETIC_PRIVATE_MARKER' })
    .fetchPage({ source: 'item', module: modules.item, orgId, page: 1 }));
  await assertSafeMappingFailure(() => bridgeTransport(() => {
    throw new Error('private-value SYNTHETIC_PRIVATE_MARKER');
  }).fetchPage({ source: 'item', module: modules.item, orgId, page: 1 }));
  const asyncInput = { id: 'async', nested: { value: 1 } };
  const asyncResult = await bridgeTransport(async (record) => ({ ...record, detached: true }), asyncInput)
    .fetchPage({ source: 'item', module: modules.item, orgId, page: 1 });
  assert.deepEqual(asyncResult.records, [{ ...asyncInput, detached: true }]);
  assert.deepEqual(asyncInput, { id: 'async', nested: { value: 1 } });
  await assertSafeMappingFailure(() => bridgeTransport(() => 'wrong')
    .fetchPage({ source: 'item', module: modules.item, orgId, page: 1 }));
  await assertSafeMappingFailure(() => bridgeTransport((record) => record)
    .fetchPage({ source: 'item', module: modules.item, orgId, page: 1 }));
  await assertSafeMappingFailure(() => bridgeTransport(() => ({ private: () => 'SYNTHETIC_PRIVATE_MARKER' }))
    .fetchPage({ source: 'item', module: modules.item, orgId, page: 1 }));
});

test('E: rejected async mapper is bounded without an unhandled rejection', async () => {
  const unhandled = [];
  const listener = (error) => unhandled.push(error);
  process.on('unhandledRejection', listener);
  try {
    await assertSafeMappingFailure(() => bridgeTransport(async () => {
      throw new Error('SYNTHETIC_PRIVATE_MARKER');
    }).fetchPage({ source: 'item', module: modules.item, orgId, page: 1 }));
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(unhandled, []);
  } finally {
    process.off('unhandledRejection', listener);
  }
});

test('D: receipt provenance and envelope shape are validated before records are mapped', async () => {
  const calls = [];
  const transport = createNativeBooksPageTransport({
    orgId,
    sources: bridgeSources((record) => ({ id: record.id })),
    readPage: async ({ module, page }) => {
      calls.push({ module, page });
      return { orgId: 'wrong-org', module, page, body: { code: 0, items: [], page_context: { page, has_more_page: false } } };
    },
  });
  await assert.rejects(() => transport.fetchPage({ source: 'item', module: modules.item, orgId, page: 1 }), /native item receipt failed/);
  assert.deepEqual(calls, [{ module: modules.item, page: 1 }]);
  await assert.rejects(() => bridgeTransport((record) => ({ id: record.id }), { id: 'x' }, {
    code: '0',
  }).fetchPage({ source: 'item', module: modules.item, orgId, page: 1 }), /native item envelope failed/);
});

test('D: malformed native pagination and duplicate IDs fail closed', async () => {
  const malformedBodies = [
    { code: undefined },
    { code: 1 },
    { code: '0' },
    { items: undefined },
    { items: {}, page_context: { page: 1, has_more_page: false } },
    { items: [], page_context: undefined },
    { items: [], page_context: { page: 1, has_more_page: 'false' } },
  ];
  for (const body of malformedBodies) {
    const transport = bridgeTransport((record) => ({ id: record.id }), { id: 'x' }, body);
    await assert.rejects(
      () => transport.fetchPage({ source: 'item', module: modules.item, orgId, page: 1 }),
      /native item envelope failed/,
    );
  }

  const transport = bridgeTransport((record) => ({ id: record.id }));
  await assert.rejects(() => transport.fetchPage({ source: 'item', module: modules.item, orgId, page: 2 }), /order mismatch/);
  await assert.rejects(() => transport.fetchPage({ source: 'item', module: modules.item, orgId, page: 1, cursor: 2 }), /order mismatch|cursor mismatch/);
  await assert.rejects(() => transport.fetchPage({ source: 'item', module: modules.item, orgId: 'other-org', page: 1 }), /organization mismatch/);
  await assert.rejects(() => transport.fetchPage({ source: 'item', module: 'other-module', orgId, page: 1 }), /module mismatch/);
  await assert.rejects(() => transport.fetchPage({ source: 'item', module: modules.item, orgId, page: 0 }), /positive safe integer/);

  const duplicate = structuredClone(fixture);
  duplicate.register[1].module_records[0].cf_demo_id = 'lot-a';
  await assert.rejects(
    () => previewBooksRecords(request({ ...transportFrom(duplicate) })),
    /duplicate register record ID/,
  );
});
