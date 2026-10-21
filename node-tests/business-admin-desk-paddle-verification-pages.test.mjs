import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BAD_CHECKOUT_NOTE,
  BAD_STATUTORY_FEE_NOTE,
  BUSINESS_ADMIN_DESK_PACKAGES,
  formatZarServiceFee,
  resolveBusinessAdminDeskSurface,
} from '../lib/public/business-admin-desk-packages.js';
import {
  BAD_PENDING_APPROVAL_HEADING,
  BAD_PENDING_DECISIONS,
  BAD_POLICY_OPERATOR_SENTENCE,
} from '../lib/public/business-admin-desk-policies.js';
import {
  createElement,
  loadComponent,
  render,
  restoreJsLoader,
} from './business-admin-desk-render-test-helper.mjs';

const APPROVED_FEES = [
  ['BAD-ONBOARD-EXISTING', 199],
  ['BAD-REG-ONBOARD-BUNDLE', 299],
  ['BAD-ANNUAL-RETURN-BO-CURRENT', 99],
  ['BAD-BO-SIMPLE', 249],
  ['BAD-DIRECTOR-APPT-RESIGN', 199],
  ['BAD-ADDRESS-CHANGE', 69],
  ['BAD-SHARE-CERT-VERIFIED', 99],
  ['BAD-NAME-RESERVATION', 99],
  ['BAD-FYE-CHANGE', 199],
];

const PublicPricing = loadComponent('components/BusinessAdminDeskPublicPricingPage.js');
const ReviewPricing = loadComponent('components/BusinessAdminDeskPricingReviewPage.js');
const TermsPage = loadComponent('pages/terms.js');
const PrivacyPage = loadComponent('pages/privacy.js');
const RefundPage = loadComponent('pages/refund-policy.js');
const CorpFlowPricing = loadComponent('pages/pricing.js');

test.after(() => restoreJsLoader());

test('approved Business Admin Desk fees stay the nine one-time ZAR packages', () => {
  assert.deepEqual(
    BUSINESS_ADMIN_DESK_PACKAGES.map((pkg) => [pkg.code, pkg.amountZar]),
    APPROVED_FEES,
  );
  assert.equal(formatZarServiceFee(69), 'ZAR 69');
  assert.match(BAD_STATUTORY_FEE_NOTE, /Government and statutory fees are charged separately/);
  assert.match(BAD_CHECKOUT_NOTE, /Online checkout is not available/);
  assert.match(BAD_POLICY_OPERATOR_SENTENCE, /operated by CorpFlowAI Ltd/);
  assert.equal(BAD_PENDING_DECISIONS.length >= 4, true);
  assert.match(BAD_PENDING_APPROVAL_HEADING, /Requires commercial or legal approval/);
});

test('host surfaces separate public Business Admin Desk, staging and CorpFlowAI', () => {
  assert.equal(resolveBusinessAdminDeskSurface('businessadmindesk.co.za'), 'public');
  assert.equal(resolveBusinessAdminDeskSurface('www.businessadmindesk.co.za'), 'public');
  assert.equal(resolveBusinessAdminDeskSurface('cipc.corpflowai.com'), 'staging');
  assert.equal(resolveBusinessAdminDeskSurface('cipc-desk.corpflowai.com'), 'staging');
  assert.equal(resolveBusinessAdminDeskSurface('corpflowai.com'), 'other');
  assert.equal(resolveBusinessAdminDeskSurface('lux.corpflowai.com'), 'other');
});

function assertNoCheckoutCta(html) {
  assert.match(html, /Online checkout is not available/);
  assert.doesNotMatch(html, /Pay now|Buy now|Start checkout|Checkout with Paddle/i);
  assert.doesNotMatch(html, /12900|45000|85000|51000|34000/);
}

test('public pricing page lists every approved fee and does not open checkout', () => {
  const html = render(createElement(PublicPricing));
  assert.match(html, /index,follow/);
  assert.match(html, /rel="canonical" href="https:\/\/businessadmindesk\.co\.za\/pricing"/);
  assert.match(html, /Government and statutory fees are charged separately/);
  assert.match(html, /mailto:info@businessadmindesk\.co\.za/);
  assert.doesNotMatch(html, /mailto:accounts@businessadmindesk\.co\.za/);
  assertNoCheckoutCta(html);
  for (const [code, amount] of APPROVED_FEES) {
    assert.match(html, new RegExp(code));
    assert.match(html, new RegExp(`ZAR ${amount}`));
  }
});

test('staging pricing review keeps noindex and the same fees', () => {
  const html = render(createElement(ReviewPricing));
  assert.match(html, /noindex,nofollow/);
  assert.doesNotMatch(html, /rel="canonical"/);
  assert.match(html, /mailto:accounts@businessadmindesk\.co\.za/);
  assert.match(html, /No checkout or payment is available/);
  assertNoCheckoutCta(html);
  for (const [code, amount] of APPROVED_FEES) {
    assert.match(html, new RegExp(code));
    assert.match(html, new RegExp(`ZAR ${amount}`));
  }
});

test('Business Admin Desk policy pages are brand-specific and do not invent refund rights', () => {
  const cases = [
    [TermsPage, '/terms', 'Terms'],
    [PrivacyPage, '/privacy', 'Privacy'],
    [RefundPage, '/refund-policy', 'Refund and cancellation'],
  ];
  for (const [Page, path, title] of cases) {
    const pub = render(createElement(Page, { surface: 'public' }));
    const staging = render(createElement(Page, { surface: 'staging' }));
    assert.match(pub, new RegExp(title));
    assert.match(pub, /Business Admin Desk is a service brand operated by CorpFlowAI Ltd/);
    assert.match(pub, /index,follow/);
    assert.match(pub, new RegExp(`rel="canonical" href="https://businessadmindesk\\.co\\.za${path}"`));
    assert.match(pub, /Requires commercial or legal approval/);
    assert.doesNotMatch(pub, /Lead Rescue|Website Rescue|7-day|14-day|cooling-off period of/i);
    assert.match(staging, /noindex,nofollow/);
    assert.doesNotMatch(staging, /rel="canonical"/);
    assertNoCheckoutCta(pub);
  }
  const refund = render(createElement(RefundPage, { surface: 'public' }));
  assert.match(refund, /does not create a refund right/);
  assert.match(refund, /does not promise that an authority will return a statutory fee/);
});

test('CorpFlowAI pricing and policies stay on non-Business-Admin-Desk hosts', () => {
  const pricing = render(createElement(CorpFlowPricing, { host: 'corpflowai.com' }));
  assert.match(pricing, /Lead Rescue/);
  assert.doesNotMatch(pricing, /BAD-ONBOARD-EXISTING|ZAR 199/);
  const terms = render(createElement(TermsPage, { surface: 'other' }));
  assert.match(terms, /Lead Rescue/);
  assert.match(terms, /businessadmindesk\.co\.za\/terms/);
  assert.doesNotMatch(terms, /BAD-ADDRESS-CHANGE/);
});
