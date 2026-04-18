import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractJsonObjectFromModelText,
  validateChangeRefinerOutput,
} from '../lib/server/groq-contracts.js';

test('validateChangeRefinerOutput accepts minimal valid payload', () => {
  const v = validateChangeRefinerOutput({
    summary: 'S',
    requested_change: 'R',
    scope: 'In scope',
    locale: 'en',
    confidence: 'high',
    missing_information: [],
    client_safe_response: 'Thanks — noted.',
  });
  assert.equal(v.ok, true);
});

test('validateChangeRefinerOutput rejects >2 clarifying questions', () => {
  const v = validateChangeRefinerOutput({
    summary: 'S',
    requested_change: 'R',
    scope: 'Sc',
    locale: 'en',
    confidence: 'low',
    missing_information: ['a?', 'b?', 'c?'],
    client_safe_response: 'OK',
  });
  assert.equal(v.ok, false);
});

test('validateChangeRefinerOutput rejects extra keys', () => {
  const v = validateChangeRefinerOutput({
    summary: 'S',
    requested_change: 'R',
    scope: 'Sc',
    locale: 'en',
    confidence: 'medium',
    missing_information: [],
    client_safe_response: 'OK',
    assistant: 'nope',
  });
  assert.equal(v.ok, false);
});

test('extractJsonObjectFromModelText strips fenced JSON', () => {
  const o = extractJsonObjectFromModelText(
    '```json\n{"summary":"A","requested_change":"B","scope":"C","locale":"en","confidence":"high","missing_information":[],"client_safe_response":"Hi"}\n```',
  );
  const v = validateChangeRefinerOutput(o);
  assert.equal(v.ok, true);
});

const minimalValid = {
  summary: 'S',
  requested_change: 'R',
  scope: 'Sc',
  locale: 'en',
  confidence: 'high',
  missing_information: [],
  client_safe_response: 'Hi',
};

test('extractJsonObjectFromModelText parses plain JSON', () => {
  const o = extractJsonObjectFromModelText(JSON.stringify(minimalValid));
  assert.equal(validateChangeRefinerOutput(o).ok, true);
});

test('extractJsonObjectFromModelText parses preamble + JSON without fence', () => {
  const o = extractJsonObjectFromModelText(
    'Sure — here is the structured brief.\n' + JSON.stringify(minimalValid) + '\nHope this helps.',
  );
  assert.equal(validateChangeRefinerOutput(o).ok, true);
});

test('extractJsonObjectFromModelText returns null for invalid JSON (retry path)', () => {
  assert.equal(extractJsonObjectFromModelText('not json { broken'), null);
});

test('balanced parser ignores braces inside quoted strings', () => {
  const payload = {
    ...minimalValid,
    summary: 'He said {no}',
  };
  const o = extractJsonObjectFromModelText('prefix ' + JSON.stringify(payload) + ' suffix');
  assert.equal(validateChangeRefinerOutput(o).ok, true);
});
