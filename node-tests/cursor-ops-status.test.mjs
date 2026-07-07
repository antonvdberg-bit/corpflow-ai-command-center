import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  extractCursorGitDetails,
  parsePrNumberFromUrl,
} from '../lib/server/cursor-cloud-agent-client.js';
import {
  applyStaleRuleToStatus,
  assertStrictTargetIssueObservabilityPrerequisites,
  buildCursorOpsStatus,
  buildCursorOpsStatusFromActivation,
  buildObservabilityFailedStatus,
  createEmptyObservability,
  CURSOR_OPS_STATUS_FILENAME,
  CURSOR_OPS_STALE_AFTER_MINUTES,
  DISPATCHER_ACTIVATION_RESULT_ARTIFACT_NAME,
  formatCursorActivationFinishedComment,
  formatCursorActivationStartedComment,
  formatCursorOpsStatusLogBlock,
  postCursorActivationStartedComment,
  postGitHubIssueComment,
  redactSecretsFromText,
  requiresStrictTargetIssueObservability,
  sanitizeCursorOpsStatus,
} from '../lib/server/cursor-ops-status.js';
import {
  DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE,
  DISPATCHER_ACTIVATION_MODE_DRY_RUN,
  runDispatcherActivation,
} from '../lib/server/dispatcher-agent-activation.js';

/** @type {import('../lib/server/business-operations-dispatcher.js').BusinessOpsRouting} */
function issue553Routing() {
  return {
    owner: 'cursor',
    severity: 'info',
    source: 'corpflowai',
    objectType: 'issue',
    objectRef: 'issue:553',
    gated: false,
    reason: 'Manual direct-issue Cursor activation for GitHub issue #553.',
    recommendedNextAction: 'Open PR only',
    executorPrompt: 'GitHub issue #553: Cursor spend guardrails',
    antonNeeded: false,
    safeToIgnore: false,
    link: 'https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/553',
  };
}

describe('cursor-ops-status', () => {
  it('extractCursorGitDetails reads agent URL, branch, and PR from API response', () => {
    const details = extractCursorGitDetails({
      agent: {
        id: 'bc-553',
        url: 'https://cursor.com/agents/bc-553',
        target: { branchName: 'cursor/guardrails-553' },
      },
      run: {
        id: 'run-553',
        git: {
          branches: [
            {
              branch: 'cursor/guardrails-553',
              prUrl: 'https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/556',
            },
          ],
        },
      },
    });

    assert.equal(details.agentUrl, 'https://cursor.com/agents/bc-553');
    assert.equal(details.branch, 'cursor/guardrails-553');
    assert.equal(details.prNumber, '556');
    assert.equal(
      details.prUrl,
      'https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/556',
    );
  });

  it('parsePrNumberFromUrl extracts pull number', () => {
    assert.equal(
      parsePrNumberFromUrl('https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/556'),
      556,
    );
  });

  it('requiresStrictTargetIssueObservability is true for manual target_issue only', () => {
    assert.equal(
      requiresStrictTargetIssueObservability({
        eventName: 'workflow_dispatch',
        targetIssue: '553',
      }),
      true,
    );
    assert.equal(
      requiresStrictTargetIssueObservability({ eventName: 'schedule', targetIssue: '553' }),
      false,
    );
    assert.equal(
      requiresStrictTargetIssueObservability({ eventName: 'workflow_dispatch', targetIssue: '' }),
      false,
    );
  });

  it('STARTED comment body includes target_issue, workflow_run_url, activation_mode, commit SHA', () => {
    const body = formatCursorActivationStartedComment({
      targetIssue: '553',
      activationMode: 'cursor_live',
      workflowRunId: '28830123456',
      workflowRunUrl:
        'https://github.com/antonvdberg-bit/corpflow-ai-command-center/actions/runs/28830123456',
      commitSha: '4c651fc2abc',
    });
    assert.match(body, /Cursor activation started/);
    assert.match(body, /started_preflight/);
    assert.match(body, /target_issue:\*\* 553/);
    assert.match(body, /activation_mode:\*\* cursor_live/);
    assert.match(body, /28830123456/);
    assert.match(body, /4c651fc2abc/);
    assert.match(body, /dispatcher-activation-result/);
  });

  it('FINISHED comment body includes activation_status, agent URL, PR, blocked_reason, need_anton', () => {
    const body = formatCursorActivationFinishedComment(
      buildCursorOpsStatus({
        activation_status: 'blocked',
        target_issue: '553',
        cursor_agent_url: 'https://cursor.com/agents/bc-553',
        pr_url: 'https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/560',
        pr_number: '560',
        blocked_reason: 'CURSOR_API_KEY missing',
        need_anton: true,
        workflow_run_url:
          'https://github.com/antonvdberg-bit/corpflow-ai-command-center/actions/runs/1',
      }),
    );
    assert.match(body, /Cursor activation finished/);
    assert.match(body, /activation_status:\*\* blocked/);
    assert.match(body, /cursor_agent_url:\*\* https:\/\/cursor.com\/agents\/bc-553/);
    assert.match(body, /pull\/560/);
    assert.match(body, /CURSOR_API_KEY missing/);
    assert.match(body, /need_anton:\*\* yes/);
  });

  it('missing GITHUB_TOKEN for manual target_issue fails prerequisites', () => {
    assert.throws(
      () =>
        assertStrictTargetIssueObservabilityPrerequisites({
          eventName: 'workflow_dispatch',
          targetIssue: '553',
          githubToken: '',
        }),
      /GITHUB_TOKEN missing/,
    );
  });

  it('STARTED comment post failure throws for manual target_issue', async () => {
    const fetch = async () =>
      new Response(JSON.stringify({ message: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });

    await assert.rejects(
      () =>
        postCursorActivationStartedComment(
          {
            targetIssue: '553',
            activationMode: 'cursor_live',
            workflowRunId: '1',
            workflowRunUrl: 'https://github.com/o/r/actions/runs/1',
            commitSha: 'abc',
          },
          { token: 'gh-test', repoFullName: 'antonvdberg-bit/corpflow-ai-command-center', fetch },
        ),
      /GitHub comment HTTP 403/,
    );
  });

  it('observability_failed status includes observability block', () => {
    const obs = createEmptyObservability('553');
    const status = buildObservabilityFailedStatus(
      buildCursorOpsStatus({ target_issue: '553', activation_status: 'started' }),
      new Error('FINISHED comment failed'),
      obs,
    );
    assert.equal(status.activation_status, 'observability_failed');
    assert.equal(status.observability.observability_failed, true);
    assert.match(status.observability.observability_error || '', /FINISHED comment failed/);
    assert.equal(status.observability.comment_issue, '553');
  });

  it('postGitHubIssueComment never includes token in thrown error body', async () => {
    const secret = 'ghp_super_secret_test_token_abcdef';
    const fetch = async (_url, init) => {
      assert.equal(String(init.headers?.Authorization).includes(secret), true);
      return new Response('bad', { status: 401 });
    };
    await assert.rejects(
      () =>
        postGitHubIssueComment(553, 'test', {
          token: secret,
          repoFullName: 'antonvdberg-bit/corpflow-ai-command-center',
          fetch,
        }),
      (err) => {
        assert.equal(String(err.message).includes(secret), false);
        return true;
      },
    );
  });

  it('dry_run writes skipped status', () => {
    const status = buildCursorOpsStatusFromActivation(DISPATCHER_ACTIVATION_MODE_DRY_RUN, {
      mode: DISPATCHER_ACTIVATION_MODE_DRY_RUN,
      decisions: [{ action: 'WOULD_ACTIVATE_CURSOR_CLOUD_API', objectRef: 'issue:553' }],
      live: { cursor: null },
    }, {
      targetIssue: '553',
      workflow: { runId: '12345', jobId: 'activate' },
    });

    assert.equal(status.activation_status, 'skipped');
    assert.equal(status.target_issue, '553');
    assert.match(status.notes || '', /dry_run/i);
    assert.equal(status.need_anton, false);
  });

  it('cursor_live missing CURSOR_API_KEY writes blocked status', () => {
    const status = buildCursorOpsStatusFromActivation(
      DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE,
      null,
      {
        targetIssue: '553',
        error: new Error('CURSOR_API_KEY missing — live Cursor activation disabled (fail closed)'),
      },
    );

    assert.equal(status.activation_status, 'blocked');
    assert.match(status.blocked_reason || '', /CURSOR_API_KEY missing/);
    assert.equal(status.need_anton, true);
    assert.equal(status.target_issue, '553');
  });

  it('cursor_live throughput packet rejection writes blocked status', () => {
    const status = buildCursorOpsStatusFromActivation(
      DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE,
      {
        decisions: [
          {
            owner: 'cursor',
            objectRef: 'ticket:low-value-doc',
            action: 'SKIP_THROUGHPUT_PACKET',
          },
        ],
        live: { cursor: null },
      },
      { workflow: { runId: '999', jobId: 'activate' } },
    );

    assert.equal(status.activation_status, 'blocked');
    assert.match(status.blocked_reason || '', /SKIP_THROUGHPUT_PACKET/);
    assert.equal(status.need_anton, true);
  });

  it('started live activation without PR sets next_check_after_minutes', async () => {
    const fetch = async () =>
      new Response(
        JSON.stringify({
          agent: { id: 'bc-553', url: 'https://cursor.com/agents/bc-553' },
          run: { id: 'run-553' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );

    const result = await runDispatcherActivation(
      { routings: [issue553Routing()] },
      {
        mode: DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE,
        cursorApiKey: 'sk-test',
        cursorDeps: { fetch },
        directIssue: true,
      },
    );

    const status = buildCursorOpsStatusFromActivation(
      DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE,
      result,
      { targetIssue: '553', workflow: { runId: '999', jobId: 'activate' } },
    );

    assert.equal(status.activation_status, 'started');
    assert.equal(status.cursor_agent_url, 'https://cursor.com/agents/bc-553');
    assert.equal(status.target_issue, '553');
    assert.equal(status.pr_url, null);
    assert.equal(status.next_check_after_minutes, CURSOR_OPS_STALE_AFTER_MINUTES);
  });

  it('pr_opened when Cursor response includes PR URL', async () => {
    const fetch = async () =>
      new Response(
        JSON.stringify({
          agent: { id: 'bc-553', url: 'https://cursor.com/agents/bc-553' },
          run: {
            id: 'run-553',
            git: {
              branches: [
                {
                  prUrl: 'https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/556',
                },
              ],
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );

    const result = await runDispatcherActivation(
      { routings: [issue553Routing()] },
      {
        mode: DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE,
        cursorApiKey: 'sk-test',
        cursorDeps: { fetch },
        directIssue: true,
      },
    );

    const status = buildCursorOpsStatusFromActivation(
      DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE,
      result,
      { targetIssue: '553' },
    );

    assert.equal(status.activation_status, 'pr_opened');
    assert.equal(status.pr_number, '556');
    assert.match(status.pr_url || '', /\/pull\/556/);
  });

  it('applyStaleRuleToStatus marks started activations stale after 10 minutes', () => {
    const startedAt = new Date(Date.now() - 11 * 60 * 1000).toISOString();
    const status = buildCursorOpsStatus({
      activation_status: 'started',
      started_at: startedAt,
      pr_url: null,
      target_issue: '553',
    });

    const stale = applyStaleRuleToStatus(status);
    assert.equal(stale.activation_status, 'stale_pending_review');
    assert.equal(stale.need_anton, true);
  });

  it('no secrets are written into status', () => {
    const secret = 'sk-super-secret-test-key-abcdef';
    const status = sanitizeCursorOpsStatus(
      buildCursorOpsStatus({
        activation_status: 'failed',
        blocked_reason: `Cursor API failed with ${secret}`,
        notes: `Bearer ${secret}`,
      }),
    );

    const json = JSON.stringify(status);
    assert.equal(json.includes(secret), false);
    assert.match(json, /\[REDACTED\]/);
    assert.equal(redactSecretsFromText(`token ${secret}`).includes(secret), false);
  });

  it('formatCursorOpsStatusLogBlock includes observability flags', () => {
    const text = formatCursorOpsStatusLogBlock(
      buildCursorOpsStatus({
        activation_status: 'started',
        target_issue: '553',
        cursor_agent_url: 'https://cursor.com/agents/bc-553',
        observability: {
          started_comment_posted: true,
          finished_comment_posted: false,
          comment_issue: '553',
          observability_failed: false,
          observability_error: null,
        },
      }),
    );
    assert.match(text, /CURSOR OPS STATUS/);
    assert.match(text, /activation_status: started/);
    assert.match(text, /target_issue: 553/);
    assert.match(text, /observability.started_comment_posted: true/);
  });

  it('summary artifact name is dispatcher-activation-result', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-ops-status-'));
    const filePath = path.join(dir, CURSOR_OPS_STATUS_FILENAME);
    const status = buildCursorOpsStatus({
      activation_status: 'started',
      target_issue: '553',
    });
    fs.writeFileSync(filePath, `${JSON.stringify(status, null, 2)}\n`);

    const loaded = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.equal(loaded.activation_status, 'started');
    assert.equal(loaded.target_issue, '553');
    assert.equal(loaded.artifact_name, DISPATCHER_ACTIVATION_RESULT_ARTIFACT_NAME);
  });
});
