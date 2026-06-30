import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  buildProductAIntakeIdempotencyKey,
  buildProductAIntakePayload,
  PRODUCT_A_MAURITIUS_INTAKE_EVENT_TYPE,
  PRODUCT_A_MAURITIUS_INTAKE_SCHEMA,
  validateProductAMauritiusIntakeBody,
  validateProductAIntakeBody,
} from '../lib/server/product-a-intake-payload.js';
import { validateVisualAssetManifest } from '../lib/visualAssets/schema.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

const COMPONENT = read('components/ProductAMauritiusPropertyLanding.js');

describe('validateProductAMauritiusIntakeBody', () => {
  it('accepts a complete Mauritius property body', () => {
    const result = validateProductAMauritiusIntakeBody({
      market: 'mauritius-property',
      agency_name: 'North Coast Realty',
      website: 'northcoast.example.mu',
      contact_name: 'Marie Duval',
      email: 'Marie@Example.MU',
      phone: '+230 5 123 4567',
      city_region: 'Grand Baie',
      biggest_problem: 'Property24 and WhatsApp leads never meet in one list.',
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.variant, 'mauritius_property');
    assert.equal(result.data.email, 'marie@example.mu');
    assert.equal(result.data.website, 'https://northcoast.example.mu');
  });

  it('rejects US clinic fields without market', () => {
    const result = validateProductAIntakeBody({
      clinic_name: 'Clinic',
      website: 'https://x.com',
      contact_name: 'A',
      email: 'a@b.com',
      city_state: 'TX',
      biggest_problem: 'Problem',
    });
    assert.equal(result.ok, true);
    assert.equal(result.variant, 'us_clinic');
  });

  it('rejects clinic_name when market is mauritius-property', () => {
    const result = validateProductAIntakeBody({
      market: 'mauritius-property',
      clinic_name: 'Wrong',
      website: 'https://x.com',
      contact_name: 'A',
      email: 'a@b.com',
      city_state: 'TX',
      biggest_problem: 'Problem',
    });
    assert.equal(result.ok, false);
  });
});

describe('buildProductAIntakePayload — Mauritius property', () => {
  it('emits the documented Mauritius flat shape', () => {
    const payload = buildProductAIntakePayload(
      {
        agency_name: 'Agency',
        website: 'https://agency.example',
        contact_name: 'Name',
        email: 'name@agency.example',
        phone: null,
        city_region: 'Port Louis',
        biggest_problem: 'Lost viewings',
      },
      { variant: 'mauritius_property', received_at: '2026-06-30T12:00:00.000Z', host: 'corpflowai.com' },
    );

    assert.equal(payload.schema, PRODUCT_A_MAURITIUS_INTAKE_SCHEMA);
    assert.equal(payload.event_type, PRODUCT_A_MAURITIUS_INTAKE_EVENT_TYPE);
    assert.equal(payload.market, 'mauritius-property');
    assert.equal(payload.page, '/product-a/mauritius');
    assert.equal(payload.agency_name, 'Agency');
    assert.equal(payload.city_region, 'Port Louis');
    assert.equal(payload.clinic_name, undefined);
  });
});

describe('buildProductAIntakeIdempotencyKey — Mauritius', () => {
  it('segments mauritius keys separately from US', () => {
    const key = buildProductAIntakeIdempotencyKey(
      'a@b.com',
      'North Coast Realty',
      '2026-06-30T15:00:00.000Z',
      'mauritius_property',
    );
    assert.match(key, /^product-a:intake:mauritius-property:a@b\.com:north-coast-realty:2026-06-30$/);
  });
});

describe('Product A Mauritius page — intake contract + beauty layer', () => {
  it('posts to product-a intake with mauritius market', () => {
    assert.ok(COMPONENT.includes("fetch('/api/product-a/intake'"));
    assert.ok(COMPONENT.includes("market: MARKET_MAURITIUS_PROPERTY"));
    assert.ok(COMPONENT.includes("'mauritius-property'"));
  });

  it('keeps Mauritius form field names', () => {
    for (const name of ['agency_name', 'website', 'contact_name', 'email', 'phone', 'city_region', 'biggest_problem']) {
      assert.ok(COMPONENT.includes(`name="${name}"`), `missing ${name}`);
    }
    assert.ok(!COMPONENT.includes('name="clinic_name"'));
    assert.ok(!COMPONENT.includes('name="city_state"'));
  });

  it('uses PublicMarketingPhotoGlassShell and property hero', () => {
    assert.ok(COMPONENT.includes('PublicMarketingPhotoGlassShell'));
    assert.ok(COMPONENT.includes('lead-rescue-property-reception-hero-v1'));
  });

  it('includes single-offer audit CTA and no-guarantee copy', () => {
    assert.ok(COMPONENT.includes('Request a Website & Lead Rescue Audit'));
    assert.ok(COMPONENT.includes('We do not guarantee new sales or lead volume.'));
    assert.ok(!/\/month|USD 150 launch pilot.*hero/i.test(COMPONENT.split('wedgeNote')[0] || COMPONENT));
  });

  it('includes lighter entry path to Lead Rescue wedge without competing CTA', () => {
    assert.ok(COMPONENT.includes('/lead-rescue/property-mauritius'));
    assert.ok(COMPONENT.includes('lighter entry path'));
  });

  it('has valid hero manifest', () => {
    const manifest = JSON.parse(read('data/visual-assets/product-a-mauritius-property-hero.manifest.json'));
    const result = validateVisualAssetManifest(manifest, { source: 'product-a-mauritius-property-hero.manifest.json' });
    assert.deepEqual(result.errors, []);
    assert.equal(manifest.lifecycle.state, 'draft');
  });

  it('ships shared hero derivatives', () => {
    assert.ok(existsSync(path.join(REPO_ROOT, 'public/assets/visuals/lead-rescue-property-reception-hero-v1.jpg')));
  });
});
