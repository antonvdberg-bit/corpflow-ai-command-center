import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyCoreServiceWorkflowIntent,
  getCoreServiceTemplate,
  isCoreServiceWorkflowOptedIn,
  listCoreServiceTemplates,
  prepareCoreDraftUpdate,
  resolveCoreServiceId,
  resolveCoreServiceWorkflowAccess,
} from '../lib/server/core-service-workflow.js';
import {
  FACTORY_CONFIG,
  isCipcCoreWorkflowOptedIn,
  prepareCipcDraftUpdate,
} from '../lib/cipc-desk/service-factory.js';

const secondTenantConfig = {
  core_workflow: {
    enabled_tenants: ['synthetic-tenant'],
    transitions: {
      received: { approve: 'in_review' },
      in_review: { complete: 'completed', requires_approval: true },
    },
  },
  services: {
    onboarding: {
      service_id: 'onboarding',
      aliases: ['new-client'],
      subject_cues: ['business onboarding'],
    },
  },
};

test('Core catalogue is configured and BAD remains an explicit opt-in consumer', () => {
  assert.equal(isCipcCoreWorkflowOptedIn('cipc-desk'), true);
  assert.equal(isCipcCoreWorkflowOptedIn('synthetic-tenant'), false);
  assert.equal(isCoreServiceWorkflowOptedIn(secondTenantConfig, 'synthetic-tenant'), true);
  assert.deepEqual(listCoreServiceTemplates(secondTenantConfig).map((s) => s.service_id), ['onboarding']);
  assert.equal(resolveCoreServiceId(secondTenantConfig, 'new-client'), 'onboarding');
  assert.equal(getCoreServiceTemplate(secondTenantConfig, 'onboarding')?.service_id, 'onboarding');
});

test('Core access fails closed for unauthenticated, unconfigured and spoofed tenants', () => {
  assert.equal(
    resolveCoreServiceWorkflowAccess({
      config: secondTenantConfig,
      tenantId: 'synthetic-tenant',
      sessionTenantId: 'synthetic-tenant',
      authenticated: false,
      privilege: 'operator',
    }).status,
    401,
  );
  assert.equal(
    resolveCoreServiceWorkflowAccess({
      config: secondTenantConfig,
      tenantId: 'other-tenant',
      sessionTenantId: 'other-tenant',
      authenticated: true,
      privilege: 'operator',
    }).reason,
    'TENANT_WORKFLOW_NOT_CONFIGURED',
  );
  assert.equal(
    resolveCoreServiceWorkflowAccess({
      config: secondTenantConfig,
      tenantId: 'synthetic-tenant',
      sessionTenantId: 'synthetic-tenant',
      hostTenantId: 'other-tenant',
      authenticated: true,
      privilege: 'operator',
    }).reason,
    'TENANT_SCOPE_MISMATCH',
  );
  assert.equal(
    resolveCoreServiceWorkflowAccess({
      config: secondTenantConfig,
      tenantId: 'synthetic-tenant',
      sessionTenantId: 'synthetic-tenant',
      hostTenantId: 'synthetic-tenant',
      authenticated: true,
      privilege: 'viewer',
    }).status,
    403,
  );
});

test('Core transitions require approval and reject protected intents', () => {
  const pending = applyCoreServiceWorkflowIntent({
    config: secondTenantConfig,
    currentState: 'in_review',
    intent: 'complete',
  });
  assert.deepEqual(pending, {
    applied: false,
    state: 'in_review',
    reason: 'HUMAN_APPROVAL_REQUIRED',
  });
  assert.equal(
    applyCoreServiceWorkflowIntent({
      config: secondTenantConfig,
      currentState: 'in_review',
      intent: 'complete',
      approvalGranted: true,
    }).state,
    'completed',
  );
  assert.equal(
    applyCoreServiceWorkflowIntent({
      config: secondTenantConfig,
      currentState: 'received',
      intent: 'payment',
    }).reason,
    'PAYMENT_PROTECTED',
  );
  assert.equal(
    applyCoreServiceWorkflowIntent({
      config: secondTenantConfig,
      currentState: 'received',
      intent: 'unknown',
    }).reason,
    'INVALID_TRANSITION',
  );
});

test('Core draft updates are tenant-scoped, idempotent and allowlisted', () => {
  const first = prepareCoreDraftUpdate({
    tenantId: 'synthetic-tenant',
    actorTenantId: 'synthetic-tenant',
    patch: { status_note: 'Draft only', next_step: 'Review' },
    allowedFields: ['status_note', 'next_step'],
    idempotencyKey: 'synthetic:ticket-1:status-note',
    seenKeys: new Set(),
  });
  assert.equal(first.status, 'accepted');
  assert.equal(
    prepareCoreDraftUpdate({
      tenantId: 'synthetic-tenant',
      actorTenantId: 'synthetic-tenant',
      patch: { status_note: 'Draft only' },
      allowedFields: ['status_note'],
      idempotencyKey: 'synthetic:ticket-1:status-note',
      seenKeys: new Set(['synthetic:ticket-1:status-note']),
    }).status,
    'idempotent',
  );
  assert.equal(
    prepareCoreDraftUpdate({
      tenantId: 'synthetic-tenant',
      actorTenantId: 'other-tenant',
      patch: { status_note: 'nope' },
      allowedFields: ['status_note'],
      idempotencyKey: 'synthetic:ticket-1:spoof',
    }).reason,
    'TENANT_SCOPE_MISMATCH',
  );
  assert.equal(
    prepareCoreDraftUpdate({
      tenantId: 'synthetic-tenant',
      actorTenantId: 'synthetic-tenant',
      patch: { payment_status: 'paid' },
      allowedFields: ['status_note'],
      idempotencyKey: 'synthetic:ticket-1:payment',
    }).reason,
    'DRAFT_FIELD_NOT_ALLOWED',
  );
});

test('BAD parity still uses its original service templates and protected behavior', () => {
  const annualReturns = getCoreServiceTemplate(FACTORY_CONFIG, 'annual_returns');
  assert.equal(annualReturns?.title, 'Annual Returns');
  assert.equal(resolveCoreServiceId(FACTORY_CONFIG, 'annual returns review'), 'annual_returns');
  assert.equal(
    prepareCipcDraftUpdate({
      tenantId: 'cipc-desk',
      actorTenantId: 'cipc-desk',
      patch: { client_reply_draft: 'Draft only' },
      idempotencyKey: 'cipc:ticket-1:reply',
      seenKeys: new Set(),
    }).status,
    'accepted',
  );
});
