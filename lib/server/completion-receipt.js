/**
 * Executor-neutral completion contract.
 *
 * Transport status describes what the provider did. Disposition describes
 * what CorpFlowAI can currently prove. These are intentionally separate.
 */
export const COMPLETION_RECEIPT_SCHEMA = 'corpflow.completion_receipt.v2';
export const EXECUTION_KINDS = Object.freeze([
  'CODE_CHANGE',
  'BUSINESS_ACTION',
  'READ_ONLY_VERIFICATION',
  'DOCUMENTATION',
  'FORGE_TASK',
]);
export const RECEIPT_EXECUTORS = Object.freeze(['CURSOR', 'FORGE', 'DETERMINISTIC']);
export const RECEIPT_DISPOSITIONS = Object.freeze([
  'VERIFIED_COMPLETE',
  'VERIFIED_BLOCKED',
  'FAILED',
  'UNKNOWN',
]);
export const TRANSPORT_STATUSES = Object.freeze(['RUNNING', 'COMPLETED', 'FAILED']);

function text(value, max = 1200) {
  const result = value == null ? '' : String(value).trim();
  return result ? result.slice(0, max) : null;
}

function positiveInteger(value) {
  const result = Number(value);
  return Number.isInteger(result) && result > 0 ? result : null;
}

function list(value, maxItems = 20) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => text(item, 240)).filter(Boolean).slice(0, maxItems);
}

function isObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

export function buildCompletionReceipt(input = {}) {
  const executionKind = text(input.execution_kind || input.executionKind, 40)?.toUpperCase();
  const executor = text(input.executor, 20)?.toUpperCase();
  const disposition = text(input.disposition, 30)?.toUpperCase();
  const transportStatus = text(input.transport_status || input.transportStatus, 20)?.toUpperCase();
  return {
    schema: COMPLETION_RECEIPT_SCHEMA,
    source_issue: positiveInteger(input.source_issue ?? input.sourceIssue),
    executor: RECEIPT_EXECUTORS.includes(executor) ? executor : null,
    executor_run_id: text(input.executor_run_id || input.executorRunId, 180),
    execution_kind: EXECUTION_KINDS.includes(executionKind) ? executionKind : null,
    transport_status: TRANSPORT_STATUSES.includes(transportStatus) ? transportStatus : null,
    disposition: RECEIPT_DISPOSITIONS.includes(disposition) ? disposition : null,
    evidence_summary: text(input.evidence_summary || input.evidenceSummary, 2000),
    protected_actions_not_taken: list(
      input.protected_actions_not_taken || input.protectedActionsNotTaken,
    ),
    blocker: text(input.blocker, 600),
    supersedes: text(input.supersedes, 180),
    kind_evidence: isObject(input.kind_evidence || input.kindEvidence)
      ? input.kind_evidence || input.kindEvidence
      : null,
  };
}

function kindEvidenceErrors(receipt) {
  const evidence = receipt.kind_evidence;
  if (!isObject(evidence)) return ['kind_evidence_required'];
  switch (receipt.execution_kind) {
    case 'CODE_CHANGE':
      if (
        !(
          (text(evidence.branch) && positiveInteger(evidence.pr_number) && text(evidence.head_sha)) ||
          text(evidence.verified_blocker)
        )
      ) return ['code_change_artifact_or_verified_blocker_required'];
      return [];
    case 'BUSINESS_ACTION':
      return evidence.read_back_verified === true || text(evidence.verified_blocker)
        ? []
        : ['business_read_back_or_verified_blocker_required'];
    case 'READ_ONLY_VERIFICATION':
      return text(evidence.source) && Array.isArray(evidence.targets) && text(evidence.findings)
        ? []
        : ['read_only_source_targets_findings_required'];
    case 'DOCUMENTATION':
      return Array.isArray(evidence.files) && evidence.files.length > 0 && text(evidence.checks)
        ? []
        : ['documentation_files_and_checks_required'];
    case 'FORGE_TASK':
      return text(evidence.contract_name) &&
        Array.isArray(evidence.allowed_files) &&
        text(evidence.deterministic_verifier) &&
        text(evidence.result_artifact)
        ? []
        : ['forge_contract_context_verifier_artifact_required'];
    default:
      return ['execution_kind_required'];
  }
}

export function validateCompletionReceipt(value, context = {}) {
  const receipt = buildCompletionReceipt(isObject(value) ? value : {});
  const errors = [];
  if (receipt.schema !== COMPLETION_RECEIPT_SCHEMA) errors.push('schema');
  if (!receipt.source_issue) errors.push('source_issue');
  if (!receipt.executor) errors.push('executor');
  if (!receipt.executor_run_id) errors.push('executor_run_id');
  if (!receipt.execution_kind) errors.push('execution_kind');
  if (!receipt.transport_status) errors.push('transport_status');
  if (!receipt.disposition) errors.push('disposition');
  if (!receipt.evidence_summary) errors.push('evidence_summary');
  if (!Array.isArray(receipt.protected_actions_not_taken)) {
    errors.push('protected_actions_not_taken');
  }
  if (context.sourceIssue && receipt.source_issue !== positiveInteger(context.sourceIssue)) {
    errors.push('source_issue_correlation');
  }
  if (receipt.disposition === 'VERIFIED_BLOCKED' && !receipt.blocker) errors.push('blocker');
  if (
    receipt.disposition === 'VERIFIED_COMPLETE' &&
    (receipt.transport_status === 'FAILED' || kindEvidenceErrors(receipt).length)
  ) {
    errors.push(...kindEvidenceErrors(receipt));
  }
  return {
    ok: errors.length === 0,
    errors: [...new Set(errors)],
    receipt: errors.length === 0 ? receipt : null,
  };
}

export function mapForgeResultToDisposition(result) {
  const status = text(result?.status || result?.result || result, 40)?.toUpperCase();
  if (status === 'PASS') return 'VERIFIED_COMPLETE';
  if (['BLOCKED', 'DEFERRED_RESOURCE', 'DEFERRED_CAPACITY'].includes(status)) {
    return 'VERIFIED_BLOCKED';
  }
  if (['CRASH', 'TIMEOUT', 'FAILED', 'FAIL'].includes(status)) return 'FAILED';
  return 'UNKNOWN';
}

export function normalizeCompletionReceipt(input = {}) {
  const existing = validateCompletionReceipt(input.receipt, {
    sourceIssue: input.source_issue || input.sourceIssue,
  });
  if (existing.ok) return { ok: true, normalized: false, receipt: existing.receipt };
  if (!input.evidence_summary || !input.execution_kind || !input.executor_run_id) {
    return { ok: false, normalized: false, reason: 'insufficient_authoritative_facts' };
  }
  const receipt = buildCompletionReceipt({
    ...input,
    disposition: input.disposition || 'UNKNOWN',
  });
  const validation = validateCompletionReceipt(receipt, {
    sourceIssue: input.source_issue || input.sourceIssue,
  });
  return validation.ok
    ? { ok: true, normalized: true, receipt: validation.receipt }
    : { ok: false, normalized: true, reason: validation.errors.join(',') };
}

export function selectLatestAuthoritativeReceipt(receipts = []) {
  const valid = receipts
    .map((value) => validateCompletionReceipt(value))
    .filter((result) => result.ok)
    .map((result) => result.receipt);
  return valid.length ? valid[valid.length - 1] : null;
}
