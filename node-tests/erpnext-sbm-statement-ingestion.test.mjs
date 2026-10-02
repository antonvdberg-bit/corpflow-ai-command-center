import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  normalizeSbmStatement,
  proveSbmStatementIdempotency,
  toErpnextBankTransactionPreview,
  validateSbmStatement,
} from '../lib/erpnext/sbm-statement-ingestion.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE_PATH = path.join(
  REPO_ROOT,
  'fixtures/erpnext-bank-reconciliation-readiness/sbm-combined-statement-redacted.v1.json'
);

function fixture() {
  return JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
}

test('normalizes redacted SBM fixture and proves MUR arithmetic', () => {
  const normalized = normalizeSbmStatement(fixture());
  const validation = validateSbmStatement(normalized);
  const mur = validation.accounts.find((account) => account.currency === 'MUR');

  assert.equal(validation.ok, true);
  assert.deepEqual(mur, {
    currency: 'MUR',
    transaction_count: 8,
    empty_account: false,
    arithmetic: true,
    running_balance: true,
    movement: 9280.29,
    duplicate_fingerprints: false,
  });
  assert.equal(11570 + 19099.9 - 9819.61, 20850.29);
});

test('handles USD zero-value account without inventing transactions', () => {
  const normalized = normalizeSbmStatement(fixture());
  const usd = normalized.accounts.find((account) => account.account_currency === 'USD');

  assert.equal(usd.transactions.length, 0);
  assert.equal(usd.opening_balance, 0);
  assert.equal(usd.closing_balance, 0);
  assert.equal(validateSbmStatement(normalized).accounts[0].empty_account, true);
});

test('preserves dates, reversal rows, classifications, and stable fingerprints', () => {
  const normalized = normalizeSbmStatement(fixture());
  const rows = normalized.accounts.find((account) => account.account_currency === 'MUR').transactions;
  const types = rows.map((row) => row.probable_type);

  assert.deepEqual(types, [
    'receipt',
    'card_purchase',
    'card_purchase',
    'reversal',
    'reversal',
    'card_purchase',
    'bank_fee',
    'tax_charge',
  ]);
  assert.equal(rows[1].transaction_date, '2026-09-03');
  assert.equal(rows[1].value_date, '2026-09-04');
  assert.equal(rows[3].debit, 99.9);
  assert.equal(rows[4].credit, 99.9);
  assert.notEqual(rows[3].transaction_fingerprint, rows[4].transaction_fingerprint);
  assert.equal(rows.every((row) => row.reconciliation_status === 'UNMATCHED'), true);
});

test('replay is idempotent and produces ERPNext import preview only', () => {
  const payload = fixture();
  const proof = proveSbmStatementIdempotency(payload);
  const preview = toErpnextBankTransactionPreview(proof.first);

  assert.equal(proof.ok, true);
  assert.equal(proof.first.transactions.length, 8);
  assert.equal(preview.length, 8);
  assert.deepEqual(preview[0], {
    date: '2026-09-02',
    value_date: '2026-09-02',
    description: 'INCOMING RECEIPT - REDACTED CLIENT REF',
    deposit: 19000,
    withdrawal: 0,
    currency: 'MUR',
    reference_number: preview[0].reference_number,
    transaction_id: preview[0].transaction_id,
    bank_account: 'SBM MUR account (redacted)',
    reconciliation_status: 'UNMATCHED',
  });
  assert.equal(preview[0].transaction_id.length, 64);
  assert.equal(preview.every((row) => row.bank_account.includes('redacted')), true);
});

test('fixture contains no private bank identifiers', () => {
  const raw = readFileSync(FIXTURE_PATH, 'utf8');
  assert.doesNotMatch(raw, /IBAN|SWIFT|BIC|QR|CIF|account[_ -]?number|MU\d{2}[A-Z]{4}\d/i);
});
