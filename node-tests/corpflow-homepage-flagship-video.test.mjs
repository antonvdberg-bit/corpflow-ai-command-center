import { closeSync, existsSync, openSync, readFileSync, readSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { shouldEmitCorpFlowBrandAssets } from '../lib/public/corpflow-brand-assets.js';

const ROOT = process.cwd();
const HOME_PATH = path.join(ROOT, 'components', 'CorpFlowPublicHome.js');
const VIDEO_PATH = path.join(
  ROOT,
  'public',
  'media',
  'corpflowai',
  'corpflowai-flagship-homepage-final-1080p.mp4',
);
const EXPECTED_BYTES = 17_329_161;

describe('CorpFlowAI homepage flagship video', () => {
  it('ships the approved compressed MP4 below the 50 MiB warning threshold', () => {
    assert.equal(existsSync(VIDEO_PATH), true);
    assert.equal(statSync(VIDEO_PATH).size, EXPECTED_BYTES);
    assert.ok(statSync(VIDEO_PATH).size < 50 * 1024 * 1024);

    const signature = Buffer.alloc(12);
    const handle = openSync(VIDEO_PATH, 'r');
    try {
      readSync(handle, signature, 0, signature.length, 0);
    } finally {
      closeSync(handle);
    }
    assert.equal(signature.subarray(4, 8).toString('ascii'), 'ftyp');
  });

  it('uses a native, user-initiated, metadata-only HTML5 player after the hero', () => {
    const home = readFileSync(HOME_PATH, 'utf8');
    const player = home.match(/<video[\s\S]*?<\/video>/)?.[0] || '';

    assert.ok(home.includes('Meet CorpFlowAI'));
    assert.ok(home.includes('visible, governed delivery'));
    assert.ok(home.includes('/media/corpflowai/corpflowai-flagship-homepage-final-1080p.mp4'));
    assert.ok(player.includes('controls'));
    assert.ok(player.includes('playsInline'));
    assert.ok(player.includes('preload="metadata"'));
    assert.ok(player.includes('aria-label="Meet CorpFlowAI flagship video"'));
    assert.ok(player.includes('Open the approved CorpFlowAI flagship video'));
    assert.ok(!player.includes('autoPlay'));
    assert.ok(!player.includes('loop'));
    assert.ok(
      home.indexOf('<FlagshipVideoSection />') < home.indexOf('id="service-paths"'),
      'flagship video must appear before the service-paths section',
    );
  });

  it('allows only the CorpFlowAI apex, local, and unscoped preview hosts', () => {
    assert.equal(shouldEmitCorpFlowBrandAssets('corpflowai.com'), true);
    assert.equal(shouldEmitCorpFlowBrandAssets('www.corpflowai.com'), true);
    assert.equal(shouldEmitCorpFlowBrandAssets('localhost'), true);
    assert.equal(shouldEmitCorpFlowBrandAssets('branch-preview.vercel.app'), true);
    assert.equal(
      shouldEmitCorpFlowBrandAssets('branch-preview.vercel.app', { search: '?cf_preview=signed' }),
      false,
    );
    assert.equal(shouldEmitCorpFlowBrandAssets('core.corpflowai.com'), false);
    assert.equal(shouldEmitCorpFlowBrandAssets('lux.corpflowai.com'), false);
    assert.equal(shouldEmitCorpFlowBrandAssets('living-word-mauritius.corpflowai.com'), false);
    assert.equal(shouldEmitCorpFlowBrandAssets('other-tenant.corpflowai.com'), false);
  });
});
