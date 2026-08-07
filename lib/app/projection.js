/**
 * #778 Slice 1 — governed Core vs Tenant projections from the same synthetic request.
 * Tenant projection must never emit GitHub/PR/commit/CI/agent/internal-note detail.
 */

import { rollupComponentProgress, normalizeComponentMilestone } from './milestones.js';

/** Keys that must never appear in tenant-facing JSON (recursive strip). */
const TENANT_FORBIDDEN_KEY_RE =
  /^(github|pr|pr_number|pr_url|commit|ci|agent|internal|internal_note|internal_notes|evidence_refs|work_package|work_package_key|tasks|branch|branch_name|workflow|cursor|codex|technical_lead|reality_panel|promotion|itinerary|secret|secrets)$/i;

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Deep-strip forbidden keys for tenant safety (defense in depth).
 * @param {unknown} value
 * @returns {unknown}
 */
export function stripInternalFields(value) {
  if (Array.isArray(value)) {
    return value.map((v) => stripInternalFields(v));
  }
  if (!isPlainObject(value)) return value;
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (TENANT_FORBIDDEN_KEY_RE.test(k)) continue;
    if (k.startsWith('internal_')) continue;
    out[k] = stripInternalFields(v);
  }
  return out;
}

/**
 * @param {Record<string, unknown>} request
 * @returns {Array<Record<string, unknown>>}
 */
function projectTenantComponents(request) {
  const components = Array.isArray(request.components) ? request.components : [];
  return components.map((c) => {
    const row = isPlainObject(c) ? c : {};
    const exposed = row.exposed_for_client_review === true;
    return {
      key: String(row.key || ''),
      title: String(row.title || ''),
      client_safe_summary: String(row.client_safe_summary || ''),
      milestone: normalizeComponentMilestone(row.milestone) || 'not_started',
      exposed_for_client_review: exposed,
      review_allowed: exposed,
      view_only: !exposed,
      review: row.review && isPlainObject(row.review)
        ? {
            decided_at: row.review.decided_at ?? null,
            decision: row.review.decision ?? null,
            comment: row.review.comment ?? null,
            by: row.review.by ?? null,
          }
        : null,
      comments: Array.isArray(row.comments)
        ? row.comments.map((x) => ({
            at: x?.at ?? null,
            body: x?.body ?? null,
            by: x?.by ?? null,
          }))
        : [],
    };
  });
}

/**
 * Tenant Requests & Progress projection — client-safe only.
 * @param {Record<string, unknown>} request
 * @returns {Record<string, unknown>}
 */
export function projectTenantRequest(request) {
  const components = projectTenantComponents(request);
  const progress = rollupComponentProgress(components);
  const completeTitles = components
    .filter((c) => c.milestone === 'approved' || c.milestone === 'live_verified')
    .map((c) => c.title);
  const remainingTitles = components
    .filter((c) => c.milestone !== 'approved' && c.milestone !== 'live_verified')
    .map((c) => c.title);

  const projected = {
    id: String(request.id || ''),
    tenant_id: String(request.tenant_id || ''),
    title: String(request.title || ''),
    outcome: String(request.outcome || ''),
    progress_percent: progress.percent,
    progress: progress,
    complete: completeTitles,
    remaining: remainingTitles,
    next_action: request.next_client_action != null ? String(request.next_client_action) : '',
    client_safe_blocker:
      request.client_safe_blocker != null && String(request.client_safe_blocker).trim()
        ? String(request.client_safe_blocker)
        : null,
    attention_required: request.attention_required === true,
    latest_update:
      request.latest_client_safe_update != null ? String(request.latest_client_safe_update) : '',
    components,
    scope: 'tenant',
  };
  return /** @type {Record<string, unknown>} */ (stripInternalFields(projected));
}

/**
 * Core twin view — same identity + internal work/evidence + exposure controls + client preview.
 * @param {Record<string, unknown>} request
 * @returns {Record<string, unknown>}
 */
export function projectCoreRequest(request) {
  const tenantProjection = projectTenantRequest(request);
  const internal = isPlainObject(request.internal) ? request.internal : {};
  const components = Array.isArray(request.components) ? request.components : [];
  return {
    id: String(request.id || ''),
    tenant_id: String(request.tenant_id || ''),
    title: String(request.title || ''),
    outcome: String(request.outcome || ''),
    status: request.status != null ? String(request.status) : '',
    stage: request.stage != null ? String(request.stage) : '',
    internal_status: `${request.status || ''} / ${request.stage || ''}`.trim(),
    internal_blocker:
      request.client_safe_blocker != null ? String(request.client_safe_blocker) : null,
    work_package_key: internal.work_package_key != null ? String(internal.work_package_key) : null,
    tasks: Array.isArray(internal.tasks) ? internal.tasks : [],
    evidence_refs: Array.isArray(internal.evidence_refs) ? internal.evidence_refs : [],
    github: isPlainObject(internal.github) ? internal.github : null,
    ci: isPlainObject(internal.ci) ? internal.ci : null,
    agent: isPlainObject(internal.agent) ? internal.agent : null,
    internal_notes: Array.isArray(internal.internal_notes) ? internal.internal_notes : [],
    components: components.map((c) => {
      const row = isPlainObject(c) ? c : {};
      return {
        key: String(row.key || ''),
        title: String(row.title || ''),
        milestone: normalizeComponentMilestone(row.milestone) || 'not_started',
        exposed_for_client_review: row.exposed_for_client_review === true,
        client_safe_summary: String(row.client_safe_summary || ''),
        internal_task_ref: row.internal_task_ref != null ? String(row.internal_task_ref) : null,
        internal_evidence_ref:
          row.internal_evidence_ref != null ? String(row.internal_evidence_ref) : null,
        review: row.review ?? null,
        comments: Array.isArray(row.comments) ? row.comments : [],
      };
    }),
    progress: rollupComponentProgress(components),
    client_projection_preview: tenantProjection,
    scope: 'core',
  };
}

/**
 * Assert tenant JSON has no forbidden engineering leakage (for tests + handlers).
 * @param {unknown} value
 * @param {string} [path]
 * @returns {string[]}
 */
export function findTenantLeakPaths(value, path = '') {
  /** @type {string[]} */
  const leaks = [];
  if (Array.isArray(value)) {
    value.forEach((v, i) => leaks.push(...findTenantLeakPaths(v, `${path}[${i}]`)));
    return leaks;
  }
  if (!isPlainObject(value)) return leaks;
  for (const [k, v] of Object.entries(value)) {
    const p = path ? `${path}.${k}` : k;
    if (TENANT_FORBIDDEN_KEY_RE.test(k) || k.startsWith('internal_')) {
      leaks.push(p);
      continue;
    }
    leaks.push(...findTenantLeakPaths(v, p));
  }
  return leaks;
}
