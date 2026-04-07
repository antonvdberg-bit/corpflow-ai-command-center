import test from 'node:test';
import assert from 'node:assert/strict';

import { extractOutcomesFromDescription } from '../lib/server/factory-cmp-push.js';

test('extractOutcomesFromDescription extracts bullet outcomes', () => {
  const desc = `
Title: Something

Intended business outcomes:
- Outcome A
- Outcome B

Notes:
whatever
`;
  const out = extractOutcomesFromDescription(desc);
  assert.deepEqual(out, ['Outcome A', 'Outcome B']);
});

test('extractOutcomesFromDescription returns empty array when missing', () => {
  const out = extractOutcomesFromDescription('hello world');
  assert.deepEqual(out, []);
});

