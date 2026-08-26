/**
 * Deterministic #1098 Buying / AP readiness invariants.
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
  PAYMENT_SEGREGATION_RULE,
  PURCHASE_ORDER_VERDICT,
  buildSupplierAddressPayload,
  buildSupplierContactPayload,
  buildSupplierPayload,
  buildSyntheticPurchaseItemPayload,
  evaluateBuyingApReadiness,
  evaluatePurchaseInvoiceSubmitGate,
  evaluatePurchaseOrderNeed,
  findSupplierDuplicateMatches,
  isErpnextSupplierSurface,
  listAccountantDependencies,
  listForbiddenBankEvidenceKeys,
  loadBuyingApReadinessConfig,
  normalizeSupplierName,
  payloadContainsForbiddenBankEvidence,
  purchaseInvoiceLifecycle,
  resetBuyingApReadinessConfigCache,
  resolveSupplierDuplicateAction,
} from '../lib/erpnext/buying-ap-readiness.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const APPLY = path.join(REPO_ROOT, 'scripts', 'erpnext', 'apply-buying-ap-readiness.mjs');
const SECRETISH = /sk_live|POSTGRES_URL\s*[:=]\s*\S+|ERPNEXT_API_SECRET\s*[:=]\s*(?!absent\b|present\b)\S+|eyJhbGci/;

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

function readJson(rel) {
  return JSON.parse(read(rel));
}

test('#1098 canonical docs, config, runbook, and apply script exist with READY verdict', () => {
  const files = [
    'docs/erpnext/ERPNEXT_BUYING_AP_READINESS_V1.md',
    'docs/runbooks/ERPNEXT_BUYING_AP_OPERATOR_RUNBOOK_V1.md',
    'docs/decisions/20260826-erpnext-buying-ap-readiness.md',
    'config/erpnext-buying-ap-readiness.v1.json',
    'lib/erpnext/buying-ap-readiness.js',
    'scripts/erpnext/apply-buying-ap-readiness.mjs',
  ];
  for (const rel of files) {
    assert.equal(existsSync(path.join(REPO_ROOT, rel)), true, `missing ${rel}`);
  }
  resetBuyingApReadinessConfigCache();
  const cfg = loadBuyingApReadinessConfig(REPO_ROOT);
  assert.equal(cfg.schema, 'corpflow.erpnext_buying_ap_readiness.v1');
  assert.equal(cfg.issue, 1098);
  assert.equal(cfg.dependency, 1055);
  assert.equal(cfg.verdict, CANONICAL_VERDICT);
  assert.equal(cfg.purchase_order_verdict, PURCHASE_ORDER_VERDICT);
  assert.equal(cfg.payment_segregation_rule, PAYMENT_SEGREGATION_RULE);
  assert.equal(cfg.no_implementation_authorized.purchase_invoice_submit, true);
  assert.equal(cfg.no_implementation_authorized.payment_entry, true);
  assert.equal(cfg.no_implementation_authorized.custom_doctypes, true);
  assert.equal(cfg.synthetic.supplier_name, 'CF1098 Synthetic Operating Supplier Ltd');
  assert.equal(cfg.synthetic.item_code, 'CF-AP-SYNTHETIC-OPEX');
  assert.equal(cfg.buying_settings_readback.po_required, 'No');

  const doc = read('docs/erpnext/ERPNEXT_BUYING_AP_READINESS_V1.md');
  assert.ok(doc.includes('<!-- ERPNEXT_BUYING_AP_READINESS_V1 -->'));
  assert.ok(doc.includes(CANONICAL_VERDICT));
  assert.ok(doc.includes('Purchase Order verdict: DEFER'));
  assert.ok(doc.includes(PAYMENT_SEGREGATION_RULE) || doc.includes('INVOICE_EXISTENCE_NEVER_AUTHORIZES_PAYMENT'));
  assert.ok(doc.includes('CF-AP-SYNTHETIC-OPEX'));
  assert.ok(doc.includes('#1055'));
  assert.ok(doc.includes('HTTP 403'));
  assert.ok(!doc.includes('NOT READY —'));
  assert.doesNotMatch(doc, SECRETISH);
  assert.doesNotMatch(doc, /IBAN\s*[:=]\s*[A-Z0-9]{10,}|SWIFT\s*[:=]\s*[A-Z0-9]{8,}|account number \d{6,}/i);

  const runbook = read('docs/runbooks/ERPNEXT_BUYING_AP_OPERATOR_RUNBOOK_V1.md');
  assert.ok(runbook.includes('<!-- ERPNEXT_BUYING_AP_OPERATOR_RUNBOOK_V1 -->'));
  assert.ok(runbook.includes('Invoice existence never authorizes payment'));
  assert.ok(runbook.includes('Purchase Order'));
  assert.doesNotMatch(runbook, SECRETISH);
});

test('#1098 search-before-create reuses matching supplier name or email', () => {
  const index = readJson('fixtures/erpnext-buying-ap-readiness/duplicate-index.synthetic.json').suppliers;
  const byName = findSupplierDuplicateMatches(index, {
    supplier_name: '  CF1098 Synthetic Operating Supplier Ltd ',
  });
  assert.equal(byName.length, 1);
  assert.equal(resolveSupplierDuplicateAction(byName).action, 'reuse');

  const byEmail = findSupplierDuplicateMatches(index, {
    supplier_name: 'Different Name Ltd',
    email: 'cf1098.synthetic.supplier@example.invalid',
  });
  assert.equal(byEmail.length, 1);
  assert.ok(byEmail[0].match_reasons.includes('email'));

  const none = findSupplierDuplicateMatches(index, { supplier_name: 'Brand New Accountant Ltd' });
  assert.equal(none.length, 0);
  assert.equal(resolveSupplierDuplicateAction(none).action, 'create');
  assert.equal(normalizeSupplierName('  Acme   Hosting  '), 'Acme Hosting');
});

test('#1098 payloads stay on standard DocTypes and omit tax_id and bank evidence by default', () => {
  resetBuyingApReadinessConfigCache();
  const cfg = loadBuyingApReadinessConfig(REPO_ROOT);
  const intake = {
    supplier_name: cfg.synthetic.supplier_name,
    synthetic: true,
    issue: 1098,
    tax_id: 'SHOULD-NOT-APPEAR',
    contact_email: cfg.synthetic.contact_email,
  };
  const supplier = buildSupplierPayload(intake, cfg);
  assert.equal(supplier.doctype, 'Supplier');
  assert.equal(supplier.supplier_name, cfg.synthetic.supplier_name);
  assert.equal(supplier.supplier_group, 'Services');
  assert.equal(supplier.supplier_type, 'Company');
  assert.equal(supplier.tax_id, undefined);
  assert.ok(String(supplier.supplier_details).includes('synthetic=true'));
  assert.equal(
    Object.keys(supplier).some((key) => key.startsWith('custom_')),
    false
  );
  assert.deepEqual(payloadContainsForbiddenBankEvidence(supplier, cfg), []);

  const withTax = buildSupplierPayload({ ...intake, accountant_approved_tax: true }, cfg);
  assert.equal(withTax.tax_id, 'SHOULD-NOT-APPEAR');

  const contact = buildSupplierContactPayload(intake, supplier.supplier_name, cfg);
  assert.equal(contact.doctype, 'Contact');
  assert.equal(contact.links[0].link_doctype, 'Supplier');
  assert.equal(contact.email_ids[0].email_id, cfg.synthetic.contact_email);

  const address = buildSupplierAddressPayload(intake, supplier.supplier_name, cfg);
  assert.equal(address.doctype, 'Address');
  assert.equal(address.address_type, 'Billing');
  assert.equal(address.country, 'Mauritius');

  const item = buildSyntheticPurchaseItemPayload(cfg);
  assert.equal(item.doctype, 'Item');
  assert.equal(item.item_code, 'CF-AP-SYNTHETIC-OPEX');
  assert.equal(item.is_purchase_item, 1);
  assert.equal(item.is_stock_item, 0);
  assert.equal(item.is_sales_item, 0);
});

test('#1098 PO is deferred and PI submit is fail-closed until accountant defaults exist', () => {
  const po = evaluatePurchaseOrderNeed();
  assert.equal(po.verdict, 'DEFER');
  assert.equal(po.use_now, false);
  assert.match(String(po.reason), /po_required=No|invoice-first/i);

  const blocked = evaluatePurchaseInvoiceSubmitGate({});
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.must_remain_draft, true);
  assert.ok(blocked.missing.includes('accountant_foundation_#1055'));
  assert.equal(blocked.rule, PAYMENT_SEGREGATION_RULE);

  const open = evaluatePurchaseInvoiceSubmitGate({
    accountantApproved: true,
    payableAccountApproved: true,
    expenseAccountApproved: true,
    taxVatApproved: true,
    costCentreApproved: true,
  });
  assert.equal(open.allowed, true);
  assert.match(open.note, /does not authorize Payment Entry/);

  const stages = purchaseInvoiceLifecycle().map((row) => row.stage);
  assert.deepEqual(stages, [
    'supplier_master',
    'expense_category',
    'capture_draft',
    'review',
    'accounting_submit',
    'payment',
  ]);
  const deps = listAccountantDependencies();
  const ids = deps.map((row) => row.id);
  for (const id of [
    'payable_account',
    'expense_account_structure',
    'tax_vat_treatment',
    'cost_centre_defaults',
    'supplier_tax_handling',
  ]) {
    assert.ok(ids.includes(id), `missing accountant dependency ${id}`);
  }
  assert.ok(listForbiddenBankEvidenceKeys().includes('iban'));
  assert.equal(isErpnextSupplierSurface('CMP Supplier Onboarding Wizard'), false);
  assert.equal(isErpnextSupplierSurface('ERPNext Supplier'), true);

  const readiness = evaluateBuyingApReadiness();
  assert.equal(readiness.verdict, CANONICAL_VERDICT);
  assert.equal(readiness.purchase_order_verdict, 'DEFER');
  assert.equal(readiness.custom_doctypes, 'none');
});

test('#1098 apply script dry-run does not call ERPNext and forbids submit/pay', () => {
  const result = spawnSync(process.execPath, [APPLY, '--dry-run'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, ERPNEXT_BASE_URL: '', ERPNEXT_API_KEY: '', ERPNEXT_API_SECRET: '' },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /dry_run: 1/);
  assert.match(result.stdout, /purchase_invoice_submit: forbidden/);
  assert.match(result.stdout, /payment_entry: forbidden/);
  assert.match(result.stdout, /Purchase Order verdict: DEFER|purchase_order_verdict: DEFER/);
  assert.match(result.stdout, /CF1098 Synthetic Operating Supplier Ltd/);
  assert.doesNotMatch(result.stdout, SECRETISH);
  assert.doesNotMatch(result.stdout, /https?:\/\//i);
});

test('#1098 governance registers record Buying/AP without authorizing payment', () => {
  const matrix = read('docs/governance/erpnext/SOURCE_OF_TRUTH_MATRIX_V1.md');
  assert.ok(matrix.includes('#1098'));
  assert.ok(matrix.includes('DEFER') || matrix.includes('Purchase Order'));

  const evidence = read('docs/governance/erpnext/IMPLEMENTATION_EVIDENCE_INDEX.md');
  assert.ok(evidence.includes('#1098'));
  assert.ok(evidence.includes('ERPNEXT_BUYING_AP_READINESS_V1.md'));

  const todo = read('docs/CORPFLOW_SHARED_TODO.md');
  assert.ok(todo.includes('#1098'));
  assert.ok(todo.includes(CANONICAL_VERDICT));

  const control = read('docs/governance/erpnext/CONTROL_REGISTER.md');
  assert.ok(control.includes('INVOICE_EXISTENCE_NEVER_AUTHORIZES_PAYMENT') || control.includes('C-AP-01'));

  const journal = read('docs/decisions/JOURNAL.md');
  assert.ok(journal.includes('JE-2026-08-26-1'));
  assert.ok(journal.includes('#1098'));
  assert.ok(journal.includes('ERPNEXT_BUYING_AP_READINESS_V1.md'));
});
