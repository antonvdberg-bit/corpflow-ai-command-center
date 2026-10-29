import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { plan, planMany } = require('../tools/zoho-customer-debt-refresh/plan.cjs');

const source = { snapshotId: 'snap-1', snapshotVersion: '7', fingerprint: 'sha256-fixture', observedAt: '2026-10-29T00:00:00Z' };
const pageEvidence = () => ({
  scope: { organizationId: 'org-1', customerId: 'cust-1', currency: 'USD', asOf: '2026-10-29' },
  source: { ...source }
});
const base = (overrides = {}) => {
  const input = {
  scope: { organizationId: 'org-1', customerId: 'cust-1', currency: 'USD', asOf: '2026-10-29' },
  source: { ...source }, expectedSource: { ...source },
  expectedHelper: { value: '2026-10-01', version: 'helper-3' },
  pages: [{ page: 1, last: true, records: [] }],
  ...overrides
  };
  input.pages = input.pages.map((page) => ({ ...page, ...pageEvidence(), ...page }));
  return input;
};
const invoice = (overrides = {}) => ({
  id: 'inv-1', organizationId: 'org-1', customerId: 'cust-1', currency: 'USD',
  status: 'unpaid', remainingBalance: '10.00', invoiceDate: '2026-09-01', dueDate: '2026-10-01',
  ...overrides
});
const withInvoices = (...records) => base({ pages: [{ page: 1, last: true, records }] });

test('partial payment preserves the oldest positive-balance invoice', () => {
  const result = plan(base({ expectedHelper: { value: '2026-09-01', version: 'helper-3' },
    pages: [{ page: 1, last: true, records: [invoice({ id: 'old', remainingBalance: '0.01' }), invoice({ id: 'new', dueDate: '2026-10-10' })] }] }));
  assert.equal(result.action, 'set');
  assert.equal(result.helperValue, '2026-10-01');
});

test('fully settled oldest invoice is excluded', () => {
  const result = plan(withInvoices(invoice({ id: 'old', remainingBalance: '0.00' }), invoice({ id: 'new', dueDate: '2026-10-10' })));
  assert.equal(result.helperValue, '2026-10-10');
});

test('allocated credit is represented by remaining balance and unallocated credit is ignored', () => {
  const result = plan(withInvoices(invoice({ remainingBalance: '0.00' }), invoice({ id: 'credit', remainingBalance: '2.00', dueDate: '2026-10-12' })));
  assert.equal(result.helperValue, '2026-10-12');
});

test('changed due dates recalculate and future due dates remain eligible', () => {
  const result = plan(withInvoices(invoice({ dueDate: '2027-01-01' })));
  assert.equal(result.helperValue, '2027-01-01');
});

test('exact small positive decimals are not rounded away', () => {
  const result = plan(base({ expectedHelper: { value: '2026-09-01', version: 'helper-3' },
    pages: [{ page: 1, last: true, records: [invoice({ remainingBalance: '0.00000001' })] }] }));
  assert.equal(result.action, 'set');
});

test('invalid qualifying due dates block', () => {
  assert.equal(plan(withInvoices(invoice({ dueDate: '2026-02-30' }))).action, 'blocked');
});

test('future invoice dates are excluded while future due dates are included', () => {
  const result = plan(withInvoices(invoice({ id: 'future', invoiceDate: '2026-11-01', dueDate: '2026-11-02' }), invoice({ id: 'issued', dueDate: '2027-01-01' })));
  assert.equal(result.helperValue, '2027-01-01');
});

test('complete empty and all-settled sources clear, incomplete sources do not', () => {
  assert.equal(plan(base()).action, 'clear');
  assert.equal(plan(withInvoices(invoice({ remainingBalance: '0' }))).action, 'clear');
  assert.equal(plan(base({ pages: [{ page: 1, records: [] }] })).action, 'blocked');
  assert.equal(plan(base({ pages: [
    { page: 1, last: false, records: [invoice({ dueDate: '2026-10-02' })] },
    { page: 2, last: true, records: [] }
  ] })).action, 'blocked');
  assert.equal(plan(base({ pages: [
    { page: 1, last: false, records: [invoice({ remainingBalance: '0' })] },
    { page: 2, last: true, records: [] }
  ] })).action, 'blocked');
});

test('duplicate and cross-scope records are blocked', () => {
  assert.equal(plan(withInvoices(invoice(), invoice({ id: 'inv-1' }))).reason, 'DUPLICATE_ID');
  assert.equal(plan(withInvoices(invoice({ organizationId: 'org-2' }))).reason, 'CROSS_SCOPE');
});

test('caps and malformed or reordered pages are blocked', () => {
  assert.equal(plan(base({ pages: [{ page: 2, last: true, records: [] }] })).reason, 'INCOMPLETE_SOURCE');
  assert.equal(plan(base({ pages: [{ page: 1, last: false, records: [] }] })).reason, 'INCOMPLETE_SOURCE');
  assert.equal(plan(base({ pages: Array.from({ length: 1001 }, (_, index) => ({ page: index + 1, last: index === 1000, records: [] })) })).reason, 'INCOMPLETE_SOURCE');
});

test('independent expected source and every page attestation are mandatory', () => {
  const missingExpected = base();
  delete missingExpected.expectedSource;
  assert.equal(plan(missingExpected).reason, 'INVALID_INPUT');
  for (const field of ['snapshotId', 'snapshotVersion', 'fingerprint', 'observedAt']) {
    const missingField = base({ expectedSource: { ...source } });
    delete missingField.expectedSource[field];
    assert.equal(plan(missingField).action, 'blocked');
    const mismatchedField = base({ expectedSource: { ...source, [field]: field === 'observedAt' ? '2026-10-29T00:00:01Z' : 'other' } });
    assert.equal(plan(mismatchedField).reason, 'SOURCE_MISMATCH');
  }
  const missingPageSource = base();
  delete missingPageSource.pages[0].source;
  assert.equal(plan(missingPageSource).reason, 'INCOMPLETE_SOURCE');
  for (const field of ['snapshotId', 'snapshotVersion', 'fingerprint', 'observedAt']) {
    const mismatchedPage = base();
    mismatchedPage.pages[0].source[field] = field === 'observedAt' ? '2026-10-29T00:00:01Z' : 'other';
    assert.equal(plan(mismatchedPage).reason, 'SOURCE_MISMATCH');
  }
  const mismatchedPageScope = base();
  mismatchedPageScope.pages[0].scope.customerId = 'other';
  assert.equal(plan(mismatchedPageScope).reason, 'CROSS_SCOPE');
  const flatAlias = base();
  flatAlias.pages[0].snapshotVersion = '8';
  assert.equal(plan(flatAlias).reason, 'INCOMPLETE_SOURCE');
});

test('observation timestamps, continuation flags and multipage evidence are strict', () => {
  assert.equal(plan(base({ source: { ...source, observedAt: 'not-a-date' } })).reason, 'INVALID_OBSERVED_AT');
  for (const invalidObservedAt of [
    '2026-02-29T00:00:00Z',
    '2026-02-30T00:00:00Z',
    '2026-04-31T00:00:00Z',
    '2026-01-01T24:00:00Z'
  ]) {
    const invalid = base({
      source: { ...source, observedAt: invalidObservedAt },
      expectedSource: { ...source, observedAt: invalidObservedAt },
      pages: [{ page: 1, last: true, records: [],
        source: { ...source, observedAt: invalidObservedAt } }]
    });
    assert.equal(plan(invalid).reason, 'INVALID_OBSERVED_AT');
  }
  assert.equal(plan(base({
    source: { ...source, observedAt: '2024-02-29T00:00:00Z' },
    expectedSource: { ...source, observedAt: '2024-02-29T00:00:00Z' },
    pages: [{ page: 1, last: true, records: [],
      source: { ...source, observedAt: '2024-02-29T00:00:00Z' } }]
  })).action, 'clear');
  assert.equal(plan(base({
    source: { ...source, observedAt: '2026-10-29T00:00:00.123Z' },
    expectedSource: { ...source, observedAt: '2026-10-29T00:00:00.123Z' },
    pages: [{ page: 1, last: true, records: [],
      source: { ...source, observedAt: '2026-10-29T00:00:00.123Z' } }]
  })).action, 'clear');
  assert.equal(plan(base({ pages: [{ page: 1, last: 'false', records: [] }] })).reason, 'INCOMPLETE_SOURCE');
  assert.equal(plan(base({ pages: [{ page: 1, last: null, records: [] }] })).reason, 'INCOMPLETE_SOURCE');
  assert.equal(plan(base({ pages: [{ page: 1, last: false, records: [] }, { page: 2, last: true, records: [] }] })).reason, 'INCOMPLETE_SOURCE');
  const result = plan(base({ pages: [
    { page: 1, last: false, records: [invoice({ id: 'old' })] },
    { page: 2, last: true, records: [] }
  ], expectedHelper: { value: '2026-09-01', version: 'helper-3' } }));
  assert.equal(result.action, 'blocked');
});

test('unknown status blocks while native sent and overdue statuses qualify', () => {
  assert.equal(plan(withInvoices(invoice({ status: 'mystery', remainingBalance: '0' }))).reason, 'UNKNOWN_STATUS');
  assert.equal(plan(base({ expectedHelper: { value: '2026-09-01', version: 'helper-3' },
    pages: [{ page: 1, last: true, records: [invoice({ status: 'sent' })] }] })).action, 'set');
  assert.equal(plan(base({ expectedHelper: { value: '2026-09-01', version: 'helper-3' },
    pages: [{ page: 1, last: true, records: [invoice({ status: 'overdue' })] }] })).action, 'set');
});

test('outputs preserve source and scope evidence without financial values', () => {
  const result = plan(base());
  assert.equal(result.sourceFingerprint, source.fingerprint);
  assert.equal(result.sourceObservedAt, source.observedAt);
  assert.equal(result.currency, 'USD');
  assert.equal(result.asOf, '2026-10-29');
  assert.equal(Object.hasOwn(result, 'remainingBalance'), false);
});

test('unchanged results are deterministic and inputs are immutable', () => {
  const input = withInvoices(invoice({ dueDate: '2026-10-01' }));
  const before = structuredClone(input);
  input.expectedHelper.value = '2026-10-01';
  const first = plan(input);
  const second = plan(input);
  assert.equal(first.action, 'unchanged');
  assert.deepEqual(first, second);
  assert.deepEqual(input, { ...before, expectedHelper: { value: '2026-10-01', version: 'helper-3' } });
});

test('customer failures are isolated and aggregate coverage is incomplete', () => {
  const result = planMany([base({ expectedHelper: { value: '2026-09-01', version: 'helper-3' },
    pages: [{ page: 1, last: true, records: [invoice()] }] }),
  base({ scope: { ...base().scope, customerId: 'cust-2' }, pages: [{ page: 1, last: true, records: [invoice({ customerId: 'cust-1' })] }] })]);
  assert.equal(result.complete, false);
  assert.equal(result.results[0].action, 'set');
  assert.equal(result.results[1].action, 'blocked');
});

test('duplicate customer scopes are conservatively blocked in planMany', () => {
  const result = planMany([base(), base()]);
  assert.equal(result.complete, false);
  assert.equal(result.results[0].reason, 'DUPLICATE_SCOPE');
  assert.equal(result.results[1].reason, 'DUPLICATE_SCOPE');
});

test('duplicate planMany scopes use canonical currency and isolate other inputs', () => {
  const empty = base({ scope: { ...base().scope, currency: 'USD' } });
  const positive = base({
    scope: { ...base().scope, currency: 'usd' },
    pages: [{ page: 1, last: true, records: [invoice({ dueDate: '2026-10-02' })] }]
  });
  const third = base({
    scope: { ...base().scope, currency: 'USD' },
    pages: [{ page: 1, last: true, records: [invoice({ id: 'inv-3' })] }]
  });
  const independent = base({
    scope: { ...base().scope, customerId: 'cust-2' },
    expectedHelper: { value: '2026-09-01', version: 'helper-3' },
    pages: [{ page: 1, last: true, records: [invoice({ customerId: 'cust-2' })],
      scope: { ...pageEvidence().scope, customerId: 'cust-2' } }]
  });
  const malformed = base({ scope: { ...base().scope, currency: '' } });
  const result = planMany([positive, malformed, independent, third, empty]);
  assert.equal(result.complete, false);
  assert.deepEqual(result.results.map((item) => item.reason), [
    'DUPLICATE_SCOPE', 'INVALID_INPUT', undefined, 'DUPLICATE_SCOPE', 'DUPLICATE_SCOPE'
  ]);
  assert.equal(result.results[2].action, 'set');
});

test('terminal statuses with positive balances are contradictory and cannot retain stale dates', () => {
  assert.equal(plan(withInvoices(invoice({ status: 'paid', remainingBalance: '1.00' }))).action, 'blocked');
});
