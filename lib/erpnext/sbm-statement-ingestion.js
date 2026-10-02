/**
 * Offline SBM statement normalization for #1378.
 *
 * This module consumes a redacted conversion payload, not a bank PDF or live
 * feed. It produces stable rows and an ERPNext Bank Transaction import preview;
 * it never creates ERPNext records.
 */

import { createHash } from 'node:crypto';

const MONEY_SCALE = 100;
const DEFAULT_STATUS = 'UNMATCHED';
const TYPES = new Set([
  'receipt',
  'card_purchase',
  'reversal',
  'bank_fee',
  'tax_charge',
  'unknown',
]);

function cents(value) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * MONEY_SCALE);
}

function money(value) {
  return cents(value) / MONEY_SCALE;
}

function moneyFromCents(value) {
  return value / MONEY_SCALE;
}

function text(value) {
  return value == null ? '' : String(value).trim();
}

function classify(description) {
  const value = text(description).toLowerCase();
  if (/(reversal|reversed|verification)/.test(value)) return 'reversal';
  if (/(vat|tax)/.test(value)) return 'tax_charge';
  if (/(fee|charge bancaire|bank charge)/.test(value)) return 'bank_fee';
  if (/(card|merchant|pos|cloud|software)/.test(value)) return 'card_purchase';
  if (/(receipt|credit|transfer in|incoming)/.test(value)) return 'receipt';
  return 'unknown';
}

function fingerprint(account, row) {
  const stable = [
    account.currency,
    account.statement_period,
    row.transaction_date,
    row.value_date,
    row.branch,
    row.description,
    money(row.debit),
    money(row.credit),
  ].join('|');
  return createHash('sha256').update(stable).digest('hex');
}

function normalizeAccount(account) {
  const sourceRows = Array.isArray(account.transactions) ? account.transactions : [];
  let balance = cents(account.opening_balance);
  const rows = sourceRows.map((source, index) => {
    const debit = money(source.debit);
    const credit = money(source.credit);
    balance += cents(credit) - cents(debit);
    const row = {
      account_currency: text(account.currency),
      statement_period: text(account.statement_period),
      transaction_date: text(source.transaction_date),
      value_date: text(source.value_date),
      branch: text(source.branch) || 'SBM',
      description: text(source.description),
      debit,
      credit,
      running_balance: moneyFromCents(balance),
      transaction_fingerprint: '',
      probable_type: TYPES.has(source.probable_type) ? source.probable_type : classify(source.description),
      reconciliation_status: DEFAULT_STATUS,
      source_row: index + 1,
    };
    row.transaction_fingerprint = fingerprint(account, row);
    return row;
  });
  return {
    account_currency: text(account.currency),
    statement_period: text(account.statement_period),
    opening_balance: money(account.opening_balance),
    total_credits: money(account.total_credits),
    total_debits: money(account.total_debits),
    closing_balance: money(account.closing_balance),
    lien: money(account.lien),
    transactions: rows,
  };
}

/**
 * Normalize a redacted conversion payload made from an SBM statement.
 *
 * @param {{ statement_id?: string, accounts?: Array<Record<string, unknown>> }} payload
 */
export function normalizeSbmStatement(payload) {
  const accounts = Array.isArray(payload?.accounts) ? payload.accounts : [];
  const normalizedAccounts = accounts.map(normalizeAccount);
  return {
    statement_id: text(payload?.statement_id),
    accounts: normalizedAccounts,
    transactions: normalizedAccounts.flatMap((account) => account.transactions),
  };
}

/**
 * Validate statement totals, running balances, empty accounts, and duplicate
 * transaction fingerprints without touching ERPNext.
 */
export function validateSbmStatement(statement) {
  const accounts = Array.isArray(statement?.accounts) ? statement.accounts : [];
  const accountResults = accounts.map((account) => {
    const transactionMovement = account.transactions.reduce(
      (total, row) => total + cents(row.credit) - cents(row.debit),
      0
    );
    const expectedMovement = cents(account.total_credits) - cents(account.total_debits);
    const arithmetic = cents(account.opening_balance) + expectedMovement === cents(account.closing_balance);
    const runningBalance = account.transactions.length === 0
      ? cents(account.opening_balance) === cents(account.closing_balance)
      : cents(account.transactions.at(-1).running_balance) === cents(account.closing_balance);
    return {
      currency: account.account_currency,
      transaction_count: account.transactions.length,
      empty_account: account.transactions.length === 0,
      arithmetic,
      running_balance: runningBalance && transactionMovement === expectedMovement,
      movement: moneyFromCents(transactionMovement),
      duplicate_fingerprints: new Set(account.transactions.map((row) => row.transaction_fingerprint)).size !== account.transactions.length,
    };
  });
  return {
    ok: accountResults.every((result) =>
      result.arithmetic && result.running_balance && !result.duplicate_fingerprints
    ),
    accounts: accountResults,
  };
}

/**
 * Map normalized rows to an offline ERPNext Bank Transaction import preview.
 * This is preview data only; no ERPNext API or database call is made.
 */
export function toErpnextBankTransactionPreview(statement) {
  return statement.transactions.map((row) => ({
    date: row.transaction_date,
    value_date: row.value_date,
    description: row.description,
    deposit: row.credit,
    withdrawal: row.debit,
    currency: row.account_currency,
    reference_number: row.transaction_fingerprint.slice(0, 16),
    transaction_id: row.transaction_fingerprint,
    bank_account: `SBM ${row.account_currency} account (redacted)`,
    reconciliation_status: row.reconciliation_status,
  }));
}

/**
 * Stable replay proof for the same redacted statement payload.
 */
export function proveSbmStatementIdempotency(payload) {
  const first = normalizeSbmStatement(payload);
  const second = normalizeSbmStatement(payload);
  const firstJson = JSON.stringify(first);
  const secondJson = JSON.stringify(second);
  return {
    ok: firstJson === secondJson,
    normalized_fingerprint: createHash('sha256').update(firstJson).digest('hex'),
    first,
    second,
  };
}
