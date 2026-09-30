function text(value) {
  return value == null ? '' : String(value).trim();
}

export function buildCandidateLearning(input) {
  if (!text(input.claim)) throw new Error('learning_claim_required');
  if (!text(input.sourceExperience)) throw new Error('source_experience_required');
  if (!text(input.verifier)) throw new Error('verifier_required');

  const confidence = Number(input.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error('confidence_must_be_between_0_and_1');
  }

  return {
    claim: text(input.claim),
    sourceExperience: text(input.sourceExperience),
    confidence,
    status: text(input.status || 'CURRENT'),
    verifier: text(input.verifier),
    promotionRequirement: text(input.promotionRequirement || 'review_required'),
    taskType: text(input.taskType) || null,
    domain: text(input.domain) || null,
    createdBy: text(input.createdBy || 'Forge'),
  };
}
