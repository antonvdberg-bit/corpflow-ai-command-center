import test from 'node:test';
import assert from 'node:assert/strict';

import handler from '../lib/server/cmp-monitor-cron.js';

function mkRes() {
  const r = {
    statusCode: 0,
    headers: {},
    body: null,
  };
  return {
    status(code) {
      r.statusCode = code;
      return this;
    },
    setHeader(k, v) {
      r.headers[k] = v;
    },
    json(obj) {
      r.body = obj;
      return this;
    },
    _raw: r,
  };
}

test('cmp-monitor cron rejects missing auth', async () => {
  process.env.CORPFLOW_CRON_SECRET = 'abc';
  process.env.CRON_SECRET = '';
  process.env.CMP_MONITOR_TICKET_IDS = '';

  const req = { method: 'GET', headers: {} };
  const res = mkRes();
  await handler(req, res);
  assert.equal(res._raw.statusCode, 401);
});

test('cmp-monitor cron falls back to default ticket IDs when env is empty', async () => {
  process.env.CORPFLOW_CRON_SECRET = 'abc';
  process.env.CRON_SECRET = '';
  process.env.CMP_MONITOR_TICKET_IDS = '';
  process.env.POSTGRES_URL = '';

  const req = { method: 'GET', headers: { authorization: 'Bearer abc' } };
  const res = mkRes();
  await handler(req, res);

  assert.equal(res._raw.statusCode, 503);
  assert.equal(res._raw.body?.error, 'POSTGRES_URL_MISSING');
});

