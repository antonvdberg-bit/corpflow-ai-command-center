import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  SKIP_ALREADY_CLAIMED,
  evaluateCodexIssueActivationClaim,
  buildCodexActivationClaim,
  formatCodexActivationClaimComment,
  parseCodexActivationClaimFromText,
} from '../lib/server/codex-activation-claim.js';
import {
  buildCodexCompletionEvent,
  buildCodexLifecycleIdentity,
  extractCodexTaskUrl,
  formatCodexTriggerComment,
  inspectCodexGithubEvidence,
  shouldEmitCodexCompletionEvent,
  shouldNotifyCodexCompletionEvent,
  parseCodexCompletionEventFromText,
  formatCodexCompletionEventComment,
} from '../lib/server/codex-github-lifecycle.js';
import { formatCursorActivationClaimComment, buildCursorActivationClaim } from '../lib/server/cursor-activation-claim.js';

describe('codex-github-lifecycle', () => {
  it('builds durable identity without fabricating a Codex run id', () => {
    const id = buildCodexLifecycleIdentity({
      sourceIssue: 661,
      prNumber: 813,
      attempt: 1,
      triggerCommentId: 5224386180,
    });
    assert.equal(id.identity, 'codex_github|661|813|1|5224386180');
  });

  it('extracts Codex task URL when present', () => {
    const url = extractCodexTaskUrl(
      'done\n\n [View task →](https://chatgpt.com/s/cd_6a76a8ced53c8191adb2891f737d09c1)',
    );
    assert.equal(url, 'https://chatgpt.com/s/cd_6a76a8ced53c8191adb2891f737d09c1');
  });

  it('detects PENDING → RUNNING (eyes) → COMPLETED (official review)', () => {
    const trigger = {
      id: 100,
      user: { login: 'github-actions[bot]' },
      body: '@codex review',
      created_at: '2026-08-08T03:55:49Z',
    };
    const pending = inspectCodexGithubEvidence({
      triggerComment: trigger,
      comments: [trigger],
      reactions: [],
      reviews: [],
      now: new Date('2026-08-08T03:56:00Z'),
    });
    assert.equal(pending.phase, 'PENDING');

    const running = inspectCodexGithubEvidence({
      triggerComment: trigger,
      comments: [trigger],
      reactions: [
        {
          user: { login: 'chatgpt-codex-connector[bot]' },
          content: 'eyes',
          created_at: '2026-08-08T03:56:10Z',
        },
      ],
      reviews: [],
      now: new Date('2026-08-08T03:56:30Z'),
    });
    assert.equal(running.phase, 'RUNNING');
    assert.equal(running.eyesReaction, true);

    const completed = inspectCodexGithubEvidence({
      triggerComment: trigger,
      comments: [
        trigger,
        {
          id: 200,
          user: { login: 'chatgpt-codex-connector[bot]' },
          body: "Codex Review: Didn't find any major issues. :rocket:",
          created_at: '2026-08-08T03:58:52Z',
        },
      ],
      reactions: [
        {
          user: { login: 'chatgpt-codex-connector[bot]' },
          content: 'eyes',
          created_at: '2026-08-08T03:56:10Z',
        },
      ],
      reviews: [],
      headSha: '4eb606ae',
      now: new Date('2026-08-08T03:59:00Z'),
    });
    assert.equal(completed.phase, 'COMPLETED');
    assert.equal(completed.antonRequired, false);
  });

  it('treats connect-prompt as RUNNING (bot path heard) until result', () => {
    const trigger = {
      id: 100,
      user: { login: 'github-actions[bot]' },
      body: '@codex review',
      created_at: '2026-08-08T03:55:49Z',
    };
    const running = inspectCodexGithubEvidence({
      triggerComment: trigger,
      comments: [
        trigger,
        {
          id: 101,
          user: { login: 'chatgpt-codex-connector[bot]' },
          body: 'To use Codex here, create a Codex account and connect to github',
          created_at: '2026-08-08T03:55:56Z',
        },
      ],
      reactions: [],
      reviews: [],
      now: new Date('2026-08-08T03:56:10Z'),
    });
    assert.equal(running.phase, 'RUNNING');
    assert.equal(running.connectPrompt, true);
  });

  it('emits completion event with required fields + silence rules', () => {
    const event = buildCodexCompletionEvent({
      sourceIssue: 661,
      prNumber: 813,
      attempt: 1,
      triggerCommentId: 5224386180,
      codexTaskUrl: 'https://chatgpt.com/s/cd_6a76a8ced53c8191adb2891f737d09c1',
      codexTaskId: 'cd_6a76a8ced53c8191adb2891f737d09c1',
      status: 'COMPLETED',
      headSha: '4eb606ae',
      antonRequired: false,
      nextAction: 'no_action_silent',
    });
    assert.equal(event.schema, 'corpflow.codex_completion_event.v1');
    assert.equal(event.executor, 'codex');
    assert.equal(event.source_issue, 661);
    assert.equal(event.pr, 813);
    assert.equal(event.trigger_comment_id, 5224386180);
    assert.equal(event.anton_required, false);
    assert.equal(shouldNotifyCodexCompletionEvent(event), false);

    const failedEvent = buildCodexCompletionEvent({
      sourceIssue: 661,
      prNumber: 813,
      attempt: 1,
      triggerCommentId: 5224386180,
      status: 'FAILED',
      antonRequired: true,
      blocker: 'x',
    });
    assert.equal(shouldNotifyCodexCompletionEvent(failedEvent), true);

    const text = formatCodexCompletionEventComment(event);
    const parsed = parseCodexCompletionEventFromText(text);
    assert.equal(parsed.fingerprint, event.fingerprint);
    assert.equal(shouldEmitCodexCompletionEvent(null, event.fingerprint, false), true);
    assert.equal(shouldEmitCodexCompletionEvent(event.fingerprint, event.fingerprint, true), false);
  });

  it('does not attribute a later human @codex review to an earlier bot trigger', () => {
    const botTrigger = {
      id: 100,
      user: { login: 'github-actions[bot]' },
      body: '@codex review\nbot',
      created_at: '2026-08-08T03:55:49Z',
    };
    const connect = {
      id: 101,
      user: { login: 'chatgpt-codex-connector[bot]' },
      body: 'To use Codex here, create a Codex account and connect to github',
      created_at: '2026-08-08T03:55:56Z',
    };
    const packet = {
      id: 102,
      user: { login: 'chatgpt-codex-connector[bot]' },
      body:
        'CODEX_PACKET_V1\n\nPurpose: bot path\n\n [View task →](https://chatgpt.com/s/cd_6a76a8ced53c8191adb2891f737d09c1)',
      created_at: '2026-08-08T03:57:02Z',
    };
    const humanTrigger = {
      id: 103,
      user: { login: 'antonvdberg-bit' },
      body: '@codex review\nhuman',
      created_at: '2026-08-08T03:57:06Z',
    };
    const official = {
      id: 104,
      user: { login: 'chatgpt-codex-connector[bot]' },
      body: "Codex Review: Didn't find any major issues.",
      created_at: '2026-08-08T03:58:52Z',
    };
    const botView = inspectCodexGithubEvidence({
      triggerComment: botTrigger,
      comments: [botTrigger, connect, packet, humanTrigger, official],
      reactions: [],
      reviews: [],
      now: new Date('2026-08-08T03:59:00Z'),
    });
    assert.equal(botView.phase, 'COMPLETED');
    assert.equal(botView.resultCommentId, 102);
    assert.equal(botView.codexTaskId, 'cd_6a76a8ced53c8191adb2891f737d09c1');
    assert.equal(botView.connectPrompt, true);

    const humanView = inspectCodexGithubEvidence({
      triggerComment: humanTrigger,
      comments: [botTrigger, connect, packet, humanTrigger, official],
      reactions: [
        {
          user: { login: 'chatgpt-codex-connector[bot]' },
          content: 'eyes',
          created_at: '2026-08-08T03:57:13Z',
        },
      ],
      reviews: [],
      now: new Date('2026-08-08T03:59:00Z'),
    });
    assert.equal(humanView.phase, 'COMPLETED');
    assert.equal(humanView.resultCommentId, 104);
    assert.equal(humanView.eyesReaction, true);
  });

  it('formats bot trigger comment', () => {
    const body = formatCodexTriggerComment({ mode: 'review', sourceIssue: 661, attempt: 1 });
    assert.match(body, /^@codex review/m);
    assert.match(body, /corpflow\.codex_github_trigger\.v1/);
  });
});

describe('codex-activation-claim', () => {
  it('acquires when free; SKIP_ALREADY_CLAIMED when Cursor claimed', () => {
    const free = evaluateCodexIssueActivationClaim({
      issueNumber: 661,
      labels: [],
      comments: [],
    });
    assert.equal(free.decision, 'ACQUIRE');

    const cursorClaim = formatCursorActivationClaimComment(
      buildCursorActivationClaim({
        sourceIssue: 661,
        generation: 1,
        claimToken: 'tok-1',
        status: 'activated',
      }),
    );
    const blocked = evaluateCodexIssueActivationClaim({
      issueNumber: 661,
      labels: ['dispatch:claimed'],
      comments: [{ body: cursorClaim }],
    });
    assert.equal(blocked.decision, SKIP_ALREADY_CLAIMED);

    const own = formatCodexActivationClaimComment(
      buildCodexActivationClaim({
        sourceIssue: 661,
        generation: 1,
        claimToken: 'codex-tok',
        status: 'pending',
        prNumber: 813,
      }),
    );
    const selfBlocked = evaluateCodexIssueActivationClaim({
      issueNumber: 661,
      labels: [],
      comments: [{ body: own }],
    });
    assert.equal(selfBlocked.decision, SKIP_ALREADY_CLAIMED);
    assert.equal(parseCodexActivationClaimFromText(own)?.executor, 'codex');
  });
});
