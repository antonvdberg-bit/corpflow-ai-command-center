import test from 'node:test';
import assert from 'node:assert/strict';

import {
  evaluateAiBudgetPolicy,
  normalizeAiEconomicEvent,
  summarizeAiEconomics,
  validateAiEconomicEvent,
} from '../lib/server/ai-economic-control.js';
import {
  AI_COST_SOURCE_REGISTRY,
  findAiCostSource,
} from '../lib/server/ai-cost-source-registry.js';

test('source registry contains current controlled and observable AI estates', () => {
  const ids = new Set(AI_COST_SOURCE_REGISTRY.map((source) => source.id));
  for (const id of [
    'chatgpt-interactive',
    'openai-api',
    'cursor-desktop',
    'cursor-cloud-factory',
    'codex',
    'groq-api',
    'elevenlabs-agents',
    'anthropic-api',
    'gemini-api',
    'openrouter',
  ]) {
    assert.equal(ids.has(id), true, `missing source ${id}`);
  }
  assert.equal(findAiCostSource('cursor-cloud-factory')?.control, 'existing_cursor_economic_gate_1249_1254');
});

test('normalizer preserves unknown values rather than inventing cost precision', () => {
  const event = normalizeAiEconomicEvent({
    event_id: 'evt-1',
    source_id: 'groq-api',
    model: 'example-model',
    usage: { input: 100, output: 25, total: 125 },
    workflow: 'technical_lead.summary_rephrase',
  });

  assert.equal(event.cash_cost, null);
  assert.equal(event.cash_currency, null);
  assert.equal(event.measurement_quality, 'unknown');
  assert.equal(event.usage.total, 125);
  assert.equal(event.provider, 'groq');
  assert.equal(event.cost_class, 'variable_usage');
});

test('validator rejects unknown sources and incomplete exact measurements', () => {
  const result = validateAiEconomicEvent({
    event_id: 'evt-2',
    source_id: 'not-a-real-source',
    cost_class: 'variable_usage',
    measurement_quality: 'exact',
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.includes('unknown_source_id'), true);
  assert.equal(result.errors.includes('exact_measurement_requires_exact_value'), true);
});

test('budget below 50 percent allows ordinary governed execution', () => {
  const result = evaluateAiBudgetPolicy({
    budget_limit: 100,
    spent: 20,
    expected_run_cost: 5,
    max_run_cost: 10,
    run_count: 1,
    max_runs: 5,
    retry_count: 0,
    max_retries: 1,
    execution_tier: 'LOW',
  });

  assert.equal(result.action, 'ALLOW');
  assert.equal(result.code, 'within_budget');
  assert.equal(result.projected_spend, 25);
});

test('50 percent threshold remains allowed but becomes visible', () => {
  const result = evaluateAiBudgetPolicy({
    budget_limit: 100,
    spent: 48,
    expected_run_cost: 3,
    execution_tier: 'LOW',
  });

  assert.equal(result.action, 'ALLOW');
  assert.equal(result.code, 'visible_budget_consumption');
  assert.equal(result.reasons.includes('budget_visibility_threshold_reached'), true);
});

test('75 percent threshold warns and prefers economical execution', () => {
  const result = evaluateAiBudgetPolicy({
    budget_limit: 100,
    spent: 72,
    expected_run_cost: 5,
    execution_tier: 'LOW',
  });

  assert.equal(result.action, 'WARN');
  assert.equal(result.code, 'economical_execution_preferred');
});

test('90 percent threshold requires approval', () => {
  const result = evaluateAiBudgetPolicy({
    budget_limit: 100,
    spent: 88,
    expected_run_cost: 3,
    execution_tier: 'LOW',
  });

  assert.equal(result.action, 'REQUIRE_APPROVAL');
  assert.equal(result.code, 'near_budget_ceiling');
});

test('budget exhaustion stops discretionary execution', () => {
  const result = evaluateAiBudgetPolicy({
    budget_limit: 100,
    spent: 99,
    expected_run_cost: 2,
    execution_tier: 'LOW',
  });

  assert.equal(result.action, 'STOP');
  assert.equal(result.code, 'budget_exhausted_or_projected_to_exceed');
});

test('explicit approved critical exception can cross the ceiling', () => {
  const result = evaluateAiBudgetPolicy({
    budget_limit: 100,
    spent: 100,
    expected_run_cost: 2,
    critical: true,
    exception_approved: true,
  });

  assert.equal(result.action, 'ALLOW');
  assert.equal(result.code, 'approved_critical_exception');
});

test('high execution tier requires explicit approval even with budget available', () => {
  const result = evaluateAiBudgetPolicy({
    budget_limit: 100,
    spent: 10,
    expected_run_cost: 1,
    execution_tier: 'HIGH',
  });

  assert.equal(result.action, 'REQUIRE_APPROVAL');
  assert.equal(result.code, 'premium_tier_requires_approval');
});

test('finite run and retry envelopes fail closed', () => {
  assert.equal(
    evaluateAiBudgetPolicy({ budget_limit: 100, max_runs: 2, run_count: 2 }).code,
    'run_envelope_exhausted',
  );
  assert.equal(
    evaluateAiBudgetPolicy({ budget_limit: 100, max_retries: 1, retry_count: 1 }).code,
    'retry_envelope_exhausted',
  );
  assert.equal(
    evaluateAiBudgetPolicy({ budget_limit: 100, expected_run_cost: 11, max_run_cost: 10 }).code,
    'per_run_cost_cap_exceeded',
  );
});

test('missing budget requires an operator decision instead of silently spending', () => {
  const result = evaluateAiBudgetPolicy({ expected_run_cost: 1 });
  assert.equal(result.action, 'REQUIRE_APPROVAL');
  assert.equal(result.code, 'budget_not_defined');
});

test('economics summary distinguishes outcomes and unattributed cost evidence', () => {
  const summary = summarizeAiEconomics([
    {
      event_id: 'a',
      source_id: 'groq-api',
      cash_cost: 0.02,
      cash_currency: 'USD',
      measurement_quality: 'provider_reported',
      workstream_id: 'ws-1',
      outcome: 'successful',
    },
    {
      event_id: 'b',
      source_id: 'cursor-cloud-factory',
      measurement_quality: 'allocated',
      outcome: 'reworked',
    },
  ]);

  assert.equal(summary.events, 2);
  assert.equal(summary.measured_cash_cost, 0.02);
  assert.equal(summary.high_confidence_events, 1);
  assert.equal(summary.successful_events, 1);
  assert.equal(summary.failed_or_reworked_events, 1);
  assert.equal(summary.unattributed_events, 1);
});
