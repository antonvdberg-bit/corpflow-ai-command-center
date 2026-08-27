/**
 * ERPNext commercial-document invariants for #882.
 *
 * Pure helpers: no live ERPNext calls, no secrets, no payments, no sends.
 * Financial approval-to-build stays on the #714 rail — ERPNext never flips
 * financially_approved.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../..');
const CONFIG_REL = 'config/erpnext-commercial-documents.v1.json';

/** @type {ReturnType<typeof loadConfig> | null} */
let cachedConfig = null;

function loadConfig(repoRoot = REPO_ROOT) {
  return JSON.parse(readFileSync(path.join(repoRoot, CONFIG_REL), 'utf8'));
}

export function loadCommercialDocumentsConfig(repoRoot = REPO_ROOT) {
  if (cachedConfig && repoRoot === REPO_ROOT) return cachedConfig;
  const parsed = loadConfig(repoRoot);
  if (repoRoot === REPO_ROOT) cachedConfig = parsed;
  return parsed;
}

export function resetCommercialDocumentsConfigCache() {
  cachedConfig = null;
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

/**
 * Company legal identifiers confirmed by Anton for #882.
 * 228280 is a short-form reference only — never treat it as a third independent id.
 */
export function companyIdentityIsAuthoritative(company, config = loadCommercialDocumentsConfig()) {
  const expected = config.company || {};
  const taxId = asString(company?.tax_id);
  const registration = asString(company?.registration_details);
  const currency = asString(company?.default_currency);
  const email = asString(company?.email);
  const blockers = [];
  if (taxId !== asString(expected.tax_id)) blockers.push('TAX_ID_MISMATCH');
  if (!registration.includes('C25228280')) blockers.push('REGISTRATION_MISSING_C25228280');
  if (currency !== asString(expected.default_currency)) blockers.push('BASE_CURRENCY_CHANGED');
  if (email && email !== asString(expected.commercial_email)) blockers.push('COMMERCIAL_EMAIL_MISMATCH');
  if (asString(company?.tax_id) === '228280') blockers.push('SHORT_FORM_USED_AS_TAX_ID');
  return { ok: blockers.length === 0, blockers };
}

/**
 * Foreign-currency documents must not silently treat 1.0 as USD=MUR.
 * Missing Currency Exchange is the fail-closed path (Sales Invoice HTTP 417).
 */
export function conversionRateIsSafe(doc, companyCurrency = 'MUR') {
  const documentCurrency = asString(doc?.currency);
  const base = asString(companyCurrency) || 'MUR';
  const rate = asNumber(doc?.conversion_rate);
  if (!documentCurrency) {
    return { ok: false, blockers: ['MISSING_DOCUMENT_CURRENCY'] };
  }
  if (documentCurrency === base) {
    if (rate != null && rate !== 1) {
      return { ok: false, blockers: ['BASE_CURRENCY_RATE_NOT_ONE'] };
    }
    return { ok: true, blockers: [] };
  }
  if (rate == null || rate <= 0) {
    return { ok: false, blockers: ['MISSING_EXCHANGE_RATE'] };
  }
  if (rate === 1) {
    return { ok: false, blockers: ['UNSAFE_ONE_TO_ONE_FX'] };
  }
  return { ok: true, blockers: [] };
}

/**
 * Reusable pattern for GBP / AUD / AED (and further selling currencies).
 */
export function foreignCurrencyReadiness(opts = {}, config = loadCommercialDocumentsConfig()) {
  const currency = asString(opts.currency).toUpperCase();
  const enabled = Array.isArray(opts.enabledCurrencies)
    ? opts.enabledCurrencies.map((c) => String(c).toUpperCase())
    : (config.currency?.selling_document_currencies_enabled || []).map((c) =>
        String(c).toUpperCase(),
      );
  const hasPriceList = opts.hasSellingPriceList === true;
  const hasExchange = opts.hasCurrencyExchangeToBase === true;
  const blockers = [];
  if (!currency) blockers.push('MISSING_CURRENCY');
  if (currency && !enabled.includes(currency)) blockers.push('CURRENCY_NOT_ENABLED');
  if (currency && currency !== asString(config.company?.default_currency) && !hasPriceList) {
    blockers.push('MISSING_SELLING_PRICE_LIST');
  }
  if (currency && currency !== asString(config.company?.default_currency) && !hasExchange) {
    blockers.push('MISSING_CURRENCY_EXCHANGE');
  }
  return { ok: blockers.length === 0, blockers, currency };
}

/**
 * ERPNext quotation/invoice is commercial evidence only.
 * It never publishes financially_approved — #714 remains the gate.
 */
export function toCommercialRailProposalStub(doc, product) {
  const name = asString(doc?.name);
  const currency = asString(doc?.currency);
  const grand = asNumber(doc?.grand_total);
  const terms = asString(doc?.tc_name || doc?.terms);
  return {
    source: 'erpnext',
    proposal_status: asNumber(doc?.docstatus) === 1 ? 'provided_to_client' : 'draft',
    proposal_version: name,
    product: asString(product),
    quoted_currency: currency,
    setup_price: grand,
    payment_terms: terms,
    erpnext_doctype: asString(doc?.doctype || 'Quotation'),
    erpnext_name: name,
    financially_approved: false,
    protected_actions_executed: false,
  };
}

/**
 * Approved #882 Terms and Conditions HTML. REST create of Quotation with
 * `tc_name` alone does not copy this body onto the document.
 *
 * @param {ReturnType<typeof loadCommercialDocumentsConfig>} [config]
 * @returns {string}
 */
export function approvedCommercialTermsHtml(config = loadCommercialDocumentsConfig()) {
  return asString(config?.print?.terms_html);
}

export function syntheticDocumentsMustStayDraft(doc) {
  const status = asNumber(doc?.docstatus);
  const title = asString(doc?.title);
  const blockers = [];
  if (status !== 0) blockers.push('SYNTHETIC_DOC_NOT_DRAFT');
  if (title && !/TEST-ONLY|DO NOT SEND|DO NOT SUBMIT/i.test(title)) {
    blockers.push('SYNTHETIC_SENTINEL_MISSING');
  }
  return { ok: blockers.length === 0, blockers };
}
