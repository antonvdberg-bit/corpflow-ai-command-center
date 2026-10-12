const DEFAULT_HEADERS = Object.freeze({
  invoiceId: 'Invoice ID',
  customerId: 'Customer ID',
  invoiceDate: 'Invoice Date',
  status: 'Status',
  currency: 'Currency',
  itemId: 'Item ID',
  quantity: 'Quantity',
  lineAmount: 'Line Amount',
  invoiceSubtotal: 'Invoice Subtotal',
  sourceRecord: 'Source Record',
  lineId: 'Line ID',
});

const REQUIRED_FIELDS = [
  'invoiceId',
  'customerId',
  'invoiceDate',
  'status',
  'currency',
  'itemId',
  'quantity',
  'lineAmount',
  'invoiceSubtotal',
];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DECIMAL_RE = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

function fail(message) {
  throw new TypeError(message);
}

function parseDate(value, label) {
  if (!DATE_RE.test(value)) fail(`${label}: expected ISO YYYY-MM-DD date`);
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) fail(`${label}: impossible calendar date`);
  return value;
}

function decimal(value, label, { allowNegative = false } = {}) {
  const text = String(value).trim();
  const pattern = allowNegative ? /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/ : DECIMAL_RE;
  if (!pattern.test(text)) fail(`${label}: malformed decimal`);
  const negative = text.startsWith('-');
  const unsigned = negative ? text.slice(1) : text;
  const [whole, fraction = ''] = unsigned.split('.');
  const scale = fraction.length;
  const integer = BigInt(`${whole}${fraction}` || '0');
  return { integer: negative ? -integer : integer, scale, text };
}

function decimalToNumber(value, label, options) {
  const parsed = decimal(value, label, options);
  const number = Number(parsed.text);
  if (!Number.isFinite(number)) fail(`${label}: decimal is outside supported numeric range`);
  return number;
}

function decimalDifferenceWithin(left, right, tolerance) {
  const scale = Math.max(left.scale, right.scale, tolerance.scale);
  const factor = (entry) => entry.integer * (10n ** BigInt(scale - entry.scale));
  return factor(left) - factor(right) <= factor(tolerance)
    && factor(right) - factor(left) <= factor(tolerance);
}

function decimalsEqual(left, right) {
  const scale = Math.max(left.scale, right.scale);
  return left.integer * (10n ** BigInt(scale - left.scale))
    === right.integer * (10n ** BigInt(scale - right.scale));
}

function parseCsv(text, sourceName) {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let afterQuote = false;
  let line = 1;
  let rowStartLine = 1;
  const pushRow = () => {
    row.push(field);
    if (row.length > 1 || row[0] !== '') rows.push({ values: row, sourceLine: rowStartLine });
    row = [];
    field = '';
    afterQuote = false;
  };
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
          afterQuote = true;
        }
      } else {
        field += character;
        if (character === '\n') line += 1;
      }
      continue;
    }
    if (afterQuote && character !== ',' && character !== '\r' && character !== '\n') {
      fail(`${sourceName}:${line}: malformed quote`);
    }
    if (character === '"') {
      if (field !== '') fail(`${sourceName}:${line}: malformed quote`);
      quoted = true;
      afterQuote = false;
    } else if (character === ',') {
      row.push(field);
      field = '';
      afterQuote = false;
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && input[index + 1] === '\n') index += 1;
      pushRow();
      line += 1;
      rowStartLine = line;
    } else {
      field += character;
    }
  }
  if (quoted) fail(`${sourceName}:${line}: unterminated quoted field`);
  if (field !== '' || row.length) {
    pushRow();
  }
  if (!rows.length) fail(`${sourceName}: CSV has no header`);
  return rows;
}

function headerConfig(config) {
  const headers = { ...DEFAULT_HEADERS, ...(config?.headers ?? {}) };
  const values = Object.entries(headers);
  const seen = new Set();
  for (const [field, header] of values) {
    if (typeof header !== 'string' || header.trim() === '') fail(`mapping.${field}: required header name`);
    if (seen.has(header)) fail(`mapping: duplicate mapped header "${header}"`);
    seen.add(header);
  }
  return headers;
}

function rowValue(row, indexes, field, sourceName, rowNumber) {
  const value = row[indexes[field]];
  if (value == null || value.trim() === '') fail(`${sourceName}:${rowNumber}: ${field} is required`);
  return value.trim();
}

function normalizeFiles(files, config = {}) {
  if (!Array.isArray(files) || files.length === 0) fail('files: expected one or more CSV files');
  const headers = headerConfig(config);
  const tolerance = decimal(config.tolerance == null ? '0.01' : config.tolerance, 'config.tolerance');
  if (tolerance.integer < 0n) fail('config.tolerance: must be non-negative');
  const records = [];
  const seenSourceRecords = new Set();
  const seenFingerprints = new Set();
  for (const file of files) {
    if (!file || typeof file.text !== 'string') fail('files: each entry needs text and optional name');
    const sourceName = file.name ?? `input-${records.length + 1}.csv`;
    const rows = parseCsv(file.text, sourceName);
    const headerRow = rows[0].values;
    const indexes = {};
    for (const [field, header] of Object.entries(headers)) {
      const matches = headerRow.reduce((found, value, index) => (
        value === header ? [...found, index] : found
      ), []);
      if (matches.length > 1) {
        fail(`${sourceName}:${rows[0].sourceLine}: duplicate source header "${header}"`);
      }
      indexes[field] = matches[0] ?? -1;
      if (REQUIRED_FIELDS.includes(field) && indexes[field] === -1) {
        fail(`${sourceName}: missing required header "${header}"`);
      }
    }
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      const parsedRow = rows[rowIndex];
      const row = parsedRow.values;
      if (row.length !== headerRow.length) fail(`${sourceName}:${parsedRow.sourceLine}: invalid column width`);
      const sourceRecord = indexes.sourceRecord === -1
        ? `${sourceName}:${parsedRow.sourceLine}`
        : rowValue(row, indexes, 'sourceRecord', sourceName, parsedRow.sourceLine);
      if (seenSourceRecords.has(sourceRecord)) fail(`${sourceName}:${parsedRow.sourceLine}: duplicate source record "${sourceRecord}"`);
      seenSourceRecords.add(sourceRecord);
      const invoiceId = rowValue(row, indexes, 'invoiceId', sourceName, parsedRow.sourceLine);
      const customerKey = rowValue(row, indexes, 'customerId', sourceName, parsedRow.sourceLine);
      const invoiceDate = parseDate(rowValue(row, indexes, 'invoiceDate', sourceName, parsedRow.sourceLine), `${sourceName}:${parsedRow.sourceLine}.invoiceDate`);
      const status = rowValue(row, indexes, 'status', sourceName, parsedRow.sourceLine);
      const currency = rowValue(row, indexes, 'currency', sourceName, parsedRow.sourceLine).toUpperCase();
      const itemKey = rowValue(row, indexes, 'itemId', sourceName, parsedRow.sourceLine);
      const quantityText = rowValue(row, indexes, 'quantity', sourceName, parsedRow.sourceLine);
      const quantity = decimalToNumber(quantityText, `${sourceName}:${parsedRow.sourceLine}.quantity`);
      const lineAmountText = rowValue(row, indexes, 'lineAmount', sourceName, parsedRow.sourceLine);
      const lineAmount = decimalToNumber(lineAmountText, `${sourceName}:${parsedRow.sourceLine}.lineAmount`, { allowNegative: true });
      const lineAmountDecimal = decimal(lineAmountText, `${sourceName}:${parsedRow.sourceLine}.lineAmount`, { allowNegative: true });
      const subtotalText = rowValue(row, indexes, 'invoiceSubtotal', sourceName, parsedRow.sourceLine);
      const subtotal = decimal(subtotalText, `${sourceName}:${parsedRow.sourceLine}.invoiceSubtotal`);
      if (quantity < 0) fail(`${sourceName}:${parsedRow.sourceLine}: negative quantity`);
      const lineId = indexes.lineId === -1 ? null : rowValue(row, indexes, 'lineId', sourceName, parsedRow.sourceLine);
      const fingerprint = [invoiceId, customerKey, invoiceDate, status, currency, itemKey, quantityText, lineAmountText, lineId].join('\u0000');
      if (seenFingerprints.has(fingerprint)) fail(`${sourceName}:${parsedRow.sourceLine}: overlapping duplicate source record`);
      seenFingerprints.add(fingerprint);
      records.push({
        invoice_id: invoiceId,
        customer_key: customerKey,
        invoice_date: invoiceDate,
        status,
        currency,
        item_key: itemKey,
        quantity,
        net_amount: lineAmount,
        source_record: sourceRecord,
        source_file: sourceName,
        source_line: parsedRow.sourceLine,
        _lineId: lineId,
        _subtotal: subtotal,
        _lineAmount: lineAmountDecimal,
      });
    }
  }
  const byInvoice = new Map();
  const lineIdsByInvoice = new Map();
  for (const record of records) {
    const existing = byInvoice.get(record.invoice_id);
    const first = existing?.records[0];
    if (existing && (
      first.customer_key !== record.customer_key
      || first.invoice_date !== record.invoice_date
      || first.status !== record.status
      || first.currency !== record.currency
      || !decimalsEqual(existing.subtotal, record._subtotal)
    )) fail(`invoice ${record.invoice_id}: conflicting identity or subtotal`);
    const bucket = existing ?? { records: [], subtotal: record._subtotal };
    if (record._lineId !== null) {
      const lineIds = lineIdsByInvoice.get(record.invoice_id) ?? new Map();
      const identity = { item: record.item_key, quantity: record.quantity, amount: record._lineAmount };
      const prior = lineIds.get(record._lineId);
      if (prior) {
        if (
          prior.item !== identity.item
          || prior.quantity !== identity.quantity
          || !decimalsEqual(prior.amount, identity.amount)
        ) {
          fail(`invoice ${record.invoice_id}: conflicting identity for line ID "${record._lineId}"`);
        }
        fail(`invoice ${record.invoice_id}: repeated line ID "${record._lineId}"`);
      }
      lineIds.set(record._lineId, identity);
      lineIdsByInvoice.set(record.invoice_id, lineIds);
    }
    bucket.records.push(record);
    byInvoice.set(record.invoice_id, bucket);
  }
  for (const [invoiceId, bucket] of byInvoice) {
    const scale = Math.max(...bucket.records.map((record) => record._lineAmount.scale), bucket.subtotal.scale);
    const sum = {
      integer: bucket.records.reduce(
        (total, record) => total + record._lineAmount.integer * (10n ** BigInt(scale - record._lineAmount.scale)),
        0n,
      ),
      scale,
    };
    if (!decimalDifferenceWithin(sum, bucket.subtotal, tolerance)) {
      fail(`invoice ${invoiceId}: line amounts do not reconcile to subtotal within tolerance`);
    }
  }
  return {
    invoices: records.map(({ _lineId, _subtotal, _lineAmount, ...record }) => record),
    credit_notes: [],
    adapter: {
      schema: 'corpflow.orixhealth.invoice_csv_adapter.v1',
      mapping: headers,
      tolerance: config.tolerance == null ? '0.01' : String(config.tolerance),
      source_files: files.map((file) => file.name ?? 'unnamed.csv'),
      notes: [
        'Document subtotal is used only for reconciliation and is never assigned to a line.',
        'Source record references are retained; exports without line IDs cannot guarantee universal duplicate detection.',
        'Line IDs are unique within an invoice; every repeated line ID is rejected, including numerically equivalent decimal variants.',
        'Credits are not inferred or applied by this adapter and remain pending separate mapping.',
      ],
    },
  };
}

export function normalizeInvoiceCsvFiles(files, config = {}) {
  return normalizeFiles(files, config);
}

export { DEFAULT_HEADERS };
