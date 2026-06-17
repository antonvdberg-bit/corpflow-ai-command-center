/**
 * IM-6 — CMP membership + acting_tenant_id enforcement tests.
 *
 * Canonical spec: docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §10 IM-6.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertMembershipEnforcement,
  evaluateActingTenantMembership,
  evaluateDbBackedHostActingMismatch,
  evaluateFactoryMasterPickerContext,
  readActingTenantId,
  readSessionUserId,
  resolveAdminScopedTicketReadTenantId,
  resolveAdminTicketListScope,
} from '../lib/cmp/_lib/cmp-membership-enforcement.js';

const FACTORY_ONLY = new Set(['overseer-sweep']);

function dbAdminSession({ actingTenantId = null } = {}) {
  return { ok: true, payload: { typ: 'admin', user_id: 'u1', acting_tenant_id: actingTenantId, session_version: 1 } };
}

function legacyEnvAdminSession() {
  return { ok: true, payload: { typ: 'admin', username: 'env-admin' } };
}

function legacyPinTenantSession({ tenantId = 'luxe-maurice' } = {}) {
  return { ok: true, payload: { typ: 'tenant', tenant_id: tenantId } };
}

function dbTenantSession({ tenantId = 'luxe-maurice', actingTenantId = tenantId } = {}) {
  return {
    ok: true,
    payload: {
      typ: 'tenant',
      user_id: 'u2',
      tenant_id: tenantId,
      acting_tenant_id: actingTenantId,
      session_version: 1,
    },
  };
}

function fakeEff({ factoryMaster = false, memberships = [], enabled = true } = {}) {
  return {
    enabled,
    factory_master: factoryMaster,
    memberships: memberships.map((tenant_id) => ({ tenant_id })),
  };
}

function makeRes() {
  const captured = {};
  return {
    captured,
    status(code) {
      captured.status = code;
      return this;
    },
    json(body) {
      captured.body = body;
      return this;
    },
  };
}

function deny(res, status, error, extra) {
  const payload = { error };
  if (extra) Object.assign(payload, extra);
  return res.status(status).json(payload);
}

/* ----------------------------- pure helpers ----------------------------- */

test('readSessionUserId — legacy env-master has no user_id', () => {
  assert.equal(readSessionUserId(legacyEnvAdminSession()), '');
  assert.equal(readSessionUserId(dbAdminSession()), 'u1');
});

test('T6 evaluateDbBackedHostActingMismatch — acting other tenant on lux host', () => {
  const out = evaluateDbBackedHostActingMismatch({
    hostSurface: 'tenant',
    hostTenantId: 'luxe-maurice',
    sess: dbAdminSession({ actingTenantId: 'other-tenant' }),
  });
  assert.equal(out?.error, 'TENANT_HOST_SESSION_MISMATCH');
});

test('T6b evaluateDbBackedHostActingMismatch — acting null on tenant host denied', () => {
  const out = evaluateDbBackedHostActingMismatch({
    hostSurface: 'tenant',
    hostTenantId: 'luxe-maurice',
    sess: dbAdminSession({ actingTenantId: null }),
  });
  assert.equal(out?.error, 'TENANT_HOST_SESSION_MISMATCH');
});

test('T6c evaluateDbBackedHostActingMismatch — matching acting tenant allowed', () => {
  const out = evaluateDbBackedHostActingMismatch({
    hostSurface: 'tenant',
    hostTenantId: 'luxe-maurice',
    sess: dbAdminSession({ actingTenantId: 'luxe-maurice' }),
  });
  assert.equal(out, null);
});

test('T13 legacy PIN tenant session — host mismatch helper not applied (no user_id)', () => {
  const out = evaluateDbBackedHostActingMismatch({
    hostSurface: 'tenant',
    hostTenantId: 'luxe-maurice',
    sess: legacyPinTenantSession({ tenantId: 'other-tenant' }),
  });
  assert.equal(out, null);
});

test('T4 evaluateActingTenantMembership — revoked membership fails', () => {
  const out = evaluateActingTenantMembership({
    sess: dbAdminSession({ actingTenantId: 'luxe-maurice' }),
    actingTenantId: 'luxe-maurice',
    eff: fakeEff({ memberships: [] }),
  });
  assert.equal(out?.error, 'ACTING_TENANT_NOT_IN_EFFECTIVE_MEMBERSHIPS');
});

test('T5 evaluateActingTenantMembership — disabled user empty memberships fails', () => {
  const out = evaluateActingTenantMembership({
    sess: dbAdminSession({ actingTenantId: 'luxe-maurice' }),
    actingTenantId: 'luxe-maurice',
    eff: fakeEff({ enabled: false, memberships: [] }),
  });
  assert.equal(out?.error, 'ACTING_TENANT_NOT_IN_EFFECTIVE_MEMBERSHIPS');
});

test('T8 evaluateFactoryMasterPickerContext — acting tenant blocks factory action', () => {
  const out = evaluateFactoryMasterPickerContext({
    sess: dbAdminSession({ actingTenantId: 'luxe-maurice' }),
    actingTenantId: 'luxe-maurice',
    eff: fakeEff({ factoryMaster: true }),
    action: 'overseer-sweep',
  });
  assert.equal(out?.error, 'FACTORY_MASTER_REQUIRES_PICKER_CONTEXT');
});

test('T9 evaluateFactoryMasterPickerContext — non-factory-master admin denied', () => {
  const out = evaluateFactoryMasterPickerContext({
    sess: dbAdminSession({ actingTenantId: null }),
    actingTenantId: '',
    eff: fakeEff({ factoryMaster: false }),
    action: 'overseer-sweep',
  });
  assert.equal(out?.error, 'FACTORY_MASTER_REQUIRES_PICKER_CONTEXT');
});

test('T7 evaluateFactoryMasterPickerContext — factory master picker context allowed', () => {
  const out = evaluateFactoryMasterPickerContext({
    sess: dbAdminSession({ actingTenantId: null }),
    actingTenantId: '',
    eff: fakeEff({ factoryMaster: true }),
    action: 'overseer-sweep',
  });
  assert.equal(out, null);
});

test('T10 legacy env-master admin — list scope core (escape hatch)', () => {
  const scope = resolveAdminTicketListScope({
    sess: legacyEnvAdminSession(),
    eff: null,
    isLegacyEnvMaster: true,
    isFactoryMasterToken: false,
  });
  assert.deepEqual(scope, { kind: 'core' });
});

test('T11 legacy env-master — factory master token scope', () => {
  const scope = resolveAdminTicketListScope({
    sess: null,
    eff: null,
    isLegacyEnvMaster: false,
    isFactoryMasterToken: true,
  });
  assert.deepEqual(scope, { kind: 'factory_master' });
});

test('T14 resolveAdminTicketListScope — DB admin acting as tenant X', () => {
  const scope = resolveAdminTicketListScope({
    sess: dbAdminSession({ actingTenantId: 'luxe-maurice' }),
    eff: fakeEff({ factoryMaster: true }),
    isLegacyEnvMaster: false,
    isFactoryMasterToken: false,
  });
  assert.deepEqual(scope, { kind: 'tenant', tenantId: 'luxe-maurice' });
});

test('T15 resolveAdminTicketListScope — factory master picker context', () => {
  const scope = resolveAdminTicketListScope({
    sess: dbAdminSession({ actingTenantId: null }),
    eff: fakeEff({ factoryMaster: true }),
    isLegacyEnvMaster: false,
    isFactoryMasterToken: false,
  });
  assert.deepEqual(scope, { kind: 'core' });
});

test('T16 resolveAdminTicketListScope — DB admin without factory_master invalid', () => {
  const scope = resolveAdminTicketListScope({
    sess: dbAdminSession({ actingTenantId: null }),
    eff: fakeEff({ factoryMaster: false }),
    isLegacyEnvMaster: false,
    isFactoryMasterToken: false,
  });
  assert.deepEqual(scope, { kind: 'invalid_tenant_session' });
});

test('T12 legacy PIN tenant session list scope preserved', () => {
  const acting = readActingTenantId(legacyPinTenantSession());
  assert.equal(acting, '');
});

/* ------------------------ assertMembershipEnforcement ----------------------- */

test('T19 assertMembershipEnforcement — anonymous passes through', async () => {
  const req = { headers: {} };
  const res = makeRes();
  const out = await assertMembershipEnforcement(req, res, 'ticket-list', {
    getEffectiveMembershipsFn: async () => fakeEff(),
    factoryOnlyActions: FACTORY_ONLY,
    deny,
  });
  assert.equal(out, true);
});

test('T4 async assertMembershipEnforcement — revoked membership on next request', async () => {
  process.env.SOVEREIGN_SESSION_SECRET =
    process.env.SOVEREIGN_SESSION_SECRET || 'im-6-test-secret-' + 'x'.repeat(40);
  const { signSession, CORPFLOW_SESSION_COOKIE } = await import('../lib/server/session.js');
  const signed = signSession(
    { typ: 'admin', user_id: 'u1', acting_tenant_id: 'luxe-maurice', session_version: 1 },
    { ttlSec: 3600 },
  );
  const req = {
    headers: { cookie: `${CORPFLOW_SESSION_COOKIE}=${encodeURIComponent(signed.token)}` },
  };
  const res = makeRes();
  const out = await assertMembershipEnforcement(req, res, 'ticket-get', {
    getEffectiveMembershipsFn: async () => fakeEff({ memberships: [] }),
    factoryOnlyActions: FACTORY_ONLY,
    deny,
  });
  assert.equal(out.captured?.status, 403);
  assert.equal(out.captured?.body?.error, 'ACTING_TENANT_NOT_IN_EFFECTIVE_MEMBERSHIPS');
});

test('T8 async assertMembershipEnforcement — factory action while acting in tenant', async () => {
  process.env.SOVEREIGN_SESSION_SECRET =
    process.env.SOVEREIGN_SESSION_SECRET || 'im-6-test-secret-' + 'x'.repeat(40);
  const { signSession, CORPFLOW_SESSION_COOKIE } = await import('../lib/server/session.js');
  const signed = signSession(
    { typ: 'admin', user_id: 'u1', acting_tenant_id: 'luxe-maurice', session_version: 1 },
    { ttlSec: 3600 },
  );
  const req = {
    headers: { cookie: `${CORPFLOW_SESSION_COOKIE}=${encodeURIComponent(signed.token)}` },
  };
  const res = makeRes();
  const out = await assertMembershipEnforcement(req, res, 'overseer-sweep', {
    getEffectiveMembershipsFn: async () =>
      fakeEff({ factoryMaster: true, memberships: [{ tenant_id: 'luxe-maurice' }] }),
    factoryOnlyActions: FACTORY_ONLY,
    deny,
  });
  assert.equal(out.captured?.status, 403);
  assert.equal(out.captured?.body?.error, 'FACTORY_MASTER_REQUIRES_PICKER_CONTEXT');
});

test('resolveAdminScopedTicketReadTenantId — legacy env-master sees all (null scope)', () => {
  const scoped = resolveAdminScopedTicketReadTenantId({
    sess: legacyEnvAdminSession(),
    eff: null,
    isLegacyEnvMaster: true,
    isFactoryMasterToken: false,
  });
  assert.equal(scoped, null);
});

test('resolveAdminScopedTicketReadTenantId — DB admin scoped to acting tenant', () => {
  const scoped = resolveAdminScopedTicketReadTenantId({
    sess: dbAdminSession({ actingTenantId: 'luxe-maurice' }),
    eff: fakeEff({ factoryMaster: true }),
    isLegacyEnvMaster: false,
    isFactoryMasterToken: false,
  });
  assert.equal(scoped, 'luxe-maurice');
});
