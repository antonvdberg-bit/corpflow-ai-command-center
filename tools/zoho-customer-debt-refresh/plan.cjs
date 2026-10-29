'use strict';

const MAX_PAGES = 1000;
const MAX_RECORDS = 10000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DECIMAL_RE = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const SUPPORTED_UNPAID = new Set(['issued', 'unpaid', 'issued_unpaid', 'partially_paid', 'open']);
const NON_DEBT_STATUSES = new Set(['paid', 'draft', 'void', 'cancelled', 'canceled']);

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function requiredString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') fail('INVALID_INPUT', `${name} is required`);
  return value;
}

function validDate(value, name) {
  requiredString(value, name);
  if (!DATE_RE.test(value)) fail('INVALID_DATE', `${name} must be YYYY-MM-DD`);
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    fail('INVALID_DATE', `${name} is not a Gregorian date`);
  }
  return value;
}

function decimal(value, name) {
  requiredString(value, name);
  if (!DECIMAL_RE.test(value)) fail('INVALID_BALANCE', `${name} must be an exact decimal string`);
  const [whole, fraction = ''] = value.split('.');
  return { value, positive: BigInt(whole) > 0n || /[1-9]/.test(fraction) };
}

function scopeOf(input) {
  const scope = input && input.scope;
  if (!scope || typeof scope !== 'object') fail('INVALID_INPUT', 'scope is required');
  return {
    organizationId: requiredString(scope.organizationId, 'scope.organizationId'),
    customerId: requiredString(scope.customerId, 'scope.customerId'),
    currency: requiredString(scope.currency, 'scope.currency').toUpperCase(),
    asOf: validDate(scope.asOf, 'scope.asOf')
  };
}

function sourceOf(input) {
  const source = input && input.source;
  if (!source || typeof source !== 'object') fail('INVALID_INPUT', 'source is required');
  return {
    snapshotId: requiredString(source.snapshotId, 'source.snapshotId'),
    snapshotVersion: requiredString(source.snapshotVersion, 'source.snapshotVersion'),
    fingerprint: requiredString(source.fingerprint, 'source.fingerprint'),
    observedAt: requiredString(source.observedAt, 'source.observedAt')
  };
}

function expectedOf(input) {
  const expected = input && input.expectedHelper;
  if (!expected || typeof expected !== 'object') fail('INVALID_INPUT', 'expectedHelper is required');
  if (expected.value !== null) validDate(expected.value, 'expectedHelper.value');
  return { value: expected.value, version: requiredString(expected.version, 'expectedHelper.version') };
}

function baseResult(scope, source, expected, action, extra = {}) {
  return { action, organizationId: scope.organizationId, customerId: scope.customerId,
    expectedHelperValue: expected.value, expectedHelperVersion: expected.version,
    sourceSnapshotId: source.snapshotId, sourceSnapshotVersion: source.snapshotVersion, ...extra };
}

function validateInvoice(invoice, scope, seen) {
  if (!invoice || typeof invoice !== 'object') fail('INVALID_RECORD', 'invoice must be an object');
  const id = requiredString(invoice.id, 'invoice.id');
  if (seen.has(id)) fail('DUPLICATE_ID', `duplicate invoice ${id}`);
  seen.add(id);
  if (invoice.organizationId !== scope.organizationId || invoice.customerId !== scope.customerId) {
    fail('CROSS_SCOPE', `invoice ${id} is outside the requested scope`);
  }
  if (typeof invoice.currency !== 'string' || invoice.currency.toUpperCase() !== scope.currency) {
    fail('CROSS_SCOPE', `invoice ${id} has a different currency`);
  }
  const balance = decimal(invoice.remainingBalance, `invoice ${id} remainingBalance`);
  const status = requiredString(invoice.status, `invoice ${id} status`).toLowerCase();
  const invoiceDate = validDate(invoice.invoiceDate, `invoice ${id} invoiceDate`);
  if (NON_DEBT_STATUSES.has(status) && balance.positive) fail('CONTRADICTORY_RECORD', `invoice ${id} has debt in a terminal status`);
  if (!SUPPORTED_UNPAID.has(status)) return { status, balance, invoiceDate, id };
  if (invoiceDate > scope.asOf) return { status, balance, invoiceDate, id, future: true };
  if (!balance.positive) return { status, balance, invoiceDate, id };
  const dueDate = validDate(invoice.dueDate, `invoice ${id} dueDate`);
  return { status, balance, invoiceDate, id, dueDate, qualifies: true };
}

function invoicesFromPages(input, scope) {
  const pages = input.pages;
  if (!Array.isArray(pages) || pages.length === 0 || pages.length > MAX_PAGES) {
    fail('INCOMPLETE_SOURCE', 'invoice pages must be a bounded non-empty sequence');
  }
  const seen = new Set();
  const invoices = [];
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    if (!page || page.page !== index + 1 || !Array.isArray(page.records)) {
      fail('INCOMPLETE_SOURCE', 'invoice pages must be sequential and well formed');
    }
    if (page.records.length > MAX_RECORDS || invoices.length + page.records.length > MAX_RECORDS) {
      fail('CAP_EXCEEDED', 'invoice record cap exceeded');
    }
    for (const invoice of page.records) invoices.push(validateInvoice(invoice, scope, seen));
    if (index < pages.length - 1 && page.last === true) fail('INCOMPLETE_SOURCE', 'source ended before final page');
  }
  if (pages[pages.length - 1].last !== true) fail('INCOMPLETE_SOURCE', 'source is truncated');
  return invoices;
}

function planCustomer(input) {
  const scope = scopeOf(input);
  const source = sourceOf(input);
  const expected = expectedOf(input);
  const invoices = invoicesFromPages(input, scope);
  const qualifying = invoices.filter((invoice) => invoice.qualifies);
  qualifying.sort((left, right) => left.dueDate.localeCompare(right.dueDate) || left.id.localeCompare(right.id));
  if (qualifying.length === 0) {
    return baseResult(scope, source, expected, expected.value === null ? 'unchanged' : 'clear');
  }
  const oldestDueDate = qualifying[0].dueDate;
  return baseResult(scope, source, expected,
    expected.value === oldestDueDate ? 'unchanged' : 'set', { helperValue: oldestDueDate });
}

function blockedResult(input, error) {
  const scope = input && input.scope;
  const source = input && input.source;
  const expected = input && input.expectedHelper;
  return {
    action: 'blocked',
    organizationId: scope && scope.organizationId,
    customerId: scope && scope.customerId,
    expectedHelperValue: expected && expected.value,
    expectedHelperVersion: expected && expected.version,
    sourceSnapshotId: source && source.snapshotId,
    sourceSnapshotVersion: source && source.snapshotVersion,
    reason: error.code || 'INVALID_INPUT'
  };
}

function plan(input) {
  try {
    return planCustomer(input);
  } catch (error) {
    return blockedResult(input, error);
  }
}

function planMany(inputs) {
  if (!Array.isArray(inputs) || inputs.length === 0 || inputs.length > MAX_RECORDS) {
    fail('INVALID_INPUT', 'customers must be a bounded non-empty array');
  }
  const results = inputs.map(plan);
  return { complete: results.every((result) => result.action !== 'blocked'), results };
}

module.exports = { plan, planMany, planCustomer, MAX_PAGES, MAX_RECORDS };
