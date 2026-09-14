import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildSyntheticLeadRescuePilot,
  evaluateSyntheticDraft,
  sendSyntheticLeadRescuePilot,
  validateSendConfig,
} from '../scripts/langfuse-lead-rescue-pilot.mjs';

const FIXED_IDS = Object.freeze({
  traceId: '11111111111111111111111111111111',
  rootSpanId: '2222222222222222',
  classifySpanId: '3333333333333333',
  generationSpanId: '4444444444444444',
  handoffSpanId: '5555555555555555',
  evaluatorSpanId: '6666666666666666',
  outcomeSpanId: '7777777777777777',
});

function attrsToMap(attributes) {
  return Object.fromEntries(attributes.map(({ key, value }) => {
    if ('stringValue' in value) return [key, value.stringValue];
    if ('boolValue' in value) return [key, value.boolValue];
    if ('arrayValue' in value) return [key, value.arrayValue.values.map((v) => v.stringValue)];
    return [key, value];
  }));
}

describe('langfuse synthetic Lead Rescue pilot', () => {
  it('builds one v4-ready OTLP trace with the bounded Lead Rescue flow', () => {
    const pilot = buildSyntheticLeadRescuePilot({ nowMs: 1_750_000_000_000, ids: FIXED_IDS });
    const spans = pilot.payload.resourceSpans[0].scopeSpans[0].spans;

    assert.equal(pilot.traceId, FIXED_IDS.traceId);
    assert.deepEqual(spans.map((s) => s.name), [
      'lead_rescue.synthetic_pilot',
      'lead_rescue.classify',
      'lead_rescue.response_draft',
      'lead_rescue.handoff_decision',
      'lead_rescue.policy_safety_eval',
      'lead_rescue.outcome',
    ]);
    assert.equal(spans.length, 6);
    assert.ok(spans.every((s) => s.traceId === FIXED_IDS.traceId));
    assert.ok(spans.slice(1).every((s) => s.parentSpanId === FIXED_IDS.rootSpanId));
  });

  it('uses filterable CorpFlow metadata and marks all data synthetic', () => {
    const pilot = buildSyntheticLeadRescuePilot({ ids: FIXED_IDS });
    const spans = pilot.payload.resourceSpans[0].scopeSpans[0].spans;
    for (const span of spans) {
      const attrs = attrsToMap(span.attributes);
      assert.equal(attrs['langfuse.trace.name'], 'corpflowai.lead_rescue.synthetic_pilot');
      assert.equal(attrs['langfuse.environment'], 'development');
      assert.equal(attrs['langfuse.trace.metadata.corpflow.tenant_id'], 'synthetic-tenant-langfuse-pilot');
      assert.equal(attrs['langfuse.trace.metadata.corpflow.product'], 'ai-lead-rescue');
      assert.equal(attrs['langfuse.trace.metadata.corpflow.workstream_id'], 'github-issue-1282');
      assert.equal(attrs['langfuse.trace.metadata.corpflow.data_class'], 'synthetic_only');
      assert.ok(attrs['langfuse.trace.tags'].includes('synthetic'));
    }
  });

  it('marks the response draft as a generation without fabricating usage or cost', () => {
    const pilot = buildSyntheticLeadRescuePilot({ ids: FIXED_IDS });
    const generation = pilot.payload.resourceSpans[0].scopeSpans[0].spans.find((s) => s.name === 'lead_rescue.response_draft');
    const attrs = attrsToMap(generation.attributes);

    assert.equal(attrs['langfuse.observation.type'], 'generation');
    assert.equal(attrs['langfuse.observation.model.name'], 'gpt-4o-mini');
    assert.equal(attrs['langfuse.observation.prompt.name'], 'lead-rescue-response-draft-synthetic-pilot');
    assert.equal(attrs['langfuse.observation.prompt.version'], '1');
    assert.equal(attrs['langfuse.observation.metadata.provider_execution'], 'NOT_INVOKED_SYNTHETIC_FIXTURE');
    assert.equal(attrs['langfuse.observation.metadata.token_usage_source'], 'not_provided');
    assert.equal(attrs['langfuse.observation.metadata.cost_source'], 'not_provided');
    assert.equal(Object.hasOwn(attrs, 'langfuse.observation.usage_details'), false);
    assert.equal(Object.hasOwn(attrs, 'langfuse.observation.cost_details'), false);
  });

  it('creates a deterministic automated policy score and does not pretend it is human review', () => {
    const pilot = buildSyntheticLeadRescuePilot({ ids: FIXED_IDS });
    assert.equal(pilot.scenario.evaluation.passed, true);
    assert.equal(pilot.automatedScore.traceId, FIXED_IDS.traceId);
    assert.equal(pilot.automatedScore.observationId, FIXED_IDS.generationSpanId);
    assert.equal(pilot.automatedScore.name, 'policy_safety');
    assert.equal(pilot.automatedScore.dataType, 'BOOLEAN');
    assert.equal(pilot.automatedScore.value, 1);
    assert.match(pilot.automatedScore.comment, /Deterministic sandbox code evaluation/);
  });

  it('fails the code evaluator if a forbidden immediate-send commitment is introduced', () => {
    const result = evaluateSyntheticDraft('We will WhatsApp you immediately. A human will review.');
    assert.equal(result.passed, false);
    assert.equal(result.checks.no_immediate_send_commitment, false);
  });

  it('requires exact sandbox base URL, secure keys, and explicit one-send confirmation', () => {
    assert.throws(() => validateSendConfig({}), /LANGFUSE_BASE_URL/);
    assert.throws(() => validateSendConfig({
      LANGFUSE_BASE_URL: 'https://example.com',
      LANGFUSE_PUBLIC_KEY: 'pk-test',
      LANGFUSE_SECRET_KEY: 'sk-test',
      CONFIRM_LANGFUSE_SYNTHETIC_PILOT: 'YES',
    }), /must be exactly/);
    assert.throws(() => validateSendConfig({
      LANGFUSE_BASE_URL: 'https://cloud.langfuse.com',
      LANGFUSE_PUBLIC_KEY: 'pk-test',
      LANGFUSE_SECRET_KEY: 'sk-test',
    }), /CONFIRM_LANGFUSE_SYNTHETIC_PILOT/);
  });

  it('sends trace then automated score without placing credentials in request bodies', async () => {
    const calls = [];
    const fakeFetch = async (url, options) => {
      calls.push({ url, options });
      return { ok: true, status: 200 };
    };
    const env = {
      LANGFUSE_BASE_URL: 'https://cloud.langfuse.com',
      LANGFUSE_PUBLIC_KEY: 'pk-secret-test-value',
      LANGFUSE_SECRET_KEY: 'sk-secret-test-value',
      CONFIRM_LANGFUSE_SYNTHETIC_PILOT: 'YES',
    };

    const result = await sendSyntheticLeadRescuePilot({ env, fetchImpl: fakeFetch, nowMs: 1_750_000_000_000, ids: FIXED_IDS });
    assert.equal(result.traceAccepted, true);
    assert.equal(result.automatedScoreAccepted, true);
    assert.equal(result.humanReviewRequired, true);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, 'https://cloud.langfuse.com/api/public/otel/v1/traces');
    assert.equal(calls[0].options.headers['x-langfuse-ingestion-version'], '4');
    assert.equal(calls[1].url, 'https://cloud.langfuse.com/api/public/scores');

    for (const call of calls) {
      assert.doesNotMatch(call.options.body, /pk-secret-test-value/);
      assert.doesNotMatch(call.options.body, /sk-secret-test-value/);
      assert.match(call.options.headers.Authorization, /^Basic /);
    }
  });
});
