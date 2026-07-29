/**
 * Central Anton Decision Inbox — labels, decision packets, durable approvals,
 * exception-notify fingerprints, and protected-action gate checks.
 *
 * GitHub (labels + structured comments) is the durable source of truth.
 * Labels route work; they do **not** constitute protected approval.
 *
 * @see docs/operations/ANTON_DECISION_INBOX_V1.md
 * @see docs/operations/PROTECTED_ACTION_GATES_V1.md
 */

export const ANTON_DECISION_INBOX_SCHEMA = 'corpflow.anton_decision_inbox.v1';

/** Inbox routing label — every item requiring Anton. */
export const LABEL_NEEDS_ANTON = 'needs:anton';

/**
 * Reason labels (exactly one or more required with `needs:anton`).
 * Labels route; they are never durable approval by themselves.
 */
export const APPROVAL_REASON_LABELS = Object.freeze([
  'approval:merge',
  'approval:deploy',
  'approval:production',
  'approval:db-schema',
  'approval:env-secrets',
  'approval:external-send',
  'approval:payment',
  'approval:paid-tool',
  'approval:public-launch',
]);

/** All labels that must exist for the Decision Inbox. */
export const DECISION_INBOX_LABELS = Object.freeze([
  LABEL_NEEDS_ANTON,
  ...APPROVAL_REASON_LABELS,
]);

/** Default colours/descriptions when auto-creating missing inbox labels. */
export const DECISION_INBOX_LABEL_CREATE_DEFAULTS = Object.freeze({
  [LABEL_NEEDS_ANTON]: {
    color: 'd93f0b',
    description: 'Protected gate — Anton decision required',
  },
  'approval:merge': {
    color: 'fbca04',
    description: 'Anton decision: merge authority required',
  },
  'approval:deploy': {
    color: 'e99695',
    description: 'Anton decision: deploy authority required',
  },
  'approval:production': {
    color: 'b60205',
    description: 'Anton decision: production mutation required',
  },
  'approval:db-schema': {
    color: '5319e7',
    description: 'Anton decision: database/schema change required',
  },
  'approval:env-secrets': {
    color: '0052cc',
    description: 'Anton decision: env or secrets change required',
  },
  'approval:external-send': {
    color: '1d76db',
    description: 'Anton decision: live email/WhatsApp/SMS/outreach required',
  },
  'approval:payment': {
    color: '0e8a16',
    description: 'Anton decision: payment or money-moving action required',
  },
  'approval:paid-tool': {
    color: 'c5def5',
    description: 'Anton decision: paid vendor/tool activation required',
  },
  'approval:public-launch': {
    color: 'd4c5f9',
    description: 'Anton decision: public client-facing launch required',
  },
});

/**
 * Map dispatch protected-gate ids → Decision Inbox reason labels.
 * `none` has no reason label.
 */
export const PROTECTED_GATE_TO_APPROVAL_LABEL = Object.freeze({
  none: null,
  production: 'approval:production',
  database: 'approval:db-schema',
  secrets: 'approval:env-secrets',
  messaging: 'approval:external-send',
  payment: 'approval:payment',
  outreach: 'approval:external-send',
  paid_tool: 'approval:paid-tool',
  public_launch: 'approval:public-launch',
  merge: 'approval:merge',
  deploy: 'approval:deploy',
});

/** Marker for structured decision request packets on issues/PRs. */
export const DECISION_PACKET_MARKER = '### ANTON DECISION PACKET';

/** Marker for durable protected approvals (only this counts as unlock). */
export const DURABLE_APPROVAL_MARKER = '### ANTON DURABLE APPROVAL';

/** Marker that clears an inbox item after resolution. */
export const DECISION_RESOLVED_MARKER = '### ANTON DECISION RESOLVED';

const DECISION_PACKET_FIELDS = Object.freeze([
  'project_workstream',
  'business_outcome',
  'exact_decision_required',
  'recommended_decision',
  'consequence_of_approve',
  'consequence_of_reject_or_defer',
  'evidence_links',
  'urgency_or_expiry',
  'approval_type',
  'issue_or_pr',
  'target_sha',
  'target_environment',
]);

/**
 * @param {unknown} value
 * @returns {string}
 */
function str(value) {
  return value == null ? '' : String(value).trim();
}

/**
 * @param {unknown} labels
 * @returns {string[]}
 */
export function normalizeLabels(labels) {
  if (!Array.isArray(labels)) return [];
  return labels
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim();
      if (entry && typeof entry === 'object' && 'name' in entry) {
        return String(/** @type {{ name?: unknown }} */ (entry).name || '').trim();
      }
      return '';
    })
    .filter(Boolean);
}

/**
 * @param {string[]} labels
 * @returns {{ ok: boolean, reasonLabels: string[], errors: string[] }}
 */
export function validateNeedsAntonLabelSet(labels) {
  const normalized = normalizeLabels(labels);
  const errors = [];
  const hasNeeds = normalized.includes(LABEL_NEEDS_ANTON);
  const reasonLabels = normalized.filter((l) => APPROVAL_REASON_LABELS.includes(l));
  if (!hasNeeds) errors.push(`missing ${LABEL_NEEDS_ANTON}`);
  if (reasonLabels.length === 0) {
    errors.push('missing at least one approval:* reason label');
  }
  return { ok: errors.length === 0, reasonLabels, errors };
}

/**
 * GitHub search/query string for the active Decision Inbox.
 * Prefer Issues API + client-side label filter for colon labels (Search API is unreliable).
 *
 * @returns {string}
 */
export function buildActiveDecisionInboxQuery(repoFullName = 'antonvdberg-bit/corpflow-ai-command-center') {
  return `repo:${repoFullName} is:open label:"${LABEL_NEEDS_ANTON}"`;
}

/**
 * @param {string} approvalType e.g. approval:deploy or deploy
 * @returns {string | null} canonical approval:* label
 */
export function canonicalizeApprovalType(approvalType) {
  const raw = str(approvalType).toLowerCase();
  if (!raw) return null;
  if (APPROVAL_REASON_LABELS.includes(raw)) return raw;
  const withPrefix = raw.startsWith('approval:') ? raw : `approval:${raw}`;
  if (APPROVAL_REASON_LABELS.includes(withPrefix)) return withPrefix;
  const mapped = PROTECTED_GATE_TO_APPROVAL_LABEL[raw.replace(/-/g, '_')];
  return mapped || null;
}

/**
 * Parse `Key: value` lines from a marked comment block.
 * @param {string} body
 * @param {string} marker
 * @returns {Record<string, string> | null}
 */
export function parseMarkedKeyValueBlock(body, marker) {
  const text = String(body || '');
  const idx = text.indexOf(marker);
  if (idx < 0) return null;
  const after = text.slice(idx + marker.length);
  const nextHeading = after.search(/\n#{1,3}\s/);
  const block = nextHeading >= 0 ? after.slice(0, nextHeading) : after;
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of block.split('\n')) {
    const m = line.match(/^\s*[-*]?\s*([A-Za-z0-9_ /-]+)\s*:\s*(.+?)\s*$/);
    if (!m) continue;
    const key = m[1]
      .trim()
      .toLowerCase()
      .replace(/[ /]+/g, '_')
      .replace(/_+/g, '_');
    out[key] = m[2].trim();
  }
  return out;
}

/**
 * Format a Decision Inbox packet for posting on an issue/PR (or #249 pointer).
 * @param {Record<string, string | string[] | null | undefined>} fields
 * @returns {string}
 */
export function formatDecisionPacket(fields = {}) {
  const approvalType =
    canonicalizeApprovalType(fields.approval_type) || str(fields.approval_type) || 'approval:merge';
  const evidence = Array.isArray(fields.evidence_links)
    ? fields.evidence_links.filter(Boolean).join(', ')
    : str(fields.evidence_links) || 'none';
  return `${DECISION_PACKET_MARKER}

- project_workstream: ${str(fields.project_workstream) || 'unspecified'}
- business_outcome: ${str(fields.business_outcome) || 'unspecified'}
- exact_decision_required: ${str(fields.exact_decision_required) || 'unspecified'}
- recommended_decision: ${str(fields.recommended_decision) || 'unspecified'}
- consequence_of_approve: ${str(fields.consequence_of_approve) || 'unspecified'}
- consequence_of_reject_or_defer: ${str(fields.consequence_of_reject_or_defer) || 'unspecified'}
- evidence_links: ${evidence}
- urgency_or_expiry: ${str(fields.urgency_or_expiry) || 'none'}
- approval_type: ${approvalType}
- issue_or_pr: ${str(fields.issue_or_pr) || 'unspecified'}
- target_sha: ${str(fields.target_sha) || 'n/a'}
- target_environment: ${str(fields.target_environment) || 'n/a'}
`;
}

/**
 * @param {string} body
 * @returns {{ ok: boolean, packet: Record<string, string> | null, missing: string[] }}
 */
export function parseDecisionPacket(body) {
  const packet = parseMarkedKeyValueBlock(body, DECISION_PACKET_MARKER);
  if (!packet) return { ok: false, packet: null, missing: [...DECISION_PACKET_FIELDS] };
  const missing = DECISION_PACKET_FIELDS.filter((k) => !str(packet[k]));
  // urgency may be "none"; treat present key as ok when value is "none"
  const urgencyOk = Object.prototype.hasOwnProperty.call(packet, 'urgency_or_expiry');
  const filteredMissing = missing.filter((k) => {
    if (k === 'urgency_or_expiry' && urgencyOk) return false;
    if ((k === 'target_sha' || k === 'target_environment') && str(packet[k]) === 'n/a') return false;
    return true;
  });
  return { ok: filteredMissing.length === 0, packet, missing: filteredMissing };
}

/**
 * Format a durable approval that unlocks a protected action.
 * Only Anton (or ChatGPT recording Anton's explicit approval) may post this.
 *
 * @param {Record<string, string | null | undefined>} fields
 * @returns {string}
 */
export function formatDurableApproval(fields = {}) {
  const approvalType =
    canonicalizeApprovalType(fields.approval_type) || str(fields.approval_type) || '';
  return `${DURABLE_APPROVAL_MARKER}

- approver: ${str(fields.approver) || 'Anton'}
- approval_type: ${approvalType}
- issue_or_pr: ${str(fields.issue_or_pr) || ''}
- target_sha: ${str(fields.target_sha) || ''}
- target_environment: ${str(fields.target_environment) || ''}
- valid_until: ${str(fields.valid_until) || 'session'}
- decision: ${str(fields.decision) || 'approve'}
- recorded_at: ${str(fields.recorded_at) || new Date().toISOString()}
- notes: ${str(fields.notes) || 'none'}
`;
}

/**
 * @param {string} body
 * @returns {{ ok: boolean, approval: Record<string, string> | null, errors: string[] }}
 */
export function parseDurableApproval(body) {
  const approval = parseMarkedKeyValueBlock(body, DURABLE_APPROVAL_MARKER);
  if (!approval) return { ok: false, approval: null, errors: ['missing durable approval marker'] };
  const errors = [];
  const approvalType = canonicalizeApprovalType(approval.approval_type);
  if (!approvalType) errors.push('invalid or missing approval_type');
  if (!str(approval.approver)) errors.push('missing approver');
  if (!str(approval.issue_or_pr)) errors.push('missing issue_or_pr');
  if (!/approve/i.test(str(approval.decision))) errors.push('decision must be approve');
  // Labels alone never count — marker must be present (already checked).
  return {
    ok: errors.length === 0,
    approval: approvalType ? { ...approval, approval_type: approvalType } : approval,
    errors,
  };
}

/**
 * Format resolution that clears the item from the active inbox.
 * @param {Record<string, string | null | undefined>} fields
 */
export function formatDecisionResolved(fields = {}) {
  return `${DECISION_RESOLVED_MARKER}

- issue_or_pr: ${str(fields.issue_or_pr) || ''}
- approval_type: ${canonicalizeApprovalType(fields.approval_type) || str(fields.approval_type)}
- resolution: ${str(fields.resolution) || 'approved'}
- resolved_at: ${str(fields.resolved_at) || new Date().toISOString()}
- remove_labels: ${LABEL_NEEDS_ANTON}, ${canonicalizeApprovalType(fields.approval_type) || ''}
`;
}

/**
 * Whether an inbox item is still active (needs:anton present, not resolved for that type).
 * @param {{ labels?: unknown, comments?: Array<{ body?: string | null }> }} item
 * @param {string} [approvalType]
 */
export function isActiveDecisionInboxItem(item, approvalType) {
  const labels = normalizeLabels(item?.labels);
  if (!labels.includes(LABEL_NEEDS_ANTON)) return false;
  const want = canonicalizeApprovalType(approvalType);
  if (want && !labels.includes(want)) return false;
  const comments = Array.isArray(item?.comments) ? item.comments : [];
  for (const c of comments) {
    const body = str(c?.body);
    if (!body.includes(DECISION_RESOLVED_MARKER)) continue;
    const parsed = parseMarkedKeyValueBlock(body, DECISION_RESOLVED_MARKER);
    if (!parsed) continue;
    if (!want) return false;
    if (canonicalizeApprovalType(parsed.approval_type) === want) return false;
  }
  return true;
}

/**
 * What does NOT count as protected approval.
 * @param {{ labels?: unknown, ciGreen?: boolean, mergeable?: boolean, agentRecommendation?: boolean, silence?: boolean, oldApproval?: boolean, clientApproval?: boolean }} signals
 */
export function isNonApprovalSignal(signals = {}) {
  const labels = normalizeLabels(signals.labels);
  const hasApprovalLabelOnly =
    labels.some((l) => APPROVAL_REASON_LABELS.includes(l) || l === LABEL_NEEDS_ANTON) &&
    signals.ciGreen !== true &&
    !signals.mergeable;
  return Boolean(
    signals.silence ||
      signals.oldApproval ||
      signals.clientApproval ||
      signals.ciGreen ||
      signals.mergeable ||
      signals.agentRecommendation ||
      hasApprovalLabelOnly,
  );
}

/**
 * Check whether a protected action may proceed given comments + required scope.
 *
 * @param {{
 *   action: string,
 *   issueOrPr: string,
 *   targetSha?: string | null,
 *   targetEnvironment?: string | null,
 *   comments?: Array<{ body?: string | null, author?: string | null, createdAt?: string | null }>,
 *   nowIso?: string,
 * }} opts
 * @returns {{ allowed: boolean, reason: string, approval: Record<string, string> | null }}
 */
export function evaluateProtectedActionGate(opts) {
  const action = canonicalizeApprovalType(opts.action) || str(opts.action);
  if (!action || !APPROVAL_REASON_LABELS.includes(action)) {
    return { allowed: false, reason: 'unknown or unsupported protected action', approval: null };
  }
  const comments = Array.isArray(opts.comments) ? opts.comments : [];
  const now = Date.parse(opts.nowIso || new Date().toISOString());
  /** @type {Record<string, string> | null} */
  let matched = null;
  for (const c of comments) {
    const parsed = parseDurableApproval(str(c?.body));
    if (!parsed.ok || !parsed.approval) continue;
    if (parsed.approval.approval_type !== action) continue;
    if (str(parsed.approval.issue_or_pr) !== str(opts.issueOrPr)) continue;
    if (opts.targetSha && str(parsed.approval.target_sha) && str(parsed.approval.target_sha) !== str(opts.targetSha)) {
      continue;
    }
    if (
      opts.targetEnvironment &&
      str(parsed.approval.target_environment) &&
      str(parsed.approval.target_environment).toLowerCase() !== str(opts.targetEnvironment).toLowerCase()
    ) {
      continue;
    }
    const validUntil = str(parsed.approval.valid_until);
    if (validUntil && validUntil !== 'session' && !Number.isNaN(Date.parse(validUntil))) {
      if (Date.parse(validUntil) < now) continue;
    }
    matched = parsed.approval;
    break;
  }
  if (!matched) {
    return {
      allowed: false,
      reason: `blocked: no durable ${action} approval for ${str(opts.issueOrPr)}`,
      approval: null,
    };
  }
  return { allowed: true, reason: 'durable approval matched', approval: matched };
}

/**
 * Exception-notify fingerprint: issue/PR + approval type + evidence hash.
 * Deduplicate identical alerts until state changes.
 *
 * @param {{ issueOrPr: string | number, approvalType: string, evidenceFingerprint: string, kind?: string }} input
 * @returns {string}
 */
export function buildExceptionNotifyFingerprint(input) {
  const kind = str(input.kind) || 'needs_anton';
  const issue = str(input.issueOrPr);
  const type = canonicalizeApprovalType(input.approvalType) || str(input.approvalType);
  const evidence = str(input.evidenceFingerprint);
  return `${kind}|${issue}|${type}|${evidence}`;
}

/**
 * Format Telegram/n8n exception alert body (no secrets, no private client data).
 * @param {Record<string, string | number | null | undefined>} fields
 * @returns {{ ok: boolean, text: string, errors: string[] }}
 */
export function formatExceptionNotifyMessage(fields = {}) {
  const errors = [];
  const project = str(fields.project_workstream);
  const issueOrPr = str(fields.issue_or_pr);
  const action = str(fields.exact_action_required) || str(fields.approval_type);
  const urgency = str(fields.urgency) || 'normal';
  const link = str(fields.github_link);
  if (!project) errors.push('missing project_workstream');
  if (!issueOrPr) errors.push('missing issue_or_pr');
  if (!action) errors.push('missing exact_action_required');
  if (!link) errors.push('missing github_link');
  if (/secret|password|token|api[_-]?key|bearer\s/i.test(`${project}\n${action}\n${link}`)) {
    errors.push('message must not contain secret-like content');
  }
  if (errors.length) return { ok: false, text: '', errors };
  const text = [
    'ANTON DECISION INBOX',
    `Project: ${project}`,
    `Issue/PR: ${issueOrPr}`,
    `Action: ${action}`,
    `Urgency: ${urgency}`,
    `Link: ${link}`,
  ].join('\n');
  if (!text.trim()) return { ok: false, text: '', errors: ['blank message'] };
  return { ok: true, text, errors: [] };
}

/**
 * Decide whether to send an exception notification (dedupe + nonblank).
 * @param {{
 *   fingerprint: string,
 *   priorFingerprints?: string[],
 *   messageOk: boolean,
 *   blank?: boolean,
 * }} opts
 */
export function shouldSendExceptionNotification(opts) {
  if (opts.blank || !opts.messageOk) {
    return { send: false, reason: 'blank or invalid message' };
  }
  const prior = Array.isArray(opts.priorFingerprints) ? opts.priorFingerprints : [];
  if (prior.includes(opts.fingerprint)) {
    return { send: false, reason: 'duplicate fingerprint — suppress until state changes' };
  }
  return { send: true, reason: 'new exception state' };
}

/**
 * Audit record shape for who approved what.
 * @param {Record<string, string | null | undefined>} fields
 */
export function buildApprovalAuditRecord(fields = {}) {
  return {
    schema: ANTON_DECISION_INBOX_SCHEMA,
    approver: str(fields.approver) || null,
    approval_type: canonicalizeApprovalType(fields.approval_type) || str(fields.approval_type) || null,
    issue_or_pr: str(fields.issue_or_pr) || null,
    target_sha: str(fields.target_sha) || null,
    target_environment: str(fields.target_environment) || null,
    recorded_at: str(fields.recorded_at) || new Date().toISOString(),
    resulting_run_or_deployment: str(fields.resulting_run_or_deployment) || null,
    decision: str(fields.decision) || null,
  };
}

/**
 * Synthetic gate matrix used by unit tests / dry-run workflows.
 * @param {string} action
 * @param {boolean} hasDurableApproval
 */
export function syntheticProtectedActionResult(action, hasDurableApproval) {
  const canonical = canonicalizeApprovalType(action);
  if (!canonical) {
    return { action, blocked: true, reason: 'unknown action' };
  }
  if (!hasDurableApproval) {
    return { action: canonical, blocked: true, reason: 'no durable approval' };
  }
  return { action: canonical, blocked: false, reason: 'durable approval present' };
}
