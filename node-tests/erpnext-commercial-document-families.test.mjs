import assert from 'node:assert/strict';
import test from 'node:test';
import {
  loadCommercialDocumentFamilies,
  selectCommercialDocumentFamily,
  selectVerifiedBankAccount,
  validateBankFieldSources,
} from '../lib/erpnext/commercial-document-families.js';

const config = loadCommercialDocumentFamilies();

test('defines four named formats for each family', () => {
  for (const family of ['DOMESTIC', 'INTERNATIONAL']) {
    assert.deepEqual(Object.keys(config.families[family].print_formats).sort(), [
      'Payment Request',
      'Quotation',
      'Sales Invoice',
      'Sales Order',
    ]);
    assert.match(config.families[family].print_formats.Quotation, new RegExp(family === 'DOMESTIC' ? 'Domestic' : 'International'));
  }
});

test('selects Domestic only for CorpFlowAI LTD, MUR, Mauritius', () => {
  assert.equal(
    selectCommercialDocumentFamily({
      company: 'CorpFlowAI LTD',
      currency: 'MUR',
      billing_country: 'Mauritius',
    }),
    'DOMESTIC',
  );
  assert.equal(
    selectCommercialDocumentFamily({
      company: 'CorpFlowAI LTD',
      currency: 'USD',
      billing_country: 'Mauritius',
    }),
    'INTERNATIONAL',
  );
  assert.equal(
    selectCommercialDocumentFamily({
      company: 'CorpFlowAI LTD',
      currency: 'MUR',
      billing_country: 'South Africa',
    }),
    'INTERNATIONAL',
  );
});

test('selects exactly one verified currency-matched company account', () => {
  const accounts = [
    { company: 'CorpFlowAI LTD', currency: 'MUR', is_verified: true, bank_account_no: 'redacted-mur' },
    { company: 'CorpFlowAI LTD', currency: 'USD', is_verified: true, bank_account_no: 'redacted-usd' },
  ];
  assert.equal(
    selectVerifiedBankAccount({ currency: 'USD' }, accounts).account.bank_account_no,
    'redacted-usd',
  );
  assert.equal(selectVerifiedBankAccount({ currency: 'EUR' }, accounts).ok, false);
  assert.equal(
    selectVerifiedBankAccount({ currency: 'USD' }, [
      ...accounts,
      { company: 'CorpFlowAI LTD', currency: 'USD', is_verified: true, bank_account_no: 'another-redacted' },
    ]).reason,
    'AMBIGUOUS_VERIFIED_CURRENCY_ACCOUNT',
  );
});

test('rejects contact fields and IBAN fallback as banking sources', () => {
  const result = validateBankFieldSources({
    bank_name: 'Bank master',
    account_holder: 'Bank Account',
    bank_account_no: 'Bank Account.bank_account_no',
    iban: 'iban_fallback',
    swift: 'email',
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.violations.sort(), ['iban', 'swift']);
});

test('Domestic omits IBAN and SWIFT by contract', () => {
  assert.deepEqual(config.families.DOMESTIC.omit_fields, ['iban', 'swift']);
  assert.deepEqual(config.families.DOMESTIC.payment_fields, [
    'bank_name',
    'account_holder',
    'bank_account_no',
    'payment_reference',
  ]);
});
