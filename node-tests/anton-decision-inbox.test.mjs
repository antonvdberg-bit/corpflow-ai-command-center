import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  APPROVAL_REASON_LABELS,
  DECISION_INBOX_LABELS,
  DECISION_PACKET_MARKER,
  DURABLE_APPROVAL_MARKER,
  LABEL_NEEDS_ANTON,
  buildActiveDecisionInboxQuery,
  buildApprovalAuditRecord,
  buildExceptionNotifyFingerprint,
  canonicalizeApprovalType,
  evaluateProtectedActionGate,
  formatDecisionPacket,
  formatDurableApproval,
  formatExceptionNotifyMessage,
  isActiveDecisionInboxItem,
  isNonApprovalSignal,
  parseDecisionPacket,
  parseDurableApproval,
  shouldSendExceptionNotification,
  syntheticProtectedActionResult,
  validateNeedsAntonLabelSet,
} from '../lib/server/anton-decision-inbox.js';
import { inferIssueClassification } from '../lib/server/cursor-issue-dispatch-lifecycle.js';

const ISSUE_676_BODY = `## Business outcome
Anton can step away while remaining aware of decisions.

## Required solution
approval:payment labels and payment actions must be gated.

## Governance
- No production deployment during implementation/testing.
- No env or secret changes without explicit approval.
- No DB/schema changes.
- No live messaging, payments, outreach, or public launch.
- No paid tools.
- Open a PR only. Do not merge. Do not deploy.
`;

describe('anton-decision-inbox', () => {
  it('exposes the canonical label set from issue #676', () => {
    assert.equal(LABEL_NEEDS_ANTON, 'needs:anton');
    assert.deepEqual(
      [...APPROVAL_REASON_LABELS],
      [
        'approval:merge',
        'approval:deploy',
        'approval:production',
        'approval:db-schema',
        'approval:env-secrets',
        'approval:external-send',
        'approval:payment',
        'approval:paid-tool',
        'approval:public-launch',
      ],
    );
    assert.equal(DECISION_INBOX_LABELS.length, 10);
  });

  it('validates needs:anton + reason labels', () => {
    const bad = validateNeedsAntonLabelSet(['bug']);
    assert.equal(bad.ok, false);
    const good = validateNeedsAntonLabelSet(['needs:anton', 'approval:merge']);
    assert.equal(good.ok, true);
    assert.deepEqual(good.reasonLabels, ['approval:merge']);
  });

  it('builds an active inbox query', () => {
    assert.match(buildActiveDecisionInboxQuery(), /label:"needs:anton"/);
  });

  it('formats and parses a decision packet', () => {
    const text = formatDecisionPacket({
      project_workstream: 'ops / #676',
      business_outcome: 'Central Decision Inbox',
      exact_decision_required: 'Approve merge of Decision Inbox PR',
      recommended_decision: 'approve after CI green',
      consequence_of_approve: 'labels + gate helpers land on main',
      consequence_of_reject_or_defer: 'agents keep using ad-hoc #249 only',
      evidence_links: ['https://github.com/example/pr/1'],
      urgency_or_expiry: 'P0',
      approval_type: 'merge',
      issue_or_pr: '#676',
      target_sha: 'abc123',
      target_environment: 'n/a',
    });
    assert.match(text, new RegExp(DECISION_PACKET_MARKER));
    const parsed = parseDecisionPacket(text);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.packet?.approval_type, 'approval:merge');
  });

  it('formats and parses durable approval; labels alone do not unlock', () => {
    const text = formatDurableApproval({
      approver: 'Anton',
      approval_type: 'approval:deploy',
      issue_or_pr: '#900',
      target_sha: 'deadbeef',
      target_environment: 'Production',
      decision: 'approve',
      recorded_at: '2026-07-29T00:00:00.000Z',
    });
    assert.match(text, new RegExp(DURABLE_APPROVAL_MARKER));
    const parsed = parseDurableApproval(text);
    assert.equal(parsed.ok, true);

    assert.equal(isNonApprovalSignal({ labels: ['needs:anton', 'approval:deploy'] }), true);
    assert.equal(isNonApprovalSignal({ ciGreen: true }), true);
    assert.equal(isNonApprovalSignal({ silence: true }), true);

    const blocked = evaluateProtectedActionGate({
      action: 'approval:deploy',
      issueOrPr: '#900',
      targetSha: 'deadbeef',
      targetEnvironment: 'Production',
      comments: [{ body: 'please deploy' }],
    });
    assert.equal(blocked.allowed, false);

    const allowed = evaluateProtectedActionGate({
      action: 'approval:deploy',
      issueOrPr: '#900',
      targetSha: 'deadbeef',
      targetEnvironment: 'Production',
      comments: [{ body: text }],
    });
    assert.equal(allowed.allowed, true);
  });

  it('clears active inbox items after resolution marker', () => {
    const active = isActiveDecisionInboxItem({
      labels: ['needs:anton', 'approval:merge'],
      comments: [],
    });
    assert.equal(active, true);
    const cleared = isActiveDecisionInboxItem(
      {
        labels: ['needs:anton', 'approval:merge'],
        comments: [
          {
            body: `### ANTON DECISION RESOLVED
- issue_or_pr: #1
- approval_type: approval:merge
- resolution: approved
`,
          },
        ],
      },
      'approval:merge',
    );
    assert.equal(cleared, false);
  });

  it('deduplicates exception notifications by fingerprint', () => {
    const fp = buildExceptionNotifyFingerprint({
      issueOrPr: '#676',
      approvalType: 'approval:merge',
      evidenceFingerprint: 'sha:abc',
    });
    const msg = formatExceptionNotifyMessage({
      project_workstream: 'ops',
      issue_or_pr: '#676',
      exact_action_required: 'Approve merge',
      why_needed_now: 'protected merge cannot proceed autonomously',
      recommendation: 'approve after CI green',
      consequence_of_delay: 'Decision Inbox item stays blocked',
      urgency: 'P0',
      github_link: 'https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/676',
    });
    assert.equal(msg.ok, true);
    assert.match(msg.text, /Anton required: yes/);
    assert.match(msg.text, /Why needed now:/);
    assert.match(msg.text, /Recommendation:/);
    assert.match(msg.text, /Consequence of delay:/);
    assert.match(msg.text, /Link: https:\/\//);
    const first = shouldSendExceptionNotification({
      fingerprint: fp,
      priorFingerprints: [],
      messageOk: true,
    });
    assert.equal(first.send, true);
    const second = shouldSendExceptionNotification({
      fingerprint: fp,
      priorFingerprints: [fp],
      messageOk: true,
    });
    assert.equal(second.send, false);
    const blank = formatExceptionNotifyMessage({});
    assert.equal(blank.ok, false);
  });

  it('builds approval audit records with required fields', () => {
    const audit = buildApprovalAuditRecord({
      approver: 'Anton',
      approval_type: 'approval:production',
      issue_or_pr: '#1',
      target_sha: 'abc',
      target_environment: 'Production',
      recorded_at: '2026-07-29T12:00:00.000Z',
      resulting_run_or_deployment: 'run:123',
      decision: 'approve',
    });
    assert.equal(audit.approver, 'Anton');
    assert.equal(audit.approval_type, 'approval:production');
    assert.equal(audit.target_sha, 'abc');
    assert.equal(audit.target_environment, 'Production');
    assert.equal(audit.recorded_at, '2026-07-29T12:00:00.000Z');
    assert.equal(audit.resulting_run_or_deployment, 'run:123');
  });

  it('synthetic protected actions block without approval', () => {
    assert.equal(syntheticProtectedActionResult('approval:deploy', false).blocked, true);
    assert.equal(syntheticProtectedActionResult('approval:db-schema', false).blocked, true);
    assert.equal(syntheticProtectedActionResult('approval:external-send', false).blocked, true);
    assert.equal(syntheticProtectedActionResult('approval:payment', false).blocked, true);
    assert.equal(syntheticProtectedActionResult('approval:deploy', true).blocked, false);
  });

  it('canonicalizes gate aliases', () => {
    assert.equal(canonicalizeApprovalType('deploy'), 'approval:deploy');
    assert.equal(canonicalizeApprovalType('db-schema'), 'approval:db-schema');
    assert.equal(canonicalizeApprovalType('public_launch'), 'approval:public-launch');
  });
});

describe('dispatch classification vs Decision Inbox (#676 false-positive guard)', () => {
  it('does not treat #676 gate-design issue as payment protected gate', () => {
    const c = inferIssueClassification({
      number: 676,
      title: 'P0: Central Anton Decision Inbox and enforceable protected-action gates',
      body: ISSUE_676_BODY,
      labels: ['priority:P0', 'dispatch:cursor-ready'],
    });
    assert.equal(c.protectedGate, 'none');
  });
});
