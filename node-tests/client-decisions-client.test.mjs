import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  applyClientDecisionAnswers,
  evaluateClientDecisionsGate,
  payloadLeaksInternals,
} from '../lib/cmp/_lib/client-decisions-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..');

test('evaluateClientDecisionsGate: insufficient until all six answered (or IDX waived)', () => {
  const partial = [
    { key: 'first_slice_outcome', status: 'answered', answer: 'x' },
    { key: 'first_market_or_country', status: 'pending', answer: '' },
    { key: 'listings_feed_or_idx_provider_status', status: 'pending', answer: '' },
    { key: 'crm_destination_or_tooling_preference', status: 'pending', answer: '' },
    { key: 'first_ai_communication_channel', status: 'pending', answer: '' },
    { key: 'human_handoff_owner_and_hours', status: 'pending', answer: '' },
  ];
  assert.equal(evaluateClientDecisionsGate(partial).sufficient_to_proceed, false);

  const complete = [
    { key: 'first_slice_outcome', status: 'answered', answer: 'a' },
    { key: 'first_market_or_country', status: 'answered', answer: 'b' },
    { key: 'listings_feed_or_idx_provider_status', status: 'waived', answer: '' },
    { key: 'crm_destination_or_tooling_preference', status: 'answered', answer: 'c' },
    { key: 'first_ai_communication_channel', status: 'answered', answer: 'd' },
    { key: 'human_handoff_owner_and_hours', status: 'answered', answer: 'e' },
  ];
  assert.equal(evaluateClientDecisionsGate(complete).sufficient_to_proceed, true);
});

test('applyClientDecisionAnswers: persists answers + recomputes sufficient_to_proceed; does not touch internal_decisions', () => {
  const stored = {
    internal_decisions: { secret: 'nope' },
    client_decisions: { items: [] },
    messages: [],
  };
  const answersByKey = {
    first_slice_outcome: { answer: 'Slice A' },
    first_market_or_country: { answer: 'CA' },
    listings_feed_or_idx_provider_status: { waive: true },
    crm_destination_or_tooling_preference: { answer: 'HubSpot' },
    first_ai_communication_channel: { answer: 'SMS' },
    human_handoff_owner_and_hours: { answer: 'Owner: Ops · Hours: 9-5 ET' },
  };
  const applied = applyClientDecisionAnswers({
    stored,
    answersByKey,
    meta: { nowIso: '2026-01-01T00:00:00.000Z', messageId: 'msg:test' },
  });
  assert.equal(applied.sufficient_to_proceed, true);
  assert.deepEqual(applied.next.internal_decisions, { secret: 'nope' });
  const cd = applied.next.client_decisions && typeof applied.next.client_decisions === 'object' ? applied.next.client_decisions : {};
  assert.equal(cd.sufficient_to_proceed, true);
  const items = Array.isArray(cd.items) ? cd.items : [];
  const byKey = new Map(items.map((x) => [String(x.key), x]));
  assert.equal(byKey.get('first_slice_outcome')?.status, 'answered');
  assert.equal(byKey.get('listings_feed_or_idx_provider_status')?.status, 'waived');
});

test('payloadLeaksInternals: client-decisions-get/submit shapes are safe', () => {
  assert.equal(payloadLeaksInternals({ ok: true, client_decisions: { items: [] } }), false);
  assert.equal(payloadLeaksInternals({ internal_decisions: [] }), true);
});

test('client change decisions page does not embed forbidden substrings', () => {
  const p = path.join(repoRoot, 'pages', 'client', 'change-decisions.js');
  const src = fs.readFileSync(p, 'utf8');
  for (const needle of ['internal_decisions', 'console_json', 'reality_panel', 'change_stage_debug']) {
    assert.equal(src.includes(needle), false, `unexpected ${needle} in client page`);
  }
  const matches = src.match(/<button\b/gi) || [];
  assert.equal(matches.length, 1, 'client page should have exactly one button (single CTA)');
});

test('submit-client-decisions handler does not reference internal_decisions', () => {
  const p = path.join(repoRoot, 'lib', 'cmp', 'router.js');
  const chunk = fs.readFileSync(p, 'utf8');
  const start = chunk.indexOf('async function handleSubmitClientDecisions');
  assert.ok(start >= 0);
  const end = chunk.indexOf('async function handleSandboxStart', start);
  assert.ok(end > start);
  const fn = chunk.slice(start, end);
  assert.equal(fn.includes('internal_decisions'), false);
});
