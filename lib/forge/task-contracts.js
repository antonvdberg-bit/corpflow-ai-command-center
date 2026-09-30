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
  FORGE_VALIDATE_PACKET: { timeoutSeconds: 30, verifier: 'deterministic_packet_validation' },
  FORGE_PARSE_LOG: { timeoutSeconds: 60, verifier: 'structured_output_schema' },
  FORGE_CREATE_FIXTURE: { timeoutSeconds: 60, verifier: 'fixture_schema_and_tests' },
  FORGE_TRANSFORM_DATA: { timeoutSeconds: 90, verifier: 'deterministic_transform_diff' },
  FORGE_REPAIR_TEST: { timeoutSeconds: 120, verifier: 'target_test_passes' },
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

export { PROTECTED_ACTIONS };
