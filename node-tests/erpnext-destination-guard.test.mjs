import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AUTHORITATIVE_ERPNEXT_ORIGIN,
  FRAPPE_DESTINATION_INVALID,
  FRAPPE_REDIRECT_BLOCKED,
  createFrappeRestClient,
  frappeClientFromEnv,
  validateAuthoritativeErpnextOrigin,
} from '../lib/erpnext/frappe-rest-client.js';

const ERP_BASE_URL_ENV = ['ERPNEXT', '_BASE_URL'].join('');

test('authoritative ERP origin accepts only canonical HTTPS root', () => {
  assert.equal(validateAuthoritativeErpnextOrigin(AUTHORITATIVE_ERPNEXT_ORIGIN), AUTHORITATIVE_ERPNEXT_ORIGIN);
  assert.equal(validateAuthoritativeErpnextOrigin(`${AUTHORITATIVE_ERPNEXT_ORIGIN}/`), AUTHORITATIVE_ERPNEXT_ORIGIN);
  for (const value of [
    AUTHORITATIVE_ERPNEXT_ORIGIN.replace('https:', 'http:'),
    'https://hosted.erpnext.com',
    'https://localhost:8000',
    `${AUTHORITATIVE_ERPNEXT_ORIGIN}/stale`,
    `https://user:pass@${new URL(AUTHORITATIVE_ERPNEXT_ORIGIN).host}`,
    `${AUTHORITATIVE_ERPNEXT_ORIGIN}/?redirect=elsewhere`,
    'not-a-url',
  ]) {
    assert.throws(() => validateAuthoritativeErpnextOrigin(value), { message: FRAPPE_DESTINATION_INVALID });
  }
});

test('environment client rejects retired destination before fetch', () => {
  let calls = 0;
  assert.throws(
    () =>
      frappeClientFromEnv({
        [ERP_BASE_URL_ENV]: 'https://hosted.erpnext.com',
        ERPNEXT_API_KEY: 'mock-key',
        ERPNEXT_API_SECRET: 'mock-secret',
        fetchImpl: async () => {
          calls += 1;
        },
      }),
    { message: FRAPPE_DESTINATION_INVALID },
  );
  assert.equal(calls, 0);
});

test('canonical client succeeds and does not follow redirects with credentials', async () => {
  const calls = [];
  const client = createFrappeRestClient({
    baseUrl: AUTHORITATIVE_ERPNEXT_ORIGIN,
    apiKey: 'mock-key',
    apiSecret: 'mock-secret',
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return {
        status: 200,
        headers: { get: () => 'application/json' },
        text: async () => JSON.stringify({ message: 'integrations@corpflowai.com' }),
      };
    },
  });
  const result = await client.getLoggedUser();
  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.redirect, 'manual');
  assert.match(calls[0].init.headers.Authorization, /^token mock-key:mock-secret$/);
});

test('redirect responses fail closed without a second request', async () => {
  let calls = 0;
  const client = createFrappeRestClient({
    baseUrl: AUTHORITATIVE_ERPNEXT_ORIGIN,
    apiKey: 'mock-key',
    apiSecret: 'mock-secret',
    fetchImpl: async () => {
      calls += 1;
      return {
        status: 302,
        headers: { get: () => 'https://retired.example.invalid' },
        text: async () => '',
      };
    },
  });
  const result = await client.get('Quotation', 'SAL-QTN-2026-00099');
  assert.deepEqual(result, {
    ok: false,
    http: 302,
    data: {},
    error: FRAPPE_REDIRECT_BLOCKED,
    row: null,
  });
  assert.equal(calls, 1);
});

test('PDF redirects fail closed before reading or forwarding bytes', async () => {
  const client = createFrappeRestClient({
    baseUrl: AUTHORITATIVE_ERPNEXT_ORIGIN,
    apiKey: 'mock-key',
    apiSecret: 'mock-secret',
    fetchImpl: async (_url, init) => ({
      status: 307,
      headers: { get: () => 'https://retired.example.invalid' },
      arrayBuffer: async () => {
        throw new Error('must not read redirected body');
      },
      init,
    }),
  });
  const result = await client.downloadPdf('Quotation', 'SAL-QTN-2026-00099');
  assert.equal(result.error, FRAPPE_REDIRECT_BLOCKED);
  assert.equal(result.isPdf, false);
});
