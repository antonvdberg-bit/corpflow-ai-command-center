/**
 * OpenHands work-packet validation — package/schema validation only.
 *
 * This module performs no I/O, no network calls, and does not activate,
 * dispatch, schedule, or execute anything. It validates a plain object
 * against the shape documented for OpenHands work packets.
 *
 * Field names, required-ness, and value types below are kept in lockstep
 * with `config/openhands/work-packet.schema.json` (a JSON Schema authored
 * separately under the same controlling issue). This module intentionally
 * does NOT load that file at runtime — it embeds an equivalent set of checks
 * so callers get useful, itemized error messages without an `ajv` runtime
 * dependency in the hot path. `node-tests/openhands-work-packet-schema.test.mjs`
 * cross-validates a sample packet against the JSON Schema file directly
 * (using `ajv`, already a devDependency) when that file is present, so drift
 * between the two is caught by CI rather than discovered at packet-dispatch
 * time.
 *
 * Controlling issue: #743 — package/validation only, no live activation.
 *
 * @see docs/operations/OPENHANDS_OPERATING_CHARTER.md
 * @see ops/openhands/README.md
 * @see config/openhands/work-packet.schema.json
 */

export const OPENHANDS_WORK_PACKET_SCHEMA = 'corpflow.openhands_work_packet.v1';

export const OPENHANDS_BRANCH_PREFIX = 'openhands/';

/** Fields every OpenHands work packet must carry (see controlling issue #743). */
export const REQUIRED_FIELDS = /** @type {const} */ ([
  'packet_id',
  'parent_issue',
  'objective',
  'business_value',
  'allowed_files',
  'excluded_files',
  'acceptance_tests',
  'expected_evidence',
  'protected_gates',
  'maximum_attempts',
  'escalation_condition',
  'branch_name',
  'intended_agent_owner',
  'collision_sensitive_paths',
  'model_class',
  'cost_risk_cap',
  'timeout_seconds',
  'real_client_data_permitted',
  'production_mutation_permitted',
  'external_action_permitted',
]);

/** Fields that must be arrays (may be empty, but must be present and an array). */
const ARRAY_FIELDS = /** @type {const} */ ([
  'allowed_files',
  'excluded_files',
  'acceptance_tests',
  'expected_evidence',
  'protected_gates',
  'collision_sensitive_paths',
]);

/** Array fields that, per the JSON Schema, must additionally be non-empty. */
const NON_EMPTY_ARRAY_FIELDS = /** @type {const} */ ([
  'allowed_files',
  'acceptance_tests',
  'expected_evidence',
  'protected_gates',
]);

/** Fields that must be non-empty strings. */
const NON_EMPTY_STRING_FIELDS = /** @type {const} */ ([
  'packet_id',
  'objective',
  'business_value',
  'escalation_condition',
]);

/** `model_class` must be one of these routing tiers (see `config/openhands/model-routing.example.yaml`). */
const MODEL_CLASSES = /** @type {const} */ (['low_cost', 'standard', 'high_capability']);

/** Protected-action flags. All default to `false` (fail closed) when absent. */
const PROTECTED_FLAG_FIELDS = /** @type {const} */ ([
  'real_client_data_permitted',
  'production_mutation_permitted',
  'external_action_permitted',
]);

export const REQUIRED_INTENDED_AGENT_OWNER = 'openhands';

/**
 * Defaults applied when a field is `undefined` on the raw input. These are
 * intentionally the most restrictive values — a packet that omits a
 * protected-action flag is treated as NOT permitting that action, not as
 * "unspecified".
 */
export const OPENHANDS_WORK_PACKET_DEFAULTS = /** @type {const} */ ({
  real_client_data_permitted: false,
  production_mutation_permitted: false,
  external_action_permitted: false,
  intended_agent_owner: REQUIRED_INTENDED_AGENT_OWNER,
});

/**
 * @param {unknown} value
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * @param {unknown} value
 */
function isPositiveInteger(value) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * @param {unknown} value
 */
function isPositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * Asserts a branch name is under the OpenHands namespace. Throws on failure
 * (fail closed) so callers cannot accidentally proceed with an unnamespaced
 * branch.
 *
 * @param {string | null | undefined} name
 * @returns {string} the validated branch name
 */
export function assertBranchName(name) {
  const s = String(name ?? '').trim();
  if (!s.startsWith(OPENHANDS_BRANCH_PREFIX)) {
    throw new Error(
      `branch_name must start with "${OPENHANDS_BRANCH_PREFIX}" (got: ${s || '(blank)'})`,
    );
  }
  return s;
}

/**
 * @typedef {{
 *   packet_id: string,
 *   parent_issue: number,
 *   objective: string,
 *   business_value: string,
 *   allowed_files: string[],
 *   excluded_files: string[],
 *   acceptance_tests: string[],
 *   expected_evidence: string[],
 *   protected_gates: string[],
 *   maximum_attempts: number,
 *   escalation_condition: string,
 *   branch_name: string,
 *   intended_agent_owner: 'openhands',
 *   collision_sensitive_paths: string[],
 *   model_class: 'low_cost' | 'standard' | 'high_capability',
 *   cost_risk_cap: number,
 *   timeout_seconds: number,
 *   real_client_data_permitted: boolean,
 *   production_mutation_permitted: boolean,
 *   external_action_permitted: boolean,
 * }} OpenHandsWorkPacket
 */

/**
 * Validates a raw object as an OpenHands work packet. Fails closed: any
 * missing required field, wrong type, wrong `intended_agent_owner`, or a
 * `branch_name` outside `OPENHANDS_BRANCH_PREFIX` produces `ok: false`.
 *
 * Defaults (see `OPENHANDS_WORK_PACKET_DEFAULTS`) are applied only when the
 * raw input omits the field entirely (`undefined`) — an explicit wrong value
 * (e.g. `intended_agent_owner: 'cursor'`) is never silently overridden.
 *
 * @param {unknown} raw
 * @returns {{ ok: boolean, errors: string[], packet?: OpenHandsWorkPacket }}
 */
export function validateOpenHandsWorkPacket(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['work packet must be a non-null object'] };
  }

  const input = /** @type {Record<string, unknown>} */ (raw);
  /** @type {Record<string, unknown>} */
  const packet = { ...OPENHANDS_WORK_PACKET_DEFAULTS };
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) packet[key] = value;
  }

  const errors = [];

  for (const field of REQUIRED_FIELDS) {
    if (packet[field] === undefined || packet[field] === null) {
      errors.push(`missing required field: ${field}`);
    }
  }

  for (const field of NON_EMPTY_STRING_FIELDS) {
    if (packet[field] !== undefined && !isNonEmptyString(packet[field])) {
      errors.push(`${field} must be a non-empty string`);
    }
  }

  if (packet.parent_issue !== undefined && !isPositiveInteger(packet.parent_issue)) {
    errors.push('parent_issue must be a positive integer (GitHub issue number)');
  }

  for (const field of ARRAY_FIELDS) {
    if (packet[field] !== undefined && !Array.isArray(packet[field])) {
      errors.push(`${field} must be an array`);
    }
  }

  for (const field of NON_EMPTY_ARRAY_FIELDS) {
    if (Array.isArray(packet[field]) && packet[field].length === 0) {
      errors.push(`${field} must be a non-empty array`);
    }
  }

  if (packet.maximum_attempts !== undefined && !isPositiveInteger(packet.maximum_attempts)) {
    errors.push('maximum_attempts must be a positive integer');
  } else if (typeof packet.maximum_attempts === 'number' && packet.maximum_attempts > 10) {
    errors.push('maximum_attempts must be at most 10');
  }
  if (packet.timeout_seconds !== undefined && !isPositiveInteger(packet.timeout_seconds)) {
    errors.push('timeout_seconds must be a positive integer');
  }

  if (packet.model_class !== undefined && !MODEL_CLASSES.includes(packet.model_class)) {
    errors.push(`model_class must be one of: ${MODEL_CLASSES.join(', ')}`);
  }

  if (packet.cost_risk_cap !== undefined && !isPositiveNumber(packet.cost_risk_cap)) {
    errors.push('cost_risk_cap must be a positive number (max USD this packet may consume)');
  }

  for (const field of PROTECTED_FLAG_FIELDS) {
    if (packet[field] !== undefined && typeof packet[field] !== 'boolean') {
      errors.push(`${field} must be a boolean`);
    }
  }

  if (packet.intended_agent_owner !== REQUIRED_INTENDED_AGENT_OWNER) {
    errors.push(
      `intended_agent_owner must be "${REQUIRED_INTENDED_AGENT_OWNER}" (got: ${JSON.stringify(packet.intended_agent_owner)})`,
    );
  }

  if (packet.branch_name !== undefined) {
    try {
      assertBranchName(String(packet.branch_name));
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  return { ok: true, errors: [], packet: /** @type {OpenHandsWorkPacket} */ (packet) };
}
