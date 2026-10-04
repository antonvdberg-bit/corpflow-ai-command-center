import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCompletionFingerprint,
  buildCursorCompletionEvent,
  buildCursorHeartbeat,
  buildCursorLifecycleState,
  buildCursorProgressFingerprint,
  buildDeterministicStaleFollowUpPrompt,
  buildReadOnlyRecoveryPlan,
  canAdvanceDependentQueue,
  classifyCursorTerminalOutcome,
  classifyCursorFailure,
  ERPNext_ACTION_RESULT_SCHEMA,
  formatErpNextActionResultComment,
  formatCursorCompletionEventComment,
  formatCursorHeartbeatComment,
  formatCursorLifecycleStateComment,
  normalizeCursorAgentLifecycleStatus,
  parseCursorLifecycleStateFromText,
  runCursorAgentLifecycleTick,
  validateErpNextActionResult,
  shouldEmitCompletionEvent,
  shouldNotifyCursorCompletionEvent,
} from '../lib/server/cursor-agent-lifecycle.js';

describe('cursor-agent-lifecycle', () => {
  const erpNextResult = {
    schema: ERPNext_ACTION_RESULT_SCHEMA,
    source_issue: 1391,
    cursor_agent_id: 'bc-erpnext-00000000-0000-4000-8000-000000000001',
    cursor_run_id: 'run-erpnext-1391',
    action_class: 'supplier_read_back',
    target_doctypes: ['Supplier'],
    records_read: ['SUP-0001'],
    records_created: [],
    records_updated: [],
    before_after_summary: 'Read existing supplier and verified fields.',
    read_back_verified: true,
    docstatus_or_draft_state: 'read_only',
    quotation_or_supplier_identifiers: ['SUP-0001'],
    protected_actions_not_taken: ['no supplier approval', 'no external send'],
    blocker: null,
    final_verdict: 'PASS',
  };

  it('requires business evidence for a completed no-code action', () => {
    const outcome = classifyCursorTerminalOutcome({
      sourceIssue: 1391,
      cursorAgentId: erpNextResult.cursor_agent_id,
      cursorRunId: erpNextResult.cursor_run_id,
      workType: 'ERPNext business action',
      finalResult: 'COMPLETED',
    });
    assert.equal(outcome.verdict, 'COMPLETED_UNVERIFIED');
    assert.equal(outcome.reason, 'missing_business_evidence');
  });

  it('accepts a correlated, read-back-verified ERPNext result without PR/SHA', () => {
    const outcome = classifyCursorTerminalOutcome({
      sourceIssue: 1391,
      cursorAgentId: erpNextResult.cursor_agent_id,
      cursorRunId: erpNextResult.cursor_run_id,
      workType: 'ERPNext business action',
      businessResult: erpNextResult,
    });
    assert.deepEqual(outcome, {
      verdict: 'PASS',
      reason: 'validated_erpnext_action_result',
    });
    assert.equal(validateErpNextActionResult(erpNextResult, { sourceIssue: 1391 }).valid, true);
    assert.equal(canAdvanceDependentQueue({ providerStatus: 'COMPLETED', finalVerdict: 'PASS' }), true);
  });

  it('keeps a code task unverified when branch/PR/SHA evidence is missing', () => {
    const outcome = classifyCursorTerminalOutcome({
      workType: 'implementation',
      finalResult: 'COMPLETED',
      ciResult: 'unknown',
    });
    assert.equal(outcome.verdict, 'COMPLETED_UNVERIFIED');
  });

  it('selects read-only recovery and blocks dependent queue advancement', () => {
    const plan = buildReadOnlyRecoveryPlan({
      sourceIssue: 1392,
      cursorAgentId: 'bc-recovery-00000000-0000-4000-8000-000000000002',
      cursorRunId: 'run-recovery-1392',
    });
    assert.equal(plan.mode, 'read_only');
    assert.equal(plan.duplicate_mutation_blocked, true);
    assert.deepEqual(plan.target_doctypes, ['Lead', 'Opportunity', 'Customer', 'Contact', 'Address', 'Quotation']);
    assert.equal(canAdvanceDependentQueue({
      providerStatus: 'COMPLETED',
      finalVerdict: 'COMPLETED_UNVERIFIED',
    }), false);
  });

  it('formats a source-issue callback with exact agent/run correlation', () => {
    const body = formatErpNextActionResultComment(erpNextResult, {
      sourceIssue: 1391,
      cursorAgentId: erpNextResult.cursor_agent_id,
      cursorRunId: erpNextResult.cursor_run_id,
    });
    assert.match(body, /CURSOR BUSINESS ACTION CALLBACK/);
    assert.match(body, new RegExp(erpNextResult.cursor_agent_id));
    assert.match(body, new RegExp(erpNextResult.cursor_run_id));
    assert.match(body, /corpflow\.erpnext_action_result\.v1/);
  });

  it('does not turn a completed provider run without artifacts into PASS', () => {
    const outcome = classifyCursorTerminalOutcome({
      finalResult: null,
      ciResult: 'unknown',
      workType: 'implementation',
    });
    assert.deepEqual(outcome, {
      verdict: 'COMPLETED_UNVERIFIED',
      reason: 'missing_required_completion_artifacts',
    });
  });

  it('accepts a bounded diagnostic result only when its evidence is preserved', () => {
    const outcome = classifyCursorTerminalOutcome({
      finalResult: 'PASS — verification evidence: observed read-only result',
      workType: 'approved diagnostic',
    });
    assert.equal(outcome.verdict, 'PASS');
    assert.equal(outcome.reason, 'verified_bounded_diagnostic_result');
  });

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

  it('formats a compact observable heartbeat without inventing progress', () => {
    const heartbeat = buildCursorHeartbeat({
      sourceIssue: 1196,
      cursorAgentId: 'bc-heartbeat',
      cursorRunId: 'run-heartbeat',
      phase: 'RUNNING',
      rawStatus: 'IN_PROGRESS',
      lastPolledAt: '2026-09-19T07:30:00.000Z',
    });
    assert.equal(heartbeat.stage, 'Agent running; no branch, PR, or head SHA reported yet');
    assert.equal(heartbeat.next_action, 'Poll this same agent/run again; do not requeue');
    const body = formatCursorHeartbeatComment(heartbeat);
    assert.match(body, /CURSOR HEARTBEAT/);
    assert.match(body, /corpflow\.cursor_heartbeat\.v1/);
    assert.match(body, /no branch, PR, or head SHA reported yet/);
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

  it('records COMPLETED_UNVERIFIED for #1349-shaped completion evidence', async () => {
    const evidence = [];
    const removed = [];
    const done = await runCursorAgentLifecycleTick({
      apiKey: 'test-key',
      agentId: 'bc-no-artifact',
      sourceIssue: 1349,
      fetch: async () => ({
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({
            status: 'COMPLETED',
            agent: { id: 'bc-no-artifact', status: 'COMPLETED' },
            run: { id: 'run-no-artifact', status: 'COMPLETED' },
          });
        },
      }),
      github: {
        async createIssueComment() {},
        async upsertCompactLifecycle(issue, event) {
          evidence.push({ issue, event });
        },
        async removeIssueLabels(issue, labels) {
          removed.push({ issue, labels });
        },
        async addIssueLabels() {},
      },
    });
    assert.equal(done.phase, 'COMPLETED');
    assert.equal(done.event.final_verdict, 'COMPLETED_UNVERIFIED');
    assert.equal(done.state.finalResult, null);
    assert.equal(done.state.finalVerdict, 'COMPLETED_UNVERIFIED');
    assert.equal(evidence[0].event.final_verdict, 'COMPLETED_UNVERIFIED');
    assert.equal(removed.length, 0);
    assert.ok(done.actions.includes('execution_slot_preserved_for_operator_review'));
  });

  it('releases terminal work from ready dispatch until an explicit requeue', async () => {
    const removed = [];
    const github = {
      async createIssueComment() {},
      async findPrForIssue() {
        return {
          number: 9003,
          url: 'https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/9003',
          headSha: 'verified-sha',
          branch: 'cursor/terminal',
        };
      },
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

  it('tick upserts one compact heartbeat while RUNNING', async () => {
    const heartbeats = [];
    const github = {
      async upsertHeartbeat(issue, heartbeat) {
        heartbeats.push({ issue, heartbeat });
      },
      async findPrForIssue() {
        return null;
      },
    };
    const running = await runCursorAgentLifecycleTick({
      apiKey: 'test-key',
      agentId: 'bc-heartbeat-active',
      runId: 'run-heartbeat-active',
      sourceIssue: 1196,
      fetch: async () => ({
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({
            id: 'run-heartbeat-active',
            agentId: 'bc-heartbeat-active',
            status: 'IN_PROGRESS',
          });
        },
      }),
      github,
      startedAt: new Date().toISOString(),
    });
    assert.equal(running.phase, 'RUNNING');
    assert.equal(running.silent, true);
    assert.equal(heartbeats.length, 1);
    assert.equal(heartbeats[0].issue, 1196);
    assert.equal(heartbeats[0].heartbeat.cursor_agent_id, 'bc-heartbeat-active');
    assert.match(heartbeats[0].heartbeat.stage, /no branch, PR, or head SHA reported yet/);
    assert.ok(running.actions.includes('heartbeat_updated'));
  });

  it('publishes validated business evidence back to the source issue', async () => {
    const callbacks = [];
    const result = await runCursorAgentLifecycleTick({
      apiKey: 'test-key',
      agentId: erpNextResult.cursor_agent_id,
      sourceIssue: 1391,
      workType: 'ERPNext business action',
      fetch: async () => ({
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({
            status: 'COMPLETED',
            agent: { id: erpNextResult.cursor_agent_id, status: 'COMPLETED' },
            run: {
              id: erpNextResult.cursor_run_id,
              status: 'COMPLETED',
              businessResult: erpNextResult,
            },
          });
        },
      }),
      github: {
        async createIssueComment() {},
        async publishBusinessActionCallback(issue, body) {
          callbacks.push({ issue, body });
        },
      },
    });
    assert.equal(result.event.final_verdict, 'PASS');
    assert.equal(callbacks.length, 1);
    assert.equal(callbacks[0].issue, 1391);
    assert.match(callbacks[0].body, /run-erpnext-1391/);
    assert.ok(result.actions.includes('business_action_callback_posted'));
  });


  it('uses observable progress fingerprint rather than routine polls for stale timing', async () => {
    const now = new Date('2026-09-19T09:40:00.000Z');
    const lastProgressAt = new Date(now.getTime() - 21 * 60 * 1000).toISOString();
    const progressFingerprint = buildCursorProgressFingerprint({
      cursorAgentId: 'bc-stale-progress',
      cursorRunId: 'run-stale-progress',
      rawStatus: 'IN_PROGRESS',
    });
    const priorState = buildCursorLifecycleState({
      cursorAgentId: 'bc-stale-progress',
      cursorRunId: 'run-stale-progress',
      sourceIssue: 551,
      phase: 'RUNNING',
      startedAt: lastProgressAt,
      lastProgressAt,
      progressFingerprint,
    });
    const removed = [];
    const result = await runCursorAgentLifecycleTick({
      apiKey: 'test-key',
      agentId: 'bc-stale-progress',
      runId: 'run-stale-progress',
      sourceIssue: 551,
      priorState,
      now,
      fetch: async () => ({
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({
            id: 'run-stale-progress',
            agentId: 'bc-stale-progress',
            status: 'IN_PROGRESS',
          });
        },
      }),
      github: {
        async findPrForIssue() { return null; },
        async createIssueComment() {},
        async upsertCompactLifecycle() {},
        async removeIssueLabels(issue, labels) { removed.push({ issue, labels }); },
      },
    });
    assert.equal(result.phase, 'STALE');
    assert.equal(result.followUpSent, false);
    assert.equal(result.classification.requeue, false);
    assert.equal(result.classification.antonRequired, false);
    assert.equal(result.state.lastProgressAt, lastProgressAt);
    assert.ok(result.actions.includes('observable_progress_unchanged'));
    assert.ok(result.actions.includes('stale_slot_preserved'));
    assert.equal(removed.length, 0);
    assert.match(result.event.blocker, /STALE-IN-PROGRESS/);
    assert.match(result.event.next_action, /same Cursor agent\/run; do not requeue/);
  });

  it('resets last_progress_at only when observable evidence changes', async () => {
    const now = new Date('2026-09-19T09:40:00.000Z');
    const oldProgress = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const priorState = buildCursorLifecycleState({
      cursorAgentId: 'bc-progress-change',
      cursorRunId: 'run-progress-change',
      sourceIssue: 551,
      phase: 'RUNNING',
      startedAt: oldProgress,
      lastProgressAt: oldProgress,
      progressFingerprint: buildCursorProgressFingerprint({
        cursorAgentId: 'bc-progress-change',
        cursorRunId: 'run-progress-change',
        rawStatus: 'IN_PROGRESS',
      }),
    });
    const result = await runCursorAgentLifecycleTick({
      apiKey: 'test-key',
      agentId: 'bc-progress-change',
      runId: 'run-progress-change',
      sourceIssue: 551,
      priorState,
      now,
      fetch: async () => ({
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({
            status: 'IN_PROGRESS',
            agent: {
              id: 'bc-progress-change',
              status: 'IN_PROGRESS',
              target: { branchName: 'cursor/551-financial-rail' },
            },
            run: { id: 'run-progress-change', status: 'IN_PROGRESS' },
          });
        },
      }),
      github: {
        async findPrForIssue() { return null; },
        async findPrForBranch() { return null; },
        async upsertHeartbeat() {},
      },
    });
    assert.equal(result.phase, 'RUNNING');
    assert.equal(result.state.lastProgressAt, now.toISOString());
    assert.equal(result.state.branch, 'cursor/551-financial-rail');
    assert.ok(result.actions.includes('observable_progress_changed'));
  });

  it('anchors first progress baseline to original executor start time', async () => {
    const now = new Date('2026-09-19T09:40:00.000Z');
    const startedAt = new Date(now.getTime() - 25 * 60 * 1000).toISOString();
    const priorState = buildCursorLifecycleState({
      cursorAgentId: 'bc-first-baseline',
      cursorRunId: 'run-first-baseline',
      sourceIssue: 551,
      phase: 'PENDING',
      startedAt,
    });
    const result = await runCursorAgentLifecycleTick({
      apiKey: 'test-key',
      agentId: 'bc-first-baseline',
      runId: 'run-first-baseline',
      sourceIssue: 551,
      priorState,
      now,
      fetch: async () => ({
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({
            id: 'run-first-baseline',
            agentId: 'bc-first-baseline',
            status: 'IN_PROGRESS',
          });
        },
      }),
      github: {
        async findPrForIssue() { return null; },
        async createIssueComment() {},
        async upsertCompactLifecycle() {},
      },
    });
    assert.equal(result.phase, 'STALE');
    assert.equal(result.state.lastProgressAt, startedAt);
    assert.ok(result.actions.includes('observable_progress_baseline'));
  });


  it('tick stays notification-silent on RUNNING and emits once on COMPLETED then dedupes', async () => {
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
