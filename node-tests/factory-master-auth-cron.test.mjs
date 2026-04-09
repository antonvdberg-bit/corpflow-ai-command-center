import test from 'node:test';
import assert from 'node:assert/strict';

import { verifyCronBearerAuth, verifyFactoryMasterOrCronBearer } from '../lib/server/factory-master-auth.js';

test('verifyCronBearerAuth rejects when secret not configured', () => {
  const prevCron = process.env.CORPFLOW_CRON_SECRET;
  const prevCr = process.env.CRON_SECRET;
  delete process.env.CORPFLOW_CRON_SECRET;
  delete process.env.CRON_SECRET;
  try {
    const req = { headers: { authorization: 'Bearer x' } };
    assert.equal(verifyCronBearerAuth(req), false);
  } finally {
    if (prevCron != null) process.env.CORPFLOW_CRON_SECRET = prevCron;
    if (prevCr != null) process.env.CRON_SECRET = prevCr;
  }
});

test('verifyCronBearerAuth accepts matching Bearer token', () => {
  process.env.CORPFLOW_CRON_SECRET = 'test-cron-secret-xyz';
  delete process.env.CRON_SECRET;
  try {
    const ok = verifyCronBearerAuth({
      headers: { authorization: 'Bearer test-cron-secret-xyz' },
    });
    assert.equal(ok, true);
  } finally {
    delete process.env.CORPFLOW_CRON_SECRET;
  }
});

test('verifyFactoryMasterOrCronBearer true when cron matches', () => {
  process.env.CORPFLOW_CRON_SECRET = 'cron-only';
  delete process.env.MASTER_ADMIN_KEY;
  delete process.env.ADMIN_PIN;
  try {
    const ok = verifyFactoryMasterOrCronBearer({
      headers: { authorization: 'Bearer cron-only' },
    });
    assert.equal(ok, true);
  } finally {
    delete process.env.CORPFLOW_CRON_SECRET;
  }
});
