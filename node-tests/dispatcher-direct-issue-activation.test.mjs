import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

import {
  buildDirectIssueActivationReport,
  buildDirectIssueCursorRouting,
  buildDirectIssueExecutorPrompt,
  BUSINESS_OPS_DISPATCHER_SCHEMA,
  DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE,
  DISPATCHER_ACTIVATION_MODE_DRY_RUN,
  DISPATCHER_DIRECT_ISSUE_OBJECT_REF_PREFIX,
  fetchGitHubIssue,
  normalizeDedupeState,
  parseTargetIssueNumber,
  runDispatcherActivation,
  validateDirectIssueActivationContext,
} from '../lib/server/dispatcher-agent-activation.js';

const sample = JSON.parse(
  fs.readFileSync('node-tests/fixtures/business-operations-dispatcher-sample.json', 'utf8'),
);

/** @type {{ number: number, title: string, body: string, html_url: string }} */
const issue553 = {
  number: 553,
  title: 'Cursor spend/value/burn-rate guardrails before unattended scheduled activation',
  body: 'Add guardrails for Cursor Cloud spend before enabling scheduled cursor_live.',
  html_url: 'https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/553',
};

describe('dispatcher direct-issue activation', () => {
  it('parseTargetIssueNumber accepts numeric issue numbers only', () => {
    assert.deepEqual(parseTargetIssueNumber(''), { ok: false, reason: 'blank' });
    assert.deepEqual(parseTargetIssueNumber('553'), { ok: true, issueNumber: 553 });
    assert.deepEqual(parseTargetIssueNumber('abc'), { ok: false, reason: 'invalid_format' });
    assert.deepEqual(parseTargetIssueNumber('553x'), { ok: false, reason: 'invalid_format' });
    assert.deepEqual(parseTargetIssueNumber('0'), { ok: false, reason: 'invalid_range' });
  });

  it('validateDirectIssueActivationContext rejects scheduled runs', () => {
    const result = validateDirectIssueActivationContext({
      targetIssue: '553',
      eventName: 'schedule',
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, 'scheduled_run_forbidden');
    assert.equal(result.issueNumber, 553);
  });

  it('validateDirectIssueActivationContext allows manual workflow_dispatch', () => {
    const result = validateDirectIssueActivationContext({
      targetIssue: '553',
      eventName: 'workflow_dispatch',
    });
    assert.equal(result.allowed, true);
    assert.equal(result.issueNumber, 553);
  });

  it('blank target_issue preserves dispatcher behavior (no direct report)', () => {
    const validation = validateDirectIssueActivationContext({
      targetIssue: '',
      eventName: 'workflow_dispatch',
    });
    assert.equal(validation.allowed, false);
    assert.equal(validation.reason, 'blank');
    assert.equal(sample.routings.length > 0, true);
  });

  it('target_issue=553 builds one cursor candidate with issue context', () => {
    const report = buildDirectIssueActivationReport(issue553);
    assert.equal(report.schema, BUSINESS_OPS_DISPATCHER_SCHEMA);
    assert.equal(report.routings.length, 1);
    assert.equal(report.routings[0].owner, 'cursor');
    assert.equal(
      report.routings[0].objectRef,
      `${DISPATCHER_DIRECT_ISSUE_OBJECT_REF_PREFIX}553`,
    );
    assert.match(report.routings[0].executorPrompt, /GitHub issue #553/);
    assert.ok(report.routings[0].executorPrompt.includes(issue553.title));
    assert.ok(report.routings[0].executorPrompt.includes(issue553.body));
    assert.ok(report.routings[0].executorPrompt.includes(issue553.html_url));
  });

  it('buildDirectIssueExecutorPrompt includes number, URL, title, and body', () => {
    const prompt = buildDirectIssueExecutorPrompt({
      issueNumber: 553,
      url: issue553.html_url,
      title: issue553.title,
      body: issue553.body,
    });
    assert.match(prompt, /#553/);
    assert.ok(prompt.includes(issue553.html_url));
    assert.ok(prompt.includes(issue553.title));
    assert.ok(prompt.includes(issue553.body));
    assert.match(prompt, /Open a PR only/);
  });

  it('invalid target_issue is rejected by validation', () => {
    const result = validateDirectIssueActivationContext({
      targetIssue: 'not-a-number',
      eventName: 'workflow_dispatch',
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, 'invalid_format');
  });

  it('dry_run with direct issue report does not call Cursor API', async () => {
    let calls = 0;
    const fetch = async () => {
      calls += 1;
      throw new Error('should not call Cursor API');
    };

    const report = buildDirectIssueActivationReport(issue553);
    const result = await runDispatcherActivation(report, {
      mode: DISPATCHER_ACTIVATION_MODE_DRY_RUN,
      dedupeState: normalizeDedupeState(null),
      cursorApiKey: 'test-key',
      cursorDeps: { fetch },
      directIssue: true,
    });

    assert.equal(calls, 0);
    assert.equal(result.plan.totals.would_activate, 1);
    assert.equal(result.plan.totals.by_owner.cursor, 1);
    assert.ok(result.decisions.some((d) => d.action === 'WOULD_ACTIVATE_CURSOR_CLOUD_API'));
  });

  it('cursor_live with direct issue #553 calls Cursor API once', async () => {
    let calls = 0;
    const fetch = async (url, init) => {
      calls += 1;
      assert.equal(url, 'https://api.cursor.com/v1/agents');
      assert.equal(init.method, 'POST');
      const body = JSON.parse(String(init.body));
      assert.match(body.prompt.text, /#553/);
      assert.ok(body.prompt.text.includes(issue553.title));
      assert.ok(body.prompt.text.includes(issue553.html_url));
      assert.equal(body.autoCreatePR, true);
      return new Response(
        JSON.stringify({
          agent: { id: 'bc-553', url: 'https://cursor.com/agents/bc-553' },
          run: { id: 'run-553' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const report = buildDirectIssueActivationReport(issue553);
    const result = await runDispatcherActivation(report, {
      mode: DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE,
      dedupeState: normalizeDedupeState(null),
      cursorApiKey: 'sk-test',
      cursorDeps: { fetch },
      directIssue: true,
    });

    assert.equal(calls, 1);
    assert.equal(result.live.cursor?.agentId, 'bc-553');
    assert.equal(result.live.cursor?.objectRef, `${DISPATCHER_DIRECT_ISSUE_OBJECT_REF_PREFIX}553`);
  });

  it('cursor_live still requires CURSOR_API_KEY for direct issue activation', async () => {
    await assert.rejects(
      () =>
        runDispatcherActivation(buildDirectIssueActivationReport(issue553), {
          mode: DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE,
          dedupeState: normalizeDedupeState(null),
          cursorApiKey: '',
          directIssue: true,
        }),
      /CURSOR_API_KEY missing/,
    );
  });

  it('fetchGitHubIssue rejects pull requests', async () => {
    const fetch = async () =>
      new Response(
        JSON.stringify({
          number: 99,
          title: 'PR title',
          pull_request: { url: 'https://api.github.com/repos/o/r/pulls/99' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );

    await assert.rejects(
      () => fetchGitHubIssue(99, { token: 'gh-test', fetch }),
      /pull request/,
    );
  });

  it('buildDirectIssueCursorRouting uses issue link as objectRef anchor', () => {
    const routing = buildDirectIssueCursorRouting(issue553);
    assert.equal(routing.objectType, 'issue');
    assert.equal(routing.link, issue553.html_url);
    assert.equal(routing.gated, false);
  });
});
