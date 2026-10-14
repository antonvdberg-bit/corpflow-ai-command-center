import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { parseBankStatementCsv, zohoCsvFromReport } from '../lib/orixhealth/bank-statement-check.js';

const splitMapping = { date: 'Date', description: 'Description', debit: 'Debit', credit: 'Credit' };

test('synthetic fixture parses quoted descriptions, blank rows, totals, and duplicate warnings', () => {
  const fixture = JSON.parse(fs.readFileSync('fixtures/orixhealth/bank-statement-check.synthetic.json', 'utf8'));
  const report = parseBankStatementCsv(fixture.csv, fixture);
  assert.equal(report.dryRun, true);
  assert.equal(report.input.rowCount, 3);
  assert.deepEqual(report.totals, { credits: '1250.00', debits: '1000.00', net: '250.00' });
  assert.equal(report.rows[0].description, 'Supplier, Mauritius');
  assert.deepEqual(report.candidateDuplicates, [{ sourceRows: [3, 4], warning: 'Candidate duplicate; no row was removed' }]);
});

test('signed amount layout is decimal-safe and classifies positive values as credits', () => {
  const report = parseBankStatementCsv(
    'Date,Description,Amount\n01/10/2026,Opening balance,\"1000,10\"\n02/10/2026,Fee,\"-0,10\"\n',
    { mapping: { date: 'Date', description: 'Description', amount: 'Amount' }, dateFormat: 'DD/MM/YYYY', decimalSeparator: ',' },
  );
  assert.deepEqual(report.totals, { credits: '1000.10', debits: '0.10', net: '1000.00' });
});

test('invalid dates and malformed numbers become source-row exceptions', () => {
  const report = parseBankStatementCsv(
    'Date,Description,Debit,Credit\n\n31/02/2026,Impossible,1.00,\n01/03/2026,Bad money,wat,\n02/03/2026,,1.00,',
    { mapping: splitMapping, dateFormat: 'DD/MM/YYYY', decimalSeparator: '.' },
  );
  assert.deepEqual(report.exceptions, [
    { sourceRow: 3, reason: 'Invalid date "31/02/2026" for DD/MM/YYYY' },
    { sourceRow: 4, reason: 'Malformed debit amount "wat"' },
    { sourceRow: 5, reason: 'Description is blank' },
  ]);
});

test('conflicting debit and credit is rejected without conversion', () => {
  const report = parseBankStatementCsv(
    'Date,Description,Debit,Credit\n2026-10-01,Conflict,1.00,2.00',
    { mapping: splitMapping, dateFormat: 'YYYY-MM-DD', decimalSeparator: '.' },
  );
  assert.deepEqual(report.exceptions, [{ sourceRow: 2, reason: 'Debit and credit cannot both be populated' }]);
  assert.equal(report.input.rowCount, 0);
});

test('missing required headers and ambiguous date configuration fail closed', () => {
  assert.throws(
    () => parseBankStatementCsv('Date,Description,Value\n01/02/2026,Item,1.00', {
      mapping: splitMapping, dateFormat: 'DD/MM/YYYY', decimalSeparator: '.',
    }),
    /Required mapped header is missing: "Debit"/,
  );
  assert.throws(
    () => parseBankStatementCsv('Date,Description,Amount\n01/02/2026,Item,1.00', {
      mapping: { date: 'Date', description: 'Description', amount: 'Amount' }, decimalSeparator: '.',
    }),
    /dateFormat must be/,
  );
});

test('duplicate mapped headers and invalid row widths fail closed', () => {
  assert.throws(
    () => parseBankStatementCsv('Date,Description,Debit,Debit,Credit\n2026-10-01,Item,1.00,,', {
      mapping: splitMapping, dateFormat: 'YYYY-MM-DD', decimalSeparator: '.',
    }),
    /Required mapped header is duplicated: "Debit"/,
  );
  assert.throws(
    () => parseBankStatementCsv('Date,Description,Debit,Credit\n2026-10-01,Item,1.00', {
      mapping: splitMapping, dateFormat: 'YYYY-MM-DD', decimalSeparator: '.',
    }),
    /Invalid column count at source row 2: expected 4, found 3/,
  );
});

test('malformed CSV quoting is rejected', () => {
  assert.throws(
    () => parseBankStatementCsv('Date,Description,Amount\n2026-10-01,"Unclosed,1.00', {
      mapping: { date: 'Date', description: 'Description', amount: 'Amount' },
      dateFormat: 'YYYY-MM-DD',
      decimalSeparator: '.',
    }),
    /unterminated quoted field/,
  );
});

test('D-MMM-YY requires an explicit English century and rejects impossible dates', () => {
  const options = {
    mapping: { date: 'Date', description: 'Description', amount: 'Amount' },
    dateFormat: 'D-MMM-YY',
    decimalSeparator: '.',
  };
  assert.throws(
    () => parseBankStatementCsv('Date,Description,Amount\n1-Jan-26,Item,1.00', options),
    /twoDigitYearCentury/,
  );
  const invalidDateReport = parseBankStatementCsv(
    'Date,Description,Amount\n31-Feb-26,Item,1.00',
    { ...options, twoDigitYearCentury: 2000 },
  );
  assert.deepEqual(invalidDateReport.exceptions, [
    { sourceRow: 2, reason: 'Invalid date "31-Feb-26" for D-MMM-YY' },
  ]);
  const report = parseBankStatementCsv(
    'Date,Description,Amount\n1-Jan-26,Item,1.00\n02-dec-26,Other,-0.25',
    { ...options, twoDigitYearCentury: 2000 },
  );
  assert.deepEqual(report.rows.map((row) => row.date), ['2026-01-01', '2026-12-02']);
});

test('Zoho CSV preserves signed/split values, references, duplicates, and CSV quoting', () => {
  const report = parseBankStatementCsv(
    'Date,Description,Reference,Amount\n2026-01-01,"Fee, ""urgent""\nline",REF-1,-12.50\n2026-01-02,Receipt,REF-2,12.50\n2026-01-02,Receipt,REF-2,12.50',
    {
      mapping: { date: 'Date', description: 'Description', reference: 'Reference', amount: 'Amount' },
      dateFormat: 'YYYY-MM-DD',
      decimalSeparator: '.',
    },
  );
  const csv = zohoCsvFromReport(report);
  assert.equal(csv, [
    'Date,Description,Reference,Debit,Credit',
    '2026-01-01,"Fee, ""urgent""\nline",REF-1,12.50,',
    '2026-01-02,Receipt,REF-2,,12.50',
    '2026-01-02,Receipt,REF-2,,12.50',
    '',
  ].join('\n'));
  assert.deepEqual(report.totals, { credits: '25.00', debits: '12.50', net: '12.50' });
  assert.equal(report.candidateDuplicates.length, 1);
});

test('Zoho CSV fails closed when any row is invalid', () => {
  const report = parseBankStatementCsv(
    'Date,Description,Amount\n2026-01-01,Good,1.00\n2026-02-31,Bad,2.00',
    { mapping: { date: 'Date', description: 'Description', amount: 'Amount' }, dateFormat: 'YYYY-MM-DD' },
  );
  assert.throws(() => zohoCsvFromReport(report), /validation exceptions/);
  assert.throws(() => zohoCsvFromReport({ exceptions: [], rows: [] }), /without validated rows/);
});

test('CLI writes a validated CSV and rejects collisions without changing destinations', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'orixhealth-check-'));
  const input = path.join(directory, 'input.csv');
  const output = path.join(directory, 'statement.csv');
  fs.writeFileSync(input, 'Date,Description,Amount\n1-Jan-26,"A, B",-1.25\n');
  const args = [
    'scripts/orixhealth/bank-statement-check.mjs',
    '--csv', input,
    '--mapping', '{"date":"Date","description":"Description","amount":"Amount"}',
    '--date-format', 'D-MMM-YY',
    '--two-digit-year-century', '2000',
    '--decimal-separator', '.',
    '--zoho-csv-output', output,
  ];
  execFileSync(process.execPath, args, { cwd: process.cwd(), stdio: 'pipe' });
  const exportedCsv = fs.readFileSync(output, 'utf8');
  assert.equal(exportedCsv, 'Date,Description,Reference,Debit,Credit\n2026-01-01,"A, B",,1.25,\n');
  const roundTrip = parseBankStatementCsv(exportedCsv, {
    mapping: { date: 'Date', description: 'Description', debit: 'Debit', credit: 'Credit' },
    dateFormat: 'YYYY-MM-DD',
    decimalSeparator: '.',
  });
  assert.deepEqual(roundTrip.totals, { credits: '0.00', debits: '1.25', net: '-1.25' });
  const original = 'untouched\n';
  fs.writeFileSync(output, original);
  assert.throws(() => execFileSync(process.execPath, args, { cwd: process.cwd(), stdio: 'pipe' }));
  assert.equal(fs.readFileSync(output, 'utf8'), original);
  assert.throws(() => execFileSync(process.execPath, [
    ...args.slice(0, -1), input,
  ], { cwd: process.cwd(), stdio: 'pipe' }));
  const invalidInput = path.join(directory, 'invalid.csv');
  const invalidOutput = path.join(directory, 'invalid-review.csv');
  fs.writeFileSync(invalidInput, 'Date,Description,Amount\n31-Feb-26,Bad,1.00\n');
  assert.throws(() => execFileSync(process.execPath, [
    ...args.slice(0, 2), invalidInput,
    ...args.slice(3, -1), invalidOutput,
  ], { cwd: process.cwd(), stdio: 'pipe' }));
  assert.equal(fs.existsSync(invalidOutput), false);
});

test('blank-only and empty CSV input fail closed', () => {
  assert.throws(
    () => parseBankStatementCsv('Date,Description,Amount\n\n,,\n', {
      mapping: { date: 'Date', description: 'Description', amount: 'Amount' },
      dateFormat: 'YYYY-MM-DD',
    }),
    /at least one non-blank data row/,
  );
  assert.throws(
    () => parseBankStatementCsv('', {
      mapping: { date: 'Date', description: 'Description', amount: 'Amount' },
      dateFormat: 'YYYY-MM-DD',
    }),
    /header row/,
  );
});

test('CLI preflights both output parents before writing JSON or CSV', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'orixhealth-output-preflight-'));
  const input = path.join(directory, 'input.csv');
  const jsonOutput = path.join(directory, 'report.json');
  const csvOutput = path.join(directory, 'missing', 'statement.csv');
  fs.writeFileSync(input, 'Date,Description,Amount\n2026-01-01,Item,1.00\n');
  assert.throws(() => execFileSync(process.execPath, [
    'scripts/orixhealth/bank-statement-check.mjs',
    '--csv', input,
    '--mapping', '{"date":"Date","description":"Description","amount":"Amount"}',
    '--date-format', 'YYYY-MM-DD',
    '--decimal-separator', '.',
    '--output', jsonOutput,
    '--zoho-csv-output', csvOutput,
  ], { cwd: process.cwd(), stdio: 'pipe' }));
  assert.equal(fs.existsSync(jsonOutput), false);
  assert.equal(fs.existsSync(csvOutput), false);
});
