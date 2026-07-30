import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  CIPC_DESK_LANDING_CONTENT_VERSION,
  CIPCDESK_LANDING_DEFAULTS,
  CIPCDESK_LANDING_DISCLAIMER,
  buildCipcDeskWebsiteDraftForLanding,
  resolveCipcDeskLandingContent,
} from '../lib/server/cipc-desk-landing-content.js';
import {
  CIPCDESK_TENANT_ID,
  resolveCipcDeskTenantIdFromHost,
} from '../lib/server/cipc-desk-runtime.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

test('landing content version is stable and draft carries it', () => {
  assert.equal(CIPC_DESK_LANDING_CONTENT_VERSION, 'cipc-desk-landing-ui-v1');
  const draft = buildCipcDeskWebsiteDraftForLanding();
  assert.equal(draft.content_version, CIPC_DESK_LANDING_CONTENT_VERSION);
  assert.equal(draft.hero.title, 'CIPC Desk');
  assert.match(draft.hero.cta_href, /^mailto:/);
  assert.ok(Array.isArray(draft.sections.services.items));
  assert.ok(draft.sections.services.items.length >= 6);
});

test('resolveCipcDeskLandingContent prefers draft fields and strips preview noise', () => {
  const resolved = resolveCipcDeskLandingContent({
    meta: { page_title: 'CIPC Desk · Internal test' },
    hero: {
      title: 'CIPC Desk',
      headline: 'Handled with care',
      tagline: 'Private preview — fictional example only. Longer reassurance copy for buyers stays.',
      cta_label: 'Email your CIPC matter (preview)',
      cta_href: 'mailto:swart829@gmail.com?subject=test',
    },
    sections: {
      services: {
        title: 'Services',
        intro: 'Provisional catalogue',
        items: [{ name: 'Annual returns', detail: 'Confirmed per matter.' }],
      },
      contact: { email: 'swart829@gmail.com' },
    },
  });
  assert.equal(resolved.pageTitle, 'CIPC Desk · Internal test');
  assert.equal(resolved.headline, 'Handled with care');
  assert.equal(resolved.ctaLabel, 'Email your CIPC matter');
  assert.doesNotMatch(resolved.lead, /Private preview/i);
  assert.equal(resolved.services.length, 1);
  assert.equal(resolved.services[0].name, 'Annual returns');
});

test('defaults avoid payment-path CTA and legal guarantee language', () => {
  assert.doesNotMatch(CIPCDESK_LANDING_DEFAULTS.ctaLabel, /payment/i);
  assert.match(CIPCDESK_LANDING_DISCLAIMER, /not an official CIPC/i);
  assert.doesNotMatch(CIPCDESK_LANDING_DISCLAIMER, /guaranteed|within \d+ (hours|days)|approval is assured/i);
  for (const item of CIPCDESK_LANDING_DEFAULTS.services) {
    assert.doesNotMatch(item.detail, /guaranteed|statutory approval|we will file within/i);
  }
});

test('index wires CipcDeskLanding only for cipc-desk tenant_id', () => {
  const indexSrc = read('pages/index.js');
  assert.match(indexSrc, /import CipcDeskLanding from ['"]\.\.\/components\/CipcDeskLanding\.js['"]/);
  assert.match(indexSrc, /site\?\.tenant_id === ['"]cipc-desk['"]/);
  assert.match(indexSrc, /<CipcDeskLanding site=\{site\} \/>/);
  // Lux branch must remain distinct and earlier / separate.
  assert.match(indexSrc, /lux_acquisition === true/);
  assert.match(indexSrc, /RareExclusiveTenantPresentation/);
});

test('CipcDeskLanding uses CorpFlow photo+glass primitives (not external moss/sand palette)', () => {
  const landing = read('components/CipcDeskLanding.js');
  assert.match(landing, /PublicMarketingPhotoGlassShell/);
  assert.match(landing, /HeroGlassBlock/);
  assert.match(landing, /GlassPanel/);
  assert.match(landing, /buildPublicVisualHero/);
  assert.match(landing, /GLASS_TOKENS/);
  assert.doesNotMatch(landing, /Fraunces|Source Sans|#c45c26|#f3ebe0|#12201f/);
  assert.match(landing, /mailto:/);
  assert.doesNotMatch(landing, /\/api\/tenant\/intake/);
  assert.doesNotMatch(landing, /High-net-worth|budget/);
});

test('seed refreshes website_draft via landing content version', () => {
  const seed = read('lib/server/cipc-desk-preview-seed.js');
  assert.match(seed, /CIPC_DESK_LANDING_CONTENT_VERSION/);
  assert.match(seed, /buildCipcDeskWebsiteDraftForLanding/);
  assert.match(seed, /website_draft_refreshed/);
  assert.match(seed, /draftOk/);
});

test('tenant boundary: standing hosts remain cipc-desk; Lux/Core unchanged', () => {
  assert.equal(resolveCipcDeskTenantIdFromHost('cipc.corpflowai.com'), CIPCDESK_TENANT_ID);
  assert.equal(resolveCipcDeskTenantIdFromHost('cipc-desk.corpflowai.com'), CIPCDESK_TENANT_ID);
  assert.equal(resolveCipcDeskTenantIdFromHost('lux.corpflowai.com'), null);
  assert.equal(resolveCipcDeskTenantIdFromHost('core.corpflowai.com'), null);
  const indexSrc = read('pages/index.js');
  assert.doesNotMatch(indexSrc, /tenant_id === ['"]luxe-maurice['"].*CipcDeskLanding/s);
});
