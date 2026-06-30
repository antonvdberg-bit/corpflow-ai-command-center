import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { validateVisualAssetManifest } from '../lib/visualAssets/schema.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

const COMPONENT = read('components/AiLeadRescueLanding.js');
const SHELL = read('components/beauty/PublicMarketingPhotoGlassShell.js');

/**
 * Static (source-text) guards for the dark photo+glass conversion of the main
 * AI Lead Rescue page. The intake is a live `/api/tenant/intake` contract and
 * the Human-First Beauty Layer change is presentation-only; this suite fails
 * loudly if the restyle ever drifts the intake contract, the single-offer copy,
 * the governed mid-page slots, or smuggles in a forbidden integration.
 */
describe('AI Lead Rescue main page — intake contract is preserved', () => {
  it('keeps the POST target, method, headers, and body unchanged', () => {
    assert.ok(COMPONENT.includes("fetch('/api/tenant/intake'"), 'intake POST target changed');
    assert.ok(COMPONENT.includes("method: 'POST'"), 'method changed');
    assert.ok(COMPONENT.includes("'Content-Type': 'application/json'"), 'content-type changed');
    assert.ok(COMPONENT.includes('body: JSON.stringify(payload)'), 'body changed');
    const fetchCount = (COMPONENT.match(/fetch\(/g) || []).length;
    assert.equal(fetchCount, 1, `expected exactly 1 fetch(), found ${fetchCount}`);
  });

  it('keeps the AI Lead Rescue meta contract', () => {
    assert.ok(COMPONENT.includes("product: 'ai-lead-rescue'"), 'meta.product must stay ai-lead-rescue');
    assert.ok(COMPONENT.includes('business_name:'), 'meta.business_name dropped');
    assert.ok(COMPONENT.includes('lead_sources:'), 'meta.lead_sources dropped');
    assert.ok(COMPONENT.includes("page: '/lead-rescue'"), 'meta.page must stay /lead-rescue');
  });

  it('keeps every form field name unchanged', () => {
    for (const name of ['business_name', 'name', 'email', 'phone', 'lead_sources', 'message']) {
      assert.ok(COMPONENT.includes(`name="${name}"`), `missing field name="${name}"`);
    }
    assert.ok(COMPONENT.includes('type="email"'), 'email must stay type=email');
  });

  it('keeps submitLead intact', () => {
    assert.match(COMPONENT, /async function submitLead\(e\) \{/);
  });

  it('keeps the intake event contract', () => {
    for (const ev of [
      'lr_intake_submit_attempt',
      'lr_intake_submit_success',
      'lr_primary_cta_click',
      'lr_secondary_cta_click',
    ]) {
      assert.ok(COMPONENT.includes(`'${ev}'`), `missing event ${ev}`);
    }
  });

  it('keeps the single-offer + no-guarantee copy verbatim', () => {
    assert.ok(COMPONENT.includes('USD 150 launch pilot'), 'missing single-offer pilot price');
    assert.ok(
      COMPONENT.includes('We do not guarantee new revenue.'),
      'missing no-guarantee line',
    );
    assert.ok(COMPONENT.includes('Start my 48-hour setup'), 'missing primary buyer-action CTA');
    assert.ok(COMPONENT.includes('Built by a Mauritius-based operating-systems team.'), 'missing provenance line');
    // single-offer rule: no monthly continuation figure leaks onto the page
    assert.ok(!/\/month|per month|monthly fee/i.test(COMPONENT), 'must not publish a monthly figure');
  });

  it('does not introduce forbidden integrations', () => {
    const lower = COMPONENT.toLowerCase();
    for (const bad of ['twilio', 'sendgrid', 'gohighlevel', 'openai', 'anthropic', 'localstorage', 'stripe']) {
      assert.ok(!lower.includes(bad), `forbidden token present: ${bad}`);
    }
  });
});

describe('AI Lead Rescue main page — dark photo+glass + governed slots', () => {
  it('renders on the shared PublicMarketingPhotoGlassShell with the spa hero', () => {
    assert.ok(
      COMPONENT.includes("import PublicMarketingPhotoGlassShell from './beauty/PublicMarketingPhotoGlassShell.js'"),
      'should import the shared shell',
    );
    assert.ok(COMPONENT.includes('<PublicMarketingPhotoGlassShell'), 'should render the shared shell');
    assert.ok(COMPONENT.includes('/assets/visuals/lead-rescue-spa-sunset-hero-v1'), 'should reference the governed spa hero');
  });

  it('keeps the governed mid-page visual slots', () => {
    assert.ok(COMPONENT.includes("import VisualAssetRenderer"), 'should keep the governed renderer');
    assert.ok(COMPONENT.includes('lead_rescue_process'), 'process slot dropped');
    assert.ok(COMPONENT.includes('lead_rescue_dashboard'), 'dashboard slot dropped');
    assert.ok(COMPONENT.includes('lead_rescue_trust_band'), 'trust slot dropped');
    // OG/social meta retained
    assert.ok(COMPONENT.includes('og:image'), 'OG image meta dropped');
    assert.ok(COMPONENT.includes('lead_rescue_social_card'), 'social card slot dropped');
  });

  it('keeps the primary CTA a solid (non-translucent) warm fill', () => {
    const primaryDecl = COMPONENT.match(/primary:\s*\{[^}]*\}/);
    assert.ok(primaryDecl, 'primary style not found');
    assert.ok(/ctaWarm/.test(primaryDecl[0]), 'primary CTA should use the warm action accent token');
    assert.ok(!/backdropFilter/.test(primaryDecl[0]), 'primary CTA must not be glass/translucent');
    const primaryKeys = (COMPONENT.match(/\bprimary:\s*\{/g) || []).length;
    assert.equal(primaryKeys, 1, `expected exactly one primary CTA style, found ${primaryKeys}`);
  });

  it('shell enforces the correct stacking recipe (photo -> scrim -> content)', () => {
    assert.ok(SHELL.includes("isolation: 'isolate'"), 'shell page must form a stacking context');
    assert.ok(SHELL.includes('zIndex={0}'), 'photo background should be zIndex 0');
    assert.ok(SHELL.includes('zIndex={1}'), 'scrim should be zIndex 1');
    assert.ok(SHELL.includes('zIndex: 2'), 'content should sit at zIndex 2');
  });
});

describe('AI Lead Rescue main page — governed hero asset', () => {
  const HERO_BASE = 'public/assets/visuals/lead-rescue-spa-sunset-hero-v1';

  it('ships the responsive spa hero derivatives referenced by the component', () => {
    for (const rel of [
      `${HERO_BASE}.jpg`,
      `${HERO_BASE}.webp`,
      `${HERO_BASE}.avif`,
      `${HERO_BASE}-768.jpg`,
      `${HERO_BASE}-768.webp`,
      `${HERO_BASE}-768.avif`,
    ]) {
      assert.ok(existsSync(path.join(REPO_ROOT, rel)), `missing hero derivative: ${rel}`);
    }
    assert.ok(
      !existsSync(path.join(REPO_ROOT, 'public/assets/visuals/lead-rescue-spa-sunset-hero-source.jpg')),
      'the large source image must not be committed',
    );
  });

  it('has a valid spa hero manifest (draft) with provenance + replacement note', () => {
    const manifest = JSON.parse(read('data/visual-assets/lead-rescue-spa-sunset-hero.manifest.json'));
    const result = validateVisualAssetManifest(manifest, { source: 'lead-rescue-spa-sunset-hero.manifest.json' });
    assert.deepEqual(result.errors, []);
    assert.equal(result.ok, true);
    assert.equal(manifest.surface, 'lead-rescue');
    assert.equal(manifest.lifecycle.state, 'draft', 'spa hero must stay draft so the selector never auto-fills the in-flow hero slot');
    assert.match(manifest.usage.notes, /REPLACEMENT/);
    assert.match(manifest.provenance.verification_status, /DRAFT/);
    assert.equal(manifest.licence.tier, 'ai_generated');
  });

  it('retires the superseded in-flow desk hero manifest cleanly', () => {
    const retired = JSON.parse(read('data/visual-assets/lead-rescue-hero.manifest.json'));
    const result = validateVisualAssetManifest(retired, { source: 'lead-rescue-hero.manifest.json' });
    assert.deepEqual(result.errors, []);
    assert.equal(retired.lifecycle.state, 'retired');
  });
});
