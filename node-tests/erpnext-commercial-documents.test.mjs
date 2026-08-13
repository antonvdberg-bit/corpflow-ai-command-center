/**
 * Deterministic #882 commercial-document invariants.
 * Does not call live ERPNext. Never prints secrets.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  companyIdentityIsAuthoritative,
  conversionRateIsSafe,
  foreignCurrencyReadiness,
  loadCommercialDocumentsConfig,
  resetCommercialDocumentsConfigCache,
  syntheticDocumentsMustStayDraft,
  toCommercialRailProposalStub,
} from '../lib/erpnext/commercial-documents.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

test('config names synthetic masters and the FX blocker', () => {
  resetCommercialDocumentsConfigCache();
  const cfg = loadCommercialDocumentsConfig(REPO_ROOT);
  assert.equal(cfg.issue, 882);
  assert.equal(cfg.company.default_currency, 'MUR');
  assert.equal(cfg.company.tax_id, '28466939');
  assert.match(cfg.company.registration_details, /C25228280/);
  assert.equal(cfg.company.commercial_email, 'finance@corpflowai.com');
  assert.equal(cfg.synthetic_proof.lead_rescue_quotation, 'SAL-QTN-2026-00001');
  assert.equal(cfg.synthetic_proof.website_rescue_quotation, 'SAL-QTN-2026-00003');
  assert.equal(cfg.synthetic_proof.website_rescue_invoice_draft, 'ACC-SINV-2026-00001');
  assert.equal(cfg.synthetic_proof.lead_rescue_usd_invoice_draft, 'ACC-SINV-2026-00002');
  assert.equal(cfg.approval_rail.erpnext_never_sets_financially_approved, true);
  assert.match(cfg.verdict, /READY/);
  assert.equal(cfg.currency.currency_exchange_rows[0].exchange_rate, 47.15);
  assert.equal(cfg.currency.usd_receivable_account, 'Debtors USD - CFAI');
});

test('authoritative company identity rejects short-form 228280 as tax_id', () => {
  const ok = companyIdentityIsAuthoritative({
    tax_id: '28466939',
    registration_details: 'Company No : C25228280',
    default_currency: 'MUR',
    email: 'finance@corpflowai.com',
  });
  assert.equal(ok.ok, true);
  const bad = companyIdentityIsAuthoritative({
    tax_id: '228280',
    registration_details: 'Company No : C25228280',
    default_currency: 'MUR',
    email: 'finance@corpflowai.com',
  });
  assert.equal(bad.ok, false);
  assert.ok(bad.blockers.includes('TAX_ID_MISMATCH'));
  assert.ok(bad.blockers.includes('SHORT_FORM_USED_AS_TAX_ID'));
});

test('MUR documents accept conversion_rate 1; USD at 1.0 is unsafe', () => {
  assert.equal(conversionRateIsSafe({ currency: 'MUR', conversion_rate: 1 }, 'MUR').ok, true);
  const usd = conversionRateIsSafe({ currency: 'USD', conversion_rate: 1 }, 'MUR');
  assert.equal(usd.ok, false);
  assert.ok(usd.blockers.includes('UNSAFE_ONE_TO_ONE_FX'));
  const missing = conversionRateIsSafe({ currency: 'USD' }, 'MUR');
  assert.equal(missing.ok, false);
  assert.ok(missing.blockers.includes('MISSING_EXCHANGE_RATE'));
  assert.equal(
    conversionRateIsSafe({ currency: 'USD', conversion_rate: 45.2 }, 'MUR').ok,
    true,
  );
});

test('GBP/AUD/AED reuse enabled-currency + price list + exchange pattern', () => {
  const gbp = foreignCurrencyReadiness({
    currency: 'GBP',
    enabledCurrencies: ['MUR', 'USD', 'GBP', 'AUD', 'AED'],
    hasSellingPriceList: false,
    hasCurrencyExchangeToBase: false,
  });
  assert.equal(gbp.ok, false);
  assert.ok(gbp.blockers.includes('MISSING_SELLING_PRICE_LIST'));
  assert.ok(gbp.blockers.includes('MISSING_CURRENCY_EXCHANGE'));
  const ready = foreignCurrencyReadiness({
    currency: 'AED',
    enabledCurrencies: ['MUR', 'USD', 'GBP', 'AUD', 'AED'],
    hasSellingPriceList: true,
    hasCurrencyExchangeToBase: true,
  });
  assert.equal(ready.ok, true);
});

test('ERPNext stub never marks financially_approved', () => {
  const stub = toCommercialRailProposalStub(
    {
      doctype: 'Quotation',
      name: 'SAL-QTN-2026-00003',
      currency: 'MUR',
      grand_total: 45000,
      tc_name: 'CF882 CorpFlowAI Commercial Terms',
      docstatus: 0,
    },
    'website-rescue',
  );
  assert.equal(stub.financially_approved, false);
  assert.equal(stub.protected_actions_executed, false);
  assert.equal(stub.proposal_version, 'SAL-QTN-2026-00003');
  assert.equal(stub.quoted_currency, 'MUR');
});

test('synthetic documents must remain draft with a do-not-send sentinel', () => {
  assert.equal(
    syntheticDocumentsMustStayDraft({
      docstatus: 0,
      title: 'CF882 SYNTHETIC Website Rescue — TEST-ONLY DO NOT SEND',
    }).ok,
    true,
  );
  assert.equal(syntheticDocumentsMustStayDraft({ docstatus: 1, title: 'TEST-ONLY' }).ok, false);
});

test('evidence artifacts exist for the three primary documents', () => {
  const dir = path.join(REPO_ROOT, 'artifacts/erpnext/commercial-documents-882');
  for (const name of [
    'lead-rescue-usd-SAL-QTN-2026-00001.pdf',
    'lead-rescue-usd-invoice-draft-ACC-SINV-2026-00002.pdf',
    'website-rescue-mur-SAL-QTN-2026-00003.pdf',
    'website-rescue-invoice-draft-ACC-SINV-2026-00001.pdf',
    'pdf-text-extract.txt',
    'apply-log.json',
  ]) {
    const p = path.join(dir, name);
    assert.equal(fs.existsSync(p), true, `missing ${name}`);
    assert.ok(fs.statSync(p).size > 100, `${name} too small`);
  }
  const extract = fs.readFileSync(path.join(dir, 'pdf-text-extract.txt'), 'utf8');
  assert.match(extract, /Tax ID: 28466939/);
  assert.match(extract, /Company No: C25228280/);
  assert.match(extract, /finance@corpflowai\.com/);
  assert.match(extract, /SAL-QTN-2026-00003/);
  assert.match(extract, /ACC-SINV-2026-00001/);
  assert.match(extract, /ACC-SINV-2026-00002/);
  assert.doesNotMatch(extract, /Tax ID: 228280/);
});
