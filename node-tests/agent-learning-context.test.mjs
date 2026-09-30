import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  AGENT_LEARNING_CONTEXT_KEY,
  experienceRecordKey,
  retrieveAgentLearning,
} from '../lib/server/agent-learning-context.js';

test('agent learning uses a dedicated internal context space', () => {
  assert.equal(AGENT_LEARNING_CONTEXT_KEY, 'agent-learning:corpflow-ai-command-center');
  assert.equal(experienceRecordKey({ experienceId: 'run-001' }), 'experience:run-001');
  assert.throws(() => experienceRecordKey({}), /experience_id_required/);
});

test('retrieval returns only bounded current learning records from the shared fabric', async () => {
  const calls = [];
  const prisma = {
    clientContextSpace: {
      findUnique: async (query) => {
        calls.push(['space', query]);
        return { id: 'space-1', contextKey: AGENT_LEARNING_CONTEXT_KEY };
      },
    },
    clientContextRecord: {
      findMany: async (query) => {
        calls.push(['records', query]);
        return [{
          recordKey: 'learning:forge-validate',
          category: 'LEARNING',
          title: 'Forge validates bounded packets',
          body: 'Use Forge for deterministic packet validation.',
          tagsJson: ['FORGE_VALIDATE_PACKET', 'Forge'],
          confidence: '0.9',
          verification: 'accepted',
          state: 'current',
          sources: [],
          relationsFrom: [{
            toRecord: { recordKey: 'experience:run-001', title: 'FORGE_VALIDATE_PACKET · PASS' },
          }],
        }];
      },
    },
  };

  const result = await retrieveAgentLearning(prisma, {
    taskType: 'FORGE_VALIDATE_PACKET',
    agent: 'Forge',
    limit: 5,
  });

  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].key, 'learning:forge-validate');
  assert.equal(result.records[0].provenance[0].recordKey, 'experience:run-001');

  const query = calls.find(([kind]) => kind === 'records')[1];
  assert.deepEqual(query.where.category.in, ['LEARNING', 'GOLDEN_EXAMPLE', 'FAILURE_MODE', 'ROUTING_RULE']);
  assert.equal(query.where.state, 'current');
  assert.equal(query.take, 5);
});

test('agent learning route reuses client context tables and stays separate from public tenant knowledge', () => {
  const root = process.cwd();
  const router = readFileSync(join(root, 'api/factory_router.js'), 'utf8');
  const service = readFileSync(join(root, 'lib/server/agent-learning-context.js'), 'utf8');
  const schema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8');

  assert.match(router, /factory\/agent-learning/);
  assert.match(router, /handleAgentLearning/);
  assert.match(service, /clientContextSpace/);
  assert.match(service, /clientContextRecord/);
  assert.doesNotMatch(service, /tenantKnowledgeAtom/);
  assert.match(schema, /model ClientContextSpace/);
  assert.match(schema, /model ClientContextRecord/);
});
