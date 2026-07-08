import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  LUX_OWNER_FEEDBACK_ITEMS,
  LUX_OWNER_FEEDBACK_NEXT_SLICE,
  LUX_OWNER_FEEDBACK_QUEUE_META,
  countLuxOwnerFeedbackAwaitingAnton,
  countLuxOwnerFeedbackByStatus,
  luxOwnerFeedbackStatusLabel,
} from '../lib/client/lux-owner-feedback-queue.js';
import { LUX_RECOVERY_ROADMAP_TICKET_ID } from '../lib/cmp/_lib/client-decisions-client.js';

test('lux owner feedback queue: meta and recovery ticket linkage', () => {
  assert.equal(LUX_OWNER_FEEDBACK_QUEUE_META.programmeIssue, '#529');
  assert.equal(LUX_OWNER_FEEDBACK_QUEUE_META.recoveryTicketId, LUX_RECOVERY_ROADMAP_TICKET_ID);
  assert.equal(LUX_OWNER_FEEDBACK_QUEUE_META.operatorControlOnly, true);
  assert.equal(LUX_OWNER_FEEDBACK_QUEUE_META.exactOwnerQuotesFound, true);
});

test('lux owner feedback queue: items have required operator fields', () => {
  assert.ok(LUX_OWNER_FEEDBACK_ITEMS.length >= 8);

  for (const item of LUX_OWNER_FEEDBACK_ITEMS) {
    assert.match(item.id, /^FB-\d{3}$/);
    assert.ok(item.feedback.trim().length > 20);
    assert.ok(['P0', 'P1', 'P2'].includes(item.priority));
    assert.ok(
      ['queued', 'in_progress', 'blocked', 'awaiting_client', 'awaiting_anton', 'responded'].includes(item.status),
    );
    assert.ok(item.affectedSurface.trim());
    assert.ok(item.proposedResponse.trim());
    assert.ok(item.nextVisibleFix.trim());
    assert.equal(typeof item.antonApprovalRequired, 'boolean');
    assert.ok(item.sourceRef.trim());
  }

  const ids = LUX_OWNER_FEEDBACK_ITEMS.map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate feedback ids');
});

test('lux owner feedback queue: P0 trust/delivery items present', () => {
  const p0 = LUX_OWNER_FEEDBACK_ITEMS.filter((x) => x.priority === 'P0');
  assert.ok(p0.length >= 4);

  const feedbackText = LUX_OWNER_FEEDBACK_ITEMS.map((x) => x.feedback).join(' ');
  assert.match(feedbackText, /too slow|at risk|trust/i);
  assert.match(feedbackText, /v1–v14|independently redesigned/i);
});

test('lux owner feedback queue: status counts and anton gate', () => {
  const counts = countLuxOwnerFeedbackByStatus();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  assert.equal(total, LUX_OWNER_FEEDBACK_ITEMS.length);

  const awaitingAnton = countLuxOwnerFeedbackAwaitingAnton();
  assert.ok(awaitingAnton >= 3);
  assert.equal(luxOwnerFeedbackStatusLabel('awaiting_client'), 'Awaiting Jan');
});

test('lux owner feedback queue: next delivery slice', () => {
  assert.equal(LUX_OWNER_FEEDBACK_NEXT_SLICE.length, 3);
  assert.equal(LUX_OWNER_FEEDBACK_NEXT_SLICE[0].hours, '0–2h');
  assert.equal(LUX_OWNER_FEEDBACK_NEXT_SLICE[1].antonGate, true);
});
