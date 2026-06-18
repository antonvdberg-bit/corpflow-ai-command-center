import test from 'node:test';
import assert from 'node:assert/strict';

import { handleTechnicalLeadAuditsList } from '../lib/server/technical-lead-cron.js';

function mockRes() {
  /** @type {{ statusCode: number, body: unknown, allow?: string }} */
  const out = { statusCode: 0, body: null };
  return {
    out,
    setHeader(_k, v) {
      if (_k === 'Allow') out.allow = v;
    },
    status(code) {
      out.statusCode = code;
      return this;
    },
    json(b) {
      out.body = b;
      return this;
    },
  };
}

test('handleTechnicalLeadAuditsList: rejects unauthenticated GET with 403', async () => {
  const res = mockRes();
  await handleTechnicalLeadAuditsList({ method: 'GET', headers: {}, query: { ticket_id: 't1' } }, res);
  assert.equal(res.out.statusCode, 403);
  assert.match(String(res.out.body?.error || ''), /cron Bearer/i);
});

test('handleTechnicalLeadAuditsList: accepts cron Bearer before ticket validation (read-only route)', async () => {
  const prevCron = process.env.CORPFLOW_CRON_SECRET;
  process.env.CORPFLOW_CRON_SECRET = 'test-cron-audit-secret';
  delete process.env.CRON_SECRET;
  delete process.env.POSTGRES_URL;
  try {
    const res = mockRes();
    await handleTechnicalLeadAuditsList(
      {
        method: 'GET',
        headers: { authorization: 'Bearer test-cron-audit-secret' },
        query: {},
      },
      res,
    );
    // Auth passed; missing ticket_id is the next gate (not 403).
    assert.equal(res.out.statusCode, 400);
    assert.match(String(res.out.body?.error || ''), /ticket_id/i);
  } finally {
    if (prevCron != null) process.env.CORPFLOW_CRON_SECRET = prevCron;
    else delete process.env.CORPFLOW_CRON_SECRET;
  }
});

test('handleTechnicalLeadAuditsList: rejects non-GET', async () => {
  const res = mockRes();
  await handleTechnicalLeadAuditsList({ method: 'POST', headers: {}, query: {} }, res);
  assert.equal(res.out.statusCode, 405);
});
