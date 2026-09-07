/**
 * CorpFlowAI Cursor economic execution gate (#1254).
 *
 * One fail-closed policy surface for autonomous remote Cursor execution.
 * Local Cursor Desktop use is intentionally out of scope: this module only
 * governs CorpFlowAI-controlled remote factory/API execution.
 */
import { resolveCursorExecutionTier } from './cursor-execution-tier.js';

export const CORPFLOW_CURSOR_MODES = Object.freeze([
  'PARKED',
  'LOCAL_ONLY',
  'FACTORY_ARMED',
]);

export const CURSOR_TASK_COMPLEXITIES = Object.freeze([
  'simple',
  'moderate',
  'difficult',
]);

export const CURSOR_ECONOMIC_ROUTING = Object.freeze({
  simple: Object.freeze({
    tier: 'low',
    max_attempts: 1,
    max_follow_ups: 0,
    max_elapsed_minutes: 20,
  }),
  moderate: Object.freeze({
    tier: 'medium',
    max_attempts: 1,
    max_follow_ups: 1,
    max_elapsed_minutes: 45,
  }),
  difficult: Object.freeze({
    tier: 'high',
    max_attempts: 1,
    max_follow_ups: 1,
    max_elapsed_minutes: 90,
  }),
});

function issueLabels(issue) {
  return (Array.isArray(issue?.labels) ? issue.labels : [])
    .map((label) => String(label?.name || label || '').trim().toLowerCase())
    .filter(Boolean);
}

export function normalizeCorpFlowCursorMode(value) {
  const mode = String(value || '').trim().toUpperCase();
  return CORPFLOW_CURSOR_MODES.includes(mode) ? mode : 'PARKED';
}

/**
 * Resolve the master Cursor mode from the explicit environment first, then
 * from the GitHub Actions repository variable. Any lookup failure is PARKED.
 * This is deliberately read-only and never mutates repository configuration.
 */
export async function readCorpFlowCursorMode(input = {}) {
  const explicit = String(
    input.mode ?? process.env.CORPFLOW_CURSOR_MODE ?? '',
  ).trim();
  if (explicit) return normalizeCorpFlowCursorMode(explicit);

  const token = String(input.token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
  const repo = String(input.repo || process.env.GITHUB_REPOSITORY || '').trim();
  const fetchFn = input.fetch || globalThis.fetch;
  if (!token || !repo || !repo.includes('/') || typeof fetchFn !== 'function') {
    return 'PARKED';
  }

  try {
    const res = await fetchFn(
      `https://api.github.com/repos/${repo}/actions/variables/CORPFLOW_CURSOR_MODE`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!res.ok) return 'PARKED';
    const json = await res.json();
    return normalizeCorpFlowCursorMode(json?.value);
  } catch {
    return 'PARKED';
  }
}

export function authorizeCursorRemoteExecution(input = {}) {
  const mode = normalizeCorpFlowCursorMode(
    input.mode ?? process.env.CORPFLOW_CURSOR_MODE,
  );
  const action = String(input.action || 'remote_cursor_execution').trim();
  if (mode !== 'FACTORY_ARMED') {
    return {
      allowed: false,
      mode,
      action,
      reason:
        mode === 'LOCAL_ONLY'
          ? 'CURSOR_REMOTE_EXECUTION_DENIED_LOCAL_ONLY'
          : 'CURSOR_REMOTE_EXECUTION_DENIED_PARKED',
    };
  }
  return {
    allowed: true,
    mode,
    action,
    reason: 'CURSOR_REMOTE_EXECUTION_AUTHORIZED_FACTORY_ARMED',
  };
}

export async function authorizeCursorRemoteExecutionFromGitHub(input = {}) {
  const mode = await readCorpFlowCursorMode(input);
  return authorizeCursorRemoteExecution({ ...input, mode });
}

export function resolveCursorTaskComplexity(input = {}) {
  const explicit = String(input.complexity || '').trim().toLowerCase();
  if (CURSOR_TASK_COMPLEXITIES.includes(explicit)) return explicit;

  const labels = issueLabels(input.issue);
  for (const complexity of CURSOR_TASK_COMPLEXITIES) {
    if (labels.includes(`complexity:${complexity}`)) return complexity;
  }
  return null;
}

function inferredComplexityForTier(tier) {
  if (tier === 'high') return 'difficult';
  if (tier === 'medium') return 'moderate';
  return 'simple';
}

/**
 * Deterministic V1 economic router.
 *
 * When a task carries an explicit complexity classification, route to the
 * model tier expected to achieve the lowest total completion cost for that
 * class. Existing MEDIUM/HIGH durable-evidence requirements remain enforced
 * by resolveCursorExecutionTier().
 *
 * Unclassified work preserves the existing #1249 tier policy so this change
 * does not silently reclassify the entire factory. The returned budget is
 * still finite, preventing an economical model from becoming an endless run.
 */
export function routeCursorEconomicExecution(input = {}) {
  const authorization = authorizeCursorRemoteExecution(input);
  if (!authorization.allowed) {
    return {
      ...authorization,
      complexity: null,
      tier: null,
      model: null,
      budget: null,
    };
  }

  const explicitComplexity = resolveCursorTaskComplexity(input);
  const requestedTier = explicitComplexity
    ? CURSOR_ECONOMIC_ROUTING[explicitComplexity].tier
    : input.tier;
  const executionTier = resolveCursorExecutionTier({
    tier: requestedTier,
    sourceIssue: input.sourceIssue || input.issue?.number,
    issue: input.issue,
    comments: input.comments,
  });
  const complexity = explicitComplexity || inferredComplexityForTier(executionTier.tier);
  const route = CURSOR_ECONOMIC_ROUTING[complexity];

  return {
    ...authorization,
    complexity,
    tier: executionTier.tier,
    model: executionTier.model,
    evidence: executionTier.evidence,
    budget: {
      max_attempts: route.max_attempts,
      max_follow_ups: route.max_follow_ups,
      max_elapsed_minutes: route.max_elapsed_minutes,
    },
    objective: 'lowest_expected_total_cost_to_verified_success',
  };
}

export function cursorExecutionBudgetExhausted(input = {}) {
  const budget = input.budget || {};
  const attempts = Number(input.attempts || 0);
  const followUps = Number(input.followUps || 0);
  const elapsedMinutes = Number(input.elapsedMinutes || 0);
  return (
    attempts >= Number(budget.max_attempts || 0) ||
    followUps > Number(budget.max_follow_ups || 0) ||
    elapsedMinutes >= Number(budget.max_elapsed_minutes || 0)
  );
}
