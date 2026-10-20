import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  extractSbmStatementFromPdf,
  parseSbmStatementText,
} from '../lib/finance/sbm-statement-pdf-extraction.js';
import {
  normalizeSbmStatement,
  validateSbmStatement,
} from '../lib/erpnext/sbm-statement-ingestion.js';

const MUR_STATEMENT = `
Currency: MUR
Statement Period: 01/09/2026 - 30/09/2026
Opening Balance: MUR 1,000.00
Total Credits: MUR 250.00
Total Debits: MUR 150.00
Closing Balance: MUR 1,100.00
02/09/2026 02/09/2026 INCOMING RECEIPT - REDACTED 0.00 250.00 1,250.00
03/09/2026 04/09/2026 CLOUD SOFTWARE CHARGE 150.00 0.00 1,100.00
`;

test('parses the approved SBM tabular text layout into a validation payload', () => {
  const extracted = parseSbmStatementText(MUR_STATEMENT);
  const validation = validateSbmStatement(normalizeSbmStatement(extracted));

  assert.equal(extracted.accounts.length, 1);
  assert.equal(extracted.accounts[0].currency, 'MUR');
  assert.equal(extracted.accounts[0].statement_period, '2026-09-01/2026-09-30');
  assert.equal(extracted.accounts[0].transactions.length, 2);
  assert.equal(extracted.accounts[0].transactions[1].value_date, '2026-09-04');
  assert.equal(validation.ok, true);
});

test('rejects a layout whose totals do not reconcile instead of inventing transactions', () => {
  assert.throws(
    () => parseSbmStatementText(MUR_STATEMENT.replace('Closing Balance: MUR 1,100.00', 'Closing Balance: MUR 1,101.00')),
    { code: 'SBM_PDF_ACCOUNT_ARITHMETIC_FAILED' },
  );
});

test('uses the native PDF text extractor adapter and destroys its parser', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sbm-pdf-extract-'));
  const pdfPath = path.join(root, 'statement.pdf');
  await writeFile(pdfPath, '%PDF-1.7 synthetic placeholder');
  let destroyed = false;

  class SyntheticPdfParser {
    async getText() {
      return { text: MUR_STATEMENT };
    }

    async destroy() {
      destroyed = true;
    }
  }

  const extracted = await extractSbmStatementFromPdf(pdfPath, { PDFParseClass: SyntheticPdfParser });
  assert.equal(extracted.accounts[0].closing_balance, 1100);
  assert.equal(destroyed, true);
});

test('fails closed when native text extraction cannot establish a statement', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'sbm-pdf-extract-'));
  const pdfPath = path.join(root, 'statement.pdf');
  await writeFile(pdfPath, '%PDF-1.7 synthetic placeholder');

  class EmptyPdfParser {
    async getText() {
      return { text: '' };
    }
  }

  await assert.rejects(
    () => extractSbmStatementFromPdf(pdfPath, { PDFParseClass: EmptyPdfParser }),
    { code: 'SBM_PDF_EMPTY_TEXT' },
  );
});
