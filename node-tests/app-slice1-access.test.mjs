import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  actorFromSessionPayload,
  assertEnvironmentAccess,
  availableScopesForActor,
  buildProofCoreActor,
  buildProofTenantActor,
  canAccessCore,
  canAccessTenant,
  isProofModeAllowed,
} from '../lib/app/access.js';
import { OTHER_TENANT_ID, REFERENCE_TENANT_ID } from '../lib/app/constants.js';

test('Core credentials/session cannot enter Tenant', () => {
  const actor = actorFromSessionPayload({
    typ: 'admin',
    username: 'core-admin',
    user_id: 'u-core',
    acting_tenant_id: null,
  });
  assert.ok(actor);
  assert.equal(actor.environment, 'core');
  assert.equal(canAccessCore(actor), true);
  assert.equal(canAccessTenant(actor, REFERENCE_TENANT_ID), false);
  assert.equal(actor.can_tenant_ids.length, 0);
  const gate = assertEnvironmentAccess(actor, 'tenant', REFERENCE_TENANT_ID);
  assert.equal(gate.ok, false);
  assert.equal(gate.error, 'tenant_access_denied');
  assert.equal(gate.http_status, 403);
  // Even acting_tenant_id on admin does not open Tenant environment
  const acting = actorFromSessionPayload({
    typ: 'admin',
    username: 'core-admin',
    acting_tenant_id: REFERENCE_TENANT_ID,
  });
  assert.equal(canAccessTenant(acting, REFERENCE_TENANT_ID), false);
});

test('Tenant credentials/session cannot enter Core', () => {
  const actor = actorFromSessionPayload({
    typ: 'tenant',
    tenant_id: REFERENCE_TENANT_ID,
    username: 'tenant-user',
  });
  assert.ok(actor);
  assert.equal(actor.environment, 'tenant');
  assert.equal(canAccessCore(actor), false);
  assert.equal(canAccessTenant(actor, REFERENCE_TENANT_ID), true);
  const gate = assertEnvironmentAccess(actor, 'core');
  assert.equal(gate.ok, false);
  assert.equal(gate.error, 'core_access_denied');
  assert.equal(gate.http_status, 403);
});

test('tenant corpflowai cannot access another tenant (isolation)', () => {
  const actor = actorFromSessionPayload({
    typ: 'tenant',
    tenant_id: REFERENCE_TENANT_ID,
  });
  assert.equal(canAccessTenant(actor, REFERENCE_TENANT_ID), true);
  assert.equal(canAccessTenant(actor, OTHER_TENANT_ID), false);
  const gate = assertEnvironmentAccess(actor, 'tenant', OTHER_TENANT_ID);
  assert.equal(gate.ok, false);
  assert.equal(gate.error, 'tenant_access_denied');
});

test('CorpFlowAI tenant actor is normal tenant auth shape (not admin)', () => {
  const actor = actorFromSessionPayload({
    typ: 'tenant',
    tenant_id: REFERENCE_TENANT_ID,
    username: 'corpflowai-member',
    user_id: 'u-tenant',
  });
  assert.equal(actor.typ, 'tenant');
  assert.equal(actor.role, 'tenant_member');
  assert.equal(actor.can_core, false);
  assert.notEqual(actor.typ, 'admin');
});

test('proof actors are single-environment (no dual ScopeSwitcher)', () => {
  const core = buildProofCoreActor();
  const tenant = buildProofTenantActor();
  assert.equal(canAccessCore(core), true);
  assert.equal(canAccessTenant(core, REFERENCE_TENANT_ID), false);
  assert.equal(canAccessCore(tenant), false);
  assert.equal(canAccessTenant(tenant, REFERENCE_TENANT_ID), true);
  assert.equal(availableScopesForActor(core).length, 1);
  assert.equal(availableScopesForActor(core)[0].scope, 'core');
  assert.equal(availableScopesForActor(tenant)[0].scope, 'tenant');
});

test('proof mode denied on Vercel production', () => {
  assert.equal(isProofModeAllowed({ nodeEnv: 'production', vercelEnv: 'production' }), false);
  assert.equal(isProofModeAllowed({ nodeEnv: 'production', vercelEnv: 'preview' }), true);
  assert.equal(isProofModeAllowed({ nodeEnv: 'development', vercelEnv: '' }), true);
});
