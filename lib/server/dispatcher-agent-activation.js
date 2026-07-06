/**
 * Dispatcher agent activation — dry-run plan builder (Phase 0–1).
 *
 * Consumes `corpflow.business_operations_dispatcher.v1` JSON and produces a
 * grouped activation plan. No I/O, no secrets, no executor calls.
 *
 * @see docs/execution/DISPATCHER_AGENT_ACTIVATION_V1.md
 */

import { BUSINESS_OPS_DISPATCHER_SCHEMA } from './business-operations-dispatcher.js';

export const DISPATCHER_ACTIVATION_SCHEMA = 'corpflow.dispatcher_agent_activation.v1';

export { BUSINESS_OPS_DISPATCHER_SCHEMA };

export const DISPATCHER_ACTIVATION_MODE_DRY_RUN = 'dry_run';

/** @typedef {'cursor' | 'codex' | 'anton' | 'n8n' | 'no_action'} ActivationOwner */

/** @typedef {import('./business-operations-dispatcher.js').BusinessOpsRouting} BusinessOpsRouting */

const OWNER_ORDER = /** @type {const} */ (['cursor', 'codex', 'anton', 'n8n', 'no_action']);

/** @type {Record<ActivationOwner, string>} */
export const DRY_RUN_ACTION_BY_OWNER = {
  cursor: 'WOULD_ACTIVATE_CURSOR_CLOUD_API',
  codex: 'WOULD_ACTIVATE_CODEX_CLOUD',
  anton: 'SKIP_OPERATOR_GATE',
  n8n: 'SKIP_N8N_HOSTED',
  no_action: 'SKIP_NO_ACTION',
};

/**
 * @param {string | null | undefined} text
 * @param {number} [max]
 */
function truncatePrompt(text, max = 400) {
  const s = String(text || '').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

/**
 * @param {BusinessOpsRouting} routing
 * @param {string} mode
 */
function formatPlanEntry(routing, mode) {
  const owner = routing?.owner;
  const action =
    owner && DRY_RUN_ACTION_BY_OWNER[owner]
      ? DRY_RUN_ACTION_BY_OWNER[owner]
      : 'SKIP_UNKNOWN_OWNER';

  return {
    objectRef: String(routing?.objectRef || 'unknown'),
    objectType: routing?.objectType || 'monitor',
    severity: routing?.severity || 'info',
    gated: Boolean(routing?.gated),
    action,
    mode,
    executorPrompt: truncatePrompt(routing?.executorPrompt),
    reason: String(routing?.reason || '').trim(),
  };
}

/**
 * @param {import('./business-operations-dispatcher.js').BusinessOpsRouting[] | unknown} routings
 * @param {string} mode
 */
export function groupRoutingsForActivationPlan(routings, mode = DISPATCHER_ACTIVATION_MODE_DRY_RUN) {
  /** @type {Record<ActivationOwner, ReturnType<typeof formatPlanEntry>[]>} */
  const plan = {
    cursor: [],
    codex: [],
    anton: [],
    n8n: [],
    no_action: [],
  };

  const list = Array.isArray(routings) ? routings : [];
  for (const routing of list) {
    if (!routing || typeof routing !== 'object') continue;
    const owner = /** @type {ActivationOwner | string} */ (routing.owner);
    if (owner in plan) {
      plan[/** @type {ActivationOwner} */ (owner)].push(
        formatPlanEntry(/** @type {BusinessOpsRouting} */ (routing), mode),
      );
    }
  }

  return plan;
}

/**
 * @param {Record<string, unknown> | null | undefined} dispatcherReport
 * @param {{ mode?: string }} [opts]
 */
export function buildDispatcherActivationPlan(dispatcherReport, opts = {}) {
  const mode = opts.mode || DISPATCHER_ACTIVATION_MODE_DRY_RUN;
  const report = dispatcherReport && typeof dispatcherReport === 'object' ? dispatcherReport : {};
  const routings = Array.isArray(report.routings) ? report.routings : [];
  const plan = groupRoutingsForActivationPlan(routings, mode);

  const would_activate = plan.cursor.length + plan.codex.length;
  const skip =
    plan.anton.length + plan.n8n.length + plan.no_action.length;

  return {
    schema: DISPATCHER_ACTIVATION_SCHEMA,
    version: 1,
    mode,
    evaluated_at: report.evaluated_at != null ? String(report.evaluated_at) : null,
    dispatcher_schema: report.schema != null ? String(report.schema) : null,
    dispatcher_ok: typeof report.ok === 'boolean' ? report.ok : null,
    summary: report.summary && typeof report.summary === 'object' ? report.summary : null,
    plan,
    totals: {
      routings: routings.length,
      would_activate,
      skip,
      by_owner: Object.fromEntries(OWNER_ORDER.map((o) => [o, plan[o].length])),
    },
  };
}

/**
 * Human-readable activation plan for CI logs and operator review.
 *
 * @param {ReturnType<typeof buildDispatcherActivationPlan>} activationPlan
 */
export function formatActivationPlanText(activationPlan) {
  const plan = activationPlan?.plan && typeof activationPlan.plan === 'object' ? activationPlan.plan : {};
  const lines = [
    '=== Dispatcher agent activation plan (dry-run) ===',
    `mode: ${activationPlan?.mode || DISPATCHER_ACTIVATION_MODE_DRY_RUN}`,
    `evaluated_at: ${activationPlan?.evaluated_at || 'n/a'}`,
    `dispatcher_ok: ${activationPlan?.dispatcher_ok}`,
    `would_activate: ${activationPlan?.totals?.would_activate ?? 0}`,
    `skip: ${activationPlan?.totals?.skip ?? 0}`,
    '',
  ];

  for (const owner of OWNER_ORDER) {
    const entries = Array.isArray(plan[owner]) ? plan[owner] : [];
    lines.push(`--- owner=${owner} (${entries.length}) ---`);
    if (entries.length === 0) {
      lines.push('  (none)');
      lines.push('');
      continue;
    }
    for (const entry of entries) {
      lines.push(`  [${entry.severity}] ${entry.objectRef}`);
      lines.push(`    action: ${entry.action}`);
      if (entry.reason) lines.push(`    reason: ${entry.reason}`);
      if (entry.executorPrompt) lines.push(`    executorPrompt: ${entry.executorPrompt}`);
    }
    lines.push('');
  }

  lines.push('=== end dry-run plan ===');
  return lines.join('\n');
}

/**
 * Resolve dispatcher URL from a factory base or health URL.
 *
 * @param {string} [input]
 * @returns {string}
 */
export function resolveDispatcherActivationUrl(input) {
  const s = String(input || '').trim();
  if (!s) return '';
  const normalized = s.replace(/\/+$/, '');
  const low = normalized.toLowerCase();
  if (low.includes('/api/factory/business-operations-dispatcher')) return normalized;
  if (low.endsWith('/api/factory/business-operations-monitor')) {
    return `${normalized.slice(0, normalized.length - '/api/factory/business-operations-monitor'.length)}/api/factory/business-operations-dispatcher`;
  }
  if (low.endsWith('/api/factory/health')) {
    return `${normalized.slice(0, normalized.length - '/api/factory/health'.length)}/api/factory/business-operations-dispatcher`;
  }
  return `${normalized}/api/factory/business-operations-dispatcher`;
}

/**
 * Parse a dispatcher HTTP response. Non-2xx is valid when the body carries the
 * dispatcher schema (e.g. HTTP 503 when `ok: false` / action required).
 *
 * @param {number} httpStatus
 * @param {string} bodyText
 * @returns {{ report: Record<string, unknown>, httpStatus: number }}
 */
export function parseDispatcherFetchResponse(httpStatus, bodyText) {
  let parsed;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    throw new Error(`dispatcher response is not JSON (HTTP ${httpStatus})`);
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    parsed.schema !== BUSINESS_OPS_DISPATCHER_SCHEMA
  ) {
    const got = parsed && typeof parsed === 'object' ? parsed.schema : 'missing';
    throw new Error(`dispatcher response has invalid schema (HTTP ${httpStatus}): ${got}`);
  }

  return { report: parsed, httpStatus };
}
