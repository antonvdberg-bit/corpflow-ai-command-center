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

test.after(() => restoreJsLoader());

test('review footer renders the approved service-brand disclosure and planned identities', () => {
  const html = render(createElement(LegalFooter, { internalReview: true }));
  assert.match(html, /Business Admin Desk is a service brand operated by CorpFlowAI Ltd\./);
  assert.match(html, /Service brand/);
  assert.match(html, /Email routing pending verification/);

  for (const address of [
    'info@businessadmindesk.co.za',
    'support@businessadmindesk.co.za',
    'accounts@businessadmindesk.co.za',
    'Serah.Fourie@businessadmindesk.co.za',
  ]) {
    assert.match(html, new RegExp(address.replace('.', '\\.')));
  }
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

test('all landing variants render review identity and preserve the pending-email notice', () => {
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
    assert.match(html, /Email routing pending verification/);
    assert.match(html, /mailto:info@businessadmindesk\.co\.za/);
    assert.match(html, /noindex,nofollow/);
    assert.doesNotMatch(html, /rel="canonical"/);
  }
});

test('public landing renders indexable metadata and its conditional canonical', () => {
  const html = render(createElement(PublicLanding, {
    internalReview: false,
    videoEmbedUrl: 'https://example.test/public-video',
  }));
  assert.match(html, /index,follow/);
  assert.match(html, /rel="canonical" href="https:\/\/businessadmindesk\.co\.za\/"/);
  assert.match(html, /mailto:swart829@gmail\.com/);
});
