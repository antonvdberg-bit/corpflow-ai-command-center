/**
 * Durable operator gate authorization for Cursor issue dispatch.
 *
 * Protected-gate claim holds are lifted only when the latest valid
 * machine-readable (or equivalent durable GitHub) authorization for that
 * exact gate is `approve`. A newer reject/revoke wins. Authorization for one
 * gate never unlocks another.
 *
 * @see docs/operations/CURSOR_ISSUE_DISPATCH_LIFECYCLE_V1.md
 * @see docs/operations/ANTON_DECISION_INBOX_V1.md
 */

import {
  DURABLE_APPROVAL_MARKER,
  PROTECTED_GATE_TO_APPROVAL_LABEL,
  canonicalizeApprovalType,
  parseDurableApproval,
  parseMarkedKeyValueBlock,
} from './anton-decision-inbox.js';

export const OPERATOR_GATE_AUTHORIZATION_SCHEMA = 'corpflow.operator_gate_authorization.v1';

/** Human-readable durable marker on issue comments / body. */
export const OPERATOR_GATE_AUTHORIZATION_MARKER = '### OPERATOR GATE AUTHORIZATION';

/** HTML comment prefix for machine-readable JSON records. */
export const OPERATOR_GATE_AUTHORIZATION_HTML_PREFIX =
  '<!-- corpflow.operator_gate_authorization.v1';

/** GitHub logins trusted as operator author for free-form unlock evidence. */
export const OPERATOR_GATE_AUTHOR_LOGINS = Object.freeze(['antonvdberg-bit']);

/** Approver names accepted in structured records (case-insensitive). */
export const OPERATOR_GATE_APPROVER_NAMES = Object.freeze([
  'anton',
  'anton van den berg',
  'antonvdberg-bit',
]);

const VALID_GATES = Object.freeze(
  Object.keys(PROTECTED_GATE_TO_APPROVAL_LABEL).filter((g) => g !== 'none'),
);

const DECISION_APPROVE = 'approve';
const DECISION_REJECT = 'reject';
const DECISION_REVOKE = 'revoke';

/**
 * @param {unknown} value
 * @returns {string}
 */
function str(value) {
  return value == null ? '' : String(value).trim();
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function toIssueNumber(value) {
  const raw = str(value);
  if (!raw) return null;
  const m = raw.match(/#?(\d+)\b/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * @param {string} gate
 * @returns {string | null}
 */
export function canonicalizeProtectedGate(gate) {
  const raw = str(gate)
    .toLowerCase()
    .replace(/-/g, '_')
    .replace(/\s+/g, '_');
  if (!raw || raw === 'none') return null;
  if (VALID_GATES.includes(raw)) return raw;
  const aliases = {
    db: 'database',
    db_schema: 'database',
    schema: 'database',
    env: 'secrets',
    env_secrets: 'secrets',
    secret: 'secrets',
    external_send: 'messaging',
    client_production: 'production',
  };
  const mapped = aliases[raw];
  return mapped && VALID_GATES.includes(mapped) ? mapped : null;
}

/**
 * @param {string} decision
 * @returns {'approve' | 'reject' | 'revoke' | null}
 */
export function canonicalizeGateDecision(decision) {
  const raw = str(decision).toLowerCase();
  if (!raw) return null;
  if (/^(approve|approved|allow|allowed|unlock|authorize|authorized)$/.test(raw)) {
    return DECISION_APPROVE;
  }
  if (/^(reject|rejected|deny|denied)$/.test(raw)) return DECISION_REJECT;
  if (/^(revoke|revoked|rescind|rescinded|withdraw|withdrawn)$/.test(raw)) {
    return DECISION_REVOKE;
  }
  return null;
}

/**
 * @param {string | null | undefined} author
 * @param {string | null | undefined} approver
 * @returns {boolean}
 */
export function isTrustedOperatorIdentity(author, approver) {
  const login = str(author).toLowerCase();
  if (login && OPERATOR_GATE_AUTHOR_LOGINS.includes(login)) return true;
  const name = str(approver).toLowerCase();
  if (name && OPERATOR_GATE_APPROVER_NAMES.includes(name)) return true;
  if (name.startsWith('anton')) return true;
  return false;
}

/**
 * @param {Record<string, string | number | null | undefined>} fields
 * @returns {string}
 */
export function formatOperatorGateAuthorization(fields = {}) {
  const issue = toIssueNumber(fields.issue ?? fields.issue_number ?? fields.issue_or_pr);
  const gate = canonicalizeProtectedGate(String(fields.gate || '')) || str(fields.gate);
  const decision = canonicalizeGateDecision(String(fields.decision || '')) || DECISION_APPROVE;
  const author = str(fields.author) || str(fields.approver) || 'Anton';
  const recordedAt = str(fields.recorded_at || fields.recordedAt) || new Date().toISOString();
  const record = {
    schema: OPERATOR_GATE_AUTHORIZATION_SCHEMA,
    issue: issue,
    gate,
    author,
    decision,
    recordedAt,
    notes: str(fields.notes) || null,
  };
  const human = `${OPERATOR_GATE_AUTHORIZATION_MARKER}

- issue: #${issue || ''}
- gate: ${gate}
- author: ${author}
- decision: ${decision}
- recorded_at: ${recordedAt}
- notes: ${str(fields.notes) || 'none'}
`;
  return `${human}\n${OPERATOR_GATE_AUTHORIZATION_HTML_PREFIX} ${JSON.stringify(record)} -->\n`;
}

/**
 * @param {string} body
 * @returns {Array<{
 *   issue: number | null,
 *   gate: string | null,
 *   author: string | null,
 *   decision: 'approve' | 'reject' | 'revoke' | null,
 *   recordedAt: string | null,
 *   source: string,
 *   notes?: string | null,
 * }>}
 */
export function parseOperatorGateAuthorizationRecords(body) {
  const text = String(body || '');
  /** @type {Array<{
   *   issue: number | null,
   *   gate: string | null,
   *   author: string | null,
   *   decision: 'approve' | 'reject' | 'revoke' | null,
   *   recordedAt: string | null,
   *   source: string,
   *   notes?: string | null,
   * }>} */
  const out = [];

  const htmlRe =
    /<!--\s*corpflow\.operator_gate_authorization\.v1\s+(\{[\s\S]*?\})\s*-->/gi;
  let htmlMatch;
  while ((htmlMatch = htmlRe.exec(text)) !== null) {
    try {
      const json = JSON.parse(htmlMatch[1]);
      out.push({
        issue: toIssueNumber(json.issue ?? json.issueNumber ?? json.issue_or_pr),
        gate: canonicalizeProtectedGate(String(json.gate || '')),
        author: str(json.author || json.approver) || null,
        decision: canonicalizeGateDecision(String(json.decision || '')),
        recordedAt: str(json.recordedAt || json.recorded_at) || null,
        source: 'html_json',
        notes: str(json.notes) || null,
      });
    } catch {
      // ignore malformed JSON markers
    }
  }

  if (text.includes(OPERATOR_GATE_AUTHORIZATION_MARKER)) {
    const parsed = parseMarkedKeyValueBlock(text, OPERATOR_GATE_AUTHORIZATION_MARKER);
    if (parsed) {
      out.push({
        issue: toIssueNumber(parsed.issue || parsed.issue_number || parsed.issue_or_pr),
        gate: canonicalizeProtectedGate(parsed.gate || parsed.protected_gate || ''),
        author: str(parsed.author || parsed.approver) || null,
        decision: canonicalizeGateDecision(parsed.decision || ''),
        recordedAt: str(parsed.recorded_at || parsed.recordedAt) || null,
        source: 'marker_block',
        notes: str(parsed.notes) || null,
      });
    }
  }

  return out;
}

/**
 * Map Decision Inbox durable approval → dispatcher gate authorization.
 *
 * @param {string} body
 * @param {{ author?: string | null, created_at?: string | null }} [meta]
 */
export function parseDurableApprovalAsGateAuthorization(body, meta = {}) {
  if (!String(body || '').includes(DURABLE_APPROVAL_MARKER)) return [];
  const parsed = parseDurableApproval(body);
  if (!parsed.ok || !parsed.approval) {
    // Still accept reject/revoke decisions that parseDurableApproval rejects.
    const raw = parseMarkedKeyValueBlock(body, DURABLE_APPROVAL_MARKER);
    if (!raw) return [];
    const decision = canonicalizeGateDecision(raw.decision || '');
    if (decision !== DECISION_REJECT && decision !== DECISION_REVOKE) return [];
    const approvalType = canonicalizeApprovalType(raw.approval_type);
    const gate = gateFromApprovalLabel(approvalType);
    if (!gate) return [];
    return [
      {
        issue: toIssueNumber(raw.issue_or_pr),
        gate,
        author: str(raw.approver) || str(meta.author) || null,
        decision,
        recordedAt: str(raw.recorded_at) || str(meta.created_at) || null,
        source: 'durable_approval',
        notes: str(raw.notes) || null,
      },
    ];
  }
  const gate = gateFromApprovalLabel(parsed.approval.approval_type);
  if (!gate) return [];
  return [
    {
      issue: toIssueNumber(parsed.approval.issue_or_pr),
      gate,
      author: str(parsed.approval.approver) || str(meta.author) || null,
      decision: DECISION_APPROVE,
      recordedAt: str(parsed.approval.recorded_at) || str(meta.created_at) || null,
      source: 'durable_approval',
      notes: str(parsed.approval.notes) || null,
    },
  ];
}

/**
 * @param {string | null} approvalLabel
 * @returns {string | null}
 */
function gateFromApprovalLabel(approvalLabel) {
  const want = canonicalizeApprovalType(approvalLabel || '');
  if (!want) return null;
  for (const [gate, label] of Object.entries(PROTECTED_GATE_TO_APPROVAL_LABEL)) {
    if (gate === 'none') continue;
    if (label === want) return gate;
  }
  return null;
}

/**
 * Free-form Anton unlock / revoke evidence already present on #879-style issues.
 * Kept narrow so narrative doctrine text does not auto-unlock.
 *
 * Active-task Anton instructions that explicitly authorize a consequential action
 * for this issue are sufficient (#896) — no second durable ceremony required.
 *
 * @param {string} body
 * @param {{ author?: string | null, created_at?: string | null, allowIssueBody?: boolean }} [meta]
 */
export function parseExplicitOperatorAuthorizationText(body, meta = {}) {
  const text = String(body || '');
  if (!text.trim()) return [];

  const hasExplicitHeader =
    /ANTON EXPLICIT OPERATOR AUTHORIZATION/i.test(text) ||
    /##\s*Explicit Anton authorization/i.test(text) ||
    /##\s*Explicit operator approval/i.test(text) ||
    /Source authorization:\s*Anton\b/i.test(text) ||
    /Operator authorization:\s*Anton\b/i.test(text) ||
    /Governance change:\s*explicitly approved/i.test(text) ||
    /this issue carries Anton.?s explicit approval/i.test(text) ||
    /Anton.?s direct instruction is sufficient authorization/i.test(text) ||
    /Anton has (explicitly )?(approved|authorized)\b/i.test(text);
  if (!hasExplicitHeader) return [];

  const authorTrusted =
    isTrustedOperatorIdentity(meta.author, null) ||
    (meta.allowIssueBody === true && /Anton\b/.test(text));
  if (!authorTrusted) return [];

  const revoke =
    /\b(revoke|revoked|rescind|withdraw|reject(?:ed)?)\b[\s\S]{0,80}\b(authorization|approval|unlock)\b/i.test(
      text,
    ) ||
    /\b(authorization|approval|unlock)\b[\s\S]{0,80}\b(revoke|revoked|rescind|withdraw|reject(?:ed)?)\b/i.test(
      text,
    );

  /** @type {Set<string>} */
  const gates = new Set();

  const namedUnlock =
    /(?:remove|lift|clear|unlock)\b[\s\S]{0,120}?protected\s*gate:?\s*`?([a-z_]+)`?/gi;
  let m;
  while ((m = namedUnlock.exec(text)) !== null) {
    const gate = canonicalizeProtectedGate(m[1]);
    if (gate) gates.add(gate);
  }

  const backtickGate = /protected\s*gate:?\s*`([a-z_]+)`/gi;
  while ((m = backtickGate.exec(text)) !== null) {
    const gate = canonicalizeProtectedGate(m[1]);
    if (gate) gates.add(gate);
  }

  // #886-style: Anton authorization + explicit "not a CorpFlowAI database/schema task"
  if (
    /not a CorpFlowAI database\/schema task/i.test(text) ||
    /not(?:\s+\w+){0,6}\s+CorpFlowAI\s+database\/schema/i.test(text)
  ) {
    gates.add('database');
  }

  // ERPNext access unlock that names the database dispatcher block
  if (
    /ERPNext ACCESS UNLOCK/i.test(text) &&
    /protected\s*gate:?\s*`?database`?/i.test(text)
  ) {
    gates.add('database');
  }

  // Active-task authorization of exact consequential scopes (#893 / #896).
  if (
    /secure\s+Cursor\s+(Cloud\s+)?environment\/settings/i.test(text) ||
    /wiring.{0,120}secure\s+Cursor/i.test(text) ||
    /env\/secrets|environment\/settings configuration/i.test(text)
  ) {
    if (
      /explicitly (approved|authorized)|Operator authorization:\s*Anton|Explicit operator approval/i.test(
        text,
      )
    ) {
      gates.add('secrets');
    }
  }

  if (
    /explicitly (approved|authorized).{0,200}(schema|migration|database|prisma migrate)/i.test(
      text,
    ) ||
    /authorized.{0,120}(schema change|database migration|prisma migrate)/i.test(text)
  ) {
    gates.add('database');
  }

  if (
    /explicitly (approved|authorized).{0,200}(client[_ ]production|production deploy|deploy to client)/i.test(
      text,
    ) ||
    /this issue carries Anton.?s explicit approval to merge and deploy this governance change/i.test(
      text,
    )
  ) {
    // Governance rollout deploy/merge authorization is scope-specific to the
    // controlling issue; map production only when client_production is named,
    // otherwise treat as merge/deploy doctrine for the active governance packet.
    if (/client[_ ]production|client-owned production/i.test(text)) {
      gates.add('production');
    }
  }

  if (
    /explicitly (approved|authorized).{0,200}(live (whatsapp|sms|email)|external send|messaging send)/i.test(
      text,
    )
  ) {
    gates.add('messaging');
  }

  if (
    /explicitly (approved|authorized).{0,200}(real payment|payment execution|payment runtime)/i.test(
      text,
    )
  ) {
    gates.add('payment');
  }

  if (gates.size === 0) return [];

  const decision = revoke ? DECISION_REVOKE : DECISION_APPROVE;
  return [...gates].map((gate) => ({
    issue: null,
    gate,
    author: str(meta.author) || 'Anton',
    decision,
    recordedAt: str(meta.created_at) || null,
    source: 'explicit_operator_text',
    notes: revoke
      ? 'free-form revoke/reject'
      : 'free-form explicit operator authorization (active-task instruction sufficient)',
  }));
}

/**
 * Collect authorization records from issue body + comments.
 *
 * @param {{
 *   issueNumber: number,
 *   body?: string | null,
 *   comments?: Array<{
 *     body?: string | null,
 *     author?: string | null,
 *     user?: { login?: string | null } | null,
 *     created_at?: string | null,
 *     createdAt?: string | null,
 *   }>,
 * }} input
 */
export function collectOperatorGateAuthorizationRecords(input) {
  const issueNumber = Number(input.issueNumber);
  /** @type {ReturnType<typeof parseOperatorGateAuthorizationRecords>} */
  const records = [];

  const body = str(input.body);
  if (body) {
    records.push(...parseOperatorGateAuthorizationRecords(body));
    records.push(...parseDurableApprovalAsGateAuthorization(body, { author: 'Anton' }));
    records.push(
      ...parseExplicitOperatorAuthorizationText(body, {
        author: 'Anton',
        allowIssueBody: true,
      }),
    );
  }

  const comments = Array.isArray(input.comments) ? input.comments : [];
  for (const comment of comments) {
    const cBody = str(comment?.body);
    if (!cBody) continue;
    const author =
      str(comment?.author) ||
      str(comment?.user && typeof comment.user === 'object' ? comment.user.login : '') ||
      null;
    const createdAt = str(comment?.created_at || comment?.createdAt) || null;
    /** @type {ReturnType<typeof parseOperatorGateAuthorizationRecords>} */
    const fromComment = [
      ...parseOperatorGateAuthorizationRecords(cBody),
      ...parseDurableApprovalAsGateAuthorization(cBody, { author, created_at: createdAt }),
      ...parseExplicitOperatorAuthorizationText(cBody, {
        author,
        created_at: createdAt,
        allowIssueBody: false,
      }),
    ];
    for (const rec of fromComment) {
      if (!rec.recordedAt && createdAt) rec.recordedAt = createdAt;
      if (!rec.author && author) rec.author = author;
      if (rec.issue == null) rec.issue = issueNumber;
      records.push(rec);
    }
  }

  return records
    .map((rec) => ({
      ...rec,
      issue: rec.issue == null ? issueNumber : rec.issue,
      gate: canonicalizeProtectedGate(rec.gate || ''),
      decision: canonicalizeGateDecision(rec.decision || ''),
    }))
    .filter((rec) => rec.gate && rec.decision);
}

/**
 * Evaluate the latest valid authorization for one exact protected gate.
 *
 * @param {{
 *   issueNumber: number,
 *   gate: string,
 *   body?: string | null,
 *   comments?: Array<{
 *     body?: string | null,
 *     author?: string | null,
 *     user?: { login?: string | null } | null,
 *     created_at?: string | null,
 *     createdAt?: string | null,
 *   }>,
 *   nowIso?: string,
 * }} input
 * @returns {{
 *   allowed: boolean,
 *   reason: string,
 *   record: {
 *     issue: number | null,
 *     gate: string | null,
 *     author: string | null,
 *     decision: string | null,
 *     recordedAt: string | null,
 *     source: string,
 *     notes?: string | null,
 *   } | null,
 *   candidates: number,
 * }}
 */
export function evaluateOperatorGateAuthorization(input) {
  const gate = canonicalizeProtectedGate(input.gate);
  if (!gate) {
    return {
      allowed: true,
      reason: 'no protected gate',
      record: null,
      candidates: 0,
    };
  }

  const issueNumber = Number(input.issueNumber);
  const all = collectOperatorGateAuthorizationRecords({
    issueNumber,
    body: input.body,
    comments: input.comments,
  });

  const matching = all.filter((rec) => {
    if (rec.gate !== gate) return false;
    if (rec.issue != null && Number(rec.issue) !== issueNumber) return false;
    if (!isTrustedOperatorIdentity(rec.author, rec.author)) {
      // Structured records may put operator in author field as "Anton"
      if (!isTrustedOperatorIdentity(null, rec.author)) return false;
    }
    return true;
  });

  if (matching.length === 0) {
    return {
      allowed: false,
      reason: `protected gate ${gate} — no valid operator authorization`,
      record: null,
      candidates: 0,
    };
  }

  matching.sort((a, b) => {
    const ta = Date.parse(a.recordedAt || '') || 0;
    const tb = Date.parse(b.recordedAt || '') || 0;
    if (ta !== tb) return ta - tb;
    // Stable tie-break: prefer structured sources over free-form when timestamps equal.
    const rank = (source) => {
      if (source === 'html_json') return 3;
      if (source === 'marker_block') return 2;
      if (source === 'durable_approval') return 1;
      return 0;
    };
    return rank(a.source) - rank(b.source);
  });

  const latest = matching[matching.length - 1];
  if (latest.decision === DECISION_APPROVE) {
    return {
      allowed: true,
      reason: `operator authorization approved for gate ${gate}`,
      record: latest,
      candidates: matching.length,
    };
  }

  return {
    allowed: false,
    reason: `protected gate ${gate} — latest operator authorization is ${latest.decision}`,
    record: latest,
    candidates: matching.length,
  };
}
