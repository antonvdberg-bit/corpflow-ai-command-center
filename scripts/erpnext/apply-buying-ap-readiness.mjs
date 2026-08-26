#!/usr/bin/env node
/**
 * Apply / prove ERPNext Buying / AP readiness (#1098).
 *
 * Direct Frappe token auth from Cursor Cloud–injected secrets (names only):
 *   ERPNEXT_BASE_URL
 *   ERPNEXT_API_KEY
 *   ERPNEXT_API_SECRET
 *
 * Do NOT require MASTER_ADMIN_KEY, SSH, or Infisical.
 * Search-before-create one synthetic Supplier and one synthetic purchase Item.
 * Never submit a Purchase Invoice. Never create Payment Entry.
 * Never print host URLs, tokens, or bank credentials.
 *
 * Usage:
 *   node scripts/erpnext/apply-buying-ap-readiness.mjs --dry-run
 *   node scripts/erpnext/apply-buying-ap-readiness.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CANONICAL_VERDICT,
  PAYMENT_SEGREGATION_RULE,
  PURCHASE_ORDER_VERDICT,
  buildSupplierAddressPayload,
  buildSupplierContactPayload,
  buildSupplierPayload,
  buildSyntheticPurchaseItemPayload,
  evaluatePurchaseInvoiceSubmitGate,
  evaluatePurchaseOrderNeed,
  loadBuyingApReadinessConfig,
  payloadContainsForbiddenBankEvidence,
} from '../../lib/erpnext/buying-ap-readiness.js';
import { frappeClientFromEnv, redactText } from '../../lib/erpnext/frappe-rest-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const ARTIFACT_DIR = path.join(ROOT, 'artifacts', 'erpnext', 'buying-ap-readiness-1098');

function log(msg) {
  console.log(String(msg));
}

function presence(name) {
  const value = process.env[name];
  return value && String(value).trim() ? 'present' : 'absent';
}

function listInjectedSecretNames() {
  const wanted = [
    'ERPNEXT_BASE_URL',
    'ERPNEXT_API_KEY',
    'ERPNEXT_API_SECRET',
    'MASTER_ADMIN_KEY',
    'ADMIN_PIN',
  ];
  const present = wanted.filter((name) => process.env[name] && String(process.env[name]).trim());
  return present.length ? present.join(',') : 'none';
}

function printHeader(dryRun) {
  const cfg = loadBuyingApReadinessConfig(ROOT);
  log('ERPNext Buying / AP readiness apply (#1098)');
  log('access_path: direct Cursor Cloud secrets → Frappe token auth (no SSH/Infisical runtime bridge)');
  log('expected_identity: integrations@corpflowai.com (CorpFlowAI Integration)');
  log(`ERPNEXT_BASE_URL: ${presence('ERPNEXT_BASE_URL')}`);
  log(`ERPNEXT_API_KEY: ${presence('ERPNEXT_API_KEY')}`);
  log(`ERPNEXT_API_SECRET: ${presence('ERPNEXT_API_SECRET')}`);
  log(`MASTER_ADMIN_KEY: ${presence('MASTER_ADMIN_KEY')} (must not be used as ERPNext auth)`);
  log(`injected_secret_names_checked: ${listInjectedSecretNames()}`);
  log('auth_fallback_master_admin_key: forbidden');
  log('runtime_bridge_ssh: no');
  log('runtime_bridge_infisical: no');
  log('ERPNEXT_BASE_URL_value: not_printed');
  log(`dry_run: ${dryRun ? 1 : 0}`);
  log(`synthetic_supplier: ${cfg.synthetic.supplier_name}`);
  log(`synthetic_item: ${cfg.synthetic.item_code}`);
  log(`purchase_order_verdict: ${PURCHASE_ORDER_VERDICT}`);
  log(`payment_segregation_rule: ${PAYMENT_SEGREGATION_RULE}`);
  log('purchase_invoice_submit: forbidden');
  log('payment_entry: forbidden');
}

function safeSupplier(row) {
  if (!row || typeof row !== 'object') return null;
  return {
    name: row.name || null,
    supplier_name: row.supplier_name || null,
    supplier_group: row.supplier_group || null,
    supplier_type: row.supplier_type || null,
    country: row.country || null,
    default_currency: row.default_currency || null,
    disabled: row.disabled ?? null,
    tax_id_present: Boolean(row.tax_id),
    default_bank_account_present: Boolean(row.default_bank_account),
  };
}

function clickPath() {
  return [
    'Smallest Anton click path (UI-only; no secrets, no schema, no payment):',
    '1. ERPNext Desk as Administrator.',
    '2. Home → Users → Role Permissions Manager.',
    '3. Role = Purchase User (already held by integrations@corpflowai.com per #1019).',
    '4. DocType = Supplier: Read, Create, Write (permlevel 0).',
    '5. Save. Do not assign System Manager. Do not change Role Profile to drop Purchase User.',
    '6. Re-run: node scripts/erpnext/apply-buying-ap-readiness.mjs',
    'Why: Supplier LIST HTTP 200; Supplier CREATE HTTP 403 (No permission for Supplier).',
  ].join('\n');
}

async function searchName(client, doctype, field, value) {
  const listed = await client.list(doctype, {
    fields: ['name', field],
    filters: [[field, '=', value]],
    limit: 5,
  });
  return listed;
}

async function ensureItem(client, cfg) {
  const itemCode = cfg.synthetic.item_code;
  const existing = await client.get('Item', itemCode);
  if (existing.ok && existing.row) {
    return { action: 'reuse', http: existing.http, row: existing.row };
  }
  const payload = buildSyntheticPurchaseItemPayload(cfg);
  const created = await client.create('Item', payload);
  return { action: created.ok ? 'create' : 'failed', http: created.http, row: created.row, error: created.error };
}

async function ensureSupplier(client, cfg) {
  const intake = {
    ...cfg.synthetic,
    synthetic: true,
    issue: 1098,
  };
  const payload = buildSupplierPayload(intake, cfg);
  const forbidden = payloadContainsForbiddenBankEvidence(payload, cfg);
  if (forbidden.length) {
    return { action: 'blocked', http: 0, error: `forbidden_bank_keys:${forbidden.join(',')}` };
  }
  const listed = await searchName(client, 'Supplier', 'supplier_name', payload.supplier_name);
  const rows = listed.rows || [];
  if (listed.ok && rows.length) {
    const got = await client.get('Supplier', rows[0].name);
    return { action: 'reuse', http: listed.http, row: got.row || rows[0] };
  }
  const created = await client.create('Supplier', payload);
  return {
    action: created.ok ? 'create' : 'failed',
    http: created.http,
    row: created.row,
    error: created.error,
  };
}

async function ensureLinked(client, doctype, payload, searchField, searchValue) {
  const listed = await searchName(client, doctype, searchField, searchValue);
  if (listed.ok && listed.rows && listed.rows.length) {
    return { action: 'reuse', http: listed.http, name: listed.rows[0].name };
  }
  const created = await client.create(doctype, payload);
  return {
    action: created.ok ? 'create' : 'failed',
    http: created.http,
    name: created.row && created.row.name,
    error: created.error,
  };
}

async function liveApply() {
  const cfg = loadBuyingApReadinessConfig(ROOT);
  const missing = ['ERPNEXT_BASE_URL', 'ERPNEXT_API_KEY', 'ERPNEXT_API_SECRET'].filter(
    (name) => !process.env[name] || !String(process.env[name]).trim()
  );
  if (missing.length) {
    log(`ERPNext Buying / AP readiness NOT READY — missing injected secrets: ${missing.join(' ')}`);
    log('Do not use MASTER_ADMIN_KEY as a substitute.');
    process.exit(1);
  }

  const client = frappeClientFromEnv(process.env);
  const auth = await client.getLoggedUser();
  log(`authenticated_user: ${auth.user || 'not_obtained'}`);
  log(`http_auth_status: ${auth.http}`);
  if (!auth.ok || auth.user !== 'integrations@corpflowai.com') {
    log(`ERPNext Buying / AP readiness NOT READY — auth failed HTTP ${auth.http} ${redactText(auth.error || '')}`);
    process.exit(1);
  }

  const doctypes = [
    'Supplier',
    'Supplier Group',
    'Purchase Order',
    'Purchase Invoice',
    'Payment Term',
    'Payment Terms Template',
    'Cost Center',
    'Account',
    'File',
    'Item',
  ];
  const reachable = [];
  const denied = [];
  for (const doctype of doctypes) {
    const listed = await client.list(doctype, { fields: ['name'], limit: 1 });
    if (listed.ok) reachable.push(doctype);
    else denied.push(`${doctype}:HTTP_${listed.http}`);
    log(`doctype ${doctype}: ${listed.ok ? 'REACHABLE' : 'DENIED'} HTTP ${listed.http}`);
  }

  const po = evaluatePurchaseOrderNeed(cfg);
  const submitGate = evaluatePurchaseInvoiceSubmitGate({});
  log(`purchase_order_verdict: ${po.verdict}`);
  log(`po_required_readback: ${po.po_required}`);
  log(`pi_submit_allowed: ${submitGate.allowed}`);
  log(`pi_submit_missing: ${submitGate.missing.join(',')}`);

  const item = await ensureItem(client, cfg);
  log(
    `synthetic_item: action=${item.action} HTTP ${item.http} name=${item.row && item.row.name ? item.row.name : 'none'} purchase=${item.row && item.row.is_purchase_item}`
  );

  const supplier = await ensureSupplier(client, cfg);
  log(
    `synthetic_supplier: action=${supplier.action} HTTP ${supplier.http} ${supplier.error ? `error=${redactText(supplier.error)}` : ''}`
  );
  const supplierSafe = safeSupplier(supplier.row);
  if (supplierSafe) log(`synthetic_supplier_readback: ${JSON.stringify(supplierSafe)}`);

  let contact = { action: 'skipped', http: 0 };
  let address = { action: 'skipped', http: 0 };
  if (supplier.action === 'create' || supplier.action === 'reuse') {
    const supplierName = supplier.row && supplier.row.name;
    contact = await ensureLinked(
      client,
      'Contact',
      buildSupplierContactPayload({ ...cfg.synthetic, synthetic: true }, supplierName, cfg),
      'first_name',
      cfg.synthetic.contact_first_name
    );
    address = await ensureLinked(
      client,
      'Address',
      buildSupplierAddressPayload({ ...cfg.synthetic, synthetic: true }, supplierName, cfg),
      'address_title',
      cfg.synthetic.supplier_name
    );
    log(`synthetic_contact: action=${contact.action} HTTP ${contact.http} name=${contact.name || 'none'}`);
    log(`synthetic_address: action=${address.action} HTTP ${address.http} name=${address.name || 'none'}`);
  } else {
    log('synthetic_contact: skipped (supplier not writable this run)');
    log('synthetic_address: skipped (supplier not writable this run)');
    log(clickPath());
  }

  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const artifact = {
    issue: 1098,
    authenticated_user: auth.user,
    reachable_doctypes: reachable,
    denied_doctypes: denied,
    purchase_order_verdict: po.verdict,
    payment_segregation_rule: PAYMENT_SEGREGATION_RULE,
    synthetic_item: {
      action: item.action,
      http: item.http,
      name: item.row && item.row.name,
      is_purchase_item: item.row && item.row.is_purchase_item,
    },
    synthetic_supplier: {
      action: supplier.action,
      http: supplier.http,
      error: supplier.error ? redactText(supplier.error) : null,
      readback: supplierSafe,
    },
    purchase_invoice_submit: 'not_attempted',
    payment_entry: 'not_attempted',
    verdict: CANONICAL_VERDICT,
  };
  writeFileSync(path.join(ARTIFACT_DIR, 'apply-log.json'), `${JSON.stringify(artifact, null, 2)}\n`);
  log(`artifact: artifacts/erpnext/buying-ap-readiness-1098/apply-log.json`);
  log(`verdict: ${CANONICAL_VERDICT}`);
  if (supplier.action === 'failed' && Number(supplier.http) === 403) {
    log('supplier_create_remaining: Anton Role Permissions Manager grant for Supplier on Purchase User');
  }
  log('exact_blocker_for_accountant_config: NONE');
  log('protected_actions_remaining: PI submit, Payment Entry, bank credentials, real supplier approval, #1055 CoA/tax');
}

const dryRun = process.argv.includes('--dry-run');
printHeader(dryRun);
if (dryRun) {
  log('mode: dry-run (no ERPNext call)');
  log('planned: search-before-create synthetic Supplier + Contact + Address + purchase Item');
  log('planned_forbidden: Purchase Invoice submit, Payment Entry, bank fields, custom DocType');
  log(`verdict: ${CANONICAL_VERDICT}`);
  process.exit(0);
}

liveApply().catch((err) => {
  log(`unexpected: ${redactText(err && err.message ? err.message : 'error')}`);
  process.exit(2);
});
