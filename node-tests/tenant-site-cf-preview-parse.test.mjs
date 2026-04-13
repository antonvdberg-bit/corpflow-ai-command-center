import test from 'node:test';
import assert from 'node:assert/strict';

import { parseCfPreviewFromReq, parseCfDebugTenantSiteFromReq } from '../lib/server/tenant-site-public.js';

test('parseCfPreviewFromReq reads from req.query', () => {
  const tok = 'abc.def';
  const req = { query: { __path: 'tenant/site', cf_preview: tok } };
  assert.equal(parseCfPreviewFromReq(req), tok);
});

test('parseCfPreviewFromReq reads from req.url query string', () => {
  const tok = 'payload.sigpart';
  const req = { url: `/api/factory_router?__path=tenant%2Fsite&cf_preview=${encodeURIComponent(tok)}` };
  assert.equal(parseCfPreviewFromReq(req), tok);
});

test('parseCfPreviewFromReq returns empty when absent', () => {
  assert.equal(parseCfPreviewFromReq({ query: {}, url: '/api/x' }), '');
  assert.equal(parseCfPreviewFromReq({}), '');
});

test('parseCfDebugTenantSiteFromReq', () => {
  assert.equal(parseCfDebugTenantSiteFromReq({ query: { cf_debug: '1' } }), true);
  assert.equal(parseCfDebugTenantSiteFromReq({ query: { cf_debug: '0' } }), false);
  assert.equal(
    parseCfDebugTenantSiteFromReq({ url: '/api/factory_router?__path=tenant%2Fsite&cf_debug=1' }),
    true,
  );
});
