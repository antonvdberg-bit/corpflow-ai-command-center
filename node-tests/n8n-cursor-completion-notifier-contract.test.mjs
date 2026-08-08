/**
 * Local contract mirror for n8n Evaluate Anton-required exceptions
 * (+ corpflow.cursor_completion_event.v1). Does not send Telegram.
 *
 * Run: node --test node-tests/n8n-cursor-completion-notifier-contract.test.mjs
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCursorCompletionEvent,
  shouldNotifyCursorCompletionEvent,
} from '../lib/server/cursor-agent-lifecycle.js';

function evaluateCursorCompletionMatrix(events, priorFingerprints = {}) {
  const seen = { ...priorFingerprints };
  const alerts = [];
  const signals = [];
  for (const event of events) {
    const fp = String(event.fingerprint || '').trim();
    const notify = shouldNotifyCursorCompletionEvent(event, {
      alreadyNotified: Boolean(seen[fp]),
      previousFingerprint: seen[fp] ? fp : null,
    });
    signals.push({ status: event.status, anton_required: event.anton_required, notify, fp });
    if (!notify) continue;
    if (seen[fp]) continue;
    seen[fp] = true;
    alerts.push({
      kind: 'cursor_completion',
      fingerprint: fp,
      status: event.status,
      telegram: true,
    });
  }
  return { alerts, signals, seen };
}

describe('n8n cursor completion notifier contract (#661)', () => {
  it('1 RUNNING → no Telegram', () => {
    const e = buildCursorCompletionEvent({
      sourceIssue: 9001,
      cursorAgentId: 'bc-run',
      status: 'RUNNING',
      antonRequired: false,
    });
    const r = evaluateCursorCompletionMatrix([e]);
    assert.equal(r.alerts.length, 0);
  });

  it('2 COMPLETED + anton_required=false → no Telegram', () => {
    const e = buildCursorCompletionEvent({
      sourceIssue: 9002,
      cursorAgentId: 'bc-done',
      status: 'COMPLETED',
      prNumber: 1,
      antonRequired: false,
    });
    assert.equal(e.notify, false);
    const r = evaluateCursorCompletionMatrix([e]);
    assert.equal(r.alerts.length, 0);
  });

  it('3 COMPLETED + anton_required=true → exactly one Telegram', () => {
    const e = buildCursorCompletionEvent({
      sourceIssue: 9003,
      cursorAgentId: 'bc-anton',
      status: 'COMPLETED',
      prNumber: 2,
      antonRequired: true,
      nextAction: 'Review PR',
    });
    const r = evaluateCursorCompletionMatrix([e]);
    assert.equal(r.alerts.length, 1);
  });

  it('4 replay exact same event → no second Telegram', () => {
    const e = buildCursorCompletionEvent({
      sourceIssue: 9003,
      cursorAgentId: 'bc-anton',
      status: 'COMPLETED',
      prNumber: 2,
      headSha: 'abc',
      antonRequired: true,
    });
    const first = evaluateCursorCompletionMatrix([e]);
    const second = evaluateCursorCompletionMatrix([e], first.seen);
    assert.equal(first.alerts.length, 1);
    assert.equal(second.alerts.length, 0);
  });

  it('5 FAILED + recovery exhausted → exactly one Telegram', () => {
    const e = buildCursorCompletionEvent({
      sourceIssue: 9005,
      cursorAgentId: 'bc-fail',
      status: 'FAILED',
      antonRequired: true,
      blocker: 'recovery exhausted',
    });
    assert.equal(e.notify, true);
    const r = evaluateCursorCompletionMatrix([e]);
    assert.equal(r.alerts.length, 1);
  });

  it('6 STALE + recovery exhausted → exactly one Telegram', () => {
    const e = buildCursorCompletionEvent({
      sourceIssue: 9006,
      cursorAgentId: 'bc-stale',
      status: 'STALE',
      antonRequired: true,
      blocker: 'follow-up failed',
    });
    const r = evaluateCursorCompletionMatrix([e]);
    assert.equal(r.alerts.length, 1);
  });

  it('7 changed PR/SHA fingerprint → one new notification when Anton required', () => {
    const a = buildCursorCompletionEvent({
      sourceIssue: 9007,
      cursorAgentId: 'bc-chg',
      status: 'COMPLETED',
      prNumber: 10,
      headSha: 'sha1',
      antonRequired: true,
    });
    const b = buildCursorCompletionEvent({
      sourceIssue: 9007,
      cursorAgentId: 'bc-chg',
      status: 'COMPLETED',
      prNumber: 11,
      headSha: 'sha2',
      antonRequired: true,
    });
    const first = evaluateCursorCompletionMatrix([a]);
    const second = evaluateCursorCompletionMatrix([b], first.seen);
    assert.equal(first.alerts.length, 1);
    assert.equal(second.alerts.length, 1);
    assert.notEqual(a.fingerprint, b.fingerprint);
  });
});
