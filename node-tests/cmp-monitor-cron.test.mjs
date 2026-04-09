import test from 'node:test';
import assert from 'node:assert/strict';

import handler from '../lib/server/cmp-monitor-cron.js';
import { extractOutcomesFromConsoleJsonBrief } from '../lib/server/factory-cmp-push.js';

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
  const prevPg = process.env.POSTGRES_URL;
  const prevPgAlt1 = process.env.POSTGRES_PRISMA_URL;
  const prevPgAlt2 = process.env.PRISMA_DATABASE_URL;
  process.env.CORPFLOW_CRON_SECRET = 'abc';
  process.env.CRON_SECRET = '';
  process.env.CMP_MONITOR_TICKET_IDS = '';
  process.env.POSTGRES_URL = '';
  delete process.env.POSTGRES_PRISMA_URL;
  delete process.env.PRISMA_DATABASE_URL;

  const req = { method: 'GET', headers: { authorization: 'Bearer abc' } };
  const res = mkRes();
  await handler(req, res);

  assert.equal(res._raw.statusCode, 503);
  assert.equal(res._raw.body?.error, 'POSTGRES_URL_MISSING');

  if (prevPg != null) process.env.POSTGRES_URL = prevPg;
  else delete process.env.POSTGRES_URL;
  if (prevPgAlt1 != null) process.env.POSTGRES_PRISMA_URL = prevPgAlt1;
  if (prevPgAlt2 != null) process.env.PRISMA_DATABASE_URL = prevPgAlt2;
});

test('extractOutcomesFromConsoleJsonBrief accepts explicit brief acceptance criteria array', () => {
  const cj = { brief: { acceptance_criteria: ['- A', 'B'] } };
  const out = extractOutcomesFromConsoleJsonBrief(cj);
  assert.deepEqual(out, ['A', 'B']);
});

