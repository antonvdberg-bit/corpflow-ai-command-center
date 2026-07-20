import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyClientReply,
  createReportedReplyCheckpoint,
  evaluateClientReplyForNotification,
  SIMPLE_CLASSIFICATIONS,
  DETAILED_CLASSIFICATIONS,
} from '../lib/email/client-reply-monitor.js';

const baseMessage = {
  id: 'msg-002',
  threadId: 'thread-jan-lux-ai-review',
  from: 'Jan du Plessis <jan@luxemaurice.com>',
  internalDate: '2026-07-18T06:00:00.000Z',
  body: 'Please simplify all processes',
};

test('classifies Jan simplify request as changes needed', () => {
  const result = classifyClientReply('Please simplify all processes');
  assert.equal(result.simple, SIMPLE_CLASSIFICATIONS.CHANGES_NEEDED);
  assert.equal(result.detailed, DETAILED_CLASSIFICATIONS.CHANGE_REQUEST);
});

test('classifies listing/photo/video question as content or asset request', () => {
  const result = classifyClientReply('How do I add listings, photos and videos');
  assert.equal(result.simple, SIMPLE_CLASSIFICATIONS.CHANGES_NEEDED);
  assert.equal(result.detailed, DETAILED_CLASSIFICATIONS.CONTENT_OR_ASSET_REQUEST);
});

test('notifies for a genuinely new expected client reply', () => {
  const result = evaluateClientReplyForNotification({
    message: baseMessage,
    expectedSenderEmail: 'jan@luxemaurice.com',
  });
  assert.equal(result.shouldNotify, true);
  assert.equal(result.reason, 'NEW_CLIENT_REPLY_REQUIRES_REVIEW');
  assert.equal(result.classification.simple, SIMPLE_CLASSIFICATIONS.CHANGES_NEEDED);
  assert.equal(result.checkpoint.last_reported_gmail_message_id, 'msg-002');
});

test('suppresses same Gmail message id after checkpoint', () => {
  const checkpoint = createReportedReplyCheckpoint(baseMessage, DETAILED_CLASSIFICATIONS.CHANGE_REQUEST);
  const result = evaluateClientReplyForNotification({
    message: baseMessage,
    lastCheckpoint: checkpoint,
    expectedSenderEmail: 'jan@luxemaurice.com',
  });
  assert.equal(result.shouldNotify, false);
  assert.equal(result.reason, 'ALREADY_REPORTED_MESSAGE_ID');
});

test('suppresses repeated excerpt in same thread even if message id changes', () => {
  const checkpoint = createReportedReplyCheckpoint(baseMessage, DETAILED_CLASSIFICATIONS.CHANGE_REQUEST);
  const duplicate = { ...baseMessage, id: 'msg-003', internalDate: '2026-07-18T07:00:00.000Z' };
  const result = evaluateClientReplyForNotification({
    message: duplicate,
    lastCheckpoint: checkpoint,
    expectedSenderEmail: 'jan@luxemaurice.com',
  });
  assert.equal(result.shouldNotify, false);
  assert.equal(result.reason, 'ALREADY_REPORTED_EXCERPT_HASH');
});

test('suppresses older message in same thread after checkpoint', () => {
  const checkpoint = createReportedReplyCheckpoint(baseMessage, DETAILED_CLASSIFICATIONS.CHANGE_REQUEST);
  const older = {
    ...baseMessage,
    id: 'msg-001',
    internalDate: '2026-07-18T05:00:00.000Z',
    body: 'Approved',
  };
  const result = evaluateClientReplyForNotification({
    message: older,
    lastCheckpoint: checkpoint,
    expectedSenderEmail: 'jan@luxemaurice.com',
  });
  assert.equal(result.shouldNotify, false);
  assert.equal(result.reason, 'NOT_NEWER_THAN_CHECKPOINT');
});

test('ignores messages from non-client senders when expected sender is set', () => {
  const result = evaluateClientReplyForNotification({
    message: { ...baseMessage, id: 'msg-004', from: 'Anton <anton@example.com>' },
    expectedSenderEmail: 'jan@luxemaurice.com',
  });
  assert.equal(result.shouldNotify, false);
  assert.equal(result.reason, 'NOT_EXPECTED_CLIENT_SENDER');
});
