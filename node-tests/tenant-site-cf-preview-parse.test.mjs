import test from 'node:test';
import assert from 'node:assert/strict';

import { parseCfPreviewFromReq } from '../lib/server/tenant-site-public.js';

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
