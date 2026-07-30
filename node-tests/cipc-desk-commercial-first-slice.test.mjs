import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CIPC_DESK_WEBSITE_DRAFT_VERSION,
  buildCipcDeskWebsiteDraft,
} from '../lib/server/cipc-desk-website-draft.js';
import {
  inferCipcDeskFromEmailText,
  resolveCipcDeskPublicBaseUrl,
} from '../lib/server/cipc-desk-email-interpret.js';

test('website draft v2 exposes dual SME + partner CTAs and routes', () => {
  const draft = buildCipcDeskWebsiteDraft();
  assert.equal(draft.content_version, CIPC_DESK_WEBSITE_DRAFT_VERSION);
  assert.match(String(draft.meta.page_title), /Internal test/i);
  assert.doesNotMatch(String(draft.meta.page_title), /Private Preview/i);
  assert.match(String(draft.hero.cta_href), /^mailto:swart829@gmail\.com/);
  assert.match(String(draft.hero.cta_href), /Direct%20SME/i);
  assert.match(String(draft.hero.cta_secondary_href), /Professional%20partner/i);
  assert.equal(Array.isArray(draft.sections.routes.items), true);
  assert.equal(draft.sections.routes.items.length, 2);
  assert.ok(draft.sections.services.items.length >= 6);
  assert.match(String(draft.sections.about.body), /not CIPC/i);
});

test('email intake infers professional partner vs direct SME', () => {
  const partner = inferCipcDeskFromEmailText(
    'Hello, I am a tax practitioner referring a client for annual returns filing only.',
  );
  assert.equal(partner.clientRoute, 'professional_partner');
  assert.equal(partner.service.serviceSlug, 'annual-returns');

  const sme = inferCipcDeskFromEmailText('Please help register my new private company.');
  assert.equal(sme.clientRoute, 'direct_sme');
  assert.equal(sme.service.serviceSlug, 'private-company-registration');
});

test('public base URL prefers standing CIPC host over apex CORPFLOW_PUBLIC_BASE_URL', () => {
  const prev = process.env.CORPFLOW_PUBLIC_BASE_URL;
  try {
    process.env.CORPFLOW_PUBLIC_BASE_URL = 'https://corpflowai.com';
    const base = resolveCipcDeskPublicBaseUrl({
      headers: {
        host: 'cipc.corpflowai.com',
        'x-forwarded-proto': 'https',
      },
    });
    assert.equal(base, 'https://cipc.corpflowai.com');

    const alias = resolveCipcDeskPublicBaseUrl({
      headers: {
        'x-forwarded-host': 'cipc-desk.corpflowai.com',
        'x-forwarded-proto': 'https',
      },
    });
    assert.equal(alias, 'https://cipc-desk.corpflowai.com');
  } finally {
    if (prev == null) delete process.env.CORPFLOW_PUBLIC_BASE_URL;
    else process.env.CORPFLOW_PUBLIC_BASE_URL = prev;
  }
});
