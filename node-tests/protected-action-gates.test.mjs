import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildProtectedApprovalMarker,
  formatProtectedApprovalMarkdown,
  LABEL_NEEDS_ANTON,
} from '../lib/server/anton-decision-inbox.js';
import {
  evaluateAgentAutoMergeGate,
  evaluateUntrustedPrSecretsIsolation,
  formatGateBlockMessage,
  gateProtectedAction,
  isAgentBranch,
} from '../lib/server/protected-action-gates.js';

describe('protected-action-gates / agent auto-merge', () => {
  it('identifies agent branches', () => {
    assert.equal(isAgentBranch('cursor/dispatcher-issue-676-bfc7'), true);
    assert.equal(isAgentBranch('codex/feat-x'), true);
    assert.equal(isAgentBranch('cmp/ticket1'), false);
    assert.equal(isAgentBranch('feat/human'), false);
  });

  it('blocks agent PR auto-merge always', () => {
    const r = evaluateAgentAutoMergeGate({
      headBranch: 'cursor/foo',
      labels: ['client-approved'],
      cmpAutoMergeEnabled: true,
      workflowConclusion: 'success',
    });
    assert.equal(r.allowed, false);
    assert.match(r.reason, /cannot auto-merge/i);
  });

  it('blocks CMP auto-merge when needs:anton is present', () => {
    const r = evaluateAgentAutoMergeGate({
      headBranch: 'cmp/abc',
      labels: ['client-approved', LABEL_NEEDS_ANTON],
      cmpAutoMergeEnabled: true,
      workflowConclusion: 'success',
    });
    assert.equal(r.allowed, false);
    assert.match(r.reason, /needs:anton/);
  });

  it('allows CMP path only when preconditions met', () => {
    const r = evaluateAgentAutoMergeGate({
      headBranch: 'cmp/abc',
      labels: ['client-approved'],
      cmpAutoMergeEnabled: true,
      workflowConclusion: 'success',
    });
    assert.equal(r.allowed, true);
  });
});

describe('protected-action-gates / secrets isolation', () => {
  it('blocks fork PRs and pull_request_target from production secrets', () => {
    const fork = evaluateUntrustedPrSecretsIsolation({
      eventName: 'pull_request',
      repository: 'org/repo',
      pullRequest: {
        head: { repo: { full_name: 'evil/repo' } },
        base: { repo: { full_name: 'org/repo' } },
      },
    });
    assert.equal(fork.mayReceiveProductionSecrets, false);

    const prt = evaluateUntrustedPrSecretsIsolation({ eventName: 'pull_request_target' });
    assert.equal(prt.mayReceiveProductionSecrets, false);
  });
});

describe('protected-action-gates / consequential actions', () => {
  it('blocks deploy without durable approval', () => {
    const r = gateProtectedAction({
      action: 'deploy',
      labels: [LABEL_NEEDS_ANTON, 'approval:deploy'],
      comments: [],
      targetSha: 'abc',
      environment: 'production',
    });
    assert.equal(r.blocked, true);
    assert.match(formatGateBlockMessage({ action: 'deploy', reason: r.reason, audit: r.audit }), /BLOCKED/);
  });

  it('blocks production workflow run without approval', () => {
    const r = gateProtectedAction({
      action: 'production',
      comments: [],
      environment: 'production',
      targetSha: 'fff',
    });
    assert.equal(r.blocked, true);
  });

  it('blocks db-schema when workflow default-disabled', () => {
    const r = gateProtectedAction({
      action: 'db-schema',
      comments: [],
      workflowEnabled: false,
    });
    assert.equal(r.blocked, true);
    assert.match(r.reason, /default-disabled/);
  });

  it('blocks messaging/payment/external-send without approval even if enabled flag set but no marker', () => {
    for (const action of ['external-send', 'payment', 'paid-tool']) {
      const r = gateProtectedAction({
        action,
        workflowEnabled: true,
        comments: [],
      });
      assert.equal(r.blocked, true, action);
    }
  });

  it('allows deploy when durable approval matches and records audit fields', () => {
    const marker = buildProtectedApprovalMarker({
      approver: 'Anton',
      decision: 'approve',
      action: 'deploy',
      issueNumber: 99,
      targetSha: 'cafebabe',
      environment: 'production',
      recordedAt: '2026-07-29T09:00:00.000Z',
    });
    const md = formatProtectedApprovalMarkdown(marker.marker);
    const r = gateProtectedAction({
      action: 'deploy',
      labels: ['approval:deploy'],
      comments: [md],
      issueNumber: 99,
      targetSha: 'cafebabe',
      environment: 'production',
    });
    assert.equal(r.allowed, true);
    assert.equal(r.audit.approver, 'Anton');
    assert.equal(r.audit.targetSha, 'cafebabe');
    assert.equal(r.audit.environment, 'production');
    assert.ok(r.audit.timestamp);
    assert.equal(r.audit.result, 'allowed');
  });

  it('allows db-schema only when workflowEnabled and durable approval present', () => {
    const marker = buildProtectedApprovalMarker({
      approver: 'Anton',
      decision: 'approve',
      action: 'db-schema',
      issueNumber: 50,
      targetSha: 'schema1',
      environment: 'production',
    });
    const md = formatProtectedApprovalMarkdown(marker.marker);
    const blocked = gateProtectedAction({
      action: 'db-schema',
      comments: [md],
      issueNumber: 50,
      targetSha: 'schema1',
      environment: 'production',
      workflowEnabled: false,
    });
    assert.equal(blocked.blocked, true);

    const allowed = gateProtectedAction({
      action: 'db-schema',
      comments: [md],
      issueNumber: 50,
      targetSha: 'schema1',
      environment: 'production',
      workflowEnabled: true,
    });
    assert.equal(allowed.allowed, true);
  });
});
