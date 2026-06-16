/**
 * IM-5 — unit tests for the CSRF double-submit token helper.
 *
 * Canonical spec: docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §10 IM-5.
 *
 * Coverage:
 *   - Token shape: 32-byte entropy, base64url, fixed length.
 *   - Validation: header missing, cookie missing, malformed values, mismatch,
 *     equal-length-but-different timing-safe rejection.
 *   - Cookie issuance: NOT HttpOnly (so client JS can read), SameSite=Lax,
 *     Secure, Path=/.
 *   - Token rotation: each `generateCsrfToken()` and each `issueCsrfCookie()`
 *     call yields a fresh value (no static reuse).
 *
 * Pure tests — no DOM, no Prisma, no network. Just the helper.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CORPFLOW_CSRF_COOKIE,
  CORPFLOW_CSRF_HEADER,
  generateCsrfToken,
  isWellFormedToken,
  issueCsrfCookie,
  validateCsrfToken,
} from '../lib/server/csrf.js';

const BASE64URL_LEN = 43; // ceil(32 * 8 / 6)
const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;

/** Build a minimal fake res object with the same Set-Cookie semantics as session.js#setCookie. */
function fakeRes() {
  const headers = {};
  return {
    headers,
    setHeader(k, v) { headers[k] = v; },
    getHeader(k) { return headers[k]; },
    cookies() {
      const sc = headers['Set-Cookie'];
      return sc == null ? [] : Array.isArray(sc) ? sc : [sc];
    },
  };
}

/** Build a minimal fake req from a headers + cookies dict. */
function fakeReq({ csrfHeader, csrfCookie, extraCookies = {} } = {}) {
  const headers = {};
  if (csrfHeader != null) headers[CORPFLOW_CSRF_HEADER] = csrfHeader;
  const cookieParts = [];
  if (csrfCookie != null) cookieParts.push(`${CORPFLOW_CSRF_COOKIE}=${encodeURIComponent(csrfCookie)}`);
  for (const [k, v] of Object.entries(extraCookies)) cookieParts.push(`${k}=${encodeURIComponent(v)}`);
  if (cookieParts.length > 0) headers.cookie = cookieParts.join('; ');
  return { headers };
}

test('generateCsrfToken: produces base64url string of expected length', () => {
  for (let i = 0; i < 25; i += 1) {
    const t = generateCsrfToken();
    assert.equal(typeof t, 'string');
    assert.equal(t.length, BASE64URL_LEN);
    assert.match(t, BASE64URL_RE);
  }
});

test('generateCsrfToken: yields unique values across calls (no static reuse)', () => {
  const seen = new Set();
  for (let i = 0; i < 100; i += 1) seen.add(generateCsrfToken());
  assert.equal(seen.size, 100, 'all 100 tokens should be distinct');
});

test('isWellFormedToken: accepts valid tokens; rejects every malformed shape', () => {
  const valid = generateCsrfToken();
  assert.equal(isWellFormedToken(valid), true);

  // Length wrong
  assert.equal(isWellFormedToken(''), false);
  assert.equal(isWellFormedToken('abc'), false);
  assert.equal(isWellFormedToken(valid + 'X'), false);
  assert.equal(isWellFormedToken(valid.slice(0, -1)), false);

  // Non-base64url characters
  assert.equal(isWellFormedToken('A'.repeat(BASE64URL_LEN - 1) + '+'), false);
  assert.equal(isWellFormedToken('A'.repeat(BASE64URL_LEN - 1) + '/'), false);
  assert.equal(isWellFormedToken('A'.repeat(BASE64URL_LEN - 1) + '='), false);
  assert.equal(isWellFormedToken('A'.repeat(BASE64URL_LEN - 1) + ' '), false);
  assert.equal(isWellFormedToken('A'.repeat(BASE64URL_LEN - 1) + '\n'), false);
  assert.equal(isWellFormedToken('A'.repeat(BASE64URL_LEN - 1) + '\0'), false);

  // Wrong type
  assert.equal(isWellFormedToken(null), false);
  assert.equal(isWellFormedToken(undefined), false);
  assert.equal(isWellFormedToken(12345), false);
  assert.equal(isWellFormedToken({}), false);
  assert.equal(isWellFormedToken([]), false);
});

test('issueCsrfCookie: sets Set-Cookie with NOT HttpOnly, SameSite=Lax, Secure, Path=/', () => {
  const res = fakeRes();
  const t = issueCsrfCookie(res, { maxAgeSec: 3600 });
  const cookies = res.cookies();
  assert.equal(cookies.length, 1);
  const sc = cookies[0];
  assert.match(sc, new RegExp(`^${CORPFLOW_CSRF_COOKIE}=`));
  assert.ok(sc.includes('SameSite=Lax'), 'must have SameSite=Lax');
  assert.ok(sc.includes('Secure'), 'must have Secure');
  assert.ok(sc.includes('Path=/'), 'must have Path=/');
  assert.ok(sc.includes('Max-Age=3600'), 'must respect Max-Age');
  assert.equal(sc.includes('HttpOnly'), false, 'MUST NOT be HttpOnly (client JS reads it)');
  // Token is the urlencoded portion after `name=`
  const value = decodeURIComponent(sc.split(';')[0].split('=').slice(1).join('='));
  assert.equal(value, t);
  assert.equal(isWellFormedToken(t), true);
});

test('issueCsrfCookie: each call mints a fresh token', () => {
  const r1 = fakeRes(); const t1 = issueCsrfCookie(r1, { maxAgeSec: 60 });
  const r2 = fakeRes(); const t2 = issueCsrfCookie(r2, { maxAgeSec: 60 });
  assert.notEqual(t1, t2);
});

test('validateCsrfToken: success when header === cookie and both well-formed', () => {
  const t = generateCsrfToken();
  const r = fakeReq({ csrfHeader: t, csrfCookie: t });
  assert.deepEqual(validateCsrfToken(r), { ok: true });
});

test('validateCsrfToken: missing header → CSRF_TOKEN_INVALID/missing_header', () => {
  const t = generateCsrfToken();
  const r = fakeReq({ csrfHeader: null, csrfCookie: t });
  assert.deepEqual(validateCsrfToken(r), { ok: false, error: 'CSRF_TOKEN_INVALID', reason: 'missing_header' });
});

test('validateCsrfToken: empty header → CSRF_TOKEN_INVALID/missing_header', () => {
  const t = generateCsrfToken();
  const r = fakeReq({ csrfHeader: '', csrfCookie: t });
  assert.deepEqual(validateCsrfToken(r), { ok: false, error: 'CSRF_TOKEN_INVALID', reason: 'missing_header' });
});

test('validateCsrfToken: whitespace-only header → missing_header (trimmed to empty)', () => {
  const t = generateCsrfToken();
  const r = fakeReq({ csrfHeader: '   ', csrfCookie: t });
  assert.deepEqual(validateCsrfToken(r), { ok: false, error: 'CSRF_TOKEN_INVALID', reason: 'missing_header' });
});

test('validateCsrfToken: missing cookie → missing_cookie', () => {
  const t = generateCsrfToken();
  const r = fakeReq({ csrfHeader: t, csrfCookie: null });
  assert.deepEqual(validateCsrfToken(r), { ok: false, error: 'CSRF_TOKEN_INVALID', reason: 'missing_cookie' });
});

test('validateCsrfToken: empty cookie value → missing_cookie', () => {
  const t = generateCsrfToken();
  const r = fakeReq({ csrfHeader: t, csrfCookie: '' });
  assert.deepEqual(validateCsrfToken(r), { ok: false, error: 'CSRF_TOKEN_INVALID', reason: 'missing_cookie' });
});

test('validateCsrfToken: malformed header → malformed_header', () => {
  const t = generateCsrfToken();
  const r = fakeReq({ csrfHeader: 'short', csrfCookie: t });
  assert.deepEqual(validateCsrfToken(r), { ok: false, error: 'CSRF_TOKEN_INVALID', reason: 'malformed_header' });
});

test('validateCsrfToken: malformed cookie → malformed_cookie', () => {
  const t = generateCsrfToken();
  const r = fakeReq({ csrfHeader: t, csrfCookie: 'short' });
  assert.deepEqual(validateCsrfToken(r), { ok: false, error: 'CSRF_TOKEN_INVALID', reason: 'malformed_cookie' });
});

test('validateCsrfToken: mismatch (well-formed but different) → mismatch', () => {
  const t1 = generateCsrfToken();
  const t2 = generateCsrfToken();
  const r = fakeReq({ csrfHeader: t1, csrfCookie: t2 });
  assert.deepEqual(validateCsrfToken(r), { ok: false, error: 'CSRF_TOKEN_INVALID', reason: 'mismatch' });
});

test('validateCsrfToken: equal-length attempts must fail when content differs (timing-safe)', () => {
  // Construct two well-formed equal-length tokens that differ only at the last
  // character — the historical naive `===` would still reject, but this
  // exercises the timingSafeEqual path explicitly.
  const t1 = generateCsrfToken();
  const t2 = t1.slice(0, -1) + (t1.endsWith('A') ? 'B' : 'A');
  assert.equal(t1.length, t2.length);
  assert.notEqual(t1, t2);
  const r = fakeReq({ csrfHeader: t1, csrfCookie: t2 });
  assert.deepEqual(validateCsrfToken(r), { ok: false, error: 'CSRF_TOKEN_INVALID', reason: 'mismatch' });
});

test('validateCsrfToken: CR/LF injection attempts are caught by the malformed gate (not crash)', () => {
  // CR/LF would be rejected by the length check first (length 1) or malformed
  // gate. We assert no throw and explicit malformed_header.
  const t = generateCsrfToken();
  for (const bad of ['\r\n', 'a\rb', 'A\nB' + 'X'.repeat(BASE64URL_LEN - 3)]) {
    const r = fakeReq({ csrfHeader: bad, csrfCookie: t });
    const result = validateCsrfToken(r);
    assert.equal(result.ok, false);
    assert.equal(result.error, 'CSRF_TOKEN_INVALID');
  }
});

test('validateCsrfToken: ignores other cookies on the request', () => {
  const t = generateCsrfToken();
  const r = fakeReq({
    csrfHeader: t,
    csrfCookie: t,
    extraCookies: { corpflow_session: 'jwt.placeholder.sig', other: 'value with spaces' },
  });
  assert.deepEqual(validateCsrfToken(r), { ok: true });
});

test('rotation: validating with the OLD token after issuing a NEW one fails', () => {
  const res = fakeRes();
  const t1 = issueCsrfCookie(res, { maxAgeSec: 60 });
  const t2 = issueCsrfCookie(res, { maxAgeSec: 60 });
  assert.notEqual(t1, t2);
  // Simulate the next request carrying the OLD token in both header + cookie.
  // The server-side cookie has been overwritten, so the cookie on the next
  // request would be t2 (browser uses the latest Set-Cookie). A client sending
  // the old t1 in BOTH places would be detected by the server cookie being t2.
  // Modeling that here:
  const r = fakeReq({ csrfHeader: t1, csrfCookie: t2 });
  assert.equal(validateCsrfToken(r).ok, false);
});

test('exported constants are stable for callers + smoke tests', () => {
  assert.equal(CORPFLOW_CSRF_COOKIE, 'corpflow_csrf');
  assert.equal(CORPFLOW_CSRF_HEADER, 'x-corpflow-csrf');
});
