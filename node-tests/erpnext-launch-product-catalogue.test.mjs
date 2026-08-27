/**
 * #1207 launch-product catalogue / price-list quotation readiness.
 * Deterministic. Does not call live ERPNext. Never prints secrets.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  CANONICAL_VERDICT,
  CONFIG_REL,
  assertQuotationCodeUsesCatalogue,
  evaluateLaunchCatalogueEvidence,
  listLaunchProductSkus,
  listRequiredLaunchItemPrices,
  loadLaunchProductCatalogueConfig,
  notReadyVerdict,
} from '../lib/erpnext/launch-product-catalogue.js';
import { buildDraftQuotationPayload } from '../lib/erpnext/selling-quote-to-cash.js';
import { getCatalogueItem, listCanonicalPriceRows } from '../lib/erpnext/product-catalogue.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const PROBE = path.join(REPO_ROOT, 'scripts', 'erpnext', 'probe-launch-product-catalogue.mjs');
const DOC_REL = 'docs/erpnext/ERPNEXT_LAUNCH_PRODUCT_CATALOGUE_QUOTATION_READINESS_V1.md';
const SECRETISH = /sk_live|POSTGRES_URL\s*[:=]\s*\S+|ERPNEXT_API_SECRET\s*[:=]\s*\S+|eyJhbGci/;

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

function liveSnapshotFromConfig() {
  const cfg = loadLaunchProductCatalogueConfig();
  const items = {};
  for (const row of cfg.launch_products || []) {
    items[row.item_code] = {
      name: row.item_code,
      item_code: row.item_code,
      item_name: row.item_name,
      item_group: row.item_group,
      is_stock_item: 0,
      is_sales_item: 1,
      disabled: 0,
      has_variants: 0,
    };
  }
  const price_lists = {};
  for (const row of cfg.price_lists || []) {
    price_lists[row.name] = {
      currency: row.currency,
      selling: row.selling,
      buying: row.buying,
      enabled: row.enabled,
    };
  }
  const item_prices = listRequiredLaunchItemPrices().map((row) => ({
    name: row.item_price_name,
    item_code: row.item_code,
    price_list: row.price_list,
    currency: row.currency,
    price_list_rate: row.rate,
    uom: row.uom,
    selling: 1,
  }));
  const quotations = {};
  for (const row of cfg.live_quotations || []) {
    quotations[row.name] = {
      name: row.name,
      docstatus: row.docstatus,
      currency: row.currency,
      selling_price_list: row.selling_price_list,
      grand_total: row.grand_total,
      item_codes: row.item_codes,
    };
  }
  return { user: cfg.identity, items, price_lists, item_prices, quotations };
}

test('#1207 config names launch products, price lists, and Item Price ids', () => {
  const cfg = loadLaunchProductCatalogueConfig();
  assert.equal(cfg.issue, 1207);
  assert.equal(cfg.verdict, CANONICAL_VERDICT);
  assert.equal(cfg.current_main_sha, 'be671871f2bc2b5c7545d5379ff2be2caf2284d5');
  assert.equal(cfg.stale_implementation_pr, 1224);
  assert.deepEqual(listLaunchProductSkus().sort(), [
    'CF-RD-LANDING-RESCUE',
    'CF-RD-LEAD-RESCUE',
    'LR-SETUP-USD-150',
  ]);
  const prices = listRequiredLaunchItemPrices();
  assert.equal(prices.find((row) => row.item_code === 'LR-SETUP-USD-150').item_price_name, '80e9c04627');
  assert.equal(prices.find((row) => row.item_code === 'LR-REC-USD-99').item_price_name, '90egvb653r');
  assert.equal(prices.find((row) => row.item_code === 'CF-RD-LEAD-RESCUE').item_price_name, '80empip48q');
  assert.equal(prices.find((row) => row.item_code === 'CF-RD-LANDING-RESCUE').item_price_name, '10esgagbr0');
  assert.equal(cfg.no_erpnext_write, true);
  assert.equal(cfg.no_invented_prices, true);
});

test('launch SKUs are the #881 catalogue masters — no second product book', () => {
  for (const code of listLaunchProductSkus()) {
    const item = getCatalogueItem(code);
    assert.ok(item, `missing catalogue item ${code}`);
    assert.equal(item.erpnext_insert, true);
    assert.equal(item.is_stock_item, 0);
    assert.equal(item.is_sales_item, 1);
  }
  const canonical = listCanonicalPriceRows().map((row) => row.item_code).sort();
  assert.ok(canonical.includes('LR-SETUP-USD-150'));
  assert.ok(canonical.includes('CF-RD-LEAD-RESCUE'));
  assert.ok(canonical.includes('CF-RD-LANDING-RESCUE'));
  assert.equal(
    canonical.some((code) => /^LR-SETUP-MUR/i.test(code)),
    false,
  );
});

test('selling quotation payload uses catalogue item_code and does not send a fabricated rate', () => {
  const link = assertQuotationCodeUsesCatalogue();
  assert.equal(link.ok, true);
  assert.equal(link.item_code, 'CF-RD-LANDING-RESCUE');
  assert.equal(link.catalogue_rate, 45000);
  assert.equal(link.payload_sends_rate, false);
  const payload = buildDraftQuotationPayload(
    {
      lead_id: 'cf1018-synthetic-sales-lifecycle',
      customer: 'CF1018 Synthetic Sales Lifecycle Ltd',
      erpnext_opportunity: 'CRM-OPP-2026-00003',
    },
    { now: '2026-08-27T22:00:00Z' },
  );
  assert.equal(payload.items[0].item_code, 'CF-RD-LANDING-RESCUE');
  assert.equal(payload.items[0].qty, 1);
  assert.equal(payload.items[0].uom, 'Nos');
  assert.equal(Object.prototype.hasOwnProperty.call(payload.items[0], 'rate'), false);
  assert.equal(payload.selling_price_list, 'Standard Selling');
});

test('matching GET snapshot is READY; missing Item Price is the exact blocker', () => {
  const ready = evaluateLaunchCatalogueEvidence(liveSnapshotFromConfig());
  assert.equal(ready.ok, true, ready.blockers.join(','));
  assert.equal(ready.verdict, CANONICAL_VERDICT);

  const missing = liveSnapshotFromConfig();
  missing.item_prices = missing.item_prices.filter((row) => row.item_code !== 'LR-SETUP-USD-150');
  const blocked = evaluateLaunchCatalogueEvidence(missing);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.verdict, notReadyVerdict('ITEM_PRICE_MISSING:LR-SETUP-USD-150'));
});

test('duplicate Item Price rows fail closed; reserved T2/T3 must stay absent', () => {
  const dup = liveSnapshotFromConfig();
  const first = dup.item_prices.find((row) => row.item_code === 'CF-RD-LANDING-RESCUE');
  dup.item_prices.push({ ...first, name: 'duplicate-row' });
  const blocked = evaluateLaunchCatalogueEvidence(dup);
  assert.equal(blocked.ok, false);
  assert.match(blocked.verdict, /ITEM_PRICE_DUPLICATE:CF-RD-LANDING-RESCUE/);

  const reserved = liveSnapshotFromConfig();
  reserved.items['CF-WR-SETUP-MUR-T2'] = { item_code: 'CF-WR-SETUP-MUR-T2', item_name: 'should not exist' };
  const reservedBlocked = evaluateLaunchCatalogueEvidence(reserved);
  assert.equal(reservedBlocked.ok, false);
  assert.match(reservedBlocked.verdict, /RESERVED_ITEM_INSERTED:CF-WR-SETUP-MUR-T2/);
});

test('selling search projects customer_notes so idempotency is duplicate-safe', () => {
  const src = read('lib/erpnext/selling-quote-to-cash.js');
  const searchFn = src.match(/async function searchExistingQuotation[\s\S]*?fields:\s*\[([\s\S]*?)\]/);
  assert.ok(searchFn, 'searchExistingQuotation fields list missing');
  assert.match(searchFn[1], /['"]customer_notes['"]/);
  assert.match(src, /getCatalogueItem/);
  assert.match(src, /SEARCH_BEFORE_CREATE|SEARCH_QUOTATION/);
});

test('probe is GET-only, fails closed without secrets, and forbids MASTER_ADMIN_KEY auth', () => {
  const src = read('scripts/erpnext/probe-launch-product-catalogue.mjs');
  assert.match(src, /ERPNEXT_BASE_URL/);
  assert.match(src, /mutation: forbidden \(GET-only\)/);
  assert.match(src, /auth_fallback_master_admin_key: forbidden/);
  assert.match(src, /runtime_bridge_ssh: no/);
  assert.doesNotMatch(src, /Authorization:.*MASTER_ADMIN_KEY/);
  assert.doesNotMatch(src, /\bclient\.create\b/);
  assert.doesNotMatch(src, /\bclient\.update\b/);
  assert.doesNotMatch(src, /\binfisical\s+(run|export|get)\b/i);
  const dry = spawnSync(process.execPath, [PROBE, '--dry-run'], {
    cwd: REPO_ROOT,
    env: { ...process.env, ERPNEXT_BASE_URL: '', ERPNEXT_API_KEY: '', ERPNEXT_API_SECRET: '' },
    encoding: 'utf8',
    timeout: 15000,
  });
  assert.equal(dry.status, 0, dry.stderr);
  assert.match(dry.stdout, /dry_run: 1/);
  const missing = spawnSync(process.execPath, [PROBE], {
    cwd: REPO_ROOT,
    env: { ...process.env, ERPNEXT_BASE_URL: '', ERPNEXT_API_KEY: '', ERPNEXT_API_SECRET: '', MASTER_ADMIN_KEY: 'no' },
    encoding: 'utf8',
    timeout: 15000,
  });
  assert.equal(missing.status, 1, missing.stderr);
  assert.match(missing.stdout, /missing injected secrets/);
  assert.match(missing.stdout, /Do not use MASTER_ADMIN_KEY as a substitute/);
});

test('live GET artifact records READY without secret values', () => {
  const rel = 'artifacts/erpnext/launch-product-catalogue-1207/probe-log.json';
  assert.equal(existsSync(path.join(REPO_ROOT, rel)), true);
  const raw = read(rel);
  const log = JSON.parse(raw);
  assert.equal(log.verdict, CANONICAL_VERDICT);
  assert.equal(log.identity, 'integrations@corpflowai.com');
  assert.equal(log.postgres_written, false);
  assert.equal(log.mutation, 'forbidden');
  assert.equal(log.live.items['LR-SETUP-USD-150'].item_name, 'AI Lead Rescue Setup (USD 150 launch pilot)');
  assert.equal(log.live.quotations['SAL-QTN-2026-00005'].item_codes[0], 'CF-RD-LANDING-RESCUE');
  assert.doesNotMatch(raw, SECRETISH);
});

test('canonical doc and config exist without secret values', () => {
  assert.equal(existsSync(path.join(REPO_ROOT, DOC_REL)), true);
  assert.equal(existsSync(path.join(REPO_ROOT, CONFIG_REL)), true);
  const doc = read(DOC_REL);
  assert.ok(doc.includes('<!-- ERPNEXT_LAUNCH_PRODUCT_CATALOGUE_QUOTATION_READINESS_V1 -->'));
  assert.ok(doc.includes(CANONICAL_VERDICT));
  assert.ok(doc.includes('#1207'));
  assert.ok(doc.includes('LR-SETUP-USD-150'));
  assert.ok(doc.includes('CF-RD-LANDING-RESCUE'));
  assert.ok(doc.includes('80e9c04627'));
  assert.doesNotMatch(doc, SECRETISH);
  assert.doesNotMatch(read(CONFIG_REL), SECRETISH);
  assert.doesNotMatch(read('lib/erpnext/launch-product-catalogue.js'), SECRETISH);
});
