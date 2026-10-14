import assert from 'node:assert/strict';
import test from 'node:test';
import {
  loadCommercialDocumentFamilies,
  selectCommercialDocumentFamily,
  selectApprovedBankAccount,
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

test('selects exactly one explicitly approved currency-matched company account', () => {
  const accounts = [
    { name: 'BA-MUR-SYNTHETIC', company: 'CorpFlowAI LTD', account_currency: 'MUR', bank_account_no: 'synthetic-mur-token' },
    { name: 'BA-USD-SYNTHETIC', company: 'CorpFlowAI LTD', account_currency: 'USD', bank_account_no: 'synthetic-usd-token' },
  ];
  const result = selectApprovedBankAccount({ currency: 'USD' }, accounts, ['BA-USD-SYNTHETIC']);
  assert.equal(result.ok, true);
  assert.equal(result.account, accounts[1]);
  assert.equal(selectApprovedBankAccount({ currency: 'EUR' }, accounts, ['BA-USD-SYNTHETIC']).ok, false);
  assert.equal(
    selectApprovedBankAccount({ currency: 'USD' }, [
      ...accounts,
      { name: 'BA-USD-SECOND', company: 'CorpFlowAI LTD', account_currency: 'USD', bank_account_no: 'synthetic-second-token' },
    ], ['BA-USD-SYNTHETIC', 'BA-USD-SECOND']).reason,
    'AMBIGUOUS_APPROVED_CURRENCY_ACCOUNT',
  );
});

test('fails closed for unapproved or blank account-number candidates', () => {
  assert.equal(
    selectApprovedBankAccount(
      { currency: 'USD' },
      [{ name: 'BA-USD-SYNTHETIC', company: 'CorpFlowAI LTD', account_currency: 'USD', bank_account_no: 'synthetic-token' }],
      [],
    ).ok,
    false,
  );
  assert.equal(
    selectApprovedBankAccount(
      { currency: 'USD' },
      [{ name: 'BA-USD-SYNTHETIC', company: 'CorpFlowAI LTD', account_currency: 'USD', bank_account_no: '   ' }],
      ['BA-USD-SYNTHETIC'],
    ).reason,
    'MISSING_APPROVED_CURRENCY_ACCOUNT',
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
