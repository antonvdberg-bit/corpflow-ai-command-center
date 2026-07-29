import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ANTON_DECISION_INBOX_QUERY,
  APPROVAL_REASON_LABELS,
  buildDecisionPacket,
  buildProtectedApprovalMarker,
  evaluateProtectedApproval,
  formatDecisionPacketMarkdown,
  formatProtectedApprovalMarkdown,
  isActiveInboxItem,
  LABEL_NEEDS_ANTON,
  parseDecisionPacketFromComments,
  parseProtectedApprovalsFromComments,
  validateInboxLabels,
} from '../lib/server/anton-decision-inbox.js';

describe('anton-decision-inbox / labels', () => {
  it('requires needs:anton plus at least one approval reason', () => {
    const missing = validateInboxLabels([LABEL_NEEDS_ANTON]);
    assert.equal(missing.ok, false);
    assert.equal(missing.missingReason, true);

    const ok = validateInboxLabels([LABEL_NEEDS_ANTON, 'approval:merge']);
    assert.equal(ok.ok, true);
    assert.deepEqual(ok.reasonLabels, ['approval:merge']);
  });

  it('exposes all nine approval reason labels', () => {
    assert.equal(APPROVAL_REASON_LABELS.length, 9);
    assert.ok(APPROVAL_REASON_LABELS.includes('approval:deploy'));
    assert.ok(ANTON_DECISION_INBOX_QUERY.includes('needs:anton'));
  });

  it('clears from active inbox when needs:anton removed or closed', () => {
    assert.equal(
      isActiveInboxItem({ state: 'open', labels: [LABEL_NEEDS_ANTON, 'approval:merge'] }),
      true,
    );
    assert.equal(isActiveInboxItem({ state: 'open', labels: ['approval:merge'] }), false);
    assert.equal(
      isActiveInboxItem({ state: 'closed', labels: [LABEL_NEEDS_ANTON, 'approval:merge'] }),
      false,
    );
    assert.equal(
      isActiveInboxItem({
        state: 'open',
        labels: [LABEL_NEEDS_ANTON, 'approval:merge', 'dispatch:blocked'],
      }),
      false,
    );
  });
});

describe('anton-decision-inbox / decision packet', () => {
  it('builds and round-trips a structured packet', () => {
    const built = buildDecisionPacket({
      projectWorkstream: 'Lux',
      businessOutcome: 'Ship merge-gated fix',
      exactDecisionRequired: 'Approve merge of PR #1',
      recommendedDecision: 'approve merge',
      consequenceApprove: 'PR may be merged by Anton',
      consequenceRejectDefer: 'Remains blocked',
      evidenceLinks: ['https://github.com/example/pr/1'],
      action: 'merge',
      issueOrPr: '#1',
      targetSha: 'abc1234',
    });
    assert.equal(built.ok, true);
    const md = formatDecisionPacketMarkdown(built.packet);
    const parsed = parseDecisionPacketFromComments([md]);
    assert.ok(parsed);
    assert.equal(parsed.action, 'merge');
    assert.equal(parsed.projectWorkstream, 'Lux');
    assert.equal(parsed.targetSha, 'abc1234');
  });

  it('rejects incomplete packets', () => {
    const bad = buildDecisionPacket({ action: 'merge' });
    assert.equal(bad.ok, false);
    assert.ok(bad.errors.length >= 1);
  });
});

describe('anton-decision-inbox / durable approval (labels alone do not approve)', () => {
  it('blocks when only labels are present', () => {
    const result = evaluateProtectedApproval({
      action: 'deploy',
      labels: [LABEL_NEEDS_ANTON, 'approval:deploy'],
      comments: [],
      targetSha: 'deadbeef',
      environment: 'production',
    });
    assert.equal(result.allowed, false);
    assert.match(result.reason, /labels alone/i);
  });

  it('allows when durable scoped approve marker matches', () => {
    const marker = buildProtectedApprovalMarker({
      approver: 'Anton',
      decision: 'approve',
      action: 'deploy',
      issueNumber: 676,
      targetSha: 'deadbeefcafebabe',
      environment: 'production',
      recordedAt: '2026-07-29T08:00:00.000Z',
      source: 'github',
    });
    assert.equal(marker.ok, true);
    const md = formatProtectedApprovalMarkdown(marker.marker);
    const parsed = parseProtectedApprovalsFromComments([md]);
    assert.equal(parsed.length, 1);

    const result = evaluateProtectedApproval({
      action: 'deploy',
      labels: [LABEL_NEEDS_ANTON, 'approval:deploy'],
      comments: [md],
      issueNumber: 676,
      targetSha: 'deadbeefcafebabe',
      environment: 'production',
    });
    assert.equal(result.allowed, true);
    assert.equal(result.matched?.approver, 'Anton');
    assert.equal(result.audit.approver, 'Anton');
    assert.equal(result.audit.targetSha, 'deadbeefcafebabe');
    assert.equal(result.audit.environment, 'production');
  });

  it('blocks on SHA mismatch and expired validity', () => {
    const marker = buildProtectedApprovalMarker({
      approver: 'Anton',
      decision: 'approve',
      action: 'production',
      issueNumber: 10,
      targetSha: 'aaa111',
      environment: 'production',
      validUntil: '2026-01-01T00:00:00.000Z',
      recordedAt: '2026-01-01T00:00:00.000Z',
    });
    const md = formatProtectedApprovalMarkdown(marker.marker);

    const shaMiss = evaluateProtectedApproval({
      action: 'production',
      comments: [md],
      issueNumber: 10,
      targetSha: 'bbb222',
      environment: 'production',
      now: '2025-12-01T00:00:00.000Z',
    });
    assert.equal(shaMiss.allowed, false);

    const expired = evaluateProtectedApproval({
      action: 'production',
      comments: [md],
      issueNumber: 10,
      targetSha: 'aaa111',
      environment: 'production',
      now: '2026-07-29T00:00:00.000Z',
    });
    assert.equal(expired.allowed, false);
  });

  it('rejects agent recommendation text without durable marker', () => {
    const result = evaluateProtectedApproval({
      action: 'merge',
      labels: ['approval:merge'],
      comments: ['I recommend Anton approve this merge. CI is green.'],
      targetSha: 'abc',
    });
    assert.equal(result.allowed, false);
  });
});
