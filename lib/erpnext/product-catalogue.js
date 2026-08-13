/**
 * ERPNext product & service catalogue (#881).
 *
 * Canonical invoicing identity for Lead Rescue, Website Rescue, approved
 * recurring SKUs, and the future-service template. Loads
 * config/erpnext-product-catalogue.v1.json.
 *
 * Does not call live ERPNext. Does not send, pay, or mutate schema.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../..');
export const CATALOGUE_REL = 'config/erpnext-product-catalogue.v1.json';

/** @type {ReturnType<typeof loadProductCatalogue> | null} */
let cached = null;

/**
 * @param {string} [repoRoot]
 */
export function loadProductCatalogue(repoRoot = REPO_ROOT) {
  if (cached && repoRoot === REPO_ROOT) return cached;
  const raw = readFileSync(path.join(repoRoot, CATALOGUE_REL), 'utf8');
  const catalogue = JSON.parse(raw);
  if (repoRoot === REPO_ROOT) cached = catalogue;
  return catalogue;
}

/**
 * @param {string} itemCode
 * @param {string} [repoRoot]
 */
export function getCatalogueItem(itemCode, repoRoot = REPO_ROOT) {
  const catalogue = loadProductCatalogue(repoRoot);
  const items = Array.isArray(catalogue.items) ? catalogue.items : [];
  return items.find((item) => item.item_code === itemCode) || null;
}

/**
 * @param {string} [repoRoot]
 */
export function listInsertedItems(repoRoot = REPO_ROOT) {
  const catalogue = loadProductCatalogue(repoRoot);
  return (catalogue.items || []).filter((item) => item.erpnext_insert === true);
}

/**
 * Canonical selling-price rows that may be written to ERPNext Item Price.
 * Excludes operator-quote, reserved, and unapproved bands.
 *
 * @param {string} [repoRoot]
 */
export function listCanonicalPriceRows(repoRoot = REPO_ROOT) {
  const catalogue = loadProductCatalogue(repoRoot);
  const rows = [];
  for (const item of catalogue.items || []) {
    if (item.erpnext_insert !== true) continue;
    for (const price of item.prices || []) {
      if (price.authority !== 'canonical') continue;
      if (price.rate === null || price.rate === undefined) continue;
      rows.push({
        item_code: String(item.item_code),
        item_name: String(item.item_name),
        price_list: String(price.price_list),
        currency: String(price.currency),
        rate: Number(price.rate),
        uom: String(price.uom || item.stock_uom),
        selling: 1,
      });
    }
  }
  return rows;
}

/**
 * Selling Price Lists required by canonical rows (create if missing).
 *
 * @param {string} [repoRoot]
 */
export function listRequiredSellingPriceLists(repoRoot = REPO_ROOT) {
  const catalogue = loadProductCatalogue(repoRoot);
  const needed = new Map();
  for (const row of listCanonicalPriceRows(repoRoot)) {
    needed.set(row.price_list, row.currency);
  }
  const defined = new Map(
    (catalogue.price_lists || []).map((pl) => [pl.name, pl]),
  );
  return [...needed.entries()].map(([name, currency]) => {
    const spec = defined.get(name) || {};
    return {
      name,
      currency: spec.currency || currency,
      selling: 1,
      buying: 0,
      enabled: 1,
    };
  });
}

/**
 * @param {string} htmlOrText
 */
export function toPlainCommercialText(htmlOrText) {
  return String(htmlOrText || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Quotation/invoice line taken only from client-facing catalogue fields.
 *
 * @param {Record<string, unknown>} item
 * @param {{ qty?: number, rate?: number | null }} [overrides]
 */
export function toQuotationLine(item, overrides = {}) {
  const prices = Array.isArray(item.prices) ? item.prices : [];
  const canonical = prices.find((p) => p.authority === 'canonical') || prices[0] || {};
  const rate =
    overrides.rate !== undefined
      ? overrides.rate
      : canonical.rate === null || canonical.rate === undefined
        ? null
        : Number(canonical.rate);
  const qty = overrides.qty !== undefined ? Number(overrides.qty) : 1;
  return {
    item_code: String(item.item_code),
    item_name: String(item.item_name),
    description: toPlainCommercialText(item.commercial_description),
    uom: String(item.stock_uom),
    qty,
    rate,
    amount: rate === null || Number.isNaN(Number(rate)) ? null : Number(rate) * qty,
    currency: canonical.currency || null,
    price_list: canonical.price_list || null,
  };
}

/**
 * @param {{
 *   title: string,
 *   currency: string,
 *   customer_name?: string,
 *   item_codes: string[],
 *   rates?: Record<string, number>,
 * }} spec
 * @param {string} [repoRoot]
 */
export function buildSyntheticQuotation(spec, repoRoot = REPO_ROOT) {
  const lines = spec.item_codes.map((code) => {
    const item = getCatalogueItem(code, repoRoot);
    if (!item) throw new Error(`Unknown catalogue item_code: ${code}`);
    const rate = spec.rates && Object.prototype.hasOwnProperty.call(spec.rates, code)
      ? spec.rates[code]
      : undefined;
    return toQuotationLine(item, rate === undefined ? {} : { rate });
  });
  const currencies = [...new Set(lines.map((l) => l.currency).filter(Boolean))];
  if (currencies.length > 1) {
    throw new Error(`Synthetic quotation mixed currencies: ${currencies.join(', ')}`);
  }
  if (currencies.length === 1 && currencies[0] !== spec.currency) {
    throw new Error(`Synthetic quotation currency ${spec.currency} does not match line ${currencies[0]}`);
  }
  const amounts = lines.map((l) => l.amount).filter((n) => n !== null);
  const grand_total = amounts.length === lines.length
    ? amounts.reduce((sum, n) => sum + n, 0)
    : null;
  return {
    doctype: 'Quotation',
    docstatus: 0,
    title: spec.title,
    customer_name: spec.customer_name || 'Synthetic Catalogue Buyer',
    currency: spec.currency,
    customer_remarks: 'TEST-ONLY #881 catalogue proof — DO NOT SEND TO CLIENT',
    items: lines,
    grand_total,
  };
}

/**
 * @param {string} [repoRoot]
 */
export function assertCatalogueInvariants(repoRoot = REPO_ROOT) {
  const catalogue = loadProductCatalogue(repoRoot);
  const items = Array.isArray(catalogue.items) ? catalogue.items : [];
  const forbidden = catalogue.commercial_vs_internal?.forbidden_in_commercial_description || [];
  const codes = items.map((item) => item.item_code);
  const dupes = codes.filter((code, i) => codes.indexOf(code) !== i);
  if (dupes.length) {
    throw new Error(`Duplicate item_code values: ${dupes.join(', ')}`);
  }

  const usdPilot = items.find((item) => item.item_code === 'LR-SETUP-USD-150');
  const murSprint = items.find((item) => item.item_code === 'CF-RD-LEAD-RESCUE');
  if (!usdPilot || !murSprint) {
    throw new Error('Lead Rescue USD pilot and MUR sprint masters are required');
  }
  if (usdPilot.item_code === murSprint.item_code) {
    throw new Error('USD pilot and MUR sprint must remain distinct masters');
  }

  for (const item of items) {
    if (item.billing_role === 'setup' && item.stock_uom !== 'Nos') {
      throw new Error(`${item.item_code} setup UOM must be Nos`);
    }
    if (item.billing_role === 'recurring' && item.stock_uom !== 'Month') {
      throw new Error(`${item.item_code} recurring UOM must be Month`);
    }
    if (item.is_stock_item !== 0 || item.is_sales_item !== 1) {
      throw new Error(`${item.item_code} must be a non-stock sales service`);
    }
    const desc = String(item.commercial_description || '');
    for (const token of forbidden) {
      if (desc.toLowerCase().includes(String(token).toLowerCase())) {
        throw new Error(`${item.item_code} commercial description contains internal token: ${token}`);
      }
    }
    if (item.has_variants) {
      throw new Error(`${item.item_code} must not use Item Variants`);
    }
  }

  const t1 = items.find((item) => item.item_code === 'CF-RD-LANDING-RESCUE');
  if (!t1 || t1.erpnext_insert !== true) {
    throw new Error('Website Rescue T1 master CF-RD-LANDING-RESCUE must be inserted');
  }
  return true;
}

export function leadRescueSyntheticQuotation(repoRoot = REPO_ROOT) {
  return buildSyntheticQuotation(
    {
      title: 'Lead Rescue catalogue proof',
      currency: 'USD',
      item_codes: ['LR-SETUP-USD-150', 'LR-REC-USD-99'],
    },
    repoRoot,
  );
}

export function websiteRescueSyntheticQuotation(repoRoot = REPO_ROOT) {
  return buildSyntheticQuotation(
    {
      title: 'Website Rescue catalogue proof',
      currency: 'MUR',
      item_codes: ['CF-RD-LANDING-RESCUE'],
    },
    repoRoot,
  );
}
