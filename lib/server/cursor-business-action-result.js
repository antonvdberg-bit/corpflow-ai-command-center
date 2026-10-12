/**
 * Bounded no-code business-action completion contract.
 *
 * GitHub comments remain the durable evidence store for the lifecycle. This
 * module validates only concise operational facts; it never accepts provider
 * reasoning or a transcript as business evidence.
 */

export const ERPNext_ACTION_RESULT_SCHEMA = 'corpflow.erpnext_action_result.v1';
export const BUSINESS_ACTION_RESULT_MARKER = 'corpflow.business_action_result.v1';

const REQUIRED_FIELDS = Object.freeze([
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
]);

function text(value, max = 500) {
  const result = value == null ? '' : String(value).trim();
  return result ? result.slice(0, max) : null;
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function stringList(value, maxItems = 20) {
  if (!Array.isArray(value)) return null;
  return value
    .slice(0, maxItems)
    .map((entry) => text(entry, 180))
    .filter(Boolean);
}

function objectList(value, maxItems = 20) {
  if (!Array.isArray(value)) return null;
  return value.slice(0, maxItems).map((entry) => {
    if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) {
      return text(entry, 180);
    }
    const safe = {};
    for (const [key, item] of Object.entries(entry).slice(0, 12)) {
      if (/secret|token|password|credential|private/i.test(key)) continue;
      safe[String(key).slice(0, 80)] = typeof item === 'object' ? text(JSON.stringify(item), 240) : text(item, 240);
    }
    return safe;
  });
}

/**
 * @param {unknown} value
 * @returns {Record<string, unknown> | null}
 */
export function parseBusinessActionResult(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = /** @type {Record<string, unknown>} */ (value);
    if (record.schema === ERPNext_ACTION_RESULT_SCHEMA || record.final_verdict != null) return record;
  }
  const raw = text(value, 10000);
  if (!raw) return null;
  const marker = raw.match(
    new RegExp(`<!--\\s*${BUSINESS_ACTION_RESULT_MARKER}\\s+(\\{[\\s\\S]*?\\})\\s*-->`, 'i'),
  );
  const candidate = marker?.[1] || raw;
  try {
    const parsed = JSON.parse(candidate);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Validate an ERPNext/business-action result against the exact Cursor run.
 *
 * @param {unknown} value
 * @param {{ sourceIssue?: number | null, cursorAgentId?: string | null, cursorRunId?: string | null }} context
 */
export function validateBusinessActionResult(value, context = {}) {
  const source = parseBusinessActionResult(value);
  const missing = REQUIRED_FIELDS.filter((field) => !source || !Object.prototype.hasOwnProperty.call(source, field));
  const sourceIssue = positiveInteger(source?.source_issue);
  const expectedIssue = positiveInteger(context.sourceIssue);
  const agentId = text(source?.cursor_agent_id, 180);
  const runId = text(source?.cursor_run_id, 180);
  const expectedAgent = text(context.cursorAgentId, 180);
  const expectedRun = text(context.cursorRunId, 180);
  if (source?.schema !== ERPNext_ACTION_RESULT_SCHEMA) missing.push('schema');
  if (sourceIssue == null) missing.push('source_issue_positive');
  if (expectedIssue && sourceIssue !== expectedIssue) missing.push('source_issue_correlation');
  if (expectedAgent && agentId !== expectedAgent) missing.push('cursor_agent_correlation');
  if (expectedRun && runId !== expectedRun) missing.push('cursor_run_correlation');
  if (!Array.isArray(source?.target_doctypes)) missing.push('target_doctypes_array');
  if (!Array.isArray(source?.records_read)) missing.push('records_read_array');
  if (!Array.isArray(source?.records_created)) missing.push('records_created_array');
  if (!Array.isArray(source?.records_updated)) missing.push('records_updated_array');
  if (source?.read_back_verified !== true) missing.push('read_back_verified');
  if (String(source?.final_verdict || '').toUpperCase() !== 'PASS') missing.push('final_verdict');
  return {
    ok: missing.length === 0,
    reason: missing.length ? [...new Set(missing)].join(',') : 'valid_erpnext_action_result',
    evidence: missing.length
      ? null
      : {
          schema: ERPNext_ACTION_RESULT_SCHEMA,
          source_issue: sourceIssue,
          cursor_agent_id: agentId,
          cursor_run_id: runId,
          action_class: text(source.action_class, 120),
          target_doctypes: stringList(source.target_doctypes),
          records_read: objectList(source.records_read),
          records_created: objectList(source.records_created),
          records_updated: objectList(source.records_updated),
          before_after_summary: text(source.before_after_summary, 1000),
          read_back_verified: true,
          docstatus_or_draft_state: text(source.docstatus_or_draft_state, 180),
          quotation_or_supplier_identifiers: objectList(source.quotation_or_supplier_identifiers),
          protected_actions_not_taken: stringList(source.protected_actions_not_taken),
          blocker: text(source.blocker, 300),
          final_verdict: 'PASS',
        },
  };
}

export function isBusinessActionWork(workType) {
  return /business|erpnext|no[-_ ]?code|mutation|read[-_ ]?only|recovery/i.test(String(workType || ''));
}

export function isExplicitBusinessAction(executionKind) {
  return String(executionKind || '').trim().toUpperCase() === 'BUSINESS_ACTION';
}

export function resolveBusinessActionRouting(input = {}) {
  if (input.executionKind) {
    return {
      businessAction: isExplicitBusinessAction(input.executionKind),
      legacy: false,
      reason: isExplicitBusinessAction(input.executionKind)
        ? 'explicit_business_action'
        : 'explicit_non_business_action',
    };
  }
  return {
    businessAction: isBusinessActionWork(input.workType),
    legacy: true,
    reason: 'LEGACY_WORK_TYPE_INFERENCE',
  };
}

export function buildBusinessActionCallback(input = {}) {
  const validation = input.validation || { ok: false, reason: 'missing_business_action_evidence' };
  const evidence = validation.ok ? validation.evidence : null;
  const payload = {
    schema: BUSINESS_ACTION_RESULT_MARKER,
    source_issue: positiveInteger(input.sourceIssue),
    cursor_agent_id: text(input.cursorAgentId, 180),
    cursor_run_id: text(input.cursorRunId, 180),
    validation_status: validation.ok ? 'VALID' : 'INVALID',
    validation_reason: validation.reason,
    final_verdict: validation.ok ? 'PASS' : 'COMPLETED_UNVERIFIED',
    evidence,
  };
  return `CURSOR BUSINESS ACTION RESULT\n\nSource issue: #${payload.source_issue || 'n/a'}\nAgent: ${payload.cursor_agent_id || 'n/a'}\nRun: ${payload.cursor_run_id || 'n/a'}\nValidation: ${payload.validation_status}\nVerdict: ${payload.final_verdict}\nReason: ${payload.validation_reason}\n\n<!-- ${BUSINESS_ACTION_RESULT_MARKER} ${JSON.stringify(payload)} -->\n`;
}

export function selectBusinessActionRecovery(input = {}) {
  const validation = input.validation;
  if (validation?.ok) return { selected: false, reason: 'business_action_evidence_valid' };
  const routing = resolveBusinessActionRouting(input);
  if (input.providerStatus === 'COMPLETED' && routing.businessAction) {
    return {
      selected: true,
      mode: 'read_only',
      legacy: routing.legacy,
      reason: routing.legacy
        ? 'LEGACY_completed_business_action_missing_or_invalid_evidence'
        : 'completed_business_action_missing_or_invalid_evidence',
      prompt: 'Read the authoritative external system for the exact packet targets. Do not replay or mutate the original action. Return corpflow.erpnext_action_result.v1 evidence or one exact blocker.',
    };
  }
  return { selected: false, reason: 'not_a_recoverable_business_action' };
}
