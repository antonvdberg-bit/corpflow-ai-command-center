import fs from 'node:fs';

const DATE_FORMATS = new Set(['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'D-MMM-YY']);
const ENGLISH_MONTHS = new Map([
  ['JAN', 1], ['FEB', 2], ['MAR', 3], ['APR', 4], ['MAY', 5], ['JUN', 6],
  ['JUL', 7], ['AUG', 8], ['SEP', 9], ['OCT', 10], ['NOV', 11], ['DEC', 12],
]);

function csvRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let afterQuote = false;
  let sourceRow = 1;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
        afterQuote = true;
      } else {
        field += char;
      }
    } else if (afterQuote) {
      if (char === ',' || char === '\n' || char === '\r') {
        afterQuote = false;
        if (char === ',') {
          row.push(field);
          field = '';
        } else {
          if (char === '\r' && text[i + 1] === '\n') i += 1;
          row.push(field);
          rows.push({ values: row, sourceRow });
          sourceRow += 1;
          row = [];
          field = '';
        }
      } else {
        throw new Error(`Malformed CSV quote at character ${i + 1}`);
      }
    } else if (char === '"') {
      if (field.length !== 0) throw new Error(`Malformed CSV quote at character ${i + 1}`);
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push({ values: row, sourceRow });
      sourceRow += 1;
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error('Malformed CSV: unterminated quoted field');
  if (field !== '' || row.length > 0 || afterQuote) {
    row.push(field);
    rows.push({ values: row, sourceRow });
  }
  return rows;
}

function parseDate(value, format, twoDigitYearCentury) {
  const text = value.trim();
  let year;
  let month;
  let day;
  if (format === 'YYYY-MM-DD') {
    [, year, month, day] = text.match(/^(\d{4})-(\d{2})-(\d{2})$/) || [];
  } else if (format === 'DD/MM/YYYY') {
    [, day, month, year] = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/) || [];
  } else if (format === 'MM/DD/YYYY') {
    [, month, day, year] = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/) || [];
  } else if (format === 'D-MMM-YY') {
    const match = text.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
    if (match) {
      [, day, month, year] = match;
      month = ENGLISH_MONTHS.get(month.toUpperCase());
      if (twoDigitYearCentury === undefined) {
        throw new Error('twoDigitYearCentury is required for D-MMM-YY');
      }
      year = Number(twoDigitYearCentury) + Number(year);
    }
  }
  if (!year || !month || !day) throw new Error(`Invalid date "${value}" for ${format}`);
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year)
    || date.getUTCMonth() !== Number(month) - 1
    || date.getUTCDate() !== Number(day)
  ) throw new Error(`Invalid date "${value}" for ${format}`);
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseMoney(value, decimalSeparator, label) {
  const text = value.trim();
  if (!text) return null;
  const escaped = decimalSeparator === ',' ? ',' : '\\.';
  const pattern = new RegExp(`^[+-]?\\d+(?:${escaped}\\d{1,2})?$`);
  if (!pattern.test(text)) throw new Error(`Malformed ${label} amount "${value}"`);
  const normalized = decimalSeparator === ',' ? text.replace(',', '.') : text;
  const negative = normalized.startsWith('-');
  const unsigned = normalized.replace(/^[+-]/, '');
  const [whole, fraction = ''] = unsigned.split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  return (negative ? -1n : 1n) * cents;
}

function moneyString(cents) {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  return `${negative ? '-' : ''}${absolute / 100n}.${(absolute % 100n).toString().padStart(2, '0')}`;
}

function requiredMapping(mapping) {
  if (!mapping || typeof mapping !== 'object') throw new Error('A JSON column mapping is required');
  if (!mapping.date || !mapping.description) throw new Error('Mapping must include date and description');
  const hasSigned = Boolean(mapping.amount);
  const hasSplit = Boolean(mapping.debit) || Boolean(mapping.credit);
  if (hasSigned === hasSplit) {
    throw new Error('Mapping must include either amount or both debit and credit');
  }
  if (hasSplit && (!mapping.debit || !mapping.credit)) {
    throw new Error('Split amount mapping must include both debit and credit');
  }
  return mapping;
}

export function parseBankStatementCsv(text, {
  mapping,
  dateFormat,
  decimalSeparator = '.',
  twoDigitYearCentury,
} = {}) {
  const selectedMapping = requiredMapping(mapping);
  if (!DATE_FORMATS.has(dateFormat)) throw new Error('dateFormat must be YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, or D-MMM-YY');
  if (dateFormat === 'D-MMM-YY' && (
    twoDigitYearCentury === undefined
    || !Number.isInteger(Number(twoDigitYearCentury))
    || Number(twoDigitYearCentury) < 0
    || Number(twoDigitYearCentury) % 100 !== 0
  )) {
    throw new Error('twoDigitYearCentury must be an integer century start for D-MMM-YY');
  }
  if (dateFormat !== 'D-MMM-YY' && twoDigitYearCentury !== undefined) {
    throw new Error('twoDigitYearCentury is only valid for D-MMM-YY');
  }
  if (decimalSeparator !== '.' && decimalSeparator !== ',') {
    throw new Error('decimalSeparator must be "." or ","');
  }
  const rows = csvRows(text);
  if (rows.length === 0) throw new Error('CSV must contain a header row');
  const headers = rows[0].values.map((header) => header.trim());
  const headerSet = new Set(headers);
  const requiredHeaders = Object.values(selectedMapping);
  if (new Set(requiredHeaders).size !== requiredHeaders.length) {
    throw new Error('Mapping fields must use distinct CSV headers');
  }
  for (const name of requiredHeaders) {
    if (!headerSet.has(name)) throw new Error(`Required mapped header is missing: "${name}"`);
  }
  for (const name of requiredHeaders) {
    if (headers.filter((header) => header === name).length > 1) {
      throw new Error(`Required mapped header is duplicated: "${name}"`);
    }
  }
  if (headers.some((header) => header === '')) throw new Error('CSV header names must not be blank');
  const index = Object.fromEntries(headers.map((header, position) => [header, position]));
  const exceptions = [];
  const entries = [];
  let hasNonBlankDataRow = false;
  for (let position = 1; position < rows.length; position += 1) {
    const { values: row, sourceRow } = rows[position];
    if (!row.some((value) => value.trim() !== '')) continue;
    hasNonBlankDataRow = true;
    if (row.length !== headers.length) {
      throw new Error(`Invalid column count at source row ${sourceRow}: expected ${headers.length}, found ${row.length}`);
    }
    const value = (name) => row[index[name]]?.trim() ?? '';
    try {
      const date = parseDate(value(selectedMapping.date), dateFormat, Number(twoDigitYearCentury));
      const description = value(selectedMapping.description);
      const reference = selectedMapping.reference ? value(selectedMapping.reference) : '';
      if (!description) throw new Error('Description is blank');
      let cents;
      let debit = 0n;
      let credit = 0n;
      if (selectedMapping.amount) {
        cents = parseMoney(value(selectedMapping.amount), decimalSeparator, 'signed');
        if (cents === null) throw new Error('Signed amount is required');
        if (cents > 0n) credit = cents;
        else debit = -cents;
      } else {
        debit = parseMoney(value(selectedMapping.debit), decimalSeparator, 'debit') ?? 0n;
        credit = parseMoney(value(selectedMapping.credit), decimalSeparator, 'credit') ?? 0n;
        if (debit < 0n || credit < 0n) throw new Error('Debit and credit amounts must not be negative');
        if (debit !== 0n && credit !== 0n) throw new Error('Debit and credit cannot both be populated');
        if (debit === 0n && credit === 0n) throw new Error('Debit or credit amount is required');
        cents = credit - debit;
      }
      entries.push({
        sourceRow,
        date,
        description,
        reference,
        debit: moneyString(debit),
        credit: moneyString(credit),
        signedAmount: moneyString(cents),
      });
    } catch (error) {
      exceptions.push({ sourceRow, reason: error.message });
    }
  }
  const duplicateGroups = new Map();
  for (const entry of entries) {
    const key = `${entry.date}\u0000${entry.description}\u0000${entry.signedAmount}`;
    const group = duplicateGroups.get(key) || [];
    group.push(entry.sourceRow);
    duplicateGroups.set(key, group);
  }
  const candidateDuplicates = [...duplicateGroups.values()]
    .filter((sourceRows) => sourceRows.length > 1)
    .map((sourceRows) => ({ sourceRows, warning: 'Candidate duplicate; no row was removed' }));
  const sum = (field) => entries.reduce((total, entry) => total + parseMoney(entry[field], '.', field), 0n);
  if (!hasNonBlankDataRow) throw new Error('CSV must contain at least one non-blank data row');
  return {
    schema: 'corpflow.orixhealth.bank_statement_check.v1',
    dryRun: true,
    input: { rowCount: entries.length, dateFormat, decimalSeparator, mapping: selectedMapping, ...(dateFormat === 'D-MMM-YY' ? { twoDigitYearCentury: Number(twoDigitYearCentury) } : {}) },
    totals: {
      credits: moneyString(sum('credit')),
      debits: moneyString(sum('debit')),
      net: moneyString(sum('signedAmount')),
    },
    candidateDuplicates,
    exceptions,
    rows: entries,
    warnings: ['Real MCB header/mapping validation is pending a private local extract; no banking rules or reconciliation were claimed.'],
  };
}

export function checkBankStatementFile({ csvPath, ...options }) {
  if (!csvPath) throw new Error('csvPath is required');
  return parseBankStatementCsv(fs.readFileSync(csvPath, 'utf8'), options);
}

function csvField(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function zohoCsvFromReport(report) {
  if (report.exceptions.length > 0) {
    throw new Error('Cannot create Zoho CSV while validation exceptions exist');
  }
  const lines = ['Date,Description,Reference,Debit,Credit'];
  for (const row of report.rows) {
    lines.push([
      row.date,
      row.description,
      row.reference,
      row.debit === '0.00' ? '' : row.debit,
      row.credit === '0.00' ? '' : row.credit,
    ].map(csvField).join(','));
  }
  return `${lines.join('\n')}\n`;
}
