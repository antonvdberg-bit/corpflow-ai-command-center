/**
 * ERPNext bank / reconciliation readiness (#1139) landed on current main (#1220).
 *
 * Mapping + guard + synthetic matching rules for the standard-ERPNext-first
 * payment-evidence -> later Payment Entry -> statement import -> recon path.
 *
 * No live ERPNext calls. No secrets. No custom fields.
 * Payment Entry submit, Bank Account mutation, bank credentials, and
 * bank-feed connection remain separately protected.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../..');
export const CONFIG_REL = 'config/erpnext-bank-reconciliation-readiness.v1.json';
export const FIXTURE_REL =
  'fixtures/erpnext-bank-reconciliation-readiness/synthetic-statement.v1.json';

export const SOURCE_PACKET_ISSUE = 1139;
export const CURRENT_MAIN_ISSUE = 1220;
export const CURRENT_MAIN_SHA = 'eb31cfd3d3c74a3f8a17b81ae4d6cccf54c07751';
export const CANONICAL_VERDICT =
  'ERPNext BANK / RECONCILIATION READINESS READY FOR ACCOUNTANT CONFIGURATION';
export const CURRENT_MAIN_VERDICT =
  'ERPNext BANK/RECONCILIATION CURRENT-MAIN READY FOR ACCOUNTANT CONFIGURATION';
export const BANK_FEED_VERDICT = 'NOT REQUIRED';
export const PAYMENT_SEGREGATION_RULE = 'PAYMENT_EVIDENCE_NEVER_AUTHORIZES_PAYMENT_ENTRY';

/** @type {Record<string, unknown> | null} */
let cachedConfig = null;

function asTrimmedString(value) {
  return value == null ? '' : String(value).trim();
}

function asFiniteNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function roundMoney(value) {
  const n = asFiniteNumber(value);
  if (n == null) return null;
  return Math.round(n * 100) / 100;
}

function loadConfig(repoRoot = REPO_ROOT) {
  return JSON.parse(readFileSync(path.join(repoRoot, CONFIG_REL), 'utf8'));
}

/**
 * @param {string} [repoRoot]
 */
export function loadBankReconciliationReadinessConfig(repoRoot = REPO_ROOT) {
  if (cachedConfig && repoRoot === REPO_ROOT) return cachedConfig;
  const parsed = loadConfig(repoRoot);
  if (repoRoot === REPO_ROOT) cachedConfig = parsed;
  return parsed;
}

export function resetBankReconciliationReadinessConfigCache() {
  cachedConfig = null;
}

/**
 * @param {string} [repoRoot]
 */
export function loadSyntheticStatementFixture(repoRoot = REPO_ROOT) {
  return JSON.parse(readFileSync(path.join(repoRoot, FIXTURE_REL), 'utf8'));
}

/**
 * @param {Record<string, unknown>} [config]
 */
export function listProcessStages(config = loadBankReconciliationReadinessConfig()) {
  return Array.isArray(config.process_stages) ? config.process_stages : [];
}

/**
 * @param {Record<string, unknown>} [config]
 */
export function listAccountantDependencies(config = loadBankReconciliationReadinessConfig()) {
  return Array.isArray(config.accountant_dependencies) ? config.accountant_dependencies : [];
}

/**
 * @param {Record<string, unknown>} [config]
 */
export function listForbiddenBankEvidenceKeys(config = loadBankReconciliationReadinessConfig()) {
  const keys = config.forbidden_github_evidence_keys;
  return Array.isArray(keys) ? keys.map((k) => String(k)) : [];
}

/**
 * @param {unknown} value
 * @param {string[]} [acc]
 */
function collectObjectKeys(value, acc = []) {
  if (value && typeof value === 'object') {
    if (Array.isArray(value)) {
      value.forEach((item) => collectObjectKeys(item, acc));
      return acc;
    }
    for (const [key, nested] of Object.entries(value)) {
      acc.push(key);
      collectObjectKeys(nested, acc);
    }
  }
  return acc;
}

/**
 * @param {unknown} payload
 * @param {Record<string, unknown>} [config]
 */
export function payloadContainsForbiddenBankEvidence(
  payload,
  config = loadBankReconciliationReadinessConfig()
) {
  const forbidden = new Set(listForbiddenBankEvidenceKeys(config).map((k) => k.toLowerCase()));
  const keys = collectObjectKeys(payload);
  return keys.filter((key) => forbidden.has(String(key).toLowerCase()));
}

const SECRETISH_VALUE =
  /\b(?:iban|swift|bic|routing|sort code|account number|acct\s*#)\b/i;

/**
 * Strip private banking values from a read-back row. Names/types stay.
 *
 * @param {Record<string, unknown> | null | undefined} row
 * @param {Record<string, unknown>} [config]
 */
export function sanitizeBankReadback(row, config = loadBankReconciliationReadinessConfig()) {
  if (!row || typeof row !== 'object') return null;
  const forbidden = new Set(listForbiddenBankEvidenceKeys(config).map((k) => k.toLowerCase()));
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    const lower = key.toLowerCase();
    if (forbidden.has(lower)) {
      out[`${key}_present`] = value != null && String(value).trim() !== '';
      continue;
    }
    if (typeof value === 'string' && SECRETISH_VALUE.test(value)) {
      out[key] = '[redacted]';
      continue;
    }
    out[key] = value;
  }
  return out;
}

/**
 * Fail-closed gate for Payment Entry submit/post.
 *
 * financially_approved (#551/#714) is a build gate, not payment authority.
 *
 * @param {{
 *   accountantApproved?: boolean,
 *   bankLedgerApproved?: boolean,
 *   fxTreatmentApproved?: boolean,
 *   financiallyApproved?: boolean,
 *   bankCreditVisible?: boolean,
 *   docstatus?: number,
 * }} input
 */
export function evaluatePaymentEntrySubmitGate(input = {}) {
  const missing = [];
  if (input.accountantApproved !== true) missing.push('accountant_foundation_#1055');
  if (input.bankLedgerApproved !== true) missing.push('bank_cash_ledger_accounts');
  if (input.fxTreatmentApproved !== true) missing.push('fx_receipts_payments');
  if (input.bankCreditVisible !== true) missing.push('bank_credit_visible');
  const allowed = missing.length === 0;
  return {
    allowed: false,
    packet_never_submits: true,
    would_be_unblocked: allowed,
    missing,
    financially_approved_is_not_authority: true,
    financially_approved: input.financiallyApproved === true,
    rule: PAYMENT_SEGREGATION_RULE,
    note:
      input.financiallyApproved === true
        ? 'financially_approved permits onboarding/build only. Payment Entry submit remains separately protected.'
        : 'Payment remains unapproved until #551/#714 evidence is complete AND accountant-approved ledgers exist AND Anton authorizes the exact Payment Entry.',
  };
}

/**
 * @param {{
 *   accountantApproved?: boolean,
 *   bankLedgerApproved?: boolean,
 *   antonApprovedMutation?: boolean,
 * }} input
 */
export function evaluateBankAccountMutationGate(input = {}) {
  const missing = [];
  if (input.accountantApproved !== true) missing.push('accountant_foundation_#1055');
  if (input.bankLedgerApproved !== true) missing.push('bank_cash_ledger_accounts');
  if (input.antonApprovedMutation !== true) missing.push('anton_exact_bank_account_approval');
  return {
    allowed: false,
    packet_never_mutates: true,
    would_be_unblocked: missing.length === 0,
    missing,
    note: 'Do not create, rename, or edit real Bank Accounts or ledger accounts in this packet.',
  };
}

/**
 * @param {{ volumeInvoicesPerMonth?: number, unmatchedRate?: number, accountantRequestsFeed?: boolean }} input
 */
export function evaluateBankFeedNeed(input = {}, config = loadBankReconciliationReadinessConfig()) {
  const volume = asFiniteNumber(input.volumeInvoicesPerMonth);
  const unmatched = asFiniteNumber(input.unmatchedRate);
  const highVolume = volume != null && volume > 50;
  const highUnmatched = unmatched != null && unmatched > 0.2;
  if (input.accountantRequestsFeed === true || highVolume || highUnmatched) {
    return {
      verdict: 'REQUIRES LATER DECISION',
      connect_now: false,
      reason:
        'A later protected decision may be needed if volume, unmatched rate, or accountant direction changes. This packet still does not connect a feed.',
    };
  }
  const feed = /** @type {Record<string, unknown>} */ (config.bank_feed || {});
  return {
    verdict: asTrimmedString(feed.verdict) || BANK_FEED_VERDICT,
    connect_now: false,
    reason:
      asTrimmedString(feed.reason) ||
      'Manual/import-first is sufficient for initial CorpFlowAI operation.',
  };
}

/**
 * @param {{
 *   createBankAccount?: boolean,
 *   editBankAccount?: boolean,
 *   submitPaymentEntry?: boolean,
 *   createLiveBankTransaction?: boolean,
 *   connectBankFeed?: boolean,
 *   postGl?: boolean,
 * }} action
 */
export function assertReadOnlyPacketAction(action = {}) {
  const forbidden = [];
  if (action.createBankAccount) forbidden.push('bank_account_create');
  if (action.editBankAccount) forbidden.push('bank_account_edit');
  if (action.submitPaymentEntry) forbidden.push('payment_entry_submit');
  if (action.createLiveBankTransaction) forbidden.push('bank_transaction_live_create');
  if (action.connectBankFeed) forbidden.push('bank_feed_connect');
  if (action.postGl) forbidden.push('gl_posting');
  return {
    allowed: forbidden.length === 0,
    forbidden,
    rule: 'READ_ONLY_NO_LIVE_BANK_MUTATION',
  };
}

function bookCandidates(books) {
  const payments = Array.isArray(books?.payment_entries) ? books.payment_entries : [];
  const journals = Array.isArray(books?.journal_entries) ? books.journal_entries : [];
  return [
    ...payments.map((row) => ({
      doctype: 'Payment Entry',
      name: asTrimmedString(row.name),
      reference_no: asTrimmedString(row.reference_no),
      amount: roundMoney(row.paid_amount_base ?? row.amount),
      value_date: asTrimmedString(row.reference_date || row.value_date),
      synthetic: row.synthetic === true,
    })),
    ...journals.map((row) => ({
      doctype: 'Journal Entry',
      name: asTrimmedString(row.name),
      reference_no: asTrimmedString(row.reference_no),
      amount: roundMoney(row.paid_amount_base ?? row.amount),
      value_date: asTrimmedString(row.reference_date || row.value_date),
      exception_type: asTrimmedString(row.exception_type) || null,
      synthetic: row.synthetic === true,
    })),
  ];
}

/**
 * Idempotent match of statement lines to existing PE/JE books.
 * Never invents a live Bank Transaction.
 *
 * @param {{ lines?: Array<Record<string, unknown>>, closing_balance?: number, opening_balance?: number }} statement
 * @param {{ payment_entries?: Array<Record<string, unknown>>, journal_entries?: Array<Record<string, unknown>> }} books
 * @param {Record<string, unknown>} [config]
 */
export function matchSyntheticStatement(statement, books, config = loadBankReconciliationReadinessConfig()) {
  const rules = /** @type {Record<string, unknown>} */ (config.matching_rules || {});
  const tolerance = asFiniteNumber(rules.amount_tolerance) ?? 0.01;
  const lines = Array.isArray(statement?.lines) ? statement.lines : [];
  const candidates = bookCandidates(books);
  const used = new Set();
  const matches = [];
  const exceptions = [];

  for (const line of lines) {
    const reference = asTrimmedString(line.reference_no);
    const deposit = roundMoney(line.deposit) || 0;
    const withdrawal = roundMoney(line.withdrawal) || 0;
    const amount = roundMoney(deposit || withdrawal);
    const valueDate = asTrimmedString(line.value_date);
    const hit = candidates.find((candidate, index) => {
      if (used.has(index)) return false;
      if (!reference || candidate.reference_no !== reference) return false;
      if (candidate.amount == null || amount == null) return false;
      if (Math.abs(candidate.amount - amount) > tolerance) return false;
      if (valueDate && candidate.value_date && candidate.value_date !== valueDate) return false;
      used.add(index);
      return true;
    });
    if (hit) {
      matches.push({
        line_id: asTrimmedString(line.line_id),
        reference_no: reference,
        amount,
        matched_doctype: hit.doctype,
        matched_name: hit.name,
        exception_type: hit.exception_type,
      });
    } else {
      exceptions.push({
        line_id: asTrimmedString(line.line_id),
        reference_no: reference,
        amount,
        action: asTrimmedString(rules.unmatched_action) || 'hold_exception',
        reason: reference ? 'no_matching_pe_or_je' : 'missing_reference_no',
      });
    }
  }

  const movement = lines.reduce((sum, line) => {
    return sum + (roundMoney(line.deposit) || 0) - (roundMoney(line.withdrawal) || 0);
  }, 0);
  const opening = roundMoney(statement?.opening_balance) || 0;
  const expectedClosing = roundMoney(statement?.closing_balance);
  const computedClosing = roundMoney(opening + movement);
  const delta =
    expectedClosing == null || computedClosing == null
      ? null
      : roundMoney(computedClosing - expectedClosing);
  const reconConfirmed = exceptions.length === 0 && delta != null && Math.abs(delta) <= tolerance;

  return {
    statement_id: asTrimmedString(statement?.statement_id),
    matches,
    exceptions,
    movement: roundMoney(movement),
    computed_closing: computedClosing,
    expected_closing: expectedClosing,
    delta,
    recon_confirmed: reconConfirmed,
    live_bank_transaction_created: false,
  };
}

/**
 * Replay the same statement twice; matches must be identical.
 *
 * @param {Record<string, unknown>} fixture
 * @param {Record<string, unknown>} [config]
 */
export function proveSyntheticReconciliationIdempotency(
  fixture,
  config = loadBankReconciliationReadinessConfig()
) {
  const statement = /** @type {Record<string, unknown>} */ (fixture.statement || fixture);
  const books = /** @type {Record<string, unknown>} */ (fixture.books || {});
  const first = matchSyntheticStatement(statement, books, config);
  const second = matchSyntheticStatement(statement, books, config);
  const sameMatches = JSON.stringify(first.matches) === JSON.stringify(second.matches);
  const sameExceptions = JSON.stringify(first.exceptions) === JSON.stringify(second.exceptions);
  return {
    ok: first.recon_confirmed && sameMatches && sameExceptions && !first.live_bank_transaction_created,
    first,
    second,
    idempotent: sameMatches && sameExceptions,
  };
}

/**
 * @param {Record<string, unknown>} [config]
 */
export function evaluateBankReconciliationReadiness(
  config = loadBankReconciliationReadinessConfig()
) {
  const feed = evaluateBankFeedNeed({}, config);
  const peGate = evaluatePaymentEntrySubmitGate({});
  const bankGate = evaluateBankAccountMutationGate({});
  return {
    verdict: asTrimmedString(config.verdict) || CANONICAL_VERDICT,
    current_main_verdict: asTrimmedString(config.current_main_verdict) || CURRENT_MAIN_VERDICT,
    current_main_issue: Number(config.current_main_issue) || CURRENT_MAIN_ISSUE,
    current_main_sha: asTrimmedString(config.current_main_sha) || CURRENT_MAIN_SHA,
    source_packet_issue: Number(config.issue) || SOURCE_PACKET_ISSUE,
    bank_feed_verdict: feed.verdict,
    payment_segregation_rule: PAYMENT_SEGREGATION_RULE,
    payment_entry_submit: peGate,
    bank_account_mutation: bankGate,
    accountant_dependencies: listAccountantDependencies(config).map((row) => row.id),
    custom_doctypes: 'none',
  };
}
