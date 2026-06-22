import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CUSTOMER_SERVICE_EMAIL,
  MERCHANT_BRN,
  MERCHANT_LEGAL_NAME,
  MERCHANT_OUTLET_COUNTRY,
  MERCHANT_REGISTERED_OFFICE,
  TRANSACTION_RECEIPT_FIELDS,
  formatCurrencyDisclosure,
  formatMerchantIdentityLine,
  hasCustomerServicePhone,
} from '../lib/public/merchant-identity.js';

test('merchant identity exposes PAY-SBM-2 approved public values', () => {
  assert.equal(MERCHANT_LEGAL_NAME, 'CorpFlowAI Ltd');
  assert.equal(MERCHANT_BRN, 'C25228280');
  assert.match(MERCHANT_REGISTERED_OFFICE, /Trou Aux Biches/);
  assert.equal(MERCHANT_OUTLET_COUNTRY, 'Mauritius');
  assert.equal(CUSTOMER_SERVICE_EMAIL, 'support@corpflowai.com');
});

test('currency disclosure mentions USD and MUR', () => {
  const text = formatCurrencyDisclosure();
  assert.match(text, /USD/);
  assert.match(text, /MUR/);
});

test('merchant identity line includes outlet country', () => {
  assert.match(formatMerchantIdentityLine(), /Merchant outlet country: Mauritius/);
});

test('transaction receipt fields cover SBM minimum set', () => {
  const joined = TRANSACTION_RECEIPT_FIELDS.join(' ');
  assert.match(joined, /reference/i);
  assert.match(joined, /Purchaser name/i);
  assert.match(joined, /Transaction date/i);
  assert.match(joined, /amount/i);
  assert.match(joined, /Currency/i);
  assert.match(joined, /CorpFlowAI Ltd/);
  assert.match(joined, /corpflowai\.com/i);
  assert.match(joined, /authorization/i);
  assert.match(joined, /Masked card/i);
});

test('customer service phone is optional until operator sets it', () => {
  assert.equal(hasCustomerServicePhone(), false);
});
