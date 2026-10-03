export const IMPROVEMENT_CONTRACT_SCHEMA = 'corpflow.improvement_contract.v1';

export const LEARNING_STATES = Object.freeze([
  'OBSERVATION',
  'CANDIDATE',
  'VERIFIED',
  'ADOPTED',
  'SUPERSEDED',
]);

const REVIEW_REQUIRED_DOMAINS = new Set([
  'architecture',
  'security',
  'commercial',
  'client_commitment',
  'financial_policy',
  'production',
]);

function text(value) {
  return value == null ? '' : String(value).trim();
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boundedRate(value) {
  return Math.max(0, Math.min(1, number(value)));
}

export function buildImprovementContract(input = {}) {
  const reusableLesson = text(input.reusableLesson);
  const routingImplication = text(input.routingImplication);
  const correction = text(input.correction);
  const supersedes = text(input.supersedes);
  const materialLearning = Boolean(reusableLesson || routingImplication || correction || supersedes);

  return {
    schema: IMPROVEMENT_CONTRACT_SCHEMA,
    workItem: text(input.workItem) || null,
    agent: text(input.agent) || 'unknown',
    taskType: text(input.taskType) || null,
    changed: text(input.changed) || 'no_material_change_recorded',
    verification: text(input.verification) || 'unverified',
    correction: correction || null,
    reusableLesson: reusableLesson || null,
    routingImplication: routingImplication || null,
    durableSourceUpdated: text(input.durableSourceUpdated) || null,
    supersedes: supersedes || null,
    materialLearning,
    learningOutcome: materialLearning ? 'CANDIDATE_LEARNING' : 'NO_MATERIAL_LEARNING',
  };
}

export function decideLearningPromotion(input = {}) {
  const currentState = text(input.currentState || 'OBSERVATION').toUpperCase();
  if (!LEARNING_STATES.includes(currentState)) throw new Error('invalid_learning_state');

  if (currentState === 'SUPERSEDED') {
    return { state: 'SUPERSEDED', auto: false, reason: 'terminal_superseded_state' };
  }

  const domain = text(input.domain).toLowerCase();
  const confidence = boundedRate(input.confidence);
  const passes = Math.max(0, Math.floor(number(input.deterministicPasses)));
  const failures = Math.max(0, Math.floor(number(input.deterministicFailures)));
  const humanReviewed = input.humanReviewed === true;
  const explicitlyAdopted = input.explicitlyAdopted === true;
  const lowRisk = input.lowRisk === true && !REVIEW_REQUIRED_DOMAINS.has(domain);

  if (input.superseded === true) {
    return { state: 'SUPERSEDED', auto: false, reason: 'superseded_by_newer_evidence' };
  }

  if (explicitlyAdopted && humanReviewed) {
    return { state: 'ADOPTED', auto: false, reason: 'human_reviewed_adoption' };
  }

  if (!lowRisk) {
    return {
      state: currentState === 'OBSERVATION' ? 'CANDIDATE' : currentState,
      auto: false,
      reason: 'review_required_domain_or_risk',
    };
  }

  if (failures === 0 && passes >= 3 && confidence >= 0.9) {
    return { state: 'ADOPTED', auto: true, reason: 'repeated_low_risk_deterministic_evidence' };
  }

  if (failures === 0 && passes >= 2 && confidence >= 0.8) {
    return { state: 'VERIFIED', auto: true, reason: 'low_risk_deterministic_evidence' };
  }

  return {
    state: currentState === 'OBSERVATION' ? 'CANDIDATE' : currentState,
    auto: false,
    reason: 'insufficient_evidence',
  };
}

export function recommendExecutor(input = {}) {
  const deterministic = input.deterministic || {};
  const forge = input.forge || {};

  const deterministicSamples = Math.max(0, Math.floor(number(deterministic.samples)));
  const deterministicPassRate = boundedRate(deterministic.passRate);
  if (deterministicSamples >= 5 && deterministicPassRate >= 0.98) {
    return {
      executor: 'deterministic',
      reason: 'proven_rule_based_path',
      confidence: 'high',
    };
  }

  const forgeSamples = Math.max(0, Math.floor(number(forge.samples)));
  const forgePassRate = boundedRate(forge.passRate);
  const forgeCorrectionRate = boundedRate(forge.correctionRate);
  const forgeEscalationRate = boundedRate(forge.escalationRate);

  if (
    forgeSamples >= 3
    && forgePassRate >= 0.8
    && forgeCorrectionRate <= 0.2
    && forgeEscalationRate <= 0.3
  ) {
    return {
      executor: 'Forge',
      reason: 'acceptable_verified_output_economics',
      confidence: forgeSamples >= 10 ? 'high' : 'medium',
    };
  }

  return {
    executor: 'Cursor',
    reason: forgeSamples === 0 ? 'no_reliable_low_tier_evidence' : 'low_tier_rework_or_failure_too_high',
    confidence: 'medium',
  };
}

export function improvementNeeded(input = {}) {
  const actualCost = number(input.actualCost);
  const expectedCost = number(input.expectedCost);
  const actualElapsedMs = number(input.actualElapsedMs);
  const expectedElapsedMs = number(input.expectedElapsedMs);

  return {
    costException: expectedCost > 0 && actualCost > expectedCost * 1.25,
    timeException: expectedElapsedMs > 0 && actualElapsedMs > expectedElapsedMs * 1.5,
    repeatedFailure: Math.max(0, Math.floor(number(input.consecutiveFailures))) >= 2,
    operatorIntervention: input.operatorIntervention === true,
  };
}
