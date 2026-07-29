import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ACTIVE_AGENT_CONTROL_LOOP_SCHEMA,
  DEFAULT_STALE_THRESHOLDS,
  buildRecoveryAction,
  detectReadyNeverActivated,
  evaluateActiveAgentControlLoop,
  isFalseClaimedState,
  isRunStale,
  markFollowUpSent,
  normalizeActiveAgentState,
  runRecordFromCursorOpsStatus,
  runRecordKey,
  upsertRunRecord,
} from '../lib/server/active-agent-control-loop.js';
import {
  buildOperatorDecisionPacket,
  detectCompletionSignals,
  routeReviewOwner,
} from '../lib/server/operator-review-handoff.js';
import {
  buildCodexDispatchTriggerPacket,
  isCodexEligibleRouting,
  validateCodexTriggerPacket,
  wouldConflictWithCursor,
} from '../lib/server/codex-dispatch-adapter.js';
import {
  DEFAULT_COST_LIMITS,
  evaluateActivationCostGate,
  isDuplicateActivation,
  isUrgentBypass,
  normalizeCostUsageState,
  recordActivationUsage,
  shouldHaltLowValue,
} from '../lib/server/agent-cost-controls.js';
import { routingDedupeKey } from '../lib/server/dispatcher-agent-activation.js';

describe('active-agent-control-loop', () => {
  it('detects stale cursor run after threshold', () => {
    const run = runRecordFromCursorOpsStatus({
      activation_status: 'started',
      target_issue: '661',
      started_at: '2026-07-28T00:00:00.000Z',
      last_seen_at: '2026-07-28T00:00:00.000Z',
    });
    assert.ok(run);
    assert.equal(
      isRunStale(run, '2026-07-29T12:00:00.000Z', DEFAULT_STALE_THRESHOLDS),
      true,
    );
  });

  it('does not nag when follow-up already sent without movement', () => {
    const run = {
      provider: 'cursor',
      runId: 'abc',
      issueNumber: 661,
      branch: 'cursor/test',
      prNumber: null,
      prUrl: null,
      startedAt: '2026-07-28T00:00:00.000Z',
      lastMovementAt: '2026-07-28T00:00:00.000Z',
      phase: 'stale',
      workflowRunId: null,
      workflowRunUrl: null,
      followUpSentAt: '2026-07-29T06:00:00.000Z',
      claimedButNoRunId: false,
      disconnectedPr: false,
      notes: null,
    };
    const finding = {
      run,
      kind: 'stale',
      minutesStale: 720,
      reason: 'no movement',
    };
    const action = buildRecoveryAction(finding, run);
    assert.equal(action.action, 'none');
    assert.equal(action.skipBecauseFollowUpAlreadySent, true);
  });

  it('flags false claimed state without run ID', () => {
    const run = {
      provider: 'cursor',
      runId: null,
      issueNumber: 662,
      branch: null,
      prNumber: null,
      prUrl: null,
      startedAt: '2026-07-29T00:00:00.000Z',
      lastMovementAt: '2026-07-29T00:00:00.000Z',
      phase: 'false_claim',
      workflowRunId: null,
      workflowRunUrl: null,
      followUpSentAt: null,
      claimedButNoRunId: true,
      disconnectedPr: false,
      notes: 'claimed without run',
    };
    assert.equal(isFalseClaimedState(run), true);
    const action = buildRecoveryAction(
      { run, kind: 'false_claim', reason: 'no run id' },
      run,
    );
    assert.equal(action.action, 'blocker');
  });

  it('detects ready-never-activated issues', () => {
    const findings = detectReadyNeverActivated(
      [
        {
          number: 663,
          labels: ['dispatch:cursor-ready'],
          createdAt: '2026-07-28T00:00:00.000Z',
          updatedAt: '2026-07-28T00:00:00.000Z',
        },
      ],
      [],
      '2026-07-29T12:00:00.000Z',
    );
    assert.equal(findings.length, 1);
    assert.equal(findings[0].issueNumber, 663);
  });

  it('evaluateActiveAgentControlLoop produces report schema', () => {
    const report = evaluateActiveAgentControlLoop(normalizeActiveAgentState(null), {
      cursorOpsStatuses: [
        {
          activation_status: 'started',
          target_issue: '661',
          cursor_agent_url: 'https://cursor.com/agents/run-661',
          started_at: '2026-07-28T00:00:00.000Z',
          last_seen_at: '2026-07-28T00:00:00.000Z',
        },
      ],
      now: '2026-07-29T12:00:00.000Z',
    });
    assert.equal(report.schema, ACTIVE_AGENT_CONTROL_LOOP_SCHEMA);
    assert.ok(report.summary.findings >= 1);
    assert.ok(report.recoveries.length >= 1);
  });

  it('markFollowUpSent updates state by key', () => {
    const run = runRecordFromCursorOpsStatus({
      activation_status: 'started',
      target_issue: '661',
      cursor_agent_url: 'https://cursor.com/agents/run-661',
      started_at: '2026-07-29T00:00:00.000Z',
      last_seen_at: '2026-07-29T00:00:00.000Z',
    });
    assert.ok(run);
    let state = upsertRunRecord(normalizeActiveAgentState(null), run);
    const key = runRecordKey(run);
    state = markFollowUpSent(state, key, '2026-07-29T06:00:00.000Z');
    const updated = state.runs.find((r) => runRecordKey(r) === key);
    assert.equal(updated?.followUpSentAt, '2026-07-29T06:00:00.000Z');
  });
});

describe('operator-review-handoff', () => {
  it('routes tests_failed to cursor (routine)', () => {
    const signals = detectCompletionSignals({
      run: { issueNumber: 661, prNumber: 100 },
      pr: { number: 100, checksPassing: false },
    });
    const route = routeReviewOwner(signals);
    assert.equal(route.routeOwner, 'cursor');
    assert.equal(route.routineCorrection, true);
    assert.equal(route.antonRequired, false);
  });

  it('routes protected production gate to anton', () => {
    const signals = detectCompletionSignals({
      issue: { number: 661, body: 'Requires production deploy to Vercel' },
    });
    const route = routeReviewOwner(signals);
    assert.equal(route.routeOwner, 'anton');
    assert.equal(route.antonRequired, true);
  });

  it('builds operator decision packet with checklist', () => {
    const signals = detectCompletionSignals({
      issue: {
        number: 661,
        body: 'CURSOR IMPLEMENTATION COMPLETE\nEvidence: smoke passed on preview',
      },
      comments: [{ body: 'CURSOR IMPLEMENTATION COMPLETE' }],
    });
    const packet = buildOperatorDecisionPacket(signals, {
      businessOutcome: 'Control loop hardening',
    });
    assert.equal(packet.schema, 'corpflow.operator_review_handoff.v1');
    assert.ok(packet.checklist.length >= 3);
  });
});

describe('codex-dispatch-adapter', () => {
  const codexRouting = {
    owner: 'codex',
    objectType: 'monitor',
    objectRef: 'erpnext:skipped',
    executorPrompt: 'Research ERPNext integration gap matrix.',
  };

  it('accepts eligible codex routing', () => {
    assert.equal(isCodexEligibleRouting(codexRouting), true);
  });

  it('builds valid trigger packet', () => {
    const result = buildCodexDispatchTriggerPacket(codexRouting, { suffix: '661' });
    assert.equal(result.valid, true);
    assert.ok(result.packet);
    const validation = validateCodexTriggerPacket(result.packet);
    assert.equal(validation.valid, true);
    assert.match(result.packet.branchSuggestion, /^codex\//);
  });

  it('rejects codex when cursor active on same issue', () => {
    assert.equal(
      wouldConflictWithCursor(
        [{ provider: 'cursor', issueNumber: 661, phase: 'running' }],
        { linkedIssue: 661 },
      ),
      true,
    );
    const result = buildCodexDispatchTriggerPacket(
      { ...codexRouting, objectRef: 'issue:661' },
      {
        linkedIssue: 661,
        activeCursorRuns: [{ provider: 'cursor', issueNumber: 661, phase: 'running' }],
      },
    );
    assert.equal(result.valid, false);
  });
});

describe('agent-cost-controls', () => {
  it('blocks duplicate activation within window', () => {
    const key = 'cursor:delivery:ticket-1:warning';
    const state = normalizeCostUsageState({
      date: '2026-07-29',
      entries: [
        {
          provider: 'cursor',
          dedupeKey: key,
          objectRef: 'ticket-1',
          activatedAt: '2026-07-29T10:00:00.000Z',
        },
      ],
      cursorActivations: 1,
      codexTriggers: 0,
    });
    assert.equal(
      isDuplicateActivation(key, state, DEFAULT_COST_LIMITS, '2026-07-29T14:00:00.000Z'),
      true,
    );
  });

  it('allows urgent bypass categories', () => {
    assert.equal(
      isUrgentBypass({ throughput_packet: { allowed_category: 'revenue' } }),
      true,
    );
  });

  it('evaluateActivationCostGate blocks at concurrent limit', () => {
    const activeRuns = [
      { provider: 'cursor', phase: 'running' },
      { provider: 'cursor', phase: 'running' },
    ];
    const gate = evaluateActivationCostGate(
      {
        provider: 'cursor',
        dedupeKey: routingDedupeKey({
          owner: 'cursor',
          objectType: 'delivery',
          objectRef: 'ticket:99',
          severity: 'warning',
        }),
      },
      normalizeCostUsageState(null),
      activeRuns,
    );
    assert.equal(gate.allowed, false);
    assert.match(gate.errors.join(' '), /concurrent limit/);
  });

  it('recordActivationUsage increments daily counter', () => {
    const next = recordActivationUsage(normalizeCostUsageState(null), {
      provider: 'cursor',
      dedupeKey: 'k1',
      objectRef: 'ref',
      category: 'ops-unblocker',
      activatedAt: new Date().toISOString(),
      issueNumber: 661,
    });
    assert.equal(next.cursorActivations, 1);
  });

  it('shouldHaltLowValue at soft threshold', () => {
    const state = normalizeCostUsageState({
      date: usageToday(),
      cursorActivations: 10,
      codexTriggers: 5,
      entries: [],
    });
    assert.equal(shouldHaltLowValue(state), true);
  });
});

function usageToday() {
  return new Date().toISOString().slice(0, 10);
}
