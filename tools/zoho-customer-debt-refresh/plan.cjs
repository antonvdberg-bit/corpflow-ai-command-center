'use strict';

const MAX_PAGES = 1000;
const MAX_RECORDS = 10000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_INSTANT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const DECIMAL_RE = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const SUPPORTED_UNPAID = new Set(['issued', 'unpaid', 'issued_unpaid', 'partially_paid', 'open', 'sent', 'overdue']);
const KNOWN_STATUSES = new Set([...SUPPORTED_UNPAID, 'paid', 'draft', 'void', 'cancelled', 'canceled']);
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

function validInstant(value, name) {
  requiredString(value, name);
  if (!ISO_INSTANT_RE.test(value)) {
    fail('INVALID_OBSERVED_AT', `${name} must be a real UTC ISO timestamp`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    fail('INVALID_OBSERVED_AT', `${name} must be a real UTC ISO timestamp`);
  }
  const canonical = value.includes('.') ? date.toISOString() : date.toISOString().replace('.000Z', 'Z');
  if (canonical !== value) {
    fail('INVALID_OBSERVED_AT', `${name} must be a real UTC ISO timestamp`);
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
    observedAt: validInstant(source.observedAt, 'source.observedAt')
  };
}

function expectedSourceOf(input) {
  const expected = input && input.expectedSource;
  if (!expected || typeof expected !== 'object') fail('INVALID_INPUT', 'expectedSource is required');
  return {
    snapshotId: requiredString(expected.snapshotId, 'expectedSource.snapshotId'),
    snapshotVersion: requiredString(expected.snapshotVersion, 'expectedSource.snapshotVersion'),
    fingerprint: requiredString(expected.fingerprint, 'expectedSource.fingerprint'),
    observedAt: validInstant(expected.observedAt, 'expectedSource.observedAt')
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
    currency: scope.currency, asOf: scope.asOf,
    expectedHelperValue: expected.value, expectedHelperVersion: expected.version,
    sourceSnapshotId: source.snapshotId, sourceSnapshotVersion: source.snapshotVersion,
    sourceFingerprint: source.fingerprint, sourceObservedAt: source.observedAt, ...extra };
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
  if (!KNOWN_STATUSES.has(status)) fail('UNKNOWN_STATUS', `invoice ${id} has an unsupported status`);
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
    if (!page || page.page !== index + 1 || !Array.isArray(page.records) || typeof page.last !== 'boolean') {
      fail('INCOMPLETE_SOURCE', 'invoice pages must be sequential and well formed');
    }
    if (!page.scope || typeof page.scope !== 'object' || !page.source || typeof page.source !== 'object') {
      fail('INCOMPLETE_SOURCE', 'every page must attest scope and source');
    }
    if (Object.hasOwn(page, 'organizationId') || Object.hasOwn(page, 'customerId')
      || Object.hasOwn(page, 'currency') || Object.hasOwn(page, 'asOf')
      || Object.hasOwn(page, 'snapshotId') || Object.hasOwn(page, 'snapshotVersion')
      || Object.hasOwn(page, 'fingerprint') || Object.hasOwn(page, 'observedAt')) {
      fail('INCOMPLETE_SOURCE', 'flat page evidence aliases are not accepted');
    }
    const pageScope = page.scope;
    if (pageScope.organizationId !== scope.organizationId || pageScope.customerId !== scope.customerId
      || pageScope.currency !== scope.currency || pageScope.asOf !== scope.asOf) {
      fail('CROSS_SCOPE', 'page scope does not match requested scope');
    }
    const pageSource = page.source;
    for (const field of ['snapshotId', 'snapshotVersion', 'fingerprint', 'observedAt']) {
      if (pageSource[field] !== input.source[field]) fail('SOURCE_MISMATCH', `page source ${field} does not match`);
    }
    if (page.records.length > MAX_RECORDS || invoices.length + page.records.length > MAX_RECORDS) {
      fail('CAP_EXCEEDED', 'invoice record cap exceeded');
    }
    if (page.records.length === 0 && (index > 0 || index < pages.length - 1)) {
      fail('INCOMPLETE_SOURCE', 'empty pages cannot establish complete coverage');
    }
    for (const invoice of page.records) invoices.push(validateInvoice(invoice, scope, seen));
    if (index < pages.length - 1 && page.last !== false) fail('INCOMPLETE_SOURCE', 'non-final pages must have last=false');
    if (index === pages.length - 1 && page.last !== true) fail('INCOMPLETE_SOURCE', 'final page must have last=true');
  }
  return invoices;
}

function planCustomer(input) {
  const scope = scopeOf(input);
  const source = sourceOf(input);
  const expectedSource = expectedSourceOf(input);
  for (const field of ['snapshotId', 'snapshotVersion', 'fingerprint', 'observedAt']) {
    if (source[field] !== expectedSource[field]) fail('SOURCE_MISMATCH', `source ${field} does not match expectedSource`);
  }
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
    sourceFingerprint: source && source.fingerprint,
    sourceObservedAt: source && source.observedAt,
    currency: input && input.scope && input.scope.currency,
    asOf: input && input.scope && input.scope.asOf,
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
  const scopeKeys = inputs.map((input) => {
    try {
      const scope = scopeOf(input);
      return [scope.organizationId, scope.customerId, scope.currency, scope.asOf].join('\u0000');
    } catch {
      return null;
    }
  });
  const scopeCounts = new Map();
  for (const key of scopeKeys) {
    if (key) scopeCounts.set(key, (scopeCounts.get(key) || 0) + 1);
  }
  const results = inputs.map((input, index) => {
    const key = scopeKeys[index];
    if (key && scopeCounts.get(key) > 1) {
      return blockedResult(input, Object.assign(new Error('duplicate customer scope'), { code: 'DUPLICATE_SCOPE' }));
    }
    return plan(input);
  });
  return { complete: results.every((result) => result.action !== 'blocked'), results };
}

module.exports = { plan, planMany, planCustomer, MAX_PAGES, MAX_RECORDS };
