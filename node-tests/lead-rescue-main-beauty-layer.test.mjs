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
 * AI Lead Rescue page. Setup CTAs must route to the canonical enquiry form
 * (#822). This suite fails loudly if the restyle drifts the single-offer copy,
 * the governed mid-page slots, or smuggles in a forbidden integration.
 */
describe('AI Lead Rescue main page — canonical enquiry CTA', () => {
  it('routes setup CTAs to the locked Lead Rescue enquiry URL', () => {
    assert.ok(COMPONENT.includes("from '../lib/public/canonical-enquiry.js'"), 'missing canonical enquiry import');
    assert.ok(COMPONENT.includes('LEAD_RESCUE_ENQUIRY_HREF'), 'missing canonical href constant');
    assert.ok(COMPONENT.includes('/contact?offer=ai-lead-rescue#discovery') || COMPONENT.includes('LEAD_RESCUE_ENQUIRY_HREF'), 'missing canonical CTA');
    assert.ok(COMPONENT.includes('data-testid="lead-rescue-canonical-cta"'), 'canonical CTA testid missing');
    assert.ok(COMPONENT.includes('Start my 48-hour setup'), 'missing primary buyer-action CTA');
    assert.ok(!COMPONENT.includes("fetch('/api/tenant/intake'"), 'embedded intake POST must be removed');
    assert.ok(!/async function submitLead\(e\) \{/.test(COMPONENT), 'submitLead must be removed');
    assert.ok(!COMPONENT.includes('name="lead_sources"'), 'embedded lead_sources field must be removed');
    assert.ok(!COMPONENT.includes('data-testid="lead-rescue-intake-success"'), 'inline intake success panel must be removed');
  });

  it('keeps CTA click tracking without a second submit form', () => {
    for (const ev of ['lr_primary_cta_click', 'lr_secondary_cta_click']) {
      assert.ok(COMPONENT.includes(`'${ev}'`), `missing event ${ev}`);
    }
    assert.ok(!COMPONENT.includes("'lr_intake_submit_attempt'"), 'intake submit attempt should no longer fire from this page');
    assert.ok(!COMPONENT.includes("'lr_intake_submit_success'"), 'intake submit success should no longer fire from this page');
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

  it('ships a concise FAQ for the USD 150 pilot (not MUR sprint)', () => {
    assert.ok(COMPONENT.includes("id=\"faq\""), 'FAQ section id missing');
    assert.ok(COMPONENT.includes('LEAD_RESCUE_FAQ'), 'FAQ constant missing');
    assert.ok(COMPONENT.includes('Is this a CRM or chatbot?'), 'FAQ CRM question missing');
    assert.ok(COMPONENT.includes('Do you guarantee more sales or more leads?'), 'FAQ guarantee question missing');
    assert.ok(!/AI Lead Rescue Sprint/i.test(COMPONENT), 'must not brand the primary page as Sprint');
  });

  it('keeps payment trust copy and does not use window.alert', () => {
    assert.ok(!/\balert\s*\(/.test(COMPONENT), 'must not use window.alert for intake feedback');
    assert.ok(
      COMPONENT.includes(
        'Payment is handled after intake review. You do not enter card or banking details on this page. We send a USD invoice through the agreed route after we confirm scope.',
      ),
      'missing doctrine payment trust copy',
    );
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
