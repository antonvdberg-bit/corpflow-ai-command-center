/**
 * Exception-only Anton Decision Inbox notifier (n8n → Telegram path).
 *
 * Notify only when:
 * - a new needs:anton item appears;
 * - the requested decision materially changes;
 * - an approval deadline/escalation threshold is reached;
 * - a previously approved action fails and needs a new decision.
 *
 * Deduplicate by issue/PR + approval type + evidence fingerprint.
 * Never mirror normal GitHub activity. Never send blank messages.
 *
 * @see docs/operations/ANTON_DECISION_INBOX_V1.md
 * @see lib/server/operator-checkpoint-alert.js
 */

import { createHash } from 'node:crypto';

import {
  APPROVAL_REASON_LABELS,
  LABEL_NEEDS_ANTON,
  normalizeLabels,
  parseDecisionPacketFromComments,
} from './anton-decision-inbox.js';

export const ANTON_DECISION_NOTIFY_SCHEMA = 'corpflow.anton_decision_notify.v1';

/** Default suppress window for identical fingerprints (ms). */
export const DEFAULT_DEDUPE_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * @param {string} text
 */
function str(text) {
  return text == null ? '' : String(text).trim();
}

/**
 * @param {unknown} labels
 * @returns {string[]}
 */
export function extractApprovalTypes(labels) {
  const set = new Set(normalizeLabels(labels).map((l) => l.toLowerCase()));
  return APPROVAL_REASON_LABELS.filter((l) => set.has(l.toLowerCase()));
}

/**
 * Stable fingerprint for dedupe: issue/PR + approval types + material evidence.
 *
 * @param {{
 *   issueNumber?: number | null,
 *   prNumber?: number | null,
 *   approvalTypes?: string[],
 *   exactDecisionRequired?: string | null,
 *   action?: string | null,
 *   targetSha?: string | null,
 *   evidenceLinks?: string[],
 *   kind?: string | null,
 * }} input
 * @returns {string}
 */
export function buildNotifyFingerprint(input = {}) {
  const payload = {
    issue: input.issueNumber ?? null,
    pr: input.prNumber ?? null,
    types: [...(input.approvalTypes || [])].map((t) => t.toLowerCase()).sort(),
    decision: str(input.exactDecisionRequired).toLowerCase(),
    action: str(input.action).toLowerCase(),
    sha: str(input.targetSha).toLowerCase(),
    evidence: [...(input.evidenceLinks || [])].map((e) => str(e).toLowerCase()).sort(),
    kind: str(input.kind).toLowerCase() || 'needs_anton',
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 32);
}

/**
 * @param {{
 *   projectWorkstream: string,
 *   issueOrPrNumber: number | string,
 *   exactActionRequired: string,
 *   urgency: string,
 *   githubUrl: string,
 * }} input
 * @returns {string}
 */
export function formatAntonDecisionAlertMessage(input) {
  const project = str(input.projectWorkstream) || 'unspecified';
  const num = str(input.issueOrPrNumber) || '?';
  const action = str(input.exactActionRequired);
  const urgency = str(input.urgency) || 'normal';
  const link = str(input.githubUrl);
  if (!action || !link) return '';
  return [
    'CorpFlowAI Decision Inbox (exception only):',
    `- Project/workstream: ${project}`,
    `- Issue/PR: ${num}`,
    `- Action required: ${action}`,
    `- Urgency: ${urgency}`,
    `- Link: ${link}`,
  ].join('\n');
}

/**
 * In-memory dedupe store shape (tests / single-process). Production n8n should
 * persist fingerprints; this module evaluates policy only.
 *
 * @typedef {{ fingerprint: string, sentAtMs: number }} NotifyDedupeEntry
 */

/**
 * Decide whether to emit an exception alert.
 *
 * @param {{
 *   event: 'new_item' | 'decision_changed' | 'deadline_reached' | 'approved_action_failed',
 *   item?: {
 *     state?: string,
 *     labels?: unknown,
 *     number?: number,
 *     htmlUrl?: string | null,
 *     title?: string | null,
 *   },
 *   comments?: Array<{ body?: string | null }>,
 *   priorFingerprint?: string | null,
 *   dedupeStore?: NotifyDedupeEntry[],
 *   nowMs?: number,
 *   dedupeTtlMs?: number,
 *   urgency?: string | null,
 *   projectWorkstream?: string | null,
 * }} input
 * @returns {{
 *   shouldNotify: boolean,
 *   reason: string,
 *   fingerprint: string | null,
 *   message: string,
 *   meta: Record<string, unknown>,
 * }}
 */
export function evaluateAntonDecisionNotification(input) {
  const nowMs = Number.isFinite(input.nowMs) ? /** @type {number} */ (input.nowMs) : Date.now();
  const ttl = Number.isFinite(input.dedupeTtlMs)
    ? /** @type {number} */ (input.dedupeTtlMs)
    : DEFAULT_DEDUPE_TTL_MS;
  const event = str(input.event);
  const item = input.item || {};
  const labels = normalizeLabels(item.labels);
  const hasNeedsAnton = labels.map((l) => l.toLowerCase()).includes(LABEL_NEEDS_ANTON.toLowerCase());
  const approvalTypes = extractApprovalTypes(labels);
  const packet = parseDecisionPacketFromComments(input.comments || []);

  const project =
    str(input.projectWorkstream) ||
    str(packet?.projectWorkstream) ||
    str(item.title) ||
    'unspecified';
  const action =
    str(packet?.exactDecisionRequired) ||
    (approvalTypes[0] ? `Review ${approvalTypes[0]}` : '') ||
    (hasNeedsAnton ? 'Anton decision required' : '');
  const githubUrl = str(item.htmlUrl);
  const issueOrPr = item.number != null ? item.number : '?';

  if (!['new_item', 'decision_changed', 'deadline_reached', 'approved_action_failed'].includes(event)) {
    return {
      shouldNotify: false,
      reason: 'unsupported_event',
      fingerprint: null,
      message: '',
      meta: { event },
    };
  }

  if (event === 'new_item' && !hasNeedsAnton) {
    return {
      shouldNotify: false,
      reason: 'not_needs_anton',
      fingerprint: null,
      message: '',
      meta: { event },
    };
  }

  if (!action || !githubUrl) {
    return {
      shouldNotify: false,
      reason: 'blank_suppressed',
      fingerprint: null,
      message: '',
      meta: { event, hasAction: Boolean(action), hasUrl: Boolean(githubUrl) },
    };
  }

  const fingerprint = buildNotifyFingerprint({
    issueNumber: typeof item.number === 'number' ? item.number : null,
    prNumber: null,
    approvalTypes,
    exactDecisionRequired: action,
    action: packet?.action || approvalTypes[0] || null,
    targetSha: packet?.targetSha || null,
    evidenceLinks: packet?.evidenceLinks || [],
    kind: event,
  });

  const store = Array.isArray(input.dedupeStore) ? input.dedupeStore : [];
  const prior = str(input.priorFingerprint) || null;
  const recent = store.find(
    (e) => e.fingerprint === fingerprint && nowMs - Number(e.sentAtMs || 0) < ttl,
  );

  if (event === 'new_item' || event === 'decision_changed') {
    if (prior && prior === fingerprint) {
      return {
        shouldNotify: false,
        reason: 'unchanged_suppressed',
        fingerprint,
        message: '',
        meta: { event, fingerprint },
      };
    }
    if (recent) {
      return {
        shouldNotify: false,
        reason: 'dedupe_ttl_suppressed',
        fingerprint,
        message: '',
        meta: { event, fingerprint, sentAtMs: recent.sentAtMs },
      };
    }
  }

  if (event === 'decision_changed' && prior && prior === fingerprint) {
    return {
      shouldNotify: false,
      reason: 'no_material_change',
      fingerprint,
      message: '',
      meta: { event, fingerprint },
    };
  }

  const message = formatAntonDecisionAlertMessage({
    projectWorkstream: project,
    issueOrPrNumber: issueOrPr,
    exactActionRequired: action,
    urgency: str(input.urgency) || str(packet?.expiryOrUrgency) || 'normal',
    githubUrl,
  });

  if (!message) {
    return {
      shouldNotify: false,
      reason: 'blank_suppressed',
      fingerprint,
      message: '',
      meta: { event, fingerprint },
    };
  }

  return {
    shouldNotify: true,
    reason: event,
    fingerprint,
    message,
    meta: {
      schema: ANTON_DECISION_NOTIFY_SCHEMA,
      event,
      fingerprint,
      approvalTypes,
      issueNumber: item.number ?? null,
      githubUrl,
      audience: 'operator_only',
      client_send: false,
      contains_secrets: false,
    },
  };
}
