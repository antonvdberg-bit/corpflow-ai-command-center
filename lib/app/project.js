/**
 * Core vs Tenant projections of the same synthetic request.
 * Tenant projection must never emit engineering / internal evidence fields.
 */

import { MILESTONE_META, TENANT_FORBIDDEN_FIELD_KEYS } from './constants.js';
import { normalizeMilestone, rollupComponentProgress } from './progress-rollup.js';

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function payloadContainsForbiddenTenantKeys(value) {
  const s = JSON.stringify(value || {});
  for (const key of TENANT_FORBIDDEN_FIELD_KEYS) {
    // Match JSON object keys: "key":
    if (s.includes(`"${key}"`)) return true;
  }
  // Also catch common leak phrases in values
  if (/github\.com\/|pull\/\d+|commit_sha|Agent CI|technical_lead/i.test(s)) return true;
  return false;
}

/**
 * @param {import('./synthetic-store.js').SynthRequest} request
 */
export function projectTenantRequest(request) {
  const cv = request.console_json?.client_view || {};
  const componentsIn = Array.isArray(cv.components) ? cv.components : [];
  const rollup = rollupComponentProgress(componentsIn);

  const components = componentsIn.map((c) => {
    const ms = normalizeMilestone(c.milestone) || 'planned';
    const exposed = c.exposed_for_client_review === true;
    return {
      key: c.key,
      title: c.title,
      milestone: ms,
      milestone_label: MILESTONE_META[ms].label,
      exposed_for_client_review: exposed,
      client_safe_summary: c.client_safe_summary,
      client_safe_status: c.client_safe_status,
      attention_required: c.attention_required === true,
      review_enabled: exposed,
      view_only: !exposed,
      latest_review:
        Array.isArray(c.reviews) && c.reviews.length
          ? {
              decision: c.reviews[c.reviews.length - 1].decision,
              comment: c.reviews[c.reviews.length - 1].comment,
              decided_at: c.reviews[c.reviews.length - 1].decided_at,
            }
          : null,
    };
  });

  const nextComponent = components.find((c) => c.key === rollup.next_component_key) || null;

  const projection = {
    scope: 'tenant',
    request_id: request.id,
    tenant_id: request.tenant_id,
    title: request.title,
    outcome: request.outcome,
    workflow_state: cv.workflow_state || null,
    progress_message: cv.progress_message || null,
    progress: {
      percent: rollup.percent,
      complete_count: rollup.complete_count,
      remaining_count: rollup.remaining_count,
      total_count: rollup.total_count,
    },
    next_action: nextComponent
      ? nextComponent.exposed_for_client_review
        ? `Review “${nextComponent.title}”`
        : `Waiting on “${nextComponent.title}”`
      : 'No remaining components',
    client_safe_blocker: request.client_safe_blocker,
    attention_required: request.attention_required === true,
    components,
  };

  if (payloadContainsForbiddenTenantKeys(projection)) {
    throw new Error('tenant_projection_leak');
  }
  return projection;
}

/**
 * @param {import('./synthetic-store.js').SynthRequest} request
 */
export function projectCoreRequest(request) {
  const cv = request.console_json?.client_view || {};
  const componentsIn = Array.isArray(cv.components) ? cv.components : [];
  const rollup = rollupComponentProgress(componentsIn);
  const tenantProjection = projectTenantRequest(request);

  const components = componentsIn.map((c) => {
    const ms = normalizeMilestone(c.milestone) || 'planned';
    return {
      key: c.key,
      title: c.title,
      milestone: ms,
      milestone_label: MILESTONE_META[ms].label,
      exposed_for_client_review: c.exposed_for_client_review === true,
      client_safe_summary: c.client_safe_summary,
      attention_required: c.attention_required === true,
      internal_task_ref: c.internal_task_ref,
      internal_evidence_refs: Array.isArray(c.internal_evidence_refs) ? [...c.internal_evidence_refs] : [],
      internal_note: c.internal_note || null,
      github: c.github ? { ...c.github } : null,
      reviews: Array.isArray(c.reviews) ? c.reviews.map((r) => ({ ...r })) : [],
    };
  });

  return {
    scope: 'core',
    request_id: request.id,
    tenant_id: request.tenant_id,
    title: request.title,
    outcome: request.outcome,
    status: request.status,
    stage: request.stage,
    workflow_state: cv.workflow_state || null,
    progress: {
      percent: rollup.percent,
      complete_count: rollup.complete_count,
      remaining_count: rollup.remaining_count,
      total_count: rollup.total_count,
    },
    internal_blocker: request.internal_blocker,
    client_safe_blocker: request.client_safe_blocker,
    attention_required: request.attention_required === true,
    internal_refs: {
      promotion: request.console_json?.promotion || null,
      technical_lead: request.console_json?.technical_lead || null,
    },
    components,
    client_projection_preview: tenantProjection,
  };
}

/**
 * List summaries for a tenant (tenant-safe).
 * @param {import('./synthetic-store.js').SynthRequest[]} requests
 * @param {string} tenantId
 */
export function projectTenantRequestList(requests, tenantId) {
  const tid = String(tenantId || '').trim();
  return (Array.isArray(requests) ? requests : [])
    .filter((r) => r.tenant_id === tid)
    .map((r) => {
      const full = projectTenantRequest(r);
      return {
        request_id: full.request_id,
        tenant_id: full.tenant_id,
        title: full.title,
        outcome: full.outcome,
        progress_percent: full.progress.percent,
        attention_required: full.attention_required,
        client_safe_blocker: full.client_safe_blocker,
        next_action: full.next_action,
      };
    });
}

/**
 * Core list may include tenant_id filter; never returns other tenants when filtered.
 * @param {import('./synthetic-store.js').SynthRequest[]} requests
 * @param {string | null} [tenantFilter]
 */
export function projectCoreRequestList(requests, tenantFilter) {
  const filter = tenantFilter != null ? String(tenantFilter).trim() : '';
  return (Array.isArray(requests) ? requests : [])
    .filter((r) => (!filter ? true : r.tenant_id === filter))
    .map((r) => {
      const rollup = rollupComponentProgress(r.console_json?.client_view?.components || []);
      return {
        request_id: r.id,
        tenant_id: r.tenant_id,
        title: r.title,
        status: r.status,
        stage: r.stage,
        progress_percent: rollup.percent,
        internal_blocker: r.internal_blocker,
        attention_required: r.attention_required === true,
      };
    });
}
