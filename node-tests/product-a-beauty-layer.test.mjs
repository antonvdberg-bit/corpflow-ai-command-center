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

const COMPONENT = read('components/ProductAUsClinicLanding.js');

/**
 * These are static (text) guards: the Product A intake is a Phase-1 contract
 * and the Human-First Beauty Layer is a presentation-only change. This suite
 * fails loudly if the restyle ever drifts the intake contract, removes the
 * required fields, weakens the primary CTA, or smuggles in a forbidden
 * integration. It does not import the JSX (node cannot parse it) — it asserts
 * on the source text, which is sufficient to catch contract drift in review.
 */
describe('Product A beauty layer — intake contract is preserved', () => {
  it('keeps every form field name unchanged', () => {
    for (const name of [
      'clinic_name',
      'website',
      'contact_name',
      'email',
      'phone',
      'city_state',
      'biggest_problem',
    ]) {
      assert.ok(COMPONENT.includes(`name="${name}"`), `missing field name="${name}"`);
    }
  });

  it('keeps the EMPTY_FORM shape', () => {
    assert.match(COMPONENT, /const EMPTY_FORM = \{/);
    for (const key of [
      'clinic_name:',
      'website:',
      'contact_name:',
      'email:',
      'phone:',
      'city_state:',
      'biggest_problem:',
    ]) {
      assert.ok(COMPONENT.includes(key), `EMPTY_FORM missing ${key}`);
    }
  });

  it('keeps required + type attributes on the contract fields', () => {
    // 6 required fields (phone is the only optional one).
    const requiredCount = (COMPONENT.match(/\brequired\b/g) || []).length;
    assert.ok(requiredCount >= 6, `expected >= 6 required attributes, found ${requiredCount}`);
    assert.ok(COMPONENT.includes('type="url"'), 'website must stay type=url');
    assert.ok(COMPONENT.includes('type="email"'), 'email must stay type=email');
    assert.ok(COMPONENT.includes('type="tel"'), 'phone must stay type=tel');
  });

  it('keeps the POST target, method, headers, and body unchanged', () => {
    assert.ok(COMPONENT.includes("fetch('/api/product-a/intake'"), 'intake POST target changed');
    assert.ok(COMPONENT.includes("method: 'POST'"), 'method changed');
    assert.ok(COMPONENT.includes("'Content-Type': 'application/json'"), 'content-type changed');
    assert.ok(COMPONENT.includes('body: JSON.stringify(payload)'), 'body changed');
    // exactly one network call on this page
    const fetchCount = (COMPONENT.match(/fetch\(/g) || []).length;
    assert.equal(fetchCount, 1, `expected exactly 1 fetch(), found ${fetchCount}`);
  });

  it('keeps submitAuditRequest and updateField intact', () => {
    assert.match(COMPONENT, /async function submitAuditRequest\(e\) \{/);
    assert.match(COMPONENT, /function updateField\(name, value\) \{/);
  });

  it('keeps the existing intake submit event contract', () => {
    for (const ev of [
      'pa_intake_submit_attempt',
      'pa_intake_submit_success',
      'pa_intake_submit_error',
    ]) {
      assert.ok(COMPONENT.includes(`'${ev}'`), `missing existing event ${ev}`);
    }
  });

  it('only adds the additive Plausible events specified in the packet', () => {
    assert.ok(COMPONENT.includes("'pa_cta_click'"), 'pa_cta_click should be present');
    assert.ok(COMPONENT.includes("'pa_intake_start'"), 'pa_intake_start should be present');
    // additive events must not pass PII props — only categorical labels.
    assert.ok(!/pa_cta_click[\s\S]{0,80}(email|phone|name)/i.test(COMPONENT), 'CTA event must not carry PII');
  });

  it('keeps the conversion message and no-guarantee line', () => {
    assert.ok(COMPONENT.includes('Request a Website &amp; Lead Rescue Audit'));
    assert.ok(COMPONENT.includes('We do not guarantee new revenue.'));
    assert.ok(COMPONENT.includes('No payment on this page.'));
  });

  it('does not paint an opaque page background over the photo layer (visibility regression guard)', () => {
    // The page must form a stacking context and must NOT set an opaque
    // background on the .pa-page element — that bug (PR #450) painted #06111f
    // above the fixed photo and produced a flat black layout.
    assert.ok(COMPONENT.includes("isolation: 'isolate'"), 'page must form a stacking context via isolation');
    const pageStyle = COMPONENT.match(/page:\s*\{[\s\S]*?\n  \}/);
    assert.ok(pageStyle, 'page style block not found');
    assert.ok(
      !/background:\s*'#06111f'/.test(pageStyle[0]),
      'page must not set an opaque #06111f background over the photo layer',
    );
    // photo/scrim must render below the content (explicit non-negative order).
    assert.ok(COMPONENT.includes('zIndex={0}'), 'photo background should be zIndex 0');
    assert.ok(COMPONENT.includes('zIndex={1}'), 'scrim should be zIndex 1');
  });

  it('keeps the primary CTA a solid (non-translucent) fill', () => {
    assert.match(COMPONENT, /primary:\s*\{\s*background:\s*'#2dd4bf'/);
    // the primary style object must not introduce blur/translucency.
    const primaryDecl = COMPONENT.match(/primary:\s*\{[^}]*\}/);
    assert.ok(primaryDecl, 'primary style not found');
    assert.ok(!/backdropFilter/.test(primaryDecl[0]), 'primary CTA must not be glass/translucent');
    assert.ok(!/rgba\(/.test(primaryDecl[0]), 'primary CTA must use a solid colour');
  });

  it('does not introduce forbidden integrations', () => {
    const lower = COMPONENT.toLowerCase();
    for (const bad of ['twilio', 'sendgrid', 'gohighlevel', 'openai', 'anthropic', 'localstorage']) {
      assert.ok(!lower.includes(bad), `forbidden token present: ${bad}`);
    }
  });
});

describe('Product A beauty layer — governed hero asset', () => {
  const HERO_BASE = 'public/assets/product-a/product-a-hero-medspa-v1';

  it('ships the governed medspa hero derivatives referenced by the component', () => {
    assert.ok(
      COMPONENT.includes('/assets/product-a/product-a-hero-medspa-v1'),
      'component should reference the medspa hero asset base',
    );
    // responsive picture: desktop (2400w) + mobile (1280w) in AVIF/WebP/JPG.
    for (const rel of [
      `${HERO_BASE}.jpg`,
      `${HERO_BASE}.webp`,
      `${HERO_BASE}.avif`,
      `${HERO_BASE}-1280.jpg`,
      `${HERO_BASE}-1280.webp`,
      `${HERO_BASE}-1280.avif`,
    ]) {
      assert.ok(existsSync(path.join(REPO_ROOT, rel)), `missing hero derivative: ${rel}`);
    }
    // the temporary placeholder must be fully swapped out of the runtime.
    assert.ok(
      !COMPONENT.includes('hero-clinic-placeholder'),
      'placeholder must be removed from the component',
    );
    assert.ok(
      !existsSync(path.join(REPO_ROOT, 'public/assets/product-a/hero-clinic-placeholder.svg')),
      'retired placeholder SVG should no longer ship under public/',
    );
  });

  it('has a valid, no-PII medspa hero manifest with provenance + replacement note', () => {
    const manifest = JSON.parse(read('data/visual-assets/product-a-hero-medspa.manifest.json'));
    const result = validateVisualAssetManifest(manifest, { source: 'product-a-hero-medspa.manifest.json' });
    assert.deepEqual(result.errors, []);
    assert.equal(result.ok, true);
    assert.equal(manifest.surface, 'product-a');
    assert.equal(manifest.lifecycle.state, 'draft');
    assert.match(manifest.usage.notes, /REPLACEMENT/);
    // provenance must record where the source came from (no PII, public Drive URL).
    const json = JSON.stringify(manifest);
    assert.match(json, /product-a-hero-medspa-source\.jpg/);
    assert.match(json, /drive\.google\.com/);
  });

  it('retires the superseded placeholder manifest cleanly', () => {
    const retired = JSON.parse(read('data/visual-assets/product-a-hero-clinic.manifest.json'));
    const result = validateVisualAssetManifest(retired, { source: 'product-a-hero-clinic.manifest.json' });
    assert.deepEqual(result.errors, []);
    assert.equal(retired.lifecycle.state, 'retired');
  });
});
