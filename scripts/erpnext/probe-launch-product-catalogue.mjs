#!/usr/bin/env node
/**
 * #1207 GET-only launch-product catalogue / price-list quotation readiness probe.
 *
 * Direct Frappe token auth from Cursor Cloud–injected secrets (names only):
 *   ERPNEXT_BASE_URL
 *   ERPNEXT_API_KEY
 *   ERPNEXT_API_SECRET
 *
 * Do NOT require MASTER_ADMIN_KEY, SSH, Infisical, or POSTGRES writes.
 * Never creates, updates, submits, or deletes ERPNext records.
 *
 * Usage:
 *   node scripts/erpnext/probe-launch-product-catalogue.mjs --dry-run
 *   node scripts/erpnext/probe-launch-product-catalogue.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CANONICAL_VERDICT,
  evaluateLaunchCatalogueEvidence,
  listLaunchProductSkus,
  loadLaunchProductCatalogueConfig,
} from '../../lib/erpnext/launch-product-catalogue.js';
import { frappeClientFromEnv, redactText } from '../../lib/erpnext/frappe-rest-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const ARTIFACT_DIR = path.join(ROOT, 'artifacts', 'erpnext', 'launch-product-catalogue-1207');

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
  log('ERPNext launch-product catalogue quotation readiness probe (#1207)');
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
  log('mutation: forbidden (GET-only)');
  log(`dry_run: ${dryRun ? 1 : 0}`);
}

function pick(row, keys) {
  const out = {};
  for (const key of keys) out[key] = row?.[key] ?? null;
  return out;
}

const dryRun = process.argv.includes('--dry-run');
printHeader(dryRun);

if (dryRun) {
  const cfg = loadLaunchProductCatalogueConfig(ROOT);
  log('mode: dry-run (no ERPNext call)');
  log(`planned_items: ${listLaunchProductSkus(ROOT).join(',')}`);
  log(`planned_price_lists: ${(cfg.price_lists || []).map((row) => row.name).join(',')}`);
  log('planned_non_actions: no Item/Item Price create, no FX mutation, no quotation submit/send');
  log(`ERPNext launch-product catalogue: DRY-RUN (${cfg.verdict} pending live GET)`);
  process.exit(0);
}

const missing = ['ERPNEXT_BASE_URL', 'ERPNEXT_API_KEY', 'ERPNEXT_API_SECRET'].filter(
  (name) => !process.env[name] || !String(process.env[name]).trim(),
);
if (missing.length) {
  log(`ERPNext launch-product catalogue NOT READY — missing injected secrets: ${missing.join(' ')}`);
  log('Do not use MASTER_ADMIN_KEY as a substitute.');
  process.exit(1);
}

const cfg = loadLaunchProductCatalogueConfig(ROOT);
const client = frappeClientFromEnv();
const probedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

const auth = await client.getLoggedUser();
log(`auth_http: ${auth.http}`);
log(`auth_user: ${auth.user || 'not_obtained'}`);
if (!auth.ok) {
  log(`ERPNext launch-product catalogue NOT READY — AUTH_FAILED ${redactText(auth.error || '')}`);
  process.exit(1);
}

const live = {
  user: auth.user,
  items: {},
  price_lists: {},
  item_prices: [],
  quotations: {},
};

const itemCodes = [
  ...listLaunchProductSkus(ROOT),
  'LR-REC-USD-99',
  'CF-WR-REC-MUR-MAINT',
  ...(cfg.reserved_not_inserted || []),
];
for (const code of itemCodes) {
  const got = await client.get('Item', code);
  log(`ITEM ${code}: http=${got.http} ${got.ok ? 'ok' : 'missing'}`);
  if (got.ok && got.row) {
    live.items[code] = pick(got.row, [
      'item_code',
      'item_name',
      'item_group',
      'stock_uom',
      'is_stock_item',
      'is_sales_item',
      'disabled',
      'has_variants',
      'standard_rate',
    ]);
    live.items[code].name = got.row.name;
  }
}

for (const spec of cfg.price_lists || []) {
  const got = await client.get('Price List', spec.name);
  log(`PRICE_LIST ${spec.name}: http=${got.http} ${got.ok ? 'ok' : 'missing'}`);
  if (got.ok && got.row) {
    live.price_lists[spec.name] = pick(got.row, ['currency', 'selling', 'buying', 'enabled']);
  }
}

const priceList = await client.list('Item Price', {
  fields: ['name', 'item_code', 'price_list', 'currency', 'price_list_rate', 'uom', 'selling'],
  filters: [['selling', '=', 1]],
  limit: 50,
});
log(`ITEM_PRICE list http=${priceList.http} count=${(priceList.rows || []).length}`);
live.item_prices = (priceList.rows || []).map((row) => ({
  name: row.name,
  item_code: row.item_code,
  price_list: row.price_list,
  currency: row.currency,
  price_list_rate: row.price_list_rate,
  uom: row.uom,
  selling: row.selling,
}));

for (const qtn of cfg.live_quotations || []) {
  const got = await client.get('Quotation', qtn.name);
  log(`QTN ${qtn.name}: http=${got.http} ${got.ok ? 'ok' : 'missing'}`);
  if (got.ok && got.row) {
    const items = Array.isArray(got.row.items) ? got.row.items : [];
    live.quotations[qtn.name] = {
      name: got.row.name,
      docstatus: got.row.docstatus,
      status: got.row.status,
      currency: got.row.currency,
      conversion_rate: got.row.conversion_rate,
      selling_price_list: got.row.selling_price_list,
      grand_total: got.row.grand_total,
      party_name: got.row.party_name,
      item_codes: items.map((item) => item.item_code),
      rates: items.map((item) => item.rate),
    };
  }
}

const result = evaluateLaunchCatalogueEvidence(live, ROOT);
log(`duplicate_item_price_check: launch SKUs unique=${result.ok ? 'yes' : 'see blockers'}`);
log(`quotation_linkage: selling item_code=${cfg.quotation_linkage.selling_item_code} payload_sends_rate=false`);
log(`current_main_sha: ${cfg.current_main_sha}`);
log(`probed_at_utc: ${probedAt}`);
log(`blockers: ${result.blockers.length ? result.blockers.join(',') : 'none'}`);
log(`verdict: ${result.verdict}`);

mkdirSync(ARTIFACT_DIR, { recursive: true });
const artifact = {
  issue: 1207,
  probed_at_utc: probedAt,
  identity: auth.user,
  mutation: 'forbidden',
  current_main_sha: cfg.current_main_sha,
  master_admin_key: presence('MASTER_ADMIN_KEY'),
  postgres_written: false,
  live,
  verdict: result.verdict,
  blockers: result.blockers,
};
writeFileSync(path.join(ARTIFACT_DIR, 'probe-log.json'), `${JSON.stringify(artifact, null, 2)}\n`);
log('artifact: artifacts/erpnext/launch-product-catalogue-1207/probe-log.json');
log(`ERPNext launch-product catalogue: ${result.ok ? 'PASS' : 'FAIL'} (${result.verdict})`);
process.exit(result.ok ? 0 : 1);
