import crypto from 'node:crypto';

export const SIMPLE_CLASSIFICATIONS = Object.freeze({
  APPROVED: 'APPROVED',
  CHANGES_NEEDED: 'CHANGES NEEDED',
  UNCLEAR: 'UNCLEAR',
});

export const DETAILED_CLASSIFICATIONS = Object.freeze({
  APPROVAL: 'APPROVAL',
  APPROVAL_WITH_CONDITIONS: 'APPROVAL_WITH_CONDITIONS',
  CHANGE_REQUEST: 'CHANGE_REQUEST',
  SUPPORT_OR_HOW_TO_QUESTION: 'SUPPORT_OR_HOW_TO_QUESTION',
  CONTENT_OR_ASSET_REQUEST: 'CONTENT_OR_ASSET_REQUEST',
  BLOCKER_OR_ACCESS_ISSUE: 'BLOCKER_OR_ACCESS_ISSUE',
  GENERAL_ACK_NO_ACTION: 'GENERAL_ACK_NO_ACTION',
  UNCLEAR: 'UNCLEAR',
});

function text(value) {
  return typeof value === 'string' ? value : '';
}

export function extractEmailAddress(value) {
  const raw = text(value).trim().toLowerCase();
  const match = raw.match(/<([^>]+)>/);
  return (match?.[1] || raw).trim();
}

export function normalizeClientExcerpt(body) {
  const raw = text(body).replace(/\r\n/g, '\n').trim();
  if (!raw) return '';

  const replyOnly = raw
    .split(/\nOn .+ wrote:\n/i)[0]
    .split(/\n-{2,}\s*Original Message\s*-{2,}/i)[0]
    .split(/\nFrom:\s.+\nSent:\s.+\n/i)[0];

  return replyOnly
    .split('\n')
    .filter((line) => !line.trim().startsWith('>'))
    .join('\n')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hashExcerpt(excerpt) {
  return crypto.createHash('sha256').update(normalizeClientExcerpt(excerpt)).digest('hex');
}

export function getMessageTimestamp(message) {
  const raw = message?.internalDate || message?.date || message?.receivedAt || message?.timestamp;
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw === 'number') return raw;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function createReportedReplyCheckpoint(message, classification) {
  const excerpt = normalizeClientExcerpt(message?.body || message?.text || message?.snippet || message?.excerpt);
  return {
    thread_id: message?.threadId || message?.thread_id || null,
    last_reported_gmail_message_id: message?.messageId || message?.id || null,
    last_reported_message_timestamp: getMessageTimestamp(message),
    last_reported_excerpt_hash: hashExcerpt(excerpt),
    classification: classification || null,
    reported_at: new Date().toISOString(),
  };
}

export function classifyClientReply(body) {
  const excerpt = normalizeClientExcerpt(body);
  const lower = excerpt.toLowerCase();

  const hasQuestion = /\?|\bhow\b|\bwhere\b|\bwhat\b|\bwhen\b|\bcan you\b|\bplease explain\b/.test(lower);
  const hasApproval = /\bapproved\b|\bapprove\b|\bok\b|\bokay\b|\bgo ahead\b|\blooks good\b/.test(lower);
  const hasChange = /\bchange\b|\bfix\b|\bupdate\b|\bsimplify\b|\brevise\b|\bremove\b|\badd\b|\badjust\b/.test(lower);
  const hasAsset = /\blisting\b|\blistings\b|\bphoto\b|\bphotos\b|\bvideo\b|\bvideos\b|\bimage\b|\bimages\b|\bmedia\b/.test(lower);
  const hasBlocker = /\bcannot\b|\bcan't\b|\bunable\b|\bblocked\b|\berror\b|\blogin\b|\bpassword\b|\baccess\b/.test(lower);
  const ackOnly = /^(thanks|thank you|received|noted|ok|okay)[.!\s]*$/i.test(excerpt);

  let detailed = DETAILED_CLASSIFICATIONS.UNCLEAR;
  if (hasBlocker) detailed = DETAILED_CLASSIFICATIONS.BLOCKER_OR_ACCESS_ISSUE;
  else if (hasAsset) detailed = DETAILED_CLASSIFICATIONS.CONTENT_OR_ASSET_REQUEST;
  else if (hasQuestion) detailed = DETAILED_CLASSIFICATIONS.SUPPORT_OR_HOW_TO_QUESTION;
  else if (hasApproval && hasChange) detailed = DETAILED_CLASSIFICATIONS.APPROVAL_WITH_CONDITIONS;
  else if (hasChange) detailed = DETAILED_CLASSIFICATIONS.CHANGE_REQUEST;
  else if (hasApproval) detailed = DETAILED_CLASSIFICATIONS.APPROVAL;
  else if (ackOnly) detailed = DETAILED_CLASSIFICATIONS.GENERAL_ACK_NO_ACTION;

  const simple = detailed === DETAILED_CLASSIFICATIONS.APPROVAL
    ? SIMPLE_CLASSIFICATIONS.APPROVED
    : detailed === DETAILED_CLASSIFICATIONS.GENERAL_ACK_NO_ACTION
      ? SIMPLE_CLASSIFICATIONS.UNCLEAR
      : detailed === DETAILED_CLASSIFICATIONS.UNCLEAR
        ? SIMPLE_CLASSIFICATIONS.UNCLEAR
        : SIMPLE_CLASSIFICATIONS.CHANGES_NEEDED;

  return { simple, detailed, excerpt };
}

export function evaluateClientReplyForNotification({ message, lastCheckpoint = null, expectedSenderEmail = null } = {}) {
  if (!message) return { shouldNotify: false, reason: 'NO_MESSAGE' };

  const sender = extractEmailAddress(message.from || message.sender || '');
  if (expectedSenderEmail && sender !== extractEmailAddress(expectedSenderEmail)) {
    return { shouldNotify: false, reason: 'NOT_EXPECTED_CLIENT_SENDER', sender };
  }

  const messageId = message.messageId || message.id || null;
  const threadId = message.threadId || message.thread_id || null;
  const timestamp = getMessageTimestamp(message);
  const classified = classifyClientReply(message.body || message.text || message.snippet || message.excerpt || '');
  const excerptHash = hashExcerpt(classified.excerpt);

  if (lastCheckpoint) {
    if (messageId && messageId === lastCheckpoint.last_reported_gmail_message_id) {
      return { shouldNotify: false, reason: 'ALREADY_REPORTED_MESSAGE_ID', classification: classified, sender };
    }
    if (threadId && threadId === lastCheckpoint.thread_id && excerptHash === lastCheckpoint.last_reported_excerpt_hash) {
      return { shouldNotify: false, reason: 'ALREADY_REPORTED_EXCERPT_HASH', classification: classified, sender };
    }
    const lastTs = lastCheckpoint.last_reported_message_timestamp;
    if (threadId && threadId === lastCheckpoint.thread_id && timestamp && lastTs && timestamp <= lastTs) {
      return { shouldNotify: false, reason: 'NOT_NEWER_THAN_CHECKPOINT', classification: classified, sender };
    }
  }

  const actionRequired = classified.simple === SIMPLE_CLASSIFICATIONS.APPROVED
    || classified.simple === SIMPLE_CLASSIFICATIONS.CHANGES_NEEDED
    || classified.simple === SIMPLE_CLASSIFICATIONS.UNCLEAR;

  return {
    shouldNotify: actionRequired,
    reason: actionRequired ? 'NEW_CLIENT_REPLY_REQUIRES_REVIEW' : 'NO_ACTION_REQUIRED',
    classification: classified,
    sender,
    checkpoint: createReportedReplyCheckpoint(message, classified.detailed),
  };
}
