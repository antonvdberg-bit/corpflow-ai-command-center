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
