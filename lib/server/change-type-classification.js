/**
 * Explicit change classification for delivery integrity (not driven by outcome wording quality).
 *
 * `change_type` is set during refinement (GROQ JSON contract or deterministic fallback)
 * and mirrored on `console_json` + `client_view`.
 */

/** @typedef {'visual' | 'content' | 'logic' | 'mixed'} ChangeType */

export const CHANGE_TYPE_VALUES = /** @type {const} */ (['visual', 'content', 'logic', 'mixed']);

/**
 * @param {unknown} raw
 * @returns {ChangeType}
 */
export function normalizeChangeType(raw) {
  const s = String(raw || '')
    .trim()
    .toLowerCase();
  if (s === 'visual' || s === 'content' || s === 'logic' || s === 'mixed') {
    return s;
  }
  return 'mixed';
}

/**
 * Only `content` and `logic` skip the visual delivery gate. Everything else (including unknown) is safe-by-default → gate on.
 *
 * @param {unknown} raw
 * @returns {boolean}
 */
export function shouldApplyVisualDeliveryGate(raw) {
  const t = normalizeChangeType(raw);
  if (t === 'content' || t === 'logic') return false;
  return true;
}

/**
 * Prefer root `console_json.change_type`, then `client_view.change_type`, then `brief.change_type`.
 * Missing / invalid → **mixed** (safe: run visual gate).
 *
 * @param {unknown} consoleJson
 * @returns {ChangeType}
 */
export function resolveChangeTypeFromConsoleJson(consoleJson) {
  const cj = consoleJson && typeof consoleJson === 'object' ? consoleJson : {};
  if (typeof cj.change_type === 'string' && cj.change_type.trim()) {
    return normalizeChangeType(cj.change_type);
  }
  const cv = cj.client_view && typeof cj.client_view === 'object' ? cj.client_view : {};
  if (typeof cv.change_type === 'string' && cv.change_type.trim()) {
    return normalizeChangeType(cv.change_type);
  }
  const br = cj.brief && typeof cj.brief === 'object' ? cj.brief : {};
  if (typeof br.change_type === 'string' && br.change_type.trim()) {
    return normalizeChangeType(br.change_type);
  }
  return 'mixed';
}

/**
 * Deterministic classification when GROQ is unavailable or for fallback paths.
 *
 * @param {{
 *   description: string;
 *   outcomes?: string[];
 *   hasMeasuredImageAssets?: boolean;
 * }} args
 * @returns {ChangeType}
 */
export function inferChangeTypeDeterministic(args) {
  const desc = String(args.description || '').trim();
  const outcomes = Array.isArray(args.outcomes) ? args.outcomes : [];
  if (args.hasMeasuredImageAssets === true) {
    return 'visual';
  }
  const text = [desc, ...outcomes.map((x) => String(x || ''))].join('\n').toLowerCase();

  const visualRx =
    /\b(hero|background|banner|image|photo|thumbnail|gallery|logo|video|css|stylesheet|layout|font|color|style|pixel|svg|webp|jpeg|png|full[\s-]?bleed|full[\s-]?screen)\b/;
  const logicRx =
    /\b(api|endpoint|webhook|database|postgres|prisma|auth|session|oauth|middleware|server|integration|bug|stack\s*trace|500|403)\b/;
  const contentRx = /\b(copy|text|wording|headline|tagline|translate|locale|paragraph|typo)\b/;

  const v = visualRx.test(text);
  const l = logicRx.test(text);
  const c = contentRx.test(text);

  if (v && (l || c)) return 'mixed';
  if (v) return 'visual';
  if (l && !v) return 'logic';
  if (c && !v && !l) return 'content';
  return 'mixed';
}

/**
 * Copy `brief.change_type` to top-level and `client_view` so monitors and gates do not depend on brief shape alone.
 *
 * @param {Record<string, unknown>} consoleJson
 * @returns {Record<string, unknown>}
 */
export function syncChangeTypeFromBriefToConsoleViews(consoleJson) {
  const cj = consoleJson && typeof consoleJson === 'object' ? consoleJson : {};
  const br = cj.brief && typeof cj.brief === 'object' ? cj.brief : {};
  const ct = normalizeChangeType(br.change_type);
  const prevCv = cj.client_view && typeof cj.client_view === 'object' ? cj.client_view : {};
  return {
    ...cj,
    change_type: ct,
    client_view: {
      ...prevCv,
      change_type: ct,
    },
  };
}
