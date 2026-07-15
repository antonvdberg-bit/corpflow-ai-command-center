import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

import {
  CORPFLOW_BRAND_ASSET_PATHS,
  CORPFLOW_BRAND_THEME_COLOR,
  listCorpFlowBrandHeadTags,
  shouldEmitCorpFlowBrandAssets,
} from '../lib/public/corpflow-brand-assets.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function existsPublic(relPath) {
  return existsSync(path.join(ROOT, 'public', relPath.replace(/^\//, '')));
}

describe('CorpFlowAI brand assets — files present', () => {
  for (const rel of Object.values(CORPFLOW_BRAND_ASSET_PATHS)) {
    it(`ships ${rel}`, () => {
      assert.equal(existsPublic(rel), true, `missing ${rel}`);
    });
  }

  it('does not place a global root favicon.ico (tenant/Core leak risk)', () => {
    assert.equal(existsSync(path.join(ROOT, 'public/favicon.ico')), false);
  });

  it('does not retain the rejected SVG recreation as a master', () => {
    assert.equal(existsPublic('/brand/corpflowai/corpflowai-mark.svg'), false);
  });
});

describe('CorpFlowAI brand assets — host emit policy', () => {
  it('allows apex and www', () => {
    assert.equal(shouldEmitCorpFlowBrandAssets('corpflowai.com'), true);
    assert.equal(shouldEmitCorpFlowBrandAssets('www.corpflowai.com'), true);
    assert.equal(shouldEmitCorpFlowBrandAssets('CorpFlowAI.com:443'), true);
  });

  it('allows localhost for local verification', () => {
    assert.equal(shouldEmitCorpFlowBrandAssets('localhost'), true);
    assert.equal(shouldEmitCorpFlowBrandAssets('127.0.0.1'), true);
  });

  it('allows unscoped Vercel preview hosts', () => {
    assert.equal(shouldEmitCorpFlowBrandAssets('corpflow-ai-command-center-git-abc.vercel.app'), true);
  });

  it('denies signed tenant preview query on Vercel', () => {
    assert.equal(
      shouldEmitCorpFlowBrandAssets('corpflow-ai-command-center-git-abc.vercel.app', {
        search: '?cf_preview=signed-token',
      }),
      false,
    );
  });

  it('denies Core and client tenants', () => {
    for (const host of [
      'core.corpflowai.com',
      'lux.corpflowai.com',
      'luxe.corpflowai.com',
      'living-word-mauritius.corpflowai.com',
      'living-word.corpflowai.com',
      'aileadrescue.corpflowai.com',
      'acme-corp.corpflowai.com',
    ]) {
      assert.equal(shouldEmitCorpFlowBrandAssets(host), false, host);
    }
  });

  it('denies empty / unknown external hosts', () => {
    assert.equal(shouldEmitCorpFlowBrandAssets(''), false);
    assert.equal(shouldEmitCorpFlowBrandAssets(null), false);
    assert.equal(shouldEmitCorpFlowBrandAssets('example.com'), false);
  });
});

describe('CorpFlowAI brand assets — head tags and wiring', () => {
  it('uses existing CorpFlowAI navy theme colour', () => {
    assert.equal(CORPFLOW_BRAND_THEME_COLOR, '#06111f');
    const tags = listCorpFlowBrandHeadTags();
    assert.ok(tags.some((t) => t.name === 'theme-color' && t.content === '#06111f'));
    assert.ok(tags.some((t) => t.rel === 'manifest'));
    assert.ok(tags.some((t) => t.rel === 'apple-touch-icon'));
  });

  it('manifest JSON is valid and points at brand icons', () => {
    const raw = readFileSync(path.join(ROOT, 'public/brand/corpflowai/site.webmanifest'), 'utf8');
    const json = JSON.parse(raw);
    assert.equal(json.name, 'CorpFlowAI');
    assert.equal(json.theme_color, '#06111f');
    assert.ok(json.icons.some((i) => i.src.includes('/brand/corpflowai/')));
  });

  it('CorpFlow shells and offer/policy pages import CorpFlowBrandMetadata', () => {
    const files = [
      'components/public/CorpFlowPublicPhotoShell.js',
      'components/public/CorpFlowPublicShell.js',
      'components/RapidDeliveryOfferPage.js',
      'components/PublicPolicyLayout.js',
      'components/AiLeadRescueLanding.js',
    ];
    for (const rel of files) {
      const src = readFileSync(path.join(ROOT, rel), 'utf8');
      assert.match(src, /CorpFlowBrandMetadata/, rel);
    }
  });

  it('does not wire brand icons into _document.js', () => {
    const src = readFileSync(path.join(ROOT, 'pages/_document.js'), 'utf8');
    assert.doesNotMatch(src, /corpflowai\/favicon|CorpFlowBrandMetadata|apple-touch-icon/);
  });

  it('does not alter Lux tenant presentation branding files', () => {
    const lux = readFileSync(path.join(ROOT, 'components/LuxeMauriceTenantPresentation.js'), 'utf8');
    assert.doesNotMatch(lux, /CorpFlowBrandMetadata|\/brand\/corpflowai\//);
    const luxStatic = readFileSync(path.join(ROOT, 'public/lux-landing-static.html'), 'utf8');
    assert.doesNotMatch(luxStatic, /\/brand\/corpflowai\//);
  });
});

describe('CorpFlowAI brand assets — white background derivatives', () => {
  it('approved source and key sizes have opaque white corners', async () => {
    // Lightweight PNG corner check without adding image deps to CI beyond Node buffer parse.
    // Validate magic + IHDR and that a sampled corner pixel in the filesystem PNG is not teal.
    // Prefer sharp/Pillow-free: decode via reading raw is hard; instead assert documentation
    // contract by spawning python when available, else checksum presence.
    const { spawnSync } = await import('node:child_process');
    const script = `
from PIL import Image
from pathlib import Path
root = Path(${JSON.stringify(ROOT)})
files = [
  'public/brand/corpflowai/corpflowai-favicon-approved-source.png',
  'public/brand/corpflowai/favicon-16x16.png',
  'public/brand/corpflowai/favicon-32x32.png',
  'public/brand/corpflowai/apple-touch-icon.png',
  'public/brand/corpflowai/android-chrome-192x192.png',
  'public/brand/corpflowai/android-chrome-512x512.png',
]
for rel in files:
  im = Image.open(root / rel).convert('RGBA')
  for pt in [(0,0), (im.width-1, 0), (0, im.height-1), (im.width-1, im.height-1)]:
    r,g,b,a = im.getpixel(pt)
    assert a == 255 and (r,g,b) == (255,255,255), (rel, pt, (r,g,b,a))
print('ok')
`;
    const res = spawnSync('python3', ['-c', script], { encoding: 'utf8' });
    assert.equal(res.status, 0, res.stderr || res.stdout);
    assert.match(res.stdout, /ok/);
  });
});
