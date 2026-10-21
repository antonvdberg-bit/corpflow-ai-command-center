import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeBooksPageTransport } from '../tools/zoho-batch-register-poc/native-books-page-adapter.mjs';
import { previewBooksRecords } from '../tools/zoho-batch-register-poc/books-preview-adapter.mjs';
import fixture from '../tools/zoho-batch-register-poc/fixtures/native-books-pages.synthetic.json' with { type: 'json' };

const orgId = 'synthetic-org';
const modules = { item: 'cm_demo_items', register: 'cm_demo_lots', movement: 'cm_demo_moves' };
const field = (record, name) => record[name];
const policy = (record) => record.custom_fields.find(({ api_name }) => api_name === 'cf_demo_expiry_policy')?.value;

const sources = {
  item: { module: modules.item, recordsKey: 'items', mapRecord: (record) => ({
    id: field(record, 'cf_demo_id'), org: field(record, 'cf_demo_org'), item: field(record, 'cf_demo_item'),
    unit: field(record, 'cf_demo_unit'), policy: policy(record),
  }) },
  register: { module: modules.register, recordsKey: 'module_records', mapRecord: (record) => ({
    id: field(record, 'cf_demo_id'), org: field(record, 'cf_demo_org'), item: field(record, 'cf_demo_item'),
    lot: field(record, 'cf_demo_lot'), unit: field(record, 'cf_demo_unit'), status: field(record, 'cf_demo_status'),
    expiry: field(record, 'cf_demo_expiry'), opening: field(record, 'cf_demo_opening'),
    verified: field(record, 'cf_demo_opening_verified'), baselineDate: field(record, 'cf_demo_opening_date'),
    baselineSequence: field(record, 'cf_demo_opening_sequence'), reserved: field(record, 'cf_demo_reserved'),
    received: field(record, 'cf_demo_received'),
  }) },
  movement: { module: modules.movement, recordsKey: 'module_records', mapRecord: (record) => ({
    id: field(record, 'cf_demo_id'), org: field(record, 'cf_demo_org'), key: field(record, 'cf_demo_key'),
    item: field(record, 'cf_demo_item'), lot: field(record, 'cf_demo_lot'), unit: field(record, 'cf_demo_unit'),
    type: field(record, 'cf_demo_type'), quantity: field(record, 'cf_demo_quantity'),
    date: field(record, 'cf_demo_date'), sequence: field(record, 'cf_demo_sequence'),
    reversalOf: field(record, 'cf_demo_reversal_of'),
  }) },
};

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
    orgId, sources,
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
  assert.deepEqual(input.calls.map(({ module, page }) => [module, page]), [
    [modules.item, 1], [modules.register, 1], [modules.movement, 1], [modules.register, 2],
  ]);
});
test('B: canonical policy controls exempt FIFO and review blocks caller exemptions', async () => {
  const pages = structuredClone(fixture);
  pages.item[0].items[0].custom_fields[0].value = 'not_applicable';
  pages.register[0].module_records[0].cf_demo_expiry = undefined;
  const exempt = await previewBooksRecords(request({ ...transportFrom(pages), quantity: 8 }));
  assert.deepEqual(exempt.proposedSplit.map(({ lotNumber }) => lotNumber), ['A', 'B']);
  pages.item[0].items[0].custom_fields[0].value = 'unknown';
  const review = await previewBooksRecords(request({ ...transportFrom(pages), itemPolicyContext: { 'synthetic-item': 'not_applicable' } }));
  assert.equal(review.proposedSplit.length, 0);
  assert.match(review.blockers.join(' '), /Classification required/);
});

test('C: missing verified evidence, lookup, unit, or movement encoding blocks', async () => {
  const pages = structuredClone(fixture);
  pages.register[0].module_records[0].cf_demo_opening_verified = false;
  await assert.rejects(() => previewBooksRecords(request({ ...transportFrom(pages) })), /opening baseline/);
  pages.register[0].module_records[0].cf_demo_opening_verified = true;
  pages.register[0].module_records[0].cf_demo_unit = undefined;
  await assert.rejects(() => previewBooksRecords(request({ ...transportFrom(pages) })), /unit/);
  pages.register[0].module_records[0].cf_demo_unit = 'each';
  pages.movement[0].module_records = [{ cf_demo_id: 'm', cf_demo_key: 'm', cf_demo_org: orgId, cf_demo_item: 'synthetic-item', cf_demo_lot: 'A', cf_demo_unit: 'each', cf_demo_type: 'mystery', cf_demo_quantity: 1, cf_demo_date: '2026-10-02', cf_demo_sequence: 1 }];
  await assert.rejects(() => previewBooksRecords(request({ ...transportFrom(pages) })), /unsupported movement type/);
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
  empty.register[0].module_records = [];
  const result = await previewBooksRecords(request({ ...transportFrom(empty), quantity: 1 }));
  assert.equal(result.physicalQuantity, 10);
  assert.notEqual(result.physicalQuantity, 0);
});
