/**
 * Cursor Cloud Agent spend-control policy (#1249).
 *
 * Tiers are a controller decision, not a caller-selected model default.
 * GitHub issue comments are the durable evidence source for exceptions.
 */

export const CURSOR_EXECUTION_TIER_SCHEMA = 'corpflow.cursor_execution_tier.v1';
export const CURSOR_EXECUTION_TIER_MARKER = 'corpflow.cursor_execution_tier.v1';
export const CURSOR_EXECUTION_TIERS = Object.freeze(['low', 'medium', 'high']);

export const CURSOR_EXECUTION_TIER_CONTRACTS = Object.freeze({
  low: Object.freeze({
    behavior: 'economical_non_fast_moderate',
    noAutomaticEscalation: true,
  }),
  medium: Object.freeze({
    behavior: 'stronger_reasoning_with_justification',
    noAutomaticEscalation: true,
  }),
  high: Object.freeze({
    behavior: 'premium_exception_with_authorization',
    noAutomaticEscalation: true,
  }),
});
const LIVE_MODEL_SELECTION_KEYS = new Set();

function modelSelectionKey(model) {
  return `${String(model?.id || '').trim()}|${JSON.stringify(normalizedParams(model?.params))}`;
}

export function isLiveCursorExecutionModelSelection(model) {
  return LIVE_MODEL_SELECTION_KEYS.has(modelSelectionKey(model));
}

const AUTHORIZED_TIER_EVIDENCE_ACTORS = new Set([
  'antonvdberg-bit',
  'github-actions',
  'github-actions[bot]',
]);

function sourceIssueNumber(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function commentActor(comment) {
  return String(
    comment?.user?.login || comment?.author?.login || comment?.author || comment?.login || '',
  )
    .trim()
    .toLowerCase();
}

function parseTierEvidence(text) {
  const match = String(text || '').match(
    new RegExp(`<!--\\s*${CURSOR_EXECUTION_TIER_MARKER}\\s+(\\{[\\s\\S]*?\\})\\s*-->`, 'i'),
  );
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (parsed?.schema !== CURSOR_EXECUTION_TIER_SCHEMA) return null;
    return parsed;
  } catch {
    return null;
  }
}

function findTierEvidence(comments, sourceIssue, tier) {
  for (const comment of Array.isArray(comments) ? [...comments].reverse() : []) {
    const evidence = parseTierEvidence(comment?.body);
    if (
      evidence &&
      sourceIssueNumber(evidence.source_issue) === sourceIssue &&
      evidence.tier === tier &&
      AUTHORIZED_TIER_EVIDENCE_ACTORS.has(commentActor(comment))
    ) {
      return evidence;
    }
  }
  return null;
}

function requestedTierFromComments(comments, sourceIssue) {
  for (const comment of Array.isArray(comments) ? [...comments].reverse() : []) {
    const evidence = parseTierEvidence(comment?.body);
    if (
      evidence &&
      sourceIssueNumber(evidence.source_issue) === sourceIssue &&
      CURSOR_EXECUTION_TIERS.includes(evidence.tier)
    ) {
      return evidence.tier;
    }
  }
  return null;
}

/**
 * Resolve the execution behavior contract. Model selection deliberately happens
 * later against the live account catalogue; issue packets must not pin UI names,
 * stale IDs, or parameter spellings.
 *
 * MEDIUM needs a durable controller justification. HIGH additionally needs an
 * explicit durable approval. Both must be a structured issue-comment marker.
 */
export function resolveCursorExecutionTier(input = {}) {
  const sourceIssue = sourceIssueNumber(input.sourceIssue || input.issue?.number);
  const tier = String(
    input.tier || requestedTierFromComments(input.comments, sourceIssue) || 'low',
  )
    .trim()
    .toLowerCase();
  if (!CURSOR_EXECUTION_TIERS.includes(tier)) {
    throw new Error(`CURSOR_EXECUTION_TIER_INVALID: ${tier || 'empty'}`);
  }

  let evidence = null;
  if (tier !== 'low') {
    if (!sourceIssue) {
      throw new Error(`CURSOR_EXECUTION_TIER_${tier.toUpperCase()}_SOURCE_ISSUE_REQUIRED`);
    }
    evidence = findTierEvidence(input.comments, sourceIssue, tier);
    if (!evidence || !String(evidence.controller_justification || '').trim()) {
      throw new Error(`CURSOR_EXECUTION_TIER_${tier.toUpperCase()}_JUSTIFICATION_REQUIRED`);
    }
    if (tier === 'high' && evidence.authorization !== 'approved') {
      throw new Error('CURSOR_EXECUTION_TIER_HIGH_AUTHORIZATION_REQUIRED');
    }
  }

  return {
    tier,
    contract: CURSOR_EXECUTION_TIER_CONTRACTS[tier],
    evidence,
  };
}

function normalizedParams(params) {
  return (Array.isArray(params) ? params : [])
    .map((param) => ({
      id: String(param?.id || '').trim(),
      value: String(param?.value || '').trim(),
    }))
    .filter((param) => param.id && param.value)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function isNonFast(params) {
  const fast = params.find((param) => param.id === 'fast');
  return !fast || fast.value === 'false';
}

function hasModerateReasoning(params) {
  return params.some(
    (param) =>
      (param.id === 'reasoning' || param.id === 'effort') && param.value === 'medium',
  );
}

function boundedContextRank(params) {
  const context = params.find((param) => param.id === 'context');
  if (!context) return 0;
  const numeric = Number.parseFloat(context.value);
  if (!Number.isFinite(numeric)) return Number.MAX_SAFE_INTEGER;
  return /k$/i.test(context.value) ? numeric * 1000 : numeric;
}

function modelFamilyRank(id, tier) {
  const modelId = String(id || '').toLowerCase();
  if (!/^gpt-5\.6-[a-z0-9.-]+$/.test(modelId)) return Number.MAX_SAFE_INTEGER;
  if (tier === 'low' && /(?:high|fast)/.test(modelId)) return Number.MAX_SAFE_INTEGER;
  if (tier === 'medium' && /high/.test(modelId)) return Number.MAX_SAFE_INTEGER;
  return 0;
}

/**
 * Resolve exactly one API-ready model selection from the live account catalogue.
 * This intentionally uses machine IDs and variant parameters only, never display
 * names or aliases. A LOW selection needs a non-Fast, medium-reasoning variant;
 * absence of that machine-readable evidence fails closed rather than escalating.
 */
export function resolveCursorExecutionModelSelection(modelCatalog, input = {}) {
  const resolved = resolveCursorExecutionTier(input);
  const items = Array.isArray(modelCatalog?.items) ? modelCatalog.items : [];
  const candidates = [];

  for (const item of items) {
    const id = String(item?.id || '').trim();
    const familyRank = modelFamilyRank(id, resolved.tier);
    if (familyRank === Number.MAX_SAFE_INTEGER) continue;
    for (const variant of Array.isArray(item?.variants) ? item.variants : []) {
      const params = normalizedParams(variant?.params);
      const lowCompliant =
        isNonFast(params) && hasModerateReasoning(params) && !params.some((param) => param.value === 'high');
      const tierCompliant =
        resolved.tier === 'low'
          ? lowCompliant
          : resolved.tier === 'medium'
            ? isNonFast(params) && hasModerateReasoning(params)
            : params.some(
                (param) =>
                  (param.id === 'reasoning' || param.id === 'effort') && param.value === 'high',
              );
      if (!tierCompliant) continue;
      candidates.push({
        id,
        params,
        familyRank,
        contextRank: boundedContextRank(params),
      });
    }
  }

  candidates.sort(
    (a, b) =>
      a.familyRank - b.familyRank ||
      a.contextRank - b.contextRank ||
      a.id.localeCompare(b.id) ||
      JSON.stringify(a.params).localeCompare(JSON.stringify(b.params)),
  );
  const chosen = candidates[0];
  if (!chosen) {
    throw new Error(
      `CURSOR_EXECUTION_TIER_NO_COMPLIANT_${resolved.tier.toUpperCase()}_MODEL_SELECTION`,
    );
  }
  const model = { id: chosen.id, params: chosen.params };
  LIVE_MODEL_SELECTION_KEYS.add(modelSelectionKey(model));
  return {
    tier: resolved.tier,
    contract: resolved.contract,
    evidence: resolved.evidence,
    model,
  };
}

export function formatCursorExecutionTierEvidence(input = {}) {
  const sourceIssue = sourceIssueNumber(input.source_issue);
  if (!sourceIssue) throw new Error('Cursor execution tier evidence requires source_issue');
  const tier = String(input.tier || '').trim().toLowerCase();
  if (!CURSOR_EXECUTION_TIERS.includes(tier)) {
    throw new Error('Cursor execution tier evidence requires valid tier');
  }
  const evidence = {
    schema: CURSOR_EXECUTION_TIER_SCHEMA,
    source_issue: sourceIssue,
    tier,
    controller_justification: String(input.controller_justification || '').trim(),
    authorization: input.authorization === 'approved' ? 'approved' : 'not_approved',
  };
  return `CURSOR EXECUTION TIER\n\nSource issue: #${sourceIssue}\nTier: ${tier}\nController justification: ${evidence.controller_justification || 'n/a'}\nHigh authorization: ${evidence.authorization}\n\n<!-- ${CURSOR_EXECUTION_TIER_MARKER} ${JSON.stringify(evidence)} -->\n`;
}
