/**
 * Bounded HeyGen adapter — mock/fixture transport only (#1143 / #1078 Phase A).
 *
 * Live vendor calls are fail-closed. This module never reads secret values into
 * logs, never sends HTTP to api.heygen.com, and never selects avatar/voice
 * generatively. Fixed IDs are validated when supplied; pending placeholders
 * are accepted only in mock mode.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ASSIGNED_ID_PATTERN,
  GENERATIVE_ID_TOKENS,
  HEYGEN_ADAPTER_ID,
  LIVE_HEYGEN_CALL_BLOCKED,
  PENDING_AVATAR_ID,
  PENDING_VOICE_ID,
  PHASE_A_TRANSPORT_MODE,
  PRIMARY_FPS,
} from './constants.js';
import { isPendingAvatar, isPendingVoice, validateVideoSpec } from './video-spec.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FIXTURE_DIR = path.join(repoRoot, 'data/video-factory/fixtures/heygen');

export const HEYGEN_GENERATE_PATH = '/v2/video/generate';
export const HEYGEN_STATUS_PATH = '/v1/video_status.get';
export const HEYGEN_API_HOST = 'api.heygen.com';

const SENSITIVE_KEY_RE =
  /api[_-]?key|authorization|secret|token|password|cookie|set-cookie|account_email|raw_key/i;

function loadFixture(name) {
  return JSON.parse(readFileSync(path.join(FIXTURE_DIR, name), 'utf8'));
}

function isGenerativeId(id) {
  return GENERATIVE_ID_TOKENS.includes(String(id || '').trim().toLowerCase());
}

function resolvedIdentity(kind, assignment, id, pendingToken) {
  if (isGenerativeId(id)) {
    return { ok: false, error: `${kind} must be a fixed id, not generative (${id})` };
  }
  if (assignment === 'pending_anton_assignment') {
    if (id && id !== pendingToken && !ASSIGNED_ID_PATTERN.test(String(id))) {
      return { ok: false, error: `${kind} pending id is invalid` };
    }
    return { ok: true, id: id || pendingToken, pending: true };
  }
  if (!id || id === pendingToken || !ASSIGNED_ID_PATTERN.test(String(id))) {
    return { ok: false, error: `${kind} requires a fixed vendor id before generation` };
  }
  return { ok: true, id: String(id), pending: false };
}

function parseResolution(resolution) {
  const match = /^(\d{3,4})x(\d{3,4})$/.exec(String(resolution || ''));
  if (!match) return { width: 1920, height: 1080 };
  return { width: Number(match[1]), height: Number(match[2]) };
}

function hexFromBrand() {
  return '#06111F';
}

/**
 * Strip signed query strings and any credential-like keys from vendor metadata.
 * @param {unknown} value
 * @param {string} [key]
 * @returns {unknown}
 */
export function sanitizeHeyGenMetadata(value, key = '') {
  if (SENSITIVE_KEY_RE.test(key)) return '[redacted]';
  if (Array.isArray(value)) return value.map((item) => sanitizeHeyGenMetadata(item));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = sanitizeHeyGenMetadata(v, k);
    }
    return out;
  }
  if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return `${url.origin}${url.pathname}`;
    } catch {
      return '[redacted-url]';
    }
  }
  return value;
}

export function sanitizeCostMetadata(raw) {
  const credits = raw && typeof raw === 'object' ? raw.credits_used ?? raw.credit ?? raw.credits : null;
  const numeric = typeof credits === 'number' && Number.isFinite(credits) ? credits : null;
  return {
    vendor: 'heygen',
    unit: 'credits',
    credits_used: numeric,
    amount_minor: null,
    currency: null,
    estimated: numeric == null,
  };
}

/**
 * Build the vendor generation body from an approved Video Spec. Does not send.
 * @param {Record<string, unknown>} spec
 */
export function buildHeyGenGenerationInput(spec) {
  const validated = validateVideoSpec(spec);
  if (!validated.ok) {
    return {
      ok: false,
      error: 'invalid_video_spec',
      errors: validated.errors,
      payload: null,
    };
  }
  const okSpec = validated.spec;
  const avatar = resolvedIdentity('avatar', okSpec.avatar.assignment, okSpec.avatar.id, PENDING_AVATAR_ID);
  const voice = resolvedIdentity('voice', okSpec.voice.assignment, okSpec.voice.id, PENDING_VOICE_ID);
  if (!avatar.ok || !voice.ok) {
    return {
      ok: false,
      error: 'invalid_fixed_identity',
      errors: [avatar.error, voice.error].filter(Boolean),
      payload: null,
    };
  }

  const { width, height } = parseResolution(okSpec.picture.resolution);
  const videoInputs = okSpec.scenes.map((scene) => ({
    character: {
      type: 'avatar',
      avatar_id: avatar.id,
      avatar_style: okSpec.avatar.style || 'normal',
    },
    voice: {
      type: 'text',
      input_text: scene.spoken_text,
      voice_id: voice.id,
    },
    background: {
      type: 'color',
      value: hexFromBrand(),
    },
  }));

  return {
    ok: true,
    error: null,
    errors: [],
    payload: {
      vendor: 'heygen',
      adapter: HEYGEN_ADAPTER_ID,
      dry_run: true,
      live_call: false,
      identities_pending: Boolean(avatar.pending || voice.pending),
      request: {
        method: 'POST',
        host: HEYGEN_API_HOST,
        path: HEYGEN_GENERATE_PATH,
        body: {
          caption: true,
          dimension: { width, height },
          aspect_ratio: okSpec.picture.aspect_ratio,
          test: true,
          title: okSpec.title,
          callback_id: okSpec.id,
          video_inputs: videoInputs,
        },
      },
      picture: {
        fps: okSpec.picture.fps || PRIMARY_FPS,
        format: okSpec.picture.format,
      },
    },
  };
}

function assertMockMode(mode) {
  const resolved = String(mode || PHASE_A_TRANSPORT_MODE).toLowerCase();
  if (resolved !== 'mock' && resolved !== 'fixture') {
    const err = new Error(
      `${LIVE_HEYGEN_CALL_BLOCKED} — Phase A forbids live HeyGen calls. Mode "${resolved}" is not allowed.`,
    );
    err.code = LIVE_HEYGEN_CALL_BLOCKED;
    throw err;
  }
}

/**
 * @param {{ mode?: string, transport?: { generate?: Function, status?: Function } }} [opts]
 */
export function createHeyGenAdapter(opts = {}) {
  const mode = opts.mode || PHASE_A_TRANSPORT_MODE;
  assertMockMode(mode);

  const transport = opts.transport || createFixtureTransport();

  return {
    id: HEYGEN_ADAPTER_ID,
    mode: 'mock',
    liveCallsEnabled: false,

    buildGenerationInput(spec) {
      return buildHeyGenGenerationInput(spec);
    },

    async generate(spec) {
      const built = buildHeyGenGenerationInput(spec);
      if (!built.ok) {
        return {
          ok: false,
          status: 'rejected',
          error: built.error,
          errors: built.errors,
          job: null,
        };
      }
      const raw = await transport.generate(built.payload);
      const sanitized = sanitizeHeyGenMetadata(raw);
      return {
        ok: true,
        status: 'accepted',
        error: null,
        errors: [],
        job: {
          vendor: 'heygen',
          video_id: sanitized?.data?.video_id || sanitized?.video_id || 'mock-video-wr-phase-a',
          identities_pending: built.payload.identities_pending,
          cost: sanitizeCostMetadata(sanitized?.data || sanitized),
          raw: sanitized,
        },
      };
    },

    async status(videoId, query = {}) {
      if (!videoId || typeof videoId !== 'string') {
        return { ok: false, status: 'invalid', error: 'video_id required', job: null };
      }
      const raw = await transport.status(videoId, query);
      const sanitized = sanitizeHeyGenMetadata(raw);
      const vendorStatus = String(
        sanitized?.data?.status || sanitized?.status || 'unknown',
      ).toLowerCase();
      const mapped = mapVendorStatus(vendorStatus);
      if (mapped === 'unknown') {
        return {
          ok: false,
          status: 'unknown',
          error: `unrecognized vendor status: ${vendorStatus}`,
          job: null,
        };
      }
      const outputUrl = sanitized?.data?.video_url || sanitized?.video_url || null;
      return {
        ok: mapped !== 'failed',
        status: mapped,
        error: mapped === 'failed' ? sanitized?.data?.error || 'vendor_failed' : null,
        job: {
          vendor: 'heygen',
          video_id: videoId,
          duration_seconds: sanitized?.data?.duration ?? sanitized?.duration ?? null,
          output_url: typeof outputUrl === 'string' ? outputUrl : null,
          cost: sanitizeCostMetadata(sanitized?.data || sanitized),
          raw: sanitized,
        },
      };
    },
  };
}

export function mapVendorStatus(status) {
  const token = String(status || '').toLowerCase();
  if (['pending', 'waiting', 'processing', 'running', 'queued'].includes(token)) return 'in_progress';
  if (['completed', 'complete', 'done', 'success'].includes(token)) return 'completed';
  if (['failed', 'error', 'canceled', 'cancelled'].includes(token)) return 'failed';
  return 'unknown';
}

export function createFixtureTransport() {
  return {
    async generate() {
      return loadFixture('generate-accepted.json');
    },
    async status(_videoId, query = {}) {
      const wanted = String(query.status || 'completed').toLowerCase();
      if (wanted === 'pending' || wanted === 'in_progress') return loadFixture('status-pending.json');
      if (wanted === 'failed') return loadFixture('status-failed.json');
      return loadFixture('status-completed.json');
    },
  };
}

/**
 * Hard stop used by CLI and tests when a caller requests a live call.
 * @param {string} [reason]
 */
export function blockLiveHeyGenCall(reason = 'live vendor access requested') {
  const err = new Error(
    `${LIVE_HEYGEN_CALL_BLOCKED} — ${reason}. Stop at the Phase B calibration gate. Do not send HTTP to ${HEYGEN_API_HOST}.`,
  );
  err.code = LIVE_HEYGEN_CALL_BLOCKED;
  throw err;
}

export function credentialPresentButBlocked() {
  const present = Boolean(String(process.env.HEYGEN_API_KEY || '').trim());
  return {
    credential_present: present,
    live_transport: 'blocked',
    reason: LIVE_HEYGEN_CALL_BLOCKED,
  };
}

export { FIXTURE_DIR, isPendingAvatar, isPendingVoice };
