/**
 * Deterministic #1139 / #1220 bank / reconciliation readiness invariants.
 * Does not call live ERPNext. Never prints secrets.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  BANK_FEED_VERDICT,
  CANONICAL_VERDICT,
  CONFIG_REL,
  CURRENT_MAIN_ISSUE,
  CURRENT_MAIN_VERDICT,
  FIXTURE_REL,
  PAYMENT_SEGREGATION_RULE,
  SOURCE_PACKET_ISSUE,
  assertReadOnlyPacketAction,
  evaluateBankAccountMutationGate,
  evaluateBankFeedNeed,
  evaluateBankReconciliationReadiness,
  evaluatePaymentEntrySubmitGate,
  listAccountantDependencies,
  listForbiddenBankEvidenceKeys,
  listProcessStages,
  loadBankReconciliationReadinessConfig,
  loadSyntheticStatementFixture,
  matchSyntheticStatement,
  payloadContainsForbiddenBankEvidence,
  proveSyntheticReconciliationIdempotency,
  resetBankReconciliationReadinessConfigCache,
  sanitizeBankReadback,
} from '../lib/erpnext/bank-reconciliation-readiness.js';
import {
  invoiceDoesNotGrantProceedApproved,
  mapPaymentEvidenceWithoutPaymentEntry,
} from '../lib/erpnext/selling-quote-to-cash.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DOC_REL = 'docs/erpnext/ERPNEXT_BANK_RECONCILIATION_READINESS_V1.md';
const RUNBOOK_REL = 'docs/runbooks/ERPNEXT_BANK_RECONCILIATION_OPERATOR_RUNBOOK_V1.md';
const SCRIPT_REL = 'scripts/erpnext/audit-bank-reconciliation-readiness.mjs';
const SECRETISH = /sk_live|POSTGRES_URL\s*[:=]\s*\S+|ERPNEXT_API_SECRET\s*[:=]\s*\S+|eyJhbGci/;
const BANK_VALUEISH = /MU\d{2}[A-Z]{4}\d|sk_live|eyJhbGci/;

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

test('#1139 config names the verdict, bank-feed decision, and #551/#714 segregation rule', () => {
  resetBankReconciliationReadinessConfigCache();
  const cfg = loadBankReconciliationReadinessConfig(REPO_ROOT);
  assert.equal(cfg.issue, SOURCE_PACKET_ISSUE);
  assert.equal(cfg.current_main_issue, CURRENT_MAIN_ISSUE);
  assert.equal(cfg.current_main_sha, 'b731411734edb01b7dbb8d7e20247c5a7805983a');
  assert.deepEqual(cfg.parents, [1054, 953, 918]);
  assert.equal(cfg.dependency, 1055);
  assert.equal(cfg.verdict, CANONICAL_VERDICT);
  assert.equal(cfg.current_main_verdict, CURRENT_MAIN_VERDICT);
  assert.equal(cfg.bank_feed_verdict, BANK_FEED_VERDICT);
  assert.equal(cfg.payment_segregation_rule, PAYMENT_SEGREGATION_RULE);
  assert.equal(cfg.no_implementation_authorized.payment_entry_submit, true);
  assert.equal(cfg.no_implementation_authorized.bank_account_create, true);
  assert.equal(cfg.no_implementation_authorized.bank_feed_connect, true);
  assert.ok(listProcessStages(cfg).length >= 8);
  const depIds = listAccountantDependencies(cfg).map((row) => row.id);
  for (const id of [
    'bank_cash_ledger_accounts',
    'clearing_undeposited_funds',
    'fx_receipts_payments',
    'bank_charges_fees',
    'reconciliation_cutoff_cadence',
    'opening_cutover_bank_balances',
  ]) {
    assert.ok(depIds.includes(id), `missing accountant dependency ${id}`);
  }
  assert.doesNotMatch(JSON.stringify(cfg), SECRETISH);
  assert.doesNotMatch(JSON.stringify(cfg), BANK_VALUEISH);
});

test('#1139 payment evidence never authorizes Payment Entry even when financially_approved', () => {
  const blocked = evaluatePaymentEntrySubmitGate({
    financiallyApproved: true,
    bankCreditVisible: true,
  });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.packet_never_submits, true);
  assert.equal(blocked.financially_approved_is_not_authority, true);
  assert.ok(blocked.missing.includes('accountant_foundation_#1055'));
  assert.ok(blocked.missing.includes('bank_cash_ledger_accounts'));
  assert.equal(blocked.rule, PAYMENT_SEGREGATION_RULE);

  const stillBlocked = evaluatePaymentEntrySubmitGate({
    accountantApproved: true,
    bankLedgerApproved: true,
    fxTreatmentApproved: true,
    financiallyApproved: true,
    bankCreditVisible: true,
  });
  assert.equal(stillBlocked.allowed, false);
  assert.equal(stillBlocked.would_be_unblocked, true);
  assert.equal(stillBlocked.packet_never_submits, true);
});

test('#1139 Bank Account mutation and live bank actions stay fail-closed', () => {
  const bank = evaluateBankAccountMutationGate({ accountantApproved: true });
  assert.equal(bank.allowed, false);
  assert.equal(bank.packet_never_mutates, true);
  assert.ok(bank.missing.includes('anton_exact_bank_account_approval'));

  const readOnly = assertReadOnlyPacketAction({});
  assert.equal(readOnly.allowed, true);
  const live = assertReadOnlyPacketAction({
    createBankAccount: true,
    submitPaymentEntry: true,
    createLiveBankTransaction: true,
    connectBankFeed: true,
    postGl: true,
  });
  assert.equal(live.allowed, false);
  assert.ok(live.forbidden.includes('bank_account_create'));
  assert.ok(live.forbidden.includes('payment_entry_submit'));
  assert.ok(live.forbidden.includes('bank_transaction_live_create'));
  assert.ok(live.forbidden.includes('bank_feed_connect'));
  assert.ok(live.forbidden.includes('gl_posting'));
});

test('#1139 bank-feed default is NOT REQUIRED; later volume is REQUIRES LATER DECISION', () => {
  const now = evaluateBankFeedNeed({ volumeInvoicesPerMonth: 8 });
  assert.equal(now.verdict, 'NOT REQUIRED');
  assert.equal(now.connect_now, false);
  const later = evaluateBankFeedNeed({ volumeInvoicesPerMonth: 80 });
  assert.equal(later.verdict, 'REQUIRES LATER DECISION');
  assert.equal(later.connect_now, false);
  const requested = evaluateBankFeedNeed({ accountantRequestsFeed: true });
  assert.equal(requested.verdict, 'REQUIRES LATER DECISION');
});

test('#1139 synthetic statement matches Phase C arithmetic with delta 0 and is idempotent', () => {
  const fixture = loadSyntheticStatementFixture(REPO_ROOT);
  assert.equal(fixture.statement.statement_id, 'CF1139-SYN-STMT-001');
  assert.equal(fixture.do_not_post, true);
  const result = matchSyntheticStatement(fixture.statement, fixture.books);
  assert.equal(result.recon_confirmed, true);
  assert.equal(result.delta, 0);
  assert.equal(result.computed_closing, 13200);
  assert.equal(result.exceptions.length, 0);
  assert.equal(result.live_bank_transaction_created, false);
  assert.equal(result.matches[0].matched_name, 'ACC-PAY-2026-00002');
  assert.equal(result.matches[1].matched_name, 'ACC-JV-2026-00002');
  assert.equal(result.matches[2].matched_name, 'ACC-JV-2026-00003');
  assert.equal(result.matches[2].exception_type, 'bank_fee');

  const proof = proveSyntheticReconciliationIdempotency(fixture);
  assert.equal(proof.ok, true);
  assert.equal(proof.idempotent, true);

  const unmatched = matchSyntheticStatement(
    {
      statement_id: 'CF1139-SYN-UNMATCHED',
      opening_balance: 0,
      closing_balance: 100,
      lines: [
        {
          line_id: 'x',
          deposit: 100,
          withdrawal: 0,
          reference_no: 'UNKNOWN-REF',
          value_date: '2026-06-01',
        },
      ],
    },
    { payment_entries: [], journal_entries: [] }
  );
  assert.equal(unmatched.recon_confirmed, false);
  assert.equal(unmatched.exceptions.length, 1);
  assert.equal(unmatched.exceptions[0].action, 'hold_exception');
  assert.equal(unmatched.live_bank_transaction_created, false);
});

test('#1139 sanitizer strips private banking keys and values from evidence', () => {
  const keys = listForbiddenBankEvidenceKeys();
  assert.ok(keys.includes('iban'));
  assert.ok(keys.includes('bank_account_no'));
  const dirty = payloadContainsForbiddenBankEvidence({
    account_name: 'SBM MUR operating (name only)',
    iban: 'should-not-land',
    bank_account_no: 'should-not-land',
  });
  assert.ok(dirty.includes('iban'));
  assert.ok(dirty.includes('bank_account_no'));
  const clean = sanitizeBankReadback({
    name: 'Cash - CFAI',
    account_type: 'Cash',
    iban: 'MU00XXXX',
    bank_account_no: '12345678',
    is_group: 0,
  });
  assert.equal(clean.name, 'Cash - CFAI');
  assert.equal(clean.account_type, 'Cash');
  assert.equal(clean.iban, undefined);
  assert.equal(clean.iban_present, true);
  assert.equal(clean.bank_account_no_present, true);
  assert.equal(clean.bank_account_no, undefined);
});

test('#1139 docs, runbook, and GET-only audit script exist without secrets', () => {
  const readiness = evaluateBankReconciliationReadiness(
    loadBankReconciliationReadinessConfig(REPO_ROOT)
  );
  assert.equal(readiness.verdict, CANONICAL_VERDICT);
  assert.equal(readiness.current_main_verdict, CURRENT_MAIN_VERDICT);
  assert.equal(readiness.current_main_issue, CURRENT_MAIN_ISSUE);
  assert.equal(readiness.bank_feed_verdict, BANK_FEED_VERDICT);

  for (const rel of [DOC_REL, RUNBOOK_REL, SCRIPT_REL, CONFIG_REL, FIXTURE_REL]) {
    assert.equal(existsSync(path.join(REPO_ROOT, rel)), true, `missing ${rel}`);
    const text = read(rel);
    assert.doesNotMatch(text, BANK_VALUEISH);
    if (rel !== SCRIPT_REL) assert.doesNotMatch(text, SECRETISH);
  }
  const doc = read(DOC_REL);
  assert.ok(doc.includes('<!-- ERPNEXT_BANK_RECONCILIATION_READINESS_V1 -->'));
  assert.ok(doc.includes(CANONICAL_VERDICT));
  assert.ok(doc.includes(CURRENT_MAIN_VERDICT));
  assert.ok(doc.includes('#1220'));
  assert.ok(doc.includes('NOT REQUIRED'));
  assert.ok(doc.includes('#551'));
  assert.ok(doc.includes('#714'));
  assert.ok(doc.includes('#1055'));
  assert.ok(doc.includes('NO IMPLEMENTATION AUTHORIZED'));
  const runbook = read(RUNBOOK_REL);
  assert.ok(runbook.includes('operator evidence'));
  assert.ok(runbook.includes('accountant-approved'));
  const script = read(SCRIPT_REL);
  assert.ok(script.includes('GET-only') || script.includes('GET only') || script.includes('GET-ONLY'));
  assert.ok(!script.includes('.create('));
  assert.ok(!script.includes('.update('));
  assert.ok(script.includes('ERPNEXT_BASE_URL_value: not_printed'));
});

test('#1220 current-main: invoice existence never grants Proceed Approved or Payment Entry', () => {
  const invoiceGate = invoiceDoesNotGrantProceedApproved({
    doctype: 'Sales Invoice',
    name: 'ACC-SINV-2026-00001',
    currency: 'MUR',
    grand_total: 45000,
    docstatus: 0,
  });
  assert.equal(invoiceGate.ok, true);
  assert.equal(invoiceGate.financially_approved, false);
  assert.equal(invoiceGate.gate_ok, false);
  assert.ok(invoiceGate.blockers.includes('MISSING_PAYMENT_EVIDENCE'));
  assert.ok(invoiceGate.blockers.includes('MISSING_FINANCIAL_APPROVER'));

  const evidence = mapPaymentEvidenceWithoutPaymentEntry({
    invoice: 'ACC-SINV-2026-00001',
    amount: 22500,
    currency: 'MUR',
  });
  assert.equal(evidence.payment_entry_created, false);
  assert.equal(evidence.payment_entry_forbidden, true);
  assert.equal(evidence.rail, 714);

  const peGate = evaluatePaymentEntrySubmitGate({
    financiallyApproved: true,
    bankCreditVisible: true,
    accountantApproved: false,
  });
  assert.equal(peGate.allowed, false);
  assert.equal(peGate.packet_never_submits, true);
  assert.equal(peGate.financially_approved_is_not_authority, true);
  assert.equal(peGate.rule, PAYMENT_SEGREGATION_RULE);
});
