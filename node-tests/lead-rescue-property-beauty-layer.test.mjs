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

const COMPONENT = read('components/AiLeadRescuePropertyMauritiusLanding.js');
const SHELL = read('components/beauty/PublicMarketingPhotoGlassShell.js');

/**
 * Static (source-text) guards for the dark photo+glass conversion of the
 * Mauritius property page. The intake is a live `/api/tenant/intake` contract
 * and the Human-First Beauty Layer change is presentation-only; this suite
 * fails loudly if the restyle ever drifts the intake contract, the AI Lead
 * Rescue meta fields, the required doctrine copy, or smuggles in a forbidden
 * integration. It asserts on the source text (node cannot parse JSX), which is
 * sufficient to catch contract drift in review.
 */
describe('Mauritius property page — intake contract is preserved', () => {
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
    assert.ok(COMPONENT.includes("lead_rescue_variant: 'property-mauritius'"), 'lead_rescue_variant changed');
    assert.ok(COMPONENT.includes('property_segments: propertySegments'), 'property_segments array dropped');
    assert.ok(
      COMPONENT.includes("property_segment: propertySegments.length === 1 ? propertySegments[0] : 'multiple'"),
      'legacy property_segment derivation changed',
    );
    assert.ok(COMPONENT.includes("page: '/lead-rescue/property-mauritius'"), 'meta.page changed');
  });

  it('keeps every form field name unchanged', () => {
    for (const name of ['business_name', 'property_segment', 'name', 'email', 'phone', 'lead_sources', 'message']) {
      assert.ok(COMPONENT.includes(`name="${name}"`), `missing field name="${name}"`);
    }
    assert.ok(COMPONENT.includes('type="email"'), 'email must stay type=email');
    assert.ok(COMPONENT.includes('type="checkbox"'), 'segment checkboxes must remain');
  });

  it('keeps submitLead and the multi-select guard intact', () => {
    assert.match(COMPONENT, /async function submitLead\(e\) \{/);
    assert.ok(
      COMPONENT.includes("fd.getAll('property_segment')"),
      'must keep multi-select getAll(property_segment)',
    );
    assert.ok(
      COMPONENT.includes('Please select at least one property segment'),
      'must keep the at-least-one-segment guard',
    );
  });

  it('keeps the intake event contract', () => {
    for (const ev of [
      'lr_property_intake_submit_attempt',
      'lr_property_intake_submit_success',
      'lr_property_primary_cta_click',
      'lr_property_secondary_cta_click',
    ]) {
      assert.ok(COMPONENT.includes(`'${ev}'`), `missing event ${ev}`);
    }
  });

  it('keeps the required doctrine copy verbatim', () => {
    assert.ok(COMPONENT.includes('We do not replace WhatsApp Business.'), 'missing WhatsApp line');
    assert.ok(
      COMPONENT.includes('We do not guarantee new revenue. We help make sure existing enquiries are captured, visible, and followed up.'),
      'missing no-guarantee line',
    );
    assert.ok(COMPONENT.includes('Request the Mauritius property pilot outline'), 'missing buyer-action CTA');
    assert.ok(COMPONENT.includes('USD 150'), 'missing single-offer pilot price');
    assert.ok(COMPONENT.includes('invoiced as the MUR equivalent'), 'missing MUR local-pro-forma framing');
  });

  it('does not introduce forbidden integrations', () => {
    const lower = COMPONENT.toLowerCase();
    for (const bad of ['twilio', 'sendgrid', 'gohighlevel', 'openai', 'anthropic', 'localstorage', 'stripe']) {
      assert.ok(!lower.includes(bad), `forbidden token present: ${bad}`);
    }
  });
});

describe('Mauritius property page — dark photo+glass system', () => {
  it('renders on the shared PublicMarketingPhotoGlassShell', () => {
    assert.ok(
      COMPONENT.includes("import PublicMarketingPhotoGlassShell from './beauty/PublicMarketingPhotoGlassShell.js'"),
      'should import the shared shell',
    );
    assert.ok(COMPONENT.includes('<PublicMarketingPhotoGlassShell'), 'should render the shared shell');
    assert.ok(COMPONENT.includes('/assets/visuals/lead-rescue-property-reception-hero-v1'), 'should reference the governed reception hero');
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
    assert.ok(SHELL.includes('<PhotoBackground'), 'shell must render PhotoBackground');
    assert.ok(SHELL.includes('<Scrim'), 'shell must render Scrim');
    // shell must not paint an opaque background on the page wrapper (PR #450 regression guard)
    assert.ok(!/background:\s*'#06111f'/.test(SHELL), 'shell must not set an opaque page background over the photo');
  });
});

describe('Mauritius property page — governed hero asset', () => {
  const HERO_BASE = 'public/assets/visuals/lead-rescue-property-reception-hero-v1';

  it('ships the responsive reception hero derivatives referenced by the component', () => {
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
    // the uncommitted source must not ship
    assert.ok(
      !existsSync(path.join(REPO_ROOT, 'public/assets/visuals/lead-rescue-property-reception-hero-source.jpg')),
      'the large source image must not be committed',
    );
  });

  it('has a valid, no-PII reception hero manifest with provenance + replacement note', () => {
    const manifest = JSON.parse(read('data/visual-assets/lead-rescue-property-reception-hero.manifest.json'));
    const result = validateVisualAssetManifest(manifest, { source: 'lead-rescue-property-reception-hero.manifest.json' });
    assert.deepEqual(result.errors, []);
    assert.equal(result.ok, true);
    assert.equal(manifest.surface, 'lead-rescue');
    assert.equal(manifest.lifecycle.state, 'draft');
    assert.match(manifest.usage.notes, /REPLACEMENT/);
    assert.match(manifest.provenance.verification_status, /DRAFT/);
    // AI-generated provenance must be declared (licence tier + prompt_provenance).
    assert.equal(manifest.licence.tier, 'ai_generated');
    assert.ok(manifest.prompt_provenance && typeof manifest.prompt_provenance.prompt_id === 'string');
  });
});
