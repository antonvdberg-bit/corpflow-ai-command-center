/**
 * Reality Gate: enforced GET checks against client-facing production URLs.
 * Used to block "complete" semantics and to drive /change truth when checks fail.
 */

import { cfg } from '../../server/runtime-config.js';

export const DEFAULT_STALE_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10000;

/**
 * @param {unknown} consoleJson
 * @param {string | null | undefined} tenantId
 * @returns {string[]}
 */
export function getRequiredRealityUrls(consoleJson, tenantId) {
  const cj = consoleJson && typeof consoleJson === 'object' ? consoleJson : {};
  const rg = cj.reality_gate && typeof cj.reality_gate === 'object' ? cj.reality_gate : {};
  const explicit = Array.isArray(rg.required_urls) ? rg.required_urls.map((u) => String(u || '').trim()).filter(Boolean) : [];
  if (explicit.length) return [...new Set(explicit)];

  const envRaw = String(cfg('CORPFLOW_REALITY_GATE_DEFAULT_URLS', '') || '').trim();
  if (envRaw) {
    return [
      ...new Set(
        envRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ];
  }

  // Minimum default: Lux marketing + Change Console (same product spine as predeploy checks).
  return ['https://lux.corpflowai.com/', 'https://lux.corpflowai.com/change'];
}

/**
 * @param {string} url
 * @param {number} timeoutMs
 * @returns {Promise<{ url: string, status: number, ok: boolean, checked_at: string, detail?: string }>}
 */
export async function fetchOneRealityUrl(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const checked_at = new Date().toISOString();
  const u = String(url || '').trim();
  if (!u || !/^https:\/\//i.test(u)) {
    return { url: u, status: 0, ok: false, checked_at, detail: 'invalid_url' };
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(u, {
      method: 'GET',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        'User-Agent': 'CorpFlow-RealityGate/1.0',
      },
    });
    const status = res.status;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const buf = await res.arrayBuffer();
    const len = buf.byteLength;
    const htmlish = ct.includes('html') || ct.includes('text/plain') || ct === '';
    const usable = len >= 64;
    const ok = status === 200 && htmlish && usable;
    return {
      url: u,
      status,
      ok,
      checked_at,
      detail: ok ? undefined : !htmlish ? 'bad_content_type' : !usable ? 'body_too_small' : `http_${status}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { url: u, status: 0, ok: false, checked_at, detail: msg.slice(0, 200) };
  } finally {
    clearTimeout(t);
  }
}

/**
 * @param {string[]} urls
 * @returns {Promise<{ all_ok: boolean, checks: Array<{ url: string, status: number, ok: boolean, checked_at: string, detail?: string }> }>}
 */
export async function runRealityGateFetch(urls) {
  const unique = [...new Set(urls.map((u) => String(u || '').trim()).filter(Boolean))];
  if (!unique.length) {
    return { all_ok: false, checks: [] };
  }
  const checks = [];
  for (const url of unique) {
    checks.push(await fetchOneRealityUrl(url));
  }
  const all_ok = checks.length > 0 && checks.every((c) => c.ok === true);
  return { all_ok, checks };
}

/**
 * @param {unknown} consoleJson
 * @returns {boolean}
 */
export function isRealityGateStale(consoleJson) {
  const cj = consoleJson && typeof consoleJson === 'object' ? consoleJson : {};
  const rg = cj.reality_gate && typeof cj.reality_gate === 'object' ? cj.reality_gate : {};
  const lr = rg.last_run && typeof rg.last_run === 'object' ? rg.last_run : {};
  const at = lr.checked_at != null ? String(lr.checked_at).trim() : '';
  if (!at) return true;
  const p = Date.parse(at);
  if (!Number.isFinite(p)) return true;
  return Date.now() - p > DEFAULT_STALE_MS;
}

/**
 * Merge reality_gate block into console_json.
 *
 * @param {unknown} consoleJson
 * @param {string[]} requiredUrls
 * @param {{ all_ok: boolean, checks: Array<Record<string, unknown>> }} run
 * @returns {Record<string, unknown>}
 */
export function mergeRealityGateIntoConsoleJson(consoleJson, requiredUrls, run) {
  const prev = consoleJson && typeof consoleJson === 'object' && !Array.isArray(consoleJson) ? { ...consoleJson } : {};
  const checked_at = new Date().toISOString();
  return {
    ...prev,
    reality_gate: {
      ...(prev.reality_gate && typeof prev.reality_gate === 'object' ? prev.reality_gate : {}),
      required_urls: requiredUrls,
      last_run: {
        checked_at,
        all_ok: run.all_ok,
        checks: run.checks,
      },
    },
  };
}
