/**
 * #1196 client-document acceptance for the existing synthetic MUR quotation.
 *
 * GET/read-only assessment only. Does not create, update, submit, send,
 * post accounting truth, invent tax/payment/acceptance, or copy into Postgres.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

import { companyIdentityIsAuthoritative } from './commercial-documents.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../..');
const SELLING_REL = 'config/erpnext-selling-quote-to-cash.v1.json';

export const MUR_QUOTATION_CLIENT_DOCUMENT_READY = 'ERPNext MUR QUOTATION CLIENT-DOCUMENT READY';
export const CANONICAL_QUOTATION_NAME = 'SAL-QTN-2026-00005';
export const CURRENT_MAIN_SHA = 'b731411734edb01b7dbb8d7e20247c5a7805983a';

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

function loadJsonRel(rel, repoRoot = REPO_ROOT) {
  return JSON.parse(readFileSync(path.join(repoRoot, rel), 'utf8'));
}

export function loadSellingQuoteToCashConfig(repoRoot = REPO_ROOT) {
  return loadJsonRel(SELLING_REL, repoRoot);
}

function firstItem(quotation) {
  const items = Array.isArray(quotation?.items) ? quotation.items : [];
  return items[0] && typeof items[0] === 'object' ? items[0] : {};
}

function stripHtml(value) {
  return asString(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function pdfObjectBodies(latin) {
  /** @type {Map<string, string>} */
  const objects = new Map();
  const re = /(\d+)\s+0\s+obj\s*([\s\S]*?)endobj/g;
  let match;
  while ((match = re.exec(latin))) {
    objects.set(match[1], match[2]);
  }
  return objects;
}

function pdfStreamPayload(body) {
  const match = asString(body).match(/stream\r?\n([\s\S]*?)\r?\nendstream/);
  if (!match) return '';
  const raw = Buffer.from(match[1], 'latin1');
  if (/\/Filter\s*\/FlateDecode/.test(body)) {
    try {
      return inflateSync(raw).toString('latin1');
    } catch {
      try {
        return inflateSync(raw).toString('utf8');
      } catch {
        return '';
      }
    }
  }
  return match[1];
}

function parseHexCode(hex) {
  const cleaned = asString(hex).replace(/[^0-9A-Fa-f]/g, '');
  if (!cleaned) return 0;
  return parseInt(cleaned, 16);
}

function hexToUtf16(hex) {
  const cleaned = asString(hex).replace(/[^0-9A-Fa-f]/g, '');
  if (!cleaned) return '';
  let out = '';
  for (let i = 0; i + 3 < cleaned.length; i += 4) {
    out += String.fromCharCode(parseInt(cleaned.slice(i, i + 4), 16));
  }
  return out;
}

/**
 * @param {string} cmap
 * @returns {Map<number, string>}
 */
function parseToUnicodeCMap(cmap) {
  /** @type {Map<number, string>} */
  const map = new Map();
  const text = asString(cmap);
  const rangeRe = /(\d+)\s+beginbfrange([\s\S]*?)endbfrange/g;
  let block;
  while ((block = rangeRe.exec(text))) {
    const body = block[2];
    const arrayRange = /<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>\s+\[([^\]]+)\]/g;
    let row;
    while ((row = arrayRange.exec(body))) {
      let cid = parseHexCode(row[1]);
      const dests = row[3].match(/<([0-9A-Fa-f]+)>/g) || [];
      for (const dest of dests) {
        map.set(cid, hexToUtf16(dest));
        cid += 1;
      }
    }
    const simpleRange = /<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>/g;
    while ((row = simpleRange.exec(body))) {
      const start = parseHexCode(row[1]);
      const end = parseHexCode(row[2]);
      let dest = parseHexCode(row[3]);
      for (let cid = start; cid <= end; cid += 1) {
        map.set(cid, String.fromCharCode(dest));
        dest += 1;
      }
    }
  }
  const charRe = /(\d+)\s+beginbfchar([\s\S]*?)endbfchar/g;
  while ((block = charRe.exec(text))) {
    const pair = /<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>/g;
    let row;
    while ((row = pair.exec(block[2]))) {
      map.set(parseHexCode(row[1]), hexToUtf16(row[2]));
    }
  }
  return map;
}

/**
 * Bounded PDF text extract for acceptance checks. Handles ERPNext/wkhtmltopdf
 * Identity-H CID fonts via ToUnicode CMaps. Not a general PDF toolkit.
 *
 * @param {Buffer | string} bytes
 * @returns {string}
 */
export function extractPdfTextForAcceptance(bytes) {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes || '', 'utf8');
  if (buf.length < 5 || buf.subarray(0, 5).toString('utf8') !== '%PDF-') return '';
  const latin = buf.toString('latin1');
  const objects = pdfObjectBodies(latin);

  /** @type {Map<string, Map<number, string>>} */
  const fontCmaps = new Map();
  for (const body of objects.values()) {
    if (!/\/Type\s*\/Font/.test(body) || !/\/ToUnicode\s+\d+/.test(body)) continue;
    const fontNames = [...body.matchAll(/\/(F\d+)\s+\d+\s+0\s+R/g)].map((row) => row[1]);
    const toUnicodeId = (body.match(/\/ToUnicode\s+(\d+)/) || [])[1];
    if (!toUnicodeId) continue;
    const cmap = parseToUnicodeCMap(pdfStreamPayload(objects.get(toUnicodeId) || ''));
    const names = fontNames.length ? fontNames : [];
    if (!names.length) {
      const selfName = (latin.slice(0, latin.indexOf(body)).match(/\/(F\d+)\s+\d+\s+0\s+R/g) || []).pop();
      if (selfName) names.push(selfName.replace(/\/(\w+)\s+\d+\s+0\s+R/, '$1').replace('/', ''));
    }
    for (const name of names) fontCmaps.set(name, cmap);
    fontCmaps.set(`obj:${toUnicodeId}`, cmap);
  }

  // Page resource fonts: /F6 9 0 R inside /Font << ... >>
  for (const body of objects.values()) {
    const fontDict = body.match(/\/Font\s*<<([\s\S]*?)>>/);
    if (!fontDict) continue;
    const refs = [...fontDict[1].matchAll(/\/(F\d+)\s+(\d+)\s+0\s+R/g)];
    for (const ref of refs) {
      const fontBody = objects.get(ref[2]) || '';
      const toUnicodeId = (fontBody.match(/\/ToUnicode\s+(\d+)/) || [])[1];
      if (!toUnicodeId) continue;
      fontCmaps.set(ref[1], parseToUnicodeCMap(pdfStreamPayload(objects.get(toUnicodeId) || '')));
    }
  }

  const contents = [];
  for (const body of objects.values()) {
    if (!/\/Filter\s*\/FlateDecode/.test(body)) continue;
    const payload = pdfStreamPayload(body);
    if (/\bBT\b/.test(payload) && /Tj/.test(payload)) contents.push(payload);
  }

  const chunks = [];
  for (const content of contents) {
    let current = /** @type {Map<number, string> | null} */ (null);
    const tokens = content.match(/\/F\d+|<[0-9A-Fa-f]+>\s*Tj|BT|ET/g) || [];
    for (const token of tokens) {
      if (token.startsWith('/F')) {
        current = fontCmaps.get(token.slice(1)) || current;
        continue;
      }
      const hex = (token.match(/<([0-9A-Fa-f]+)>/) || [])[1];
      if (!hex || !current) continue;
      for (let i = 0; i + 3 < hex.length; i += 4) {
        const cid = parseInt(hex.slice(i, i + 4), 16);
        chunks.push(current.get(cid) || '');
      }
    }
  }

  const joined = chunks
    .join('')
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/\s+/g, ' ')
    .trim();
  return joined.slice(0, 20000);
}

function pdfHas(text, needle) {
  const hay = asString(text).toLowerCase().replace(/ﬂ/g, 'fl').replace(/ﬁ/g, 'fi');
  return hay.includes(asString(needle).toLowerCase());
}

/**
 * Project the fields required to accept a MUR quotation as a client document.
 * Still GET-shaped. Never copies into Postgres.
 *
 * @param {Record<string, unknown> | null | undefined} quotation
 * @param {{ company?: Record<string, unknown> | null, print_format?: string, source?: string }} [extra]
 */
export function projectClientDocumentEvidence(quotation, extra = {}) {
  const row = quotation && typeof quotation === 'object' ? quotation : {};
  const item = firstItem(row);
  const company = extra.company && typeof extra.company === 'object' ? extra.company : {};
  return {
    name: asString(row.name) || null,
    doctype: asString(row.doctype) || 'Quotation',
    docstatus: asNumber(row.docstatus),
    status: asString(row.status) || null,
    company: asString(row.company || company.name) || null,
    customer: asString(row.customer || row.party_name) || null,
    party_name: asString(row.party_name || row.customer_name) || null,
    currency: asString(row.currency) || null,
    conversion_rate: asNumber(row.conversion_rate),
    grand_total: asNumber(row.grand_total),
    transaction_date: asString(row.transaction_date) || null,
    valid_till: asString(row.valid_till) || null,
    tc_name: asString(row.tc_name) || null,
    letter_head: asString(row.letter_head) || null,
    item_code: asString(item.item_code) || null,
    item_name: asString(item.item_name) || null,
    description: stripHtml(item.description) || null,
    print_format: asString(extra.print_format || row.print_format) || 'Quotation Standard',
    source: asString(extra.source) || 'erpnext_get',
    mutated: false,
    copied_to_postgres: false,
    tax_invented: false,
    payment_status_invented: false,
    acceptance_status_invented: false,
  };
}

/**
 * @param {{
 *   company?: Record<string, unknown> | null,
 *   quotation?: Record<string, unknown> | null,
 *   terms?: Record<string, unknown> | null,
 *   item?: Record<string, unknown> | null,
 *   catalogueItem?: Record<string, unknown> | null,
 *   pdfText?: string,
 *   pdf?: { ok?: boolean, bytes?: number, is_pdf?: boolean, print_format?: string, error?: string | null },
 *   matchingNames?: string[],
 *   commercialConfig?: Record<string, unknown>,
 *   sellingConfig?: Record<string, unknown>,
 * }} args
 */
export function assessMurQuotationClientDocument(args = {}) {
  const selling = args.sellingConfig && typeof args.sellingConfig === 'object' ? args.sellingConfig : {};
  const commercial =
    args.commercialConfig && typeof args.commercialConfig === 'object' && args.commercialConfig.company
      ? args.commercialConfig
      : undefined;
  const quotation = args.quotation && typeof args.quotation === 'object' ? args.quotation : {};
  const company = args.company && typeof args.company === 'object' ? args.company : {};
  const terms = args.terms && typeof args.terms === 'object' ? args.terms : {};
  const item = args.item && typeof args.item === 'object' ? args.item : {};
  const catalogue = args.catalogueItem && typeof args.catalogueItem === 'object' ? args.catalogueItem : {};
  const pdf = args.pdf && typeof args.pdf === 'object' ? args.pdf : {};
  const pdfText = asString(args.pdfText);
  const matchingNames = Array.isArray(args.matchingNames) ? args.matchingNames.map(asString).filter(Boolean) : [];

  const expectedName = asString(selling.live_proof?.erpnext_quotation) || CANONICAL_QUOTATION_NAME;
  const expectedItem = asString(selling.item?.item_code) || 'CF-RD-LANDING-RESCUE';
  const expectedRate = asNumber(selling.item?.expected_rate_mur) ?? 45000;
  const expectedTerms = asString(selling.quotation?.terms_name) || 'CF882 CorpFlowAI Commercial Terms';
  const expectedLetterHead = asString(selling.quotation?.letter_head) || 'Company Letterhead - Grey';
  const expectedPrint = asString(selling.quotation?.print_format) || 'Quotation Standard';
  const expectedItemName = asString(catalogue.item_name) || asString(item.item_name) || 'Premium Landing Page Rescue';
  const commercialDescription = stripHtml(catalogue.commercial_description || item.description);
  const line = firstItem(quotation);
  const lineDescription = stripHtml(line.description || line.item_name);
  const termsBody = stripHtml(terms.terms || quotation.terms);

  const checks = [];
  const blockers = [];

  function check(id, ok, detail) {
    checks.push({ id, ok: ok === true, detail: asString(detail) });
    if (ok !== true) blockers.push(id);
  }

  check('quotation_name', asString(quotation.name) === expectedName, asString(quotation.name) || 'missing');
  check('docstatus_draft', asNumber(quotation.docstatus) === 0, String(quotation.docstatus ?? 'missing'));
  check('status_not_invented_as_accepted', !/accepted|ordered|paid/i.test(asString(quotation.status)), asString(quotation.status));
  check('currency_mur', asString(quotation.currency) === 'MUR', asString(quotation.currency));
  check('amount_45000', asNumber(quotation.grand_total) === expectedRate, String(quotation.grand_total ?? 'missing'));
  check('conversion_rate_one', asNumber(quotation.conversion_rate) === 1, String(quotation.conversion_rate ?? 'missing'));
  check('item_code', asString(line.item_code) === expectedItem, asString(line.item_code));
  check(
    'item_name',
    asString(line.item_name) === expectedItemName || asString(item.item_name) === expectedItemName,
    asString(line.item_name || item.item_name),
  );
  check(
    'line_description',
    Boolean(lineDescription) &&
      (lineDescription.includes(expectedItemName) ||
        (commercialDescription && lineDescription.includes(commercialDescription.slice(0, 24)))),
    lineDescription.slice(0, 180),
  );
  check('terms_name', asString(quotation.tc_name) === expectedTerms, asString(quotation.tc_name));
  check(
    'quotation_terms_present',
    Boolean(stripHtml(quotation.terms)),
    stripHtml(quotation.terms) ? 'terms present on quotation' : 'terms body empty on quotation',
  );
  check(
    'terms_body',
    /validity/i.test(termsBody) && /assumptions/i.test(termsBody) && /exclusions/i.test(termsBody) && /scope/i.test(termsBody),
    termsBody ? 'terms master present' : 'terms master missing',
  );
  check('valid_till', Boolean(asString(quotation.valid_till)), asString(quotation.valid_till) || 'missing');
  check('letter_head', asString(quotation.letter_head) === expectedLetterHead, asString(quotation.letter_head));
  check('no_tax_template', !asString(quotation.taxes_and_charges), asString(quotation.taxes_and_charges) || 'none');
  check(
    'no_tax_rows',
    !Array.isArray(quotation.taxes) || quotation.taxes.length === 0,
    Array.isArray(quotation.taxes) ? String(quotation.taxes.length) : 'none',
  );

  const identity = companyIdentityIsAuthoritative(company, commercial);
  check('company_identity', identity.ok === true, (identity.blockers || []).join(',') || 'ok');

  check('pdf_ok', pdf.ok === true && pdf.is_pdf === true, pdf.error || `${pdf.bytes || 0} bytes`);
  check('pdf_print_format', !pdf.print_format || asString(pdf.print_format) === expectedPrint, asString(pdf.print_format));
  check('pdf_identity_company', pdfHas(pdfText, 'CorpFlowAI LTD'), 'CorpFlowAI LTD');
  check('pdf_identity_tax', pdfHas(pdfText, '28466939'), '28466939');
  check('pdf_identity_company_no', pdfHas(pdfText, 'C25228280'), 'C25228280');
  check('pdf_identity_email', pdfHas(pdfText, 'finance@corpflowai.com'), 'finance@corpflowai.com');
  check('pdf_amount', pdfHas(pdfText, '45,000') || pdfHas(pdfText, '45000'), '45000');
  check('pdf_currency', pdfHas(pdfText, 'MUR') || pdfHas(pdfText, '₨'), asString(quotation.currency));
  check('pdf_item', pdfHas(pdfText, 'Premium Landing Page'), expectedItemName);
  check('pdf_terms', pdfHas(pdfText, 'Terms and Conditions') && pdfHas(pdfText, 'Assumptions') && pdfHas(pdfText, 'Exclusions'), 'terms');
  check('pdf_validity', pdfHas(pdfText, 'Valid Till') || pdfHas(pdfText, 'Validity'), asString(quotation.valid_till));
  check('idempotent_single_quotation', matchingNames.length === 1 && matchingNames[0] === expectedName, matchingNames.join(',') || 'none');

  const preferred = ['quotation_terms_present', 'pdf_terms', 'pdf_identity_tax'];
  const exactId = preferred.find((id) => blockers.includes(id)) || blockers[0] || null;
  const exactLabels = {
    quotation_terms_present:
      'quotation.terms empty on SAL-QTN-2026-00005 (Quotation Standard PDF omits CF882 terms/seller identity)',
    pdf_terms: 'Quotation Standard PDF omits CF882 terms/assumptions/exclusions',
    pdf_identity_tax: 'printable PDF omits Tax ID 28466939',
  };
  const exactBlocker = exactId ? exactLabels[exactId] || exactId : null;
  const ok = blockers.length === 0;
  return {
    ok,
    quotation_name: asString(quotation.name) || expectedName,
    current_main_sha: CURRENT_MAIN_SHA,
    company_identity_ok: identity.ok === true,
    duplicate_quotation_count: matchingNames.length,
    tax_invented: false,
    payment_status_invented: false,
    acceptance_status_invented: false,
    erpnext_mutated: false,
    checks,
    blockers,
    exact_blocker: exactBlocker,
    verdict: ok ? MUR_QUOTATION_CLIENT_DOCUMENT_READY : `NOT READY — ${exactBlocker}`,
  };
}
