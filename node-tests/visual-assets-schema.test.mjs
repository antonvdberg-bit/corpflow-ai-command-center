import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  VISUAL_ASSET_KINDS,
  VISUAL_ASSET_LICENCE_TIERS,
  VISUAL_ASSET_LIFECYCLE_STATES,
  VISUAL_ASSET_SCHEMA_VERSION,
  VISUAL_ASSET_SOURCE_TYPES,
  VISUAL_ASSET_SURFACES,
  validateVisualAssetManifest,
} from '../lib/visualAssets/schema.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const MANIFEST_DIR = path.join(REPO_ROOT, 'data', 'visual-assets');

function listManifestFiles() {
  const entries = readdirSync(MANIFEST_DIR);
  return entries
    .filter((name) => name.endsWith('.manifest.json'))
    .map((name) => path.join(MANIFEST_DIR, name))
    .filter((p) => statSync(p).isFile());
}

function loadJson(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function baseManifest() {
  return {
    schema_version: VISUAL_ASSET_SCHEMA_VERSION,
    id: 'test-asset',
    surface: 'shared',
    kind: 'image',
    title: 'Test asset',
    source: {
      type: 'repo',
      path: '/public/assets/test/asset.jpg',
      content_hash: 'sha256:' + 'a'.repeat(56),
    },
    licence: {
      tier: 'corpflow_owned',
      owner: 'CorpFlowAI',
      terms: 'Internal test asset.',
    },
    accessibility: {
      alt: 'A test asset for the validator suite',
      lang: 'en',
      decorative: false,
    },
    usage: {
      allowed_surfaces: ['shared'],
    },
    lifecycle: {
      state: 'vetted',
    },
  };
}

describe('visualAssets/schema', () => {
  it('exposes enum constants used by the content model', () => {
    assert.equal(typeof VISUAL_ASSET_SCHEMA_VERSION, 'string');
    assert.ok(VISUAL_ASSET_KINDS.includes('image'));
    assert.ok(VISUAL_ASSET_KINDS.includes('social_card'));
    assert.ok(VISUAL_ASSET_SURFACES.includes('lead-rescue'));
    assert.ok(VISUAL_ASSET_SURFACES.includes('core'));
    assert.ok(VISUAL_ASSET_SOURCE_TYPES.includes('ai_generated'));
    assert.ok(VISUAL_ASSET_LICENCE_TIERS.includes('ai_generated'));
    assert.deepEqual([...VISUAL_ASSET_LIFECYCLE_STATES], [
      'draft',
      'vetted',
      'published',
      'retired',
    ]);
  });

  it('validates the base test manifest', () => {
    const r = validateVisualAssetManifest(baseManifest());
    assert.deepEqual(r, { ok: true, errors: [] });
  });

  it('rejects manifests missing required fields', () => {
    const m = baseManifest();
    delete m.id;
    delete m.source;
    const r = validateVisualAssetManifest(m, { source: 'test' });
    assert.equal(r.ok, false);
    const paths = r.errors.map((e) => e.path);
    assert.ok(paths.includes('id'), 'must flag missing id');
    assert.ok(paths.includes('source'), 'must flag missing source');
  });

  it('rejects unknown enum values', () => {
    const m = baseManifest();
    m.surface = 'not-a-surface';
    m.kind = 'hologram';
    const r = validateVisualAssetManifest(m);
    assert.equal(r.ok, false);
    const paths = r.errors.map((e) => e.path);
    assert.ok(paths.includes('surface'));
    assert.ok(paths.includes('kind'));
  });

  it('requires prompt_provenance for AI-generated assets', () => {
    const m = baseManifest();
    m.source = { type: 'ai_generated', url: 'https://cdn.corpflowai.com/test.png' };
    m.licence.tier = 'ai_generated';
    const r1 = validateVisualAssetManifest(m);
    assert.equal(r1.ok, false);
    assert.ok(r1.errors.some((e) => e.path === 'prompt_provenance'));

    m.prompt_provenance = {
      prompt_id: 'lead-rescue-social-card',
      model: 'openai/gpt-image-1',
      model_version: '2026-04',
      generated_at: '2026-05-19T10:00:00.000Z',
      reviewed_by: 'anton@corpflowai.com',
    };
    const r2 = validateVisualAssetManifest(m);
    assert.deepEqual(r2.errors, []);
    assert.equal(r2.ok, true);
  });

  it('rejects signed/secret URLs', () => {
    const m = baseManifest();
    m.source = { type: 'cdn', url: 'https://cdn.corpflowai.com/x.png?token=abc' };
    const r = validateVisualAssetManifest(m);
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.path === 'source.url'));
  });

  it('rejects secret-like keys anywhere in the document', () => {
    const m = baseManifest();
    m.usage.api_key = 'AKIA-do-not-paste-secrets';
    const r = validateVisualAssetManifest(m);
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.path === 'usage.api_key'));
  });

  it('requires alt text for image-shaped kinds', () => {
    const m = baseManifest();
    m.accessibility.alt = 'x';
    const r = validateVisualAssetManifest(m);
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.path === 'accessibility.alt'));
  });

  it('all example manifests in data/visual-assets validate cleanly', () => {
    const files = listManifestFiles();
    assert.ok(files.length >= 3, 'expected at least 3 example manifests committed');
    const failures = [];
    for (const file of files) {
      const json = loadJson(file);
      const r = validateVisualAssetManifest(json, { source: path.basename(file) });
      if (!r.ok) failures.push({ file, errors: r.errors });
    }
    assert.deepEqual(failures, [], `manifest validation failed: ${JSON.stringify(failures, null, 2)}`);
  });
});
