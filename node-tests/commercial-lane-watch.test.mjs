import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  AGENT_RELAY_REPOSITORIES,
  clearGithubAppRelayTokenCacheForTests,
} from '../lib/server/github-app-relay.js';
import {
  commercialLaneWatchHandler,
  COMMERCIAL_LANE_WATCH_SCHEMA,
  evaluateCommercialLaneWatch,
} from '../lib/server/commercial-lane-watch.js';

const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const CONFIG = {
  CORPFLOW_AGENT_RELAY_GITHUB_APP_ID: '123456',
  CORPFLOW_AGENT_RELAY_GITHUB_APP_INSTALLATION_ID: '987654',
  CORPFLOW_AGENT_RELAY_GITHUB_APP_PRIVATE_KEY: privateKey.export({ type: 'pkcs8', format: 'pem' }).replace(/\n/g, '\\n'),
  CORPFLOW_AGENT_RELAY_GITHUB_EXPECTED_BOT_LOGIN: 'corpflowai-agent-relay[bot]',
  CORPFLOW_AGENT_RELAY_GITHUB_APP_SLUG: 'corpflowai-agent-relay',
  CORPFLOW_AGENT_RELAY_GITHUB_REPOSITORY_ALLOWLIST: AGENT_RELAY_REPOSITORIES.join(','),
};
const SHA = 'a'.repeat(40);
const NOW = Date.parse('2026-08-26T08:40:00.000Z');
const REPO = AGENT_RELAY_REPOSITORIES[0];

function response(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async json() { return body; },
    async text() { return JSON.stringify(body); },
  };
}

function originComment({ prNumber = 1112, agentId = 'bc-f8f79aa9-04d7-475b-8636-a907770a35a5', runId = 'run-5855bf50-83ad-46eb-9cc8-b030c7de0353' } = {}) {
  return {
    id: 10,
    html_url: 'https://github.test/comment/10',
    user: { login: 'github-actions[bot]', type: 'Bot' },
    created_at: '2026-08-26T08:34:23Z',
    updated_at: '2026-08-26T08:34:23Z',
    body: `CURSOR ORIGIN METADATA\n\nSource issue: #1111\nPR: #${prNumber}\nCursor run ID: ${runId}\nCursor agent ID: ${agentId}\n\n<!-- corpflow.cursor_origin_metadata.v1 {"schema":"corpflow.cursor_origin_metadata.v1","sourceIssue":1111,"activationWorkflowRunId":"32948395998","cursorRunId":"${runId}","cursorAgentId":"${agentId}","cursorAgentUrl":"https://cursor.com/agents/${agentId}","branch":"cursor/factory-handoff-issue-1111-ec18","prNumber":${prNumber},"headSha":"${SHA}","followUpAttemptCount":0,"lastFailureFingerprint":null,"lastFollowUpAt":null,"lastFollowUpRunId":null} -->`,
  };
}

function claimComment({ status = 'activated' } = {}) {
  return {
    id: 9,
    html_url: 'https://github.test/comment/9',
    user: { login: 'github-actions[bot]', type: 'Bot' },
    created_at: '2026-08-26T08:34:17Z',
    updated_at: '2026-08-26T08:34:17Z',
    body: `CURSOR ACTIVATION CLAIM\n\n<!-- corpflow.cursor_activation_claim.v1 {"schema":"corpflow.cursor_activation_claim.v1","sourceIssue":1111,"generation":1,"claimToken":"0d51c509-2c26-456a-850f-9737589ef41e","status":"${status}","agentRunId":"bc-f8f79aa9-04d7-475b-8636-a907770a35a5","claimedAt":"2026-08-26T08:34:17.447Z","workflowRunId":"32948395998"} -->`,
  };
}

function githubState(overrides = {}) {
  return {
    issue: {
      number: 1111,
      title: 'P1 Commercial Lane watch — adopt Agent Relay bounded evidence verification',
      state: 'open',
      html_url: 'https://github.test/issues/1111',
      user: { login: 'antonvdberg-bit', type: 'User' },
      labels: [{ name: 'priority:P1' }, { name: 'dispatch:cursor-claimed' }, { name: 'status:in-progress' }],
      created_at: '2026-08-26T08:34:00Z',
      updated_at: '2026-08-26T08:34:26Z',
      ...overrides.issue,
    },
    comments: overrides.comments || [claimComment(), originComment()],
    pullRequest: {
      number: 1112,
      title: 'feat(factory): Commercial Lane Relay evidence loop',
      state: 'open',
      draft: false,
      merged: false,
      mergeable: true,
      mergeable_state: 'clean',
      html_url: 'https://github.test/pull/1112',
      base: { sha: 'b'.repeat(40) },
      head: { sha: SHA },
      user: { login: 'cursoragent', type: 'Bot' },
      updated_at: '2026-08-26T08:40:00Z',
      ...overrides.pullRequest,
    },
    checkRuns: overrides.checkRuns || [
      { id: 1, name: 'Agent CI', status: 'completed', conclusion: 'success', details_url: 'https://github.test/check/1' },
    ],
    workflowRuns: overrides.workflowRuns || [
      { id: 32948395998, name: 'CorpFlowAI Cursor Factory Handoff', status: 'completed', conclusion: 'success', html_url: 'https://github.test/run/1', head_sha: SHA },
    ],
  };
}

function githubFetchFor(state) {
  return async (url, options = {}) => {
    const path = String(url);
    if (path.includes('/access_tokens')) {
      return response({ token: 'installation-token-that-must-never-escape', expires_at: '2099-08-26T01:00:00.000Z' });
    }
    assert.match(String(options.headers?.Authorization || ''), /Bearer installation-token-that-must-never-escape/);
    if (options.method === 'POST') {
      throw new Error(`unexpected GitHub mutation ${path}`);
    }
    if (/\/issues\/1111$/.test(path) || /\/issues\/35$/.test(path)) return response(state.issue);
    if (/\/issues\/1111\/comments/.test(path) || /\/issues\/35\/comments/.test(path)) return response(state.comments);
    if (/\/pulls\/1112$/.test(path) || /\/pulls\/34$/.test(path)) return response(state.pullRequest);
    if (path.includes('/check-runs')) return response({ check_runs: state.checkRuns });
    if (path.includes('/actions/runs')) return response({ workflow_runs: state.workflowRuns });
    throw new Error(`unexpected GitHub endpoint ${path}`);
  };
}

function watchInput(overrides = {}) {
  return {
    schema: COMMERCIAL_LANE_WATCH_SCHEMA,
    repository: REPO,
    source_issue: 1111,
    pull_request: 1112,
    ...overrides,
  };
}

function fakeResponse() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

async function evaluate(stateOverrides, inputOverrides = {}) {
  clearGithubAppRelayTokenCacheForTests();
  return evaluateCommercialLaneWatch(watchInput(inputOverrides), {
    nowMs: NOW,
    fetchFn: githubFetchFor(githubState(stateOverrides)),
    configOverrides: CONFIG,
  });
}

describe('Commercial Lane watch Relay evidence loop (#1111)', () => {
  it('requests bounded Relay reads and classifies review-ready from GitHub evidence', async () => {
    const snapshot = await evaluate();
    assert.equal(snapshot.repository, REPO);
    assert.equal(snapshot.issue.number, 1111);
    assert.deepEqual(snapshot.issue.labels, ['priority:P1', 'dispatch:cursor-claimed', 'status:in-progress']);
    assert.equal(snapshot.pullRequest.number, 1112);
    assert.equal(snapshot.pullRequest.draft, false);
    assert.equal(snapshot.pullRequest.mergeable, true);
    assert.equal(snapshot.headSha, SHA);
    assert.equal(snapshot.checkRuns.state, 'success');
    assert.equal(snapshot.workflowRuns.state, 'success');
    assert.equal(snapshot.cursor.cursorAgentId, 'bc-f8f79aa9-04d7-475b-8636-a907770a35a5');
    assert.equal(snapshot.cursor.cursorRunId, 'run-5855bf50-83ad-46eb-9cc8-b030c7de0353');
    assert.equal(snapshot.classification, 'REVIEW_READY');
    assert.equal(snapshot.controllerDecision, 'advance');
    assert.equal(snapshot.nextPermittedAction, 'release_execution_wip_merge_review_gate');
    assert.equal(snapshot.provenance.source, 'corpflow.agent_relay.work.v1');
    assert.deepEqual(snapshot.provenance.operations, [
      'issue.get_metadata',
      'issue.list_comments',
      'pull_request.get_metadata',
      'pull_request.get_head',
      'pull_request.list_check_runs',
      'pull_request.list_workflow_runs',
    ]);
    assert.equal(snapshot.commentMarker.used, false);
    assert.equal(snapshot.activationAttempted, false);
    assert.equal(snapshot.statusMutationAttempted, false);
    assert.equal(snapshot.protectedActionTriggered, false);
    assert.doesNotMatch(JSON.stringify(snapshot), /installation-token|BEGIN PRIVATE KEY|Authorization/i);
  });

  it('holds active claimed work and does not redispatch on replay', async () => {
    const first = await evaluate({
      pullRequest: { draft: true, mergeable: false, mergeable_state: 'unstable' },
      checkRuns: [{ id: 1, name: 'Agent CI', status: 'in_progress', conclusion: '', details_url: 'https://github.test/check/1' }],
    });
    const second = await evaluate({
      pullRequest: { draft: true, mergeable: false, mergeable_state: 'unstable' },
      checkRuns: [{ id: 1, name: 'Agent CI', status: 'in_progress', conclusion: '', details_url: 'https://github.test/check/1' }],
    });
    assert.equal(first.classification, 'ACTIVE');
    assert.equal(first.controllerDecision, 'hold');
    assert.equal(first.nextPermittedAction, 'no_duplicate_activation');
    assert.equal(second.fingerprint, first.fingerprint);
    assert.equal(second.activationAttempted, false);
    assert.equal(second.statusMutationAttempted, false);
  });

  it('advances unclaimed eligible work to the existing factory dispatch path without activating', async () => {
    const snapshot = await evaluate({
      issue: {
        labels: [{ name: 'priority:P1' }, { name: 'dispatch:cursor-ready' }],
      },
      comments: [],
    }, { pull_request: null });
    assert.equal(snapshot.classification, 'NO_MOVEMENT');
    assert.equal(snapshot.controllerDecision, 'advance');
    assert.equal(snapshot.nextPermittedAction, 'factory_cursor_handoff_owns_activation');
    assert.equal(snapshot.activationAttempted, false);
    assert.equal(snapshot.cursor.cursorAgentId, null);
  });

  it('rejects agent-reported completion that conflicts with Relay GitHub evidence', async () => {
    const snapshot = await evaluate({
      pullRequest: { draft: true },
      checkRuns: [{ id: 1, name: 'Agent CI', status: 'in_progress', conclusion: '', details_url: 'https://github.test/check/1' }],
    }, {
      agent_report: { status: 'COMPLETED', summary: 'Cursor said the packet is done' },
    });
    assert.equal(snapshot.classification, 'BLOCKED');
    assert.equal(snapshot.controllerDecision, 'block');
    assert.equal(snapshot.blocker, 'agent_report_conflicts_with_relay_github_evidence');
    assert.equal(snapshot.agentReportRejected, true);
  });

  it('records one exact blocker for failed required checks', async () => {
    const snapshot = await evaluate({
      checkRuns: [{ id: 1, name: 'Agent CI', status: 'completed', conclusion: 'failure', details_url: 'https://github.test/check/1' }],
    });
    assert.equal(snapshot.classification, 'BLOCKED');
    assert.equal(snapshot.controllerDecision, 'block');
    assert.equal(snapshot.blocker, 'required_check_failed:Agent CI');
  });

  it('escalates only an exact protected consequence and never triggers it', async () => {
    const snapshot = await evaluate({
      issue: {
        title: 'Deploy to client production now',
        labels: [{ name: 'priority:P0' }],
      },
      comments: [{
        id: 1,
        html_url: 'https://github.test/comment/1',
        user: { login: 'operator', type: 'User' },
        created_at: '2026-08-26T08:00:00Z',
        updated_at: '2026-08-26T08:00:00Z',
        body: 'Requires protected gate: production. Deploy to client production.',
      }],
    });
    assert.equal(snapshot.classification, 'PROTECTED_GATE');
    assert.equal(snapshot.controllerDecision, 'escalate');
    assert.match(snapshot.nextPermittedAction, /^anton_only:/);
    assert.equal(snapshot.protectedActionTriggered, false);
  });

  it('does not reselect terminal/completed work', async () => {
    const snapshot = await evaluate({
      issue: { state: 'closed', labels: [{ name: 'dispatch:operator-review' }] },
      pullRequest: { merged: true, state: 'closed' },
    });
    assert.equal(snapshot.classification, 'TERMINAL');
    assert.equal(snapshot.controllerDecision, 'hold');
    assert.equal(snapshot.nextPermittedAction, 'do_not_reselect');
  });

  it('reuses Relay control-plane auth and rejects protected/unknown operations', async () => {
    const unauthenticated = fakeResponse();
    await commercialLaneWatchHandler({ method: 'POST', body: watchInput(), headers: {} }, unauthenticated, {
      getSession: () => ({ ok: false }),
      verifyCronBearer: () => false,
    });
    assert.equal(unauthenticated.statusCode, 401);

    const authenticated = fakeResponse();
    clearGithubAppRelayTokenCacheForTests();
    await commercialLaneWatchHandler({ method: 'POST', body: watchInput(), headers: {} }, authenticated, {
      nowMs: NOW,
      getSession: () => ({ ok: true, payload: { typ: 'admin' } }),
      verifyCronBearer: () => false,
      fetchFn: githubFetchFor(githubState()),
      configOverrides: CONFIG,
    });
    assert.equal(authenticated.statusCode, 200);
    assert.equal(authenticated.body.ok, true);
    assert.equal(authenticated.body.snapshot.classification, 'REVIEW_READY');

    await assert.rejects(
      () => evaluateCommercialLaneWatch({ ...watchInput(), operation: 'pull_request.merge' }, { nowMs: NOW }),
      /UNKNOWN_WATCH_FIELD/,
    );
    await assert.rejects(
      () => evaluateCommercialLaneWatch({ ...watchInput(), repository: 'evil/repo' }, { nowMs: NOW }),
      /REPOSITORY_NOT_ALLOWED/,
    );
  });

  it('never writes a GitHub comment marker and leaves Rare & Exclusive #35 and Jan mode untouched', async () => {
    const snapshot = await evaluate();
    assert.equal(snapshot.commentMarker.used, false);
    assert.equal(snapshot.commentMarker.reason, 'read_only_snapshot_is_the_controller_handoff');
    assert.ok(!snapshot.provenance.operations.includes('issue.add_comment'));

    const source = readFileSync(new URL('../lib/server/commercial-lane-watch.js', import.meta.url), 'utf8');
    const router = readFileSync(new URL('../api/factory_router.js', import.meta.url), 'utf8');
    assert.match(router, /factory\/commercial-lane\/watch/);
    assert.doesNotMatch(source, /JAN_APPROVAL_MODE\s*=\s*live/);
    assert.doesNotMatch(source, /jan-approval-api/);
    assert.doesNotMatch(source, /issue\.add_comment/);

    clearGithubAppRelayTokenCacheForTests();
    const rare = await evaluateCommercialLaneWatch({
      schema: COMMERCIAL_LANE_WATCH_SCHEMA,
      repository: AGENT_RELAY_REPOSITORIES[1],
      source_issue: 35,
      pull_request: 34,
    }, {
      nowMs: NOW,
      fetchFn: githubFetchFor(githubState({
        issue: { number: 35, title: 'Release blocker', state: 'open', html_url: 'https://github.test/issues/35', user: { login: 'jan', type: 'User' }, labels: [], created_at: '2026-08-01T00:00:00Z', updated_at: '2026-08-01T00:00:00Z' },
        comments: [],
        pullRequest: { number: 34, title: 'Rare PR', state: 'open', draft: true, merged: false, mergeable: null, mergeable_state: 'unknown', html_url: 'https://github.test/pull/34', base: { sha: 'b'.repeat(40) }, head: { sha: SHA }, user: { login: 'jan', type: 'User' }, updated_at: '2026-08-01T00:00:00Z' },
        checkRuns: [],
        workflowRuns: [],
      })),
      configOverrides: CONFIG,
    });
    assert.equal(rare.issue.number, 35);
    assert.equal(rare.statusMutationAttempted, false);
    assert.ok(!rare.provenance.operations.includes('issue.add_comment'));
  });
});
