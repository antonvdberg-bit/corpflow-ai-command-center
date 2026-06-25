import test from 'node:test';
import assert from 'node:assert/strict';

import { isAllowlistedRequest, createGhlReadonlyClient } from '../lib/server/ghl/ghl-readonly-client.js';
import { getGhlLivingWordEnvReadiness } from '../lib/server/ghl/ghl-config.js';
import {
  runGhlLivingWordReadonlyProbe,
  formatGhlProbeVerificationMarkdown,
  GHL_PROBE_EXCLUDED_CATEGORIES,
} from '../lib/server/ghl/ghl-readonly-probe.js';
import {
  redactEmail,
  redactPhone,
  redactName,
  redactDeep,
  assertNoForbiddenSubstrings,
  extractContactFieldNames,
} from '../lib/server/ghl/ghl-redact.js';
import {
  handleGhlLivingWordEnvReadiness,
  handleGhlLivingWordProbe,
} from '../lib/server/ghl-readonly-probe-api.js';
import { GHL_ENV_LOCATION_ID, GHL_ENV_PIT } from '../lib/server/ghl/constants.js';

const ENV_KEYS = [GHL_ENV_LOCATION_ID, GHL_ENV_PIT];

function withEnv(overrides, fn) {
  const prev = {};
  for (const k of ENV_KEYS) {
    prev[k] = process.env[k];
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v == null) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return fn();
  } finally {
    for (const k of ENV_KEYS) {
      if (prev[k] == null) delete process.env[k];
      else process.env[k] = prev[k];
    }
  }
}

test('missing env vars fail closed', () => {
  withEnv({ [GHL_ENV_LOCATION_ID]: '', [GHL_ENV_PIT]: '' }, () => {
    const readiness = getGhlLivingWordEnvReadiness();
    assert.equal(readiness.ok, false);
    assert.ok(readiness.missing.includes(GHL_ENV_LOCATION_ID));
    assert.ok(readiness.missing.includes(GHL_ENV_PIT));
  });
});

test('env readiness reports presence without returning token value', () => {
  withEnv(
    {
      [GHL_ENV_LOCATION_ID]: 'loc_test_123',
      [GHL_ENV_PIT]: 'pit-secret-value-xyz',
    },
    () => {
      const readiness = getGhlLivingWordEnvReadiness();
      assert.equal(readiness.ok, true);
      assert.equal(readiness.locationId, 'loc_test_123');
      assert.equal(readiness.pitLength, 20);
      assert.equal(JSON.stringify(readiness).includes('pit-secret'), false);
    },
  );
});

test('redaction helpers mask pii', () => {
  assert.equal(redactEmail('a@b.com'), '[redacted-email]');
  assert.equal(redactPhone('+230 5538 2181'), '[redacted-phone]');
  assert.equal(redactName('John'), '[redacted-name]');
  const out = redactDeep({ email: 'x@y.z', firstName: 'Jane', id: 'c1' });
  assert.equal(out.email, '[redacted-email]');
  assert.equal(out.firstName, '[redacted-name]');
  assert.equal(out.id, 'c1');
});

test('assertNoForbiddenSubstrings detects token leak', () => {
  assert.throws(
    () => assertNoForbiddenSubstrings({ note: 'has secret-token-here' }, ['secret-token-here']),
    /secret_leak_detected/,
  );
});

test('excluded domains are not allowlisted', () => {
  assert.equal(isAllowlistedRequest('GET', '/conversations/abc'), false);
  assert.equal(isAllowlistedRequest('GET', '/conversations/messages/export'), false);
  assert.equal(isAllowlistedRequest('GET', '/contacts/notes'), false);
  assert.equal(isAllowlistedRequest('POST', '/contacts/'), false);
  assert.equal(isAllowlistedRequest('PUT', '/contacts/abc'), false);
  assert.equal(isAllowlistedRequest('DELETE', '/contacts/abc'), false);
});

test('allowlisted read paths include probe plan endpoints', () => {
  assert.equal(isAllowlistedRequest('GET', '/locations/loc1'), true);
  assert.equal(isAllowlistedRequest('GET', '/locations/loc1/customFields'), true);
  assert.equal(isAllowlistedRequest('POST', '/contacts/search'), true);
  assert.equal(isAllowlistedRequest('GET', '/forms/submissions'), true);
});

test('api budget enforcement stops excess calls', async () => {
  const client = createGhlReadonlyClient({
    dryRun: true,
    maxCalls: 2,
    token: 'test-token',
  });
  await client.request('GET', '/locations/loc1');
  await client.request('GET', '/locations/loc1');
  await assert.rejects(
    () => client.request('GET', '/locations/loc1'),
    /api_budget_exceeded/,
  );
  assert.equal(client.callCount, 2);
});

test('dry-run probe completes without env and does not leak token', async () => {
  const token = 'super-secret-pit-token-value';
  const report = await runGhlLivingWordReadonlyProbe({
    dryRun: true,
    skipEnvCheck: true,
    token,
    locationId: 'loc_mock',
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ 'x-ratelimit-remaining': '99' }),
      json: async () => ({}),
    }),
  });
  assert.equal(report.ok, true);
  assert.ok(report.apiCallCount <= 19);
  const serialized = JSON.stringify(report);
  assert.equal(serialized.includes(token), false);
  assert.equal(report.noWritesPerformed, true);
});

test('dry-run probe collects contact field names not values', async () => {
  const report = await runGhlLivingWordReadonlyProbe({
    dryRun: true,
    skipEnvCheck: true,
    token: 'ZZZ_PIT_SECRET_999',
    locationId: 'loc1',
    fetchImpl: async (url, init) => {
      const path = new URL(url).pathname;
      const method = init.method;
      if (method === 'POST' && path.endsWith('/contacts/search')) {
        const body = JSON.parse(init.body);
        const limit = body.pageLimit || 1;
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({
            total: 42,
            contacts:
              limit > 1
                ? [
                    {
                      id: 'c1',
                      firstName: 'Secret',
                      email: 'secret@example.com',
                      tags: ['visitor', 'prayer'],
                      customFields: [{ id: 'cf1', value: 'x' }],
                    },
                  ]
                : [],
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'x-ratelimit-remaining': '50' }),
        json: async () => ({}),
      };
    },
  });
  const names = report.results?.contacts?.sampleFieldNames || [];
  assert.ok(names.includes('email'));
  assert.ok(names.includes('firstName'));
  assert.deepEqual(report.results?.contacts?.distinctTagsInSample, ['prayer', 'visitor']);
});

test('extractContactFieldNames returns sorted keys', () => {
  assert.deepEqual(extractContactFieldNames({ b: 1, a: 2, email: 'x' }), ['a', 'b', 'email']);
});

test('formatGhlProbeVerificationMarkdown includes safety statements', () => {
  const md = formatGhlProbeVerificationMarkdown({
    ok: true,
    tenantId: 'living-word-mauritius',
    finishedAt: '2026-06-24T12:00:00.000Z',
    apiCallCount: 10,
    callLog: [{ method: 'GET', path: '/locations/x', status: 200, ok: true }],
    results: { location: { id: 'x', name: 'Living Word' }, customFieldsManifest: [] },
  });
  assert.match(md, /No secrets exposed/);
  assert.match(md, /No GHL writes/);
  assert.match(md, /conversations/);
});

test('factory probe API requires auth', async () => {
  const prev = process.env.MASTER_ADMIN_KEY;
  process.env.MASTER_ADMIN_KEY = 'probe-test-master-key';
  /** @type {any} */
  const res = {
    statusCode: 0,
    headers: {},
    setHeader() {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  await handleGhlLivingWordProbe({ method: 'GET', query: { tenant_id: 'living-word-mauritius' }, headers: {} }, res);
  assert.equal(res.statusCode, 403);
  if (prev == null) delete process.env.MASTER_ADMIN_KEY;
  else process.env.MASTER_ADMIN_KEY = prev;
});

test('factory probe API rejects non-allowed tenant', async () => {
  const prev = process.env.MASTER_ADMIN_KEY;
  process.env.MASTER_ADMIN_KEY = 'probe-test-master-key';
  /** @type {any} */
  const res = {
    statusCode: 0,
    setHeader() {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  await handleGhlLivingWordProbe(
    {
      method: 'GET',
      query: { tenant_id: 'other-tenant' },
      headers: { authorization: 'Bearer probe-test-master-key' },
    },
    res,
  );
  assert.equal(res.statusCode, 400);
  if (prev == null) delete process.env.MASTER_ADMIN_KEY;
  else process.env.MASTER_ADMIN_KEY = prev;
});

test('env readiness API never returns pit value', () => {
  withEnv(
    {
      [GHL_ENV_LOCATION_ID]: 'loc_abc',
      [GHL_ENV_PIT]: 'hidden-token-12345',
    },
    () => {
      const prev = process.env.MASTER_ADMIN_KEY;
      process.env.MASTER_ADMIN_KEY = 'k';
      /** @type {any} */
      const res = {
        statusCode: 0,
        setHeader() {},
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(body) {
          this.body = body;
          return this;
        },
      };
      handleGhlLivingWordEnvReadiness(
        { method: 'GET', headers: { authorization: 'Bearer k' } },
        res,
      );
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.pitPresent, true);
      assert.ok(res.body.pitLength >= 10);
      assert.equal(JSON.stringify(res.body).includes('hidden-token'), false);
      if (prev == null) delete process.env.MASTER_ADMIN_KEY;
      else process.env.MASTER_ADMIN_KEY = prev;
    },
  );
});

test('excluded categories list is stable', () => {
  assert.ok(GHL_PROBE_EXCLUDED_CATEGORIES.includes('conversations'));
  assert.ok(GHL_PROBE_EXCLUDED_CATEGORIES.includes('notes'));
});
