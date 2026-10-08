import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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
  const standardValues = Object.values(APPROVED_REGIONAL_PRICES).flatMap((rates) =>
    Object.values(rates),
  );
  assert.equal(standardValues.includes(85000), false);
  assert.equal(standardValues.includes(4500), false);
  assert.match(STANDARD_PACKAGE_PAYMENT_NOTE, /No payment is taken on this page/);
  assert.match(STANDARD_PACKAGE_PAYMENT_NOTE, /explicit opt-in/);
});

test('served public surfaces retire the former sprint claims', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const surfaces = [
    'pages/pricing.js',
    'pages/lead-rescue.js',
    'components/EnquiryRecoveryCampaignPage.js',
    'components/AiLeadRescueLanding.js',
    'components/AiLeadRescuePropertyMauritiusLanding.js',
    'lib/public/enquiry-recovery-sprint.js',
    'lib/public/rapid-delivery-offers.js',
    'lib/public/corpflow-public-market.js',
  ].map((file) => readFileSync(`${root}/${file}`, 'utf8')).join('\n');

  assert.doesNotMatch(surfaces, /MUR 85,000|MUR 51,000|MUR 34,000|\b60%\s*(?:deposit|to start)|\b40%\s*(?:after|balance)/);
  assert.doesNotMatch(surfaces, /founding client|founding slots|separate scoped sprint/i);
  assert.doesNotMatch(surfaces, /Is this the Enquiry Recovery Sprint\?/);
  assert.match(surfaces, /Request an assessment/);
});
