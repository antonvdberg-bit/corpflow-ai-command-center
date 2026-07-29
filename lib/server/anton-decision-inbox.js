/**
 * Central Anton Decision Inbox — labels, decision packets, durable approvals.
 *
 * GitHub is the durable source of truth. Labels route work into the inbox;
 * only a scoped durable approval marker (not labels alone) authorizes
 * protected consequential actions.
 *
 * @see docs/operations/ANTON_DECISION_INBOX_V1.md
 * @see docs/operations/OPERATOR_BRIDGE_V1.md (reuse #249 — no second control plane)
 */

export const ANTON_DECISION_INBOX_SCHEMA = 'corpflow.anton_decision_inbox.v1';
export const ANTON_DECISION_PACKET_SCHEMA = 'corpflow.anton_decision_packet.v1';
export const PROTECTED_APPROVAL_SCHEMA = 'corpflow.protected_approval.v1';

/** Inbox routing label — every item requiring Anton. */
export const LABEL_NEEDS_ANTON = 'needs:anton';

/** Reason labels — one or more required alongside needs:anton. */
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

/** @type {Readonly<Record<string, { color: string, description: string }>>} */
export const APPROVAL_LABEL_CREATE_DEFAULTS = Object.freeze({
  [LABEL_NEEDS_ANTON]: {
    color: 'd93f0b',
    description: 'Protected gate — Anton decision required',
  },
  'approval:merge': {
    color: 'b60205',
    description: 'Anton approval required: merge to protected branch',
  },
  'approval:deploy': {
    color: 'b60205',
    description: 'Anton approval required: production deploy',
  },
  'approval:production': {
    color: 'b60205',
    description: 'Anton approval required: production mutation',
  },
  'approval:db-schema': {
    color: 'b60205',
    description: 'Anton approval required: DB/schema change',
  },
  'approval:env-secrets': {
    color: 'b60205',
    description: 'Anton approval required: env or secrets change',
  },
  'approval:external-send': {
    color: 'b60205',
    description: 'Anton approval required: live email/WhatsApp/SMS/outreach',
  },
  'approval:payment': {
    color: 'b60205',
    description: 'Anton approval required: payment action',
  },
  'approval:paid-tool': {
    color: 'b60205',
    description: 'Anton approval required: paid vendor/tool activation',
  },
  'approval:public-launch': {
    color: 'b60205',
    description: 'Anton approval required: public client-facing launch',
  },
});

/** All labels the Decision Inbox expects to exist (auto-created by workflows). */
export const ANTON_DECISION_INBOX_LABELS = Object.freeze([
  LABEL_NEEDS_ANTON,
  ...APPROVAL_REASON_LABELS,
]);

/**
 * Map protected-gate / action keys → approval reason label.
 * @type {Readonly<Record<string, string>>}
 */
export const ACTION_TO_APPROVAL_LABEL = Object.freeze({
  merge: 'approval:merge',
  deploy: 'approval:deploy',
  production: 'approval:production',
  'db-schema': 'approval:db-schema',
  database: 'approval:db-schema',
  'env-secrets': 'approval:env-secrets',
  secrets: 'approval:env-secrets',
  'external-send': 'approval:external-send',
  messaging: 'approval:external-send',
  outreach: 'approval:external-send',
  payment: 'approval:payment',
  'paid-tool': 'approval:paid-tool',
  paid_tool: 'approval:paid-tool',
  'public-launch': 'approval:public-launch',
  launch: 'approval:public-launch',
});

/** Canonical protected action keys used in durable approvals. */
export const PROTECTED_ACTIONS = Object.freeze([
  'merge',
  'deploy',
  'production',
  'db-schema',
  'env-secrets',
  'external-send',
  'payment',
  'paid-tool',
  'public-launch',
]);

/**
 * GitHub search / Issues filter for the active Decision Inbox.
 * Labels with colons are unreliable in Search API — prefer Issues filter UI
 * or GraphQL with label names; this string is the operator-facing query.
 */
export const ANTON_DECISION_INBOX_QUERY =
  'is:open label:"needs:anton" -label:dispatch:blocked';

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
 * @returns {{ ok: boolean, needsAnton: boolean, reasonLabels: string[], missingReason: boolean, errors: string[] }}
 */
export function validateInboxLabels(labels) {
  const normalized = normalizeLabels(labels);
  const lower = new Set(normalized.map((l) => l.toLowerCase()));
  const needsAnton = lower.has(LABEL_NEEDS_ANTON.toLowerCase());
  const reasonLabels = APPROVAL_REASON_LABELS.filter((l) => lower.has(l.toLowerCase()));
  /** @type {string[]} */
  const errors = [];
  if (!needsAnton) errors.push(`Missing required label ${LABEL_NEEDS_ANTON}`);
  if (needsAnton && reasonLabels.length === 0) {
    errors.push('needs:anton requires one or more approval:* reason labels');
  }
  return {
    ok: errors.length === 0,
    needsAnton,
    reasonLabels,
    missingReason: needsAnton && reasonLabels.length === 0,
    errors,
  };
}

/**
 * @param {string} action
 * @returns {string | null}
 */
export function approvalLabelForAction(action) {
  const key = String(action || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');
  return ACTION_TO_APPROVAL_LABEL[key] || ACTION_TO_APPROVAL_LABEL[String(action || '').trim()] || null;
}

/**
 * @typedef {{
 *   schema: string,
 *   projectWorkstream: string,
 *   businessOutcome: string,
 *   exactDecisionRequired: string,
 *   recommendedDecision: string,
 *   consequenceApprove: string,
 *   consequenceRejectDefer: string,
 *   evidenceLinks: string[],
 *   expiryOrUrgency: string | null,
 *   action: string,
 *   issueOrPr: string | null,
 *   environment: string | null,
 *   targetSha: string | null,
 * }} AntonDecisionPacket
 */

/**
 * @param {Partial<AntonDecisionPacket> & Record<string, unknown>} input
 * @returns {{ ok: boolean, packet: AntonDecisionPacket | null, errors: string[] }}
 */
export function buildDecisionPacket(input = {}) {
  /** @type {string[]} */
  const errors = [];
  const str = (v) => (v == null ? '' : String(v).trim());
  const projectWorkstream = str(input.projectWorkstream);
  const businessOutcome = str(input.businessOutcome);
  const exactDecisionRequired = str(input.exactDecisionRequired);
  const recommendedDecision = str(input.recommendedDecision);
  const consequenceApprove = str(input.consequenceApprove);
  const consequenceRejectDefer = str(input.consequenceRejectDefer);
  const action = str(input.action).toLowerCase().replace(/_/g, '-');
  const evidenceLinks = Array.isArray(input.evidenceLinks)
    ? input.evidenceLinks.map((l) => str(l)).filter(Boolean)
    : [];

  if (!projectWorkstream) errors.push('projectWorkstream is required');
  if (!businessOutcome) errors.push('businessOutcome is required');
  if (!exactDecisionRequired) errors.push('exactDecisionRequired is required');
  if (!recommendedDecision) errors.push('recommendedDecision is required');
  if (!consequenceApprove) errors.push('consequenceApprove is required');
  if (!consequenceRejectDefer) errors.push('consequenceRejectDefer is required');
  if (!action || !PROTECTED_ACTIONS.includes(/** @type {*} */ (action))) {
    errors.push(`action must be one of: ${PROTECTED_ACTIONS.join(', ')}`);
  }

  if (errors.length) return { ok: false, packet: null, errors };

  return {
    ok: true,
    packet: {
      schema: ANTON_DECISION_PACKET_SCHEMA,
      projectWorkstream,
      businessOutcome,
      exactDecisionRequired,
      recommendedDecision,
      consequenceApprove,
      consequenceRejectDefer,
      evidenceLinks,
      expiryOrUrgency: str(input.expiryOrUrgency) || null,
      action,
      issueOrPr: str(input.issueOrPr) || null,
      environment: str(input.environment) || null,
      targetSha: str(input.targetSha) || null,
    },
    errors: [],
  };
}

/**
 * @param {AntonDecisionPacket} packet
 * @returns {string}
 */
export function formatDecisionPacketMarkdown(packet) {
  const evidence =
    packet.evidenceLinks.length > 0
      ? packet.evidenceLinks.map((l) => `- ${l}`).join('\n')
      : '- (none yet)';
  const machine = {
    schema: ANTON_DECISION_PACKET_SCHEMA,
    projectWorkstream: packet.projectWorkstream,
    businessOutcome: packet.businessOutcome,
    exactDecisionRequired: packet.exactDecisionRequired,
    recommendedDecision: packet.recommendedDecision,
    consequenceApprove: packet.consequenceApprove,
    consequenceRejectDefer: packet.consequenceRejectDefer,
    evidenceLinks: packet.evidenceLinks,
    expiryOrUrgency: packet.expiryOrUrgency,
    action: packet.action,
    issueOrPr: packet.issueOrPr,
    environment: packet.environment,
    targetSha: packet.targetSha,
  };
  return [
    '## Anton decision packet',
    '',
    `**Project / workstream:** ${packet.projectWorkstream}`,
    `**Business outcome:** ${packet.businessOutcome}`,
    `**Exact decision required:** ${packet.exactDecisionRequired}`,
    `**Recommended decision:** ${packet.recommendedDecision}`,
    `**Consequence of approve:** ${packet.consequenceApprove}`,
    `**Consequence of reject/defer:** ${packet.consequenceRejectDefer}`,
    `**Action:** ${packet.action}`,
    `**Issue/PR:** ${packet.issueOrPr || 'n/a'}`,
    `**Environment:** ${packet.environment || 'n/a'}`,
    `**Target SHA:** ${packet.targetSha || 'n/a'}`,
    `**Expiry / urgency:** ${packet.expiryOrUrgency || 'none'}`,
    '',
    '### Evidence',
    evidence,
    '',
    `<!-- ${ANTON_DECISION_PACKET_SCHEMA} ${JSON.stringify(machine)} -->`,
  ].join('\n');
}

/**
 * Parse the newest machine decision packet from issue/PR comment bodies.
 * @param {Array<{ body?: string | null }> | string[]} comments
 * @returns {AntonDecisionPacket | null}
 */
export function parseDecisionPacketFromComments(comments) {
  const bodies = Array.isArray(comments)
    ? comments.map((c) => (typeof c === 'string' ? c : String(c?.body || '')))
    : [];
  const marker = `<!-- ${ANTON_DECISION_PACKET_SCHEMA} `;
  for (let i = bodies.length - 1; i >= 0; i -= 1) {
    const body = bodies[i];
    const idx = body.lastIndexOf(marker);
    if (idx < 0) continue;
    const start = idx + marker.length;
    const end = body.indexOf(' -->', start);
    if (end < 0) continue;
    try {
      const raw = JSON.parse(body.slice(start, end));
      const built = buildDecisionPacket(raw);
      if (built.ok) return built.packet;
    } catch {
      // continue
    }
  }
  return null;
}

/**
 * @typedef {{
 *   schema: string,
 *   approver: string,
 *   decision: 'approve' | 'reject' | 'defer',
 *   action: string,
 *   issueNumber: number | null,
 *   prNumber: number | null,
 *   targetSha: string | null,
 *   environment: string | null,
 *   validUntil: string | null,
 *   recordedAt: string,
 *   source: 'github' | 'chatgpt_mirrored',
 * }} ProtectedApprovalMarker
 */

/**
 * @param {Partial<ProtectedApprovalMarker> & Record<string, unknown>} input
 * @returns {{ ok: boolean, marker: ProtectedApprovalMarker | null, errors: string[] }}
 */
export function buildProtectedApprovalMarker(input = {}) {
  /** @type {string[]} */
  const errors = [];
  const str = (v) => (v == null ? '' : String(v).trim());
  const decision = str(input.decision).toLowerCase();
  const action = str(input.action).toLowerCase().replace(/_/g, '-');
  const approver = str(input.approver);
  const source = str(input.source) || 'github';

  if (!approver) errors.push('approver is required');
  if (!['approve', 'reject', 'defer'].includes(decision)) {
    errors.push('decision must be approve | reject | defer');
  }
  if (!PROTECTED_ACTIONS.includes(/** @type {*} */ (action))) {
    errors.push(`action must be one of: ${PROTECTED_ACTIONS.join(', ')}`);
  }
  if (!['github', 'chatgpt_mirrored'].includes(source)) {
    errors.push('source must be github | chatgpt_mirrored');
  }

  if (errors.length) return { ok: false, marker: null, errors };

  return {
    ok: true,
    marker: {
      schema: PROTECTED_APPROVAL_SCHEMA,
      approver,
      decision: /** @type {'approve' | 'reject' | 'defer'} */ (decision),
      action,
      issueNumber:
        input.issueNumber != null && Number.isFinite(Number(input.issueNumber))
          ? Number(input.issueNumber)
          : null,
      prNumber:
        input.prNumber != null && Number.isFinite(Number(input.prNumber))
          ? Number(input.prNumber)
          : null,
      targetSha: str(input.targetSha) || null,
      environment: str(input.environment) || null,
      validUntil: str(input.validUntil) || null,
      recordedAt: str(input.recordedAt) || new Date().toISOString(),
      source: /** @type {'github' | 'chatgpt_mirrored'} */ (source),
    },
    errors: [],
  };
}

/**
 * @param {ProtectedApprovalMarker} marker
 * @returns {string}
 */
export function formatProtectedApprovalMarkdown(marker) {
  return [
    `### Protected approval — ${marker.recordedAt}`,
    '',
    `**Approver:** ${marker.approver}`,
    `**Decision:** ${marker.decision}`,
    `**Action:** ${marker.action}`,
    `**Issue:** ${marker.issueNumber != null ? `#${marker.issueNumber}` : 'n/a'}`,
    `**PR:** ${marker.prNumber != null ? `#${marker.prNumber}` : 'n/a'}`,
    `**Target SHA:** ${marker.targetSha || 'n/a'}`,
    `**Environment:** ${marker.environment || 'n/a'}`,
    `**Valid until:** ${marker.validUntil || 'none'}`,
    `**Source:** ${marker.source}`,
    '',
    `<!-- ${PROTECTED_APPROVAL_SCHEMA} ${JSON.stringify(marker)} -->`,
  ].join('\n');
}

/**
 * @param {Array<{ body?: string | null }> | string[]} comments
 * @returns {ProtectedApprovalMarker[]}
 */
export function parseProtectedApprovalsFromComments(comments) {
  const bodies = Array.isArray(comments)
    ? comments.map((c) => (typeof c === 'string' ? c : String(c?.body || '')))
    : [];
  const markerPrefix = `<!-- ${PROTECTED_APPROVAL_SCHEMA} `;
  /** @type {ProtectedApprovalMarker[]} */
  const out = [];
  for (const body of bodies) {
    let from = 0;
    while (from < body.length) {
      const idx = body.indexOf(markerPrefix, from);
      if (idx < 0) break;
      const start = idx + markerPrefix.length;
      const end = body.indexOf(' -->', start);
      if (end < 0) break;
      from = end + 4;
      try {
        const raw = JSON.parse(body.slice(start, end));
        const built = buildProtectedApprovalMarker(raw);
        if (built.ok && built.marker) out.push(built.marker);
      } catch {
        // skip malformed
      }
    }
  }
  return out;
}

/**
 * Labels alone never authorize a protected action.
 *
 * @param {{
 *   action: string,
 *   labels?: unknown,
 *   comments?: Array<{ body?: string | null }> | string[],
 *   issueNumber?: number | null,
 *   prNumber?: number | null,
 *   targetSha?: string | null,
 *   environment?: string | null,
 *   now?: Date | string | number,
 *   allowedApprovers?: string[],
 * }} input
 * @returns {{
 *   allowed: boolean,
 *   reason: string,
 *   matched: ProtectedApprovalMarker | null,
 *   labelPresent: boolean,
 *   audit: Record<string, unknown>,
 * }}
 */
export function evaluateProtectedApproval(input) {
  const action = String(input.action || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');
  const label = approvalLabelForAction(action);
  const labels = normalizeLabels(input.labels).map((l) => l.toLowerCase());
  const labelPresent = Boolean(label && labels.includes(label.toLowerCase()));
  const needsAnton = labels.includes(LABEL_NEEDS_ANTON.toLowerCase());
  const allowedApprovers = (input.allowedApprovers || ['anton', 'anton van den berg', 'antonvdberg-bit']).map(
    (a) => a.toLowerCase(),
  );
  const nowMs = input.now != null ? new Date(input.now).getTime() : Date.now();
  const markers = parseProtectedApprovalsFromComments(input.comments || []);

  const audit = {
    action,
    label,
    labelPresent,
    needsAnton,
    markerCount: markers.length,
    issueNumber: input.issueNumber ?? null,
    prNumber: input.prNumber ?? null,
    targetSha: input.targetSha ?? null,
    environment: input.environment ?? null,
    evaluatedAt: new Date(nowMs).toISOString(),
  };

  // Explicit rule: labels route work but do not constitute protected approval.
  if (markers.length === 0) {
    return {
      allowed: false,
      reason: labelPresent
        ? `Label ${label} is present but no durable ${PROTECTED_APPROVAL_SCHEMA} marker found — labels alone are not approval`
        : `No durable approval marker for action=${action}`,
      matched: null,
      labelPresent,
      audit,
    };
  }

  /** @type {ProtectedApprovalMarker[]} */
  const candidates = markers.filter((m) => {
    if (m.decision !== 'approve') return false;
    if (m.action !== action) return false;
    if (!allowedApprovers.some((a) => m.approver.toLowerCase().includes(a) || a.includes(m.approver.toLowerCase()))) {
      return false;
    }
    if (input.issueNumber != null && m.issueNumber != null && Number(m.issueNumber) !== Number(input.issueNumber)) {
      return false;
    }
    if (input.prNumber != null && m.prNumber != null && Number(m.prNumber) !== Number(input.prNumber)) {
      return false;
    }
    if (input.targetSha) {
      const want = String(input.targetSha).toLowerCase();
      const got = String(m.targetSha || '').toLowerCase();
      if (!got || !(want.startsWith(got) || got.startsWith(want))) return false;
    }
    if (input.environment) {
      const wantEnv = String(input.environment).toLowerCase();
      const gotEnv = String(m.environment || '').toLowerCase();
      if (!gotEnv || gotEnv !== wantEnv) return false;
    }
    if (m.validUntil) {
      const until = Date.parse(m.validUntil);
      if (Number.isFinite(until) && until < nowMs) return false;
    }
    return true;
  });

  if (!candidates.length) {
    return {
      allowed: false,
      reason: `No scoped durable approve marker matched action=${action} (SHA/env/issue/PR/approver/validity)`,
      matched: null,
      labelPresent,
      audit: { ...audit, rejectedMarkers: markers.length },
    };
  }

  const matched = candidates[candidates.length - 1];
  return {
    allowed: true,
    reason: `Durable approval by ${matched.approver} for ${matched.action} at ${matched.recordedAt}`,
    matched,
    labelPresent,
    audit: {
      ...audit,
      approver: matched.approver,
      recordedAt: matched.recordedAt,
      source: matched.source,
      targetSha: matched.targetSha,
      environment: matched.environment,
      result: 'allowed',
    },
  };
}

/**
 * Active inbox membership: open + needs:anton + not blocked.
 * Cleared when needs:anton is removed or issue closed (operator / automation).
 *
 * @param {{ state?: string, labels?: unknown }} item
 * @returns {boolean}
 */
export function isActiveInboxItem(item) {
  const state = String(item?.state || 'open').toLowerCase();
  if (state !== 'open') return false;
  const labels = normalizeLabels(item?.labels).map((l) => l.toLowerCase());
  if (labels.includes('dispatch:blocked')) return false;
  return labels.includes(LABEL_NEEDS_ANTON.toLowerCase());
}
