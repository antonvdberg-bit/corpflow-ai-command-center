import assert from 'node:assert/strict';
import test from 'node:test';

import {
  authorizeCursorRemoteExecution,
  cursorExecutionBudgetExhausted,
  normalizeCorpFlowCursorMode,
  resolveCursorTaskComplexity,
  routeCursorEconomicExecution,
} from '../lib/server/cursor-economic-execution-gate.js';

function mediumEvidence() {
  return [{
    user: { login: 'antonvdberg-bit' },
    body: '<!-- corpflow.cursor_execution_tier.v1 {"schema":"corpflow.cursor_execution_tier.v1","source_issue":1254,"tier":"medium","controller_justification":"Moderate task; mid-tier expected to reduce retries.","authorization":"not_approved"} -->',
  }];
}

function highEvidence() {
  return [{
    user: { login: 'antonvdberg-bit' },
    body: '<!-- corpflow.cursor_execution_tier.v1 {"schema":"corpflow.cursor_execution_tier.v1","source_issue":1254,"tier":"high","controller_justification":"Difficult task; stronger model expected to lower total completion cost.","authorization":"approved"} -->',
  }];
}

test('missing or invalid Cursor mode fails closed to PARKED', () => {
  assert.equal(normalizeCorpFlowCursorMode(undefined), 'PARKED');
  assert.equal(normalizeCorpFlowCursorMode('nonsense'), 'PARKED');
  assert.deepEqual(authorizeCursorRemoteExecution({ mode: '' }), {
    allowed: false,
    mode: 'PARKED',
    action: 'remote_cursor_execution',
    reason: 'CURSOR_REMOTE_EXECUTION_DENIED_PARKED',
  });
});

test('LOCAL_ONLY blocks autonomous remote execution', () => {
  const result = authorizeCursorRemoteExecution({
    mode: 'LOCAL_ONLY',
    action: 'cloud_agent_create',
  });
  assert.equal(result.allowed, false);
  assert.equal(result.mode, 'LOCAL_ONLY');
  assert.equal(result.reason, 'CURSOR_REMOTE_EXECUTION_DENIED_LOCAL_ONLY');
});

test('FACTORY_ARMED is the only mode that authorizes remote execution', () => {
  const result = authorizeCursorRemoteExecution({
    mode: 'FACTORY_ARMED',
    action: 'cloud_agent_create',
  });
  assert.equal(result.allowed, true);
  assert.equal(result.reason, 'CURSOR_REMOTE_EXECUTION_AUTHORIZED_FACTORY_ARMED');
});

test('complexity is deterministic from explicit value or issue label', () => {
  assert.equal(resolveCursorTaskComplexity({ complexity: 'simple' }), 'simple');
  assert.equal(
    resolveCursorTaskComplexity({ issue: { labels: [{ name: 'complexity:moderate' }] } }),
    'moderate',
  );
  assert.equal(resolveCursorTaskComplexity({ issue: { labels: [] } }), null);
});

test('simple route uses economical low tier with a tight budget', () => {
  const result = routeCursorEconomicExecution({
    mode: 'FACTORY_ARMED',
    complexity: 'simple',
    sourceIssue: 1254,
    issue: { number: 1254 },
    comments: [],
  });
  assert.equal(result.allowed, true);
  assert.equal(result.complexity, 'simple');
  assert.equal(result.tier, 'low');
  assert.equal(result.model.id, 'gpt-5.6-luna');
  assert.deepEqual(result.budget, {
    max_attempts: 1,
    max_follow_ups: 0,
    max_elapsed_minutes: 20,
  });
});

test('moderate route preserves durable MEDIUM evidence requirement', () => {
  const result = routeCursorEconomicExecution({
    mode: 'FACTORY_ARMED',
    complexity: 'moderate',
    sourceIssue: 1254,
    issue: { number: 1254 },
    comments: mediumEvidence(),
  });
  assert.equal(result.tier, 'medium');
  assert.equal(result.model.id, 'gpt-5.6-terra-medium');
  assert.equal(result.budget.max_follow_ups, 1);
});

test('difficult route preserves explicit HIGH authorization requirement', () => {
  const result = routeCursorEconomicExecution({
    mode: 'FACTORY_ARMED',
    complexity: 'difficult',
    sourceIssue: 1254,
    issue: { number: 1254 },
    comments: highEvidence(),
  });
  assert.equal(result.tier, 'high');
  assert.equal(result.model.id, 'cursor-grok-4.6-high-fast');
  assert.equal(result.budget.max_elapsed_minutes, 90);
});

test('unclassified work preserves existing low-tier default instead of silently escalating', () => {
  const result = routeCursorEconomicExecution({
    mode: 'FACTORY_ARMED',
    sourceIssue: 1254,
    issue: { number: 1254 },
    comments: [],
  });
  assert.equal(result.complexity, 'simple');
  assert.equal(result.tier, 'low');
});

test('budget exhaustion stops attempts, excessive follow-ups, or elapsed time', () => {
  const budget = { max_attempts: 1, max_follow_ups: 1, max_elapsed_minutes: 45 };
  assert.equal(cursorExecutionBudgetExhausted({ budget, attempts: 1 }), true);
  assert.equal(cursorExecutionBudgetExhausted({ budget, attempts: 0, followUps: 2 }), true);
  assert.equal(cursorExecutionBudgetExhausted({ budget, attempts: 0, followUps: 0, elapsedMinutes: 45 }), true);
  assert.equal(cursorExecutionBudgetExhausted({ budget, attempts: 0, followUps: 1, elapsedMinutes: 10 }), false);
});
