import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AI_ASK_MIN_RESPONSE_DELAY_MS,
  AI_ASK_MAX_RESPONSE_DELAY_MS,
  AI_ASK_THINKING_MESSAGE,
  computeAiResponseDelayWait,
  isAiResponseDelayDisabled,
  resolveAiResponseDelayMs,
  waitForAiResponseDelay,
} from '../lib/server/chat-widget/retrieval/response-delay.js';

test('thinking message is defined for widget copy', () => {
  assert.match(AI_ASK_THINKING_MESSAGE, /approved church information/i);
});

test('resolveAiResponseDelayMs returns value in 2000–2500 range by default', () => {
  const ms = resolveAiResponseDelayMs({ random: () => 0.5 });
  assert.ok(ms >= AI_ASK_MIN_RESPONSE_DELAY_MS);
  assert.ok(ms <= AI_ASK_MAX_RESPONSE_DELAY_MS);
});

test('resolveAiResponseDelayMs returns 0 when skipDelay', () => {
  assert.equal(resolveAiResponseDelayMs({ skipDelay: true }), 0);
});

test('waitForAiResponseDelay skips sleep when skipDelay (fast tests)', async () => {
  const t0 = Date.now();
  const out = await waitForAiResponseDelay(t0, { skipDelay: true, now: t0 + 5000 });
  assert.equal(out.targetMs, 0);
  assert.equal(out.waitedMs, 0);
  assert.ok(Date.now() - t0 < 50);
});

test('computeAiResponseDelayWait returns remaining time without sleeping', () => {
  const out = computeAiResponseDelayWait(1000, {
    minMs: 2000,
    maxMs: 2000,
    now: 1500,
    random: () => 0,
  });
  assert.equal(out.targetMs, 2000);
  assert.equal(out.remainingMs, 1500);
});

test('isAiResponseDelayDisabled respects env flag', () => {
  const prev = process.env.CORPFLOW_CHAT_WIDGET_AI_DELAY_DISABLED;
  process.env.CORPFLOW_CHAT_WIDGET_AI_DELAY_DISABLED = '1';
  assert.equal(isAiResponseDelayDisabled(), true);
  process.env.CORPFLOW_CHAT_WIDGET_AI_DELAY_DISABLED = prev;
});
