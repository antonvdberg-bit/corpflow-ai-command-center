import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  handleLangfuseProductionValidation,
  productionValidationReadiness,
} from '../api/langfuse_production_validation.js';

function responseCapture() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value;
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
  GROQ_API_KEY: 'gsk-test-not-real',
};

describe('Langfuse production validation runner', () => {
  it('reports readiness without secret values', () => {
    const r = productionValidationReadiness(READY_ENV);
    assert.equal(r.langfuse_ready, true);
    assert.equal(r.groq_key_configured, true);
    assert.equal(JSON.stringify(r).includes('pk-test-not-real'), false);
    assert.equal(JSON.stringify(r).includes('gsk-test-not-real'), false);
  });

  it('requires authentication', async () => {
    const res = responseCapture();
    await handleLangfuseProductionValidation(
      {
        method: 'POST',
        headers: { host: 'core.corpflowai.com' },
        body: { confirm: 'RUN_LANGFUSE_PRODUCTION_VALIDATION' },
      },
      res,
      { verifyAuthImpl: () => false, env: READY_ENV },
    );
    assert.equal(res.statusCode, 401);
  });

  it('requires production core host and exact confirmation', async () => {
    const wrongHost = responseCapture();
    await handleLangfuseProductionValidation(
      {
        method: 'POST',
        headers: { host: 'corpflowai.com' },
        body: { confirm: 'RUN_LANGFUSE_PRODUCTION_VALIDATION' },
      },
      wrongHost,
      { verifyAuthImpl: () => true, env: READY_ENV },
    );
    assert.equal(wrongHost.statusCode, 403);

    const wrongConfirm = responseCapture();
    await handleLangfuseProductionValidation(
      { method: 'POST', headers: { host: 'core.corpflowai.com' }, body: { confirm: 'YES' } },
      wrongConfirm,
      { verifyAuthImpl: () => true, env: READY_ENV },
    );
    assert.equal(wrongConfirm.statusCode, 400);
  });

  it('executes exactly one bounded Groq call through the centralized client', async () => {
    const res = responseCapture();
    let calls = 0;
    let received = null;
    await handleLangfuseProductionValidation(
      {
        method: 'POST',
        headers: { host: 'core.corpflowai.com' },
        body: { confirm: 'RUN_LANGFUSE_PRODUCTION_VALIDATION' },
      },
      res,
      {
        verifyAuthImpl: () => true,
        env: READY_ENV,
        getGroqApiKeyImpl: () => 'configured',
        resolveGroqModelImpl: () => 'openai/gpt-oss-120b',
        groqFetchImpl: async (opts) => {
          calls += 1;
          received = opts;
          return {
            ok: true,
            status: 200,
            async json() {
              return {
                model: 'openai/gpt-oss-120b',
                usage: { prompt_tokens: 12, completion_tokens: 4, total_tokens: 16 },
                choices: [{ message: { content: 'LANGFUSE_PRODUCTION_TRACE_OK' } }],
              };
            },
          };
        },
      },
    );

    assert.equal(calls, 1);
    assert.equal(received.observability.workflow, 'langfuse.production_validation');
    assert.equal(received.max_tokens, 24);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.expected_environment, 'production');
    assert.equal(res.body.retries, 0);
    assert.equal(res.body.client_data_used, false);
  });
});
