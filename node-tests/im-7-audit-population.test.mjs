/**
 * IM-7 — audit actor context + switch/leave event population tests.
 *
 * Canonical spec: docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §7 + §10 IM-7.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeAuditSourceHost,
  recordOperatorSwitchLeaveAudit,
  resolveAuditActorContext,
  withAuditActorFromRequest,
} from '../lib/server/audit-actor-context.js';

function dbAdminSession({ actingTenantId = null } = {}) {
  return {
    ok: true,
    payload: {
      typ: 'admin',
      user_id: 'auth_user_im7_1',
      acting_tenant_id: actingTenantId,
      session_version: 1,
    },
  };
}

function legacyEnvAdminSession() {
  return { ok: true, payload: { typ: 'admin', username: 'env-admin' } };
}

function dbTenantSession({ tenantId = 'luxe-maurice' } = {}) {
  return {
    ok: true,
    payload: {
      typ: 'tenant',
      user_id: 'auth_user_tenant_1',
      tenant_id: tenantId,
      acting_tenant_id: tenantId,
      session_version: 1,
    },
  };
}

test('resolveAuditActorContext — DB-backed admin', () => {
  const ctx = resolveAuditActorContext(dbAdminSession({ actingTenantId: 'luxe-maurice' }));
  assert.equal(ctx.actorUserId, 'auth_user_im7_1');
  assert.equal(ctx.actingTenantId, 'luxe-maurice');
  assert.equal(ctx.lane, 'db_backed');
});

test('resolveAuditActorContext — legacy env-master', () => {
  const ctx = resolveAuditActorContext(legacyEnvAdminSession());
  assert.equal(ctx.actorUserId, null);
  assert.equal(ctx.lane, 'legacy');
});

test('resolveAuditActorContext — DB-backed tenant user', () => {
  const ctx = resolveAuditActorContext(dbTenantSession());
  assert.equal(ctx.actorUserId, 'auth_user_tenant_1');
  assert.equal(ctx.actingTenantId, 'luxe-maurice');
});

test('withAuditActorFromRequest — ignores body actor_user_id tampering', async () => {
  process.env.SOVEREIGN_SESSION_SECRET =
    process.env.SOVEREIGN_SESSION_SECRET || 'im-7-test-secret-' + 'x'.repeat(40);
  const { signSession, CORPFLOW_SESSION_COOKIE } = await import('../lib/server/session.js');
  const signed = signSession(
    { typ: 'admin', user_id: 'real_user', acting_tenant_id: 'luxe-maurice', session_version: 1 },
    { ttlSec: 3600 },
  );
  const req = {
    headers: { cookie: `${CORPFLOW_SESSION_COOKIE}=${encodeURIComponent(signed.token)}` },
    body: { actor_user_id: 'evil_user' },
  };
  const merged = withAuditActorFromRequest(req, {
    tenantId: 'luxe-maurice',
    eventType: 'cmp.ticket.created',
    payload: { actor_user_id: 'evil_user' },
  });
  assert.equal(merged.actorUserId, 'real_user');
  assert.equal(merged.tenantId, 'luxe-maurice');
  assert.equal(merged.payload.actor_user_id, 'evil_user');
});

test('recordTrustedAutomationEvent — persists actorUserId column', async () => {
  const captured = [];
  const fakePrisma = {
    automationEvent: {
      findUnique: async () => null,
      create: async ({ data }) => {
        captured.push(data);
        return {
          id: 'evt_1',
          occurredAt: new Date('2026-06-17T12:00:00.000Z'),
          tenantScope: 'global',
          eventType: data.eventType,
          riskTier: 'low',
        };
      },
    },
  };
  const { recordTrustedAutomationEvent } = await import('../lib/automation/internal.js');
  await recordTrustedAutomationEvent(fakePrisma, {
    tenantId: null,
    eventType: 'cmp.operator.switched_tenant',
    actorUserId: 'auth_user_im7_1',
    payload: {
      from_tenant_id: null,
      to_tenant_id: 'luxe-maurice',
      timestamp: '2026-06-17T12:00:00.000Z',
      source_host: 'core.corpflowai.com',
    },
  });
  assert.equal(captured.length, 1);
  assert.equal(captured[0].actorUserId, 'auth_user_im7_1');
  assert.equal(captured[0].eventType, 'cmp.operator.switched_tenant');
});

test('recordOperatorSwitchLeaveAudit — switch five-tuple shape', async () => {
  const captured = [];
  const fakePrisma = {
    automationEvent: {
      findUnique: async () => null,
      create: async ({ data }) => {
        captured.push(data);
        return {
          id: 'evt_switch',
          occurredAt: new Date('2026-06-17T12:00:00.000Z'),
          tenantScope: 'global',
          eventType: data.eventType,
          riskTier: 'low',
        };
      },
    },
  };
  await recordOperatorSwitchLeaveAudit({
    prisma: fakePrisma,
    eventType: 'cmp.operator.switched_tenant',
    actorUserId: 'auth_user_im7_1',
    fromTenantId: null,
    toTenantId: 'luxe-maurice',
    sourceHost: 'core.corpflowai.com',
    sessionVersion: 2,
    req: { headers: { host: 'core.corpflowai.com', 'user-agent': 'im7-test' } },
  });
  assert.equal(captured.length, 1);
  assert.equal(captured[0].tenantId, null);
  assert.equal(captured[0].actorUserId, 'auth_user_im7_1');
  assert.equal(captured[0].eventType, 'cmp.operator.switched_tenant');
  assert.equal(captured[0].payload.from_tenant_id, null);
  assert.equal(captured[0].payload.to_tenant_id, 'luxe-maurice');
  assert.equal(captured[0].payload.source_host, 'core.corpflowai.com');
  assert.equal(captured[0].payload.session_version, 2);
  assert.ok(captured[0].payload.timestamp);
});

test('recordOperatorSwitchLeaveAudit — leave event to_tenant_id null', async () => {
  const captured = [];
  const fakePrisma = {
    automationEvent: {
      findUnique: async () => null,
      create: async ({ data }) => {
        captured.push(data);
        return {
          id: 'evt_leave',
          occurredAt: new Date(),
          tenantScope: 'global',
          eventType: data.eventType,
          riskTier: 'low',
        };
      },
    },
  };
  await recordOperatorSwitchLeaveAudit({
    prisma: fakePrisma,
    eventType: 'cmp.operator.left_tenant',
    actorUserId: 'auth_user_im7_1',
    fromTenantId: 'luxe-maurice',
    toTenantId: null,
    sourceHost: 'core.corpflowai.com',
    sessionVersion: 3,
  });
  assert.equal(captured[0].eventType, 'cmp.operator.left_tenant');
  assert.equal(captured[0].payload.from_tenant_id, 'luxe-maurice');
  assert.equal(captured[0].payload.to_tenant_id, null);
});

test('normalizeAuditSourceHost — strips port', () => {
  assert.equal(
    normalizeAuditSourceHost({ headers: { host: 'Core.CorpFlowAI.com:443' } }),
    'core.corpflowai.com',
  );
});

test('recordTrustedAutomationEvent — legacy lane leaves actorUserId null', async () => {
  const captured = [];
  const fakePrisma = {
    automationEvent: {
      findUnique: async () => null,
      create: async ({ data }) => {
        captured.push(data);
        return {
          id: 'evt_2',
          occurredAt: new Date(),
          tenantScope: 'luxe-maurice',
          eventType: data.eventType,
          riskTier: 'low',
        };
      },
    },
  };
  const { recordTrustedAutomationEvent } = await import('../lib/automation/internal.js');
  await recordTrustedAutomationEvent(fakePrisma, {
    tenantId: 'luxe-maurice',
    eventType: 'cmp.ticket.created',
    payload: { ticket_id: 't1' },
  });
  assert.equal(captured[0].actorUserId, null);
});

test('withAuditActorFromRequest — legacy session does not set actorUserId', async () => {
  process.env.SOVEREIGN_SESSION_SECRET =
    process.env.SOVEREIGN_SESSION_SECRET || 'im-7-test-secret-' + 'x'.repeat(40);
  const { signSession, CORPFLOW_SESSION_COOKIE } = await import('../lib/server/session.js');
  const signed = signSession({ typ: 'admin', username: 'env-admin' }, { ttlSec: 3600 });
  const req = {
    headers: { cookie: `${CORPFLOW_SESSION_COOKIE}=${encodeURIComponent(signed.token)}` },
  };
  const merged = withAuditActorFromRequest(req, {
    tenantId: 'luxe-maurice',
    eventType: 'cmp.ticket.created',
  });
  assert.equal(merged.actorUserId, undefined);
});
