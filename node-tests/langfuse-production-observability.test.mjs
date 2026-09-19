import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildProductionGroqTrace,
  emitProductionGroqTrace,
  langfuseProductionReadiness,
  summarizeLlmMessages,
} from '../lib/server/langfuse-production-observability.js';

const env = {
  LANGFUSE_BASE_URL: 'https://cloud.langfuse.com',
  LANGFUSE_PUBLIC_KEY: 'pk-test-not-secret',
  LANGFUSE_SECRET_KEY: 'sk-test-not-secret',
  VERCEL_ENV: 'production',
  VERCEL_GIT_COMMIT_SHA: 'abc123',
};

const messages = [
  { role: 'system', content: 'SYSTEM_PRIVATE_TEXT_SHOULD_NOT_LEAVE_RUNTIME' },
  { role: 'user', content: 'CLIENT_PRIVATE_TEXT_SHOULD_NOT_LEAVE_RUNTIME' },
];

const providerData = {
  model: 'openai/gpt-oss-120b',
  choices: [
    {
      finish_reason: 'stop',
      message: { content: 'MODEL_PRIVATE_OUTPUT_SHOULD_NOT_LEAVE_RUNTIME' },
    },
  ],
  usage: {
    prompt_tokens: 101,
    completion_tokens: 19,
    total_tokens: 120,
  },
};

function payloadText(built) {
  return JSON.stringify(built.payload);
}

test('readiness requires explicit Vercel production plus exact cloud endpoint and both credentials', () => {
  assert.equal(langfuseProductionReadiness(env).ready, true);
  assert.equal(
    langfuseProductionReadiness({ ...env, VERCEL_ENV: 'test', NODE_ENV: 'test' }).ready,
    false,
  );
  assert.equal(
    langfuseProductionReadiness({ ...env, VERCEL_ENV: '', NODE_ENV: 'test' }).ready,
    false,
  );
  assert.equal(langfuseProductionReadiness({ ...env, LANGFUSE_SECRET_KEY: '' }).ready, false);
  assert.equal(
    langfuseProductionReadiness({ ...env, LANGFUSE_BASE_URL: 'https://example.invalid' }).ready,
    false,
  );
});

test('message summaries contain shape only, never content', () => {
  const summary = summarizeLlmMessages(messages);
  assert.deepEqual(summary.roles, { system: 1, user: 1 });
  assert.equal(summary.message_count, 2);
  assert.equal(summary.redacted, true);
  assert.ok(summary.character_count > 0);
  assert.equal(JSON.stringify(summary).includes('CLIENT_PRIVATE_TEXT'), false);
});

test('production trace carries provider usage and filterable CorpFlow metadata', () => {
  const built = buildProductionGroqTrace({
    model: 'fallback-model',
    messages,
    providerData,
    httpStatus: 200,
    startedAtMs: 1000,
    endedAtMs: 1030,
    context: {
      workflow: 'technical_lead.summary_rephrase',
      product: 'coreflow-technical-lead',
      workstream_id: 'github-issue-1282',
      work_packet_id: 'langfuse-production-v1',
    },
    env,
    ids: { traceId: 'a'.repeat(32), spanId: 'b'.repeat(16) },
  });

  assert.deepEqual(built.usage, { input: 101, output: 19, total: 120 });
  const text = payloadText(built);
  assert.match(text, /openai\/gpt-oss-120b/);
  assert.match(text, /corpflowai\.technical_lead\.summary_rephrase/);
  assert.match(text, /production_redacted/);
  const span = built.payload.resourceSpans[0].scopeSpans[0].spans[0];
  const usageAttribute = span.attributes.find(
    (attribute) => attribute.key === 'langfuse.observation.usage_details',
  );
  assert.ok(usageAttribute, 'expected Langfuse usage_details attribute');
  assert.deepEqual(JSON.parse(usageAttribute.value.stringValue), {
    input: 101,
    output: 19,
    total: 120,
  });
  assert.doesNotMatch(text, /SYSTEM_PRIVATE_TEXT/);
  assert.doesNotMatch(text, /CLIENT_PRIVATE_TEXT/);
  assert.doesNotMatch(text, /MODEL_PRIVATE_OUTPUT/);
});

test('emitter sends only OTLP trace payload and never embeds credentials or raw content', async () => {
  let request = null;
  const fakeFetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200 };
  };

  const result = await emitProductionGroqTrace({
    model: 'openai/gpt-oss-120b',
    messages,
    providerData,
    httpStatus: 200,
    startedAtMs: 1000,
    endedAtMs: 1050,
    context: { workflow: 'proof.production_observability', product: 'corpflowai-core' },
    env,
    fetchImpl: fakeFetch,
  });

  assert.equal(result.ok, true);
  assert.equal(result.usage_ingested, true);
  assert.equal(result.content_redacted, true);
  assert.equal(request.url, 'https://cloud.langfuse.com/api/public/otel/v1/traces');
  assert.equal(String(request.options.headers.Authorization).startsWith('Basic '), true);
  assert.doesNotMatch(request.options.body, /pk-test-not-secret/);
  assert.doesNotMatch(request.options.body, /sk-test-not-secret/);
  assert.doesNotMatch(request.options.body, /CLIENT_PRIVATE_TEXT/);
  assert.doesNotMatch(request.options.body, /MODEL_PRIVATE_OUTPUT/);
});

test('emitter skips cleanly when Langfuse runtime values are absent', async () => {
  const result = await emitProductionGroqTrace({
    model: 'x',
    messages: [],
    providerData: {},
    httpStatus: 200,
    startedAtMs: 1,
    endedAtMs: 2,
    env: {},
    fetchImpl: async () => {
      throw new Error('must not run');
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.skipped, true);
  assert.equal(result.reason, 'LANGFUSE_NOT_CONFIGURED');
});
