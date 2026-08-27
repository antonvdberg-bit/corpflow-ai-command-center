/**
 * Video Spec loader + validator (#1143).
 *
 * Schema file is the contract. This module adds duration/scene, identity,
 * product-route, and claims safety assertions that JSON Schema cannot express
 * cleanly. No network I/O.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv from 'ajv';

import {
  ASSIGNED_ID_PATTERN,
  CALIBRATION_DURATION_MAX_SECONDS,
  CALIBRATION_DURATION_MIN_SECONDS,
  FORBIDDEN_RECORDING_URL,
  GENERATIVE_ID_TOKENS,
  LAUNCH_DURATION_MAX_SECONDS,
  LAUNCH_DURATION_MIN_SECONDS,
  NAMED_LANDING_URL,
  PENDING_AVATAR_ID,
  PENDING_VOICE_ID,
  PRIMARY_CTA,
  PRODUCT_NAME,
  REQUIRED_TRUST_LINE,
  SKU_TITLE,
  VIDEO_SPEC_SCHEMA_ID,
} from './constants.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCHEMA_PATH = path.join(repoRoot, 'config/video-factory/video-spec.schema.json');
const SPECS_DIR = path.join(repoRoot, 'data/video-factory/specs');

let compiledValidator = null;

function getValidator() {
  if (!compiledValidator) {
    const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
    const ajv = new Ajv({ allErrors: true, strict: false });
    compiledValidator = ajv.compile(schema);
  }
  return compiledValidator;
}

export function countWords(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

function isPendingIdentity(assignment, id, pendingToken) {
  if (assignment === 'pending_anton_assignment') {
    return id == null || id === pendingToken;
  }
  return false;
}

function identityErrors(kind, assignment, id, pendingToken) {
  const errors = [];
  const token = String(id || '').trim().toLowerCase();
  if (GENERATIVE_ID_TOKENS.includes(token)) {
    errors.push(`${kind}.id must be a fixed identity, not generative selection (${id})`);
    return errors;
  }
  if (assignment === 'pending_anton_assignment') {
    if (id != null && id !== pendingToken && !ASSIGNED_ID_PATTERN.test(String(id))) {
      errors.push(`${kind}.id pending assignment must be null, ${pendingToken}, or a later fixed id`);
    }
    return errors;
  }
  if (assignment === 'fixed') {
    if (!id || id === pendingToken) {
      errors.push(`${kind}.id is required when assignment is fixed`);
    } else if (!ASSIGNED_ID_PATTERN.test(String(id))) {
      errors.push(`${kind}.id is not a valid fixed vendor id`);
    }
  }
  return errors;
}

function sceneTimingErrors(spec) {
  const errors = [];
  const scenes = spec.scenes || [];
  let cursor = 0;
  for (const scene of scenes) {
    if (Math.abs(scene.start_seconds - cursor) > 0.05) {
      errors.push(
        `scene ${scene.id}: start_seconds=${scene.start_seconds} does not follow previous end ${cursor}`,
      );
    }
    cursor += scene.duration_seconds;
  }
  const planned = spec.duration?.planned_seconds;
  if (typeof planned === 'number' && Math.abs(cursor - planned) > 0.2) {
    errors.push(`planned_seconds=${planned} does not match scene total ${cursor}`);
  }
  const min = spec.duration?.target_seconds_min;
  const max = spec.duration?.target_seconds_max;
  if (typeof min === 'number' && typeof max === 'number') {
    if (cursor < min || cursor > max) {
      errors.push(`scene total ${cursor}s is outside target window ${min}-${max}s`);
    }
    if (spec.role === 'launch') {
      if (min !== LAUNCH_DURATION_MIN_SECONDS || max !== LAUNCH_DURATION_MAX_SECONDS) {
        errors.push(`launch videos must target ${LAUNCH_DURATION_MIN_SECONDS}-${LAUNCH_DURATION_MAX_SECONDS}s`);
      }
    }
    if (spec.role === 'calibration') {
      if (min !== CALIBRATION_DURATION_MIN_SECONDS || max !== CALIBRATION_DURATION_MAX_SECONDS) {
        errors.push(
          `calibration videos must target ${CALIBRATION_DURATION_MIN_SECONDS}-${CALIBRATION_DURATION_MAX_SECONDS}s`,
        );
      }
    }
  }
  return errors;
}

function productRouteErrors(spec) {
  const errors = [];
  const forbidden = spec.product?.forbidden_recording_urls || [];
  if (!forbidden.includes(FORBIDDEN_RECORDING_URL)) {
    errors.push(`product.forbidden_recording_urls must include ${FORBIDDEN_RECORDING_URL}`);
  }
  if (spec.cta?.destination_url !== NAMED_LANDING_URL) {
    errors.push('cta.destination_url must be the named Website Rescue landing');
  }
  if (spec.cta?.label !== PRIMARY_CTA) {
    errors.push(`cta.label must be "${PRIMARY_CTA}"`);
  }
  if (spec.product?.name !== PRODUCT_NAME) {
    errors.push(`product.name must be "${PRODUCT_NAME}"`);
  }
  const skuAsTitle = new RegExp(`\\b${SKU_TITLE}\\b`, 'i');
  const spoken = `${spec.script?.full_text || ''} ${(spec.scenes || []).map((s) => s.spoken_text).join(' ')}`;
  if (skuAsTitle.test(spoken)) {
    errors.push('script must not speak the SKU title as the product name');
  }
  if (spec.thumbnail?.title_text && skuAsTitle.test(spec.thumbnail.title_text)) {
    errors.push('thumbnail must not use the SKU title');
  }
  return errors;
}

function claimsErrors(spec) {
  const errors = [];
  const trust = spec.claims?.required_trust_line || '';
  if (!/do not guarantee new revenue/i.test(trust) && trust !== REQUIRED_TRUST_LINE) {
    errors.push('claims.required_trust_line must retain the no-revenue-guarantee wording');
  }
  const full = spec.script?.full_text || '';
  if (!/do not guarantee new revenue/i.test(full)) {
    errors.push('script.full_text must include the required no-revenue-guarantee line');
  }
  const counted = countWords(full);
  if (spec.script && spec.script.word_count !== counted) {
    errors.push(`script.word_count=${spec.script.word_count} does not match actual ${counted}`);
  }
  return errors;
}

function publicationErrors(spec) {
  const errors = [];
  if (spec.publication?.auto_publish !== false) errors.push('publication.auto_publish must be false');
  if (spec.publication?.youtube_upload !== false) errors.push('publication.youtube_upload must be false in Phase A');
  if (spec.publication?.website_embed !== false) errors.push('publication.website_embed must be false in Phase A');
  if (spec.role === 'calibration' && spec.status !== 'blocked_pending_phase_b') {
    errors.push('calibration spec must remain blocked_pending_phase_b until the Phase B gate');
  }
  if (spec.role === 'launch' && spec.phase === 'A' && spec.status !== 'approved_for_mock') {
    errors.push('Phase A launch specs must be approved_for_mock');
  }
  return errors;
}

/**
 * @param {unknown} spec
 * @returns {{ ok: boolean, errors: string[], spec: Record<string, unknown> | null }}
 */
export function validateVideoSpec(spec) {
  const errors = [];
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
    return { ok: false, errors: ['spec must be an object'], spec: null };
  }
  /** @type {Record<string, unknown>} */
  const candidate = spec;
  if (candidate.schema !== VIDEO_SPEC_SCHEMA_ID) {
    errors.push(`schema must be ${VIDEO_SPEC_SCHEMA_ID}`);
  }
  const validateFn = getValidator();
  const schemaOk = validateFn(candidate);
  if (!schemaOk) {
    for (const err of validateFn.errors || []) {
      errors.push(`${err.instancePath || '(root)'} ${err.message}`);
    }
  }
  errors.push(...identityErrors('avatar', candidate.avatar?.assignment, candidate.avatar?.id, PENDING_AVATAR_ID));
  errors.push(...identityErrors('voice', candidate.voice?.assignment, candidate.voice?.id, PENDING_VOICE_ID));
  errors.push(...sceneTimingErrors(candidate));
  errors.push(...productRouteErrors(candidate));
  errors.push(...claimsErrors(candidate));
  errors.push(...publicationErrors(candidate));

  const unique = [...new Set(errors)];
  return {
    ok: unique.length === 0,
    errors: unique,
    spec: unique.length === 0 ? candidate : null,
  };
}

export function loadVideoSpecFromFile(filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(repoRoot, filePath);
  const raw = JSON.parse(readFileSync(abs, 'utf8'));
  return { path: abs, ...validateVideoSpec(raw) };
}

export function listBundledSpecPaths() {
  return [
    path.join(SPECS_DIR, 'cf-vid-wr-what-it-does.v1.json'),
    path.join(SPECS_DIR, 'cf-vid-wr-before-after-enquiry.v1.json'),
    path.join(SPECS_DIR, 'cf-vid-wr-calibration-20s.v1.json'),
  ];
}

export function loadBundledVideoSpecs() {
  return listBundledSpecPaths().map((filePath) => loadVideoSpecFromFile(filePath));
}

export function isPendingAvatar(spec) {
  return isPendingIdentity(spec?.avatar?.assignment, spec?.avatar?.id, PENDING_AVATAR_ID);
}

export function isPendingVoice(spec) {
  return isPendingIdentity(spec?.voice?.assignment, spec?.voice?.id, PENDING_VOICE_ID);
}

export { SCHEMA_PATH, SPECS_DIR, repoRoot as VIDEO_FACTORY_REPO_ROOT };
