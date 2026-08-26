#!/usr/bin/env node
/**
 * Apply / prove the #1056 ERPNext selling / quote-to-cash path.
 *
 * Direct Frappe token auth from Cursor Cloud–injected secrets (names only):
 *   ERPNEXT_BASE_URL
 *   ERPNEXT_API_KEY
 *   ERPNEXT_API_SECRET
 *
 * Do NOT require MASTER_ADMIN_KEY, SSH, Infisical, or POSTGRES writes.
 * Reuses WP2 CF1018 Lead / Opportunity / Customer. Creates one draft MUR
 * Quotation. Does not submit, send, post a Sales Invoice, or create a
 * Payment Entry.
 *
 * Usage:
 *   node scripts/erpnext/apply-selling-quote-to-cash.mjs --dry-run
 *   node scripts/erpnext/apply-selling-quote-to-cash.mjs
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CANONICAL_VERDICT,
  SELLING_QUOTATION_SUB_VERDICT,
  acceptedCommercialRecordMechanism,
  classifyAccountingFoundation,
  createMemoryReferenceStore,
  evaluateQuoteToCashReadiness,
  invoiceDoesNotGrantProceedApproved,
  loadSellingQuoteToCashConfig,
  mapPaymentEvidenceWithoutPaymentEntry,
  proveSellingQuotationIdempotency,
  salesInvoicePostingAllowed,
  usdReuseProof,
} from '../../lib/erpnext/selling-quote-to-cash.js';
import { frappeClientFromEnv } from '../../lib/erpnext/frappe-rest-client.js';
import { companyIdentityIsAuthoritative, loadCommercialDocumentsConfig } from '../../lib/erpnext/commercial-documents.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const ARTIFACT_DIR = path.join(ROOT, 'artifacts', 'erpnext', 'selling-quote-to-cash-1056');
const FIXTURE_REL = 'fixtures/erpnext-selling-quote-to-cash/synthetic-engagement.json';

function log(msg) {
  console.log(String(msg));
}

function presence(name) {
  const value = process.env[name];
  return value && String(value).trim() ? 'present' : 'absent';
}

function listInjectedSecretNames() {
  const wanted = ['ERPNEXT_BASE_URL', 'ERPNEXT_API_KEY', 'ERPNEXT_API_SECRET', 'MASTER_ADMIN_KEY', 'ADMIN_PIN'];
  const present = wanted.filter((name) => process.env[name] && String(process.env[name]).trim());
  return present.length ? present.join(',') : 'none';
}

function printHeader(dryRun) {
  const cfg = loadSellingQuoteToCashConfig(ROOT);
  log('ERPNext selling / quote-to-cash apply (#1056)');
  log('access_path: direct Cursor Cloud secrets → Frappe token auth (no SSH/Infisical runtime bridge)');
  log('expected_identity: integrations@corpflowai.com (CorpFlowAI Integration)');
  log(`ERPNEXT_BASE_URL: ${presence('ERPNEXT_BASE_URL')}`);
  log(`ERPNEXT_API_KEY: ${presence('ERPNEXT_API_KEY')}`);
  log(`ERPNEXT_API_SECRET: ${presence('ERPNEXT_API_SECRET')}`);
  log(`MASTER_ADMIN_KEY: ${presence('MASTER_ADMIN_KEY')} (must not be used as ERPNext auth)`);
  log(`POSTGRES_URL: ${presence('POSTGRES_URL')} (must not be written by this packet)`);
  log(`injected_secret_names_checked: ${listInjectedSecretNames()}`);
  log('auth_fallback_master_admin_key: forbidden');
  log('runtime_bridge_ssh: no');
  log('runtime_bridge_infisical: no');
  log('ERPNEXT_BASE_URL_value: not_printed');
  log(`dry_run: ${dryRun ? 1 : 0}`);
  log(`synthetic_company: ${cfg.synthetic.legal_name}`);
  log(`synthetic_lead_id: ${cfg.synthetic.lead_id}`);
  log('forbidden_live_client: Prestige Procurement');
  log('postgres_persist: not_written');
  log('Sales Invoice posting: blocked until accountant foundation');
  log('Payment Entry: forbidden this packet');
}

function loadFixture() {
  return JSON.parse(readFileSync(path.join(ROOT, FIXTURE_REL), 'utf8'));
}

function toEvent(fixture) {
  return {
    id: fixture.lead_id || fixture.id,
    lead_id: fixture.lead_id || fixture.id,
    synthetic: true,
    product: fixture.product,
    customer: fixture.customer,
    legal_name: fixture.legal_name,
    erpnext_lead: fixture.erpnext_lead,
    erpnext_opportunity: fixture.erpnext_opportunity,
    contact: fixture.contact,
    address: fixture.address,
    intake: fixture,
    qualification_json: fixture.qualification_json || {},
  };
}

function summarizeResult(label, result) {
  return {
    label,
    ok: result.ok === true,
    action: result.action || null,
    reason: result.reason || null,
    erpnext_quotation: result.erpnext_quotation || null,
    customer: result.customer || null,
    erpnext_lead: result.erpnext_lead || null,
    erpnext_opportunity: result.erpnext_opportunity || null,
    duplicate_quotation_count: result.duplicate_quotation_count ?? null,
    sales_invoice_created: result.sales_invoice_created === true,
    payment_entry_created: result.payment_entry_created === true,
    taxes_applied: result.taxes_applied === true,
    mismatches: result.mismatches || [],
    pointer_persisted: result.pointer_persisted === true,
    postgres_persist: result.postgres_persist || 'not_written',
    readback: result.readback || null,
    error: result.error || null,
  };
}

const dryRun = process.argv.includes('--dry-run');
printHeader(dryRun);

if (dryRun) {
  const fixture = loadFixture();
  log('mode: dry-run (no ERPNext call)');
  log(`planned_event: ${fixture.lead_id} → reuse WP2 Customer then search-before-create draft MUR Quotation`);
  log('planned_replay: same event a second time; expected UPDATE on Quotation; duplicate count 1');
  log('planned_non_actions: no Sales Invoice create/submit, no Payment Entry, no tax template, no send');
  log(`ERPNext selling / quote-to-cash: DRY-RUN (${CANONICAL_VERDICT} pending live run)`);
  process.exit(0);
}

const missing = ['ERPNEXT_BASE_URL', 'ERPNEXT_API_KEY', 'ERPNEXT_API_SECRET'].filter(
  (name) => !process.env[name] || !String(process.env[name]).trim(),
);
if (missing.length) {
  log(`ERPNext selling / quote-to-cash NOT READY — missing injected secrets: ${missing.join(' ')}`);
  log('Do not use MASTER_ADMIN_KEY as a substitute.');
  process.exit(1);
}

mkdirSync(ARTIFACT_DIR, { recursive: true });

const fixture = loadFixture();
const event = toEvent(fixture);
const cfg = loadSellingQuoteToCashConfig(ROOT);
const commercialCfg = loadCommercialDocumentsConfig(ROOT);
const referenceStore = createMemoryReferenceStore([
  {
    id: event.lead_id,
    synthetic: true,
    qualification_json: event.qualification_json,
  },
]);

let client;
try {
  client = frappeClientFromEnv(process.env);
} catch {
  log('ERPNext selling / quote-to-cash NOT READY — Frappe client could not be constructed from named secrets');
  process.exit(1);
}

const auth = await client.getLoggedUser();
log(`authenticated_user: ${auth.user || 'unread'}`);
log(`http_auth_status: ${auth.http}`);
if (!auth.ok || auth.user !== 'integrations@corpflowai.com') {
  log('ERPNext selling / quote-to-cash NOT READY — authentication failed');
  writeFileSync(
    path.join(ARTIFACT_DIR, 'apply-log.json'),
    `${JSON.stringify({ ok: false, error: 'AUTH_FAILED', http: auth.http, identity: auth.user || null, secrets_printed: false }, null, 2)}\n`,
  );
  process.exit(1);
}

const company = await client.get('Company', cfg.company);
const identity = companyIdentityIsAuthoritative(company.row || {}, commercialCfg);
log(`company_identity_ok: ${identity.ok}`);
if (!identity.ok) log(`company_identity_blockers: ${identity.blockers.join(',')}`);

const upstream = {};
for (const [doctype, name, key] of [
  ['Lead', cfg.upstream_wp2.erpnext_lead, 'erpnext_lead'],
  ['Opportunity', cfg.upstream_wp2.erpnext_opportunity, 'erpnext_opportunity'],
  ['Customer', cfg.upstream_wp2.customer, 'customer'],
]) {
  const got = await client.get(doctype, name);
  log(`upstream_${doctype.toLowerCase()}: ${got.ok ? name : `MISSING http=${got.http}`}`);
  if (!got.ok) {
    writeFileSync(
      path.join(ARTIFACT_DIR, 'apply-log.json'),
      `${JSON.stringify({ ok: false, error: 'UPSTREAM_MISSING', doctype, name, http: got.http, secrets_printed: false }, null, 2)}\n`,
    );
    process.exit(1);
  }
  upstream[key] = name;
}

const reuse882 = {};
for (const [doctype, name, key] of [
  ['Quotation', cfg.reuse_882.mur_quotation, 'mur_quotation'],
  ['Quotation', cfg.reuse_882.usd_quotation, 'usd_quotation'],
  ['Sales Invoice', cfg.reuse_882.mur_invoice_draft, 'mur_invoice_draft'],
  ['Sales Invoice', cfg.reuse_882.usd_invoice_draft, 'usd_invoice_draft'],
]) {
  const got = await client.get(doctype, name);
  reuse882[key] = got.ok
    ? {
        name,
        docstatus: got.row?.docstatus ?? null,
        status: got.row?.status || null,
        currency: got.row?.currency || null,
        grand_total: got.row?.grand_total ?? null,
        conversion_rate: got.row?.conversion_rate ?? null,
      }
    : { name, missing: true, http: got.http };
  log(`reuse_882_${key}: ${got.ok ? `${name} docstatus=${got.row?.docstatus}` : `MISSING http=${got.http}`}`);
}

const proof = await proveSellingQuotationIdempotency(event, {
  client,
  referenceStore,
  repoRoot: ROOT,
});
const stored = referenceStore.getLead(event.lead_id);

let pdf = { ok: false, bytes: 0, is_pdf: false, sha256: null, outfile: null, error: 'not_attempted' };
const quotationName = proof.second?.erpnext_quotation || proof.first?.erpnext_quotation;
if (quotationName && typeof client.downloadPdf === 'function') {
  const printed = await client.downloadPdf('Quotation', quotationName, cfg.quotation.print_format);
  if (printed.ok && printed.isPdf) {
    const outfile = path.join(ARTIFACT_DIR, `cf1018-mur-${quotationName}.pdf`);
    writeFileSync(outfile, printed.bytes);
    pdf = {
      ok: true,
      bytes: printed.bytes.length,
      is_pdf: true,
      sha256: createHash('sha256').update(printed.bytes).digest('hex').slice(0, 16),
      outfile: path.relative(ROOT, outfile),
      print_format: cfg.quotation.print_format,
      error: null,
    };
  } else {
    pdf = { ok: false, bytes: 0, is_pdf: false, sha256: null, outfile: null, error: printed.error || 'PDF_FAILED' };
  }
}
log(`pdf: ok=${pdf.ok} bytes=${pdf.bytes} error=${pdf.error || 'none'}`);

const invoiceGate = invoiceDoesNotGrantProceedApproved({
  doctype: 'Sales Invoice',
  name: cfg.reuse_882.mur_invoice_draft,
  currency: 'MUR',
  grand_total: 45000,
  tc_name: cfg.quotation.terms_name,
  docstatus: 0,
});
const paymentMap = mapPaymentEvidenceWithoutPaymentEntry({
  quotation: quotationName,
  invoice: cfg.reuse_882.mur_invoice_draft,
  amount: 22500,
  currency: 'MUR',
});
const foundation = classifyAccountingFoundation();
const posting = salesInvoicePostingAllowed();
const readiness = evaluateQuoteToCashReadiness({
  upstream,
  quotation: proof.second?.readback || proof.first?.readback,
  proceed_approved_gate: { ok: invoiceGate.ok === true },
  invoice_does_not_approve: invoiceGate,
  sales_invoice_posted: false,
  payment_entry_created: false,
  accountant_foundation: cfg.accountant_foundation,
});

const evidence = {
  schema: 'corpflow.erpnext.selling_quote_to_cash_apply.v1',
  issue: 1056,
  generated_at_utc: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  identity: auth.user,
  secrets_printed: false,
  postgres_written: false,
  synthetic_lead_id: event.lead_id,
  synthetic_company_name: fixture.legal_name,
  company_identity: identity,
  upstream,
  reuse_882: reuse882,
  first: summarizeResult('first', proof.first),
  second: summarizeResult('second', proof.second),
  created_on_replay: proof.created_on_replay === true,
  duplicate_quotation_count: proof.second?.duplicate_quotation_count ?? proof.first?.duplicate_quotation_count ?? null,
  pointer: stored?.qualification_json?.erpnext || proof.second?.pointer || null,
  pointer_location: 'qualification_json.erpnext (in-memory reference; Postgres not written)',
  pdf,
  accepted_commercial_record: acceptedCommercialRecordMechanism(ROOT),
  sales_invoice_proforma: {
    new_invoice_created: false,
    reused_mur_draft: cfg.reuse_882.mur_invoice_draft,
    posting_allowed: posting.allowed,
    reason: posting.reason,
  },
  payment_evidence: paymentMap,
  proceed_approved_gate: invoiceGate,
  usd: usdReuseProof(ROOT),
  accountant_foundation: foundation,
  readiness,
  selling_quotation_sub_verdict: readiness.selling_quotation_ready ? SELLING_QUOTATION_SUB_VERDICT : 'NOT READY',
  verdict: readiness.verdict,
};

writeFileSync(path.join(ARTIFACT_DIR, 'apply-log.json'), `${JSON.stringify(evidence, null, 2)}\n`);

log(`first_run: action=${evidence.first.action} ok=${evidence.first.ok}`);
log(`second_run: action=${evidence.second.action} ok=${evidence.second.ok}`);
log(`created_on_replay: ${evidence.created_on_replay}`);
log(`duplicate_quotation_count: ${evidence.duplicate_quotation_count}`);
log(`erpnext_quotation: ${quotationName || 'none'}`);
log(`erpnext_lead: ${upstream.erpnext_lead}`);
log(`erpnext_opportunity: ${upstream.erpnext_opportunity}`);
log(`erpnext_customer: ${upstream.customer}`);
log(`sales_invoice_created: false`);
log(`payment_entry_created: false`);
log(`postgres_written: false`);
log(`selling_quotation_sub_verdict: ${evidence.selling_quotation_sub_verdict}`);
log(`verdict: ${evidence.verdict}`);

if (!proof.ok) {
  log(`ERPNext selling / quote-to-cash NOT READY — ${proof.second?.error || proof.first?.error || 'idempotency proof failed'}`);
  process.exit(1);
}

log(CANONICAL_VERDICT);
process.exit(0);
