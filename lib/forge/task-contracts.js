import {
  buildCompletionReceipt,
  mapForgeResultToDisposition,
  validateCompletionReceipt,
} from '../server/completion-receipt.js';

const PROTECTED_ACTIONS = new Set([
  'production_deploy',
  'production_db_mutation',
  'schema_apply_production',
  'env_change',
  'secret_change',
  'access_change',
  'payment',
  'external_send',
  'external_publish',
  'paid_vendor',
  'merge',
]);

export const FORGE_TASK_CONTRACTS = Object.freeze({
  FORGE_VALIDATE_PACKET: {
    timeoutSeconds: 30,
    verifier: 'deterministic_packet_validation',
    input: 'bounded completion/evidence packet',
    output: 'PASS/FAIL + missing evidence',
    dynamicLearningFilter: ['task:validate_packet', 'failure:missing_evidence'],
    escalation: 'invalid packet shape or protected action request',
  },
  FORGE_PARSE_LOG: {
    timeoutSeconds: 60,
    verifier: 'structured_output_schema',
    input: 'bounded execution log',
    output: 'structured metrics + error classification',
    dynamicLearningFilter: ['task:parse_log', 'runtime:error_classification'],
    escalation: 'ambiguous multi-system trace or parser fails twice',
  },
  FORGE_CREATE_FIXTURE: {
    timeoutSeconds: 60,
    verifier: 'fixture_schema_and_tests',
    input: 'explicit schema + small sample',
    output: 'synthetic fixture only',
    dynamicLearningFilter: ['task:create_fixture', 'pattern:fixture'],
    escalation: 'schema ambiguity or cross-domain fixture request',
  },
  FORGE_TRANSFORM_DATA: {
    timeoutSeconds: 90,
    verifier: 'deterministic_transform_diff',
    input: 'bounded row + exact mapping contract',
    output: 'deterministic transformed row/function',
    dynamicLearningFilter: ['task:transform_data', 'pattern:mapping'],
    escalation: 'mapping requires business judgment or fails twice',
  },
  FORGE_REPAIR_TEST: {
    timeoutSeconds: 120,
    verifier: 'target_test_passes',
    input: 'one failing unit test + exact relevant file',
    output: 'minimal repair',
    dynamicLearningFilter: ['task:repair_test', 'failure:test'],
    escalation: 'multi-file architecture change or two failed attempts',
  },
});

function text(value) {
  return value == null ? '' : String(value).trim();
}

export function validateForgePacket(packet) {
  const errors = [];
  if (!packet || typeof packet !== 'object' || Array.isArray(packet)) {
    return { ok: false, errors: ['packet_must_be_object'] };
  }

  const contract = text(packet.contract);
  if (!FORGE_TASK_CONTRACTS[contract]) errors.push('unknown_contract');

  if (!Array.isArray(packet.allowedFiles) || packet.allowedFiles.length === 0) {
    errors.push('allowed_files_required');
  } else if (packet.allowedFiles.some((path) => !text(path) || path.includes('..'))) {
    errors.push('invalid_allowed_file');
  }

  if (!text(packet.workItem)) errors.push('work_item_required');
  if (!text(packet.verifier)) errors.push('verifier_required');

  const requestedActions = Array.isArray(packet.requestedActions) ? packet.requestedActions : [];
  const protectedRequested = requestedActions.filter((action) => PROTECTED_ACTIONS.has(text(action)));
  if (protectedRequested.length) errors.push('protected_action_requested');

  if (packet.allowSecrets === true) errors.push('secrets_not_allowed');
  if (packet.allowProductionMutation === true) errors.push('production_mutation_not_allowed');
  if (packet.allowExternalNetwork === true && packet.networkMode !== 'explicit_read_only') {
    errors.push('external_network_not_bounded');
  }

  return {
    ok: errors.length === 0,
    errors,
    contract: FORGE_TASK_CONTRACTS[contract] || null,
  };
}

export function buildForgeCompletionReceipt(input = {}) {
  const disposition = mapForgeResultToDisposition(input.result || input.status);
  const receipt = buildCompletionReceipt({
    source_issue: input.sourceIssue,
    executor: 'FORGE',
    executor_run_id: input.executorRunId || input.runId,
    execution_kind: 'FORGE_TASK',
    transport_status: input.transportStatus || 'COMPLETED',
    disposition,
    evidence_summary: input.evidenceSummary || input.result,
    protected_actions_not_taken: input.protectedActionsNotTaken || [],
    blocker: disposition === 'VERIFIED_BLOCKED' ? input.blocker || input.result : input.blocker,
    kind_evidence: {
      contract_name: input.contractName,
      allowed_files: input.allowedFiles,
      deterministic_verifier: input.verifier,
      result_artifact: input.artifactRef || input.result,
    },
  });
  const validation = validateCompletionReceipt(receipt);
  return validation.ok ? validation.receipt : { ...receipt, validation_errors: validation.errors };
}

export { PROTECTED_ACTIONS };
