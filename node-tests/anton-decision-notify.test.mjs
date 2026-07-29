import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { LABEL_NEEDS_ANTON, formatDecisionPacketMarkdown, buildDecisionPacket } from '../lib/server/anton-decision-inbox.js';
import {
  buildNotifyFingerprint,
  evaluateAntonDecisionNotification,
  formatAntonDecisionAlertMessage,
} from '../lib/server/anton-decision-notify.js';

describe('anton-decision-notify / exception-only', () => {
  const packet = buildDecisionPacket({
    projectWorkstream: 'CIPC Desk',
    businessOutcome: 'Unblock merge review',
    exactDecisionRequired: 'Approve merge of synthetic PR',
    recommendedDecision: 'approve',
    consequenceApprove: 'May merge',
    consequenceRejectDefer: 'Stays blocked',
    evidenceLinks: ['https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1'],
    action: 'merge',
    targetSha: 'abc',
  }).packet;
  const packetMd = formatDecisionPacketMarkdown(packet);

  it('notifies once for a new needs:anton item with GitHub link', () => {
    const first = evaluateAntonDecisionNotification({
      event: 'new_item',
      item: {
        number: 9001,
        state: 'open',
        labels: [LABEL_NEEDS_ANTON, 'approval:merge'],
        htmlUrl: 'https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/9001',
        title: 'Synthetic merge approval',
      },
      comments: [packetMd],
      nowMs: 1_000_000,
    });
    assert.equal(first.shouldNotify, true);
    assert.match(first.message, /Decision Inbox/);
    assert.match(first.message, /#?9001|9001/);
    assert.match(first.message, /github\.com/);
    assert.match(first.message, /CIPC Desk|Approve merge/);
    assert.ok(first.fingerprint);

    const repeat = evaluateAntonDecisionNotification({
      event: 'new_item',
      item: {
        number: 9001,
        state: 'open',
        labels: [LABEL_NEEDS_ANTON, 'approval:merge'],
        htmlUrl: 'https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/9001',
        title: 'Synthetic merge approval',
      },
      comments: [packetMd],
      priorFingerprint: first.fingerprint,
      dedupeStore: [{ fingerprint: first.fingerprint, sentAtMs: 1_000_000 }],
      nowMs: 1_000_000 + 60_000,
    });
    assert.equal(repeat.shouldNotify, false);
    assert.match(repeat.reason, /suppress|unchanged|dedupe/i);
  });

  it('suppresses blank messages and non-inbox events', () => {
    const blank = evaluateAntonDecisionNotification({
      event: 'new_item',
      item: {
        number: 1,
        labels: [LABEL_NEEDS_ANTON],
        htmlUrl: '',
      },
      comments: [],
    });
    assert.equal(blank.shouldNotify, false);

    const notInbox = evaluateAntonDecisionNotification({
      event: 'new_item',
      item: {
        number: 2,
        labels: ['enhancement'],
        htmlUrl: 'https://github.com/example/issues/2',
      },
    });
    assert.equal(notInbox.shouldNotify, false);
  });

  it('notifies on material decision change (fingerprint changes)', () => {
    const fp1 = buildNotifyFingerprint({
      issueNumber: 7,
      approvalTypes: ['approval:deploy'],
      exactDecisionRequired: 'Approve deploy of SHA aaa',
      action: 'deploy',
      targetSha: 'aaa',
      kind: 'decision_changed',
    });
    const fp2 = buildNotifyFingerprint({
      issueNumber: 7,
      approvalTypes: ['approval:deploy'],
      exactDecisionRequired: 'Approve deploy of SHA bbb',
      action: 'deploy',
      targetSha: 'bbb',
      kind: 'decision_changed',
    });
    assert.notEqual(fp1, fp2);
  });

  it('formats alert without secrets fields', () => {
    const msg = formatAntonDecisionAlertMessage({
      projectWorkstream: 'Lux',
      issueOrPrNumber: 42,
      exactActionRequired: 'Approve production deploy',
      urgency: 'high',
      githubUrl: 'https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/42',
    });
    assert.doesNotMatch(msg, /secret|password|token|POSTGRES/i);
    assert.match(msg, /Link:/);
  });
});
