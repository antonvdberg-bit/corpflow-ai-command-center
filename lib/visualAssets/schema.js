/**
 * CorpFlowAI visual-asset manifest schema (v1).
 *
 * Dependency-free validator for `data/visual-assets/*.manifest.json` files.
 * The schema is the single source of truth for how CorpFlowAI surfaces
 * (lux, lead-rescue, concierge, properties, change, core) reference
 * visual assets — photos, illustrations, icons, video, lottie, social
 * cards — without coupling page components to the underlying CDN or
 * provider.
 *
 * Scope:
 * - Pure metadata. No binary content lives here.
 * - No secrets. URLs must be public-readable; signed/short-lived URLs
 *   belong in runtime config, not in manifests.
 * - Non-breaking scaffolding: existing pages do not consume this yet.
 *
 * Companion docs:
 * - docs/marketing/CORPFLOW_CONTENT_MODEL.md
 * - docs/marketing/CORPFLOW_ASSET_GOVERNANCE.md
 * - docs/marketing/CORPFLOW_PROMPT_LIBRARY.md
 */

export const VISUAL_ASSET_SCHEMA_VERSION = '1.0.0';

/** @type {readonly string[]} */
export const VISUAL_ASSET_KINDS = Object.freeze([
  'image',
  'illustration',
  'icon',
  'video',
  'lottie',
  'social_card',
]);

/** @type {readonly string[]} */
export const VISUAL_ASSET_SURFACES = Object.freeze([
  'lux',
  'lead-rescue',
  'concierge',
  'properties',
  'france',
  'change',
  'core',
  'shared',
]);

/** @type {readonly string[]} */
export const VISUAL_ASSET_SOURCE_TYPES = Object.freeze([
  'repo',
  'cdn',
  'external_public_url',
  'ai_generated',
]);

/** @type {readonly string[]} */
export const VISUAL_ASSET_LICENCE_TIERS = Object.freeze([
  'corpflow_owned',
  'client_owned',
  'creative_commons',
  'stock_licensed',
  'ai_generated',
]);

/** @type {readonly string[]} */
export const VISUAL_ASSET_LIFECYCLE_STATES = Object.freeze([
  'draft',
  'vetted',
  'published',
  'retired',
]);

const KEBAB_ID_RE = /^[a-z0-9][a-z0-9-]{1,79}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2}))?$/;

const SECRET_LIKE_KEYS = new Set([
  'token',
  'secret',
  'api_key',
  'apikey',
  'password',
  'authorization',
]);

/**
 * @typedef {object} VisualAssetValidationError
 * @property {string} path
 * @property {string} message
 */

/**
 * @typedef {object} VisualAssetValidationResult
 * @property {boolean} ok
 * @property {VisualAssetValidationError[]} errors
 */

/**
 * Validate a visual-asset manifest object. Returns `{ ok, errors }` —
 * does not throw, so callers can aggregate errors across many files.
 *
 * @param {unknown} manifest
 * @param {{ source?: string }} [opts]
 * @returns {VisualAssetValidationResult}
 */
export function validateVisualAssetManifest(manifest, opts = {}) {
  /** @type {VisualAssetValidationError[]} */
  const errors = [];
  const sourceLabel = opts.source ? `${opts.source}: ` : '';

  const push = (path, message) => errors.push({ path, message: `${sourceLabel}${message}` });

  if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) {
    push('$', 'manifest must be a plain object');
    return { ok: false, errors };
  }
  const m = /** @type {Record<string, unknown>} */ (manifest);

  if (m.schema_version !== VISUAL_ASSET_SCHEMA_VERSION) {
    push('schema_version', `must equal "${VISUAL_ASSET_SCHEMA_VERSION}" (got ${JSON.stringify(m.schema_version)})`);
  }

  if (typeof m.id !== 'string' || !KEBAB_ID_RE.test(m.id)) {
    push('id', 'must be kebab-case, 2-80 chars, starting with [a-z0-9]');
  }

  if (typeof m.surface !== 'string' || !VISUAL_ASSET_SURFACES.includes(m.surface)) {
    push('surface', `must be one of ${VISUAL_ASSET_SURFACES.join(', ')}`);
  }

  if (typeof m.kind !== 'string' || !VISUAL_ASSET_KINDS.includes(m.kind)) {
    push('kind', `must be one of ${VISUAL_ASSET_KINDS.join(', ')}`);
  }

  if (typeof m.title !== 'string' || m.title.length < 2 || m.title.length > 200) {
    push('title', 'must be a string between 2 and 200 chars');
  }

  validateSource(m.source, push);
  validateLicence(m.licence, push);
  validateAccessibility(m.accessibility, m.kind, push);
  validateUsage(m.usage, push);
  validateLifecycle(m.lifecycle, push);
  validatePromptProvenance(m, push);
  validateNoSecrets(m, '', push);

  return { ok: errors.length === 0, errors };
}

/**
 * @param {unknown} src
 * @param {(path: string, message: string) => void} push
 */
function validateSource(src, push) {
  if (src === null || typeof src !== 'object' || Array.isArray(src)) {
    push('source', 'must be an object');
    return;
  }
  const s = /** @type {Record<string, unknown>} */ (src);
  if (typeof s.type !== 'string' || !VISUAL_ASSET_SOURCE_TYPES.includes(s.type)) {
    push('source.type', `must be one of ${VISUAL_ASSET_SOURCE_TYPES.join(', ')}`);
  }
  if (s.type === 'repo') {
    if (typeof s.path !== 'string' || !s.path.startsWith('/')) {
      push('source.path', 'repo-hosted assets require a path starting with "/" (workspace-relative)');
    }
  } else {
    if (typeof s.url !== 'string' || !/^https:\/\//.test(s.url)) {
      push('source.url', 'non-repo sources require an https:// URL');
    } else if (/[?&](?:token|secret|sig|signature|key)=/i.test(s.url)) {
      push('source.url', 'URL appears to contain a secret/signed query parameter — store only public-readable URLs');
    }
  }
  if (s.content_hash !== undefined && (typeof s.content_hash !== 'string' || s.content_hash.length < 8)) {
    push('source.content_hash', 'optional; when present, must be a string of >= 8 chars (e.g. sha256 hex)');
  }
}

/**
 * @param {unknown} lic
 * @param {(path: string, message: string) => void} push
 */
function validateLicence(lic, push) {
  if (lic === null || typeof lic !== 'object' || Array.isArray(lic)) {
    push('licence', 'must be an object');
    return;
  }
  const l = /** @type {Record<string, unknown>} */ (lic);
  if (typeof l.tier !== 'string' || !VISUAL_ASSET_LICENCE_TIERS.includes(l.tier)) {
    push('licence.tier', `must be one of ${VISUAL_ASSET_LICENCE_TIERS.join(', ')}`);
  }
  if (typeof l.owner !== 'string' || l.owner.trim().length < 2) {
    push('licence.owner', 'must name the owning party (e.g. "CorpFlowAI", "Lux Maurice")');
  }
  if (typeof l.terms !== 'string' || l.terms.trim().length < 4) {
    push('licence.terms', 'must summarise the licence terms (max 500 chars)');
  } else if (l.terms.length > 500) {
    push('licence.terms', 'must be 500 chars or fewer');
  }
}

/**
 * @param {unknown} a11y
 * @param {unknown} kind
 * @param {(path: string, message: string) => void} push
 */
function validateAccessibility(a11y, kind, push) {
  if (a11y === null || typeof a11y !== 'object' || Array.isArray(a11y)) {
    push('accessibility', 'must be an object');
    return;
  }
  const a = /** @type {Record<string, unknown>} */ (a11y);
  const requiresAlt = kind === 'image' || kind === 'illustration' || kind === 'icon' || kind === 'social_card';
  if (requiresAlt) {
    if (typeof a.alt !== 'string' || a.alt.trim().length < 4 || a.alt.length > 240) {
      push('accessibility.alt', 'must be a meaningful alt string between 4 and 240 chars');
    }
  }
  if (a.lang !== undefined && (typeof a.lang !== 'string' || !/^[a-z]{2}(-[A-Z]{2})?$/.test(a.lang))) {
    push('accessibility.lang', 'optional; when present, must be a BCP-47 short tag (e.g. "en", "en-US", "fr")');
  }
  if (a.decorative !== undefined && typeof a.decorative !== 'boolean') {
    push('accessibility.decorative', 'must be boolean when present');
  }
}

/**
 * @param {unknown} usage
 * @param {(path: string, message: string) => void} push
 */
function validateUsage(usage, push) {
  if (usage === null || typeof usage !== 'object' || Array.isArray(usage)) {
    push('usage', 'must be an object');
    return;
  }
  const u = /** @type {Record<string, unknown>} */ (usage);
  if (!Array.isArray(u.allowed_surfaces) || u.allowed_surfaces.length === 0) {
    push('usage.allowed_surfaces', 'must be a non-empty array of allowed surfaces');
  } else {
    u.allowed_surfaces.forEach((s, i) => {
      if (typeof s !== 'string' || !VISUAL_ASSET_SURFACES.includes(s)) {
        push(`usage.allowed_surfaces[${i}]`, `must be one of ${VISUAL_ASSET_SURFACES.join(', ')}`);
      }
    });
  }
  if (u.primary_cta !== undefined && (typeof u.primary_cta !== 'string' || u.primary_cta.length > 120)) {
    push('usage.primary_cta', 'optional; when present, must be a string up to 120 chars');
  }
}

/**
 * @param {unknown} lifecycle
 * @param {(path: string, message: string) => void} push
 */
function validateLifecycle(lifecycle, push) {
  if (lifecycle === null || typeof lifecycle !== 'object' || Array.isArray(lifecycle)) {
    push('lifecycle', 'must be an object');
    return;
  }
  const l = /** @type {Record<string, unknown>} */ (lifecycle);
  if (typeof l.state !== 'string' || !VISUAL_ASSET_LIFECYCLE_STATES.includes(l.state)) {
    push('lifecycle.state', `must be one of ${VISUAL_ASSET_LIFECYCLE_STATES.join(', ')}`);
  }
  if (l.created_at !== undefined && (typeof l.created_at !== 'string' || !ISO_DATE_RE.test(l.created_at))) {
    push('lifecycle.created_at', 'optional; when present, must be ISO 8601 date or datetime');
  }
  if (l.reviewed_at !== undefined && (typeof l.reviewed_at !== 'string' || !ISO_DATE_RE.test(l.reviewed_at))) {
    push('lifecycle.reviewed_at', 'optional; when present, must be ISO 8601 date or datetime');
  }
  if (l.retired_at !== undefined && (typeof l.retired_at !== 'string' || !ISO_DATE_RE.test(l.retired_at))) {
    push('lifecycle.retired_at', 'optional; when present, must be ISO 8601 date or datetime');
  }
}

/**
 * @param {Record<string, unknown>} m
 * @param {(path: string, message: string) => void} push
 */
function validatePromptProvenance(m, push) {
  const src = /** @type {Record<string, unknown> | null} */ (m.source && typeof m.source === 'object' ? m.source : null);
  const lic = /** @type {Record<string, unknown> | null} */ (m.licence && typeof m.licence === 'object' ? m.licence : null);
  const isAi = (src && src.type === 'ai_generated') || (lic && lic.tier === 'ai_generated');
  const pp = m.prompt_provenance;
  if (!isAi) {
    if (pp !== undefined && (pp === null || typeof pp !== 'object')) {
      push('prompt_provenance', 'when present, must be an object');
    }
    return;
  }
  if (pp === null || typeof pp !== 'object' || Array.isArray(pp)) {
    push('prompt_provenance', 'AI-generated assets must declare prompt_provenance');
    return;
  }
  const p = /** @type {Record<string, unknown>} */ (pp);
  if (typeof p.prompt_id !== 'string' || !KEBAB_ID_RE.test(p.prompt_id)) {
    push('prompt_provenance.prompt_id', 'must be a kebab-case id from docs/marketing/CORPFLOW_PROMPT_LIBRARY.md');
  }
  if (typeof p.model !== 'string' || p.model.trim().length < 2) {
    push('prompt_provenance.model', 'must name the model (e.g. "openai/gpt-image-1")');
  }
  if (p.generated_at !== undefined && (typeof p.generated_at !== 'string' || !ISO_DATE_RE.test(p.generated_at))) {
    push('prompt_provenance.generated_at', 'optional; when present, must be ISO 8601 datetime');
  }
}

/**
 * Recursive secret-key scan. Manifests must never carry API tokens,
 * passwords, or authorization headers — those belong in runtime config.
 *
 * @param {unknown} v
 * @param {string} path
 * @param {(path: string, message: string) => void} push
 */
function validateNoSecrets(v, path, push) {
  if (v === null || typeof v !== 'object') return;
  if (Array.isArray(v)) {
    v.forEach((item, i) => validateNoSecrets(item, `${path}[${i}]`, push));
    return;
  }
  for (const [k, val] of Object.entries(v)) {
    if (SECRET_LIKE_KEYS.has(k.toLowerCase())) {
      push(`${path ? `${path}.` : ''}${k}`, 'secret-like key not permitted in manifests');
    }
    validateNoSecrets(val, `${path ? `${path}.` : ''}${k}`, push);
  }
}
