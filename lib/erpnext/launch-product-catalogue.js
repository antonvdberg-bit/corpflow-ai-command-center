/**
 * #1207 launch-product catalogue / price-list quotation readiness.
 *
 * Pure evaluator. Does not call live ERPNext. Reuses the #881 catalogue as
 * the only product/price projection. Quotation builders must send ERPNext
 * item_code (and qty/uom) so Item Price on the Price List supplies the rate.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCatalogueItem, listCanonicalPriceRows, loadProductCatalogue } from './product-catalogue.js';
import { loadSellingQuoteToCashConfig } from './selling-quote-to-cash.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../..');
export const CONFIG_REL = 'config/erpnext-launch-product-catalogue.v1.json';
export const CANONICAL_VERDICT = 'ERPNext LAUNCH-PRODUCT CATALOGUE READY FOR QUOTATION';
export const NOT_READY_PREFIX = 'NOT READY —';

/** @type {ReturnType<typeof loadConfig> | null} */
let cached = null;

function loadConfig(repoRoot = REPO_ROOT) {
  return JSON.parse(readFileSync(path.join(repoRoot, CONFIG_REL), 'utf8'));
}

export function loadLaunchProductCatalogueConfig(repoRoot = REPO_ROOT) {
  if (cached && repoRoot === REPO_ROOT) return cached;
  const parsed = loadConfig(repoRoot);
  if (repoRoot === REPO_ROOT) cached = parsed;
  return parsed;
}

export function resetLaunchProductCatalogueConfigCache() {
  cached = null;
}

function asString(v) {
  return v == null ? '' : String(v).trim();
}

function asNumber(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function listLaunchProductSkus(repoRoot = REPO_ROOT) {
  const cfg = loadLaunchProductCatalogueConfig(repoRoot);
  return (cfg.launch_products || []).map((row) => asString(row.item_code));
}

export function listRequiredLaunchItemPrices(repoRoot = REPO_ROOT) {
  const cfg = loadLaunchProductCatalogueConfig(repoRoot);
  const supporting = cfg.supporting_prices_already_authoritative || [];
  return [...(cfg.launch_products || []), ...supporting].map((row) => ({
    item_code: asString(row.item_code),
    price_list: asString(row.price_list),
    currency: asString(row.currency),
    rate: asNumber(row.rate),
    item_price_name: asString(row.item_price_name),
    uom: asString(row.uom || row.stock_uom || ''),
  }));
}

/**
 * Quotation code must project ERPNext catalogue identifiers, not a second price book.
 */
export function assertQuotationCodeUsesCatalogue(repoRoot = REPO_ROOT) {
  const selling = loadSellingQuoteToCashConfig(repoRoot);
  const itemCode = asString(selling.item?.item_code);
  const catalogueItem = getCatalogueItem(itemCode, repoRoot);
  if (!catalogueItem) {
    throw new Error(`Selling quotation item_code ${itemCode} is not in the ERPNext catalogue`);
  }
  const canonical = listCanonicalPriceRows(repoRoot).find((row) => row.item_code === itemCode);
  if (!canonical) {
    throw new Error(`Selling quotation item_code ${itemCode} has no canonical Item Price`);
  }
  if (asNumber(selling.item?.expected_rate_mur) !== canonical.rate) {
    throw new Error(
      `Selling expected_rate_mur ${selling.item?.expected_rate_mur} does not match catalogue Item Price ${canonical.rate}`,
    );
  }
  if (asString(selling.quotation?.selling_price_list) !== canonical.price_list) {
    throw new Error(
      `Selling price list ${selling.quotation?.selling_price_list} does not match catalogue ${canonical.price_list}`,
    );
  }
  const payloadHasRate = false;
  return {
    ok: true,
    item_code: itemCode,
    price_list: canonical.price_list,
    catalogue_rate: canonical.rate,
    payload_sends_rate: payloadHasRate,
  };
}

function itemMatches(expected, live) {
  if (!live) return [`ITEM_MISSING:${expected.item_code}`];
  const blockers = [];
  if (asString(live.item_code || live.name) !== expected.item_code) blockers.push(`ITEM_CODE_MISMATCH:${expected.item_code}`);
  if (asString(live.item_name) !== expected.item_name) blockers.push(`ITEM_NAME_MISMATCH:${expected.item_code}`);
  if (asString(live.item_group) !== expected.item_group) blockers.push(`ITEM_GROUP_MISMATCH:${expected.item_code}`);
  if (asNumber(live.disabled) === 1) blockers.push(`ITEM_DISABLED:${expected.item_code}`);
  if (asNumber(live.is_stock_item) !== 0) blockers.push(`ITEM_IS_STOCK:${expected.item_code}`);
  if (asNumber(live.is_sales_item) !== 1) blockers.push(`ITEM_NOT_SALES:${expected.item_code}`);
  if (asNumber(live.has_variants) === 1) blockers.push(`ITEM_HAS_VARIANTS:${expected.item_code}`);
  return blockers;
}

function priceMatches(expected, liveRows) {
  const rows = Array.isArray(liveRows) ? liveRows.filter((row) => asString(row.item_code) === expected.item_code) : [];
  if (rows.length === 0) return [`ITEM_PRICE_MISSING:${expected.item_code}`];
  if (rows.length > 1) return [`ITEM_PRICE_DUPLICATE:${expected.item_code}`];
  const live = rows[0];
  const blockers = [];
  if (asString(live.name) !== expected.item_price_name) blockers.push(`ITEM_PRICE_NAME_MISMATCH:${expected.item_code}`);
  if (asString(live.price_list) !== expected.price_list) blockers.push(`PRICE_LIST_MISMATCH:${expected.item_code}`);
  if (asString(live.currency) !== expected.currency) blockers.push(`CURRENCY_MISMATCH:${expected.item_code}`);
  if (asNumber(live.price_list_rate) !== expected.rate) blockers.push(`RATE_MISMATCH:${expected.item_code}`);
  return blockers;
}

function quotationMatches(expected, live) {
  if (!live) return [`QUOTATION_MISSING:${expected.name}`];
  const blockers = [];
  if (asNumber(live.docstatus) !== 0) blockers.push(`QUOTATION_NOT_DRAFT:${expected.name}`);
  if (asString(live.currency) !== expected.currency) blockers.push(`QUOTATION_CURRENCY:${expected.name}`);
  if (asString(live.selling_price_list) !== expected.selling_price_list) {
    blockers.push(`QUOTATION_PRICE_LIST:${expected.name}`);
  }
  if (asNumber(live.grand_total) !== expected.grand_total) blockers.push(`QUOTATION_TOTAL:${expected.name}`);
  const liveCodes = Array.isArray(live.item_codes)
    ? live.item_codes.map(asString)
    : (Array.isArray(live.items) ? live.items.map((item) => asString(item.item_code)) : []);
  const expectedCodes = (expected.item_codes || []).map(asString);
  if (liveCodes.join('|') !== expectedCodes.join('|')) blockers.push(`QUOTATION_ITEMS:${expected.name}`);
  return blockers;
}

/**
 * Compare a GET/read-only live snapshot to the catalogue. Never invents rates.
 *
 * @param {{
 *   user?: string,
 *   items?: Record<string, object>,
 *   price_lists?: Record<string, object>,
 *   item_prices?: object[],
 *   quotations?: Record<string, object>,
 * }} live
 */
export function evaluateLaunchCatalogueEvidence(live = {}, repoRoot = REPO_ROOT) {
  const cfg = loadLaunchProductCatalogueConfig(repoRoot);
  const catalogue = loadProductCatalogue(repoRoot);
  const blockers = [];

  if (asString(live.user) && asString(live.user) !== asString(cfg.identity)) {
    blockers.push('AUTH_IDENTITY_MISMATCH');
  }

  for (const expected of cfg.launch_products || []) {
    const catalogueItem = getCatalogueItem(expected.item_code, repoRoot);
    if (!catalogueItem) blockers.push(`CATALOGUE_JSON_MISSING:${expected.item_code}`);
    blockers.push(...itemMatches(expected, live.items?.[expected.item_code]));
    blockers.push(...priceMatches(expected, live.item_prices));
  }

  for (const expected of cfg.supporting_prices_already_authoritative || []) {
    blockers.push(...priceMatches(expected, live.item_prices));
  }

  for (const name of (cfg.price_lists || []).map((row) => row.name)) {
    const spec = (cfg.price_lists || []).find((row) => row.name === name);
    const liveList = live.price_lists?.[name];
    if (!liveList) {
      blockers.push(`PRICE_LIST_MISSING:${name}`);
      continue;
    }
    if (asString(liveList.currency) !== spec.currency) blockers.push(`PRICE_LIST_CURRENCY:${name}`);
    if (asNumber(liveList.selling) !== 1) blockers.push(`PRICE_LIST_NOT_SELLING:${name}`);
    if (asNumber(liveList.enabled) !== 1) blockers.push(`PRICE_LIST_DISABLED:${name}`);
  }

  for (const expected of cfg.live_quotations || []) {
    if (expected.name === 'SAL-QTN-2026-00002') continue;
    blockers.push(...quotationMatches(expected, live.quotations?.[expected.name]));
  }

  for (const code of cfg.reserved_not_inserted || []) {
    if (live.items?.[code]) blockers.push(`RESERVED_ITEM_INSERTED:${code}`);
  }

  const maintPrices = (live.item_prices || []).filter((row) => asString(row.item_code) === 'CF-WR-REC-MUR-MAINT');
  if (maintPrices.length) blockers.push('MAINTENANCE_LIST_PRICE_INVENTED');

  const usdPilotMurClone = (catalogue.items || []).some((item) => /^LR-SETUP-MUR/i.test(String(item.item_code || '')));
  if (usdPilotMurClone) blockers.push('USD_PILOT_MUR_CLONE');

  try {
    assertQuotationCodeUsesCatalogue(repoRoot);
  } catch (err) {
    blockers.push(asString(err && err.message) || 'QUOTATION_CODE_NOT_CATALOGUE');
  }

  const unique = [...new Set(blockers.filter(Boolean))];
  if (unique.length) {
    return {
      ok: false,
      verdict: `${NOT_READY_PREFIX} ${unique[0]}`,
      blockers: unique,
    };
  }
  return { ok: true, verdict: CANONICAL_VERDICT, blockers: [] };
}

export function notReadyVerdict(blocker) {
  return `${NOT_READY_PREFIX} ${asString(blocker) || 'UNKNOWN'}`;
}
