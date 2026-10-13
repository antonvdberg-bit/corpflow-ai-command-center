import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadCommercialPrintFormatPackage,
  readCommercialPrintFormatSources,
  validateCommercialPrintFormatPackage,
} from '../lib/erpnext/commercial-print-format-package.js';

const formatPackage = loadCommercialPrintFormatPackage();
const sources = readCommercialPrintFormatSources(formatPackage);

test('defines all eight source-controlled Domestic and International Print Formats', () => {
  assert.equal(formatPackage.apply_mode, 'operator_controlled_readback_required');
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

test('every template resolves only one explicit verified company Bank Account or fails closed', () => {
  for (const { name, source } of sources) {
    assert.match(source, /frappe\.get_meta\("Bank Account"\)\.has_field\("custom_commercial_bank_verified"\)/, name);
    assert.match(source, /"is_company_account": 1/, name);
    assert.match(source, /"custom_commercial_bank_verified": 1/, name);
    assert.match(source, /account_currency"\) ==/, name);
    assert.match(source, /bank\.count == 1/, name);
    assert.match(source, /missing or ambiguous; operator review required/, name);
    assert.doesNotMatch(source, /contact_email|company_email|email_id|iban_fallback/i, name);
  }
});

test('Domestic MUR templates omit IBAN and SWIFT while international templates require mapped transfer fields', () => {
  for (const { family, name, source } of sources) {
    if (family === 'DOMESTIC') {
      assert.match(source, /"MUR"/, name);
      assert.match(source, /Domestic payment instructions/, name);
      assert.doesNotMatch(source, /custom_commercial_iban|custom_commercial_swift|\bIBAN\b|\bSWIFT\b/, name);
    } else {
      assert.match(source, /custom_commercial_iban/, name);
      assert.match(source, /custom_commercial_swift/, name);
      assert.match(source, /International transfer instructions/, name);
    }
  }
});

test('selling-document sources preserve bounded product-set branding and document-state rendering', () => {
  for (const { doctype, name, source } of sources.filter(({ doctype }) => doctype !== 'Payment Request')) {
    assert.match(source, /range\(8\)/, name);
    assert.match(source, /CorpFlowAI Services/, name);
    assert.match(source, /Business Admin Desk Services/, name);
    assert.match(source, /BRAND CLASSIFICATION ERROR \/ NOT CLIENT-READY/, name);
    assert.match(source, /doc\.docstatus/, name);
  }
});

test('package preparation cannot apply, mutate, or send anything to ERPNext', () => {
  for (const { name, source } of sources) {
    assert.doesNotMatch(source, /\b(insert|save|submit|cancel|delete|requests\.|http:\/\/|https:\/\/.*api\/resource)\b/i, name);
  }
});
