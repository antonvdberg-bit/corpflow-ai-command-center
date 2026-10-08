import test from 'node:test';
import assert from 'node:assert/strict';

import {
  APPROVED_REGIONAL_PRICES,
  STANDARD_PACKAGE_PAYMENT_NOTE,
} from '../lib/public/regional-service-pricing.js';

const expected = {
  MUR: { leadSetup: 12900, leadMonthly: 6900, websiteSetup: 45000, websiteMonthly: 6900, automationFrom: 14700 },
  ZAR: { leadSetup: 3990, leadMonthly: 2190, websiteSetup: 15900, websiteMonthly: 2190, automationFrom: 5970 },
  AUD: { leadSetup: 490, leadMonthly: 249, websiteSetup: 1490, websiteMonthly: 249, automationFrom: 597 },
  USD: { leadSetup: 249, leadMonthly: 149, websiteSetup: 990, websiteMonthly: 149, automationFrom: 387 },
};

test('approved regional rates match the accepted standard matrix exactly', () => {
  for (const [currency, rates] of Object.entries(expected)) {
    assert.deepEqual(
      {
        leadSetup: APPROVED_REGIONAL_PRICES[currency].leadSetup,
        leadMonthly: APPROVED_REGIONAL_PRICES[currency].leadMonthly,
        websiteSetup: APPROVED_REGIONAL_PRICES[currency].websiteSetup,
        websiteMonthly: APPROVED_REGIONAL_PRICES[currency].websiteMonthly,
        automationFrom: APPROVED_REGIONAL_PRICES[currency].automationFrom,
      },
      rates,
    );
  }
});

test('automation minima are bounded project starting points', () => {
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(APPROVED_REGIONAL_PRICES).map(([currency, rates]) => [
        currency,
        rates.automationFrom,
      ]),
    ),
    { MUR: 14700, ZAR: 5970, AUD: 597, USD: 387 },
  );
});

test('standard pricing does not mix with the Mauritius sprint offer', () => {
  const standardValues = JSON.stringify(APPROVED_REGIONAL_PRICES);
  assert.equal(standardValues.includes('85000'), false);
  assert.equal(standardValues.includes('4500'), false);
  assert.match(STANDARD_PACKAGE_PAYMENT_NOTE, /No payment is taken on this page/);
  assert.match(STANDARD_PACKAGE_PAYMENT_NOTE, /explicit opt-in/);
});
