import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareCustomerStatementPlan } from '../tools/zoho-customer-statements/statement-plan.cjs';

const invoice = (overrides = {}) => ({
  invoice_id: 'i-1',
  customer_id: 'c-1',
  currency_code: 'USD',
  status: 'sent',
  date: '2025-01-15',
  balance: '100.00',
  ...overrides,
});

const page = (pageNumber, invoices, hasMore = false) => ({
  code: 0,
  invoices,
  page_context: { page: pageNumber, per_page: 200, has_more_page: hasMore },
});

const plan = (pages, extra = {}) => prepareCustomerStatementPlan({
  customerId: 'c-1',
  currencyCode: 'USD',
  asOfDate: '2025-04-15',
  pages,
  ...extra,
});

function rejectsWith(code, pages, extra = {}) {
  assert.throws(() => plan(pages, extra), (error) => error.code === code);
}

test('finds oldest unpaid invoice on a later, unordered page and preserves partial payment', () => {
  const result = plan([
    page(1, [invoice({ invoice_id: 'new', date: '2025-03-01', balance: 20 })], true),
    page(2, [
      invoice({ invoice_id: 'old', date: '2024-01-01', balance: 300, status: 'overdue' }),
      invoice({ invoice_id: 'partial', date: '2024-06-01', balance: 40, status: 'partially_paid' }),
    ]),
  ]);
  assert.deepEqual(
    {
      result: result.result,
      statementStart: result.statementStart,
      statementEnd: result.statementEnd,
      earliest: result.earliestEligibleInvoiceDate,
      eligible: result.eligibleInvoiceCount,
      pages: result.pagesRead,
    },
    {
      result: 'prepare_statement',
      statementStart: '2024-01-01',
      statementEnd: '2025-04-15',
      earliest: '2024-01-01',
      eligible: 3,
      pages: 2,
    },
  );
});

test('excludes paid, void, draft, future, zero-balance, and unsupported statuses', () => {
  const result = plan([page(1, [
    invoice({ invoice_id: 'paid', status: 'paid', balance: 100 }),
    invoice({ invoice_id: 'void', status: 'void', balance: 100 }),
    invoice({ invoice_id: 'draft', status: 'draft', balance: 100 }),
    invoice({ invoice_id: 'future', date: '2025-04-16', balance: 100 }),
    invoice({ invoice_id: 'zero', balance: 0 }),
    invoice({ invoice_id: 'viewed', status: 'viewed', balance: 100 }),
  ])]);
  assert.equal(result.result, 'no_statement');
});

test('keeps eligible debt when a later invoice is future-dated', () => {
  const result = plan([page(1, [
    invoice({ invoice_id: 'eligible', date: '2025-04-01', balance: 25 }),
    invoice({ invoice_id: 'future', date: '2025-04-16', balance: 90 }),
  ])]);
  assert.equal(result.result, 'prepare_statement');
  assert.equal(result.eligibleInvoiceCount, 1);
  assert.equal(result.statementStart, '2025-01-15');
  assert.equal(result.currencyCode, 'USD');
});

test('returns explicit no_statement and never invents a send result', () => {
  const result = plan([page(1, [invoice({ status: 'paid', balance: 0 })])]);
  assert.deepEqual(result, {
    result: 'no_statement',
    reason: 'no eligible unpaid invoice with a positive remaining balance',
    pagesRead: 1,
    invoiceCount: 1,
  });
});

test('covers leap-day and year-boundary 90-day minimum without mutating input', () => {
  const pages = [page(1, [invoice({ date: '2024-02-29' })])];
  const snapshot = structuredClone(pages);
  const result = plan(pages, { asOfDate: '2024-05-29' });
  assert.equal(result.statementStart, '2024-02-29');
  assert.deepEqual(pages, snapshot);
  assert.equal(plan([page(1, [invoice({ date: '2025-01-01' })])], { asOfDate: '2025-03-31' }).statementStart, '2024-12-31');
});

test('rejects malformed dates, balances, statuses, customer, currency, and duplicates', () => {
  rejectsWith('MALFORMED_DATE', [page(1, [invoice({ date: '2025-02-30' })])]);
  rejectsWith('MALFORMED_BALANCE', [page(1, [invoice({ balance: 'not-a-number' })])]);
  rejectsWith('MALFORMED_STATUS', [page(1, [invoice({ status: null })])]);
  rejectsWith('CUSTOMER_MISMATCH', [page(1, [invoice({ customer_id: 'other' })])]);
  rejectsWith('CURRENCY_MISMATCH', [page(1, [invoice({ currency_code: 'EUR' })])]);
  rejectsWith('DUPLICATE_INVOICE', [page(1, [invoice()], true), page(2, [invoice()])]);
  rejectsWith('MALFORMED_CURRENCY', [page(1, [invoice()])], { currencyCode: '' });
});

test('requires strict calendar-valid ISO dates at leap-year and year boundaries', () => {
  for (const date of ['2024-02-29', '2025-12-31', '2026-01-01']) {
    assert.equal(plan([page(1, [invoice({ date })])], { asOfDate: '2026-12-31' }).result, 'prepare_statement');
  }
  for (const date of ['2024-02-30', '1900-02-29', '2025-13-01', '2025-01-32', '2025-1-01']) {
    rejectsWith('MALFORMED_DATE', [page(1, [invoice({ date })])]);
  }
});

test('fails closed on missing, empty continuing, error, nonzero, and capped pages', () => {
  rejectsWith('MISSING_PAGE', []);
  rejectsWith('EMPTY_CONTINUING_PAGE', [page(1, [invoice()], true), page(2, [], true)]);
  rejectsWith('PAGE_ERROR', [{ error: true }]);
  rejectsWith('API_ERROR', [{ ...page(1, []), code: 102 }]);
  const capped = Array.from({ length: 10 }, (_, index) => page(index + 1, [invoice({ invoice_id: `i-${index}` })], true));
  rejectsWith('PAGE_CAP_REACHED', capped);
});

test('requires exact page attestation and rejects extra unconsumed pages', () => {
  rejectsWith('MALFORMED_PAGE_CONTEXT', [{ ...page(1, [invoice()]), page_context: { page: 2, per_page: 200, has_more_page: false } }]);
  rejectsWith('UNATTESTED_HISTORY', [page(1, [invoice()]), page(2, [invoice({ invoice_id: 'i-2' })])]);
});
