import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildImprovementContract,
  decideLearningPromotion,
  recommendExecutor,
} from '../lib/learning/improvement-loop.js';

test('completion contract records explicit no-learning outcome', () => {
  const contract = buildImprovementContract({
    workItem: '#1381',
    agent: 'ChatGPT',
    taskType: 'repo_change',
    changed: 'added deterministic tests',
    verification: 'tests_passed',
    durableSourceUpdated: 'PR',
  });

  assert.equal(contract.materialLearning, false);
  assert.equal(contract.learningOutcome, 'NO_MATERIAL_LEARNING');
});

test('completion contract emits candidate learning when a reusable lesson exists', () => {
  const contract = buildImprovementContract({
    workItem: '#1381',
    agent: 'Forge',
    reusableLesson: 'Use Forge only behind bounded deterministic contracts.',
    routingImplication: 'Forge first for eligible low-tier work.',
  });

  assert.equal(contract.materialLearning, true);
  assert.equal(contract.learningOutcome, 'CANDIDATE_LEARNING');
});

test('low-risk repeated deterministic evidence can promote automatically', () => {
  const verified = decideLearningPromotion({
    currentState: 'CANDIDATE',
    domain: 'test_repair',
    lowRisk: true,
    confidence: 0.85,
    deterministicPasses: 2,
    deterministicFailures: 0,
  });
  assert.equal(verified.state, 'VERIFIED');
  assert.equal(verified.auto, true);

  const adopted = decideLearningPromotion({
    currentState: 'VERIFIED',
    domain: 'test_repair',
    lowRisk: true,
    confidence: 0.95,
    deterministicPasses: 3,
    deterministicFailures: 0,
  });
  assert.equal(adopted.state, 'ADOPTED');
  assert.equal(adopted.auto, true);
});

test('architecture and commercial learning require review', () => {
  for (const domain of ['architecture', 'security', 'commercial', 'client_commitment']) {
    const result = decideLearningPromotion({
      currentState: 'OBSERVATION',
      domain,
      lowRisk: true,
      confidence: 1,
      deterministicPasses: 100,
      deterministicFailures: 0,
    });
    assert.equal(result.state, 'CANDIDATE');
    assert.equal(result.auto, false);
  }
});

test('routing prefers deterministic, then Forge, then Cursor from evidence', () => {
  assert.equal(recommendExecutor({
    deterministic: { samples: 8, passRate: 1 },
    forge: { samples: 20, passRate: 0.95, correctionRate: 0.05, escalationRate: 0.05 },
  }).executor, 'deterministic');

  assert.equal(recommendExecutor({
    deterministic: { samples: 2, passRate: 1 },
    forge: { samples: 10, passRate: 0.9, correctionRate: 0.1, escalationRate: 0.2 },
  }).executor, 'Forge');

  assert.equal(recommendExecutor({
    forge: { samples: 8, passRate: 0.5, correctionRate: 0.4, escalationRate: 0.6 },
  }).executor, 'Cursor');
});

test('replay corpus contains at least ten uniquely identified durable lessons', () => {
  const suite = JSON.parse(readFileSync(
    new URL('../fixtures/learning/corpflow-replay-suite-v1.json', import.meta.url),
    'utf8',
  ));

  assert.equal(suite.schema, 'corpflow.learning_replay_suite.v1');
  assert.ok(suite.cases.length >= 10);
  assert.equal(new Set(suite.cases.map((item) => item.id)).size, suite.cases.length);

  for (const item of suite.cases) {
    assert.ok(item.claim);
    assert.ok(item.expected);
    assert.ok(Array.isArray(item.authority) && item.authority.length > 0);
  }
});
