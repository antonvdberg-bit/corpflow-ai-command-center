import crypto from 'crypto';

/**
 * @typedef {{
 *   summary: string;
 *   requested_change: string;
 *   scope: string;
 *   locale: string;
 *   confidence: 'high' | 'medium' | 'low';
 *   missing_information: string[];
 *   client_safe_response: string;
 * }} ChangeRefinerOutput
 */

/** Central prompt version for Change Refiner (Bump when instructions/output rules change). */
export const GROQ_CHANGE_REFINER_PROMPT_VERSION = 'change_refiner.v1.2026-04-17';

/** Telemetry / audit role name for governed GROQ Change Refiner calls. */
export const GROQ_CHANGE_REFINER_ROLE = 'change_refiner';

const CHANGE_REFINER_KEYS = new Set([
  'summary',
  'requested_change',
  'scope',
  'locale',
  'confidence',
  'missing_information',
  'client_safe_response',
]);

/** Neutral holding copy — never attributes failure to the model or provider. */
export const CLIENT_SAFE_CHANGE_REFINER_HOLDING =
  'Thanks for the detail. We are capturing your request as-is. Please continue in your own words: what should be different when this work is done, and any deadlines or constraints we should know. A human reviews every ticket before delivery.';

/**
 * @param {unknown} raw
 * @param {unknown} fallback
 */
export function safeJsonParseChangeRefiner(raw, fallback) {
  if (typeof raw !== 'string') return fallback;
  const s = raw.trim();
  if (!s) return fallback;
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

/**
 * Best-effort: find first balanced `{ ... }` honoring string escapes (handles noisy prose
 * before/after JSON when there is no markdown fence).
 *
 * @param {string} text
 * @returns {unknown}
 */
function tryParseBalancedJsonObject(text) {
  const s = String(text || '');
  const start = s.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          const chunk = s.slice(start, i + 1);
          return safeJsonParseChangeRefiner(chunk, null);
        }
      }
    }
  }
  return null;
}

/**
 * Extract a single JSON object from model text (plain JSON, fenced ```json, or noisy prose).
 *
 * @param {string} text
 * @returns {unknown}
 */
export function extractJsonObjectFromModelText(text) {
  const s = String(text || '').trim();
  if (!s) return null;
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const inner = fenced ? fenced[1].trim() : s;
  let parsed = safeJsonParseChangeRefiner(inner, null);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  parsed = tryParseBalancedJsonObject(inner);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  if (fenced) {
    parsed = tryParseBalancedJsonObject(s);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  }
  return null;
}

/**
 * @param {string} system
 * @param {{ role: string, content: string }[]} tailMessages
 * @returns {string}
 */
export function hashGroqPromptInputs(system, tailMessages) {
  const h = crypto.createHash('sha256');
  h.update(String(system || ''), 'utf8');
  h.update('\n', 'utf8');
  for (const m of tailMessages) {
    h.update(String(m?.role || ''), 'utf8');
    h.update('\0', 'utf8');
    h.update(String(m?.content || ''), 'utf8');
    h.update('\n', 'utf8');
  }
  return h.digest('hex').slice(0, 24);
}

/**
 * @param {unknown} obj
 * @returns {{ ok: true, value: ChangeRefinerOutput } | { ok: false, reason: string }}
 */
export function validateChangeRefinerOutput(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { ok: false, reason: 'payload_not_object' };
  }
  /** @type {Record<string, unknown>} */
  const o = /** @type {Record<string, unknown>} */ (obj);
  for (const k of Object.keys(o)) {
    if (!CHANGE_REFINER_KEYS.has(k)) return { ok: false, reason: `extra_key:${k}` };
  }
  for (const req of CHANGE_REFINER_KEYS) {
    if (!(req in o)) return { ok: false, reason: `missing_key:${req}` };
  }

  const strFields = ['summary', 'requested_change', 'scope', 'locale', 'client_safe_response'];
  for (const f of strFields) {
    if (typeof o[f] !== 'string') return { ok: false, reason: `type_${f}` };
    if (!String(o[f]).trim()) return { ok: false, reason: `empty_${f}` };
  }

  const conf = String(o.confidence).trim().toLowerCase();
  if (conf !== 'high' && conf !== 'medium' && conf !== 'low') {
    return { ok: false, reason: 'confidence_invalid' };
  }

  if (!Array.isArray(o.missing_information)) return { ok: false, reason: 'missing_information_not_array' };
  if (o.missing_information.length > 2) return { ok: false, reason: 'missing_information_over_max' };
  const questions = [];
  for (const q of o.missing_information) {
    if (typeof q !== 'string' || !String(q).trim()) return { ok: false, reason: 'missing_information_item_invalid' };
    questions.push(String(q).trim());
  }

  return {
    ok: true,
    value: {
      summary: String(o.summary).trim(),
      requested_change: String(o.requested_change).trim(),
      scope: String(o.scope).trim(),
      locale: String(o.locale).trim(),
      confidence: /** @type {ChangeRefinerOutput['confidence']} */ (conf),
      missing_information: questions,
      client_safe_response: String(o.client_safe_response).trim(),
    },
  };
}

/**
 * Merge validated Change Refiner output into `consoleJson.brief`, preserving unrelated keys
 * and bridging legacy approve-build description fields.
 *
 * @param {Record<string, unknown>} prevBrief
 * @param {ChangeRefinerOutput} v
 * @returns {Record<string, unknown>}
 */
export function mergeChangeRefinerBriefForStorage(prevBrief, v) {
  const prev = prevBrief && typeof prevBrief === 'object' && !Array.isArray(prevBrief) ? prevBrief : {};
  const scopeOut = typeof prev.scope_out === 'string' ? prev.scope_out : '';
  const legacyRisks = Array.isArray(prev.risks) ? prev.risks : [];
  const legacyAc = Array.isArray(prev.acceptance_criteria) ? prev.acceptance_criteria : [];

  const acFromRequest = v.requested_change ? [v.requested_change] : [];

  return {
    ...prev,
    summary: v.summary,
    requested_change: v.requested_change,
    scope: v.scope,
    locale: v.locale,
    confidence: v.confidence,
    missing_information: v.missing_information,
    client_safe_response: v.client_safe_response,
    scope_in: v.scope,
    scope_out: scopeOut,
    acceptance_criteria: legacyAc.length ? legacyAc : acFromRequest,
    risks: legacyRisks,
  };
}
