import test from 'node:test';
import assert from 'node:assert/strict';
import { previewBooksRecords } from '../tools/zoho-batch-register-poc/books-preview-adapter.mjs';

test('rejects old movement sequences even when their dates follow the opening cutoff', async () => {
  const opening = [{ ...lots[0], baselineSequence: 100 }];
  const movements = [{
    id: 'old-sequence', org: 'synthetic-org', key: 'old-sequence', item: 'synthetic-item',
    lot: 'A', unit: 'each', type: 'receipt', quantity: 5, date: '2026-10-01', sequence: 1,
  }];
  await assert.rejects(() => previewBooksRecords(request({
    transport: transport(opening, movements), quantity: 1,
  })), /opening baseline boundary/);
});

test('reserves newly received stock against the replayed current balance', async () => {
  const opening = [{ ...lots[0], opening: 0, reserved: 5 }];
  const movements = [{
    id: 'new-receipt', org: 'synthetic-org', key: 'new-receipt', item: 'synthetic-item',
    lot: 'A', unit: 'each', type: 'receipt', quantity: 10, date: '2026-10-01', sequence: 1,
  }];
  const input = structuredClone({ opening, movements });
  const result = await previewBooksRecords(request({ transport: transport(opening, movements), quantity: 6 }));
  assert.equal(result.physicalQuantity, 10);
  assert.equal(result.availableQuantity, 5);
  assert.equal(result.shortage, 1);
  assert.deepEqual({ opening, movements }, input);
});

test('rejects reservations exceeding the balance after all movements are replayed', async () => {
  const opening = [{ ...lots[0], opening: 0, reserved: 11 }];
  const movements = [{
    id: 'new-receipt', org: 'synthetic-org', key: 'new-receipt', item: 'synthetic-item',
    lot: 'A', unit: 'each', type: 'receipt', quantity: 10, date: '2026-10-01', sequence: 1,
  }];
  await assert.rejects(() => previewBooksRecords(request({
    transport: transport(opening, movements), quantity: 1,
  })), /current balance/);
});

test('rejects a reversal sequence preceding its original despite a later date', async () => {
  const movements = [
    { id: 'allocation', org: 'synthetic-org', key: 'allocation', item: 'synthetic-item', lot: 'A', unit: 'each', type: 'allocation', quantity: 2, date: '2026-10-01', sequence: 2 },
    { id: 'reversal', org: 'synthetic-org', key: 'reversal', item: 'synthetic-item', lot: 'A', unit: 'each', type: 'reversal', quantity: 2, date: '2026-10-02', sequence: 1, reversalOf: 'allocation' },
  ];
  await assert.rejects(() => previewBooksRecords(request({
    transport: transport([lots[0]], movements), quantity: 1,
  })), /reversal sequence/);
});

const map = {
  register: { module: 'SyntheticLotRegister', fields: {
    id: 'id', orgId: 'org', itemId: 'item', lotNumber: 'lot', unit: 'unit', status: 'status',
    expiryDate: 'expiry', baselineQuantity: 'opening', baselineVerified: 'verified',
    baselineDate: 'baselineDate', baselineSequence: 'baselineSequence',
    reservedQuantity: 'reserved', receivedDate: 'received',
  } },
  movement: { module: 'SyntheticLotMovement', fields: {
    id: 'id', orgId: 'org', movementKey: 'key', itemId: 'item', lotNumber: 'lot', unit: 'unit',
    type: 'type', quantity: 'quantity', date: 'date', sequence: 'sequence', reversalOf: 'reversalOf',
  } },
};

const lots = [
  { id: 'a', org: 'synthetic-org', item: 'synthetic-item', lot: 'A', unit: 'each', status: 'available', expiry: '2026-12-01', opening: 6, reserved: 0, verified: true, baselineDate: '2026-09-01', baselineSequence: 0, received: '2026-09-01' },
  { id: 'b', org: 'synthetic-org', item: 'synthetic-item', lot: 'B', unit: 'each', status: 'available', expiry: '2027-03-01', opening: 10, reserved: 0, verified: true, baselineDate: '2026-10-01', baselineSequence: 0, received: '2026-10-01' },
];

function transport(records = lots, movements = []) {
  const calls = [];
  return {
    calls,
    async fetchPage(request) {
      calls.push(request);
      const source = request.source;
      const pages = source === 'register' ? [records] : [movements];
      const index = request.cursor ? 1 : 0;
      return { records: pages[index] ?? [], hasMore: index === 0 && pages.length > 1, ...(index === 0 && pages.length > 1 ? { nextCursor: 'next' } : {}) };
    },
  };
}

const request = (overrides = {}) => ({
  transport: transport(), orgId: 'synthetic-org', asOfDate: '2026-10-18',
  itemId: 'synthetic-item', unit: 'each', quantity: 8, map, ...overrides,
});

test('adapts paginated synthetic records into an earliest-expiry split', async () => {
  const result = await previewBooksRecords(request());
  assert.equal(result.synthetic, true);
  assert.deepEqual(result.proposedSplit.map(({ lotNumber, quantity }) => [lotNumber, quantity]), [['A', 6], ['B', 2]]);
  assert.equal(result.physicalQuantity, 16);
});

test('fetches every page and makes no write call', async () => {
  const twoPageTransport = transport(lots, []);
  const original = twoPageTransport.fetchPage;
  twoPageTransport.fetchPage = async (requestValue) => {
    if (requestValue.source === 'register' && !requestValue.cursor) {
      const first = await original(requestValue);
      return { ...first, records: [lots[0]], hasMore: true, nextCursor: 'register-2' };
    }
    if (requestValue.source === 'register') return { records: [lots[1]], hasMore: false };
    return original(requestValue);
  };
  const result = await previewBooksRecords(request({ transport: twoPageTransport }));
  assert.equal(result.proposedSplit.length, 2);
  assert.equal(twoPageTransport.calls?.some(({ method }) => method), false);
});

test('blocks missing baseline, identity mismatch, expired and incompatible stock', async () => {
  await assert.rejects(() => previewBooksRecords(request({ transport: transport([{ ...lots[0], verified: false }]) })), /opening baseline/);
  await assert.rejects(() => previewBooksRecords(request({ transport: transport([{ ...lots[0], org: 'other-org' }]) })), /organization mismatch/);
  await assert.rejects(() => previewBooksRecords(request({ unit: 'pint' })), /unknown or incompatible/);
  const excluded = await previewBooksRecords(request({ transport: transport([{ ...lots[0], status: 'quarantine', expiry: '2026-10-01' }]), quantity: 1 }));
  assert.equal(excluded.shortage, 1);
  assert.equal(excluded.exclusions.length, 1);
});

test('replays receipt and allocation reversal without mutating input records', async () => {
  const movements = [
    { id: 'm1', org: 'synthetic-org', key: 'receipt-1', item: 'synthetic-item', lot: 'A', unit: 'each', type: 'receipt', quantity: 5, date: '2026-10-02', sequence: 1 },
    { id: 'm2', org: 'synthetic-org', key: 'allocation-1', item: 'synthetic-item', lot: 'A', unit: 'each', type: 'allocation', quantity: 2, date: '2026-10-03', sequence: 2 },
    { id: 'm3', org: 'synthetic-org', key: 'reversal-1', item: 'synthetic-item', lot: 'A', unit: 'each', type: 'reversal', quantity: 2, date: '2026-10-04', sequence: 3, reversalOf: 'm2' },
  ];
  const input = structuredClone(movements);
  const result = await previewBooksRecords(request({ transport: transport(lots, movements), quantity: 15 }));
  assert.equal(result.physicalQuantity, 21);
  assert.deepEqual(movements, input);
});

test('rejects malformed, future, duplicate-key, dangling and non-allocation reversals', async () => {
  await assert.rejects(() => previewBooksRecords(request({ transport: { fetchPage: async () => ({ records: [], hasMore: true }) } })), /nextCursor/);
  const future = [{ id: 'm', org: 'synthetic-org', key: 'k', item: 'synthetic-item', lot: 'A', unit: 'each', type: 'receipt', quantity: 1, date: '2027-01-01', sequence: 1 }];
  await assert.rejects(() => previewBooksRecords(request({ transport: transport(lots, future) })), /future/);
  const dangling = [{ id: 'r', org: 'synthetic-org', key: 'r', item: 'synthetic-item', lot: 'A', unit: 'each', type: 'reversal', quantity: 1, date: '2026-10-01', sequence: 1, reversalOf: 'missing' }];
  await assert.rejects(() => previewBooksRecords(request({ transport: transport(lots, dangling) })), /dangling/);
});

test('subtracts explicit reservations and preserves physical quantity', async () => {
  const reservedLot = [{ ...lots[0], reserved: 5 }];
  const result = await previewBooksRecords(request({ transport: transport(reservedLot), quantity: 2 }));
  assert.equal(result.physicalQuantity, 6);
  assert.equal(result.availableQuantity, 1);
  assert.equal(result.shortage, 1);
});

test('keeps decimal movement arithmetic exact', async () => {
  const fractionalLot = [{ ...lots[0], opening: '0.1', reserved: 0 }];
  const movements = [{
    id: 'receipt', org: 'synthetic-org', key: 'receipt', item: 'synthetic-item', lot: 'A',
    unit: 'each', type: 'receipt', quantity: '0.2', date: '2026-10-02', sequence: 1,
  }];
  const result = await previewBooksRecords(request({
    transport: transport(fractionalLot, movements), quantity: '0.3',
  }));
  assert.equal(result.physicalQuantity, 0.3);
  assert.equal(result.shortage, 0);
});

test('acceptance A: sums decimal openings exactly', async () => {
  const result = await previewBooksRecords(request({
    transport: transport([
      { ...lots[0], opening: '0.1' },
      { ...lots[1], opening: '0.2' },
    ]),
    quantity: '0.3',
  }));
  assert.strictEqual(result.physicalQuantity, 0.3);
  assert.strictEqual(result.availableQuantity, 0.3);
});

test('acceptance B: excludes blank status without blocking a valid lot', async () => {
  const result = await previewBooksRecords(request({
    transport: transport([
      { ...lots[0], status: '' },
      { ...lots[1], opening: 10 },
    ]),
    quantity: 1,
  }));
  assert.equal(result.proposedSplit.length, 1);
  assert.equal(result.proposedSplit[0].lotNumber, 'B');
  assert.deepEqual(result.exclusions, [{ batchId: 'a', reason: 'status:quarantined' }]);
});

test('acceptance C: excludes absent expiry without blocking a valid lot', async () => {
  const result = await previewBooksRecords(request({
    transport: transport([
      { ...lots[0], expiry: undefined },
      { ...lots[1], opening: 10 },
    ]),
    quantity: 1,
  }));
  assert.equal(result.proposedSplit.length, 1);
  assert.equal(result.proposedSplit[0].lotNumber, 'B');
  assert.deepEqual(result.exclusions, [{ batchId: 'a', reason: 'expiry:absent' }]);
});

test('acceptance D: rejects movement before the explicit opening boundary', async () => {
  const resultPromise = previewBooksRecords(request({
    transport: transport([
      { ...lots[0], opening: 6, baselineDate: '2026-10-10', baselineSequence: 6 },
    ], [{
      id: 'receipt-before-opening',
      org: 'synthetic-org', key: 'receipt-before-opening', item: 'synthetic-item',
      lot: 'A', unit: 'each', type: 'receipt', quantity: 5,
      date: '2026-10-01', sequence: 5,
    }]),
    quantity: 1,
  }));
  await assert.rejects(resultPromise, /baseline|boundary|before/);
});

test('rejects movement date contradictions in authoritative sequence order', async () => {
  await assert.rejects(() => previewBooksRecords(request({
    transport: transport([lots[0]], [
      { id: 'later-sequence', org: 'synthetic-org', key: 'later-sequence', item: 'synthetic-item', lot: 'A', unit: 'each', type: 'receipt', quantity: 1, date: '2026-10-03', sequence: 1 },
      { id: 'earlier-date', org: 'synthetic-org', key: 'earlier-date', item: 'synthetic-item', lot: 'A', unit: 'each', type: 'receipt', quantity: 1, date: '2026-10-02', sequence: 2 },
    ]),
  })), /contradicts authoritative sequence/);
});

test('verifies exact opening ten replay with later receipt and reversal', async () => {
  const result = await previewBooksRecords(request({
    transport: transport([lots[1]], [
      { id: 'allocation', org: 'synthetic-org', key: 'allocation', item: 'synthetic-item', lot: 'B', unit: 'each', type: 'allocation', quantity: 2, date: '2026-10-02', sequence: 1 },
      { id: 'receipt', org: 'synthetic-org', key: 'receipt', item: 'synthetic-item', lot: 'B', unit: 'each', type: 'receipt', quantity: 5, date: '2026-10-03', sequence: 2 },
      { id: 'reversal', org: 'synthetic-org', key: 'reversal', item: 'synthetic-item', lot: 'B', unit: 'each', type: 'reversal', quantity: 2, date: '2026-10-04', sequence: 3, reversalOf: 'allocation' },
    ]),
    quantity: 15,
  }));
  assert.equal(result.physicalQuantity, 15);
  assert.equal(result.availableQuantity, 15);
});

test('rejects adapter overflow and accepts nested mapped values', async () => {
  await assert.rejects(() => previewBooksRecords(request({
    transport: transport([{ ...lots[0], opening: '9007199254.740992' }]),
  })), /safe quantity limit/);

  const nestedMap = {
    register: { module: 'NestedRegister', fields: {
      id: 'meta.id', orgId: 'meta.org', itemId: 'stock.item', lotNumber: 'stock.lot', unit: 'stock.unit',
      status: 'stock.status', expiryDate: 'stock.expiry', baselineQuantity: 'stock.opening',
      baselineVerified: 'stock.verified', baselineDate: 'stock.baselineDate',
      baselineSequence: 'stock.baselineSequence', reservedQuantity: 'stock.reserved', receivedDate: 'stock.received',
    } },
    movement: { module: 'NestedMovement', fields: {
      id: 'meta.id', orgId: 'meta.org', movementKey: 'meta.key', itemId: 'stock.item',
      lotNumber: 'stock.lot', unit: 'stock.unit', type: 'stock.type', quantity: 'stock.quantity',
      date: 'stock.date', sequence: 'stock.sequence', reversalOf: 'stock.reversalOf',
    } },
  };
  const nested = {
    meta: { id: 'nested-a', org: 'synthetic-org' },
    stock: {
      item: 'synthetic-item', lot: 'A', unit: 'each', status: 'available',
      expiry: '2026-12-01', opening: '0.1', verified: true,
      baselineDate: '2026-09-01', baselineSequence: 0, reserved: 0, received: '2026-09-01',
    },
  };
  const result = await previewBooksRecords(request({
    map: nestedMap,
    transport: transport([nested]),
    quantity: '0.1',
  }));
  assert.equal(result.physicalQuantity, 0.1);
});

test('requires explicit opening boundary evidence', async () => {
  const missingBoundaryMap = structuredClone(map);
  delete missingBoundaryMap.register.fields.baselineDate;
  await assert.rejects(() => previewBooksRecords(request({ map: missingBoundaryMap })), /baselineDate/);
});

