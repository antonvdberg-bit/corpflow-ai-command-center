/**
 * Bounded terminal evidence contracts for Cursor work.
 *
 * This module is pure so lifecycle polling, the operator surface, and tests
 * share exactly the same validation without storing provider transcripts.
 */

export const ERPNextActionResultSchema = 'corpflow.erpnext_action_result.v1';

const REQUIRED_FIELDS = [
  'source_issue',
  'cursor_agent_id',
  'cursor_run_id',
  'action_class',
  'target_doctypes',
  'records_read',
  'records_created',
  'records_updated',
  'before_after_summary',
  'read_back_verified',
  'protected_actions_not_taken',
  'final_verdict',
];

function text(value, max = 500) {
  const result = String(value ?? '').trim();
  return result ? result.slice(0, max) : null;
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function boundedList(value, max = 20) {
  return Array.isArray(value)
    ? value.slice(0, max).map((item) => text(item, 160)).filter(Boolean)
    : [];
}

/**
 * Parse only a JSON object supplied as the provider's final result.
 * @param {unknown} value
 * @returns {Record<string, unknown> | null}
 */
export function parseCursorBusinessEvidence(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Validate and redact a bounded ERPNext/business-action result.
 * @param {unknown} value
 * @param {{ sourceIssue?: number | null, cursorAgentId?: string | null, cursorRunId?: string | null }} [context]
 */
export function validateCursorBusinessEvidence(value, context = {}) {
  const input = parseCursorBusinessEvidence(value);
  if (!input || input.schema !== ERPNextActionResultSchema) {
    return { ok: false, reason: 'business_evidence_schema_missing' };
  }
  const missing = REQUIRED_FIELDS.filter((field) => input[field] == null);
  if (missing.length) return { ok: false, reason: `business_evidence_missing:${missing.join(',')}` };
  const sourceIssue = positiveInteger(input.source_issue);
  if (!sourceIssue) return { ok: false, reason: 'business_evidence_source_issue_invalid' };
  if (context.sourceIssue != null && sourceIssue !== positiveInteger(context.sourceIssue)) {
    return { ok: false, reason: 'business_evidence_source_issue_mismatch' };
  }
  for (const [field, expected] of [
    ['cursor_agent_id', context.cursorAgentId],
    ['cursor_run_id', context.cursorRunId],
  ]) {
    if (expected != null && text(input[field], 160) !== text(expected, 160)) {
      return { ok: false, reason: `business_evidence_${field}_mismatch` };
    }
  }
  if (input.read_back_verified !== true) return { ok: false, reason: 'business_read_back_not_verified' };
  if (String(input.final_verdict).toUpperCase() !== 'PASS') {
    return { ok: false, reason: 'business_evidence_verdict_not_pass' };
  }
  const evidence = {
    schema: ERPNextActionResultSchema,
    source_issue: sourceIssue,
    cursor_agent_id: text(input.cursor_agent_id, 160),
    cursor_run_id: text(input.cursor_run_id, 160),
    action_class: text(input.action_class, 120),
    target_doctypes: boundedList(input.target_doctypes),
    records_read: boundedList(input.records_read),
    records_created: boundedList(input.records_created),
    records_updated: boundedList(input.records_updated),
    before_after_summary: text(input.before_after_summary, 800),
    read_back_verified: true,
    docstatus_or_draft_state: text(input.docstatus_or_draft_state, 120),
    quotation_or_supplier_identifiers: boundedList(input.quotation_or_supplier_identifiers),
    protected_actions_not_taken: boundedList(input.protected_actions_not_taken),
    blocker: text(input.blocker, 300),
    final_verdict: 'PASS',
  };
  return { ok: true, evidence };
}

export function selectBusinessRecoveryAction(input = {}) {
  const verified = input.evidenceValid === true;
  return verified
    ? { action: 'none', mutationReplay: false, reason: 'business_evidence_verified' }
    : {
        action: 'read_only_recovery',
        mutationReplay: false,
        reason: 'completed_without_valid_business_evidence',
      };
}
