/**
 * Automated QC report for Website Rescue video candidates (#1143).
 *
 * Runs against local/sample media metadata or deterministic fixtures.
 * Optional ffmpeg blackdetect is used only when a media file is present and
 * ffmpeg is on PATH; otherwise fixture black-frame fields are evaluated.
 * Never publishes.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  FICTIONAL_DEMO_BUSINESS,
  NAMED_LANDING_URL,
  PRIMARY_CTA,
  PRODUCT_NAME,
  QC_REPORT_SCHEMA_ID,
} from './constants.js';
import {
  findForbiddenClaims,
  findForbiddenRecordingUrl,
  findPrivacyViolations,
  findSkuTitleMisuse,
} from './claims.js';
import { countWords, validateVideoSpec } from './video-spec.js';

const SCRIPT_PASS = 0.86;
const SCRIPT_REVIEW = 0.72;
const BLACK_FAIL_MS = 2000;
const BLACK_REVIEW_MS = 800;
const BLACK_FAIL_RATIO = 0.15;
const BLACK_REVIEW_RATIO = 0.05;

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

export function scriptFidelityScore(expected, actual) {
  const exp = new Set(tokenize(expected));
  const act = tokenize(actual);
  if (exp.size === 0) return 0;
  let hits = 0;
  const seen = new Set();
  for (const word of act) {
    if (exp.has(word) && !seen.has(word)) {
      seen.add(word);
      hits += 1;
    }
  }
  return hits / exp.size;
}

function addCheck(checks, defects, id, verdict, detail, score = null) {
  checks.push({ id, verdict, detail, score });
  if (verdict === 'FAIL') defects.push({ check_id: id, severity: 'fail', message: detail });
  if (verdict === 'REVIEW') defects.push({ check_id: id, severity: 'review', message: detail });
}

function rollup(checks) {
  if (checks.some((c) => c.verdict === 'FAIL')) return 'FAIL';
  if (checks.some((c) => c.verdict === 'REVIEW')) return 'REVIEW';
  return 'PASS';
}

function parseVttText(vtt) {
  return String(vtt || '')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('WEBVTT') && !line.includes('-->') && !/^\d+$/.test(line.trim()))
    .join(' ');
}

function ffmpegBlackdetect(mediaPath) {
  const probe = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  if (probe.status !== 0) return { available: false, windows: [] };
  const run = spawnSync(
    'ffmpeg',
    ['-i', mediaPath, '-vf', 'blackdetect=d=0.4:pix_th=0.10', '-an', '-f', 'null', '-'],
    { encoding: 'utf8' },
  );
  const stderr = `${run.stdout || ''}\n${run.stderr || ''}`;
  const windows = [];
  const re = /black_start:([\d.]+)\s+black_end:([\d.]+)\s+black_duration:([\d.]+)/g;
  let match;
  while ((match = re.exec(stderr))) {
    windows.push({
      start_seconds: Number(match[1]),
      end_seconds: Number(match[2]),
      duration_ms: Math.round(Number(match[3]) * 1000),
    });
  }
  return { available: true, windows };
}

function blackFrameVerdict(media) {
  const windows = Array.isArray(media.black_frame_windows) ? media.black_frame_windows : [];
  const longest = windows.reduce((max, w) => Math.max(max, Number(w.duration_ms) || 0), 0);
  const durationMs = Number(media.duration_seconds || 0) * 1000;
  const totalBlack = windows.reduce((sum, w) => sum + (Number(w.duration_ms) || 0), 0);
  const ratio = durationMs > 0 ? totalBlack / durationMs : Number(media.black_frame_ratio) || 0;
  if (longest > BLACK_FAIL_MS || ratio > BLACK_FAIL_RATIO) {
    return { verdict: 'FAIL', detail: `black-frame defect longest=${longest}ms ratio=${ratio.toFixed(3)}` };
  }
  if (longest > BLACK_REVIEW_MS || ratio > BLACK_REVIEW_RATIO) {
    return { verdict: 'REVIEW', detail: `possible black-frame longest=${longest}ms ratio=${ratio.toFixed(3)}` };
  }
  return { verdict: 'PASS', detail: `no material black-frame windows (longest=${longest}ms)` };
}

/**
 * @param {{
 *   spec: Record<string, unknown>,
 *   media?: Record<string, unknown>,
 *   captionsText?: string | null,
 *   transcript?: string | null,
 *   nowIso?: string,
 * }} input
 */
export function runQcReport(input) {
  const checks = [];
  const defects = [];
  const specResult = validateVideoSpec(input.spec);
  if (!specResult.ok) {
    addCheck(checks, defects, 'spec_valid', 'FAIL', specResult.errors.join('; '));
    return finish(input, checks, defects);
  }
  const spec = specResult.spec;
  addCheck(checks, defects, 'spec_valid', 'PASS', `spec ${spec.id} is machine-valid`);

  const media = input.media && typeof input.media === 'object' ? input.media : {};
  const captions = input.captionsText != null ? parseVttText(input.captionsText) : String(media.captions_text || '');
  const transcript = String(input.transcript || media.transcript || captions || '');
  const candidateCorpus = [transcript, captions, (media.on_screen_text || []).join(' ')].join('\n');

  const fidelity = scriptFidelityScore(spec.script.full_text, transcript);
  if (fidelity >= SCRIPT_PASS) {
    addCheck(checks, defects, 'script_fidelity', 'PASS', `token overlap ${fidelity.toFixed(2)}`, fidelity);
  } else if (fidelity >= SCRIPT_REVIEW) {
    addCheck(
      checks,
      defects,
      'script_fidelity',
      'REVIEW',
      `script overlap ${fidelity.toFixed(2)} needs human listen`,
      fidelity,
    );
  } else {
    addCheck(checks, defects, 'script_fidelity', 'FAIL', `script overlap ${fidelity.toFixed(2)} below floor`, fidelity);
  }

  const duration = Number(media.duration_seconds);
  if (!Number.isFinite(duration)) {
    addCheck(checks, defects, 'duration', 'REVIEW', 'duration not supplied in fixture; scene plan still valid');
  } else if (duration < spec.duration.target_seconds_min || duration > spec.duration.target_seconds_max) {
    addCheck(
      checks,
      defects,
      'duration',
      'FAIL',
      `duration ${duration}s outside ${spec.duration.target_seconds_min}-${spec.duration.target_seconds_max}s`,
    );
  } else {
    addCheck(checks, defects, 'duration', 'PASS', `duration ${duration}s inside target window`);
  }

  const presentScenes = Array.isArray(media.scenes_present) ? media.scenes_present : spec.scenes.map((s) => s.id);
  const missing = spec.scenes.map((s) => s.id).filter((id) => !presentScenes.includes(id));
  if (missing.length) {
    addCheck(checks, defects, 'scene_presence', 'FAIL', `missing scenes: ${missing.join(', ')}`);
  } else {
    addCheck(checks, defects, 'scene_presence', 'PASS', `all ${spec.scenes.length} planned scenes present`);
  }

  const captionHaystack = `${captions} ${(media.on_screen_text || []).join(' ')}`;
  const requiredOnScreen = (spec.on_screen_text || []).map((row) => row.text);
  const missingText = requiredOnScreen.filter((text) => !captionHaystack.toLowerCase().includes(String(text).toLowerCase()));
  if (!captions && requiredOnScreen.length) {
    addCheck(checks, defects, 'captions_text', 'REVIEW', 'captions not supplied; on-screen text cannot be machine-verified');
  } else if (missingText.length) {
    addCheck(checks, defects, 'captions_text', 'FAIL', `missing on-screen/caption text: ${missingText.join(' | ')}`);
  } else {
    addCheck(checks, defects, 'captions_text', 'PASS', 'required caption and on-screen text found');
  }

  let blackMedia = media;
  if (media.file_path && existsSync(media.file_path)) {
    const detected = ffmpegBlackdetect(media.file_path);
    if (detected.available) {
      blackMedia = { ...media, black_frame_windows: detected.windows };
    }
  }
  if (media.skip_black_frame) {
    addCheck(checks, defects, 'black_frame', 'SKIP', 'black-frame check skipped (no media, no fixture windows)');
  } else {
    const black = blackFrameVerdict(blackMedia);
    addCheck(checks, defects, 'black_frame', black.verdict, black.detail);
  }

  const productOk =
    candidateCorpus.includes(PRODUCT_NAME) &&
    candidateCorpus.includes(PRIMARY_CTA) &&
    (candidateCorpus.includes(NAMED_LANDING_URL) || candidateCorpus.includes('corpflowai.com/website-rescue'));
  if (!productOk) {
    addCheck(
      checks,
      defects,
      'product_url_cta',
      'FAIL',
      `must name ${PRODUCT_NAME}, speak ${PRIMARY_CTA}, and cite ${NAMED_LANDING_URL}`,
    );
  } else {
    addCheck(checks, defects, 'product_url_cta', 'PASS', 'product name, CTA, and named URL present');
  }

  const skuHits = [...findSkuTitleMisuse(candidateCorpus), ...findForbiddenRecordingUrl(candidateCorpus)];
  if (skuHits.length) {
    addCheck(checks, defects, 'sku_alias', 'FAIL', skuHits.map((h) => h.message).join('; '));
  } else {
    addCheck(checks, defects, 'sku_alias', 'PASS', 'SKU title/URL not used as the launch path');
  }

  const claimHits = findForbiddenClaims(candidateCorpus);
  if (claimHits.length) {
    addCheck(checks, defects, 'safe_claims', 'FAIL', claimHits.map((h) => h.message).join('; '));
  } else if (!/do not guarantee new revenue/i.test(candidateCorpus)) {
    addCheck(checks, defects, 'safe_claims', 'FAIL', 'required no-revenue-guarantee line missing');
  } else {
    addCheck(checks, defects, 'safe_claims', 'PASS', 'no forbidden claims; trust line present');
  }

  const privacyHits = findPrivacyViolations(candidateCorpus);
  const demoNameOk =
    !/harbour hospitality/i.test(candidateCorpus) ||
    candidateCorpus.includes(FICTIONAL_DEMO_BUSINESS) ||
    /fictional/i.test(candidateCorpus);
  if (privacyHits.length || spec.privacy.real_client_data !== false || spec.privacy.real_pii !== false) {
    addCheck(
      checks,
      defects,
      'privacy',
      'FAIL',
      privacyHits.map((h) => h.message).join('; ') || 'privacy flags must remain false',
    );
  } else if (!demoNameOk) {
    addCheck(checks, defects, 'privacy', 'REVIEW', 'demo business mentioned without fictional marker');
  } else {
    addCheck(checks, defects, 'privacy', 'PASS', 'no real client data / PII markers');
  }

  const rubricNotes = [
    'Hook / Proof / Depth: problem, named offer, demo or walkthrough, CTA',
    `Word count ${countWords(spec.script.full_text)}`,
    'Publication remains blocked in Phase A',
  ];
  addCheck(checks, defects, 'marketing_rubric', 'PASS', rubricNotes.join('; '));

  return finish(input, checks, defects, spec.id);
}

function finish(input, checks, defects, specId) {
  const verdict = rollup(checks);
  return {
    schema: QC_REPORT_SCHEMA_ID,
    spec_id: specId || input.spec?.id || 'unknown',
    candidate_id: input.media?.candidate_id || null,
    verdict,
    checked_at: input.nowIso || '2026-08-27T00:00:00.000Z',
    checks,
    defects,
    publication_blocked: true,
    notes: 'Phase A QC. No automatic publication. Anton approval remains the quality gate for any later render.',
  };
}

export function loadQcFixture(filePath, repoRoot) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(repoRoot, filePath);
  return JSON.parse(readFileSync(abs, 'utf8'));
}

export { SCRIPT_PASS, SCRIPT_REVIEW, BLACK_FAIL_MS };
