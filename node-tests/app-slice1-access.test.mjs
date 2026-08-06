import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  actorFromSessionPayload,
  assertScopeAccess,
  availableScopesForActor,
  canAccessCore,
  canAccessTenant,
  isProofModeAllowed,
} from '../lib/app/access.js';
import { OTHER_TENANT_ID, REFERENCE_TENANT_ID } from '../lib/app/constants.js';

test('tenant-only actor cannot access Core', () => {
  const actor = actorFromSessionPayload({
    typ: 'tenant',
    tenant_id: REFERENCE_TENANT_ID,
    username: 'tenant-user',
  });
  assert.equal(canAccessCore(actor), false);
  const gate = assertScopeAccess(actor, 'core');
  assert.equal(gate.ok, false);
  assert.equal(gate.error, 'core_access_denied');
  assert.equal(gate.http_status, 403);
});

test('tenant corpflowai cannot access another tenant', () => {
  const actor = actorFromSessionPayload({
    typ: 'tenant',
    tenant_id: REFERENCE_TENANT_ID,
  });
  assert.equal(canAccessTenant(actor, REFERENCE_TENANT_ID), true);
  assert.equal(canAccessTenant(actor, OTHER_TENANT_ID), false);
  const gate = assertScopeAccess(actor, 'tenant', OTHER_TENANT_ID);
  assert.equal(gate.ok, false);
  assert.equal(gate.error, 'tenant_access_denied');
});

test('admin actor can enter Core and Tenant — CorpFlowAI', () => {
  const actor = actorFromSessionPayload({
    typ: 'admin',
    username: 'anton',
    user_id: 'u1',
    acting_tenant_id: null,
  });
  assert.equal(canAccessCore(actor), true);
  assert.equal(canAccessTenant(actor, REFERENCE_TENANT_ID), true);
  const scopes = availableScopesForActor(actor);
  assert.deepEqual(
    scopes.map((s) => s.scope),
    ['core', 'tenant'],
  );
  assert.equal(assertScopeAccess(actor, 'core').ok, true);
  assert.equal(assertScopeAccess(actor, 'tenant', REFERENCE_TENANT_ID).ok, true);
});

test('proof mode denied on Vercel production', () => {
  assert.equal(isProofModeAllowed({ nodeEnv: 'production', vercelEnv: 'production' }), false);
  assert.equal(isProofModeAllowed({ nodeEnv: 'production', vercelEnv: 'preview' }), true);
  assert.equal(isProofModeAllowed({ nodeEnv: 'development', vercelEnv: '' }), true);
});
