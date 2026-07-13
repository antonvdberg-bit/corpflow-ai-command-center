/**
 * LuxeMaurice Training Pack v1 — file presence, copy guard, manifest guard.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const PACK = path.join(process.cwd(), 'artifacts', 'luxe-maurice-training-pack-v1');

const REQUIRED_FILES = [
  'README.md',
  '01-client-review-guide/CLIENT_PRIVATE_ACCESS_GUIDE.md',
  '02-advisor-workflow-guide/ADVISOR_REVIEW_GUIDE.md',
  '03-operator-workflow-guide/OPERATOR_CHANGE_WORKFLOW.md',
  '04-training-video-scripts/VIDEO_01_CLIENT_JOURNEY.md',
  '04-training-video-scripts/VIDEO_02_ADVISOR_JOURNEY.md',
  '04-training-video-scripts/VIDEO_03_OPERATOR_WORKFLOW.md',
  '05-graphics/README.md',
  '05-graphics/GRAPHICS_CAPTURE_CHECKLIST.md',
  '05-graphics/GRAPHICS_MANIFEST.md',
  '06-backend-status/BACKEND_STATUS_AND_LIMITATIONS.md',
];

const EXPECTED_GRAPHICS = [
  '01-landing-page.png',
  '02-private-opportunities.png',
  '03-private-access-request-form.png',
  '04-request-submitted-reference.png',
  '05-advisor-sign-in-prompt.png',
  '06-advisor-pipeline-live-request.png',
  '07-demonstration-records.png',
  '08-change-console-lead-workflow.png',
];

const JAN_FACING = [
  '01-client-review-guide/CLIENT_PRIVATE_ACCESS_GUIDE.md',
  '02-advisor-workflow-guide/ADVISOR_REVIEW_GUIDE.md',
  '03-operator-workflow-guide/OPERATOR_CHANGE_WORKFLOW.md',
  '04-training-video-scripts/VIDEO_01_CLIENT_JOURNEY.md',
  '04-training-video-scripts/VIDEO_02_ADVISOR_JOURNEY.md',
  '04-training-video-scripts/VIDEO_03_OPERATOR_WORKFLOW.md',
  '06-backend-status/BACKEND_STATUS_AND_LIMITATIONS.md',
];

const FORBIDDEN_JAN_COPY = [
  /\bmock\b/i,
  /\bfake\b/i,
  /\bseed\b/i,
  /localStorage/i,
  /\bCursor\b/,
  /\bGitHub\b/,
  /\bSupabase\b/,
  /service_role/i,
  /\brecovery\b/i,
  /\baudit\b/i,
];

const SECRET_PATTERNS = [
  /MASTER_ADMIN_KEY\s*=/,
  /CORPFLOW_[A-Z_]+\s*=\s*['"][^'"]+['"]/,
  /Bearer\s+[A-Za-z0-9._-]{20,}/,
  /postgres:\/\/[^\s]+/i,
];

function readPack(rel) {
  return fs.readFileSync(path.join(PACK, rel), 'utf8');
}

test('luxe training pack: required files exist', () => {
  for (const rel of REQUIRED_FILES) {
    assert.ok(fs.existsSync(path.join(PACK, rel)), `missing ${rel}`);
  }
  assert.ok(fs.existsSync(path.join(PACK, '05-graphics/captures')));
});

test('luxe training pack: manifest lists all eight graphic filenames', () => {
  const manifest = readPack('05-graphics/GRAPHICS_MANIFEST.md');
  for (const name of EXPECTED_GRAPHICS) {
    assert.match(manifest, new RegExp(name.replace('.', '\\.')), `manifest missing ${name}`);
  }
});

test('luxe training pack: Jan-facing guides avoid forbidden internal terms', () => {
  for (const rel of JAN_FACING) {
    const text = readPack(rel);
    for (const pattern of FORBIDDEN_JAN_COPY) {
      assert.equal(pattern.test(text), false, `${rel} matches forbidden ${pattern}`);
    }
  }
});

test('luxe training pack: backend limitations documented', () => {
  const status = readPack('06-backend-status/BACKEND_STATUS_AND_LIMITATIONS.md');
  assert.match(status, /Live now/i);
  assert.match(status, /Not live yet/i);
  assert.match(status, /receive-and-review workflow is live/i);
  assert.match(status, /inline CRM status editing/i);
  assert.match(status, /Outbound email/i);
  assert.match(status, /fully complete/i);
});

test('luxe training pack: README includes approval checklist', () => {
  const readme = readPack('README.md');
  assert.match(readme, /Approval checklist/i);
  assert.match(readme, /All graphics use fictional training data/);
  assert.match(readme, /No client send has occurred/);
  assert.match(readme, /Safe to send Jan/i);
  assert.match(readme, /Do not send Jan/i);
});

test('luxe training pack: no secrets or env values in pack text', () => {
  const allText = REQUIRED_FILES.map(readPack).join('\n');
  for (const pattern of SECRET_PATTERNS) {
    assert.equal(pattern.test(allText), false, `secret-like pattern in pack: ${pattern}`);
  }
});

test('luxe training pack: operator guide references live change actions', () => {
  const op = readPack('03-operator-workflow-guide/OPERATOR_CHANGE_WORKFLOW.md');
  assert.match(op, /concierge-leads-list/);
  assert.match(op, /concierge-lead-operator-patch/);
  assert.match(op, /does \*\*not\*\* support these edits/i);
});
