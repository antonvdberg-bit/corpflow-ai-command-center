import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatCursorActivationClaimComment } from '../lib/server/cursor-activation-claim.js';
import {
  SKIP_ALREADY_CLAIMED,
  buildCodexCompletionEvent,
  buildCodexLifecycleState,
  buildRecommendedCodexComment,
  detectCodexAcknowledgement,
  detectCodexCompletion,
  detectHumanCodexTriggerComment,
  evaluateCodexClaimGate,
  formatCodexCompletionEventComment,
  formatCodexLifecycleStateComment,
  parseCodexLifecycleStateFromText,
  prepareCodexSpecialistPacket,
  runCodexSpecialistLifecycleTick,
  shouldEmitCodexCompletionEvent,
  shouldNotifyCodexCompletionEvent,
} from '../lib/server/codex-specialist-lifecycle.js';

describe('codex-specialist-lifecycle', () => {
  it('builds @codex recommended comment', () => {
    assert.equal(buildRecommendedCodexComment('review'), '@codex review');
    assert.equal(buildRecommendedCodexComment('@codex review'), '@codex review');
    assert.match(buildRecommendedCodexComment('fix the marker only'), /^@codex /);
  });

  it('SKIP_ALREADY_CLAIMED when Cursor owns the issue', () => {
    const claimBody = formatCursorActivationClaimComment({
      sourceIssue: 661,
      generation: 1,
      claimToken: 'tok',
      status: 'activated',
      agentRunId: 'bc-1',
      claimedAt: '2026-08-08T00:00:00.000Z',
    });
    const gate = evaluateCodexClaimGate({
      issueNumber: 661,
      labels: ['dispatch:cursor-claimed'],
      comments: [{ body: claimBody }],
    });
    assert.equal(gate.decision, SKIP_ALREADY_CLAIMED);
    assert.equal(gate.blockingExecutor, 'cursor');
  });

  it('prepares AWAITING_HUMAN_TRIGGER packet once', () => {
    const prep = prepareCodexSpecialistPacket({
      issueNumber: 661,
      prNumber: 813,
      instruction: 'review',
      purpose: 'synthetic specialist proof',
      prUrl: 'https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/813',
      comments: [],
      nowIso: '2026-08-08T04:00:00.000Z',
    });
    assert.equal(prep.ok, true);
    assert.equal(prep.state.phase, 'AWAITING_HUMAN_TRIGGER');
    assert.match(prep.comments.trigger, /CODEX TRIGGER REQUIRED/);
    assert.equal(prep.awaitEvent.status, 'AWAITING_HUMAN_TRIGGER');
    assert.equal(prep.awaitEvent.anton_required, true);
    assert.equal(shouldNotifyCodexCompletionEvent(prep.awaitEvent), true);
  });

  it('detects human @codex and ignores github-actions bot', () => {
    const human = detectHumanCodexTriggerComment(
      [
        {
          id: 1,
          user: { login: 'github-actions[bot]', type: 'Bot' },
          body: '@codex review',
          created_at: '2026-08-08T03:55:49Z',
        },
        {
          id: 2,
          user: { login: 'antonvdberg-bit', type: 'User' },
          body: '@codex review\n\nHUMAN CONTROL',
          created_at: '2026-08-08T03:57:06Z',
        },
      ],
      { afterIso: '2026-08-08T03:56:00Z' },
    );
    assert.equal(human?.id, 2);
  });

  it('RUNNING on eyes reaction; COMPLETED on Codex Review comment; dedupe second poll', () => {
    const awaiting = buildCodexLifecycleState({
      sourceIssue: 661,
      prNumber: 813,
      attempt: 1,
      phase: 'AWAITING_HUMAN_TRIGGER',
      awaitingSince: '2026-08-08T03:56:00.000Z',
      startedAt: '2026-08-08T03:56:00.000Z',
      triggerNotificationEmitted: true,
    });

    const prComments = [
      {
        id: 5224390944,
        user: { login: 'antonvdberg-bit', type: 'User' },
        body: '@codex review\n\nHUMAN',
        created_at: '2026-08-08T03:57:06Z',
      },
      {
        id: 5224396609,
        user: { login: 'chatgpt-codex-connector[bot]', type: 'Bot' },
        body: 'Codex Review: Didn\'t find any major issues.\n\n**Reviewed commit:** `4eb606ae67`',
        created_at: '2026-08-08T03:58:52Z',
      },
    ];

    const runningOnly = runCodexSpecialistLifecycleTick({
      priorState: awaiting,
      prComments: [prComments[0]],
      triggerReactions: [
        { user: { login: 'chatgpt-codex-connector[bot]' }, content: 'eyes' },
      ],
      now: new Date('2026-08-08T03:57:20.000Z'),
    });
    assert.equal(runningOnly.phase, 'RUNNING');
    assert.equal(runningOnly.silent, true);
    assert.equal(runningOnly.emittedCompletion, false);

    const done = runCodexSpecialistLifecycleTick({
      priorState: runningOnly.state,
      prComments,
      triggerReactions: [
        { user: { login: 'chatgpt-codex-connector[bot]' }, content: 'eyes' },
      ],
      headSha: '4eb606ae67',
      checkState: 'success',
      now: new Date('2026-08-08T03:59:00.000Z'),
    });
    assert.equal(done.phase, 'COMPLETED');
    assert.equal(done.emittedCompletion, true);
    assert.equal(done.event?.schema, 'corpflow.codex_completion_event.v1');
    assert.equal(done.event?.anton_required, false);
    assert.equal(shouldNotifyCodexCompletionEvent(done.event), false);

    const again = runCodexSpecialistLifecycleTick({
      priorState: done.state,
      prComments,
      triggerReactions: [
        { user: { login: 'chatgpt-codex-connector[bot]' }, content: 'eyes' },
      ],
      headSha: '4eb606ae67',
      checkState: 'success',
      now: new Date('2026-08-08T04:00:00.000Z'),
    });
    assert.equal(again.deduped, true);
    assert.equal(again.emittedCompletion, false);
    assert.equal(
      shouldEmitCodexCompletionEvent(done.state.completion_fingerprint, done.event.fingerprint, true),
      false,
    );
  });

  it('ack detection rejects connector setup prompt', () => {
    const ack = detectCodexAcknowledgement({
      triggerCommentId: 1,
      triggerCreatedAt: '2026-08-08T03:55:49Z',
      prComments: [
        {
          id: 2,
          user: { login: 'chatgpt-codex-connector[bot]' },
          body: 'To use Codex here, create a Codex account and connect to github',
          created_at: '2026-08-08T03:55:56Z',
        },
      ],
    });
    assert.equal(ack.acknowledged, false);
    assert.equal(ack.kind, 'setup_prompt');
  });

  it('detects review completion from connector comment', () => {
    const c = detectCodexCompletion({
      mode: 'review',
      triggerCreatedAt: '2026-08-08T03:57:06Z',
      triggerCommentId: 10,
      prComments: [
        {
          id: 11,
          user: { login: 'chatgpt-codex-connector[bot]' },
          body: 'Codex Review: clean\n\n**Reviewed commit:** `abc1234`',
          created_at: '2026-08-08T03:58:00Z',
        },
      ],
    });
    assert.equal(c.completed, true);
    assert.equal(c.headSha, 'abc1234');
  });

  it('round-trips lifecycle state marker', () => {
    const state = buildCodexLifecycleState({
      sourceIssue: 661,
      prNumber: 813,
      attempt: 2,
      phase: 'RUNNING',
      humanTriggerCommentId: 5224390944,
    });
    const parsed = parseCodexLifecycleStateFromText(formatCodexLifecycleStateComment(state));
    assert.equal(parsed?.phase, 'RUNNING');
    assert.equal(parsed?.human_trigger_comment_id, 5224390944);
  });

  it('formats completion event marker', () => {
    const e = buildCodexCompletionEvent({
      sourceIssue: 661,
      prNumber: 813,
      attempt: 1,
      humanTriggerCommentId: 99,
      status: 'COMPLETED',
      headSha: 'deadbeef',
      antonRequired: false,
    });
    assert.match(formatCodexCompletionEventComment(e), /corpflow\.codex_completion_event\.v1/);
  });

  it('does not regress from RUNNING to AWAITING when eyes reaction clears', () => {
    const running = buildCodexLifecycleState({
      sourceIssue: 661,
      prNumber: 813,
      attempt: 1,
      phase: 'RUNNING',
      humanTriggerCommentId: 99,
      awaitingSince: '2026-08-08T03:56:00.000Z',
      runningSince: '2026-08-08T03:57:20.000Z',
      startedAt: '2026-08-08T03:56:00.000Z',
    });
    const tick = runCodexSpecialistLifecycleTick({
      priorState: running,
      prComments: [
        {
          id: 99,
          user: { login: 'antonvdberg-bit', type: 'User' },
          body: '@codex review',
          created_at: '2026-08-08T03:57:06Z',
        },
      ],
      triggerReactions: [],
      now: new Date('2026-08-08T03:58:00.000Z'),
    });
    assert.equal(tick.phase, 'RUNNING');
  });
});
