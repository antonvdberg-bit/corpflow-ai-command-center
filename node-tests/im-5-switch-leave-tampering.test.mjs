/**
 * IM-5 — tampering / security tests for the switch + leave endpoints.
 *
 * Canonical spec: docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §10 IM-5.
 *
 * Tests every gate from the handler's runCommonGates() + body validation +
 * effective-membership check, plus the redirect-target enforcement and the
 * defensive 503 path. The pattern mirrors IM-2's 12-vector tampering suite
 * (`node-tests/user-tenant-membership-tampering.test.mjs`) — fake req/res
 * with stubbed cookies + headers, no live Prisma, no live network.
 *
 * Vector map (14 primary + parallel /leave coverage):
 *
 *   T1  switch — no cookie                                 → 401 UNAUTHENTICATED
 *   T2  switch — env-master cookie (no user_id)            → 400 NO_USER_ID_IN_SESSION
 *   T3  switch — missing body.tenant_id                    → 400 MISSING_TENANT_ID
 *   T4  switch — empty / null / numeric tenant_id           → 400 MISSING_TENANT_ID / INVALID_TENANT_ID
 *   T5  switch — tenant_id with unsafe chars                → 400 INVALID_TENANT_ID
 *   T6  switch — tenant_id not in effective set             → 403 MEMBERSHIP_NOT_FOUND
 *   T7  switch — revoked/disabled membership (fake omits)   → 403 MEMBERSHIP_NOT_FOUND
 *   T8  switch on tenant host                              → 403 SWITCH_NOT_ALLOWED_FROM_HOST
 *   T9  switch — CSRF header missing                       → 403 CSRF_TOKEN_INVALID
 *   T10 switch — CSRF header ≠ cookie                       → 403 CSRF_TOKEN_INVALID
 *   T11 GET /switch (wrong method)                         → 405 METHOD_NOT_ALLOWED + Allow:POST
 *   T12 switch — next=javascript: → fall back to default    (still 200; unsafe next dropped)
 *   T13 switch — next=//evil.com → fall back to default     (still 200; unsafe next dropped)
 *   T14 switch — getEffectiveMembershipsFn throws           → 503 SWITCH_TEMPORARILY_UNAVAILABLE
 *   plus: success path; ensure existing cookie not cleared on CSRF failure
 */
import test from 'node:test';
import assert from 'node:assert/strict';

// Set the secret BEFORE importing the handlers (session module reads cfg → env).
process.env.SOVEREIGN_SESSION_SECRET = process.env.SOVEREIGN_SESSION_SECRET
  || 'im-5-tamper-test-secret-' + 'x'.repeat(40);
// Set CORPFLOW_CORE_HOSTS so safeCoreChangeUrl + buildAllowedHostnames work.
process.env.CORPFLOW_CORE_HOSTS = process.env.CORPFLOW_CORE_HOSTS || 'core.corpflowai.com';

const { signSession, CORPFLOW_SESSION_COOKIE } = await import('../lib/server/session.js');
const { generateCsrfToken, CORPFLOW_CSRF_COOKIE, CORPFLOW_CSRF_HEADER } = await import('../lib/server/csrf.js');
const {
  handleMembershipSwitch,
  handleMembershipLeave,
} = await import('../lib/server/switch-leave-api.js');

/* ---------------------------------- helpers --------------------------------- */

/**
 * Build a fake req with the IM-2 host-context injected (we don't go through
 * `applyCorpflowHostTenantResolution` here — we directly set
 * `req.corpflowContext.surface`).
 */
function makeReq({
  method = 'POST',
  surface = 'core',
  host = 'core.corpflowai.com',
  sessionPayload = null,
  csrfCookie = null,
  csrfHeader = null,
  body = {},
} = {}) {
  const cookieParts = [];
  if (sessionPayload) {
    const signed = signSession(sessionPayload, { ttlSec: 3600 });
    cookieParts.push(`${CORPFLOW_SESSION_COOKIE}=${encodeURIComponent(signed.token)}`);
  }
  if (csrfCookie) cookieParts.push(`${CORPFLOW_CSRF_COOKIE}=${encodeURIComponent(csrfCookie)}`);
  const headers = {};
  if (cookieParts.length > 0) headers.cookie = cookieParts.join('; ');
  if (csrfHeader != null) headers[CORPFLOW_CSRF_HEADER] = csrfHeader;
  return {
    method,
    headers,
    body,
    corpflowContext: { host, surface, tenant_id: surface === 'tenant' ? 'lux' : null },
  };
}

function makeRes() {
  const captured = {};
  const headers = {};
  return {
    headers,
    captured,
    setHeader(k, v) { headers[k] = v; },
    getHeader(k) { return headers[k]; },
    status(code) { captured.status = code; return this; },
    json(body) { captured.body = body; return this; },
    cookies() {
      const sc = headers['Set-Cookie'];
      return sc == null ? [] : Array.isArray(sc) ? sc : [sc];
    },
  };
}

/** A "valid" DB-backed session payload (post-IM-5 shape). */
function dbBackedSession({ tenantId = null, actingTenantId = null } = {}) {
  return {
    typ: tenantId ? 'tenant' : 'admin',
    user_id: 'auth_user_test_1',
    tenant_id: tenantId,
    acting_tenant_id: actingTenantId,
    session_version: 1,
  };
}

/** A "valid" CSRF pair (same value in both cookie + header). */
function csrfPair() {
  const t = generateCsrfToken();
  return { csrfCookie: t, csrfHeader: t };
}

/** Fake getEffectiveMemberships returning the given memberships array. */
function fakeEff(memberships) {
  return async () => ({ memberships });
}

/* --------------------------------- /switch ---------------------------------- */

test('T1 switch — no cookie → 401 UNAUTHENTICATED', async () => {
  const req = makeReq({ sessionPayload: null });
  const res = makeRes();
  await handleMembershipSwitch(req, res);
  assert.equal(res.captured.status, 401);
  assert.equal(res.captured.body.error, 'UNAUTHENTICATED');
  // Existing cookie not cleared (there was none to begin with; assert no
  // Set-Cookie on the response either way).
  assert.equal(res.cookies().length, 0);
});

test('T2 switch — env-master session (no user_id) → 400 NO_USER_ID_IN_SESSION', async () => {
  // Legacy env-master shape: no user_id. CSRF intentionally valid to prove
  // the gate order: user_id check fires BEFORE csrf check.
  const csrf = csrfPair();
  const req = makeReq({
    sessionPayload: { typ: 'admin', username: 'env-anton' }, // legacy shape
    ...csrf,
    body: { tenant_id: 'lux' },
  });
  const res = makeRes();
  await handleMembershipSwitch(req, res);
  assert.equal(res.captured.status, 400);
  assert.equal(res.captured.body.error, 'NO_USER_ID_IN_SESSION');
  // Existing session cookie NOT cleared (no clearCookie call).
  assert.equal(res.cookies().filter((c) => c.startsWith(`${CORPFLOW_SESSION_COOKIE}=`) && c.includes('Max-Age=0')).length, 0);
});

test('T3 switch — missing body.tenant_id → 400 MISSING_TENANT_ID', async () => {
  const csrf = csrfPair();
  const req = makeReq({ sessionPayload: dbBackedSession(), ...csrf, body: {} });
  const res = makeRes();
  await handleMembershipSwitch(req, res);
  assert.equal(res.captured.status, 400);
  assert.equal(res.captured.body.error, 'MISSING_TENANT_ID');
});

test('T4 switch — empty / null / numeric tenant_id → MISSING / INVALID', async () => {
  // Note: the handler lowercases before TENANT_ID_RE checks, so 'ALLCAPS'
  // would normalize to 'allcaps' (a valid shape). Test only values that
  // remain invalid AFTER lowercasing.
  for (const [val, expected] of [
    ['', 'MISSING_TENANT_ID'],
    [null, 'MISSING_TENANT_ID'],
    ['   ', 'MISSING_TENANT_ID'],
    [12345, 'MISSING_TENANT_ID'], // non-string → typeof !== 'string'
    [{ x: 1 }, 'MISSING_TENANT_ID'], // non-string
    ['has spaces', 'INVALID_TENANT_ID'],
    ['has/slash', 'INVALID_TENANT_ID'],
    ['has..dot', 'INVALID_TENANT_ID'],
    ['-leadinghyphen', 'INVALID_TENANT_ID'],
    ['trailinghyphen-', 'INVALID_TENANT_ID'],
    ['_underscore', 'INVALID_TENANT_ID'],
    ['has@symbol', 'INVALID_TENANT_ID'],
    ['has.dot', 'INVALID_TENANT_ID'],
  ]) {
    const csrf = csrfPair();
    const req = makeReq({ sessionPayload: dbBackedSession(), ...csrf, body: { tenant_id: val } });
    const res = makeRes();
    await handleMembershipSwitch(req, res);
    assert.equal(res.captured.status, 400, `value ${JSON.stringify(val)} expected 400 (${expected})`);
    assert.equal(res.captured.body.error, expected, `value ${JSON.stringify(val)} expected error ${expected}`);
  }
});

test('T5 switch — tenant_id with script / SQL chars → 400 INVALID_TENANT_ID', async () => {
  for (const val of [
    "'; DROP TABLE users; --",
    '<script>x</script>',
    '../etc',
    'a\nb',
    'a\rb',
    'a\0b',
    'a@b',
    'a:b',
    'a/b',
  ]) {
    const csrf = csrfPair();
    const req = makeReq({ sessionPayload: dbBackedSession(), ...csrf, body: { tenant_id: val } });
    const res = makeRes();
    await handleMembershipSwitch(req, res);
    assert.equal(res.captured.status, 400, `value ${JSON.stringify(val)} expected 400`);
    assert.equal(res.captured.body.error, 'INVALID_TENANT_ID', `value ${JSON.stringify(val)} expected INVALID_TENANT_ID`);
  }
});

test('T6 switch — tenant_id not in effective set → 403 MEMBERSHIP_NOT_FOUND', async () => {
  const csrf = csrfPair();
  const req = makeReq({
    sessionPayload: dbBackedSession(),
    ...csrf,
    body: { tenant_id: 'tenant-not-in-set' },
  });
  const res = makeRes();
  await handleMembershipSwitch(req, res, {
    getEffectiveMembershipsFn: fakeEff([{ tenant_id: 'lux', primary_hostname: 'lux.corpflowai.com' }]),
  });
  assert.equal(res.captured.status, 403);
  assert.equal(res.captured.body.error, 'MEMBERSHIP_NOT_FOUND');
});

test('T7 switch — revoked/disabled membership is invisible (same 403) — no info leak', async () => {
  // The fake here represents the post-IM-2 helper output: revoked rows are
  // ALREADY filtered out by getEffectiveMemberships. The handler can only see
  // the effective set. Attacker probing for a previously-granted tenant gets
  // the same MEMBERSHIP_NOT_FOUND as attacker probing for a never-granted one.
  const csrf = csrfPair();
  const req = makeReq({
    sessionPayload: dbBackedSession(),
    ...csrf,
    body: { tenant_id: 'previously-granted-now-revoked' },
  });
  const res = makeRes();
  await handleMembershipSwitch(req, res, { getEffectiveMembershipsFn: fakeEff([]) });
  assert.equal(res.captured.status, 403);
  assert.equal(res.captured.body.error, 'MEMBERSHIP_NOT_FOUND');
  // Critical: NO clue about whether the tenant exists, was granted, was
  // revoked, or is soft-deleted.
  assert.equal(res.captured.body.reason, undefined);
  assert.equal(res.captured.body.detail, undefined);
});

test('T8 switch on tenant host → 403 SWITCH_NOT_ALLOWED_FROM_HOST', async () => {
  const csrf = csrfPair();
  const req = makeReq({
    surface: 'tenant',
    host: 'lux.corpflowai.com',
    sessionPayload: dbBackedSession({ tenantId: 'lux', actingTenantId: 'lux' }),
    ...csrf,
    body: { tenant_id: 'living-word-mauritius' },
  });
  const res = makeRes();
  await handleMembershipSwitch(req, res);
  assert.equal(res.captured.status, 403);
  assert.equal(res.captured.body.error, 'SWITCH_NOT_ALLOWED_FROM_HOST');
  assert.equal(res.captured.body.host, 'lux.corpflowai.com');
});

test('T9 switch — CSRF header missing → 403 CSRF_TOKEN_INVALID', async () => {
  const t = generateCsrfToken();
  const req = makeReq({
    sessionPayload: dbBackedSession(),
    csrfCookie: t,
    csrfHeader: null, // header missing
    body: { tenant_id: 'lux' },
  });
  const res = makeRes();
  await handleMembershipSwitch(req, res);
  assert.equal(res.captured.status, 403);
  assert.equal(res.captured.body.error, 'CSRF_TOKEN_INVALID');
});

test('T10 switch — CSRF header ≠ cookie → 403 CSRF_TOKEN_INVALID; existing session cookie NOT cleared', async () => {
  const t1 = generateCsrfToken();
  const t2 = generateCsrfToken();
  const req = makeReq({
    sessionPayload: dbBackedSession(),
    csrfCookie: t1,
    csrfHeader: t2,
    body: { tenant_id: 'lux' },
  });
  const res = makeRes();
  await handleMembershipSwitch(req, res);
  assert.equal(res.captured.status, 403);
  assert.equal(res.captured.body.error, 'CSRF_TOKEN_INVALID');
  // Critical: no Set-Cookie with Max-Age=0 for the session cookie.
  const sessionClearCookies = res.cookies().filter(
    (c) => c.startsWith(`${CORPFLOW_SESSION_COOKIE}=`) && /Max-Age=0\b/.test(c),
  );
  assert.equal(sessionClearCookies.length, 0, 'CSRF failure must NOT clear the session cookie');
});

test('T11 GET /switch → 405 METHOD_NOT_ALLOWED + Allow: POST', async () => {
  const req = makeReq({ method: 'GET' });
  const res = makeRes();
  await handleMembershipSwitch(req, res);
  assert.equal(res.captured.status, 405);
  assert.equal(res.captured.body.error, 'METHOD_NOT_ALLOWED');
  assert.equal(res.headers['Allow'], 'POST');
});

test('T12 switch — next=javascript: silently dropped; success path falls back to tenant or default', async () => {
  const csrf = csrfPair();
  const req = makeReq({
    sessionPayload: dbBackedSession(),
    ...csrf,
    body: { tenant_id: 'lux', next: 'javascript:alert(1)' },
  });
  const res = makeRes();
  await handleMembershipSwitch(req, res, {
    getEffectiveMembershipsFn: fakeEff([
      { tenant_id: 'lux', primary_hostname: 'lux.corpflowai.com', tenant_name: 'LuxeMaurice' },
    ]),
    tenantHostnameLookupFn: async () => 'lux.corpflowai.com',
  });
  assert.equal(res.captured.status, 200);
  assert.equal(res.captured.body.ok, true);
  assert.equal(res.captured.body.acting_tenant_id, 'lux');
  // redirect_to must NOT echo the javascript: input
  assert.ok(res.captured.body.redirect_to.startsWith('https://'), 'must be absolute https://');
  assert.equal(res.captured.body.redirect_to.includes('javascript'), false);
});

test('T13 switch — next=//evil.com silently dropped', async () => {
  const csrf = csrfPair();
  const req = makeReq({
    sessionPayload: dbBackedSession(),
    ...csrf,
    body: { tenant_id: 'lux', next: '//evil.com/x' },
  });
  const res = makeRes();
  await handleMembershipSwitch(req, res, {
    getEffectiveMembershipsFn: fakeEff([
      { tenant_id: 'lux', primary_hostname: 'lux.corpflowai.com' },
    ]),
  });
  assert.equal(res.captured.status, 200);
  assert.equal(res.captured.body.redirect_to.includes('evil.com'), false);
});

test('T14 switch — getEffectiveMembershipsFn throws → 503 SWITCH_TEMPORARILY_UNAVAILABLE; cookie not cleared', async () => {
  const csrf = csrfPair();
  const req = makeReq({
    sessionPayload: dbBackedSession(),
    ...csrf,
    body: { tenant_id: 'lux' },
  });
  const res = makeRes();
  await handleMembershipSwitch(req, res, {
    getEffectiveMembershipsFn: async () => { throw new Error('Prisma down'); },
  });
  assert.equal(res.captured.status, 503);
  assert.equal(res.captured.body.error, 'SWITCH_TEMPORARILY_UNAVAILABLE');
  // No session-clear cookie on this path either.
  const sessionClearCookies = res.cookies().filter(
    (c) => c.startsWith(`${CORPFLOW_SESSION_COOKIE}=`) && /Max-Age=0\b/.test(c),
  );
  assert.equal(sessionClearCookies.length, 0);
});

test('switch — success path: cookie re-issued with new acting_tenant_id + session_version incremented + CSRF rotated', async () => {
  const csrf = csrfPair();
  const req = makeReq({
    sessionPayload: dbBackedSession({ actingTenantId: null }),
    ...csrf,
    body: { tenant_id: 'lux', next: '/change' },
  });
  const res = makeRes();
  await handleMembershipSwitch(req, res, {
    getEffectiveMembershipsFn: fakeEff([
      { tenant_id: 'lux', primary_hostname: 'lux.corpflowai.com', tenant_name: 'LuxeMaurice' },
    ]),
  });
  assert.equal(res.captured.status, 200);
  assert.equal(res.captured.body.ok, true);
  assert.equal(res.captured.body.acting_tenant_id, 'lux');
  assert.equal(res.captured.body.session_version, 2, 'session_version should increment from 1 → 2');
  assert.equal(res.captured.body.tenant_name, 'LuxeMaurice');
  assert.equal(typeof res.captured.body.csrf_token, 'string');
  assert.notEqual(res.captured.body.csrf_token, csrf.csrfCookie, 'CSRF token must rotate');

  // Two Set-Cookie headers: session + csrf
  const cookies = res.cookies();
  assert.equal(cookies.length, 2);
  const sessSet = cookies.find((c) => c.startsWith(`${CORPFLOW_SESSION_COOKIE}=`));
  const csrfSet = cookies.find((c) => c.startsWith(`${CORPFLOW_CSRF_COOKIE}=`));
  assert.ok(sessSet, 'session cookie set');
  assert.ok(csrfSet, 'csrf cookie set');
  assert.ok(sessSet.includes('HttpOnly'), 'session cookie HttpOnly');
  assert.equal(csrfSet.includes('HttpOnly'), false, 'csrf cookie NOT HttpOnly');
  assert.ok(sessSet.includes('SameSite=Lax'));
  assert.ok(csrfSet.includes('SameSite=Lax'));
});

/* ---------------------------------- /leave ---------------------------------- */

test('leave — no cookie → 401 UNAUTHENTICATED', async () => {
  const req = makeReq({ sessionPayload: null });
  const res = makeRes();
  await handleMembershipLeave(req, res);
  assert.equal(res.captured.status, 401);
  assert.equal(res.captured.body.error, 'UNAUTHENTICATED');
});

test('leave — env-master session (no user_id) → 400 NO_USER_ID_IN_SESSION', async () => {
  const csrf = csrfPair();
  const req = makeReq({
    sessionPayload: { typ: 'admin', username: 'env-anton' },
    ...csrf,
  });
  const res = makeRes();
  await handleMembershipLeave(req, res);
  assert.equal(res.captured.status, 400);
  assert.equal(res.captured.body.error, 'NO_USER_ID_IN_SESSION');
});

test('leave on tenant host → 403 SWITCH_NOT_ALLOWED_FROM_HOST', async () => {
  const csrf = csrfPair();
  const req = makeReq({
    surface: 'tenant',
    host: 'lux.corpflowai.com',
    sessionPayload: dbBackedSession({ tenantId: 'lux', actingTenantId: 'lux' }),
    ...csrf,
  });
  const res = makeRes();
  await handleMembershipLeave(req, res);
  assert.equal(res.captured.status, 403);
  assert.equal(res.captured.body.error, 'SWITCH_NOT_ALLOWED_FROM_HOST');
});

test('leave — CSRF header missing → 403 CSRF_TOKEN_INVALID', async () => {
  const t = generateCsrfToken();
  const req = makeReq({
    sessionPayload: dbBackedSession(),
    csrfCookie: t,
    csrfHeader: null,
  });
  const res = makeRes();
  await handleMembershipLeave(req, res);
  assert.equal(res.captured.status, 403);
  assert.equal(res.captured.body.error, 'CSRF_TOKEN_INVALID');
});

test('leave — CSRF header ≠ cookie → 403 CSRF_TOKEN_INVALID; existing cookie not cleared', async () => {
  const t1 = generateCsrfToken();
  const t2 = generateCsrfToken();
  const req = makeReq({
    sessionPayload: dbBackedSession(),
    csrfCookie: t1,
    csrfHeader: t2,
  });
  const res = makeRes();
  await handleMembershipLeave(req, res);
  assert.equal(res.captured.status, 403);
  const sessionClearCookies = res.cookies().filter(
    (c) => c.startsWith(`${CORPFLOW_SESSION_COOKIE}=`) && /Max-Age=0\b/.test(c),
  );
  assert.equal(sessionClearCookies.length, 0);
});

test('GET /leave → 405 METHOD_NOT_ALLOWED + Allow: POST', async () => {
  const req = makeReq({ method: 'GET' });
  const res = makeRes();
  await handleMembershipLeave(req, res);
  assert.equal(res.captured.status, 405);
  assert.equal(res.headers['Allow'], 'POST');
});

test('leave — success: acting_tenant_id becomes null, session_version increments, CSRF rotates', async () => {
  const csrf = csrfPair();
  const req = makeReq({
    sessionPayload: dbBackedSession({ tenantId: 'lux', actingTenantId: 'lux' }),
    ...csrf,
  });
  const res = makeRes();
  await handleMembershipLeave(req, res);
  assert.equal(res.captured.status, 200);
  assert.equal(res.captured.body.ok, true);
  assert.equal(res.captured.body.acting_tenant_id, null);
  assert.equal(res.captured.body.session_version, 2);
  assert.equal(typeof res.captured.body.csrf_token, 'string');
  assert.notEqual(res.captured.body.csrf_token, csrf.csrfCookie);
  assert.match(res.captured.body.redirect_to, /^https:\/\/core\./);
});

test('leave — next=//evil.com silently dropped; default redirect to Core', async () => {
  const csrf = csrfPair();
  const req = makeReq({
    sessionPayload: dbBackedSession({ actingTenantId: 'lux' }),
    ...csrf,
    body: { next: '//evil.com/x' },
  });
  const res = makeRes();
  await handleMembershipLeave(req, res);
  assert.equal(res.captured.status, 200);
  assert.equal(res.captured.body.redirect_to.includes('evil.com'), false);
  assert.match(res.captured.body.redirect_to, /^https:\/\/core\./);
});
