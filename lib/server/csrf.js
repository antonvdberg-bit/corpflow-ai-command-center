/**
 * IM-5 (2026-06-15) — CSRF double-submit token helper.
 *
 * Canonical spec: docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §10 IM-5.
 *
 * Scope (per Anton's IM-5 approval corrections #2 + #7):
 *
 *   - CSRF protection is ONLY required for the two new state-changing POST endpoints:
 *       POST /api/membership/switch
 *       POST /api/membership/leave
 *   - This module does NOT broaden CSRF to existing endpoints (CMP, login, logout,
 *     factory, /api/membership/effective, etc.). Those keep their pre-IM-5 posture.
 *   - The CSRF cookie is issued at the same call sites where the session cookie is
 *     minted/re-issued — no new broad auth mechanism, no cron job, no middleware.
 *
 * Design (double-submit cookie pattern):
 *
 *   1. On session mint, the server sets TWO cookies:
 *        corpflow_session   (HttpOnly, signed JWT)
 *        corpflow_csrf      (NOT HttpOnly — so client JS can read it)
 *      Both cookies are SameSite=Lax, Secure, Path=/, same Max-Age.
 *
 *   2. On a state-changing POST to /switch or /leave, the client reads the
 *      corpflow_csrf cookie and echoes it in the X-CorpFlow-CSRF header.
 *
 *   3. The server validates: header === cookie (constant-time compare); both
 *      must be present, non-empty, and a 32-byte base64url value. Mismatch or
 *      missing => 403 CSRF_TOKEN_INVALID.
 *
 *   4. On every cookie re-issue (switch/leave/login), a FRESH CSRF token is
 *      minted. The old token is implicitly invalidated (the cookie is overwritten).
 *
 * Why double-submit + SameSite=Lax (not just SameSite=Strict)?
 *
 *   - SameSite=Strict would break the legitimate cross-host navigation from
 *     `lux.corpflowai.com` (IM-4 Switch workspace link) to `core.corpflowai.com`
 *     where the operator would then issue the switch POST. The cookie must
 *     follow that top-level navigation.
 *   - SameSite=Lax alone permits cross-site top-level POSTs from forms; the
 *     double-submit token covers that residual gap. This is the OWASP-recommended
 *     pattern for state-changing endpoints behind a Lax cookie.
 *
 * NO production writes by this module. NO database access. NO logging of token
 * values. NO env var read other than implicitly via the cookie infrastructure.
 */
import crypto from 'node:crypto';
import { parseCookies, setCookie } from './session.js';

/**
 * Cookie name carrying the CSRF token. Single source of truth.
 * Exported so tests and the switch/leave handlers can use the same constant.
 */
export const CORPFLOW_CSRF_COOKIE = 'corpflow_csrf';

/**
 * HTTP request header the client must echo back on protected POSTs.
 * Lowercased on the request side (Node lowercases all incoming header names).
 */
export const CORPFLOW_CSRF_HEADER = 'x-corpflow-csrf';

/**
 * Token length in bytes (256 bits of entropy, base64url-encoded ⇒ 43 chars).
 */
const CSRF_TOKEN_BYTES = 32;

/**
 * Base64url-encode a buffer, matching the encoding used by lib/server/session.js
 * for JWT segments.
 *
 * @param {Buffer} buf
 * @returns {string}
 */
function base64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Generate a fresh CSRF token. 32 bytes (256 bits) of cryptographically
 * secure randomness, base64url-encoded. Exported for tests; production callers
 * should prefer `issueCsrfCookie(res, opts)` which both mints and sets.
 *
 * @returns {string}
 */
export function generateCsrfToken() {
  return base64url(crypto.randomBytes(CSRF_TOKEN_BYTES));
}

/**
 * Issue (mint + Set-Cookie) a fresh CSRF token alongside a session cookie.
 * Called from the same code paths that call `signSession(...) + setCookie(...)`
 * for the session cookie. By design, NOT HttpOnly so the client can read it
 * back to populate the X-CorpFlow-CSRF header on protected POSTs.
 *
 * Returns the token string so callers that want to embed it in the response
 * JSON (e.g. for a SPA that needs it immediately without a follow-up read of
 * document.cookie) can do so. The token itself is non-sensitive in a
 * double-submit scheme — its security comes from being unguessable to a
 * cross-origin attacker, not from being secret to the legitimate page.
 *
 * @param {import('http').ServerResponse} res
 * @param {{ maxAgeSec?: number }} [opts]
 * @returns {string}
 */
export function issueCsrfCookie(res, opts = {}) {
  const token = generateCsrfToken();
  setCookie(res, CORPFLOW_CSRF_COOKIE, token, {
    maxAgeSec: opts.maxAgeSec != null ? Number(opts.maxAgeSec) : undefined,
    httpOnly: false,
    sameSite: 'Lax',
    secure: true,
    path: '/',
    ...(opts.domain ? { domain: opts.domain } : {}),
  });
  return token;
}

/**
 * Validate the CSRF token on an incoming protected request.
 *
 * Rules (all must pass):
 *
 *   1. The X-CorpFlow-CSRF request header is present and non-empty.
 *   2. The corpflow_csrf cookie is present and non-empty.
 *   3. Both values are strings of length CSRF_TOKEN_BASE64URL_LEN (43 chars).
 *   4. Both contain only base64url characters [A-Za-z0-9_-].
 *   5. Both compare equal in constant time (timingSafeEqual).
 *
 * Returns `{ ok: true }` on success; `{ ok: false, error: 'CSRF_TOKEN_INVALID',
 * reason: <one of: missing_header | missing_cookie | malformed_header |
 * malformed_cookie | mismatch> }` on failure.
 *
 * IMPORTANT: This function MUST NOT clear the session cookie on failure (per
 * Anton's IM-5 approval correction #2: "Existing cookie must not be cleared on
 * CSRF failure."). The caller returns 403 and the user keeps their session.
 *
 * @param {import('http').IncomingMessage} req
 * @returns {{ ok: true } | { ok: false, error: 'CSRF_TOKEN_INVALID', reason: string }}
 */
export function validateCsrfToken(req) {
  const headerRaw = req?.headers?.[CORPFLOW_CSRF_HEADER];
  const headerVal = typeof headerRaw === 'string' ? headerRaw.trim() : '';
  if (!headerVal) {
    return { ok: false, error: 'CSRF_TOKEN_INVALID', reason: 'missing_header' };
  }
  const cookies = parseCookies(req);
  const cookieVal = String(cookies[CORPFLOW_CSRF_COOKIE] || '').trim();
  if (!cookieVal) {
    return { ok: false, error: 'CSRF_TOKEN_INVALID', reason: 'missing_cookie' };
  }
  if (!isWellFormedToken(headerVal)) {
    return { ok: false, error: 'CSRF_TOKEN_INVALID', reason: 'malformed_header' };
  }
  if (!isWellFormedToken(cookieVal)) {
    return { ok: false, error: 'CSRF_TOKEN_INVALID', reason: 'malformed_cookie' };
  }
  // Both are the same length and base64url-shaped by this point; safe to compare.
  const a = Buffer.from(headerVal);
  const b = Buffer.from(cookieVal);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, error: 'CSRF_TOKEN_INVALID', reason: 'mismatch' };
  }
  return { ok: true };
}

/**
 * Expected length of a base64url-encoded 32-byte token. Computed once, not
 * inlined as a magic number, so a future change to CSRF_TOKEN_BYTES updates
 * this automatically: ceil(N * 8 / 6) = ceil(32 * 8 / 6) = 43.
 */
const CSRF_TOKEN_BASE64URL_LEN = Math.ceil((CSRF_TOKEN_BYTES * 8) / 6);

/**
 * Defensive shape check before the constant-time compare. Rejects tokens of
 * the wrong length or with non-base64url characters. Length check is itself
 * timing-safe because we only compare against a constant.
 *
 * Exported for tests.
 *
 * @param {string} token
 * @returns {boolean}
 */
export function isWellFormedToken(token) {
  if (typeof token !== 'string') return false;
  if (token.length !== CSRF_TOKEN_BASE64URL_LEN) return false;
  for (let i = 0; i < token.length; i += 1) {
    const c = token.charCodeAt(i);
    const isAZ = (c >= 65 && c <= 90); /* A-Z */
    const isaz = (c >= 97 && c <= 122); /* a-z */
    const is09 = (c >= 48 && c <= 57); /* 0-9 */
    const isDash = c === 45; /* - */
    const isUnderscore = c === 95; /* _ */
    if (!(isAZ || isaz || is09 || isDash || isUnderscore)) return false;
  }
  return true;
}
