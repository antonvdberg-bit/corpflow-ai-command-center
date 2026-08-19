import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  CIPC_DESK_WEBSITE_DRAFT_VERSION,
  buildCipcDeskWebsiteDraft,
} from '../lib/server/cipc-desk-website-draft.js';
import { resolveCipcDeskTenantIdFromHost } from '../lib/server/cipc-desk-runtime.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('website draft uses CorpFlow palette and content_version refresh marker', () => {
  const draft = buildCipcDeskWebsiteDraft();
  assert.equal(draft.content_version, CIPC_DESK_WEBSITE_DRAFT_VERSION);
  assert.match(
    String(CIPC_DESK_WEBSITE_DRAFT_VERSION),
    /director-changes|beneficial-ownership-link|annual-returns-link|corpflow-visual/,
  );
  assert.equal(draft.theme?.primary, '#2dd4bf');
  assert.equal(draft.theme?.background, '#06111f');
  assert.equal(draft.hero?.title, 'CIPC Desk');
  assert.match(String(draft.hero?.cta_href || ''), /^mailto:/);
  assert.match(String(draft.hero?.cta_secondary_href || ''), /^mailto:/);
  assert.ok(Array.isArray(draft.sections?.services?.items));
  assert.ok(draft.sections.services.items.length >= 6);
  assert.equal(draft.media?.visual_key, 'process');
  assert.match(String(draft.media?.hero_image_url || ''), /corpflow-process-hero/);
  // No invented fee / guarantee language in catalogue intro.
  const blob = JSON.stringify(draft);
  assert.doesNotMatch(blob, /guaranteed revenue|we will file within|official CIPC partner/i);
  assert.match(blob, /provisional|validated by Serah/i);
});

test('landing component reuses CorpFlow photo+glass shell and CIPC branding', () => {
  const landing = readFileSync(join(root, 'components/CipcDeskLanding.js'), 'utf8');
  assert.match(landing, /PublicMarketingPhotoGlassShell/);
  assert.match(landing, /HeroGlassBlock/);
  assert.match(landing, /GlassCardGrid/);
  assert.match(landing, /corpflow-public-styles/);
  assert.match(landing, /buildPublicVisualHero/);
  assert.match(landing, /CIPC Desk/);
  assert.doesNotMatch(landing, /Fraunces|Source Sans|#f3ebe0|#c45c26/);
  assert.doesNotMatch(landing, /\/api\/tenant\/intake/);
  assert.match(landing, /mailto:/);
  assert.match(landing, /noindex/);
});

test('pages/index wires CipcDeskLanding only for tenant_id cipc-desk', () => {
  const indexSrc = readFileSync(join(root, 'pages/index.js'), 'utf8');
  assert.match(indexSrc, /import CipcDeskLanding from/);
  assert.match(indexSrc, /safeStr\(site\?\.tenant_id\) === 'cipc-desk'/);
  assert.match(indexSrc, /<CipcDeskLanding site=\{site\} \/>/);
  // Lux branch remains separate.
  assert.match(indexSrc, /lux_acquisition/);
  assert.match(indexSrc, /RareExclusiveTenantPresentation/);
});

test('tenant boundary: standing hosts stay cipc-desk; lux/core do not', () => {
  assert.equal(resolveCipcDeskTenantIdFromHost('cipc.corpflowai.com'), 'cipc-desk');
  assert.equal(resolveCipcDeskTenantIdFromHost('cipc-desk.corpflowai.com'), 'cipc-desk');
  assert.equal(resolveCipcDeskTenantIdFromHost('lux.corpflowai.com'), null);
  assert.equal(resolveCipcDeskTenantIdFromHost('core.corpflowai.com'), null);
});

test('seed module re-exports draft builder and refreshes by content_version', () => {
  const seed = readFileSync(join(root, 'lib/server/cipc-desk-preview-seed.js'), 'utf8');
  assert.match(seed, /CIPC_DESK_WEBSITE_DRAFT_VERSION/);
  assert.match(seed, /buildCipcDeskWebsiteDraft/);
  assert.match(seed, /website_draft_refreshed/);
  assert.match(seed, /draftOk/);
});
