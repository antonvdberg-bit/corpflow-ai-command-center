/**
 * Read-only GoHighLevel API v2 client — allowlisted paths, call budget, SSRF-safe host.
 */

import {
  GHL_API_BASE_URL,
  GHL_API_VERSION_HEADER,
  GHL_PROBE_INTER_CALL_DELAY_MS,
  GHL_PROBE_MAX_API_CALLS,
} from './constants.js';
import { getGhlLivingWordPitForRequest } from './ghl-config.js';

/** @typedef {{ method: string, path: string, status: number, ok: boolean, rateLimit?: Record<string, string>, error?: string }} GhlCallRecord */

/**
 * @param {string} method
 * @param {string} pathWithQuery
 */
function isAllowlistedRequest(method, pathWithQuery) {
  const path = pathWithQuery.split('?')[0] || '';
  const m = method.toUpperCase();

  if (m === 'GET') {
    if (/^\/locations\/[^/]+$/.test(path)) return true;
    if (/^\/locations\/[^/]+\/customFields$/.test(path)) return true;
    if (path === '/forms' || path === '/forms/') return true;
    if (path === '/forms/submissions') return true;
    if (path === '/opportunities/pipelines') return true;
    if (path === '/calendars' || path === '/calendars/') return true;
    if (path === '/surveys' || path === '/surveys/') return true;
    if (path === '/users/search') return true;
    return false;
  }

  if (m === 'POST' && path === '/contacts/search') return true;

  return false;
}

/**
 * @param {Headers} headers
 */
function pickRateLimitHeaders(headers) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const key of [
    'x-ratelimit-remaining',
    'x-ratelimit-daily-remaining',
    'x-ratelimit-max',
    'x-ratelimit-limit-daily',
    'x-ratelimit-interval-milliseconds',
  ]) {
    const v = headers.get(key);
    if (v != null) out[key] = v;
  }
  return out;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {object} [opts]
 * @param {typeof fetch} [opts.fetchImpl]
 * @param {string} [opts.token]
 * @param {number} [opts.maxCalls]
 * @param {boolean} [opts.dryRun]
 */
export function createGhlReadonlyClient(opts = {}) {
  const fetchImpl = opts.fetchImpl || fetch;
  const maxCalls = opts.maxCalls ?? GHL_PROBE_MAX_API_CALLS;
  let callCount = 0;
  /** @type {GhlCallRecord[]} */
  const callLog = [];

  /**
   * @param {string} method
   * @param {string} pathWithQuery
   * @param {object} [body]
   */
  async function request(method, pathWithQuery, body) {
    if (!pathWithQuery.startsWith('/')) {
      throw new Error('invalid_path');
    }
    if (!isAllowlistedRequest(method, pathWithQuery)) {
      throw new Error('path_not_allowlisted');
    }
    if (callCount >= maxCalls) {
      throw new Error('api_budget_exceeded');
    }

    const token = opts.token ?? getGhlLivingWordPitForRequest();
    if (!token && !opts.dryRun) {
      throw new Error('ghl_token_missing');
    }

    callCount += 1;
    const url = `${GHL_API_BASE_URL}${pathWithQuery}`;

    if (opts.dryRun) {
      callLog.push({ method, path: pathWithQuery, status: 200, ok: true });
      return { ok: true, status: 200, json: {}, rateLimit: {} };
    }

    if (callCount > 1) {
      await sleep(GHL_PROBE_INTER_CALL_DELAY_MS);
    }

    /** @type {RequestInit} */
    const init = {
      method: method.toUpperCase(),
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Version: GHL_API_VERSION_HEADER,
      },
    };
    if (body != null) {
      init.body = JSON.stringify(body);
    }

    let res;
    try {
      res = await fetchImpl(url, init);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      callLog.push({ method, path: pathWithQuery, status: 0, ok: false, error: msg });
      return { ok: false, status: 0, json: null, rateLimit: {}, error: msg };
    }

    const rateLimit = pickRateLimitHeaders(res.headers);
    let json = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    const record = {
      method,
      path: pathWithQuery,
      status: res.status,
      ok: res.ok,
      rateLimit,
    };
    if (!res.ok) {
      record.error = typeof json?.message === 'string' ? json.message : `http_${res.status}`;
    }
    callLog.push(record);

    return { ok: res.ok, status: res.status, json, rateLimit, error: record.error };
  }

  return {
    get callCount() {
      return callCount;
    },
    get callLog() {
      return callLog.slice();
    },
    request,
    isAllowlistedRequest,
  };
}

export { isAllowlistedRequest };
