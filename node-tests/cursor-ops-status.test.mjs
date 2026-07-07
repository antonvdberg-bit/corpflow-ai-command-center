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
  buildCursorOpsStatus,
  buildCursorOpsStatusFromActivation,
  CURSOR_OPS_STATUS_FILENAME,
  CURSOR_OPS_STALE_AFTER_MINUTES,
  formatCursorOpsStatusComment,
  formatCursorOpsStatusLogBlock,
  redactSecretsFromText,
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

  it('formatCursorOpsStatusLogBlock includes required fields', () => {
    const text = formatCursorOpsStatusLogBlock(
      buildCursorOpsStatus({
        activation_status: 'started',
        target_issue: '553',
        cursor_agent_url: 'https://cursor.com/agents/bc-553',
      }),
    );
    assert.match(text, /CURSOR OPS STATUS/);
    assert.match(text, /activation_status: started/);
    assert.match(text, /target_issue: 553/);
  });

  it('formatCursorOpsStatusComment is safe for GitHub posting', () => {
    const body = formatCursorOpsStatusComment(
      buildCursorOpsStatus({
        activation_status: 'blocked',
        target_issue: '553',
        blocked_reason: 'CURSOR_API_KEY missing',
        need_anton: true,
      }),
    );
    assert.match(body, /Cursor activation status/);
    assert.match(body, /\*\*Status:\*\* blocked/);
    assert.match(body, /\*\*Target issue:\*\* 553/);
  });

  it('summary script reads cursor-ops-status.json', () => {
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
    assert.equal(loaded.artifact_name, 'cursor-ops-status');
  });
});
