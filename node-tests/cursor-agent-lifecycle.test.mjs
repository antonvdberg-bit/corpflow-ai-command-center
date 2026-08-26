import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCompletionFingerprint,
  buildCursorCompletionEvent,
  buildCursorLifecycleState,
  buildDeterministicStaleFollowUpPrompt,
  classifyCursorFailure,
  formatCursorCompletionEventComment,
  formatCursorLifecycleStateComment,
  normalizeCursorAgentLifecycleStatus,
  parseCursorLifecycleStateFromText,
  runCursorAgentLifecycleTick,
  shouldEmitCompletionEvent,
  shouldNotifyCursorCompletionEvent,
} from '../lib/server/cursor-agent-lifecycle.js';

describe('cursor-agent-lifecycle', () => {
  it('normalizes CREATING → PENDING and RUNNING → RUNNING', () => {
    assert.equal(
      normalizeCursorAgentLifecycleStatus({ status: 'CREATING' }).phase,
      'PENDING',
    );
    assert.equal(
      normalizeCursorAgentLifecycleStatus({ run: { status: 'RUNNING' } }).phase,
      'RUNNING',
    );
  });

  it('normalizes FINISHED → COMPLETED and ERROR → FAILED', () => {
    assert.equal(
      normalizeCursorAgentLifecycleStatus({ status: 'FINISHED' }).phase,
      'COMPLETED',
    );
    assert.equal(
      normalizeCursorAgentLifecycleStatus({ status: 'ERROR' }).phase,
      'FAILED',
    );
  });

  it('marks STALE when running past threshold without PR', () => {
    const started = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const r = normalizeCursorAgentLifecycleStatus(
      { status: 'RUNNING' },
      { startedAt: started, staleAfterMinutes: 10 },
    );
    assert.equal(r.phase, 'STALE');
  });

  it('treats unknown status with PR as COMPLETED', () => {
    const r = normalizeCursorAgentLifecycleStatus({
      agent: { target: { prUrl: 'https://github.com/o/r/pull/9' }, status: 'weird' },
    });
    assert.equal(r.phase, 'COMPLETED');
  });

  it('dedupes unchanged completion fingerprints', () => {
    const fp = buildCompletionFingerprint({
      cursorAgentId: 'bc-aaa',
      sourceIssue: 1,
      phase: 'COMPLETED',
      prNumber: 2,
      headSha: 'abc',
      branch: 'feat/x',
    });
    assert.equal(shouldEmitCompletionEvent(fp, fp, true), false);
    assert.equal(shouldEmitCompletionEvent(null, fp, false), true);
  });

  it('round-trips lifecycle state comment marker', () => {
    const state = buildCursorLifecycleState({
      cursorAgentId: 'bc-test-agent-id-000000000001',
      sourceIssue: 661,
      phase: 'RUNNING',
      startedAt: '2026-08-07T00:00:00.000Z',
    });
    const body = formatCursorLifecycleStateComment(state);
    const parsed = parseCursorLifecycleStateFromText(body);
    assert.equal(parsed?.cursorAgentId, state.cursorAgentId);
    assert.equal(parsed?.phase, 'RUNNING');
    assert.equal(parsed?.sourceIssue, 661);
  });

  it('classifies rate-limit as recoverable', () => {
    const c = classifyCursorFailure({ errorMessage: 'HTTP 429 rate_limit_exceeded' });
    assert.equal(c.kind, 'recoverable');
    assert.equal(c.requeue, true);
    assert.equal(c.antonRequired, false);
  });

  it('builds completion event with anton_required flag', () => {
    const e = buildCursorCompletionEvent({
      sourceIssue: 99,
      cursorAgentId: 'bc-1',
      status: 'COMPLETED',
      prNumber: 5,
      antonRequired: false,
      whatMoved: 'PR opened',
    });
    assert.equal(e.schema, 'corpflow.cursor_completion_event.v1');
    assert.equal(e.anton_required, false);
    assert.equal(e.notify, false);
    assert.match(formatCursorCompletionEventComment(e), /CURSOR COMPLETION EVENT/);
  });

  it('n8n notify gate: RUNNING silent; COMPLETED+anton yes; FAILED/STALE; dedupe unchanged', () => {
    const running = buildCursorCompletionEvent({
      sourceIssue: 1,
      cursorAgentId: 'bc-r',
      status: 'RUNNING',
      antonRequired: false,
    });
    assert.equal(shouldNotifyCursorCompletionEvent(running), false);

    const completedQuiet = buildCursorCompletionEvent({
      sourceIssue: 1,
      cursorAgentId: 'bc-c',
      status: 'COMPLETED',
      prNumber: 10,
      antonRequired: false,
    });
    assert.equal(shouldNotifyCursorCompletionEvent(completedQuiet), false);

    const completedAnton = buildCursorCompletionEvent({
      sourceIssue: 1,
      cursorAgentId: 'bc-c',
      status: 'COMPLETED',
      prNumber: 10,
      antonRequired: true,
    });
    assert.equal(shouldNotifyCursorCompletionEvent(completedAnton), true);
    assert.equal(
      shouldNotifyCursorCompletionEvent(completedAnton, {
        alreadyNotified: true,
        previousFingerprint: completedAnton.fingerprint,
      }),
      false,
    );

    const failed = buildCursorCompletionEvent({
      sourceIssue: 1,
      cursorAgentId: 'bc-f',
      status: 'FAILED',
      antonRequired: true,
      blocker: 'recovery exhausted',
    });
    assert.equal(failed.notify, true);
    assert.equal(shouldNotifyCursorCompletionEvent(failed), true);

    const stale = buildCursorCompletionEvent({
      sourceIssue: 1,
      cursorAgentId: 'bc-s',
      status: 'STALE',
      antonRequired: true,
    });
    assert.equal(shouldNotifyCursorCompletionEvent(stale), true);
  });

  it('stale follow-up prompt is deterministic and issue-linked', () => {
    const text = buildDeterministicStaleFollowUpPrompt({ sourceIssue: 42 });
    assert.match(text, /#42/);
    assert.match(text, /Do not merge/);
  });

  it('tick completes via GitHub PR presence while Cursor status is ACTIVE', async () => {
    const fetchFn = async () => ({
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({ status: 'ACTIVE', agent: { id: 'bc-2', status: 'ACTIVE' } });
      },
    });
    /** @type {string[]} */
    const comments = [];
    const github = {
      async createIssueComment(_i, body) {
        comments.push(body);
      },
      async findPrForIssue() {
        return {
          number: 9002,
          url: 'https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/9002',
          headSha: 'deadbeef',
          branch: 'cursor/test',
        };
      },
      async getPrChecks() {
        return { conclusion: 'success', summary: 'ok' };
      },
      async addIssueLabels() {},
    };
    const done = await runCursorAgentLifecycleTick({
      apiKey: 'test-key',
      agentId: 'bc-2',
      sourceIssue: 77,
      fetch: fetchFn,
      github,
      startedAt: new Date().toISOString(),
    });
    assert.equal(done.phase, 'COMPLETED');
    assert.equal(done.emittedCompletion, true);
    assert.ok(done.actions.includes('completed_via_pr_presence'));
    assert.ok(comments.some((c) => c.includes('CURSOR COMPLETION EVENT')));
  });

  it('releases terminal work from ready dispatch until an explicit requeue', async () => {
    const removed = [];
    const github = {
      async createIssueComment() {},
      async getPrChecks() {
        return { conclusion: 'success', summary: 'ok' };
      },
      async addIssueLabels() {},
      async removeIssueLabels(issue, labels) {
        removed.push({ issue, labels });
      },
    };
    const done = await runCursorAgentLifecycleTick({
      apiKey: 'test-key',
      agentId: 'bc-terminal',
      sourceIssue: 78,
      fetch: async () => ({
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({
            status: 'FINISHED',
            agent: {
              id: 'bc-terminal',
              status: 'FINISHED',
              target: {
                branchName: 'cursor/terminal',
                prUrl: 'https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/9003',
              },
            },
            run: { id: 'run-terminal', status: 'FINISHED' },
          });
        },
      }),
      github,
    });
    assert.equal(done.phase, 'COMPLETED');
    assert.deepEqual(removed, [
      {
        issue: 78,
        labels: ['dispatch:cursor-claimed', 'status:in-progress', 'dispatch:cursor-ready'],
      },
    ]);
    assert.ok(done.actions.includes('remove_dispatch_ready_label'));
  });

  it('tick stays silent on RUNNING and emits once on COMPLETED then dedupes', async () => {
    let calls = 0;
    const fetchFn = async () => {
      calls += 1;
      const body =
        calls === 1
          ? { status: 'RUNNING', agent: { id: 'bc-1', status: 'RUNNING' } }
          : {
              status: 'FINISHED',
              agent: {
                id: 'bc-1',
                status: 'FINISHED',
                target: {
                  branchName: 'feat/synth',
                  prUrl: 'https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/9001',
                },
              },
              run: { id: 'run-1', status: 'FINISHED' },
            };
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify(body);
        },
      };
    };

    /** @type {string[]} */
    const comments = [];
    const github = {
      async createIssueComment(_issue, body) {
        comments.push(body);
      },
      async getPrChecks() {
        return { conclusion: 'success', summary: 'ok' };
      },
      async addIssueLabels() {},
    };

    const running = await runCursorAgentLifecycleTick({
      apiKey: 'test-key',
      agentId: 'bc-1',
      sourceIssue: 55,
      fetch: fetchFn,
      github,
      startedAt: new Date().toISOString(),
    });
    assert.equal(running.phase, 'RUNNING');
    assert.equal(running.silent, true);
    assert.equal(running.emittedCompletion, false);
    assert.equal(comments.length, 0);

    const done = await runCursorAgentLifecycleTick({
      apiKey: 'test-key',
      agentId: 'bc-1',
      sourceIssue: 55,
      priorState: running.state,
      fetch: fetchFn,
      github,
    });
    assert.equal(done.phase, 'COMPLETED');
    assert.equal(done.emittedCompletion, true);
    assert.ok(comments.some((c) => c.includes('CURSOR COMPLETION EVENT')));
    assert.ok(comments.some((c) => c.includes('Operator decision packet')));

    const again = await runCursorAgentLifecycleTick({
      apiKey: 'test-key',
      agentId: 'bc-1',
      sourceIssue: 55,
      priorState: done.state,
      fetch: fetchFn,
      github,
    });
    assert.equal(again.phase, 'COMPLETED');
    assert.equal(again.emittedCompletion, false);
    assert.ok(again.actions.includes('completion_event_deduped'));
  });
});
