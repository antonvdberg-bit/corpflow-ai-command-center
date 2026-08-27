#!/usr/bin/env node
/**
 * #1196 GET/read-only acceptance of synthetic MUR quotation SAL-QTN-2026-00005.
 *
 * Reuses the WP1 Frappe REST client. Never create/update/submit. Never send.
 * Does not write Postgres. Does not print secrets or the ERPNext base URL.
 *
 * Usage:
 *   node scripts/erpnext/accept-mur-quotation-client-document.mjs
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { companyIdentityIsAuthoritative, loadCommercialDocumentsConfig } from '../../lib/erpnext/commercial-documents.js';
import { frappeClientFromEnv } from '../../lib/erpnext/frappe-rest-client.js';
import { getCatalogueItem } from '../../lib/erpnext/product-catalogue.js';
import {
  assessMurQuotationClientDocument,
  extractPdfTextForAcceptance,
  loadSellingQuoteToCashConfig,
} from '../../lib/erpnext/mur-quotation-client-document.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const ARTIFACT_DIR = path.join(ROOT, 'artifacts', 'erpnext', 'mur-quotation-client-document-1196');
const QUOTATION_NAME = 'SAL-QTN-2026-00005';

function log(msg) {
  console.log(String(msg));
}

function presence(name) {
  const value = process.env[name];
  return value && String(value).trim() ? 'present' : 'absent';
}

function wrapReadOnly(client) {
  return {
    kind: 'frappe-rest-readonly',
    getLoggedUser: (...args) => client.getLoggedUser(...args),
    get: (...args) => client.get(...args),
    list: (...args) => client.list(...args),
    downloadPdf: (...args) => client.downloadPdf(...args),
    async create() {
      throw new Error('ERPNext CREATE forbidden by #1196 read-only packet');
    },
    async update() {
      throw new Error('ERPNext UPDATE forbidden by #1196 read-only packet');
    },
  };
}

function pickCompany(row) {
  if (!row || typeof row !== 'object') return {};
  return {
    name: row.name || null,
    tax_id: row.tax_id || null,
    registration_details: row.registration_details || null,
    default_currency: row.default_currency || null,
    email: row.email || null,
    website: row.website || null,
    default_letter_head: row.default_letter_head || null,
    company_description: row.company_description || null,
  };
}

function pickQuotation(row) {
  const items = Array.isArray(row?.items) ? row.items : [];
  const first = items[0] || {};
  return {
    name: row?.name || null,
    docstatus: row?.docstatus ?? null,
    status: row?.status || null,
    company: row?.company || null,
    party_name: row?.party_name || row?.customer_name || null,
    currency: row?.currency || null,
    conversion_rate: row?.conversion_rate ?? null,
    grand_total: row?.grand_total ?? null,
    selling_price_list: row?.selling_price_list || null,
    letter_head: row?.letter_head || null,
    tc_name: row?.tc_name || null,
    terms: typeof row?.terms === 'string' ? row.terms : null,
    valid_till: row?.valid_till || null,
    transaction_date: row?.transaction_date || null,
    title: row?.title || null,
    customer_notes: row?.customer_notes || null,
    opportunity: row?.opportunity || null,
    taxes_and_charges: row?.taxes_and_charges || null,
    tax_count: Array.isArray(row?.taxes) ? row.taxes.length : 0,
    item_code: first.item_code || null,
    item_name: first.item_name || null,
    description: first.description || null,
    qty: first.qty ?? null,
    uom: first.uom || first.stock_uom || null,
    rate: first.rate ?? null,
    item_count: items.length,
  };
}

function pickTerms(row) {
  return {
    name: row?.name || null,
    title: row?.title || null,
    terms: typeof row?.terms === 'string' ? row.terms : null,
  };
}

function pickItem(row) {
  return {
    name: row?.name || null,
    item_code: row?.item_code || null,
    item_name: row?.item_name || null,
    description: row?.description || null,
    standard_rate: row?.standard_rate ?? null,
    stock_uom: row?.stock_uom || null,
  };
}

log('ERPNext MUR quotation client-document acceptance (#1196)');
log('mode: GET/read-only (no create, update, submit, send, payment, schema)');
log(`quotation: ${QUOTATION_NAME}`);
log(`ERPNEXT_BASE_URL: ${presence('ERPNEXT_BASE_URL')}`);
log(`ERPNEXT_API_KEY: ${presence('ERPNEXT_API_KEY')}`);
log(`ERPNEXT_API_SECRET: ${presence('ERPNEXT_API_SECRET')}`);
log(`MASTER_ADMIN_KEY: ${presence('MASTER_ADMIN_KEY')} (must not be used)`);
log(`POSTGRES_URL: ${presence('POSTGRES_URL')} (must not be written)`);
log('ERPNEXT_BASE_URL_value: not_printed');

const missing = ['ERPNEXT_BASE_URL', 'ERPNEXT_API_KEY', 'ERPNEXT_API_SECRET'].filter(
  (name) => !process.env[name] || !String(process.env[name]).trim(),
);
if (missing.length) {
  log(`NOT READY — missing injected secrets: ${missing.join(' ')}`);
  process.exit(1);
}

let raw;
try {
  raw = frappeClientFromEnv(process.env);
} catch {
  log('NOT READY — Frappe client could not be constructed from named secrets');
  process.exit(1);
}
const client = wrapReadOnly(raw);

const auth = await client.getLoggedUser();
log(`authenticated_user: ${auth.user || 'unread'}`);
log(`http_auth_status: ${auth.http}`);
if (!auth.ok || auth.user !== 'integrations@corpflowai.com') {
  log('NOT READY — authentication failed');
  process.exit(1);
}

const cfg = loadSellingQuoteToCashConfig(ROOT);
const commercialCfg = loadCommercialDocumentsConfig(ROOT);
const catalogueItem = getCatalogueItem(cfg.item.item_code, ROOT);

const company = await client.get('Company', cfg.company);
const quotation = await client.get('Quotation', QUOTATION_NAME);
if (!quotation.ok || !quotation.row) {
  log(`NOT READY — quotation GET failed http=${quotation.http}`);
  process.exit(1);
}
const terms = await client.get('Terms and Conditions', cfg.quotation.terms_name);
const item = await client.get('Item', cfg.item.item_code);
const listed = await client.list('Quotation', {
  fields: ['name', 'title', 'party_name', 'currency', 'grand_total', 'docstatus', 'status'],
  filters: [
    ['party_name', '=', cfg.upstream_wp2.customer],
    ['currency', '=', cfg.primary_currency],
  ],
  limit: 50,
});

const pdf = await client.downloadPdf('Quotation', QUOTATION_NAME, cfg.quotation.print_format);
mkdirSync(ARTIFACT_DIR, { recursive: true });

let pdfMeta = { ok: false, bytes: 0, is_pdf: false, sha256: null, outfile: null, print_format: cfg.quotation.print_format, error: 'not_attempted' };
let pdfText = '';
if (pdf.ok && pdf.isPdf) {
  const outfile = path.join(ARTIFACT_DIR, `cf1018-mur-${QUOTATION_NAME}.pdf`);
  writeFileSync(outfile, pdf.bytes);
  pdfText = extractPdfTextForAcceptance(pdf.bytes);
  pdfMeta = {
    ok: true,
    bytes: pdf.bytes.length,
    is_pdf: true,
    sha256: createHash('sha256').update(pdf.bytes).digest('hex').slice(0, 16),
    outfile: path.relative(ROOT, outfile),
    print_format: cfg.quotation.print_format,
    error: null,
  };
  writeFileSync(path.join(ARTIFACT_DIR, 'pdf-text-extract.txt'), `${pdfText}\n`);
} else {
  pdfMeta = {
    ok: false,
    bytes: 0,
    is_pdf: false,
    sha256: null,
    outfile: null,
    print_format: cfg.quotation.print_format,
    error: pdf.error || 'PDF_FAILED',
  };
}

const matchingNames = (listed.rows || [])
  .filter((row) => String(row?.title || '').includes('corpflow.selling_q2c.v1:lead=cf1018-synthetic-sales-lifecycle'))
  .map((row) => row.name);

const assessment = assessMurQuotationClientDocument({
  company: company.row,
  quotation: quotation.row,
  terms: terms.row,
  item: item.row,
  catalogueItem,
  pdfText,
  pdf: pdfMeta,
  matchingNames,
  commercialConfig: commercialCfg,
  sellingConfig: cfg,
});

const evidence = {
  schema: 'corpflow.erpnext.mur_quotation_client_document_accept.v1',
  issue: 1196,
  generated_at_utc: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  current_main_sha: 'b731411734edb01b7dbb8d7e20247c5a7805983a',
  identity: auth.user,
  secrets_printed: false,
  postgres_written: false,
  erpnext_mutated: false,
  sales_invoice_created: false,
  payment_entry_created: false,
  taxes_invented: false,
  methods: ['GET'],
  quotation_name: QUOTATION_NAME,
  http: {
    company: company.http,
    quotation: quotation.http,
    terms: terms.http,
    item: item.http,
    list: listed.http,
    pdf: pdf.http,
  },
  company: pickCompany(company.row),
  quotation: pickQuotation(quotation.row),
  terms: pickTerms(terms.row),
  item: pickItem(item.row),
  duplicate_quotation_names: matchingNames,
  duplicate_quotation_count: matchingNames.length,
  pdf: pdfMeta,
  assessment,
  verdict: assessment.verdict,
};

writeFileSync(path.join(ARTIFACT_DIR, 'accept-log.json'), `${JSON.stringify(evidence, null, 2)}\n`);

log(`quotation_get: http=${quotation.http} name=${quotation.row?.name || 'none'} docstatus=${quotation.row?.docstatus}`);
log(`company_identity_ok: ${assessment.company_identity_ok}`);
log(`duplicate_quotation_count: ${matchingNames.length}`);
log(`pdf: ok=${pdfMeta.ok} bytes=${pdfMeta.bytes} sha256=${pdfMeta.sha256 || 'none'}`);
log(`erpnext_mutated: false`);
log(`postgres_written: false`);
log(`verdict: ${assessment.verdict}`);
if (assessment.exact_blocker) log(`exact_blocker: ${assessment.exact_blocker}`);
process.exit(0);
