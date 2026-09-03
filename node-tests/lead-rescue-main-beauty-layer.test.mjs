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

const COMPONENT = read('components/EnquiryRecoveryCampaignPage.js');
const SHELL = read('components/beauty/PublicMarketingPhotoGlassShell.js');

/**
 * Static (source-text) guards for the dark photo+glass conversion of the main
 * AI Lead Rescue page. Setup CTAs must route to the canonical enquiry form
 * (#822). This suite fails loudly if the restyle drifts the single-offer copy,
 * the governed mid-page slots, or smuggles in a forbidden integration.
 */
describe('Enquiry Recovery campaign — diagnosis CTA', () => {
  it('routes primary CTAs to the in-page diagnosis form and keeps contact fallback', () => {
    assert.ok(COMPONENT.includes("from '../lib/public/canonical-enquiry.js'"), 'missing canonical enquiry import');
    assert.ok(COMPONENT.includes('LEAD_RESCUE_ENQUIRY_HREF'), 'missing canonical href constant');
    assert.ok(COMPONENT.includes('Request a 15-minute diagnosis'), 'missing primary buyer-action CTA');
    assert.ok(COMPONENT.includes('data-testid="lead-rescue-canonical-cta"'), 'canonical CTA testid missing');
    assert.ok(!COMPONENT.includes("fetch('/api/tenant/intake'"), 'embedded intake POST must stay on DiscoveryIntakeForm');
    assert.ok(!/async function submitLead\(e\) \{/.test(COMPONENT), 'submitLead must not return');
  });

  it('keeps CTA click tracking without a second submit form', () => {
    for (const ev of ['lr_primary_cta_click', 'lr_secondary_cta_click']) {
      assert.ok(COMPONENT.includes(`'${ev}'`), `missing event ${ev}`);
    }
  });

  it('keeps the current commercial offer + no-guarantee copy', () => {
    assert.ok(COMPONENT.includes('ENQUIRY_RECOVERY_PRICE_LINE') || COMPONENT.includes('MUR 85,000'), 'missing current price');
    assert.ok(
      COMPONENT.includes('ENQUIRY_RECOVERY_NO_GUARANTEE_LINE') || COMPONENT.includes('We do not guarantee new revenue.'),
      'missing no-guarantee line',
    );
    assert.ok(COMPONENT.includes('Request a 15-minute diagnosis'), 'missing primary buyer-action CTA');
    assert.ok(COMPONENT.includes('Built by a Mauritius-based operating-systems team.'), 'missing provenance line');
    assert.ok(!/USD 150/i.test(COMPONENT), 'historic USD 150 must not appear');
    assert.ok(!/\/month|per month|monthly fee/i.test(COMPONENT), 'must not publish a monthly figure');
  });

  it('ships a concise FAQ for the Enquiry Recovery Sprint', () => {
    assert.ok(COMPONENT.includes("id=\"faq\""), 'FAQ section id missing');
    assert.ok(COMPONENT.includes('Is this a CRM, chatbot, or marketing package?'), 'FAQ CRM question missing');
    assert.ok(COMPONENT.includes('Do you guarantee recovered revenue?'), 'FAQ guarantee question missing');
  });

  it('keeps payment trust copy and does not use window.alert', () => {
    assert.ok(!/\balert\s*\(/.test(COMPONENT), 'must not use window.alert for intake feedback');
    assert.ok(COMPONENT.includes('No payment is taken on this page'), 'missing payment trust copy');
  });

  it('does not introduce forbidden integrations', () => {
    const lower = COMPONENT.toLowerCase();
    for (const bad of ['twilio', 'sendgrid', 'gohighlevel', 'openai', 'anthropic', 'localstorage', 'stripe']) {
      assert.ok(!lower.includes(bad), `forbidden token present: ${bad}`);
    }
  });
});

describe('Enquiry Recovery campaign — dark photo+glass + governed slots', () => {
  it('renders on the shared PublicMarketingPhotoGlassShell with the spa hero', () => {
    assert.ok(
      COMPONENT.includes("import PublicMarketingPhotoGlassShell from './beauty/PublicMarketingPhotoGlassShell.js'"),
      'should import the shared shell',
    );
    assert.ok(COMPONENT.includes('<PublicMarketingPhotoGlassShell'), 'should render the shared shell');
    assert.ok(COMPONENT.includes('/assets/visuals/lead-rescue-spa-sunset-hero-v1'), 'should reference the governed spa hero');
  });

  it('keeps OG/social meta', () => {
    assert.ok(COMPONENT.includes('og:image'), 'OG image meta dropped');
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
