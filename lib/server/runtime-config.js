/**
 * Centralized runtime config helper.
 *
 * Supports a single JSON env var `CORPFLOW_RUNTIME_CONFIG_JSON` to reduce
 * operational overhead in Vercel (one variable instead of many).
 */

let cachedBlob = null;
let cachedParseOk = null;
/** @type {string | null} */
let cachedParseError = null;

/**
 * Normalize env JSON: trim, strip UTF-8 BOM (Excel / some editors prepend it).
 *
 * @param {string} raw
 * @returns {string}
 */
function normalizeRuntimeJsonRaw(raw) {
  let s = raw.toString().trim();
  if (s.charCodeAt(0) === 0xfeff) {
    s = s.slice(1).trim();
  }
  return s;
}

function parseBlob() {
  if (cachedBlob !== null) return cachedBlob;
  const raw = (process.env.CORPFLOW_RUNTIME_CONFIG_JSON || '').toString();
  const normalized = normalizeRuntimeJsonRaw(raw);
  if (!normalized) {
    cachedBlob = {};
    cachedParseOk = true;
    cachedParseError = null;
    return cachedBlob;
  }
  try {
    const parsed = JSON.parse(normalized);
    cachedBlob = parsed && typeof parsed === 'object' ? parsed : {};
    cachedParseOk = true;
    cachedParseError = null;
  } catch (e) {
    cachedBlob = {};
    cachedParseOk = false;
    const msg = e instanceof Error ? e.message : String(e);
    cachedParseError = msg.length > 220 ? `${msg.slice(0, 220)}…` : msg;
  }
  return cachedBlob;
}

/**
 * Diagnostics for CORPFLOW_RUNTIME_CONFIG_JSON parsing.
 *
 * @returns {{ present: boolean, parse_ok: boolean, keys: string[], parse_error?: string, first_char?: string }}
 */
export function runtimeConfigDiagnostics() {
  const raw = (process.env.CORPFLOW_RUNTIME_CONFIG_JSON || '').toString();
  const present = normalizeRuntimeJsonRaw(raw) !== '';
  // Ensure parse attempted at least once so cachedParseOk is meaningful.
  parseBlob();
  const parse_ok = cachedParseOk !== false;
  const keys = (() => {
    try {
      const blob = cachedBlob && typeof cachedBlob === 'object' ? cachedBlob : {};
      return Object.keys(blob).slice(0, 50).sort();
    } catch {
      return [];
    }
  })();
  const out = { present, parse_ok, keys };
  if (present && !parse_ok && cachedParseError) {
    Object.assign(out, { parse_error: cachedParseError });
  }
  const n = normalizeRuntimeJsonRaw(raw);
  if (n.length > 0) {
    Object.assign(out, { first_char: n[0] === '{' || n[0] === '[' ? n[0] : 'unexpected' });
  }
  return out;
}

/**
 * Returns runtime config value from:
 * 1) direct env var
 * 2) CORPFLOW_RUNTIME_CONFIG_JSON key
 * 3) optional aliases
 *
 * @param {string} key
 * @param {string} [fallback]
 * @returns {string}
 */
export function cfg(key, fallback = '') {
  const direct = process.env[key];
  if (direct != null && String(direct).trim() !== '') return String(direct);

  // Compatibility alias for existing Vercel projects.
  if (key === 'POSTGRES_URL') {
    const alt = process.env.POSTGRES_PRISMA_URL || process.env.PRISMA_DATABASE_URL;
    if (alt != null && String(alt).trim() !== '') return String(alt);
  }

  const blob = parseBlob();
  const v = blob?.[key];
  if (v != null && String(v).trim() !== '') return String(v);

  return fallback;
}

