/**
 * Deterministic #1055 Company & Accounting Foundation invariants.
 * Does not call live ERPNext. Never prints secrets.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  CANONICAL_VERDICT,
  FORBIDDEN_SNAPSHOT_KEYS,
  classifyChartOfAccounts,
  evaluateAccountingFoundationReadiness,
  listAccountantDecisions,
  listErpnextMappings,
  listOnboardingSteps,
  loadAccountingFoundationConfig,
  markOnboardingSteps,
  resetAccountingFoundationConfigCache,
  sanitizeAccountingSnapshot,
} from '../lib/erpnext/accounting-foundation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const PROBE = path.join(REPO_ROOT, 'scripts', 'erpnext', 'accounting-foundation-audit.mjs');
const DOC = 'docs/finance/ERPNEXT_COMPANY_ACCOUNTING_FOUNDATION_AUDIT_1055.md';
const SNAPSHOT = 'artifacts/erpnext/accounting-foundation-1055/coa-skeleton.json';

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

test('#1055 config names current-state audit and forbids CoA invention', () => {
  resetAccountingFoundationConfigCache();
  const cfg = loadAccountingFoundationConfig(REPO_ROOT);
  assert.equal(cfg.schema, 'corpflow.erpnext.accounting_foundation.v1');
  assert.equal(cfg.issue, 1055);
  assert.equal(cfg.verdict, CANONICAL_VERDICT);
  assert.equal(cfg.no_coa_invention, true);
  assert.equal(cfg.phase_2_protected, true);
  assert.equal(cfg.company_expected.abbr, 'CFAI');
  assert.equal(cfg.company_expected.default_currency, 'MUR');
  const steps = listOnboardingSteps(REPO_ROOT);
  assert.equal(steps.length, 6);
  assert.deepEqual(
    steps.map((step) => step.erpnext_step_name),
    [
      'Chart of Accounts',
      'Setup Sales taxes',
      'Create Sales Invoice',
      'Create Payment Entry',
      'View Balance Sheet',
      'Review Accounts Settings',
    ],
  );
  assert.ok(listAccountantDecisions(REPO_ROOT).length >= 8);
  assert.ok(listErpnextMappings(REPO_ROOT).length >= 8);
});

test('#1055 classifyChartOfAccounts distinguishes skeleton vs template children', () => {
  const skeleton = classifyChartOfAccounts([
    { name: 'Assets', is_group: 1, parent_account: '', root_type: 'Asset' },
    { name: 'Equity', is_group: 1, parent_account: '', root_type: 'Equity' },
  ]);
  assert.equal(skeleton.root_group_count, 2);
  assert.equal(skeleton.child_account_count, 0);
  assert.equal(skeleton.skeleton_only, true);
  assert.equal(skeleton.usable_operating_coa, false);

  const template = classifyChartOfAccounts([
    { name: 'Assets', is_group: 1, parent_account: '', root_type: 'Asset' },
    { name: 'Debtors - CFAI', is_group: 0, parent_account: 'Accounts Receivable', account_type: 'Receivable' },
  ]);
  assert.equal(template.child_account_count, 1);
  assert.equal(template.skeleton_only, false);
  assert.equal(template.usable_operating_coa, true);
});

test('#1055 sanitizeAccountingSnapshot redacts bank credentials and secret-like strings', () => {
  const clean = sanitizeAccountingSnapshot({
    account_name: 'Cash - CFAI',
    bank_account_no: '001234567890',
    iban: 'MU12BANK0000000000000000000000',
    note: 'ERPNEXT_API_SECRET=should-never-appear',
  });
  assert.equal(clean.account_name, 'Cash - CFAI');
  assert.equal(clean.bank_account_no, '[redacted-present]');
  assert.equal(clean.iban, '[redacted-present]');
  assert.match(String(clean.note), /\[redacted\]/);
  assert.ok(FORBIDDEN_SNAPSHOT_KEYS.includes('bank_account_no'));
});

test('#1055 onboarding marks do not claim accountant approval', () => {
  const marked = markOnboardingSteps({
    companyPresent: true,
    childAccountCount: 69,
    taxTemplateCount: 2,
    openingBalancePresent: false,
    itemPresent: true,
    customerPresent: true,
  });
  const byId = Object.fromEntries(marked.map((row) => [row.id, row]));
  assert.equal(byId.chart_of_accounts.mark, 'REQUIRES ACCOUNTANT');
  assert.equal(byId.setup_sales_taxes.mark, 'REQUIRES ACCOUNTANT');
  assert.equal(byId.create_sales_invoice.mark, 'NOT DONE');
  assert.equal(byId.create_payment_entry.mark, 'REQUIRES ANTON');
  assert.equal(byId.view_balance_sheet.mark, 'REQUIRES ACCOUNTANT');
  assert.equal(byId.review_accounts_settings.mark, 'REQUIRES ANTON');
  assert.ok(!marked.some((row) => row.mark === 'DONE' && row.id === 'chart_of_accounts'));
});

test('#1055 readiness requires company, CoA, and gated Phase 2', () => {
  const ready = evaluateAccountingFoundationReadiness({
    company: { name: 'CorpFlowAI LTD' },
    accounts: [{ name: 'Debtors - CFAI', is_group: 0, parent_account: 'AR' }],
    fiscal_years: [{ name: '2026-2027' }],
    onboarding: [{ name: 'Accounting Onboarding' }],
    probe_ok: true,
  });
  assert.equal(ready.ready, true);
  assert.equal(ready.verdict, CANONICAL_VERDICT);

  const unread = evaluateAccountingFoundationReadiness({
    company: null,
    accounts: [],
    probe_ok: false,
  });
  assert.equal(unread.ready, false);
  assert.match(unread.verdict, /NOT READY/);
});

test('#1055 docs, snapshot, and probe stay GET-only with no secret values', () => {
  for (const rel of [
    DOC,
    SNAPSHOT,
    'config/erpnext-accounting-foundation.v1.json',
    'docs/governance/erpnext/DECISION_REGISTER.md',
    'docs/governance/erpnext/IMPLEMENTATION_EVIDENCE_INDEX.md',
  ]) {
    assert.equal(existsSync(path.join(REPO_ROOT, rel)), true, `missing ${rel}`);
    const text = read(rel);
    assert.ok(!/sk_live|POSTGRES_URL\s*[:=]\s*\S+|ERPNEXT_API_SECRET\s*[:=]\s*\S+/.test(text), rel);
    assert.doesNotMatch(text, /eyJhbGci/);
  }
  const doc = read(DOC);
  assert.ok(doc.includes('<!-- ERPNEXT_COMPANY_ACCOUNTING_FOUNDATION_AUDIT_1055 -->'));
  assert.ok(doc.includes(CANONICAL_VERDICT));
  assert.ok(doc.includes('0/6'));
  assert.ok(doc.includes('69'));
  assert.ok(doc.includes('REQUIRES ACCOUNTANT'));
  assert.ok(doc.includes('Phase 2'));
  assert.ok(!doc.includes('INVENT A MAURITIUS CHART'));

  const snapshot = JSON.parse(read(SNAPSHOT));
  assert.equal(snapshot.schema, 'corpflow.erpnext.accounting_foundation_snapshot.v1');
  assert.equal(snapshot.issue, 1055);
  assert.equal(snapshot.mutation, 'none');
  assert.equal(snapshot.chart_of_accounts.child_account_count, 69);
  assert.equal(snapshot.chart_of_accounts.root_group_count, 5);
  assert.equal(snapshot.chart_of_accounts.skeleton_only, false);
  assert.equal(snapshot.company.abbr, 'CFAI');
  assert.equal(snapshot.accounts_module_onboarding.steps.length, 6);
  assert.equal(snapshot.bank_accounts_safe.length, 0);

  const probe = readFileSync(PROBE, 'utf8');
  assert.match(probe, /GET-only/);
  assert.match(probe, /frappeClientFromEnv/);
  assert.doesNotMatch(probe, /client\.create\(/);
  assert.doesNotMatch(probe, /client\.update\(/);
  assert.doesNotMatch(probe, /MASTER_ADMIN_KEY\s*[:=]\s*process\.env/);
});

test('#1055 probe script fail-closes without ERPNext secrets', () => {
  const env = { ...process.env };
  for (const name of ['ERPNEXT_BASE_URL', 'ERPNEXT_API_KEY', 'ERPNEXT_API_SECRET']) {
    delete env[name];
  }
  env.MASTER_ADMIN_KEY = 'must-not-be-used';
  const result = spawnSync(process.execPath, [PROBE], {
    cwd: REPO_ROOT,
    env,
    encoding: 'utf8',
    timeout: 20000,
  });
  assert.equal(result.status, 1);
  const out = `${result.stdout || ''}\n${result.stderr || ''}`;
  assert.match(out, /ERPNext access: FAIL/);
  assert.match(out, /missing injected secrets/);
  assert.doesNotMatch(out, /must-not-be-used/);
});
