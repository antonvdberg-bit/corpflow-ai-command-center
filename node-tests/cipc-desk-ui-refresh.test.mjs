import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  CIPC_DESK_WEBSITE_DRAFT_VERSION,
  buildCipcDeskWebsiteDraft,
} from '../lib/server/cipc-desk-website-draft.js';
import {
  isBusinessAdminDeskPublicHost,
  resolveCipcDeskTenantIdFromHost,
} from '../lib/server/cipc-desk-runtime.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('website draft uses CorpFlow palette and content_version refresh marker', () => {
  const draft = buildCipcDeskWebsiteDraft();
  assert.equal(draft.content_version, CIPC_DESK_WEBSITE_DRAFT_VERSION);
  assert.match(
    String(CIPC_DESK_WEBSITE_DRAFT_VERSION),
    /director-changes|beneficial-ownership-link|annual-returns-link|corpflow-visual|partner-funnel/,
  );
  assert.equal(draft.theme?.primary, '#2dd4bf');
  assert.equal(draft.theme?.background, '#06111f');
  assert.equal(draft.hero?.title, 'Business Admin Desk');
  assert.equal(draft.meta?.page_title, 'Business Admin Desk · Company administration support');
  assert.doesNotMatch(String(draft.meta?.description || ''), /CIPC/i);
  assert.match(String(draft.meta?.description || ''), /regulatory administration/);
  assert.match(String(draft.hero?.cta_href || ''), /^mailto:/);
  assert.equal(draft.hero?.cta_secondary_href, '/partners');
  assert.ok(Array.isArray(draft.sections?.services?.items));
  assert.ok(draft.sections.services.items.length >= 6);
  assert.equal(draft.media?.visual_key, 'process');
  assert.match(String(draft.media?.hero_image_url || ''), /corpflow-process-hero/);
  // No invented fee / guarantee language in catalogue intro.
  const blob = JSON.stringify(draft);
  assert.doesNotMatch(blob, /guaranteed revenue|we will file within|official CIPC partner/i);
  assert.match(blob, /provisional|validated by Serah/i);
});

test('landing wrapper serves approved video-first landing on internal and public hosts', () => {
  const landing = readFileSync(join(root, 'components/CipcDeskLanding.js'), 'utf8');
  assert.match(landing, /BusinessAdminDeskPublicLanding/);
  assert.match(landing, /isPublicProduction/);
  assert.match(landing, /!isPublicProduction/);
  assert.match(landing, /internalReview/);
  assert.match(landing, /return <BusinessAdminDeskPublicLanding \/>;/);
  assert.match(landing, /PublicMarketingPhotoGlassShell/);
  assert.doesNotMatch(landing, /Email your CIPC matter/i);
  assert.doesNotMatch(landing, /CIPC Desk/);
});

test('public Business Admin Desk landing is concise, video-first and serves direct plus partner audiences', () => {
  const landing = readFileSync(join(root, 'components/BusinessAdminDeskPublicLanding.js'), 'utf8');
  assert.match(landing, /<iframe/);
  assert.match(landing, /app\.heygen\.com\/embeds\/24cebb01a1b240158c77771c103542da/);
  assert.match(landing, /Business Admin Desk — Clear Company Administration/);
  assert.match(landing, /You run the business\. We help with the administration\./);
  assert.match(landing, /For individual businesses/);
  assert.match(landing, /For companies and service providers/);
  assert.match(landing, /White-label or fractional admin capacity/);
  assert.match(landing, /Discuss white-label \/ fractional support/);
  assert.match(landing, /Tell us what you need help with/);
  assert.match(landing, /index,follow/);
  assert.match(landing, /businessadmindesk\.co\.za/);
  assert.doesNotMatch(landing, /\bCIPC\b/i);
  assert.doesNotMatch(landing, /CIPC Desk/i);
});


test('candidate landing supports internal noindex review mode', () => {
  const landing = readFileSync(join(root, 'components/BusinessAdminDeskPublicLanding.js'), 'utf8');
  assert.match(landing, /internalReview/);
  assert.match(landing, /noindex,nofollow/);
  assert.match(landing, /Internal review · not published/);
});



test('Business Admin Desk CTA is email-primary with a low-friction webmail fallback', () => {
  const actions = readFileSync(join(root, 'components/BusinessAdminDeskContactActions.js'), 'utf8');
  const landing = readFileSync(join(root, 'components/BusinessAdminDeskPublicLanding.js'), 'utf8');
  const service = readFileSync(join(root, 'components/BusinessAdminDeskServiceLanding.js'), 'utf8');
  const partner = readFileSync(join(root, 'components/BusinessAdminDeskPartnerLanding.js'), 'utf8');

  assert.match(actions, /mailto:/);
  assert.match(actions, /Opens an email with a short starter message/);
  assert.match(actions, /Prefer webmail/);
  assert.match(actions, /Copy our email address/);
  assert.match(landing, /Tell us what's going on/);
  assert.match(service, /Ask us about your Annual Returns/);
  assert.match(service, /Tell us about the director change/);
  assert.match(service, /Ask us about your ownership filing/);
  assert.match(partner, /Discuss white-label \/ fractional support/);
  assert.doesNotMatch(actions, /fetch\(|\/api\//);
});

test('Annual Returns candidate embeds the approved HeyGen explainer and keeps the CTA close to it', () => {
  const service = readFileSync(join(root, 'components/BusinessAdminDeskServiceLanding.js'), 'utf8');
  assert.match(service, /75869385e41a4d33abb8f151daded446/);
  assert.match(service, /Annual Returns — without the admin headache/);
  assert.match(service, /videoEmbedUrl/);
  assert.match(service, /BusinessAdminDeskContactActions/);
  assert.match(service, /Even if your company is dormant or not trading, Annual Return filing and other statutory obligations may still apply\./);
});

test('service-page candidate pattern is concise, regulator-neutral and review-capable', () => {
  const service = readFileSync(join(root, 'components/BusinessAdminDeskServiceLanding.js'), 'utf8');
  assert.match(service, /Annual Returns/);
  assert.match(service, /Director Changes/);
  assert.match(service, /Beneficial Ownership/);
  assert.match(service, /Ask us about your Annual Returns/);
  assert.match(service, /Need white-label \/ fractional support/);
  assert.match(service, /internalReview/);
  assert.match(service, /noindex,nofollow/);
  assert.doesNotMatch(service, /\bCIPC\b/i);
});

test('partner candidate is concise, white-label focused and regulator-neutral', () => {
  const partner = readFileSync(join(root, 'components/BusinessAdminDeskPartnerLanding.js'), 'utf8');
  assert.match(partner, /Specialist company-administration capacity behind your firm/);
  assert.match(partner, /white-label or fractional capacity/i);
  assert.match(partner, /Accounting and tax firms/);
  assert.match(partner, /professional-service firms/i);
  assert.match(partner, /internalReview/);
  assert.match(partner, /noindex,nofollow/);
  assert.doesNotMatch(partner, /\bCIPC\b/i);
});

test('four internal routes stage candidate copy while preserving detailed review through specialist flag', () => {
  const routes = [
    ['pages/annual-returns.js', 'annual-returns'],
    ['pages/director-changes.js', 'director-changes'],
    ['pages/beneficial-ownership.js', 'beneficial-ownership'],
    ['pages/partners.js', 'partners'],
  ];

  for (const [file] of routes) {
    const source = readFileSync(join(root, file), 'utf8');
    assert.match(source, /isCipcDeskStandingTestHost/);
    assert.match(source, /specialist/);
    assert.match(source, /stagedPublic/);
  }

  for (const file of ['pages/annual-returns.js', 'pages/director-changes.js', 'pages/beneficial-ownership.js']) {
    const source = readFileSync(join(root, file), 'utf8');
    assert.match(source, /isBusinessAdminDeskPublicHost[\s\S]*redirect/);
  }
});

test('pages/index wires CipcDeskLanding only for tenant_id cipc-desk', () => {
  const indexSrc = readFileSync(join(root, 'pages/index.js'), 'utf8');
  assert.match(indexSrc, /import CipcDeskLanding from/);
  assert.match(indexSrc, /safeStr\(site\?\.tenant_id\) === 'cipc-desk'/);
  assert.match(indexSrc, /<CipcDeskLanding site=\{site\} publicProduction=/);
  // Lux branch remains separate.
  assert.match(indexSrc, /lux_acquisition/);
  assert.match(indexSrc, /RareExclusiveTenantPresentation/);
});

test('tenant boundary: standing hosts stay cipc-desk; lux/core do not', () => {
  assert.equal(resolveCipcDeskTenantIdFromHost('cipc.corpflowai.com'), 'cipc-desk');
  assert.equal(resolveCipcDeskTenantIdFromHost('cipc-desk.corpflowai.com'), 'cipc-desk');
  assert.equal(resolveCipcDeskTenantIdFromHost('businessadmindesk.co.za'), 'cipc-desk');
  assert.equal(resolveCipcDeskTenantIdFromHost('www.businessadmindesk.co.za'), 'cipc-desk');
  assert.equal(isBusinessAdminDeskPublicHost('businessadmindesk.co.za'), true);
  assert.equal(isBusinessAdminDeskPublicHost('cipc.corpflowai.com'), false);
  assert.equal(resolveCipcDeskTenantIdFromHost('lux.corpflowai.com'), null);
  assert.equal(resolveCipcDeskTenantIdFromHost('core.corpflowai.com'), null);
});

test('client-facing Business Admin Desk sources do not retain the former display brand', () => {
  const clientFacingFiles = [
    'components/CipcDeskLanding.js',
    'components/CipcDeskAnnualReturnsReview.js',
    'components/CipcDeskDirectorChangesReview.js',
    'components/CipcDeskBeneficialOwnershipReview.js',
    'components/CipcDeskPartnerFunnel.js',
    'lib/server/cipc-desk-website-draft.js',
    'lib/cipc-desk/annual-returns-review.js',
    'lib/cipc-desk/director-changes-review.js',
    'lib/cipc-desk/beneficial-ownership-review.js',
    'lib/cipc-desk/partner-funnel.js',
  ];

  for (const file of clientFacingFiles) {
    const source = readFileSync(join(root, file), 'utf8');
    assert.doesNotMatch(source, /CIPC Desk/, `${file} must not expose the former display brand`);
  }
});

test('seed module re-exports draft builder and refreshes by content_version', () => {
  const seed = readFileSync(join(root, 'lib/server/cipc-desk-preview-seed.js'), 'utf8');
  assert.match(seed, /CIPC_DESK_WEBSITE_DRAFT_VERSION/);
  assert.match(seed, /buildCipcDeskWebsiteDraft/);
  assert.match(seed, /website_draft_refreshed/);
  assert.match(seed, /draftOk/);
});

test('website draft declares CIPC_DESK_WEBSITE_DRAFT_VERSION exactly once', () => {
  const src = readFileSync(join(root, 'lib/server/cipc-desk-website-draft.js'), 'utf8');
  const declarations = src.match(/export const CIPC_DESK_WEBSITE_DRAFT_VERSION/g) || [];
  assert.equal(declarations.length, 1);
  assert.match(
    src,
    /director-changes.*beneficial-ownership-link.*partner-funnel|partner-funnel/,
  );
});
