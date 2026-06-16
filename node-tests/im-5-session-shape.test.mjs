/**
 * IM-5 — session-shape tests.
 *
 * Canonical spec: docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §10 IM-5.
 *
 * Verifies the contract of the extended DB-backed session payload:
 *
 *   - `acting_tenant_id` is a string or null.
 *   - `session_version` is a positive integer.
 *   - Round-trip: signSession → cookie string → verifySession recovers all
 *     fields bit-for-bit, including the new ones.
 *   - Backward compatibility: payloads minted BEFORE IM-5 (i.e. without the
 *     new fields) still verify cleanly and `getSessionFromRequest` returns
 *     `acting_tenant_id: undefined` and `session_version: undefined` (callers
 *     coerce to null / 1 via `Number.isInteger` checks per the helper code).
 *   - Legacy env-master and PIN payloads (no `user_id`) remain shape-compatible
 *     when read.
 *
 * Pure — only uses crypto + the existing session helpers. No DB, no network.
 * Requires `SOVEREIGN_SESSION_SECRET` to be set (we set a test value via
 * process.env before importing the helpers).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

// Inject a test secret BEFORE importing session.js (cfg() reads process.env).
process.env.SOVEREIGN_SESSION_SECRET = process.env.SOVEREIGN_SESSION_SECRET
  || 'im-5-test-secret-do-not-use-in-production-' + 'x'.repeat(32);

const {
  CORPFLOW_SESSION_COOKIE,
  getSessionFromRequest,
  signSession,
  verifySession,
} = await import('../lib/server/session.js');

function reqWithCookie(token) {
  return { headers: { cookie: `${CORPFLOW_SESSION_COOKIE}=${encodeURIComponent(token)}` } };
}

test('signSession+verifySession: DB-backed admin payload preserves IM-5 fields', () => {
  const payload = {
    typ: 'admin',
    username: 'anton',
    user_id: 'auth_user_id_admin_1',
    acting_tenant_id: null,
    session_version: 1,
  };
  const signed = signSession(payload, { ttlSec: 3600 });
  assert.equal(signed.ok, true);
  assert.equal(typeof signed.token, 'string');

  const verified = verifySession(signed.token);
  assert.equal(verified.ok, true);
  assert.equal(verified.payload.typ, 'admin');
  assert.equal(verified.payload.username, 'anton');
  assert.equal(verified.payload.user_id, 'auth_user_id_admin_1');
  assert.equal(verified.payload.acting_tenant_id, null);
  assert.equal(verified.payload.session_version, 1);
  assert.equal(typeof verified.payload.iat, 'number');
  assert.equal(typeof verified.payload.exp, 'number');
});

test('signSession+verifySession: DB-backed tenant payload preserves IM-5 fields + tenant_id', () => {
  const payload = {
    typ: 'tenant',
    tenant_id: 'lux',
    username: 'tenant-user',
    user_id: 'auth_user_id_tenant_1',
    acting_tenant_id: 'lux',
    session_version: 1,
  };
  const signed = signSession(payload, { ttlSec: 3600 });
  const verified = verifySession(signed.token);
  assert.equal(verified.ok, true);
  assert.equal(verified.payload.tenant_id, 'lux');
  assert.equal(verified.payload.acting_tenant_id, 'lux');
  assert.equal(verified.payload.session_version, 1);
});

test('signSession: acting_tenant_id="" preserved as-is (caller decides null vs empty)', () => {
  const signed = signSession(
    { typ: 'admin', user_id: 'u', acting_tenant_id: '', session_version: 5 },
    { ttlSec: 60 },
  );
  const verified = verifySession(signed.token);
  assert.equal(verified.payload.acting_tenant_id, '');
  assert.equal(verified.payload.session_version, 5);
});

test('signSession+verifySession: session_version increment round-trips through many values', () => {
  for (const v of [1, 2, 7, 42, 100, 999999]) {
    const signed = signSession(
      { typ: 'admin', user_id: 'u', acting_tenant_id: null, session_version: v },
      { ttlSec: 60 },
    );
    const verified = verifySession(signed.token);
    assert.equal(verified.payload.session_version, v);
  }
});

test('backward compat: pre-IM-5 admin env-master payload still verifies (no acting_tenant_id, no session_version)', () => {
  // Legacy env-master mint point in auth.js still produces this shape — IM-5
  // correction #3 forbids changing it. We must continue to verify these.
  const signed = signSession({ typ: 'admin', username: 'env-anton' }, { ttlSec: 3600 });
  const verified = verifySession(signed.token);
  assert.equal(verified.ok, true);
  assert.equal(verified.payload.typ, 'admin');
  assert.equal(verified.payload.user_id, undefined, 'no user_id on env-master');
  assert.equal(verified.payload.acting_tenant_id, undefined, 'no acting_tenant_id on legacy payload');
  assert.equal(verified.payload.session_version, undefined, 'no session_version on legacy payload');
});

test('backward compat: pre-IM-5 tenant PIN payload still verifies (no acting_tenant_id, no session_version)', () => {
  const signed = signSession({ typ: 'tenant', tenant_id: 'lux', row_id: 'pin-row-1' }, { ttlSec: 3600 });
  const verified = verifySession(signed.token);
  assert.equal(verified.ok, true);
  assert.equal(verified.payload.typ, 'tenant');
  assert.equal(verified.payload.tenant_id, 'lux');
  assert.equal(verified.payload.user_id, undefined);
  assert.equal(verified.payload.acting_tenant_id, undefined);
  assert.equal(verified.payload.session_version, undefined);
});

test('getSessionFromRequest: returns parsed IM-5 fields end-to-end', () => {
  const signed = signSession(
    { typ: 'tenant', tenant_id: 'lux', user_id: 'u', acting_tenant_id: 'lux', session_version: 2 },
    { ttlSec: 600 },
  );
  const req = reqWithCookie(signed.token);
  const s = getSessionFromRequest(req);
  assert.equal(s.ok, true);
  assert.equal(s.payload.tenant_id, 'lux');
  assert.equal(s.payload.acting_tenant_id, 'lux');
  assert.equal(s.payload.session_version, 2);
});

test('getSessionFromRequest: tampered signature → not ok, payload null', () => {
  const signed = signSession(
    { typ: 'admin', user_id: 'u', acting_tenant_id: null, session_version: 1 },
    { ttlSec: 60 },
  );
  // Flip a single character in the signature segment
  const parts = signed.token.split('.');
  parts[2] = parts[2].slice(0, -1) + (parts[2].endsWith('A') ? 'B' : 'A');
  const req = reqWithCookie(parts.join('.'));
  const s = getSessionFromRequest(req);
  assert.equal(s.ok, false);
  assert.equal(s.payload, null);
});

test('getSessionFromRequest: tampered payload (acting_tenant_id swap) → bad_signature', () => {
  // Attacker mints a payload with the wrong acting_tenant_id but keeps the
  // original signature. verifySession must reject (bad_signature).
  const signed = signSession(
    { typ: 'admin', user_id: 'u', acting_tenant_id: 'safe-tenant', session_version: 1 },
    { ttlSec: 60 },
  );
  const parts = signed.token.split('.');
  // Replace payload with one claiming a different acting_tenant_id (same
  // structure but evil value). The signature is computed over header.payload,
  // so this will fail to verify.
  function b64url(s) {
    return Buffer.from(s, 'utf8').toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }
  const evilPayload = JSON.parse(
    Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/') + '===', 'base64').toString('utf8'),
  );
  evilPayload.acting_tenant_id = 'evil-tenant';
  parts[1] = b64url(JSON.stringify(evilPayload));
  const req = reqWithCookie(parts.join('.'));
  const s = getSessionFromRequest(req);
  assert.equal(s.ok, false);
  assert.equal(s.error, 'bad_signature');
});

test('signSession: missing secret → returns { ok: false } (does not throw)', () => {
  const prev = process.env.SOVEREIGN_SESSION_SECRET;
  delete process.env.SOVEREIGN_SESSION_SECRET;
  try {
    const signed = signSession({ typ: 'admin', user_id: 'u' }, { ttlSec: 60 });
    assert.equal(signed.ok, false);
    assert.equal(signed.token, '');
    assert.ok(signed.error);
  } finally {
    process.env.SOVEREIGN_SESSION_SECRET = prev;
  }
});
