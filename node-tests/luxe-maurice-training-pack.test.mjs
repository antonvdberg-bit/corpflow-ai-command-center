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
  '07-content-update-workflow/HOW_TO_UPDATE_WEBSITE_CONTENT.md',
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
  'client-delivery-preparation/guides/HOW_TO_UPDATE_WEBSITE_CONTENT.md',
  'client-delivery-preparation/SEND_PACKET_2026-07-14.md',
  'client-delivery-preparation/DRAFT_FOLLOW_UP_EMAIL_TO_JAN.md',
  'client-delivery-preparation/FOLLOW_UP_SEND_PACKET_2026-07-15.md',
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
  '09-change-content-sprint-upload.png',
  '10-change-attachment-review-publish.png',
  '11-properties-admin-listing-editor.png',
];

const JAN_FACING = [
  '01-client-review-guide/CLIENT_PRIVATE_ACCESS_GUIDE.md',
  '02-advisor-workflow-guide/ADVISOR_REVIEW_GUIDE.md',
  '03-operator-workflow-guide/OPERATOR_CHANGE_WORKFLOW.md',
  '04-training-video-scripts/VIDEO_01_CLIENT_JOURNEY.md',
  '04-training-video-scripts/VIDEO_02_ADVISOR_JOURNEY.md',
  '04-training-video-scripts/VIDEO_03_OPERATOR_WORKFLOW.md',
  '07-content-update-workflow/HOW_TO_UPDATE_WEBSITE_CONTENT.md',
  'client-delivery-preparation/COVER_NOTE.md',
  'client-delivery-preparation/DRAFT_EMAIL_TO_JAN.md',
  'client-delivery-preparation/DRAFT_FOLLOW_UP_EMAIL_TO_JAN.md',
  'client-delivery-preparation/DRAFT_WHATSAPP_TO_JAN.md',
  'client-delivery-preparation/LIMITATIONS_AND_TRAINING_ORDER.md',
  'client-delivery-preparation/guides/CLIENT_PRIVATE_ACCESS_GUIDE.md',
  'client-delivery-preparation/guides/ADVISOR_REVIEW_GUIDE.md',
  'client-delivery-preparation/guides/OPERATOR_CHANGE_WORKFLOW.md',
  'client-delivery-preparation/guides/HOW_TO_UPDATE_WEBSITE_CONTENT.md',
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
});

test('luxe training pack: all eleven PNG graphics physically exist and are copied for delivery', () => {
  for (const name of EXPECTED_GRAPHICS) {
    for (const base of ['05-graphics/captures', 'client-delivery-preparation/graphics']) {
      const p = path.join(PACK, base, name);
      assert.ok(fs.existsSync(p), `missing ${base}/${name}`);
      const st = fs.statSync(p);
      assert.ok(st.size > 1000, `${base}/${name} too small`);
      const buf = fs.readFileSync(p);
      assert.equal(buf[0], 0x89);
      assert.equal(buf[1], 0x50);
      assert.equal(buf[2], 0x4e);
      assert.equal(buf[3], 0x47);
    }
  }
});

test('luxe training pack: Jan PDF and HTML deliverables include content workflow', () => {
  const html = path.join(PACK, 'client-delivery-preparation/LUXEMAURICE_TRAINING_PACK_FOR_JAN.html');
  const pdf = path.join(PACK, 'client-delivery-preparation/LUXEMAURICE_TRAINING_PACK_FOR_JAN.pdf');
  assert.ok(fs.existsSync(html), 'missing Jan HTML');
  assert.ok(fs.existsSync(pdf), 'missing Jan PDF');
  assert.ok(fs.statSync(html).size > 100000, 'Jan HTML too small');
  assert.ok(fs.statSync(pdf).size > 50000, 'Jan PDF too small');
  const htmlText = fs.readFileSync(html, 'utf8');
  assert.match(htmlText, /LuxeMaurice AI training pack/);
  assert.match(htmlText, /Verification edition:<\/strong> 15 July 2026/);
  assert.match(htmlText, /How to upload and update LuxeMaurice website content/i);
  assert.match(htmlText, /https:\/\/lux\.corpflowai\.com\/properties\/admin/i);
  assert.match(htmlText, /https:\/\/lux\.corpflowai\.com\/change/i);
  assert.match(htmlText, /not a general CMS/i);
  for (const phrase of [
    'Images/photos',
    'PDFs/documents',
    'Videos/walkthroughs',
    'Property/listing text and visibility',
    'Current public-display limit',
    'Verify after publication',
  ]) {
    assert.match(htmlText, new RegExp(phrase, 'i'), `Jan HTML missing content-update phrase: ${phrase}`);
  }
  assert.match(htmlText, /data:image\/png;base64,/);
  assert.equal((htmlText.match(/<figcaption>/g) || []).length, 22, 'Jan HTML must include figures 01-11 in guides and gallery');
  assert.doesNotMatch(htmlText, /\bCursor\b/);
  assert.doesNotMatch(htmlText, /\bGitHub\b/);
});

test('luxe training pack: review edition includes original eight graphics', () => {
  const md = readPack('review/LUXEMAURICE_TRAINING_PACK_REVIEW.md');
  const html = readPack('review/LUXEMAURICE_TRAINING_PACK_REVIEW.html');
  for (const name of EXPECTED_GRAPHICS.slice(0, 8)) {
    assert.match(md, new RegExp(name.replace('.', '\\.')), `review md missing ${name}`);
    assert.match(html, new RegExp(name.replace('.', '\\.')), `review html missing ${name}`);
  }
});

test('luxe training pack: original pack approval and send evidence recorded', () => {
  const changes = readPack('review/ANTON_REVIEW_CHANGES.md');
  assert.match(changes, /Approved for client-send preparation/);
  assert.match(changes, /Approved for actual external send/);
  assert.match(changes, /No message was sent by the packaging agent/i);

  const delivery = readPack('client-delivery-preparation/DELIVERY_CHECKLIST.md');
  const send = readPack('client-delivery-preparation/SEND_PACKET_2026-07-14.md');
  assert.match(delivery, /Anton explicitly approved external send/);
  assert.match(delivery, /\[x\] Pack sent to Jan/i);
  assert.match(delivery, /\[x\] Delivery evidence recorded/i);
  assert.match(send, /\*\*Pack sent to Jan:\*\*\s*YES/i);
  assert.match(send, /Anton confirmed|mail sent|Email transmission/i);
});

test('luxe training pack: follow-up email draft remains draft copy', () => {
  const email = readPack('client-delivery-preparation/DRAFT_FOLLOW_UP_EMAIL_TO_JAN.md');
  assert.match(email, /\*\*Subject:\*\*\s*Updated LuxeMaurice training documentation for verification/i);
  assert.match(email, /existing LuxeMaurice content workflow step by step/i);
  assert.match(email, /property editor for listing text and visibility/i);
  assert.match(email, /Change Console for governed image, video, and PDF\/document uploads/i);
  assert.match(email, /confirm whether this answers your question about how content is provided and displayed/i);
  assert.match(email, /DRAFT\s*[—-]\s*NOT SENT/i);
  assert.doesNotMatch(email, /\bPR\s*#?\d+|Markdown|capture checklist/i);
});

test('luxe training pack: corrected follow-up send evidence is recorded after Anton confirmation', () => {
  const packet = readPack('client-delivery-preparation/FOLLOW_UP_SEND_PACKET_2026-07-15.md');
  const checklist = readPack('client-delivery-preparation/DELIVERY_CHECKLIST.md');

  assert.match(packet, /PR #609 corrected after Anton review/i);
  assert.match(packet, /did not answer Jan's actual content-upload\/content-display question/i);
  assert.match(packet, /No parallel content system was created/i);
  assert.match(packet, /existing protected tools/i);
  assert.match(packet, /No recorded training videos are claimed/i);
  assert.match(packet, /\[x\] Anton reviewed updated PDF/);
  assert.match(packet, /\[x\] Anton approved follow-up email/);
  assert.match(packet, /\[x\] Follow-up email sent by Anton \/ ChatGPT/);
  assert.match(packet, /\[x\] Transmission evidence recorded below/);
  assert.match(packet, /Anton confirmed in ChatGPT: "done - sent"/);
  assert.match(packet, /Attachment confirmed \| `LUXEMAURICE_TRAINING_PACK_FOR_JAN\.pdf` attached manually before send/i);
  assert.match(packet, /No messaging automation was triggered/i);

  assert.match(checklist, /\[x\] Anton reviewed updated PDF/);
  assert.match(checklist, /\[x\] Anton approved follow-up email/);
  assert.match(checklist, /\[x\] Updated verification follow-up sent to Jan/);
  assert.match(checklist, /\[x\] Follow-up transmission evidence recorded/);
  assert.match(checklist, /\[ \] Jan verification response captured/);
});

test('luxe training pack: manifest lists all delivery graphics and chrome crop for 06', () => {
  const manifest = readPack('05-graphics/GRAPHICS_MANIFEST.md');
  for (const name of EXPECTED_GRAPHICS) {
    assert.match(manifest, new RegExp(name.replace('.', '\\.')), `manifest missing ${name}`);
  }
  assert.match(manifest, /BROWSER_CHROME_CROPPED/);
  assert.match(manifest, /FOCUSED_TO_TRAINING_REQUEST/);
  assert.match(manifest, /PRIVACY_REVIEWED/);
  assert.doesNotMatch(manifest, /CAPTURE_REQUIRED/);
});

test('luxe training pack: content-update guide documents the existing governed workflow truthfully', () => {
  const source = readPack('07-content-update-workflow/HOW_TO_UPDATE_WEBSITE_CONTENT.md');
  const delivery = readPack('client-delivery-preparation/guides/HOW_TO_UPDATE_WEBSITE_CONTENT.md');
  const corpus = `${source}\n${delivery}`;
  assert.match(corpus, /How to upload and update LuxeMaurice website content/i);
  assert.match(corpus, /https:\/\/lux\.corpflowai\.com\/properties\/admin/i);
  assert.match(corpus, /https:\/\/lux\.corpflowai\.com\/change/i);
  assert.match(corpus, /No separate CMS or second upload system is needed/i);
  assert.match(corpus, /Upload content/i);
  assert.match(corpus, /Mark reviewed/i);
  assert.match(corpus, /hero.*card.*gallery/is);
  assert.match(corpus, /application\/pdf/i);
  assert.match(corpus, /video\/\*/i);
  assert.match(corpus, /public-display limit/i);
  assert.match(corpus, /public video player.*not|no current public video player/is);
  assert.match(corpus, /public Luxe brochure\/download component today|no public Luxe brochure\/download component today/i);
  assert.match(corpus, /draft.*preview.*published.*archived/is);
  assert.match(corpus, /Approved.*Changes needed/is);
  assert.doesNotMatch(corpus, /video uploads? (are|is) automatically public|PDF uploads? (are|is) automatically public/i);
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
  const corpus = collectPackText([...JAN_FACING, 'README.md', 'review/LUXEMAURICE_TRAINING_PACK_REVIEW.md', 'review/LUXEMAURICE_TRAINING_PACK_REVIEW.html']);
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

test('luxe training pack: approved Jan contact only in send drafts and send packets', () => {
  const email = readPack('client-delivery-preparation/DRAFT_EMAIL_TO_JAN.md');
  const send = readPack('client-delivery-preparation/SEND_PACKET_2026-07-14.md');
  const handoff = readPack('client-delivery-preparation/CHATGPT_SEND_AND_FEEDBACK_HANDOFF.md');
  assert.match(email, /jan@luxemaurice\.com/);
  assert.match(send, /jan@luxemaurice\.com/);
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

test('luxe training pack: advisor and operator workflows remain documented', () => {
  const adv = readPack('02-advisor-workflow-guide/ADVISOR_REVIEW_GUIDE.md');
  const op = readPack('03-operator-workflow-guide/OPERATOR_CHANGE_WORKFLOW.md');
  const vid = readPack('04-training-video-scripts/VIDEO_03_OPERATOR_WORKFLOW.md');
  assert.match(adv, /06-advisor-pipeline-live-request\.png/);
  assert.match(adv, /Received for advisor review/);
  assert.match(adv, /sign(?:ed)?[- ]?in/i);
  assert.match(adv, /read-only|does not (edit|update)|cannot (edit|update)|review (surface|workspace)/i);
  assert.match(op, /Show all leads/);
  assert.match(op, /Clear selection/);
  assert.match(op, /Focus list on this lead/);
  assert.match(op, /OPERATOR ACTIONS/);
  assert.match(op, /08-change-console-lead-workflow\.png/);
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
    const runtime = out
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .filter(
        (n) =>
          /^(pages|api|lib\/server|lib\/cmp|middleware|prisma)\//.test(n) ||
          n === 'middleware.js' ||
          n === 'middleware.ts',
      );
    assert.deepEqual(runtime, [], `unexpected runtime paths: ${runtime.join(', ')}`);
  } catch {
    const out = execSync('git diff --name-only HEAD', { cwd: ROOT, encoding: 'utf8' });
    const runtime = out
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .filter(
        (n) =>
          /^(pages|api|lib\/server|lib\/cmp|middleware|prisma)\//.test(n) ||
          n === 'middleware.js' ||
          n === 'middleware.ts',
      );
    assert.deepEqual(runtime, [], `unexpected runtime paths vs HEAD: ${runtime.join(', ')}`);
  }
});
