import test from 'node:test';
import assert from 'node:assert/strict';

import { extractOutcomesFromConsoleJsonBrief, extractOutcomesFromDescription } from '../lib/server/factory-cmp-push.js';

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

test('extractOutcomesFromConsoleJsonBrief extracts array acceptance_criteria', () => {
  const cj = { brief: { acceptance_criteria: ['- A', 'B', '  C  '] } };
  const out = extractOutcomesFromConsoleJsonBrief(cj);
  assert.deepEqual(out, ['A', 'B', 'C']);
});

test('extractOutcomesFromConsoleJsonBrief extracts bullets from summary text', () => {
  const cj = { brief: { summary: 'Acceptance criteria:\n- One\n- Two\n\nNotes: later' } };
  const out = extractOutcomesFromConsoleJsonBrief(cj);
  assert.deepEqual(out, ['One', 'Two']);
});

