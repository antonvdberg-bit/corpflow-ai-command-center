/**
 * Delivery integrity: client preview must not be offered when visual/hero changes
 * are implied but the merged tenant site JSON still shows no applied hero image
 * or no change vs baseline.
 */

import { extractOutcomesFromConsoleJsonBrief, extractOutcomesFromDescription } from './factory-cmp-push.js';
import { resolveChangeTypeFromConsoleJson, shouldApplyVisualDeliveryGate } from './change-type-classification.js';

/** Same Unsplash URL used as default in `public/lux-landing-static.html` when hero_image_url is absent. */
export const LUX_STATIC_DEFAULT_HERO_UNSPLASH_SUBSTR = 'images.unsplash.com/photo-1500375592092';

/**
 * @param {unknown} url
 * @returns {string}
 */
export function normalizeHeroImageUrl(url) {
  const s = url != null ? String(url).trim() : '';
  return s;
}

/**
 * @param {string} url
 * @returns {boolean}
 */
export function isDefaultUnsplashFallbackUrl(url) {
  const u = normalizeHeroImageUrl(url);
  if (!u) return false;
  return u.includes(LUX_STATIC_DEFAULT_HERO_UNSPLASH_SUBSTR);
}

/**
 * Classify hero image as served by `/api/tenant/site` merged JSON (not the static HTML fallback).
 *
 * @param {Record<string, unknown> | null | undefined} site
 * @returns {{ hero_image_url: string | null, hero_image_source: 'tenant' | 'missing' }}
 */
export function classifyHeroFromSiteJson(site) {
  if (!site || typeof site !== 'object') {
    return { hero_image_url: null, hero_image_source: 'missing' };
  }
  const media = site.media && typeof site.media === 'object' ? site.media : {};
  const raw = media.hero_image_url != null ? String(media.hero_image_url).trim() : '';
  if (!raw) {
    return { hero_image_url: null, hero_image_source: 'missing' };
  }
  return { hero_image_url: raw, hero_image_source: 'tenant' };
}

/**
 * Machine-readable payload for clients and audits (mirrors lux-landing-static fallback behavior).
 *
 * @param {Record<string, unknown> | null | undefined} site
 * @returns {Record<string, unknown>}
 */
export function buildDeliveryIntegrityPayload(site) {
  const c = classifyHeroFromSiteJson(site);
  const missing = c.hero_image_source === 'missing';
  return {
    hero_image_url: c.hero_image_url,
    hero_image_source: c.hero_image_source,
    /** True when `lux-landing-static.html` would use the built-in Unsplash default (no tenant URL). */
    static_html_would_use_default_fallback: missing,
    default_unsplash_marker: LUX_STATIC_DEFAULT_HERO_UNSPLASH_SUBSTR,
  };
}

/**
 * Heuristic: ticket outcomes imply a hero/background/visual asset change.
 *
 * @param {string[]} outcomes
 * @returns {boolean}
 */
export function outcomesSuggestVisualHeroChange(outcomes) {
  const rx =
    /\b(background|hero|full[\s-]?bleed|full[\s-]?screen|banner|visual|photo|image|asset|layout|css|styling)\b/i;
  for (const o of outcomes) {
    const s = String(o || '').trim();
    if (!s) continue;
    if (rx.test(s)) return true;
  }
  return false;
}

/**
 * @param {string | null | undefined} description
 * @param {unknown} consoleJson
 * @returns {string[]}
 */
export function collectOutcomesForTicket(description, consoleJson) {
  let outcomes = extractOutcomesFromDescription(String(description || ''));
  if (!outcomes.length) outcomes = extractOutcomesFromConsoleJsonBrief(consoleJson);
  return outcomes;
}

/**
 * Enforces: when `change_type` requires visual verification (visual | mixed | default),
 * do not allow client preview URL until merged site JSON has a tenant hero URL that differs
 * from baseline (and is not missing / default-Unsplash). Does **not** depend on outcome wording.
 *
 * @param {{
 *   ticketId: string;
 *   tenantId: string | null | undefined;
 *   description: string | null | undefined;
 *   consoleJson: unknown;
 *   loadSite: () => Promise<{ site: Record<string, unknown> | null }>;
 * }} opts
 * @returns {Promise<Record<string, unknown>>}
 */
export async function evaluateVisualClientPreviewGate(opts) {
  const ticketId = String(opts.ticketId || '').trim();
  const tenantId = opts.tenantId != null ? String(opts.tenantId).trim() : '';
  const cj = opts.consoleJson && typeof opts.consoleJson === 'object' ? opts.consoleJson : {};
  const prevCv = cj.client_view && typeof cj.client_view === 'object' ? cj.client_view : {};
  const prevDi =
    prevCv.delivery_integrity && typeof prevCv.delivery_integrity === 'object'
      ? prevCv.delivery_integrity
      : {};

  const resolvedType = resolveChangeTypeFromConsoleJson(opts.consoleJson);
  const runVisualGate = shouldApplyVisualDeliveryGate(resolvedType);

  if (!tenantId || !ticketId) {
    return {
      allow: true,
      change_type: resolvedType,
      visual_gate_evaluated: false,
      visual_intent: false,
    };
  }

  if (!runVisualGate) {
    const nextDi = {
      ...prevDi,
      last_checked_at: new Date().toISOString(),
      change_type_resolved: resolvedType,
      visual_gate_evaluated: false,
      visual_gate_skipped_reason: 'change_type_exempt',
    };
    return {
      allow: true,
      change_type: resolvedType,
      visual_gate_evaluated: false,
      visual_intent: false,
      next_delivery_integrity: nextDi,
    };
  }

  let site;
  try {
    const loaded = await opts.loadSite();
    site = loaded && loaded.site && typeof loaded.site === 'object' ? loaded.site : null;
  } catch {
    site = null;
  }

  const classified = classifyHeroFromSiteJson(site);
  const current = normalizeHeroImageUrl(classified.hero_image_url);

  /** @type {Record<string, unknown>} */
  const nextDi = { ...prevDi };
  nextDi.last_checked_at = new Date().toISOString();
  nextDi.change_type_resolved = resolvedType;
  nextDi.visual_gate_evaluated = true;
  nextDi.last_hero_image_url = current || null;
  nextDi.last_hero_image_source = classified.hero_image_source;

  if (!current) {
    nextDi.last_block_reason = 'HERO_IMAGE_MISSING';
    return {
      allow: false,
      block_code: 'VISUAL_CHANGE_NOT_APPLIED',
      change_type: resolvedType,
      visual_gate_evaluated: true,
      hero_image_url: null,
      baseline_hero_image_url: prevDi.baseline_hero_image_url ?? null,
      hero_image_source: 'missing',
      visual_intent: true,
      next_delivery_integrity: nextDi,
    };
  }

  if (isDefaultUnsplashFallbackUrl(current)) {
    nextDi.last_block_reason = 'HERO_IS_DEFAULT_UNSPLASH_IN_DRAFT';
    return {
      allow: false,
      block_code: 'VISUAL_CHANGE_NOT_APPLIED',
      change_type: resolvedType,
      visual_gate_evaluated: true,
      hero_image_url: current,
      baseline_hero_image_url: prevDi.baseline_hero_image_url ?? null,
      hero_image_source: 'tenant',
      visual_intent: true,
      next_delivery_integrity: nextDi,
    };
  }

  const baselineRaw = prevDi.baseline_hero_image_url;
  const hadBaseline =
    baselineRaw != null && String(baselineRaw).trim() !== '';

  let baseline = hadBaseline ? normalizeHeroImageUrl(baselineRaw) : null;
  let firstBaselineCapture = false;
  if (!hadBaseline) {
    firstBaselineCapture = true;
    baseline = current || '';
    nextDi.baseline_hero_image_url = baseline || null;
    nextDi.baseline_captured_at = new Date().toISOString();
    nextDi.baseline_capture_reason = 'first_visual_integrity_check';
  }

  if (!firstBaselineCapture && baseline != null && current === baseline) {
    nextDi.last_block_reason = 'NO_CHANGE_VS_BASELINE';
    return {
      allow: false,
      block_code: 'VISUAL_CHANGE_NOT_APPLIED',
      change_type: resolvedType,
      visual_gate_evaluated: true,
      hero_image_url: current,
      baseline_hero_image_url: baseline,
      hero_image_source: 'tenant',
      visual_intent: true,
      next_delivery_integrity: nextDi,
    };
  }

  nextDi.last_block_reason = null;
  return {
    allow: true,
    change_type: resolvedType,
    visual_gate_evaluated: true,
    hero_image_url: current,
    baseline_hero_image_url: baseline || null,
    hero_image_source: 'tenant',
    visual_intent: true,
    next_delivery_integrity: nextDi,
  };
}
