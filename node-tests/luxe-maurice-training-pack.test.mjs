/**
 * LuxeMaurice Training Pack v1 — presence, copy guards, review edition, delivery prep.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const PACK = path.join(process.cwd(), 'artifacts', 'luxe-maurice-training-pack-v1');
const ROOT = process.cwd();

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
  'review/README.md',
  'review/LUXEMAURICE_TRAINING_PACK_REVIEW.md',
  'review/LUXEMAURICE_TRAINING_PACK_REVIEW.html',
  'review/ANTON_REVIEW_CHANGES.md',
  'client-delivery-preparation/README.md',
  'client-delivery-preparation/COVER_NOTE.md',
  'client-delivery-preparation/FILE_INVENTORY.md',
  'client-delivery-preparation/DELIVERY_CHECKLIST.md',
  'client-delivery-preparation/DRAFT_EMAIL_TO_JAN.md',
  'client-delivery-preparation/DRAFT_WHATSAPP_TO_JAN.md',
  'client-delivery-preparation/LIMITATIONS_AND_TRAINING_ORDER.md',
  'client-delivery-preparation/SEND_PACKET_2026-07-14.md',
  'client-delivery-preparation/CHATGPT_SEND_AND_FEEDBACK_HANDOFF.md',
  'client-delivery-preparation/LUXEMAURICE_TRAINING_PACK_FOR_JAN.html',
  'client-delivery-preparation/LUXEMAURICE_TRAINING_PACK_FOR_JAN.pdf',
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
  'client-delivery-preparation/COVER_NOTE.md',
  'client-delivery-preparation/DRAFT_EMAIL_TO_JAN.md',
  'client-delivery-preparation/DRAFT_WHATSAPP_TO_JAN.md',
  'client-delivery-preparation/LIMITATIONS_AND_TRAINING_ORDER.md',
  'client-delivery-preparation/guides/CLIENT_PRIVATE_ACCESS_GUIDE.md',
  'client-delivery-preparation/guides/ADVISOR_REVIEW_GUIDE.md',
  'client-delivery-preparation/guides/OPERATOR_CHANGE_WORKFLOW.md',
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

function collectPackText(rels) {
  return rels.map(readPack).join('\n');
}

test('luxe training pack: required files exist', () => {
  for (const rel of REQUIRED_FILES) {
    assert.ok(fs.existsSync(path.join(PACK, rel)), `missing ${rel}`);
  }
  assert.ok(fs.existsSync(path.join(PACK, '05-graphics/captures')));
  assert.ok(fs.existsSync(path.join(PACK, 'client-delivery-preparation')));
  assert.ok(fs.existsSync(path.join(PACK, 'review')));
});

test('luxe training pack: all eight PNG graphics physically exist', () => {
  for (const name of EXPECTED_GRAPHICS) {
    const p = path.join(PACK, '05-graphics/captures', name);
    assert.ok(fs.existsSync(p), `missing capture ${name}`);
    const st = fs.statSync(p);
    assert.ok(st.size > 1000, `${name} too small`);
    const buf = fs.readFileSync(p);
    assert.equal(buf[0], 0x89);
    assert.equal(buf[1], 0x50);
    assert.equal(buf[2], 0x4e);
    assert.equal(buf[3], 0x47);
  }
});

test('luxe training pack: delivery package copies all eight graphics', () => {
  for (const name of EXPECTED_GRAPHICS) {
    const p = path.join(PACK, 'client-delivery-preparation/graphics', name);
    assert.ok(fs.existsSync(p), `missing delivery graphic ${name}`);
  }
});

test('luxe training pack: Jan PDF and HTML deliverables exist', () => {
  const html = path.join(PACK, 'client-delivery-preparation/LUXEMAURICE_TRAINING_PACK_FOR_JAN.html');
  const pdf = path.join(PACK, 'client-delivery-preparation/LUXEMAURICE_TRAINING_PACK_FOR_JAN.pdf');
  assert.ok(fs.existsSync(html), 'missing Jan HTML');
  assert.ok(fs.existsSync(pdf), 'missing Jan PDF');
  assert.ok(fs.statSync(html).size > 100000, 'Jan HTML too small');
  assert.ok(fs.statSync(pdf).size > 50000, 'Jan PDF too small');
  const htmlText = fs.readFileSync(html, 'utf8');
  assert.match(htmlText, /LuxeMaurice AI training pack/);
  assert.match(htmlText, /data:image\/png;base64,/);
  assert.doesNotMatch(htmlText, /\bCursor\b/);
  assert.doesNotMatch(htmlText, /\bGitHub\b/);
});

test('luxe training pack: review edition includes all eight graphics', () => {
  const md = readPack('review/LUXEMAURICE_TRAINING_PACK_REVIEW.md');
  const html = readPack('review/LUXEMAURICE_TRAINING_PACK_REVIEW.html');
  for (const name of EXPECTED_GRAPHICS) {
    assert.match(md, new RegExp(name.replace('.', '\\.')), `review md missing ${name}`);
    assert.match(html, new RegExp(name.replace('.', '\\.')), `review html missing ${name}`);
  }
});

test('luxe training pack: Anton review-changes file and approval recorded; pack not agent-sent', () => {
  const changes = readPack('review/ANTON_REVIEW_CHANGES.md');
  assert.match(changes, /Approved for client-send preparation/);
  assert.match(changes, /Approved for actual external send/);
  assert.match(changes, /\[x\] Approved for client-send preparation/);
  assert.match(changes, /\[x\] Approved for actual external send/);
  assert.match(changes, /No message was sent by the packaging agent/i);

  const delivery = readPack('client-delivery-preparation/DELIVERY_CHECKLIST.md');
  assert.match(delivery, /Anton explicitly approved external send/);
  assert.match(delivery, /\[ \] Pack sent to Jan/);
  assert.doesNotMatch(delivery, /\[x\] Pack sent to Jan/i);
  assert.match(delivery, /SEND_PACKET_2026-07-14|transmission step/i);
});

test('luxe training pack: draft messages exist and declare transmission by Anton', () => {
  const email = readPack('client-delivery-preparation/DRAFT_EMAIL_TO_JAN.md');
  const wa = readPack('client-delivery-preparation/DRAFT_WHATSAPP_TO_JAN.md');
  assert.match(email, /\*\*Subject:\*\*\s*LuxeMaurice platform training pack/i);
  assert.match(email, /Hi Jan/i);
  assert.match(email, /jan@luxemaurice\.com|DRAFT READY TO SEND|transmission by Anton/i);
  assert.match(wa, /Jan/i);
  assert.match(wa, /not been sent|NOT SENT|draft only|do not send|DRAFT/i);
});

test('luxe training pack: manifest lists graphics and chrome crop for 06', () => {
  const manifest = readPack('05-graphics/GRAPHICS_MANIFEST.md');
  for (const name of EXPECTED_GRAPHICS) {
    assert.match(manifest, new RegExp(name.replace('.', '\\.')), `manifest missing ${name}`);
  }
  assert.match(manifest, /BROWSER_CHROME_CROPPED/);
  assert.match(manifest, /FOCUSED_TO_TRAINING_REQUEST/);
  assert.match(manifest, /PRIVACY_REVIEWED/);
  assert.match(manifest, /READY_FOR_ANTON_REVIEW/);
  assert.match(manifest, /CROPPED_TO_TRAINING_LEAD_AND_OPERATOR_ACTIONS/);
  assert.doesNotMatch(manifest, /CAPTURE_REQUIRED/);
});

test('luxe training pack: README review entry and approval incomplete', () => {
  const readme = readPack('README.md');
  assert.match(readme, /All eight required (screenshots|graphics) are present/i);
  assert.match(readme, /Anton review checklist/i);
  assert.match(readme, /\[ \] All eight graphics are present/);
  assert.match(readme, /\[ \] All graphics use fictional training data only/);
  assert.match(readme, /BROWSER_CHROME_CROPPED/);
  assert.match(readme, /FOCUSED_TO_TRAINING_REQUEST|recorded videos are not required/i);
  assert.match(readme, /\[ \] Anton approved pack for client-send preparation/);
  assert.match(readme, /\[ \] No client send has occurred/);
  assert.match(readme, /review\/LUXEMAURICE_TRAINING_PACK_REVIEW\.md/);
  assert.match(readme, /No external send has occurred/i);
});

test('luxe training pack: README Where to view lists live surfaces and repo folder', () => {
  const readme = readPack('README.md');
  assert.match(readme, /Where to view/i);
  assert.match(readme, /https:\/\/lux\.corpflowai\.com\/client\/luxe-maurice-ai/);
  assert.match(readme, /https:\/\/lux\.corpflowai\.com\/client\/luxe-maurice-ai\/properties/);
  assert.match(readme, /https:\/\/lux\.corpflowai\.com\/client\/luxe-maurice-ai\/buyer/);
  assert.match(readme, /https:\/\/lux\.corpflowai\.com\/client\/luxe-maurice-ai\/crm/);
  assert.match(readme, /https:\/\/lux\.corpflowai\.com\/change/);
  assert.match(readme, /artifacts\/luxe-maurice-training-pack-v1\//);
  assert.match(readme, /not public website pages/i);
});

test('luxe training pack: Jan-facing guides avoid forbidden internal terms', () => {
  for (const rel of JAN_FACING) {
    const text = readPack(rel);
    for (const pattern of FORBIDDEN_JAN_COPY) {
      assert.equal(pattern.test(text), false, `${rel} matches forbidden ${pattern}`);
    }
  }
});

test('luxe training pack: no claim that outbound messaging is live', () => {
  const corpus = collectPackText([
    ...JAN_FACING,
    'README.md',
    'review/LUXEMAURICE_TRAINING_PACK_REVIEW.md',
    'review/LUXEMAURICE_TRAINING_PACK_REVIEW.html',
    'client-delivery-preparation/DELIVERY_CHECKLIST.md',
  ]);
  assert.doesNotMatch(corpus, /\boutbound (email|WhatsApp|SMS) (automation )?is live\b/i);
  assert.doesNotMatch(corpus, /\b(email|WhatsApp|SMS) automation is live\b/i);
  assert.doesNotMatch(corpus, /\boutbound messaging (automation )?is live\b/i);
  assert.match(corpus, /Not live/i);
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

test('luxe training pack: no secrets or private contact patterns in pack text', () => {
  const allText = REQUIRED_FILES.map(readPack).join('\n');
  for (const pattern of SECRET_PATTERNS) {
    assert.equal(pattern.test(allText), false, `secret-like pattern in pack: ${pattern}`);
  }
  assert.doesNotMatch(allText, /\+230\d{7,}/);
});

test('luxe training pack: approved Jan contact only in send drafts', () => {
  const email = readPack('client-delivery-preparation/DRAFT_EMAIL_TO_JAN.md');
  const send = readPack('client-delivery-preparation/SEND_PACKET_2026-07-14.md');
  assert.match(email, /jan@luxemaurice\.com/);
  assert.match(send, /jan@luxemaurice\.com/);
  const handoff = readPack('client-delivery-preparation/CHATGPT_SEND_AND_FEEDBACK_HANDOFF.md');
  assert.match(handoff, /jan@luxemaurice\.com/);
  const other = REQUIRED_FILES.filter(
    (f) =>
      !f.includes('DRAFT_EMAIL_TO_JAN') &&
      !f.includes('SEND_PACKET') &&
      !f.includes('ANTON_REVIEW_CHANGES') &&
      !f.includes('CHATGPT_SEND_AND_FEEDBACK_HANDOFF'),
  )
    .map(readPack)
    .join('\n');
  assert.doesNotMatch(other, /@luxemaurice\.com/);
});

test('luxe training pack: advisor workflow authenticated and limited', () => {
  const adv = readPack('02-advisor-workflow-guide/ADVISOR_REVIEW_GUIDE.md');
  const review = readPack('review/LUXEMAURICE_TRAINING_PACK_REVIEW.md');
  assert.match(adv, /06-advisor-pipeline-live-request\.png/);
  assert.match(adv, /Received for advisor review/);
  assert.match(adv, /sign(?:ed)?[- ]?in/i);
  assert.match(adv, /read-only|does not (edit|update)|cannot (edit|update)|review (surface|workspace)/i);
  assert.match(review, /read-only/i);
  assert.match(review, /Not live/i);
});

test('luxe training pack: operator guide describes focused-lead workflow', () => {
  const op = readPack('03-operator-workflow-guide/OPERATOR_CHANGE_WORKFLOW.md');
  assert.match(op, /does \*\*not\*\* support these edits/i);
  assert.match(op, /Show all leads/);
  assert.match(op, /Clear selection/);
  assert.match(op, /Focus list on this lead/);
  assert.match(op, /OPERATOR ACTIONS/);
  assert.match(op, /08-change-console-lead-workflow\.png/);
  assert.match(op, /focuses on that row|Focused on/i);
  assert.match(op, /LEADS · LuxeMaurice CRM \(concierge\)|LuxeMaurice CRM \(concierge\)/);
  assert.match(op, /Save updates|stage/i);
});

test('luxe training pack: video 03 reflects focused-lead operator flow', () => {
  const vid = readPack('04-training-video-scripts/VIDEO_03_OPERATOR_WORKFLOW.md');
  assert.match(vid, /08-change-console-lead-workflow\.png/);
  assert.match(vid, /Show all leads/);
  assert.match(vid, /OPERATOR ACTIONS/);
});

test('luxe training pack: review HTML is self-contained local assets', () => {
  const html = readPack('review/LUXEMAURICE_TRAINING_PACK_REVIEW.html');
  assert.match(html, /no network calls|repository-local|Open locally/i);
  assert.doesNotMatch(html, /https?:\/\/(?!lux\.corpflowai\.com)/i);
  assert.match(html, /\.\.\/05-graphics\/captures\//);
});

test('luxe training pack: no runtime app files changed in this worktree vs main (when available)', () => {
  try {
    const out = execSync('git diff --name-only origin/main...HEAD', {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const names = out
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    const runtime = names.filter(
      (n) =>
        /^(pages|api|lib\/server|lib\/cmp|middleware|prisma)\//.test(n) ||
        n === 'middleware.js' ||
        n === 'middleware.ts',
    );
    assert.deepEqual(runtime, [], `unexpected runtime paths: ${runtime.join(', ')}`);
  } catch (err) {
    // Before first commit on branch, compare against working tree vs HEAD.
    const out = execSync('git diff --name-only HEAD', {
      cwd: ROOT,
      encoding: 'utf8',
    });
    const names = out
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    const runtime = names.filter(
      (n) =>
        /^(pages|api|lib\/server|lib\/cmp|middleware|prisma)\//.test(n) ||
        n === 'middleware.js' ||
        n === 'middleware.ts',
    );
    assert.deepEqual(runtime, [], `unexpected runtime paths vs HEAD: ${runtime.join(', ')}`);
  }
});
