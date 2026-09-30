import assert from 'node:assert/strict';
import test from 'node:test';

import { FORGE_TASK_CONTRACTS, validateForgePacket } from '../lib/forge/task-contracts.js';

test('accepts a bounded Forge packet', () => {
  const result = validateForgePacket({
    contract: 'FORGE_VALIDATE_PACKET',
    workItem: '#1373',
    allowedFiles: ['fixtures/example.json'],
    verifier: 'node --test node-tests/forge-task-contracts.test.mjs',
    requestedActions: ['read', 'validate'],
    allowSecrets: false,
    allowProductionMutation: false,
  });
  assert.equal(result.ok, true);
  assert.equal(result.contract.timeoutSeconds, 30);
});

test('fails closed on unknown contracts and protected actions', () => {
  const result = validateForgePacket({
    contract: 'FORGE_ROAM_REPO',
    workItem: '#1373',
    allowedFiles: ['../secrets'],
    verifier: 'manual',
    requestedActions: ['production_deploy', 'merge'],
    allowSecrets: true,
    allowProductionMutation: true,
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes('unknown_contract'));
  assert.ok(result.errors.includes('invalid_allowed_file'));
  assert.ok(result.errors.includes('protected_action_requested'));
  assert.ok(result.errors.includes('secrets_not_allowed'));
  assert.ok(result.errors.includes('production_mutation_not_allowed'));
});

test('registry exposes only the five approved initial contracts', () => {
  assert.deepEqual(Object.keys(FORGE_TASK_CONTRACTS).sort(), [
    'FORGE_CREATE_FIXTURE',
    'FORGE_PARSE_LOG',
    'FORGE_REPAIR_TEST',
    'FORGE_TRANSFORM_DATA',
    'FORGE_VALIDATE_PACKET',
  ]);
});
