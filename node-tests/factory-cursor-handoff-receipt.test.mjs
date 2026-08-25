import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  FACTORY_HANDOFF_RECEIPT_TIMEOUT_MS,
  buildFactoryCursorHandoffReceipt,
  findLatestFactoryCursorHandoffReceipt,
  formatFactoryCursorHandoffReceiptComment,
  parseFactoryCursorHandoffReceiptFromText,
  resolveFactoryCursorHandoffReceipt,
} from '../lib/server/factory-cursor-handoff-receipt.js';

const handedOffAt = '2026-08-25T01:00:00.000Z';

function pendingReceipt() {
  return buildFactoryCursorHandoffReceipt({
    sourceIssue: 1059,
    handoffRunId: '32796606979',
    handedOffAt,
  });
}

describe('Factory Cursor handoff receipt', () => {
  it('records a pending acknowledgement separately from webhook acceptance', () => {
    const receipt = pendingReceipt();
    assert.equal(receipt.state, 'PENDING');
    assert.equal(
      receipt.acknowledgement_deadline_at,
      new Date(Date.parse(handedOffAt) + FACTORY_HANDOFF_RECEIPT_TIMEOUT_MS).toISOString(),
    );
    const parsed = parseFactoryCursorHandoffReceiptFromText(
      formatFactoryCursorHandoffReceiptComment(receipt),
    );
    assert.equal(parsed?.source_issue, 1059);
    assert.equal(parsed?.handoff_run_id, '32796606979');
    assert.equal(parsed?.state, 'PENDING');
  });

  it('does not falsely convert a handoff comment into IN_PROGRESS', () => {
    const receipt = pendingReceipt();
    const result = resolveFactoryCursorHandoffReceipt({
      receipt,
      comments: [
        {
          author: 'github-actions[bot]',
          body: 'CORPFLOW FACTORY HANDOFF\nSelected source issue: #1059',
        },
      ],
      nowIso: '2026-08-25T01:01:00.000Z',
    });
    assert.equal(result.transition, null);
    assert.equal(result.receipt.state, 'PENDING');
  });

  it('promotes a Cursor bot agent acknowledgement to durable IN_PROGRESS evidence', () => {
    const result = resolveFactoryCursorHandoffReceipt({
      receipt: pendingReceipt(),
      comments: [
        {
          author: 'cursor[bot]',
          body: 'Taking a look! https://cursor.com/agents/bc-01234567-89ab-cdef-0123-456789abcdef',
        },
      ],
      nowIso: '2026-08-25T01:01:00.000Z',
    });
    assert.equal(result.transition, 'IN_PROGRESS');
    assert.equal(result.receipt.state, 'IN_PROGRESS');
    assert.equal(result.receipt.cursor_agent_id, 'bc-01234567-89ab-cdef-0123-456789abcdef');
    assert.equal(result.origin?.activationWorkflowRunId, '32796606979');
  });

  it('makes missing Cursor-side evidence explicit after the bounded deadline', () => {
    const result = resolveFactoryCursorHandoffReceipt({
      receipt: pendingReceipt(),
      comments: [],
      nowIso: '2026-08-25T01:06:00.000Z',
    });
    assert.equal(result.transition, 'NOT_RECEIVED');
    assert.equal(result.receipt.state, 'NOT_RECEIVED');
    assert.equal(result.receipt.blocker, 'cursor_ack_timeout_no_agent_or_run_evidence');
  });

  it('preserves explicit Cursor suppression and blocker statements', () => {
    const suppressed = resolveFactoryCursorHandoffReceipt({
      receipt: pendingReceipt(),
      comments: [{ author: 'cursor', body: 'SUPPRESSED: duplicate automation event' }],
      nowIso: '2026-08-25T01:01:00.000Z',
    });
    assert.equal(suppressed.receipt.state, 'SUPPRESSED');

    const blocked = resolveFactoryCursorHandoffReceipt({
      receipt: pendingReceipt(),
      comments: [{ author: 'cursor[bot]', body: 'RECEIVED — BLOCKED: repository access denied' }],
      nowIso: '2026-08-25T01:01:00.000Z',
    });
    assert.equal(blocked.receipt.state, 'BLOCKED');
    assert.equal(blocked.receipt.blocker, 'repository access denied');
  });

  it('uses the newest receipt as the durable current state', () => {
    const pending = formatFactoryCursorHandoffReceiptComment(pendingReceipt());
    const completed = formatFactoryCursorHandoffReceiptComment({
      ...pendingReceipt(),
      state: 'NOT_RECEIVED',
      blocker: 'cursor_ack_timeout_no_agent_or_run_evidence',
    });
    assert.equal(
      findLatestFactoryCursorHandoffReceipt([{ body: pending }, { body: completed }], 1059)?.state,
      'NOT_RECEIVED',
    );
  });
});
