import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createElement,
  loadComponent,
  loadModule,
  render,
  restoreJsLoader,
} from './business-admin-desk-render-test-helper.mjs';

const ContactActionsModule = loadModule('components/BusinessAdminDeskContactActions.js');
const ContactActions = ContactActionsModule.default;
const LegalFooter = loadComponent('components/BusinessAdminDeskLegalFooter.js');
const PublicLanding = loadComponent('components/BusinessAdminDeskPublicLanding.js');
const PartnerLanding = loadComponent('components/BusinessAdminDeskPartnerLanding.js');
const ServiceLanding = loadComponent('components/BusinessAdminDeskServiceLanding.js');
const PricingReview = loadComponent('components/BusinessAdminDeskPricingReviewPage.js');

const INTERNAL_OPERATING_TEXT = [
  /Brand contacts/,
  /go to Anton/,
  /Anton, general enquiries/,
  /Anton, billing\/accounts/,
  /Anton, customer support/,
  /Serah, service delivery/,
  /External inbound delivery/,
  /Outbound send-as/,
  /automated support-ticket/,
  /ERPNext/,
];

function assertNoInternalOperatingText(html) {
  for (const pattern of INTERNAL_OPERATING_TEXT) {
    assert.doesNotMatch(html, pattern);
  }
}

test.after(() => restoreJsLoader());

test('review footer keeps the service-brand disclosure and a single general enquiry address', () => {
  const html = render(createElement(LegalFooter, { internalReview: true }));
  assert.match(html, /Business Admin Desk is a service brand operated by CorpFlowAI Ltd\./);
  assert.match(html, /Service brand/);
  assert.match(html, /href="mailto:info@businessadmindesk\.co\.za"/);
  assert.doesNotMatch(html, /mailto:accounts@businessadmindesk\.co\.za/);
  assert.doesNotMatch(html, /mailto:support@businessadmindesk\.co\.za/);
  assert.doesNotMatch(html, /mailto:Serah\.Fourie@businessadmindesk\.co\.za/);
  assertNoInternalOperatingText(html);
});

test('public footer keeps the approved contact baseline', () => {
  const html = render(createElement(LegalFooter, { internalReview: false }));
  assert.match(html, /Business Admin Desk is a trading name of CorpFlowAI LTD, registered in Mauritius/);
  assert.match(html, /swart829@gmail\.com/);
  assert.doesNotMatch(html, /mailto:info@businessadmindesk\.co\.za/);
  assert.doesNotMatch(html, /Brand contacts/);
  assert.doesNotMatch(html, /service brand operated by CorpFlowAI Ltd/);
});

test('contact actions render scoped review/public mailto links with encoded content', async () => {
  const review = render(createElement(ContactActions, {
    internalReview: true,
    subject: 'Subject & review',
    body: 'Line one & line two',
  }));
  const publicHtml = render(createElement(ContactActions, {
    internalReview: false,
    subject: 'Public subject',
    body: 'Public body',
  }));

  assert.match(review, /mailto:info@businessadmindesk\.co\.za\?subject=Subject%20%26%20review&amp;body=Line%20one%20%26%20line%20two/);
  assert.match(publicHtml, /mailto:swart829@gmail\.com\?subject=Public%20subject&amp;body=Public%20body/);

  let copied = '';
  const clipboard = { writeText: async (value) => { copied = value; } };
  await ContactActionsModule.copyContactEmail(clipboard, 'info@businessadmindesk.co.za');
  assert.equal(copied, 'info@businessadmindesk.co.za');
});

test('review landings use the general enquiry address and hide internal operating text', () => {
  const variants = [
    createElement(PublicLanding, { internalReview: true, videoEmbedUrl: 'https://example.test/review-video' }),
    createElement(PartnerLanding, { internalReview: true }),
    createElement(ServiceLanding, { serviceKey: 'annual-returns', internalReview: true }),
    createElement(ServiceLanding, { serviceKey: 'director-changes', internalReview: true }),
    createElement(ServiceLanding, { serviceKey: 'beneficial-ownership', internalReview: true }),
  ];

  for (const element of variants) {
    const html = render(element);
    assert.match(html, /Business Admin Desk is a service brand operated by CorpFlowAI Ltd\./);
    assert.match(html, /href="mailto:info@businessadmindesk\.co\.za\?subject=/);
    assert.doesNotMatch(html, /mailto:accounts@businessadmindesk\.co\.za/);
    assert.doesNotMatch(html, /mailto:support@businessadmindesk\.co\.za/);
    assert.doesNotMatch(html, /mailto:Serah\.Fourie@businessadmindesk\.co\.za/);
    assertNoInternalOperatingText(html);
    assert.match(html, /noindex,nofollow/);
    assert.doesNotMatch(html, /rel="canonical"/);
  }
});

test('pricing review uses the billing address only in that billing context', () => {
  const html = render(createElement(PricingReview));
  assert.match(html, /Billing questions:/);
  assert.match(html, /href="mailto:accounts@businessadmindesk\.co\.za"/);
  assert.match(html, /href="mailto:info@businessadmindesk\.co\.za"/);
  assert.doesNotMatch(html, /mailto:support@businessadmindesk\.co\.za/);
  assert.doesNotMatch(html, /mailto:Serah\.Fourie@businessadmindesk\.co\.za/);
  assert.match(html, /Business Admin Desk is a service brand operated by CorpFlowAI Ltd\./);
  assert.match(html, /noindex,nofollow/);
  assertNoInternalOperatingText(html);
});

test('public landing renders indexable metadata and its conditional canonical', () => {
  const html = render(createElement(PublicLanding, {
    internalReview: false,
    videoEmbedUrl: 'https://example.test/public-video',
  }));
  assert.match(html, /index,follow/);
  assert.match(html, /rel="canonical" href="https:\/\/businessadmindesk\.co\.za\/"/);
  assert.match(html, /mailto:swart829@gmail\.com/);
  assert.doesNotMatch(html, /mailto:info@businessadmindesk\.co\.za/);
  assert.doesNotMatch(html, /Brand contacts/);
  assert.doesNotMatch(html, /noindex,nofollow/);
});
