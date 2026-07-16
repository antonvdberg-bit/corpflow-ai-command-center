import { closeSync, existsSync, openSync, readFileSync, readSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const LANDING_PATH = path.join(ROOT, 'components', 'AiLeadRescueLanding.js');
const HOME_PATH = path.join(ROOT, 'components', 'CorpFlowPublicHome.js');
const VIDEO_PATH = path.join(
  ROOT,
  'public',
  'media',
  'corpflowai',
  'ai-lead-rescue-sprint-intro-1080p.mp4',
);
const CANONICAL_URL = '/media/corpflowai/ai-lead-rescue-sprint-intro-1080p.mp4';
const EXPECTED_BYTES = 6_190_139;

describe('AI Lead Rescue intro video', () => {
  it('ships one canonical H.264 MP4 under public/media/corpflowai/', () => {
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

  it('places a native metadata-only player on the AI Lead Rescue landing after the hero', () => {
    const landing = readFileSync(LANDING_PATH, 'utf8');
    const player = landing.match(/<video[\s\S]*?<\/video>/)?.[0] || '';

    assert.ok(landing.includes('See AI Lead Rescue in action'));
    assert.ok(
      landing.includes(
        'A short introduction to how the AI Lead Rescue Sprint supports faster, clearer enquiry',
      ),
    );
    assert.ok(landing.includes(CANONICAL_URL));
    assert.ok(landing.includes('<AiLeadRescueIntroVideoSection />'));
    assert.ok(
      landing.indexOf('<AiLeadRescueIntroVideoSection />') <
        landing.indexOf('Who this is for'),
    );
    assert.ok(
      landing.indexOf('<AiLeadRescueIntroVideoSection />') >
        landing.indexOf('</GlassCardGrid>'),
    );
    assert.ok(player.includes('controls'));
    assert.ok(player.includes('playsInline'));
    assert.ok(player.includes('preload="metadata"'));
    assert.ok(player.includes('aria-label="See AI Lead Rescue in action"'));
    assert.ok(!player.includes('autoPlay'));
    assert.ok(!player.includes('loop'));
  });

  it('does not use the AI Lead Rescue intro as the homepage flagship video', () => {
    const home = readFileSync(HOME_PATH, 'utf8');
    assert.ok(!home.includes(CANONICAL_URL));
    assert.ok(!home.includes('See AI Lead Rescue in action'));
    assert.ok(home.includes('/media/corpflowai/corpflowai-flagship-homepage-final-1080p.mp4'));
  });
});
