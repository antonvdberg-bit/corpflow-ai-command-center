/**
 * Bounded, durable acknowledgement of the native Cursor Automation wake.
 *
 * A successful webhook POST only proves that the wake endpoint accepted a
 * request. It does not prove that Cursor created an agent. This helper records
 * that distinction on the source issue and lets the existing Queue Reconcile
 * cadence make an unobserved handoff explicit without adding another executor.
 */

import {
  buildCursorOriginMetadata,
  resolveCursorOriginMetadata,
} from './cursor-origin-metadata.js';

export const FACTORY_CURSOR_HANDOFF_RECEIPT_SCHEMA =
  'corpflow.factory_cursor_handoff_receipt.v1';
export const FACTORY_CURSOR_HANDOFF_RECEIPT_MARKER =
  'corpflow.factory_cursor_handoff_receipt.v1';
export const FACTORY_HANDOFF_RECEIPT_TIMEOUT_MS = 5 * 60 * 1000;

const RECEIPT_STATES = Object.freeze([
  'PENDING',
  'IN_PROGRESS',
  'BLOCKED',
  'NOT_RECEIVED',
  'SUPPRESSED',
]);

function emptyToNull(value) {
  const text = value == null ? '' : String(value).trim();
  return text || null;
}

function toPositiveIssueNumber(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function isoAfter(iso, milliseconds) {
  const at = Date.parse(String(iso || ''));
  return Number.isFinite(at) ? new Date(at + milliseconds).toISOString() : null;
}

export function buildFactoryCursorHandoffReceipt(input = {}) {
  const handedOffAt =
    emptyToNull(input.handedOffAt ?? input.handed_off_at) || new Date().toISOString();
  const state = String(input.state || 'PENDING').toUpperCase();
  return {
    schema: FACTORY_CURSOR_HANDOFF_RECEIPT_SCHEMA,
    source_issue: toPositiveIssueNumber(input.sourceIssue ?? input.source_issue),
    handoff_run_id: emptyToNull(input.handoffRunId ?? input.handoff_run_id),
    handed_off_at: handedOffAt,
    acknowledgement_deadline_at:
      emptyToNull(input.acknowledgementDeadlineAt ?? input.acknowledgement_deadline_at) ||
      isoAfter(handedOffAt, FACTORY_HANDOFF_RECEIPT_TIMEOUT_MS),
    state: RECEIPT_STATES.includes(state) ? state : 'PENDING',
    cursor_agent_id: emptyToNull(input.cursorAgentId ?? input.cursor_agent_id),
    cursor_run_id: emptyToNull(input.cursorRunId ?? input.cursor_run_id),
    blocker: emptyToNull(input.blocker),
    updated_at: emptyToNull(input.updatedAt ?? input.updated_at) || handedOffAt,
  };
}

export function formatFactoryCursorHandoffReceiptComment(input) {
  const receipt = buildFactoryCursorHandoffReceipt(input);
  return `CURSOR HANDOFF RECEIPT

Source issue: ${receipt.source_issue != null ? `#${receipt.source_issue}` : 'n/a'}
Handoff Actions run: ${receipt.handoff_run_id || 'n/a'}
State: ${receipt.state}
Acknowledgement deadline: ${receipt.acknowledgement_deadline_at || 'n/a'}
Cursor agent: ${receipt.cursor_agent_id || 'n/a'}
Cursor run: ${receipt.cursor_run_id || 'n/a'}
Blocker: ${receipt.blocker || 'none'}

<!-- ${FACTORY_CURSOR_HANDOFF_RECEIPT_MARKER} ${JSON.stringify(receipt)} -->
`;
}

export function parseFactoryCursorHandoffReceiptFromText(body) {
  const match = String(body || '').match(
    new RegExp(
      `<!--\\s*${FACTORY_CURSOR_HANDOFF_RECEIPT_MARKER}\\s+(\\{[\\s\\S]*?\\})\\s*-->`,
      'i',
    ),
  );
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    const receipt = buildFactoryCursorHandoffReceipt({
      sourceIssue: parsed.source_issue,
      handoffRunId: parsed.handoff_run_id,
      handedOffAt: parsed.handed_off_at,
      acknowledgementDeadlineAt: parsed.acknowledgement_deadline_at,
      state: parsed.state,
      cursorAgentId: parsed.cursor_agent_id,
      cursorRunId: parsed.cursor_run_id,
      blocker: parsed.blocker,
      updatedAt: parsed.updated_at,
    });
    return receipt.source_issue ? receipt : null;
  } catch {
    return null;
  }
}

export function findLatestFactoryCursorHandoffReceipt(comments, sourceIssue) {
  const wanted = toPositiveIssueNumber(sourceIssue);
  for (const comment of Array.isArray(comments) ? [...comments].reverse() : []) {
    const receipt = parseFactoryCursorHandoffReceiptFromText(comment?.body);
    if (receipt && (!wanted || receipt.source_issue === wanted)) return receipt;
  }
  return null;
}

function extractCursorBotAcknowledgement(comments) {
  for (const comment of Array.isArray(comments) ? [...comments].reverse() : []) {
    const author = String(comment?.author || '').toLowerCase();
    const body = String(comment?.body || '');
    const agent = body.match(/cursor\.com\/agents\/(bc-[a-z0-9-]+)/i);
    if (agent && (author === 'cursor' || author === 'cursor[bot]')) {
      return { cursorAgentId: agent[1], cursorRunId: null };
    }
    const suppressed = body.match(/\bSUPPRESSED:\s*([^\n]+)/i);
    if (suppressed && (author === 'cursor' || author === 'cursor[bot]')) {
      return { suppressed: suppressed[1].trim() };
    }
    const blocked = body.match(/\b(?:RECEIVED\s+—\s+)?BLOCKED:\s*([^\n]+)/i);
    if (blocked && (author === 'cursor' || author === 'cursor[bot]')) {
      return { blocked: blocked[1].trim() };
    }
  }
  return null;
}

/**
 * Evaluate one current handoff receipt from durable GitHub evidence.
 *
 * `NOT_RECEIVED` is deliberately phrased as an observation: it means no
 * Cursor-side acknowledgement became visible before the deadline. The current
 * native Automation transport cannot distinguish dropped from suppressed
 * delivery; callers must not claim a more specific cause without a callback.
 */
export function resolveFactoryCursorHandoffReceipt(input = {}) {
  const receipt = input.receipt
    ? buildFactoryCursorHandoffReceipt(input.receipt)
    : findLatestFactoryCursorHandoffReceipt(input.comments, input.sourceIssue);
  if (!receipt || receipt.state !== 'PENDING') {
    return { receipt, transition: null, origin: null };
  }

  const origin = resolveCursorOriginMetadata({
    issueBody: input.issueBody,
    comments: input.comments,
    expectedSourceIssue: receipt.source_issue,
  });
  const botAcknowledgement = extractCursorBotAcknowledgement(input.comments);
  const nowIso = emptyToNull(input.nowIso) || new Date().toISOString();

  if (botAcknowledgement?.suppressed) {
    return {
      receipt: buildFactoryCursorHandoffReceipt({
        ...receipt,
        state: 'SUPPRESSED',
        blocker: botAcknowledgement.suppressed,
        updatedAt: nowIso,
      }),
      transition: 'SUPPRESSED',
      origin: null,
    };
  }
  if (botAcknowledgement?.blocked) {
    return {
      receipt: buildFactoryCursorHandoffReceipt({
        ...receipt,
        state: 'BLOCKED',
        blocker: botAcknowledgement.blocked,
        updatedAt: nowIso,
      }),
      transition: 'BLOCKED',
      origin: null,
    };
  }

  const cursorAgentId = origin.cursorAgentId || botAcknowledgement?.cursorAgentId || null;
  const cursorRunId = origin.cursorRunId || botAcknowledgement?.cursorRunId || null;
  if (cursorAgentId || cursorRunId) {
    return {
      receipt: buildFactoryCursorHandoffReceipt({
        ...receipt,
        state: 'IN_PROGRESS',
        cursorAgentId,
        cursorRunId,
        updatedAt: nowIso,
      }),
      transition: 'IN_PROGRESS',
      origin: buildCursorOriginMetadata({
        ...origin,
        sourceIssue: receipt.source_issue,
        activationWorkflowRunId: receipt.handoff_run_id,
        cursorAgentId,
        cursorRunId,
      }),
    };
  }

  const deadline = Date.parse(String(receipt.acknowledgement_deadline_at || ''));
  const now = Date.parse(nowIso);
  if (Number.isFinite(deadline) && Number.isFinite(now) && now >= deadline) {
    return {
      receipt: buildFactoryCursorHandoffReceipt({
        ...receipt,
        state: 'NOT_RECEIVED',
        blocker: 'cursor_ack_timeout_no_agent_or_run_evidence',
        updatedAt: nowIso,
      }),
      transition: 'NOT_RECEIVED',
      origin: null,
    };
  }

  return { receipt, transition: null, origin: null };
}
