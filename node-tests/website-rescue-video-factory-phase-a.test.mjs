import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import Ajv from 'ajv';

import {
  FORBIDDEN_RECORDING_URL,
  LIVE_HEYGEN_CALL_BLOCKED,
  NAMED_LANDING_URL,
  PENDING_AVATAR_ID,
  PRIMARY_CTA,
  PRODUCT_NAME,
  VIDEO_IDS,
} from '../lib/video-factory/constants.js';
import { findForbiddenClaims, findPrivacyViolations } from '../lib/video-factory/claims.js';
import {
  blockLiveHeyGenCall,
  buildHeyGenGenerationInput,
  createHeyGenAdapter,
  credentialPresentButBlocked,
  sanitizeHeyGenMetadata,
} from '../lib/video-factory/heygen-adapter.js';
import { runQcReport } from '../lib/video-factory/qc-report.js';
import {
  countWords,
  loadBundledVideoSpecs,
  loadVideoSpecFromFile,
  validateVideoSpec,
} from '../lib/video-factory/video-spec.js';

const ROOT = process.cwd();
const WHAT_IT_DOES = path.join(ROOT, 'data/video-factory/specs/cf-vid-wr-what-it-does.v1.json');
const BEFORE_AFTER = path.join(ROOT, 'data/video-factory/specs/cf-vid-wr-before-after-enquiry.v1.json');
const CALIBRATION = path.join(ROOT, 'data/video-factory/specs/cf-vid-wr-calibration-20s.v1.json');
const SPEC_SCHEMA = path.join(ROOT, 'config/video-factory/video-spec.schema.json');
const QC_SCHEMA = path.join(ROOT, 'config/video-factory/qc-report.schema.json');

function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function loadFixture(name) {
  const media = loadJson(path.join(ROOT, 'data/video-factory/fixtures/qc', `${name}-media.json`));
  const captionsText = readFileSync(
    path.join(ROOT, 'data/video-factory/fixtures/qc', `${name}-captions.vtt`),
    'utf8',
  );
  return { media, captionsText };
}

describe('Website Rescue Video Factory Phase A (#1143)', () => {
  it('validates the two launch specs and the blocked calibration spec', () => {
    const results = loadBundledVideoSpecs();
    assert.equal(results.length, 3);
    for (const result of results) {
      assert.equal(result.ok, true, JSON.stringify(result.errors));
    }
    const byId = Object.fromEntries(results.map((r) => [r.spec.id, r.spec]));
    assert.equal(byId[VIDEO_IDS.whatItDoes].status, 'approved_for_mock');
    assert.equal(byId[VIDEO_IDS.beforeAfterEnquiry].status, 'approved_for_mock');
    assert.equal(byId[VIDEO_IDS.calibration].status, 'blocked_pending_phase_b');
    assert.equal(byId[VIDEO_IDS.calibration].role, 'calibration');
  });

  it('binds launch specs to named Website Rescue routes, CTA, and duration window', () => {
    for (const filePath of [WHAT_IT_DOES, BEFORE_AFTER]) {
      const spec = loadJson(filePath);
      assert.equal(spec.product.name, PRODUCT_NAME);
      assert.equal(spec.product.named_landing_url, NAMED_LANDING_URL);
      assert.equal(spec.cta.label, PRIMARY_CTA);
      assert.equal(spec.cta.destination_url, NAMED_LANDING_URL);
      assert.ok(spec.product.forbidden_recording_urls.includes(FORBIDDEN_RECORDING_URL));
      assert.equal(spec.duration.target_seconds_min, 60);
      assert.equal(spec.duration.target_seconds_max, 90);
      assert.equal(spec.picture.aspect_ratio, '16:9');
      assert.equal(spec.avatar.id, PENDING_AVATAR_ID);
      assert.equal(spec.publication.auto_publish, false);
      assert.equal(spec.script.word_count, countWords(spec.script.full_text));
      assert.match(spec.script.full_text, /do not guarantee new revenue/i);
      assert.equal(new RegExp(FORBIDDEN_RECORDING_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(spec.script.full_text), false);
    }
  });

  it('cross-checks bundled specs against the JSON Schema with ajv', () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(loadJson(SPEC_SCHEMA));
    for (const filePath of [WHAT_IT_DOES, BEFORE_AFTER, CALIBRATION]) {
      const ok = validate(loadJson(filePath));
      assert.equal(ok, true, JSON.stringify(validate.errors));
    }
  });

  it('fails closed on missing avatar/voice or generative selection', () => {
    const spec = loadJson(WHAT_IT_DOES);
    const missing = structuredClone(spec);
    missing.avatar.assignment = 'fixed';
    missing.avatar.id = null;
    const missingResult = validateVideoSpec(missing);
    assert.equal(missingResult.ok, false);
    assert.ok(missingResult.errors.some((e) => /avatar\.id/.test(e)));

    const generative = structuredClone(spec);
    generative.voice.assignment = 'fixed';
    generative.voice.id = 'auto';
    const genSpec = validateVideoSpec(generative);
    assert.equal(genSpec.ok, false);
    assert.ok(genSpec.errors.some((e) => /generative|auto/i.test(e)));
    const genResult = buildHeyGenGenerationInput(generative);
    assert.equal(genResult.ok, false);
    assert.equal(genResult.error, 'invalid_video_spec');
  });

  it('builds mock generation input and never calls fetch', async () => {
    const spec = loadJson(WHAT_IT_DOES);
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = async () => {
      fetchCalls += 1;
      throw new Error('fetch must not be called in Phase A');
    };
    try {
      const adapter = createHeyGenAdapter({ mode: 'mock' });
      const generated = await adapter.generate(spec);
      const pending = await adapter.status(generated.job.video_id, { status: 'pending' });
      const completed = await adapter.status(generated.job.video_id, { status: 'completed' });
      const failed = await adapter.status(generated.job.video_id, { status: 'failed' });
      assert.equal(generated.ok, true);
      assert.equal(generated.job.identities_pending, true);
      assert.equal(pending.status, 'in_progress');
      assert.equal(completed.status, 'completed');
      assert.equal(failed.status, 'failed');
      assert.equal(completed.job.output_url, 'https://files.heygen.com/mock/phase-a.mp4');
      assert.equal(completed.job.cost.credits_used, 1.5);
      assert.equal(completed.job.raw?.data?.api_key, '[redacted]');
      assert.equal(fetchCalls, 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('sanitizes signed URLs and secret-like keys from vendor metadata', () => {
    const sanitized = sanitizeHeyGenMetadata({
      authorization: 'Bearer secret',
      video_url: 'https://files.heygen.com/out.mp4?token=abc',
      nested: { api_key: 'xyz', ok: 1 },
    });
    assert.equal(sanitized.authorization, '[redacted]');
    assert.equal(sanitized.video_url, 'https://files.heygen.com/out.mp4');
    assert.equal(sanitized.nested.api_key, '[redacted]');
    assert.equal(sanitized.nested.ok, 1);
  });

  it('blocks live HeyGen mode and --live style calls', () => {
    assert.throws(() => createHeyGenAdapter({ mode: 'live' }), (err) => {
      assert.equal(err.code, LIVE_HEYGEN_CALL_BLOCKED);
      return true;
    });
    assert.throws(() => blockLiveHeyGenCall('test'), (err) => {
      assert.match(err.message, /LIVE_HEYGEN_CALL_BLOCKED/);
      return true;
    });
    const probe = credentialPresentButBlocked();
    assert.equal(probe.live_transport, 'blocked');
    assert.equal(typeof probe.credential_present, 'boolean');
  });

  it('accepts a later-supplied fixed avatar/voice id in mock generate', async () => {
    const spec = structuredClone(loadJson(CALIBRATION));
    spec.avatar.assignment = 'fixed';
    spec.avatar.id = 'AvatarID0WebsiteRescue01';
    spec.voice.assignment = 'fixed';
    spec.voice.id = 'VoiceID0WebsiteRescue01';
    const built = buildHeyGenGenerationInput(spec);
    assert.equal(built.ok, true, JSON.stringify(built.errors));
    assert.equal(built.payload.identities_pending, false);
    assert.equal(built.payload.request.body.video_inputs[0].character.avatar_id, 'AvatarID0WebsiteRescue01');
    const adapter = createHeyGenAdapter();
    const generated = await adapter.generate(spec);
    assert.equal(generated.ok, true);
    assert.equal(generated.job.identities_pending, false);
  });

  it('QC fixtures prove PASS / FAIL / REVIEW and stay unpublished', () => {
    const spec = loadJson(WHAT_IT_DOES);
    const passFx = loadFixture('pass');
    const failFx = loadFixture('fail');
    const reviewFx = loadFixture('review');

    const pass = runQcReport({
      spec,
      media: passFx.media,
      captionsText: passFx.captionsText,
      transcript: passFx.media.transcript,
      nowIso: '2026-08-27T00:00:00.000Z',
    });
    const fail = runQcReport({
      spec,
      media: failFx.media,
      captionsText: failFx.captionsText,
      transcript: failFx.media.transcript,
      nowIso: '2026-08-27T00:00:00.000Z',
    });
    const review = runQcReport({
      spec,
      media: reviewFx.media,
      captionsText: reviewFx.captionsText,
      transcript: reviewFx.media.transcript,
      nowIso: '2026-08-27T00:00:00.000Z',
    });

    assert.equal(pass.verdict, 'PASS', JSON.stringify(pass.defects));
    assert.equal(fail.verdict, 'FAIL');
    assert.equal(review.verdict, 'REVIEW', JSON.stringify(review));
    assert.equal(pass.publication_blocked, true);
    assert.equal(fail.publication_blocked, true);
    assert.equal(review.publication_blocked, true);

    const failIds = new Set(fail.defects.map((d) => d.check_id));
    assert.ok(failIds.has('duration'));
    assert.ok(failIds.has('scene_presence'));
    assert.ok(failIds.has('safe_claims'));
    assert.ok(failIds.has('privacy'));
    assert.ok(failIds.has('product_url_cta'));
    assert.ok(failIds.has('sku_alias'));
    assert.ok(failIds.has('black_frame'));

    const ajv = new Ajv({ allErrors: true, strict: false });
    const validateQc = ajv.compile(loadJson(QC_SCHEMA));
    assert.equal(validateQc(pass), true, JSON.stringify(validateQc.errors));
    assert.equal(validateQc(fail), true, JSON.stringify(validateQc.errors));
    assert.equal(validateQc(review), true, JSON.stringify(validateQc.errors));
  });

  it('flags forbidden claims and private email independently of a spec', () => {
    const claims = findForbiddenClaims('This product guaranteed more sales. Choose payment path.');
    assert.ok(claims.some((c) => c.id === 'guaranteed_revenue'));
    assert.ok(claims.some((c) => c.id === 'choose_payment_path'));
    const privacy = findPrivacyViolations('Contact owner@harbour-real-client.com and tenant_id=abc');
    assert.ok(privacy.some((p) => p.id === 'private_email'));
    assert.ok(privacy.some((p) => p.id === 'tenant_id'));
    assert.equal(findPrivacyViolations('support@corpflowai.com').length, 0);
  });

  it('keeps example QC artifacts in repo after generate', () => {
    const spec = loadJson(WHAT_IT_DOES);
    for (const name of ['pass', 'fail', 'review']) {
      const fx = loadFixture(name);
      const report = runQcReport({
        spec,
        media: fx.media,
        captionsText: fx.captionsText,
        transcript: fx.media.transcript,
        nowIso: '2026-08-27T00:00:00.000Z',
      });
      const artifact = path.join(
        ROOT,
        'artifacts/video-factory/website-rescue-phase-a',
        `qc-report-${name}.example.json`,
      );
      assert.equal(existsSync(artifact), true, `missing ${artifact}`);
      const saved = loadJson(artifact);
      assert.equal(saved.verdict, report.verdict);
      assert.equal(saved.schema, report.schema);
    }
  });

  it('does not treat the SKU alias as a recording URL in launch specs', () => {
    const what = loadVideoSpecFromFile(WHAT_IT_DOES);
    const before = loadVideoSpecFromFile(BEFORE_AFTER);
    for (const scene of [...what.spec.scenes, ...before.spec.scenes]) {
      assert.equal(scene.source_screen.url.includes('/offers/premium-landing-page-rescue'), false);
    }
  });
});
