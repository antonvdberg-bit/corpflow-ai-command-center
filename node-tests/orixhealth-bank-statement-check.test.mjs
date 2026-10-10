import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { parseBankStatementCsv } from '../lib/orixhealth/bank-statement-check.js';

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
    () => parseBankStatementCsv('Date,Description,Debit,Debit\n2026-10-01,Item,1.00,', {
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
