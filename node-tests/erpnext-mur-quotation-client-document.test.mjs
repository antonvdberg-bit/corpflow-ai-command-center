/**
 * #1196 MUR quotation client-document acceptance.
 * Deterministic. Does not call live ERPNext. Never prints secrets.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { approvedCommercialTermsHtml } from '../lib/erpnext/commercial-documents.js';
import {
  assessMurQuotationClientDocument,
  CANONICAL_QUOTATION_NAME,
  CURRENT_MAIN_SHA,
  extractPdfTextForAcceptance,
  MUR_QUOTATION_CLIENT_DOCUMENT_READY,
  projectClientDocumentEvidence,
} from '../lib/erpnext/mur-quotation-client-document.js';
import { proofQuotationDocForName } from '../lib/erpnext/quotation-evidence.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel));
}

const company = {
  tax_id: '28466939',
  registration_details: 'Company No : C25228280',
  default_currency: 'MUR',
  email: 'finance@corpflowai.com',
  name: 'CorpFlowAI LTD',
};

const readyQuotation = {
  name: CANONICAL_QUOTATION_NAME,
  docstatus: 0,
  status: 'Draft',
  company: 'CorpFlowAI LTD',
  party_name: 'CF1018 Synthetic Sales Lifecycle Ltd',
  currency: 'MUR',
  conversion_rate: 1,
  grand_total: 45000,
  selling_price_list: 'Standard Selling',
  letter_head: 'Company Letterhead - Grey',
  tc_name: 'CF882 CorpFlowAI Commercial Terms',
  terms: approvedCommercialTermsHtml(),
  valid_till: '2026-09-09',
  items: [
    {
      item_code: 'CF-RD-LANDING-RESCUE',
      item_name: 'Premium Landing Page Rescue',
      description: 'Premium Landing Page Rescue (Website Rescue T1). A bounded landing-page rescue.',
      qty: 1,
      rate: 45000,
    },
  ],
};

test('#1196 current-main SHA and quotation identifier are pinned', () => {
  assert.equal(CANONICAL_QUOTATION_NAME, 'SAL-QTN-2026-00005');
  assert.equal(CURRENT_MAIN_SHA, 'b731411734edb01b7dbb8d7e20247c5a7805983a');
});

test('empty quotation.terms is the exact client-document blocker', () => {
  const assessment = assessMurQuotationClientDocument({
    company,
    quotation: { ...readyQuotation, terms: null },
    terms: { name: 'CF882 CorpFlowAI Commercial Terms', terms: approvedCommercialTermsHtml() },
    item: { item_code: 'CF-RD-LANDING-RESCUE', item_name: 'Premium Landing Page Rescue' },
    catalogueItem: { item_name: 'Premium Landing Page Rescue', commercial_description: readyQuotation.items[0].description },
    pdfText: 'CorpFlowAI LTD Valid Till 45,000 MUR Premium Landing Page Rescue',
    pdf: { ok: true, is_pdf: true, bytes: 36114, print_format: 'Quotation Standard' },
    matchingNames: [CANONICAL_QUOTATION_NAME],
  });
  assert.equal(assessment.ok, false);
  assert.equal(assessment.erpnext_mutated, false);
  assert.equal(assessment.tax_invented, false);
  assert.match(assessment.verdict, /^NOT READY — quotation\.terms empty on SAL-QTN-2026-00005/);
  assert.ok(assessment.blockers.includes('quotation_terms_present'));
});

test('populated terms plus printable identity reaches client-document READY', () => {
  const pdfText =
    'DRAFT CorpFlowAI LTD Valid Till Tax ID: 28466939 Company No: C25228280 finance@corpflowai.com MUR 45,000 Premium Landing Page Rescue Terms and Conditions Assumptions Exclusions';
  const assessment = assessMurQuotationClientDocument({
    company,
    quotation: readyQuotation,
    terms: { name: 'CF882 CorpFlowAI Commercial Terms', terms: approvedCommercialTermsHtml() },
    item: { item_code: 'CF-RD-LANDING-RESCUE', item_name: 'Premium Landing Page Rescue' },
    catalogueItem: { item_name: 'Premium Landing Page Rescue', commercial_description: readyQuotation.items[0].description },
    pdfText,
    pdf: { ok: true, is_pdf: true, bytes: 48000, print_format: 'Quotation Standard' },
    matchingNames: [CANONICAL_QUOTATION_NAME],
  });
  assert.equal(assessment.ok, true, assessment.blockers.join(','));
  assert.equal(assessment.verdict, MUR_QUOTATION_CLIENT_DOCUMENT_READY);
  assert.equal(assessment.duplicate_quotation_count, 1);
});

test('live archived PDF extract finds identity/amount/validity but not terms', () => {
  const bytes = read('artifacts/erpnext/selling-quote-to-cash-1056/cf1018-mur-SAL-QTN-2026-00005.pdf');
  const text = extractPdfTextForAcceptance(bytes);
  assert.match(text, /CorpFlowAI LTD/);
  assert.match(text, /SAL-QTN-2026-00005/);
  assert.match(text, /Valid Till/);
  assert.match(text, /45,000/);
  assert.match(text, /Premium Landing Page/);
  assert.doesNotMatch(text, /Terms and Conditions/);
  assert.doesNotMatch(text, /Assumptions/);
});

test('bounded client-document projection does not copy into Postgres', () => {
  const projected = projectClientDocumentEvidence(readyQuotation, { source: 'erpnext_get' });
  assert.equal(projected.name, CANONICAL_QUOTATION_NAME);
  assert.equal(projected.mutated, false);
  assert.equal(projected.copied_to_postgres, false);
  assert.equal(projected.tax_invented, false);
  assert.equal(projected.item_code, 'CF-RD-LANDING-RESCUE');
});

test('CF1018 proof fixture records live terms_present=false without inventing a second ledger', () => {
  const proof = proofQuotationDocForName(CANONICAL_QUOTATION_NAME);
  assert.equal(proof.name, CANONICAL_QUOTATION_NAME);
  assert.equal(proof.currency, 'MUR');
  assert.equal(proof.grand_total, 45000);
  assert.equal(proof.terms_present, false);
  assert.equal(proof.item_name, 'Premium Landing Page Rescue');
});

test('GET-only accept script never create/update/submit', () => {
  const src = readFileSync(path.join(REPO_ROOT, 'scripts/erpnext/accept-mur-quotation-client-document.mjs'), 'utf8');
  assert.match(src, /GET\/read-only/);
  assert.match(src, /CREATE forbidden/);
  assert.match(src, /UPDATE forbidden/);
  assert.doesNotMatch(src, /SECRETISH/);
});

test('live accept-log is GET-only, unique quotation, empty terms, no secrets', () => {
  const log = JSON.parse(readFileSync(path.join(REPO_ROOT, 'artifacts/erpnext/mur-quotation-client-document-1196/accept-log.json'), 'utf8'));
  assert.equal(log.quotation_name, CANONICAL_QUOTATION_NAME);
  assert.equal(log.current_main_sha, CURRENT_MAIN_SHA);
  assert.equal(log.erpnext_mutated, false);
  assert.equal(log.postgres_written, false);
  assert.deepEqual(log.methods, ['GET']);
  assert.equal(log.duplicate_quotation_count, 1);
  assert.equal(log.quotation.terms, null);
  assert.equal(log.pdf.bytes, 36114);
  assert.equal(log.pdf.sha256, '299ad3c9d8c4582a');
  assert.match(log.verdict, /^NOT READY — quotation\.terms empty on SAL-QTN-2026-00005/);
  const blob = JSON.stringify(log);
  assert.doesNotMatch(blob, /sk_live|eyJhbGci|postgres:\/\//i);
  assert.doesNotMatch(blob, /ERPNEXT_API_SECRET":\s*"[^"]+"/);
});
