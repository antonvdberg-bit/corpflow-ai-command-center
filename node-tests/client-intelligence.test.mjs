import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { answerClientQuestion } from '../lib/server/client-intelligence.js';

const root = process.cwd();

test('client intelligence answers only from retrieved records and returns provenance', () => {
  const result = answerClientQuestion({
    records: [{
      key: 'bank-rules-unknown',
      category: 'UNKNOWN',
      title: 'MCB direct-feed support and transaction rules are unverified',
      body: 'MCB CSV import and manual reconciliation are known; direct feed is not verified.',
      tags: ['banking'],
      state: 'current',
      sources: [{ label: 'OrixHealth discovery evidence · issue #1304' }],
    }],
  }, 'What do we know about banking?');
  assert.equal(result.grounded, true);
  assert.match(result.answer, /MCB direct-feed support/);
  assert.equal(result.supportingRecords[0].key, 'bank-rules-unknown');
  assert.equal(result.supportingRecords[0].sources[0].label, 'OrixHealth discovery evidence · issue #1304');
});

test('client intelligence is factory-routed and separate from tenant knowledge atoms', () => {
  const router = readFileSync(join(root, 'api/factory_router.js'), 'utf8');
  const schema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8');
  const migration = readFileSync(join(root, 'prisma/migrations/20260929020000_client_context_fabric_v1/migration.sql'), 'utf8');
  assert.match(router, /factory\/client-intelligence/);
  assert.match(router, /handleClientIntelligence/);
  assert.match(schema, /model ClientContextSpace/);
  assert.match(schema, /model ClientContextRecord/);
  assert.match(migration, /client_context_record_sources/);
  assert.match(migration, /client_context_relations/);
});
