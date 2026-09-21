import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildProductionGroqTrace,
  buildProductionCursorTrace,
  emitProductionCursorTrace,
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

test('readiness accepts explicit trusted production context outside Vercel', () => {
  const githubEnv = { ...env, VERCEL_ENV: '', NODE_ENV: 'test' };
  assert.equal(langfuseProductionReadiness(githubEnv).ready, false);
  assert.equal(
    langfuseProductionReadiness(githubEnv, { productionContext: true }).ready,
    true,
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

test('Cursor trace is deterministic, provider-reported, and privacy-safe', () => {
  const built = buildProductionCursorTrace({
    agentId: 'bc-agent-1196',
    runId: 'run-1196',
    sourceIssue: 1196,
    modelSelection: { id: 'gpt-5.6-luna-medium' },
    usage: {
      inputTokens: 100,
      outputTokens: 25,
      cacheReadTokens: 7,
      cacheWriteTokens: 3,
      totalTokens: 125,
      cost: 'Included',
    },
    status: 'COMPLETED',
    outcomeRef: 'github-pr-1',
    occurredAt: '2026-09-21T00:00:00.000Z',
    env,
  });
  const again = buildProductionCursorTrace({
    agentId: 'bc-agent-1196',
    runId: 'run-1196',
    sourceIssue: 1196,
    modelSelection: { id: 'gpt-5.6-luna-medium' },
    usage: { totalTokens: 125, cost: 'Included' },
    status: 'COMPLETED',
    occurredAt: '2026-09-21T00:00:00.000Z',
    env,
  });
  assert.equal(built.traceId, again.traceId);
  assert.equal(built.spanId, again.spanId);
  assert.equal(built.economicEvent.cost_class, 'included_capacity');
  assert.equal(built.economicEvent.cash_cost, null);
  assert.equal(built.economicEvent.measurement_quality, 'provider_reported');
  const text = payloadText(built);
  assert.match(text, /gpt-5\.6-luna-medium/);
  assert.doesNotMatch(text, /CLIENT_PRIVATE_TEXT|RAW_TRANSCRIPT_CONTENT/);
});

test('Cursor emitter fails open and preserves UNKNOWN cash cost', async () => {
  const result = await emitProductionCursorTrace({
    agentId: 'bc-agent',
    runId: 'run-agent',
    sourceIssue: 551,
    usage: { totalTokens: 12 },
    status: 'FAILED',
    productionContext: true,
    env: { ...env, VERCEL_ENV: '', NODE_ENV: 'test' },
    fetchImpl: async () => ({ ok: true, status: 200 }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.economic_event.cash_cost, null);
  assert.equal(result.content_redacted, true);
});
