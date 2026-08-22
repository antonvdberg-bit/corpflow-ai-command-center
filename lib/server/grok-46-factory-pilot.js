/**
 * CorpFlowAI Grok 4.6 bounded factory pilot (#1038).
 *
 * Repo-only evaluator for one synthetic control-plane task executed through the
 * existing GitHub → (Temporal supervise) → Cursor Factory Handoff → Cursor path.
 * Grok 4.6 may be an executor/reviewer model inside Cursor. It must not become a
 * second dispatcher, queue, scheduler, Temporal replacement, merge/deploy
 * authority, or credential holder.
 *
 * @see docs/operations/GROK_46_FACTORY_PILOT_V1.md
 * @see config/grok-46-factory-pilot.v1.json
 */

import { FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME } from './factory-cursor-handoff.js';

export const GROK_46_FACTORY_PILOT_SCHEMA = 'corpflow.grok_46_factory_pilot.v1';

export const GROK_46_FACTORY_PILOT_SOURCE_ISSUE = 1038;

export const GROK_46_FACTORY_PILOT_MODEL_ID = 'cursor-grok-4.6-high-fast';

export const GROK_46_PILOT_VERDICT_PASS =
  'GROK 4.6 PILOT PASS — USE SELECTIVELY FOR LONG-HORIZON/HIGH-COMPLEXITY CURSOR WORK';

export const GROK_46_PILOT_VERDICT_NO_ADVANTAGE =
  'GROK 4.6 PILOT NO ADVANTAGE — KEEP CURRENT FACTORY MODEL DEFAULT';

export const GROK_46_PILOT_VERDICT_BLOCKED_PREFIX = 'GROK 4.6 PILOT BLOCKED — ';

export const CONTROL_PLANE_OWNERSHIP = Object.freeze({
  durableTruth: 'GitHub',
  supervisor: 'Temporal',
  wakePath: FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME,
  executor: 'Cursor',
  modelRole: 'executor_reviewer_inside_cursor',
});

export const FORBIDDEN_GROK_ROLES = Object.freeze([
  'second_dispatcher',
  'second_work_queue',
  'competing_scheduler',
  'temporal_replacement',
  'autonomous_merge_deploy_authority',
  'new_production_credential_holder',
]);

export const FORBIDDEN_PILOT_ACTIONS = Object.freeze([
  'purchase_ultra',
  'cursor_plan_upgrade',
  'enable_on_demand_spend',
  'paid_vendor_tool',
  'production_deploy',
  'db_schema_change',
  'env_secret_change',
  'external_send',
  'external_outreach',
  'payment',
  'public_launch',
  'autonomous_merge',
  'new_github_or_server_credential',
  'launch_grok_bot',
  'parallel_agent_launch',
]);

export const ALLOWED_PILOT_ACTIONS = Object.freeze([
  'discover',
  'inspect',
  'plan',
  'implement',
  'test',
  'self_check',
  'compare_existing_github_evidence',
  'open_pr',
]);

const GROK_MODEL_PATTERN = /grok[-_ ]?4\.6/i;

/**
 * @param {unknown} value
 * @returns {string}
 */
function asString(value) {
  return value == null ? '' : String(value).trim();
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function asStringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter(Boolean);
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function asBoolean(value) {
  return value === true;
}

/**
 * @param {string} reason
 */
export function formatGrok46BlockedVerdict(reason) {
  const exact = asString(reason) || 'unspecified blocker';
  return `${GROK_46_PILOT_VERDICT_BLOCKED_PREFIX}${exact}`;
}

/**
 * @param {unknown} verdict
 */
export function isAllowedGrok46PilotVerdict(verdict) {
  const text = asString(verdict);
  if (text === GROK_46_PILOT_VERDICT_PASS) return true;
  if (text === GROK_46_PILOT_VERDICT_NO_ADVANTAGE) return true;
  return text.startsWith(GROK_46_PILOT_VERDICT_BLOCKED_PREFIX) && text.length > GROK_46_PILOT_VERDICT_BLOCKED_PREFIX.length;
}

/**
 * @param {unknown} packet
 */
export function evaluateGrok46PilotPacket(packet = {}) {
  const sourceIssue = Number(packet.sourceIssue);
  const modelId = asString(packet.modelId);
  const wakePath = asString(packet.wakePath);
  const modelRole = asString(packet.modelRole);
  const roles = asStringList(packet.roles);
  const actions = asStringList(packet.actions);
  const launchMechanism = asString(packet.launchMechanism);

  if (!Number.isInteger(sourceIssue) || sourceIssue !== GROK_46_FACTORY_PILOT_SOURCE_ISSUE) {
    return {
      ok: false,
      blockedReason: 'source issue is not #1038',
    };
  }

  const forbiddenRole = [...roles, modelRole].find((role) => FORBIDDEN_GROK_ROLES.includes(role));
  if (forbiddenRole) {
    return {
      ok: false,
      blockedReason: `Grok role ${forbiddenRole} is forbidden`,
    };
  }

  const forbiddenAction = actions.find((action) => FORBIDDEN_PILOT_ACTIONS.includes(action));
  if (forbiddenAction) {
    return {
      ok: false,
      blockedReason: `protected or out-of-scope action ${forbiddenAction}`,
    };
  }

  if (actions.includes('autonomous_merge') || asBoolean(packet.selfMerge)) {
    return {
      ok: false,
      blockedReason: 'autonomous merge is forbidden',
    };
  }

  if (launchMechanism && launchMechanism !== 'existing_factory_automation') {
    return {
      ok: false,
      blockedReason: 'parallel agent-launch mechanism is forbidden',
    };
  }

  if (wakePath && wakePath !== FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME) {
    return {
      ok: false,
      blockedReason: 'wake path must remain CorpFlowAI Cursor Factory Handoff',
    };
  }

  if (modelId && !GROK_MODEL_PATTERN.test(modelId)) {
    return {
      ok: false,
      blockedReason: 'pilot model is not Grok 4.6 on the existing Cursor path',
    };
  }

  if (modelRole && modelRole !== CONTROL_PLANE_OWNERSHIP.modelRole) {
    return {
      ok: false,
      blockedReason: 'Grok may only be an executor/reviewer model inside Cursor',
    };
  }

  const unknownAction = actions.find(
    (action) => !ALLOWED_PILOT_ACTIONS.includes(action) && !FORBIDDEN_PILOT_ACTIONS.includes(action),
  );
  if (unknownAction) {
    return {
      ok: false,
      blockedReason: `unknown action ${unknownAction}`,
    };
  }

  return { ok: true, blockedReason: null };
}

/**
 * Intentional bounded synthetic failure: a packet that tries to make Grok a
 * second dispatcher or spend authority must fail closed.
 *
 * @param {unknown} packet
 */
export function evaluateIntentionalSyntheticFailure(packet = {}) {
  const result = evaluateGrok46PilotPacket(packet);
  if (result.ok) {
    return {
      ok: false,
      detail: 'intentional failure packet unexpectedly passed',
      blockedReason: null,
    };
  }
  return {
    ok: true,
    detail: result.blockedReason,
    blockedReason: result.blockedReason,
  };
}

/**
 * Correction after the intentional failure: rewrite as executor-only.
 *
 * @param {unknown} failedPacket
 * @param {unknown} correctedPacket
 */
export function evaluateSyntheticFailureCorrection(failedPacket, correctedPacket) {
  const failed = evaluateIntentionalSyntheticFailure(failedPacket);
  const corrected = evaluateGrok46PilotPacket(correctedPacket);
  if (!failed.ok) {
    return {
      ok: false,
      detail: failed.detail,
    };
  }
  if (!corrected.ok) {
    return {
      ok: false,
      detail: `corrected packet still blocked: ${corrected.blockedReason}`,
    };
  }
  return {
    ok: true,
    detail: `failed closed on ${failed.blockedReason}; corrected executor-only packet passed`,
  };
}

/**
 * Compare against existing GitHub factory evidence. A missing Composer
 * counterpart is a recorded gap, not a reason to launch duplicate paid work.
 *
 * @param {unknown} snapshot
 */
export function evaluateComparisonSnapshot(snapshot = {}) {
  const cases = Array.isArray(snapshot.cases) ? snapshot.cases : [];
  const githubCases = cases.filter((item) => Number(item?.pr) > 0 && Number(item?.issue) > 0);
  if (githubCases.length < 1) {
    return {
      ok: false,
      comparisonGap: 'no existing GitHub factory evidence supplied',
      duplicatePaidRunRequested: false,
    };
  }

  const duplicatePaidRunRequested = asBoolean(snapshot.duplicatePaidRunRequested);
  if (duplicatePaidRunRequested) {
    return {
      ok: false,
      comparisonGap: 'duplicate paid Composer rerun requested',
      duplicatePaidRunRequested: true,
    };
  }

  const composerCounterpart = githubCases.find((item) =>
    /composer/i.test(asString(item.modelId)),
  );
  return {
    ok: true,
    comparisonGap: composerCounterpart
      ? null
      : 'no Composer-only factory Automation counterpart in the accessible evidence window',
    duplicatePaidRunRequested: false,
    githubCaseCount: githubCases.length,
  };
}

/**
 * @param {unknown} evidence
 */
export function resolveGrok46PilotVerdict(evidence = {}) {
  const packet = evaluateGrok46PilotPacket(evidence.packet || {});
  if (!packet.ok) {
    return formatGrok46BlockedVerdict(packet.blockedReason);
  }

  const correction = evaluateSyntheticFailureCorrection(
    evidence.intentionalFailurePacket,
    evidence.correctedPacket,
  );
  if (!correction.ok) {
    return formatGrok46BlockedVerdict(correction.detail);
  }

  const comparison = evaluateComparisonSnapshot(evidence.comparison || {});
  if (!comparison.ok) {
    return formatGrok46BlockedVerdict(comparison.comparisonGap);
  }

  if (asBoolean(evidence.operatorInterventionRequired)) {
    return formatGrok46BlockedVerdict('operator intervention required during the bounded pilot');
  }
  if (asBoolean(evidence.onDemandSpendEnabled) || asBoolean(evidence.planUpgrade)) {
    return formatGrok46BlockedVerdict('incremental spend or plan upgrade was requested');
  }
  if (asBoolean(evidence.secondDispatcherCreated)) {
    return formatGrok46BlockedVerdict('second dispatcher created');
  }
  if (asBoolean(evidence.humanRepromptRequired)) {
    return formatGrok46BlockedVerdict('human re-prompt required to finish the bounded pilot');
  }

  const fitness = {
    completedWithoutReprompt: evidence.humanRepromptRequired === false,
    instructionAdherence: packet.ok,
    selfVerification: asBoolean(evidence.selfVerificationCompleted),
    controlPlaneReview: asBoolean(evidence.controlPlaneReviewCompleted),
    syntheticCorrection: correction.ok,
    operatorIntervention: evidence.operatorInterventionRequired === false,
  };
  const fitnessCount = Object.values(fitness).filter(Boolean).length;
  if (fitnessCount < 5) {
    return GROK_46_PILOT_VERDICT_NO_ADVANTAGE;
  }

  return GROK_46_PILOT_VERDICT_PASS;
}

/**
 * @param {{ id: string, ok: boolean, detail?: string | null }} proof
 */
function proofRow(proof) {
  return {
    id: proof.id,
    ok: proof.ok === true,
    detail: asString(proof.detail) || null,
  };
}

/**
 * Run synthetic proofs A–H for the bounded Grok 4.6 factory pilot.
 *
 * @param {unknown} input
 */
export function runGrok46FactoryPilot(input = {}) {
  const packetResult = evaluateGrok46PilotPacket(input.packet || {});
  const failureResult = evaluateIntentionalSyntheticFailure(input.intentionalFailurePacket || {});
  const correctionResult = evaluateSyntheticFailureCorrection(
    input.intentionalFailurePacket,
    input.correctedPacket,
  );
  const comparisonResult = evaluateComparisonSnapshot(input.comparison || {});
  const verdict = resolveGrok46PilotVerdict(input);
  const proofs = [
    proofRow({
      id: 'A',
      ok:
        GROK_MODEL_PATTERN.test(asString(input.packet?.modelId)) &&
        asString(input.packet?.launchMechanism) === 'existing_factory_automation',
      detail: asString(input.packet?.modelId),
    }),
    proofRow({
      id: 'B',
      ok:
        packetResult.ok &&
        asString(input.packet?.wakePath) === FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME &&
        asString(input.packet?.modelRole) === CONTROL_PLANE_OWNERSHIP.modelRole,
      detail: packetResult.blockedReason,
    }),
    proofRow({
      id: 'C',
      ok:
        Number(input.packet?.sourceIssue) === GROK_46_FACTORY_PILOT_SOURCE_ISSUE &&
        input.packet?.selfMerge === false &&
        asStringList(input.packet?.actions).includes('open_pr'),
      detail: 'one source issue, one PR, no self-merge',
    }),
    proofRow({
      id: 'D',
      ok: failureResult.ok,
      detail: failureResult.detail,
    }),
    proofRow({
      id: 'E',
      ok: correctionResult.ok,
      detail: correctionResult.detail,
    }),
    proofRow({
      id: 'F',
      ok: comparisonResult.ok && comparisonResult.duplicatePaidRunRequested === false,
      detail: comparisonResult.comparisonGap,
    }),
    proofRow({
      id: 'G',
      ok:
        input.planUpgrade === false &&
        input.onDemandSpendEnabled === false &&
        input.secondDispatcherCreated === false &&
        input.operatorInterventionRequired === false,
      detail: 'zero incremental spend; no second dispatcher; no operator gate',
    }),
    proofRow({
      id: 'H',
      ok: isAllowedGrok46PilotVerdict(verdict),
      detail: verdict,
    }),
  ];

  return {
    schema: GROK_46_FACTORY_PILOT_SCHEMA,
    sourceIssue: GROK_46_FACTORY_PILOT_SOURCE_ISSUE,
    wakePath: FACTORY_CURSOR_HANDOFF_WORKFLOW_NAME,
    ownership: CONTROL_PLANE_OWNERSHIP,
    proofs,
    allProofsPassed: proofs.every((proof) => proof.ok),
    comparisonGap: comparisonResult.comparisonGap || null,
    verdict,
  };
}
