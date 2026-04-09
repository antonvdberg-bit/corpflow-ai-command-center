import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCorpflowHostContext, isApexHostname } from '../lib/server/host-tenant-context.js';

function mkReq(host) {
  return { headers: { host } };
}

test('isApexHostname treats apex and www.apex as apex', () => {
  const prevRoot = process.env.CORPFLOW_ROOT_DOMAIN;
  process.env.CORPFLOW_ROOT_DOMAIN = 'corpflowai.com';
  try {
    assert.equal(isApexHostname('corpflowai.com'), true);
    assert.equal(isApexHostname('www.corpflowai.com'), true);
    assert.equal(isApexHostname('lux.corpflowai.com'), false);
  } finally {
    if (prevRoot === undefined) delete process.env.CORPFLOW_ROOT_DOMAIN;
    else process.env.CORPFLOW_ROOT_DOMAIN = prevRoot;
  }
});

test('buildCorpflowHostContext treats www.<root> as apex (no tenant slug)', () => {
  const prevRoot = process.env.CORPFLOW_ROOT_DOMAIN;
  const prevDefault = process.env.CORPFLOW_DEFAULT_TENANT_ID;
  process.env.CORPFLOW_ROOT_DOMAIN = 'corpflowai.com';
  process.env.CORPFLOW_DEFAULT_TENANT_ID = 'corpflowai';
  try {
    const ctx = buildCorpflowHostContext(mkReq('www.corpflowai.com'));
    assert.equal(ctx.surface, 'tenant');
    assert.equal(ctx.host_slug, 'apex');
    assert.equal(ctx.tenant_id, 'corpflowai');
  } finally {
    if (prevRoot === undefined) delete process.env.CORPFLOW_ROOT_DOMAIN;
    else process.env.CORPFLOW_ROOT_DOMAIN = prevRoot;
    if (prevDefault === undefined) delete process.env.CORPFLOW_DEFAULT_TENANT_ID;
    else process.env.CORPFLOW_DEFAULT_TENANT_ID = prevDefault;
  }
});

