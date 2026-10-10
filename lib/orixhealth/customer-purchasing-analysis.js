const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const DEFAULT_CONFIG = Object.freeze({
  asOfDate: null,
  includedStatuses: ['paid', 'sent'],
  dormancyDays: 90,
});

function fail(message, path = '') {
  throw new TypeError(path ? `${path}: ${message}` : message);
}

function requiredString(value, path) {
  if (typeof value !== 'string' || value.trim() === '') fail('required non-empty string', path);
  return value.trim();
}

function date(value, path) {
  const result = requiredString(value, path);
  if (!DATE_RE.test(result) || Number.isNaN(Date.parse(`${result}T00:00:00Z`))) {
    fail('expected YYYY-MM-DD date', path);
  }
  return result;
}

function number(value, path, { allowNegative = false } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value) || (!allowNegative && value < 0)) {
    fail('expected finite number', path);
  }
  return value;
}

function configOrDefault(config = {}) {
  if (config === null || typeof config !== 'object' || Array.isArray(config)) {
    fail('expected object', 'config');
  }
  const asOfDate = config.asOfDate == null ? null : date(config.asOfDate, 'config.asOfDate');
  const includedStatuses = config.includedStatuses ?? DEFAULT_CONFIG.includedStatuses;
  if (!Array.isArray(includedStatuses) || includedStatuses.length === 0) {
    fail('expected non-empty array', 'config.includedStatuses');
  }
  const statuses = includedStatuses.map((status, index) => requiredString(status, `config.includedStatuses[${index}]`));
  const dormancyDays = config.dormancyDays ?? DEFAULT_CONFIG.dormancyDays;
  if (!Number.isInteger(dormancyDays) || dormancyDays < 0) fail('expected non-negative integer', 'config.dormancyDays');
  return { asOfDate, includedStatuses: [...new Set(statuses)], dormancyDays };
}

function lineDate(line, path) {
  return date(line.invoice_date, `${path}.invoice_date`);
}

function validateInvoice(line, index) {
  const path = `invoices[${index}]`;
  if (line === null || typeof line !== 'object' || Array.isArray(line)) fail('expected object', path);
  return {
    invoiceId: requiredString(line.invoice_id, `${path}.invoice_id`),
    customerKey: requiredString(line.customer_key, `${path}.customer_key`),
    invoiceDate: lineDate(line, path),
    status: requiredString(line.status, `${path}.status`),
    currency: requiredString(line.currency, `${path}.currency`).toUpperCase(),
    itemKey: requiredString(line.item_key, `${path}.item_key`),
    quantity: number(line.quantity, `${path}.quantity`),
    netAmount: number(line.net_amount, `${path}.net_amount`, { allowNegative: true }),
  };
}

function validateCredit(line, index) {
  const path = `credit_notes[${index}]`;
  if (line === null || typeof line !== 'object' || Array.isArray(line)) fail('expected object', path);
  return {
    creditNoteId: requiredString(line.credit_note_id, `${path}.credit_note_id`),
    invoiceId: requiredString(line.invoice_id, `${path}.invoice_id`),
    customerKey: requiredString(line.customer_key, `${path}.customer_key`),
    creditDate: date(line.credit_date, `${path}.credit_date`),
    currency: requiredString(line.currency, `${path}.currency`).toUpperCase(),
    itemKey: requiredString(line.item_key, `${path}.item_key`),
    quantity: number(line.quantity, `${path}.quantity`),
    netAmount: number(line.net_amount, `${path}.net_amount`),
  };
}

function daysBetween(start, end) {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000);
}

function moneyBucket() {
  return { gross: 0, credits: 0, net: 0 };
}

function addMoney(map, currency, key, amount, field) {
  const bucket = map.get(key) ?? new Map();
  const money = bucket.get(currency) ?? moneyBucket();
  money[field] += amount;
  money.net = money.gross - money.credits;
  bucket.set(currency, money);
  map.set(key, bucket);
}

function formatMoney(currencies) {
  return Object.fromEntries([...currencies.entries()].sort().map(([currency, values]) => [
    currency,
    Object.fromEntries(Object.entries(values).map(([name, value]) => [name, Number(value.toFixed(10))])),
  ]));
}

function addEvent(map, key, event) {
  const events = map.get(key) ?? [];
  events.push(event);
  map.set(key, events);
}

function summarize(key, events, money, config) {
  const byDate = [...events].sort((a, b) => a.date.localeCompare(b.date) || a.invoiceId.localeCompare(b.invoiceId));
  const dates = [...new Set(byDate.map((event) => event.date))];
  const intervals = dates.slice(1).map((current, index) => daysBetween(dates[index], current));
  const lastPurchase = dates.at(-1) ?? null;
  const dormant = lastPurchase === null ? 'unknown' : daysBetween(lastPurchase, config.asOfDate) > config.dormancyDays;
  return {
    key,
    last_purchase: lastPurchase,
    distinct_invoice_count: new Set(events.map((event) => event.invoiceId)).size,
    observed_repeat_intervals_days: intervals,
    observed_repeat_interval_count: intervals.length,
    repeat_history: intervals.length ? 'observed' : 'insufficient_history',
    dormant,
    totals_by_currency: formatMoney(money),
    observed_evidence: {
      invoice_ids: [...new Set(events.map((event) => event.invoiceId))].sort(),
      purchase_dates: dates,
      line_count: events.length,
    },
  };
}

export function analyzeCustomerPurchasing(input, rawConfig = {}) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) fail('expected object', 'input');
  const config = configOrDefault(rawConfig);
  if (!config.asOfDate) fail('required explicit as-of date', 'config.asOfDate');
  if (!Array.isArray(input.invoices)) fail('expected array', 'input.invoices');
  const invoices = input.invoices.map(validateInvoice);
  const invoiceIdentity = new Map();
  for (const invoice of invoices) {
    const identity = `${invoice.customerKey}|${invoice.invoiceDate}|${invoice.status}`;
    if (invoiceIdentity.has(invoice.invoiceId) && invoiceIdentity.get(invoice.invoiceId) !== identity) {
      fail('invoice ID has conflicting customer, date, or status', `invoices.${invoice.invoiceId}`);
    }
    invoiceIdentity.set(invoice.invoiceId, identity);
  }
  const credits = input.credit_notes == null
    ? []
    : Array.isArray(input.credit_notes) ? input.credit_notes.map(validateCredit) : fail('expected array', 'input.credit_notes');
  const creditIds = new Set();
  for (const credit of credits) {
    if (creditIds.has(credit.creditNoteId)) fail('duplicate credit note ID', `credit_notes.${credit.creditNoteId}`);
    creditIds.add(credit.creditNoteId);
  }
  const included = invoices.filter((invoice) => config.includedStatuses.includes(invoice.status) && invoice.invoiceDate <= config.asOfDate);
  const invoiceIds = new Set(included.map((invoice) => invoice.invoiceId));
  for (const credit of credits) {
    if (!invoiceIds.has(credit.invoiceId)) fail('must reference an included invoice', `credit_notes.${credit.creditNoteId}.invoice_id`);
    if (credit.creditDate > config.asOfDate) continue;
    const invoice = included.find((row) => row.invoiceId === credit.invoiceId
      && row.customerKey === credit.customerKey
      && row.currency === credit.currency
      && row.itemKey === credit.itemKey);
    if (!invoice) {
      fail('lineage customer, currency, and item must match invoice', `credit_notes.${credit.creditNoteId}`);
    }
  }

  const customers = new Map();
  const customerItems = new Map();
  const customerMoney = new Map();
  const itemMoney = new Map();
  const creditByInvoice = new Map();
  const appliedCreditLines = new Set();
  for (const credit of credits) {
    if (credit.creditDate <= config.asOfDate) {
      const key = `${credit.invoiceId}|${credit.itemKey}|${credit.currency}`;
      const existing = creditByInvoice.get(key) ?? 0;
      creditByInvoice.set(key, existing + credit.netAmount);
    }
  }
  for (const invoice of included) {
    const customerItemKey = `${invoice.customerKey}|${invoice.itemKey}`;
    const lineKey = `${invoice.invoiceId}|${invoice.itemKey}|${invoice.currency}`;
    const creditAmount = creditByInvoice.get(lineKey) ?? 0;
    addEvent(customers, invoice.customerKey, { date: invoice.invoiceDate, invoiceId: invoice.invoiceId });
    addEvent(customerItems, customerItemKey, {
      date: invoice.invoiceDate,
      invoiceId: invoice.invoiceId,
      quantity: invoice.quantity,
      currency: invoice.currency,
    });
    addMoney(customerMoney, invoice.currency, invoice.customerKey, invoice.netAmount, 'gross');
    addMoney(itemMoney, invoice.currency, customerItemKey, invoice.netAmount, 'gross');
    if (creditAmount && !appliedCreditLines.has(lineKey)) {
      appliedCreditLines.add(lineKey);
      addMoney(customerMoney, invoice.currency, invoice.customerKey, creditAmount, 'credits');
      addMoney(itemMoney, invoice.currency, customerItemKey, creditAmount, 'credits');
    }
  }
  const customerRows = [...customers.entries()].sort().map(([key, events]) => summarize(key, events, customerMoney.get(key) ?? new Map(), config));
  const customerItemRows = [...customerItems.entries()].sort().map(([key, events]) => {
    const [customerKey, itemKey] = key.split('|');
    return { ...summarize(key, events, itemMoney.get(key) ?? new Map(), config), customer_key: customerKey, item_key: itemKey };
  });
  const flags = customerItemRows.map((row) => ({
    customer_key: row.customer_key,
    item_key: row.item_key,
    reorder_candidate: row.repeat_history === 'observed' && row.dormant === false,
    status: row.repeat_history === 'observed' ? 'candidate_uses_observed_repeat_history' : 'unknown_insufficient_history',
    configuration: { as_of_date: config.asOfDate, included_statuses: config.includedStatuses, dormancy_days: config.dormancyDays },
    evidence: row.observed_evidence,
  }));
  return {
    schema: 'corpflow.orixhealth.customer_purchasing_analysis.v1',
    analysis_only: true,
    generated_from: 'local_normalized_synthetic_or_operator_supplied_input',
    config: { as_of_date: config.asOfDate, included_statuses: config.includedStatuses, dormancy_days: config.dormancyDays },
    excluded_statuses: [...new Set(invoices.map((row) => row.status).filter((status) => !config.includedStatuses.includes(status)))].sort(),
    credit_note_lineage: credits.map((credit) => ({ credit_note_id: credit.creditNoteId, invoice_id: credit.invoiceId, applied_as_of: credit.creditDate <= config.asOfDate })),
    customers: customerRows,
    customer_items: customerItemRows,
    reorder_candidates: flags,
    report_notes: ['Invoice line rows are grouped by invoice ID for order counts.', 'Currencies are never converted or mixed.', 'No outreach, mailing list, import, or live write is performed.'],
  };
}

export function reportToCsv(report) {
  const header = ['customer_key', 'item_key', 'last_purchase', 'distinct_invoice_count', 'repeat_intervals_days', 'reorder_candidate', 'status'];
  const rows = report.reorder_candidates.map((flag) => {
    const row = report.customer_items.find((item) => item.key === `${flag.customer_key}|${flag.item_key}`);
    return [flag.customer_key, flag.item_key, row.last_purchase ?? '', row.distinct_invoice_count, JSON.stringify(row.observed_repeat_intervals_days), flag.reorder_candidate, flag.status];
  });
  return [header, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n') + '\n';
}
