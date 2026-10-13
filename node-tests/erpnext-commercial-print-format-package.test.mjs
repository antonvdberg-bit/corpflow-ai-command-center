import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadCommercialPrintFormatPackage,
  readCommercialPrintFormatSources,
  validateCommercialPrintFormatPackage,
  validateOperatorBankFieldMap,
} from '../lib/erpnext/commercial-print-format-package.js';

const formatPackage = loadCommercialPrintFormatPackage();
const sources = readCommercialPrintFormatSources(formatPackage);

test('defines all eight source-controlled Domestic and International Print Formats', () => {
  assert.equal(formatPackage.apply_mode, 'operator_controlled_readback_required');
  assert.equal(formatPackage.operator_field_map.status, 'UNRESOLVED_OPERATOR_PROOF_REQUIRED');
  assert.equal(formatPackage.operator_field_map.forbid_new_custom_fields, true);
  assert.equal(formatPackage.canonical_bank_contract.is_verified, 'is_verified');
  assert.deepEqual(
    sources.map(({ name }) => name).sort(),
    [
      'CorpFlowAI Domestic Deposit Request',
      'CorpFlowAI Domestic Quotation',
      'CorpFlowAI Domestic Sales Invoice',
      'CorpFlowAI Domestic Sales Order',
      'CorpFlowAI International Deposit Request',
      'CorpFlowAI International Quotation',
      'CorpFlowAI International Sales Invoice',
      'CorpFlowAI International Sales Order',
    ],
  );
  assert.equal(validateCommercialPrintFormatPackage(formatPackage).ok, true);
});

test('covers every requested DocType in both commercial document families', () => {
  for (const family of ['DOMESTIC', 'INTERNATIONAL']) {
    assert.deepEqual(
      sources
        .filter((format) => format.family === family)
        .map((format) => format.doctype)
        .sort(),
      ['Payment Request', 'Quotation', 'Sales Invoice', 'Sales Order'],
    );
  }
});

test('requires a complete operator-supplied existing-field map before guarded application', () => {
  assert.equal(validateOperatorBankFieldMap().ok, false);
  assert.equal(
    validateOperatorBankFieldMap({
      company: 'company',
      currency: 'currency',
      is_verified: 'is_verified',
      bank_account_no: 'bank_account_no',
      account_holder: 'account_holder',
      iban: 'iban',
      swift: 'swift',
    }).ok,
    true,
  );
  assert.equal(
    validateOperatorBankFieldMap({
      company: 'company',
      currency: 'currency',
      is_verified: 'custom_verified',
      bank_account_no: 'bank_account_no',
      account_holder: 'email',
      iban: 'iban',
      swift: 'swift',
    }).ok,
    false,
  );
});

test('every template resolves only one explicit verified company Bank Account or fails closed', () => {
  for (const { name, source } of sources) {
    assert.match(source, /bank_meta\.has_field\("company"\)/, name);
    assert.match(source, /bank_meta\.has_field\("currency"\)/, name);
    assert.match(source, /bank_meta\.has_field\("is_verified"\)/, name);
    assert.match(source, /bank_meta\.has_field\("bank_account_no"\)/, name);
    assert.match(source, /"company": "CorpFlowAI LTD"/, name);
    assert.match(source, /"currency": commercial_currency/, name);
    assert.match(source, /"is_verified": 1/, name);
    assert.match(source, /candidate\.bank_account_no/, name);
    assert.match(source, /bank\.count == 1/, name);
    assert.match(source, /missing or ambiguous; operator review required/, name);
    assert.doesNotMatch(source, /custom_commercial_|contact_email|company_email|email_id|iban_fallback/i, name);
  }
});

test('every template rejects a mismatched family before any payment instruction is rendered', () => {
  for (const { name, source } of sources) {
    assert.match(source, /selected_family = "DOMESTIC" if commercial_company == "CorpFlowAI LTD" and commercial_currency == "MUR" and billing_country == "Mauritius" else "INTERNATIONAL"/, name);
    assert.match(source, /selected_family != expected_family/, name);
    assert.match(source, /COMMERCIAL DOCUMENT FAMILY MISMATCH \/ OPERATOR REVIEW REQUIRED/, name);
  }
});

test('Domestic MUR templates omit IBAN and SWIFT while international templates fail closed until fields are operator-mapped', () => {
  for (const { family, name, source } of sources) {
    if (family === 'DOMESTIC') {
      assert.match(source, /"MUR"/, name);
      assert.match(source, /Domestic payment instructions/, name);
      assert.doesNotMatch(source, /\bIBAN\b|\bSWIFT\b/, name);
    } else {
      assert.match(source, /INTERNATIONAL TRANSFER FIELD MAP UNRESOLVED \/ NOT CLIENT-READY/, name);
      assert.doesNotMatch(source, /bank\.record\.bank_account_no/, name);
    }
  }
});

test('all sources, including Payment Request, preserve bounded product-set branding and document-state rendering', () => {
  for (const { name, source } of sources) {
    assert.match(source, /range\(8\)/, name);
    assert.match(source, /CorpFlowAI Services/, name);
    assert.match(source, /Business Admin Desk Services/, name);
    assert.match(source, /BRAND CLASSIFICATION ERROR \/ NOT CLIENT-READY/, name);
    assert.match(source, /doc\.docstatus/, name);
  }
});

test('Payment Request sources use safe optional fields for reference and requested amount', () => {
  for (const { name, source } of sources.filter(({ doctype }) => doctype === 'Payment Request')) {
    assert.match(source, /doc\.get\("reference_name"\) or ""/, name);
    assert.match(source, /doc\.get\("grand_total"\) is not none/, name);
    assert.doesNotMatch(source, /doc\.grand_total/, name);
  }
});

test('package preparation cannot apply, mutate, send, or assert bank values', () => {
  for (const { name, source } of sources) {
    assert.doesNotMatch(source, /\b(insert|save|submit|cancel|delete|requests\.|http:\/\/|https:\/\/.*api\/resource)\b/i, name);
    assert.doesNotMatch(source, /\d{6,}/, name);
  }
});
