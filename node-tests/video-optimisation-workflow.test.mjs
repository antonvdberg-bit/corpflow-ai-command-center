import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const script = readFileSync(path.join(ROOT, 'scripts', 'optimise-video.sh'), 'utf8');
const workflow = readFileSync(
  path.join(ROOT, '.github', 'workflows', 'video-optimisation-verify.yml'),
  'utf8',
);
const packageJson = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const masterIgnore = readFileSync(
  path.join(ROOT, 'artifacts', 'video-masters', '.gitignore'),
  'utf8',
);

describe('website video optimisation workflow', () => {
  it('exposes the bounded npm command and keeps masters untracked', () => {
    assert.equal(packageJson.scripts['video:optimise'], 'bash scripts/optimise-video.sh');
    assert.match(masterIgnore, /^\*\.mp4$/m);
  });

  it('encodes web MP4s with the required defaults and safety gates', () => {
    assert.ok(script.includes('require_tool ffmpeg'));
    assert.ok(script.includes('require_tool ffprobe'));
    assert.ok(script.includes('-c:v libx264'));
    assert.ok(script.includes('-preset slow'));
    assert.ok(script.includes('crf=${VIDEO_CRF:-24}'));
    assert.ok(script.includes('-c:a aac'));
    assert.ok(script.includes('-b:a 128k'));
    assert.ok(script.includes('-movflags +faststart'));
    assert.ok(script.includes('Input and output resolve to the same file'));
    assert.ok(script.includes('Duration differs by'));
    assert.ok(script.includes('Output is larger than input'));
    assert.ok(script.includes('Output audio is missing'));
    assert.ok(script.includes('SHA-256:'));
  });

  it('keeps CI path-filtered and verification-only', () => {
    assert.ok(workflow.includes('"scripts/optimise-video.sh"'));
    assert.ok(workflow.includes('"public/media/corpflowai/**/*.mp4"'));
    assert.ok(workflow.includes('sudo apt-get install -y ffmpeg'));
    assert.ok(workflow.includes('ffprobe -v error'));
    assert.ok(!workflow.includes('git push'));
    assert.ok(!workflow.includes('vercel deploy'));
    assert.ok(!workflow.includes('actions/upload-artifact'));
  });
});
