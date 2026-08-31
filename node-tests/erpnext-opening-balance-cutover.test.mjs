/**
 * Deterministic #1245 opening-balance / cutover preparation invariants.
 * Does not call live ERPNext. Never prints secrets or real amounts.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  CANONICAL_VERDICT,
  accountantDecisionIds,
  assertMethodsUnchosen,
  dryRunRollbackGates,
  evaluatePackReadiness,
  evaluateSyntheticReconciliation,
  looksLikeForbiddenFinancialLiteral,
  refusePosting,
  requiredTemplateInputIds,
  resetOpeningCutoverConfigCache,
  validateOpeningTemplate,
} from '../lib/erpnext/opening-balance-cutover.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DOC_REL = 'docs/erpnext/ERPNEXT_OPENING_BALANCE_CUTOVER_V1.md';
const CONFIG_REL = 'config/erpnext-opening-balance-cutover.v1.json';
const PROBE = path.join(REPO_ROOT, 'scripts', 'erpnext', 'opening-cutover-inspect.sh');
const ARTIFACT = 'artifacts/erpnext/opening-cutover-1245/inspect-log.txt';

const REQUIRED_INPUTS = [
  'cutover_date',
  'fiscal_period',
  'cash_bank',
  'receivables_payables',
  'pre_revenue_expenses',
  'funding_balance',
  'fixed_assets',
  'tax_payroll',
  'equity_retained',
  'foreign_currency',
];

const REQUIRED_DECISIONS = [
  'funding_account_classification',
  'cutover_date',
  'historical_detail_level',
  'opening_balance_totals',
  'retained_earnings_equity_treatment',
  'fx_treatment',
  'fixed_asset_opening_values',
  'tax_payroll_opening_liabilities',
];

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

test('#1245 opening/cutover file exists with sentinel and accountant-decision verdict', () => {
  assert.equal(existsSync(path.join(REPO_ROOT, DOC_REL)), true);
  const doc = read(DOC_REL);
  assert.ok(doc.includes('<!-- ERPNEXT_OPENING_BALANCE_CUTOVER_V1 -->'));
  assert.ok(doc.includes('#1245'));
  assert.ok(doc.includes('#1054'));
  assert.ok(doc.includes('#1055'));
  assert.ok(doc.includes('#953'));
  assert.ok(doc.includes('NO IMPLEMENTATION AUTHORIZED'));
  assert.ok(doc.includes(CANONICAL_VERDICT));
  assert.ok(doc.includes('SUMMARY OPENING BALANCES'));
  assert.ok(doc.includes('HISTORICAL DETAIL'));
  assert.ok(doc.includes('neither chosen') || doc.includes('does **not** choose'));
  assert.ok(doc.includes('Temporary Opening - CFAI'));
  assert.ok(doc.includes('Opening Invoice Creation Tool'));
  assert.ok(doc.includes('Period Closing Voucher'));
  assert.ok(doc.includes('0/6'));
  assert.ok(doc.includes('pre-revenue'));
  assert.ok(doc.includes('corpflow_test'));
  assert.doesNotMatch(doc, /Environment: client_production/);
});

test('#1245 template covers required inputs and refuses real amounts', () => {
  resetOpeningCutoverConfigCache();
  const ids = requiredTemplateInputIds(REPO_ROOT);
  for (const id of REQUIRED_INPUTS) {
    assert.ok(ids.includes(id), `missing template input ${id}`);
  }
  const validated = validateOpeningTemplate(REPO_ROOT);
  assert.equal(validated.ok, true, JSON.stringify(validated));
  const doc = read(DOC_REL);
  for (const id of REQUIRED_INPUTS) {
    assert.ok(doc.includes(id) || doc.includes(id.replaceAll('_', ' ')), `doc missing ${id}`);
  }
  assert.ok(doc.includes('[CUTOVER_DATE]'));
  assert.ok(doc.includes('[FUNDING_BALANCE_PLACEHOLDER]'));
  assert.ok(doc.includes('[PRE_REVENUE_EXPENSE_PLACEHOLDER]'));
  assert.doesNotMatch(doc, /IBAN|SWIFT/i);
  assert.doesNotMatch(doc, /ERPNEXT_API_SECRET\s*[:=]\s*(?!present\b|absent\b)\S+/);
});

test('#1245 presents both migration methods and does not choose', () => {
  const methods = assertMethodsUnchosen(REPO_ROOT);
  assert.equal(methods.ok, true, methods.reason);
  assert.equal(methods.methods.A, 'SUMMARY_OPENING_BALANCES');
  assert.equal(methods.methods.B, 'HISTORICAL_DETAIL');
  const cfg = JSON.parse(read(CONFIG_REL));
  assert.equal(cfg.does_not_choose_migration_method, true);
  assert.equal(cfg.migration_methods.A.choose, false);
  assert.equal(cfg.migration_methods.B.choose, false);
});

test('#1245 reconciliation structure pairs pre-revenue costs with funding', () => {
  const recon = evaluateSyntheticReconciliation(REPO_ROOT);
  assert.equal(recon.ok, true, JSON.stringify(recon.problems));
  assert.equal(recon.balances, true);
  const cfg = JSON.parse(read(CONFIG_REL));
  const preRevenue = cfg.synthetic_reconciliation_pairs.find((row) => row.unit === 'SYNTHETIC_UNIT_PRE_REVENUE');
  assert.ok(preRevenue);
  assert.equal(preRevenue.debit, 'pre_revenue_expenses');
  assert.equal(preRevenue.credit, 'funding_balance');
});

test('#1245 names remaining accountant decisions and refuses posting', () => {
  const decisions = accountantDecisionIds(REPO_ROOT);
  for (const id of REQUIRED_DECISIONS) {
    assert.ok(decisions.includes(id), `missing decision ${id}`);
  }
  const gates = dryRunRollbackGates();
  assert.ok(gates.before_anton_approves_posting.includes('funding_classification_recorded'));
  assert.ok(gates.dry_run.includes('do_not_submit'));
  assert.ok(gates.rollback.includes('cancel_submitted_vouchers_if_any'));
  assert.equal(refusePosting('create_journal_entry').allowed, false);
  assert.equal(refusePosting('run_data_import').allowed, false);
  assert.equal(refusePosting('mutate_chart_of_accounts').allowed, false);
  const pack = evaluatePackReadiness(REPO_ROOT);
  assert.equal(pack.ok, true, pack.verdict);
  assert.equal(pack.verdict, CANONICAL_VERDICT);
});

test('#1245 inspect probe and artifact stay GET-only and secret-free', () => {
  assert.equal(existsSync(PROBE), true);
  assert.equal(existsSync(path.join(REPO_ROOT, ARTIFACT)), true);
  const probe = readFileSync(PROBE, 'utf8');
  const artifact = read(ARTIFACT);
  const doc = read(DOC_REL);
  assert.match(probe, /mutation: forbidden \(GET-only\)/);
  assert.match(probe, /journal_entry_create: forbidden/);
  assert.match(probe, /data_import: forbidden/);
  assert.doesNotMatch(probe, /\bssh\s+-[A-Za-z]/);
  assert.doesNotMatch(probe, /method:\s*POST/i);
  for (const text of [doc, artifact]) {
    assert.doesNotMatch(text, /ERPNEXT_API_SECRET\s*[:=]\s*(?!present\b|absent\b)\S+/i);
    assert.doesNotMatch(text, /ERPNEXT_BASE_URL\s*[:=]\s*https?:\/\//i);
    assert.doesNotMatch(text, /sk_live|resticpassword|AKIA[0-9A-Z]{16}/i);
    assert.doesNotMatch(text, /[a-z0-9-]+\.frappe\.cloud/i);
    assert.doesNotMatch(text, /[a-z0-9-]+\.erpnext\.com/i);
    assert.doesNotMatch(text, /\bIBAN\b|\bSWIFT\b/i);
  }
  assert.match(artifact, /accounting_onboarding/);
  assert.match(artifact, /accounting_onboarding_complete_count: 0\/6/);
  assert.match(artifact, /journal_entry_listed: 0/);
  assert.match(artifact, /gl_entry_listed: 0/);
  assert.match(artifact, /posting_attempted: no/);
  assert.match(artifact, /inspect_verdict: OPENING_CUTOVER_METADATA_READ_NO_POSTING/);
  assert.equal(looksLikeForbiddenFinancialLiteral('[CUTOVER_DATE]'), false);
  assert.equal(looksLikeForbiddenFinancialLiteral('1500.00'), true);
  assert.equal(looksLikeForbiddenFinancialLiteral('SYNTHETIC_UNIT_BANK'), false);
});
