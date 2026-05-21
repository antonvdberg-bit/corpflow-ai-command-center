import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  selectLeadRescueAssets,
  LEAD_RESCUE_SLOT_IDS,
  __getLeadRescueSlotSpecs,
} from '../lib/visualAssets/selectLeadRescueAssets.js';
import { isAiGeneratedManifest } from '../lib/visualAssets/aiProvenance.js';

const VALID_BASE = {
  schema_version: '1.0.0',
  surface: 'lead-rescue',
  kind: 'image',
  title: 'Runtime test asset',
  source: {
    type: 'repo',
    path: '/public/assets/test/asset.jpg',
    content_hash: 'sha256:' + 'a'.repeat(56),
    width: 1200,
    height: 630,
  },
  licence: {
    tier: 'corpflow_owned',
    owner: 'CorpFlowAI',
    terms: 'Internal runtime test asset.',
  },
  accessibility: {
    alt: 'Runtime test asset for the lead-rescue selector tests',
    lang: 'en',
    decorative: false,
  },
  usage: {
    allowed_surfaces: ['lead-rescue', 'shared'],
  },
  lifecycle: {
    state: 'vetted',
  },
};

function manifest(id, overrides = {}) {
  return {
    ...VALID_BASE,
    id,
    ...overrides,
  };
}

function aiManifest(id, overrides = {}) {
  return {
    ...VALID_BASE,
    id,
    kind: 'social_card',
    source: { type: 'ai_generated', url: 'https://cdn.corpflowai.com/test/lr-card.png', width: 1200, height: 630 },
    licence: { tier: 'ai_generated', owner: 'CorpFlowAI', terms: 'Generated under the CorpFlowAI vetted prompt library.' },
    accessibility: { alt: 'AI-generated social card for the lead-rescue runtime test', decorative: false },
    usage: { allowed_surfaces: ['lead-rescue', 'shared'] },
    lifecycle: { state: 'vetted' },
    prompt_provenance: {
      prompt_id: 'lead-rescue-social-card-architectural',
      model: 'openai/gpt-image-1',
      model_version: '2026-04',
      generated_at: '2026-05-21T05:40:00.000Z',
      reviewed_by: 'anton@corpflowai.com',
    },
    ...overrides,
  };
}

describe('selectLeadRescueAssets — slot mapping valid', () => {
  it('exposes the five documented slots', () => {
    assert.deepEqual([...LEAD_RESCUE_SLOT_IDS], [
      'lead_rescue_hero',
      'lead_rescue_process',
      'lead_rescue_dashboard',
      'lead_rescue_trust_band',
      'lead_rescue_social_card',
    ]);
    const specs = __getLeadRescueSlotSpecs();
    for (const slotId of LEAD_RESCUE_SLOT_IDS) {
      assert.ok(specs[slotId], `missing spec for ${slotId}`);
      assert.ok(Array.isArray(specs[slotId].preferredIds) && specs[slotId].preferredIds.length > 0);
      assert.ok(Array.isArray(specs[slotId].acceptedKinds) && specs[slotId].acceptedKinds.length > 0);
    }
  });

  it('returns nulls for every slot when given no manifests (preserves layout)', () => {
    const result = selectLeadRescueAssets([]);
    for (const slot of LEAD_RESCUE_SLOT_IDS) {
      assert.equal(result[slot], null, `${slot} should be null when no manifests provided`);
    }
  });

  it('matches preferred-id manifests to their slots', () => {
    const manifests = [
      manifest('lead-rescue-hero', { kind: 'image' }),
      manifest('lead-rescue-process', { kind: 'illustration' }),
      manifest('lead-rescue-dashboard', { kind: 'illustration' }),
      manifest('lead-rescue-trust', { kind: 'illustration' }),
      aiManifest('lead-rescue-social'),
    ];
    const result = selectLeadRescueAssets(manifests);
    assert.equal(result.lead_rescue_hero?.id, 'lead-rescue-hero');
    assert.equal(result.lead_rescue_process?.id, 'lead-rescue-process');
    assert.equal(result.lead_rescue_dashboard?.id, 'lead-rescue-dashboard');
    assert.equal(result.lead_rescue_trust_band?.id, 'lead-rescue-trust');
    assert.equal(result.lead_rescue_social_card?.id, 'lead-rescue-social');
  });

  it('falls back to slot:<id> hint in usage.notes when no preferred id matches', () => {
    const manifests = [
      manifest('arbitrary-id-1', {
        kind: 'image',
        usage: {
          allowed_surfaces: ['lead-rescue'],
          notes: 'Used for slot:lead_rescue_hero on the AI Lead Rescue page.',
        },
      }),
    ];
    const result = selectLeadRescueAssets(manifests);
    assert.equal(result.lead_rescue_hero?.id, 'arbitrary-id-1');
  });

  it('refuses manifests whose allowed_surfaces excludes lead-rescue/shared', () => {
    const manifests = [
      manifest('lux-only', {
        surface: 'lux',
        usage: { allowed_surfaces: ['lux'] },
      }),
    ];
    const result = selectLeadRescueAssets(manifests);
    for (const slot of LEAD_RESCUE_SLOT_IDS) {
      assert.equal(result[slot], null, `${slot} must not select a non-lead-rescue/shared manifest`);
    }
  });

  it('refuses draft and retired manifests', () => {
    const manifests = [
      manifest('lead-rescue-hero', { kind: 'image', lifecycle: { state: 'draft' } }),
      manifest('lead-rescue-trust', { kind: 'illustration', lifecycle: { state: 'retired' } }),
    ];
    const result = selectLeadRescueAssets(manifests);
    assert.equal(result.lead_rescue_hero, null);
    assert.equal(result.lead_rescue_trust_band, null);
  });

  it('does not leak strictly-core-only manifests into lead-rescue slots', () => {
    // A homepage asset that explicitly does NOT opt into the `shared`
    // surface must never appear on the AI Lead Rescue page even when
    // its kind is acceptable. Manifests that opt into `shared` are a
    // separate, intentional case (covered by the next test).
    const manifests = [
      manifest('corpflow-homepage-hero', {
        surface: 'core',
        kind: 'image',
        usage: { allowed_surfaces: ['core'] },
      }),
    ];
    const result = selectLeadRescueAssets(manifests);
    assert.equal(result.lead_rescue_hero, null, 'strictly-core manifest must not fill lead_rescue_hero');
  });

  it('honours shared-surface manifests as fallback content', () => {
    const manifests = [
      manifest('shared-illustration', {
        surface: 'shared',
        kind: 'illustration',
        usage: { allowed_surfaces: ['shared'] },
      }),
    ];
    const result = selectLeadRescueAssets(manifests);
    assert.equal(result.lead_rescue_hero?.id, 'shared-illustration');
  });
});

describe('AI provenance disclosure eligibility on lead-rescue', () => {
  it('AI-generated social-card manifest selected into the social slot is eligible for disclosure', () => {
    const m = aiManifest('lead-rescue-social');
    const result = selectLeadRescueAssets([m]);
    assert.equal(result.lead_rescue_social_card?.id, 'lead-rescue-social');
    assert.equal(isAiGeneratedManifest(result.lead_rescue_social_card), true);
  });

  it('CorpFlowAI-owned SVGs are not eligible for AI provenance disclosure', () => {
    const result = selectLeadRescueAssets([
      manifest('lead-rescue-process', { kind: 'illustration' }),
      manifest('lead-rescue-trust', { kind: 'illustration' }),
    ]);
    assert.equal(isAiGeneratedManifest(result.lead_rescue_process), false);
    assert.equal(isAiGeneratedManifest(result.lead_rescue_trust_band), false);
  });
});
