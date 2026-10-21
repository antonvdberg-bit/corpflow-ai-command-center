/**
 * #1483 / #1432 — public CorpFlowAI website positioning and retired-price correction.
 * Source-level checks for the primary website only. No Business Admin Desk or checkout.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { APPROVED_REGIONAL_PRICES } from '../lib/public/regional-service-pricing.js';
import {
  ENQUIRY_RECOVERY_DIAGNOSIS_HREF,
  ENQUIRY_RECOVERY_PRICE_LINE,
  ENQUIRY_RECOVERY_PRICE_MUR,
} from '../lib/public/enquiry-recovery-sprint.js';
import { CORPflow_HOMEPAGE_HERO, OFFER_FAQ_BY_SLUG } from '../lib/public/corpflow-public-market.js';
import { RAPID_DELIVERY_OFFERS } from '../lib/public/rapid-delivery-offers.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const RETIRED = /85,?000|three Lead Rescue clients|Maximum three clients|72-hour preview/i;

test('public header and footer identify the software company without the retired offer', () => {
  const header = read('components/public/CorpFlowPublicHeader.js');
  const footer = read('components/public/CorpFlowPublicFooter.js');
  assert.match(header, /Software and workflow automation/);
  assert.match(footer, /software and workflow automation company/);
  assert.match(footer, /Not a generic AI vendor/);
  assert.doesNotMatch(footer, /operates managed delivery|Maximum three clients|85,?000/);
});

test('homepage identity, current price and diagnosis CTA do not use the retired offer', () => {
  const home = read('components/CorpFlowPublicHome.js');
  assert.match(home, /software and workflow automation/);
  assert.match(home, /MERCHANT_LEGAL_NAME/);
  assert.match(home, /ENQUIRY_RECOVERY_PRICE_LINE/);
  assert.match(home, /no guaranteed-revenue claims/i);
  assert.match(home, /\/lead-rescue#diagnosis|ENQUIRY_RECOVERY_DIAGNOSIS_HREF|primaryCta=\{CORPflow_HOMEPAGE_HERO\.primaryCta\}/);
  assert.doesNotMatch(home, RETIRED);
  assert.equal(CORPflow_HOMEPAGE_HERO.primaryCta.href, ENQUIRY_RECOVERY_DIAGNOSIS_HREF);
  assert.match(CORPflow_HOMEPAGE_HERO.eyebrow, /CorpFlowAI Ltd/);
  assert.match(CORPflow_HOMEPAGE_HERO.eyebrow, /software and workflow automation/);
  assert.match(CORPflow_HOMEPAGE_HERO.subhead, /Lead Rescue/);
  assert.match(CORPflow_HOMEPAGE_HERO.subhead, /MUR 12,900/);
  assert.equal(ENQUIRY_RECOVERY_PRICE_MUR, APPROVED_REGIONAL_PRICES.MUR.leadSetup);
  assert.equal(ENQUIRY_RECOVERY_PRICE_LINE.includes('12,900'), true);
});

test('services explain the approved software packages without a client cap', () => {
  const services = read('pages/services.js');
  assert.match(services, /software and workflow automation company/);
  assert.match(services, /Lead Rescue/);
  assert.match(services, /Website Rescue/);
  assert.match(services, /Business automation/);
  assert.match(services, /500 enquiry records/);
  assert.match(services, /href="\/pricing"/);
  assert.match(services, /ENQUIRY_RECOVERY_PRICE_LINE/);
  assert.doesNotMatch(services, RETIRED);
  assert.doesNotMatch(services, /we guarantee revenue|WhatsApp API connection is included/i);
});

test('pricing page keeps the approved matrix and does not invent a rate', () => {
  const pricing = read('pages/pricing.js');
  assert.match(pricing, /APPROVED_REGIONAL_PRICES/);
  assert.match(pricing, /software and workflow automation/);
  assert.match(pricing, /resolveBusinessAdminDeskSurface/);
  assert.doesNotMatch(pricing, RETIRED);
  assert.equal(APPROVED_REGIONAL_PRICES.MUR.leadSetup, 12900);
  assert.equal(APPROVED_REGIONAL_PRICES.MUR.leadMonthly, 6900);
  assert.equal(APPROVED_REGIONAL_PRICES.MUR.websiteSetup, 45000);
  assert.equal(APPROVED_REGIONAL_PRICES.MUR.websiteMonthly, 6900);
  assert.equal(APPROVED_REGIONAL_PRICES.MUR.automationFrom, 14700);
  assert.equal(APPROVED_REGIONAL_PRICES.USD.leadSetup, 249);
  assert.equal(RAPID_DELIVERY_OFFERS['ai-lead-rescue'].priceIsFixed, false);
});

test('terms, privacy and refund stay consistent with software packages and future Paddle without a live checkout claim', () => {
  for (const rel of ['pages/terms.js', 'pages/privacy.js', 'pages/refund-policy.js']) {
    const source = read(rel);
    assert.match(source, /Paddle/);
    assert.match(source, /not active|does not mean Paddle checkout is active/i);
    assert.doesNotMatch(source, /Paddle checkout is (live|available|enabled)/i);
    assert.doesNotMatch(source, RETIRED);
    assert.doesNotMatch(source, /human verification/);
  }
  const terms = read('pages/terms.js');
  assert.match(terms, /software and workflow automation company/);
  assert.match(terms, /merchant of record/i);
  assert.match(terms, /does not create a new payment, refund or cancellation right/);
  const refund = read('pages/refund-policy.js');
  assert.match(refund, /does not create a new refund or cancellation right/);
  assert.match(refund, /refund may be available/);
});

test('public process and onboarding metadata no longer publish the retired price', () => {
  for (const rel of ['pages/process.js', 'pages/onboarding.js']) {
    assert.doesNotMatch(read(rel), RETIRED);
    assert.match(read(rel), /ENQUIRY_RECOVERY_PRICE_LINE/);
  }
});

test('rendered Lead Rescue FAQ no longer states a three-client cap or a 72-hour clock', () => {
  const faq = JSON.stringify(OFFER_FAQ_BY_SLUG['ai-lead-rescue']);
  assert.doesNotMatch(faq, /72-hour|maximum of three/i);
  assert.match(faq, /confirmed individually/i);
});
