import { closeSync, existsSync, openSync, readFileSync, readSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const LANDING_PATH = path.join(ROOT, 'components', 'EnquiryRecoveryCampaignPage.js');
const HOME_PATH = path.join(ROOT, 'components', 'CorpFlowPublicHome.js');
const VIDEO_PATH = path.join(
  ROOT,
  'public',
  'media',
  'corpflowai',
  'ai-lead-rescue-sprint-intro-1080p.mp4',
);
const EXPECTED_BYTES = 6_190_139;
const CANONICAL_URL = '/media/corpflowai/ai-lead-rescue-sprint-intro-1080p.mp4';

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

  it('keeps the canonical intro file available without cataloguing it on the campaign page', () => {
    const landing = readFileSync(LANDING_PATH, 'utf8');
    assert.ok(!landing.includes('PublishingVideoSection'));
    assert.ok(!/USD 150/i.test(landing));
    assert.equal(existsSync(VIDEO_PATH), true);
  });

  it('does not use the AI Lead Rescue intro as the homepage flagship video', () => {
    const home = readFileSync(HOME_PATH, 'utf8');
    assert.ok(!home.includes(CANONICAL_URL));
    assert.ok(!home.includes('See AI Lead Rescue in action'));
    assert.ok(home.includes('/media/corpflowai/corpflowai-flagship-homepage-final-1080p.mp4'));
  });
});
