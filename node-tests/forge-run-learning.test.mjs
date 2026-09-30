import assert from 'node:assert/strict';
import test from 'node:test';

import { buildForgeRunTelemetry } from '../lib/forge/run-telemetry.js';
import { buildCandidateLearning } from '../lib/forge/candidate-learning.js';

test('builds deterministic Forge run telemetry', () => {
  const row = buildForgeRunTelemetry({
    workItem: '#1373',
    taskContract: 'FORGE_VALIDATE_PACKET',
    agent: 'Forge',
    modelRuntime: 'qwen2.5-coder:7b-instruct-q2_K',
    startedAt: '2026-09-30T03:00:00.000Z',
    completedAt: '2026-09-30T03:00:01.250Z',
    result: 'PASS',
    verifier: 'deterministic_packet_validation',
    verifierPassed: true,
    inputTokens: 120,
    outputTokens: 45,
    cpuMs: 800,
    peakRamMb: 900,
    escalatedToCursor: false,
    issueOrPrRef: '#1373',
  });

  assert.equal(row.elapsedMs, 1250);
  assert.equal(row.verifierPassed, true);
  assert.equal(row.escalatedToCursor, false);
});

test('builds candidate learning with bounded confidence', () => {
  const learning = buildCandidateLearning({
    claim: 'Forge reliably validates bounded completion packets.',
    sourceExperience: 'experience:#1373:validate-packet-001',
    confidence: 0.9,
    verifier: 'deterministic_packet_validation',
    taskType: 'FORGE_VALIDATE_PACKET',
    promotionRequirement: 'deterministic_pass_may_auto_accept_low_risk',
  });

  assert.equal(learning.status, 'CURRENT');
  assert.equal(learning.taskType, 'FORGE_VALIDATE_PACKET');
  assert.equal(learning.confidence, 0.9);
});

test('rejects invalid learning confidence', () => {
  assert.throws(() => buildCandidateLearning({
    claim: 'bad confidence',
    sourceExperience: 'x',
    confidence: 1.5,
    verifier: 'x',
  }), /confidence_must_be_between_0_and_1/);
});
