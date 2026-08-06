/**
 * OpenHands dispatcher/collision adapter — dry-run only.
 *
 * Integrates conceptually with the existing `ActivationOwner` pattern in
 * `lib/server/dispatcher-agent-activation.js` WITHOUT enabling live OpenHands
 * runs. Scheduled/unattended OpenHands activation is NOT enabled by this
 * module or by this PR — see
 * `lib/server/dispatcher-agent-activation.js` `SKIP_OPENHANDS_NOT_ENABLED`.
 *
 * This module never calls the Cursor Cloud API, never calls an OpenHands
 * control-plane API, and never starts a container. It only classifies task
 * classes, detects collisions against caller-supplied "existing owner"
 * records, and produces a dry-run plan object for review.
 *
 * Controlling issue: #743 — package/validation only, no live activation.
 *
 * @see docs/operations/OPENHANDS_OPERATING_CHARTER.md
 * @see lib/server/dispatcher-agent-activation.js
 */

export const OPENHANDS_OWNER = 'openhands';

/**
 * Task classes OpenHands may normally own, per
 * `docs/operations/OPENHANDS_OPERATING_CHARTER.md` § "Work routing" (packet
 * §16 task-class list): routine, repetitive, operational, documentation,
 * evidence, and low-risk implementation work.
 */
export const OPENHANDS_ELIGIBLE_TASK_CLASSES = /** @type {const} */ ([
  'documentation_maintenance',
  'repository_inventory_check',
  'backup_verification_readonly',
  'health_check_readonly',
  'stale_reference_or_dead_link_audit',
  'lint_or_formatting',
  'dependency_review',
  'deterministic_test_execution',
  'deterministic_test_bounded_repair',
  'synthetic_fixture_preparation',
  'issue_or_evidence_packet_preparation',
  'routine_ci_failure_analysis',
  'low_risk_bounded_code_change',
  'draft_pr_creation',
  'review_feedback_repair_low_risk',
  'scheduled_operational_check',
  'specialist_packet_preparation_for_cursor',
]);

/**
 * Task classes Cursor should normally own, per the same charter section:
 * authentication/authorisation architecture, cross-tenant/database-sensitive
 * work, complex state/concurrency, large refactors, production-critical or
 * urgent work, OpenHands-platform work, and packets OpenHands has already
 * failed twice.
 */
export const CURSOR_PREFERRED_TASK_CLASSES = /** @type {const} */ ([
  'auth_or_authorization_architecture',
  'cross_tenant_or_database_sensitive',
  'complex_state_concurrency_or_recovery',
  'large_refactor',
  'production_critical_change',
  'urgent_incident_repair',
  'openhands_platform_install_upgrade_or_recovery',
  'packet_failed_twice_by_openhands',
  'reliability_over_cost_priority',
]);

/**
 * @typedef {'openhands' | 'cursor' | 'reject'} OpenHandsEligibilityClass
 */

/**
 * Classifies a single task class string into an ownership recommendation.
 * Unknown/blank task classes fail closed to `'reject'` rather than
 * defaulting to either worker.
 *
 * @param {string | null | undefined} taskClass
 * @returns {OpenHandsEligibilityClass}
 */
export function classifyOpenHandsEligibility(taskClass) {
  const s = String(taskClass ?? '').trim();
  if (!s) return 'reject';
  if (/** @type {readonly string[]} */ (CURSOR_PREFERRED_TASK_CLASSES).includes(s)) return 'cursor';
  if (/** @type {readonly string[]} */ (OPENHANDS_ELIGIBLE_TASK_CLASSES).includes(s)) return 'openhands';
  return 'reject';
}

/** Human-readable collision rules — for docs/PR review, not enforced elsewhere. */
export const COLLISION_RULES = {
  schema: 'corpflow.openhands_collision_rules.v1',
  description:
    'OpenHands and Cursor/Codex must not concurrently own the same packet_id, ' +
    'branch_name, or overlapping allowed_files/collision_sensitive_paths. ' +
    'Duplicate claims must be rejected or converted into review work.',
  rules: /** @type {const} */ ([
    'Same packet_id already owned by a different, active (non-terminal) agent is a collision.',
    'Same branch_name already owned by a different, active agent is a collision.',
    'Overlapping allowed_files or collision_sensitive_paths with a different, active agent is a collision.',
    'Labels, comments, or plan text alone are not ownership evidence — see requireOwnershipEvidence.',
  ]),
};

/**
 * @typedef {{
 *   agentType: 'cursor' | 'codex' | 'openhands',
 *   packetId?: string | null,
 *   branchName?: string | null,
 *   ownedPaths?: string[] | null,
 * }} ExistingOwner
 */

/**
 * @param {unknown[] | null | undefined} a
 * @param {unknown[] | null | undefined} b
 */
function pathsOverlap(a, b) {
  const setA = new Set(
    (Array.isArray(a) ? a : []).map((p) => String(p ?? '').trim()).filter(Boolean),
  );
  if (!setA.size) return false;
  for (const raw of Array.isArray(b) ? b : []) {
    const p = String(raw ?? '').trim();
    if (p && setA.has(p)) return true;
  }
  return false;
}

/**
 * Builds a dry-run routing plan for an OpenHands work packet: what OpenHands
 * *would* do if activation were enabled, and whether a collision with an
 * existing Cursor/Codex owner blocks that. Does not call any API and does
 * not mutate `existingOwners`.
 *
 * @param {{ packet: Record<string, unknown>, existingOwners?: ExistingOwner[] }} input
 * @returns {{
 *   schema: string,
 *   mode: 'dry_run',
 *   would_route_to: 'openhands' | 'reject',
 *   action: 'WOULD_ROUTE_OPENHANDS_PRIVATE_WORKER' | 'REJECT_COLLISION',
 *   packet_id: string | null,
 *   branch_name: string | null,
 *   collisions: Array<{ agentType: string, reasons: string[] }>,
 *   note: string,
 * }}
 */
export function buildOpenHandsDryRunPlan({ packet, existingOwners = [] }) {
  const p = packet && typeof packet === 'object' ? packet : {};
  const packetId = String(p.packet_id ?? '').trim();
  const branchName = String(p.branch_name ?? '').trim();
  const collisionPaths = [
    ...(Array.isArray(p.allowed_files) ? p.allowed_files : []),
    ...(Array.isArray(p.collision_sensitive_paths) ? p.collision_sensitive_paths : []),
  ];

  /** @type {Array<{ agentType: string, reasons: string[] }>} */
  const collisions = [];
  for (const owner of Array.isArray(existingOwners) ? existingOwners : []) {
    if (!owner || typeof owner !== 'object') continue;
    if (owner.agentType !== 'cursor' && owner.agentType !== 'codex') continue;

    const reasons = [];
    const ownerPacketId = String(owner.packetId ?? '').trim();
    const ownerBranchName = String(owner.branchName ?? '').trim();
    if (packetId && ownerPacketId && ownerPacketId === packetId) reasons.push('packet_id');
    if (branchName && ownerBranchName && ownerBranchName === branchName) reasons.push('branch_name');
    if (pathsOverlap(collisionPaths, owner.ownedPaths)) reasons.push('overlapping_paths');

    if (reasons.length) {
      collisions.push({ agentType: owner.agentType, reasons });
    }
  }

  const hasCollision = collisions.length > 0;

  return {
    schema: 'corpflow.openhands_dry_run_plan.v1',
    mode: 'dry_run',
    would_route_to: hasCollision ? 'reject' : OPENHANDS_OWNER,
    action: hasCollision ? 'REJECT_COLLISION' : 'WOULD_ROUTE_OPENHANDS_PRIVATE_WORKER',
    packet_id: packetId || null,
    branch_name: branchName || null,
    collisions,
    note: 'Dry-run only — no container start, no Cursor Cloud API call, no OpenHands activation.',
  };
}

/**
 * @param {unknown} value
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Fails closed on ownership claims that are not backed by concrete evidence.
 * Per `docs/operations/OPENHANDS_OPERATING_CHARTER.md`: "A task is active
 * only when there is a real run ID, branch, and current activity evidence.
 * Comments and labels alone do not constitute active work." Any missing
 * field fails the whole check.
 *
 * @param {{
 *   agentType?: string | null,
 *   taskRunId?: string | null,
 *   branchName?: string | null,
 *   ownedPaths?: string[] | null,
 *   activityTimestamp?: string | null,
 * }} evidence
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function requireOwnershipEvidence(evidence) {
  const e = evidence && typeof evidence === 'object' ? evidence : {};
  const errors = [];

  if (!isNonEmptyString(e.agentType)) {
    errors.push('missing agentType — labels alone are not ownership evidence');
  }
  if (!isNonEmptyString(e.taskRunId)) {
    errors.push('missing taskRunId — a real run ID is required, not a label or comment');
  }
  if (!isNonEmptyString(e.branchName)) {
    errors.push('missing branchName');
  }
  if (!Array.isArray(e.ownedPaths) || e.ownedPaths.length === 0) {
    errors.push('missing ownedPaths (must be a non-empty array)');
  }
  if (!isNonEmptyString(e.activityTimestamp)) {
    errors.push('missing activityTimestamp');
  } else if (Number.isNaN(Date.parse(e.activityTimestamp))) {
    errors.push('activityTimestamp is not a valid date/time');
  }

  return { ok: errors.length === 0, errors };
}
