import assert from 'node:assert/strict';
import test from 'node:test';
import {
  loadCommercialDocumentFamilies,
  SBM_BANK_NAME,
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

test('selects exactly one approved linked-Account-currency SBM company account', () => {
  const accounts = [
    { company: 'CorpFlowAI LTD', bank: SBM_BANK_NAME, account_currency: 'MUR', is_company_account: true, bank_account_no: 'synthetic-mur-token' },
    { company: 'CorpFlowAI LTD', bank: SBM_BANK_NAME, account_currency: 'USD', is_company_account: true, bank_account_no: 'synthetic-usd-token' },
  ];
  const result = selectVerifiedBankAccount({ currency: 'USD' }, accounts);
  assert.equal(result.ok, true);
  assert.equal(result.account, accounts[1]);
  assert.equal(selectVerifiedBankAccount({ currency: 'EUR' }, accounts).ok, false);
  assert.equal(
    selectVerifiedBankAccount({ currency: 'USD' }, [
      ...accounts,
      { company: 'CorpFlowAI LTD', bank: SBM_BANK_NAME, account_currency: 'USD', is_company_account: true, bank_account_no: 'synthetic-second-token' },
    ]).reason,
    'AMBIGUOUS_APPROVED_CURRENCY_ACCOUNT',
  );
});

test('accepts one valid MUR company account for the domestic payment-instruction source', () => {
  const account = {
    company: 'CorpFlowAI LTD',
    bank: SBM_BANK_NAME,
    account_currency: 'MUR',
    is_company_account: true,
    bank_account_no: 'synthetic-mur-token',
  };
  assert.deepEqual(selectVerifiedBankAccount({ currency: 'MUR' }, [account]), { ok: true, account });
});

test('fails closed for non-company, wrong-bank, or blank account-number candidates', () => {
  assert.equal(
    selectVerifiedBankAccount(
      { currency: 'USD' },
      [{ company: 'CorpFlowAI LTD', bank: SBM_BANK_NAME, account_currency: 'USD', is_company_account: false, bank_account_no: 'synthetic-token' }],
    ).ok,
    false,
  );
  assert.equal(
    selectVerifiedBankAccount(
      { currency: 'USD' },
      [{ company: 'CorpFlowAI LTD', bank: 'Other Bank', account_currency: 'USD', is_company_account: true, bank_account_no: '   ' }],
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
