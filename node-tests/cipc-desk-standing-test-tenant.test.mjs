import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CIPCDESK_TENANT_ID,
  isCipcDeskStandingTestHost,
  isCipcDeskWorkflowAllowed,
  resolveCipcDeskTenantIdFromHost,
  resolveCipcDeskWorkflowAccess,
} from '../lib/server/cipc-desk-runtime.js';
import { buildCorpflowHostContext } from '../lib/server/host-tenant-context.js';

test('standing hosts map to cipc-desk (short + policy-aligned)', () => {
  assert.equal(isCipcDeskStandingTestHost('cipc.corpflowai.com'), true);
  assert.equal(isCipcDeskStandingTestHost('www.cipc.corpflowai.com'), true);
  assert.equal(isCipcDeskStandingTestHost('cipc-desk.corpflowai.com'), true);
  assert.equal(resolveCipcDeskTenantIdFromHost('cipc.corpflowai.com'), CIPCDESK_TENANT_ID);
  assert.equal(resolveCipcDeskTenantIdFromHost('lux.corpflowai.com'), null);
  assert.equal(resolveCipcDeskTenantIdFromHost('core.corpflowai.com'), null);
});

test('workflow allow: standing host on production', () => {
  const a = resolveCipcDeskWorkflowAccess({
    vercelEnv: 'production',
    host: 'cipc.corpflowai.com',
    tenantId: '',
  });
  assert.equal(a.allowed, true);
  assert.equal(a.reason, 'standing_test_host');
  assert.equal(isCipcDeskWorkflowAllowed({ vercelEnv: 'production', host: 'cipc-desk.corpflowai.com' }), true);
});

test('workflow allow: tenant context cipc-desk', () => {
  const a = resolveCipcDeskWorkflowAccess({
    vercelEnv: 'production',
    host: 'corpflow-ai-command-center-abc.vercel.app',
    tenantId: 'cipc-desk',
  });
  assert.equal(a.allowed, true);
  assert.equal(a.reason, 'tenant_context_cipc_desk');
});

test('workflow deny: other tenants fail closed', () => {
  const a = resolveCipcDeskWorkflowAccess({
    vercelEnv: 'production',
    host: 'lux.corpflowai.com',
    tenantId: 'luxe-maurice',
  });
  assert.equal(a.allowed, false);
  assert.equal(a.reason, 'TENANT_SCOPE_MISMATCH');
});

test('workflow deny: production apex without cipc tenant', () => {
  const a = resolveCipcDeskWorkflowAccess({
    vercelEnv: 'production',
    host: 'corpflowai.com',
    tenantId: '',
  });
  assert.equal(a.allowed, false);
  assert.equal(a.reason, 'CIPC_DESK_STANDING_OR_PREVIEW_REQUIRED');
});

test('workflow allow: legacy preview env without standing host', () => {
  const a = resolveCipcDeskWorkflowAccess({
    vercelEnv: 'preview',
    host: 'corpflow-ai-command-center-abc.vercel.app',
    tenantId: '',
  });
  assert.equal(a.allowed, true);
  assert.equal(a.reason, 'vercel_preview_env');
});

test('host-tenant-context: cipc.corpflowai.com resolves to cipc-desk not cipc', () => {
  const prevRoot = process.env.CORPFLOW_ROOT_DOMAIN;
  const prevCore = process.env.CORPFLOW_CORE_HOSTS;
  const prevMap = process.env.CORPFLOW_TENANT_HOST_MAP;
  try {
    process.env.CORPFLOW_ROOT_DOMAIN = 'corpflowai.com';
    process.env.CORPFLOW_CORE_HOSTS = 'core.corpflowai.com';
    delete process.env.CORPFLOW_TENANT_HOST_MAP;
    const ctx = buildCorpflowHostContext({
      headers: { host: 'cipc.corpflowai.com' },
    });
    assert.equal(ctx.surface, 'tenant');
    assert.equal(ctx.tenant_id, 'cipc-desk');
    assert.notEqual(ctx.tenant_id, 'cipc');
  } finally {
    if (prevRoot == null) delete process.env.CORPFLOW_ROOT_DOMAIN;
    else process.env.CORPFLOW_ROOT_DOMAIN = prevRoot;
    if (prevCore == null) delete process.env.CORPFLOW_CORE_HOSTS;
    else process.env.CORPFLOW_CORE_HOSTS = prevCore;
    if (prevMap == null) delete process.env.CORPFLOW_TENANT_HOST_MAP;
    else process.env.CORPFLOW_TENANT_HOST_MAP = prevMap;
  }
});

test('host-tenant-context: lux remains luxe-unrelated (subdomain lux unless mapped)', () => {
  const prevRoot = process.env.CORPFLOW_ROOT_DOMAIN;
  const prevCore = process.env.CORPFLOW_CORE_HOSTS;
  const prevMap = process.env.CORPFLOW_TENANT_HOST_MAP;
  try {
    process.env.CORPFLOW_ROOT_DOMAIN = 'corpflowai.com';
    process.env.CORPFLOW_CORE_HOSTS = 'core.corpflowai.com';
    delete process.env.CORPFLOW_TENANT_HOST_MAP;
    const ctx = buildCorpflowHostContext({
      headers: { host: 'lux.corpflowai.com' },
    });
    // Without DB override in this sync helper, subdomain label is lux — not cipc-desk.
    assert.notEqual(ctx.tenant_id, 'cipc-desk');
  } finally {
    if (prevRoot == null) delete process.env.CORPFLOW_ROOT_DOMAIN;
    else process.env.CORPFLOW_ROOT_DOMAIN = prevRoot;
    if (prevCore == null) delete process.env.CORPFLOW_CORE_HOSTS;
    else process.env.CORPFLOW_CORE_HOSTS = prevCore;
    if (prevMap == null) delete process.env.CORPFLOW_TENANT_HOST_MAP;
    else process.env.CORPFLOW_TENANT_HOST_MAP = prevMap;
  }
});
