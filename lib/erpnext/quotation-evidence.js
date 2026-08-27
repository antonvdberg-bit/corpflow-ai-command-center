/**
 * Bounded ERPNext Quotation evidence (#1160).
 *
 * GET/read-only. Reuses the WP1 Frappe REST client and standard print PDF.
 * Does not create, update, or submit Quotations, Sales Invoices, or Payment Entries.
 * Does not copy quotation rows into Postgres.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

export const QUOTATION_DOCTYPE = 'Quotation';
export const DEFAULT_PRINT_FORMAT = 'Quotation Standard';
const COMMERCIAL_DOCUMENTS_REL = 'config/erpnext-commercial-documents.v1.json';
const PRESTIGE_FOUNDATION_REL = 'config/erpnext-prestige-foundation.v1.json';
const SELLING_QUOTE_TO_CASH_REL = 'config/erpnext-selling-quote-to-cash.v1.json';

const STABLE_QUOTATION_NAME = /^[A-Z][A-Z0-9-]{2,63}$/;

const ALLOWED_EVIDENCE_KEYS = Object.freeze([
  'name',
  'doctype',
  'docstatus',
  'status',
  'currency',
  'grand_total',
  'customer',
  'party_name',
  'transaction_date',
  'valid_till',
  'print_format',
  'source',
  'mutated',
  'copied_to_postgres',
]);

function asTrimmed(v) {
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

function asDocstatus(v) {
  const n = asNumber(v);
  return n == null ? null : n;
}

function readJsonRel(rel, repoRoot = process.cwd()) {
  return JSON.parse(readFileSync(path.join(repoRoot, rel), 'utf8'));
}

function loadCommercialDocumentsConfig(repoRoot = process.cwd()) {
  return readJsonRel(COMMERCIAL_DOCUMENTS_REL, repoRoot);
}

function loadPrestigeFoundationConfig(repoRoot = process.cwd()) {
  return readJsonRel(PRESTIGE_FOUNDATION_REL, repoRoot);
}

function loadSellingQuoteToCashConfig(repoRoot = process.cwd()) {
  return readJsonRel(SELLING_QUOTE_TO_CASH_REL, repoRoot);
}

/**
 * Stable ERPNext Quotation name already recorded on the commercial rail.
 * Rejects path-like or freeform strings so this helper cannot be used as a
 * generic document proxy.
 *
 * @param {unknown} name
 * @returns {boolean}
 */
export function isStableQuotationName(name) {
  const value = asTrimmed(name);
  if (!value) return false;
  if (value.includes('/') || value.includes('\\') || value.includes('..')) return false;
  return STABLE_QUOTATION_NAME.test(value);
}

/**
 * Tiny synthetic PDF for proof-mode / tests. Not a live ERPNext print.
 * @param {string} [quotationName]
 * @returns {Buffer}
 */
export function syntheticProofPdfBytes(quotationName) {
  const name = asTrimmed(quotationName) || 'QUOTATION';
  const line = `TEST-ONLY DO NOT SEND ${name}`;
  const stream = `BT /F1 12 Tf 72 720 Td (${line.replace(/[()\\]/g, ' ')}) Tj ET\n`;
  const body = `%PDF-1.1
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj
4 0 obj<</Length ${stream.length}>>stream
${stream}endstream
endobj
trailer<</Root 1 0 R>>
%%EOF
`;
  return Buffer.from(body, 'utf8');
}

/**
 * Published synthetic quotation readbacks from #882 / #920 configs.
 * Used only when proof mode cannot call hosted ERPNext.
 *
 * @param {string} [repoRoot]
 * @returns {Record<string, Record<string, unknown>>}
 */
export function proofQuotationDocs(repoRoot) {
  const commercial = loadCommercialDocumentsConfig(repoRoot);
  const prestige = loadPrestigeFoundationConfig(repoRoot);
  const syn = commercial.synthetic_proof || {};
  const printFormat = asTrimmed(commercial.print?.quotation_format) || DEFAULT_PRINT_FORMAT;
  const prestigeProof = prestige.live_proof || {};
  /** @type {Record<string, Record<string, unknown>>} */
  const docs = {};
  const leadRescue = asTrimmed(syn.lead_rescue_quotation);
  if (leadRescue) {
    docs[leadRescue] = {
      name: leadRescue,
      doctype: QUOTATION_DOCTYPE,
      docstatus: asDocstatus(syn.docstatus_must_remain) ?? 0,
      status: 'Draft',
      currency: 'USD',
      grand_total: 249,
      customer: asTrimmed(syn.lead_rescue_customer),
      party_name: asTrimmed(syn.lead_rescue_customer),
      title: asTrimmed(syn.sentinel) || 'TEST-ONLY DO NOT SEND',
      print_format: printFormat,
    };
  }
  const websiteRescue = asTrimmed(syn.website_rescue_quotation);
  if (websiteRescue) {
    docs[websiteRescue] = {
      name: websiteRescue,
      doctype: QUOTATION_DOCTYPE,
      docstatus: asDocstatus(syn.docstatus_must_remain) ?? 0,
      status: 'Draft',
      currency: 'MUR',
      grand_total: 45000,
      customer: asTrimmed(syn.website_rescue_customer),
      party_name: asTrimmed(syn.website_rescue_customer),
      title: asTrimmed(syn.sentinel) || 'TEST-ONLY DO NOT SEND',
      print_format: printFormat,
    };
  }
  const prestigeName = asTrimmed(prestigeProof.quotation);
  if (prestigeName) {
    docs[prestigeName] = {
      name: prestigeName,
      doctype: QUOTATION_DOCTYPE,
      docstatus: asDocstatus(prestigeProof.quotation_docstatus) ?? 0,
      status: 'Draft',
      currency: asTrimmed(prestigeProof.quotation_currency) || 'MUR',
      grand_total: asNumber(prestigeProof.quotation_grand_total),
      customer: asTrimmed(prestigeProof.customer),
      party_name: asTrimmed(prestigeProof.customer),
      print_format: printFormat,
    };
  }
  const selling = loadSellingQuoteToCashConfig(repoRoot);
  const sellingProof = selling.live_proof || {};
  const sellingName = asTrimmed(sellingProof.erpnext_quotation);
  if (sellingName) {
    docs[sellingName] = {
      name: sellingName,
      doctype: QUOTATION_DOCTYPE,
      docstatus: asDocstatus(sellingProof.docstatus) ?? 0,
      status: 'Draft',
      currency: asTrimmed(sellingProof.currency) || 'MUR',
      grand_total: asNumber(sellingProof.grand_total),
      customer: asTrimmed(sellingProof.customer),
      party_name: asTrimmed(sellingProof.customer),
      print_format: asTrimmed(selling.quotation?.print_format) || printFormat,
    };
  }
  return docs;
}

/**
 * @param {unknown} name
 * @param {string} [repoRoot]
 * @returns {Record<string, unknown> | null}
 */
export function proofQuotationDocForName(name, repoRoot) {
  const id = asTrimmed(name);
  if (!isStableQuotationName(id)) return null;
  return proofQuotationDocs(repoRoot)[id] || null;
}

/**
 * @param {Record<string, unknown> | null | undefined} doc
 * @param {{ source?: string, print_format?: string }} [extra]
 * @returns {Record<string, unknown>}
 */
export function projectBoundedQuotationEvidence(doc, extra = {}) {
  const row = doc && typeof doc === 'object' && !Array.isArray(doc) ? doc : {};
  const name = asTrimmed(row.name);
  const customer = asTrimmed(row.customer || row.party_name);
  const projected = {
    name: name || null,
    doctype: asTrimmed(row.doctype) || QUOTATION_DOCTYPE,
    docstatus: asDocstatus(row.docstatus),
    status: asTrimmed(row.status) || null,
    currency: asTrimmed(row.currency) || null,
    grand_total: asNumber(row.grand_total),
    customer: customer || null,
    party_name: asTrimmed(row.party_name) || customer || null,
    transaction_date: asTrimmed(row.transaction_date) || null,
    valid_till: asTrimmed(row.valid_till) || null,
    print_format: asTrimmed(extra.print_format || row.print_format) || DEFAULT_PRINT_FORMAT,
    source: asTrimmed(extra.source) || 'erpnext_get',
    mutated: false,
    copied_to_postgres: false,
  };
  for (const key of Object.keys(projected)) {
    if (!ALLOWED_EVIDENCE_KEYS.includes(key)) delete projected[key];
  }
  return projected;
}

/**
 * GET one Quotation. Never writes.
 *
 * @param {{
 *   client: { get: Function, create?: Function, update?: Function },
 *   name: string,
 *   printFormat?: string,
 * }} args
 */
export async function readQuotationEvidence(args) {
  const name = asTrimmed(args?.name);
  if (!isStableQuotationName(name)) {
    return { ok: false, error: 'quotation_reference_invalid', http: 0, evidence: null };
  }
  const client = args?.client;
  if (!client || typeof client.get !== 'function') {
    return { ok: false, error: 'erpnext_read_unavailable', http: 0, evidence: null };
  }
  const result = await client.get(QUOTATION_DOCTYPE, name);
  if (!result?.ok || !result.row) {
    return {
      ok: false,
      error: asTrimmed(result?.error) || 'quotation_not_found',
      http: Number(result?.http) || 0,
      evidence: null,
    };
  }
  return {
    ok: true,
    error: null,
    http: Number(result.http) || 200,
    evidence: projectBoundedQuotationEvidence(result.row, {
      source: 'erpnext_get',
      print_format: args.printFormat,
    }),
  };
}

/**
 * GET printable PDF. Never writes.
 *
 * @param {{
 *   client: { downloadPdf?: Function },
 *   name: string,
 *   printFormat?: string,
 * }} args
 */
export async function readQuotationPdf(args) {
  const name = asTrimmed(args?.name);
  const printFormat = asTrimmed(args?.printFormat) || DEFAULT_PRINT_FORMAT;
  if (!isStableQuotationName(name)) {
    return { ok: false, error: 'quotation_reference_invalid', http: 0, bytes: Buffer.alloc(0), isPdf: false };
  }
  const client = args?.client;
  if (!client || typeof client.downloadPdf !== 'function') {
    return { ok: false, error: 'erpnext_print_unavailable', http: 0, bytes: Buffer.alloc(0), isPdf: false };
  }
  const result = await client.downloadPdf(QUOTATION_DOCTYPE, name, printFormat);
  return {
    ok: result?.ok === true && result?.isPdf === true,
    error: result?.ok && result?.isPdf ? null : asTrimmed(result?.error) || 'print_failed',
    http: Number(result?.http) || 0,
    bytes: Buffer.isBuffer(result?.bytes) ? result.bytes : Buffer.alloc(0),
    isPdf: result?.isPdf === true,
    print_format: printFormat,
  };
}

export function defaultPrintFormat(repoRoot) {
  const commercial = loadCommercialDocumentsConfig(repoRoot);
  return asTrimmed(commercial.print?.quotation_format) || DEFAULT_PRINT_FORMAT;
}
