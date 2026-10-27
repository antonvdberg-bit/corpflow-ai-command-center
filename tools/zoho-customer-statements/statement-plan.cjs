'use strict';

const PAGE_SIZE = 200;
const PAGE_CAP = 10;
const ELIGIBLE_STATUSES = new Set(['sent', 'overdue', 'partially_paid']);

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function parseDate(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    fail('MALFORMED_DATE', `${label} must be YYYY-MM-DD`);
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    fail('MALFORMED_DATE', `${label} is not a calendar date`);
  }
  return date;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function subtractDays(value, days) {
  const date = parseDate(value, 'asOfDate');
  date.setUTCDate(date.getUTCDate() - days);
  return formatDate(date);
}

function numericBalance(value) {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    fail('MALFORMED_BALANCE', 'invoice balance must be numeric');
  }
  const balance = Number(value);
  if (!Number.isFinite(balance) || balance < 0) {
    fail('MALFORMED_BALANCE', 'invoice balance must be finite and non-negative');
  }
  return balance;
}

function validatePage(page, expectedPage) {
  if (!page || typeof page !== 'object' || page.error) {
    fail('PAGE_ERROR', `page ${expectedPage} is missing or returned an error`);
  }
  if (page.code !== 0) {
    fail('API_ERROR', `page ${expectedPage} returned a nonzero API code`);
  }
  const context = page.page_context;
  if (
    !context ||
    context.page !== expectedPage ||
    !Number.isInteger(context.per_page) ||
    context.per_page < 1 ||
    context.per_page > PAGE_SIZE ||
    typeof context.has_more_page !== 'boolean'
  ) {
    fail('MALFORMED_PAGE_CONTEXT', `page ${expectedPage} has invalid page context`);
  }
  if (!Array.isArray(page.invoices)) {
    fail('MALFORMED_PAGE', `page ${expectedPage} has no invoice list`);
  }
  if (page.invoices.length > context.per_page || page.invoices.length > PAGE_SIZE) {
    fail('MALFORMED_PAGE', `page ${expectedPage} exceeds its attested collection limit`);
  }
  if (page.invoices.length === 0 && (expectedPage > 1 || context.has_more_page)) {
    fail('EMPTY_CONTINUING_PAGE', `page ${expectedPage} is empty`);
  }
  return context;
}

function prepareCustomerStatementPlan({
  customerId,
  currencyCode,
  asOfDate,
  pages,
}) {
  if (typeof customerId !== 'string' || customerId === '') {
    fail('MALFORMED_CUSTOMER', 'customerId is required');
  }
  if (typeof currencyCode !== 'string' || currencyCode === '') {
    fail('MALFORMED_CURRENCY', 'currencyCode is required');
  }
  parseDate(asOfDate, 'asOfDate');
  if (!Array.isArray(pages) || pages.length === 0) {
    fail('MISSING_PAGE', 'at least the first invoice page is required');
  }

  const seen = new Set();
  const eligible = [];
  let pageIndex = 0;
  let hasMore = true;

  while (hasMore) {
    if (pageIndex >= PAGE_CAP || !pages[pageIndex]) {
      fail('PAGE_CAP_REACHED', `invoice history exceeds ${PAGE_CAP} pages`);
    }
    const page = pages[pageIndex];
    const context = validatePage(page, pageIndex + 1);
    for (const invoice of page.invoices) {
      if (
        !invoice ||
        typeof invoice !== 'object' ||
        Array.isArray(invoice) ||
        Object.getPrototypeOf(invoice) !== Object.prototype ||
        invoice.invoice_id == null ||
        !Object.prototype.hasOwnProperty.call(invoice, 'customer_id') ||
        !Object.prototype.hasOwnProperty.call(invoice, 'currency_code') ||
        !Object.prototype.hasOwnProperty.call(invoice, 'status') ||
        !Object.prototype.hasOwnProperty.call(invoice, 'date') ||
        !Object.prototype.hasOwnProperty.call(invoice, 'balance')
      ) {
        fail('MALFORMED_INVOICE', 'invoice entry is malformed');
      }
      const id = String(invoice.invoice_id);
      if (seen.has(id)) {
        fail('DUPLICATE_INVOICE', `invoice ${id} appears more than once`);
      }
      seen.add(id);

      if (String(invoice.customer_id) !== customerId) {
        fail('CUSTOMER_MISMATCH', `invoice ${id} belongs to another customer`);
      }
      if (invoice.currency_code !== currencyCode) {
        fail('CURRENCY_MISMATCH', `invoice ${id} has another currency`);
      }
      const date = parseDate(invoice.date, `invoice ${id} date`);
      const balance = numericBalance(invoice.balance);
      const status = invoice.status;
      if (typeof status !== 'string') {
        fail('MALFORMED_STATUS', `invoice ${id} status is malformed`);
      }
      if (date <= parseDate(asOfDate, 'asOfDate') && ELIGIBLE_STATUSES.has(status) && balance > 0) {
        eligible.push({ id, date: invoice.date, balance });
      }
    }

    hasMore = context.has_more_page;
    pageIndex += 1;
  }

  if (pageIndex !== pages.length) {
    fail('UNATTESTED_HISTORY', 'extra pages were supplied beyond the attested history');
  }

  if (eligible.length === 0) {
    return {
      result: 'no_statement',
      reason: 'no eligible unpaid invoice with a positive remaining balance',
      pagesRead: pageIndex,
      invoiceCount: seen.size,
    };
  }

  const earliest = eligible.reduce((oldest, invoice) =>
    invoice.date < oldest ? invoice.date : oldest,
  eligible[0].date);
  const start = subtractDays(asOfDate, 90) < earliest
    ? subtractDays(asOfDate, 90)
    : earliest;

  return {
    result: 'prepare_statement',
    statementStart: start,
    statementEnd: asOfDate,
    currencyCode,
    pagesRead: pageIndex,
    invoiceCount: seen.size,
    eligibleInvoiceCount: eligible.length,
    earliestEligibleInvoiceDate: earliest,
    reconciliationRequired: true,
    note: 'Invoice balances remain native; credits and net account balance require native statement reconciliation.',
  };
}

module.exports = {
  PAGE_CAP,
  PAGE_SIZE,
  prepareCustomerStatementPlan,
};
