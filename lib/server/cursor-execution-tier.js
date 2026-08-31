/**
 * Cursor Cloud Agent spend-control policy (#1249).
 *
 * Tiers are a controller decision, not a caller-selected model default.
 * GitHub issue comments are the durable evidence source for exceptions.
 */

export const CURSOR_EXECUTION_TIER_SCHEMA = 'corpflow.cursor_execution_tier.v1';
export const CURSOR_EXECUTION_TIER_MARKER = 'corpflow.cursor_execution_tier.v1';
export const CURSOR_EXECUTION_TIERS = Object.freeze(['low', 'medium', 'high']);

export const CURSOR_EXECUTION_TIER_MODELS = Object.freeze({
  low: Object.freeze({
    // Cursor's lowest-cost GPT-5.6 family model. Deliberately no Fast
    // parameter: Fast doubles pricing and is not the economical default.
    id: 'gpt-5.6-luna',
    params: Object.freeze([]),
  }),
  medium: Object.freeze({
    // Account-observed routine implementation model; stronger than Luna.
    id: 'gpt-5.6-terra-medium',
    params: Object.freeze([]),
  }),
  high: Object.freeze({
    // Account-observed premium model. Explicit authorization is mandatory.
    id: 'cursor-grok-4.6-high-fast',
    params: Object.freeze([]),
  }),
});

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
 * Resolve exactly one explicit Cloud Agent model selection. Omitted tier is
 * deliberately LOW; unrecognised tiers never fall back to a user/team model.
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
    model: {
      id: CURSOR_EXECUTION_TIER_MODELS[tier].id,
      params: CURSOR_EXECUTION_TIER_MODELS[tier].params.map((param) => ({ ...param })),
    },
    evidence,
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
