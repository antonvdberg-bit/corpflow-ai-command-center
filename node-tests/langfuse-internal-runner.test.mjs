import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  handleLangfuseSyntheticPilot,
  runtimeReadiness,
} from '../api/langfuse_pilot.js';

function responseCapture() {
  const headers = {};
  return {
    statusCode: 200,
    headers,
    body: null,
    setHeader(name, value) {
      headers[String(name).toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

const READY_ENV = {
  VERCEL_ENV: 'production',
  LANGFUSE_BASE_URL: 'https://cloud.langfuse.com',
  LANGFUSE_PUBLIC_KEY: 'pk-test-not-real',
  LANGFUSE_SECRET_KEY: 'sk-test-not-real',
};

describe('Langfuse internal Vercel runner', () => {
  it('reports readiness without exposing values', () => {
    assert.deepEqual(runtimeReadiness(READY_ENV), {
      langfuse_base_url_configured: true,
      langfuse_public_key_configured: true,
      langfuse_secret_key_configured: true,
    });
  });

  it('rejects non-POST requests', async () => {
    const res = responseCapture();
    await handleLangfuseSyntheticPilot(
      { method: 'GET', headers: { host: 'core.corpflowai.com' } },
      res,
      { verifyFactoryMasterAuthImpl: () => true, env: READY_ENV },
    );
    assert.equal(res.statusCode, 405);
    assert.equal(res.body.error, 'METHOD_NOT_ALLOWED');
  });

  it('requires existing factory-admin authentication', async () => {
    const res = responseCapture();
    await handleLangfuseSyntheticPilot(
      { method: 'POST', headers: { host: 'core.corpflowai.com' }, body: { confirm: 'RUN_SYNTHETIC_LANGFUSE_PILOT' } },
      res,
      { verifyFactoryMasterAuthImpl: () => false, env: READY_ENV },
    );
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.error, 'UNAUTHORIZED');
  });

  it('requires core.corpflowai.com in production', async () => {
    const res = responseCapture();
    await handleLangfuseSyntheticPilot(
      { method: 'POST', headers: { host: 'corpflowai.com' }, body: { confirm: 'RUN_SYNTHETIC_LANGFUSE_PILOT' } },
      res,
      { verifyFactoryMasterAuthImpl: () => true, env: READY_ENV },
    );
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.error, 'CORE_HOST_REQUIRED');
  });

  it('requires an exact explicit confirmation phrase', async () => {
    const res = responseCapture();
    await handleLangfuseSyntheticPilot(
      { method: 'POST', headers: { host: 'core.corpflowai.com' }, body: { confirm: 'YES' } },
      res,
      { verifyFactoryMasterAuthImpl: () => true, env: READY_ENV },
    );
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, 'CONFIRMATION_REQUIRED');
  });

  it('fails closed when Infisical-synced Langfuse runtime values are unavailable', async () => {
    const res = responseCapture();
    await handleLangfuseSyntheticPilot(
      { method: 'POST', headers: { host: 'core.corpflowai.com' }, body: { confirm: 'RUN_SYNTHETIC_LANGFUSE_PILOT' } },
      res,
      {
        verifyFactoryMasterAuthImpl: () => true,
        env: { VERCEL_ENV: 'production', LANGFUSE_BASE_URL: 'https://cloud.langfuse.com' },
      },
    );
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.error, 'LANGFUSE_RUNTIME_NOT_READY');
    assert.equal(res.body.readiness.langfuse_secret_key_configured, false);
  });

  it('executes exactly the bounded synthetic sender and returns non-secret evidence', async () => {
    const res = responseCapture();
    let receivedEnv = null;
    let calls = 0;
    await handleLangfuseSyntheticPilot(
      { method: 'POST', headers: { host: 'core.corpflowai.com' }, body: { confirm: 'RUN_SYNTHETIC_LANGFUSE_PILOT' } },
      res,
      {
        verifyFactoryMasterAuthImpl: () => true,
        env: READY_ENV,
        loadSender: async () => async ({ env }) => {
          calls += 1;
          receivedEnv = env;
          return {
            traceId: 'trace-test',
            generationSpanId: 'span-test',
            traceAccepted: true,
            automatedScoreAccepted: true,
            humanReviewRequired: true,
          };
        },
      },
    );

    assert.equal(calls, 1);
    assert.equal(receivedEnv.CONFIRM_LANGFUSE_SYNTHETIC_PILOT, 'YES');
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.trace_id, 'trace-test');
    assert.equal(res.body.credentials_exposed, false);
    assert.equal(res.body.client_data_used, false);
    assert.equal(JSON.stringify(res.body).includes('pk-test-not-real'), false);
    assert.equal(JSON.stringify(res.body).includes('sk-test-not-real'), false);
  });
});
