/**
 * Core vs Tenant projections of the same canonical AppRequest.
 * Tenant projection must never emit engineering / internal evidence fields.
 */

import { MILESTONE_META, TENANT_FORBIDDEN_FIELD_KEYS } from './constants.js';
import {
  componentReviewState,
  normalizeMilestone,
  rollupComponentProgress,
} from './progress-rollup.js';

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function payloadContainsForbiddenTenantKeys(value) {
  const s = JSON.stringify(value || {});
  for (const key of TENANT_FORBIDDEN_FIELD_KEYS) {
    if (s.includes(`"${key}"`)) return true;
  }
  if (/github\.com\/|pull\/\d+|commit_sha|Agent CI|technical_lead|cursor\/|codex/i.test(s)) {
    return true;
  }
  return false;
}

/**
 * @param {import('./request-normalize.js').AppRequest} request
 */
export function projectTenantRequest(request) {
  const cv = request.console_json?.client_view || {};
  const componentsIn = Array.isArray(cv.components) ? cv.components : [];
  const rollup = rollupComponentProgress(componentsIn);

  const components = componentsIn.map((c) => {
    const ms = normalizeMilestone(c.milestone) || 'not_started';
    const exposed = c.exposed_for_client_review === true;
    const review_state = componentReviewState(c);
    return {
      key: c.key,
      title: c.title,
      milestone: ms,
      milestone_label: MILESTONE_META[ms]?.label || ms,
      review_state,
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
  const complete = components.filter((c) => MILESTONE_META[c.milestone]?.terminal);
  const remaining = components.filter((c) => !MILESTONE_META[c.milestone]?.terminal);
  const serviceName = cv.service_name != null ? String(cv.service_name).trim() : '';
  const highLevelStage = cv.high_level_stage != null ? String(cv.high_level_stage).trim() : '';
  const highLevelStageLabel =
    cv.high_level_stage_label != null ? String(cv.high_level_stage_label).trim() : '';

  const projection = {
    scope: 'tenant',
    request_id: request.id,
    tenant_id: request.tenant_id,
    title: request.title,
    outcome: request.outcome,
    workflow_state: cv.workflow_state || null,
    progress_message: cv.progress_message || null,
    latest_client_safe_update: cv.latest_client_safe_update || cv.progress_message || null,
    service_name: serviceName || null,
    high_level_stage: highLevelStage || null,
    high_level_stage_label: highLevelStageLabel || null,
    progress: {
      percent: rollup.percent,
      complete_count: rollup.complete_count,
      remaining_count: rollup.remaining_count,
      total_count: rollup.total_count,
      complete_keys: complete.map((c) => c.key),
      remaining_keys: remaining.map((c) => c.key),
    },
    next_action: nextComponent
      ? nextComponent.exposed_for_client_review
        ? `Review “${nextComponent.title}”`
        : `Waiting on “${nextComponent.title}”`
      : String(cv.workflow_next_action || 'No remaining components'),
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
 * @param {import('./request-normalize.js').AppRequest} request
 */
export function projectCoreRequest(request) {
  const cv = request.console_json?.client_view || {};
  const componentsIn = Array.isArray(cv.components) ? cv.components : [];
  const rollup = rollupComponentProgress(componentsIn);
  const tenantProjection = projectTenantRequest(request);

  const components = componentsIn.map((c) => {
    const ms = normalizeMilestone(c.milestone) || 'not_started';
    const latestReview =
      Array.isArray(c.reviews) && c.reviews.length ? c.reviews[c.reviews.length - 1] : null;
    return {
      key: c.key,
      title: c.title,
      milestone: ms,
      milestone_label: MILESTONE_META[ms]?.label || ms,
      review_state: componentReviewState(c),
      exposed_for_client_review: c.exposed_for_client_review === true,
      client_safe_summary: c.client_safe_summary,
      attention_required: c.attention_required === true,
      internal_task_ref: c.internal_task_ref,
      internal_evidence_refs: Array.isArray(c.internal_evidence_refs)
        ? [...c.internal_evidence_refs]
        : [],
      internal_note: c.internal_note || null,
      github: c.github ? { ...c.github } : null,
      reviews: Array.isArray(c.reviews) ? c.reviews.map((r) => ({ ...r })) : [],
      latest_client_decision: latestReview
        ? {
            decision: latestReview.decision,
            comment: latestReview.comment,
            decided_at: latestReview.decided_at,
            by_role: latestReview.by_role,
          }
        : null,
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
    owner: request.owner || null,
    waiting_party: request.waiting_party || 'none',
    updated_at: request.updated_at || null,
    workflow_state: cv.workflow_state || null,
    workflow_next_action: cv.workflow_next_action || null,
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
 * @param {import('./request-normalize.js').AppRequest[]} requests
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
        service_name: full.service_name,
        high_level_stage: full.high_level_stage,
        high_level_stage_label: full.high_level_stage_label,
        progress_percent: full.progress.percent,
        attention_required: full.attention_required,
        client_safe_blocker: full.client_safe_blocker,
        next_action: full.next_action,
        latest_client_safe_update: full.latest_client_safe_update,
        workflow_state: full.workflow_state,
      };
    });
}

/**
 * Core list with optional tenant / status / waiting_party filters.
 * @param {import('./request-normalize.js').AppRequest[]} requests
 * @param {{
 *   tenantFilter?: string | null,
 *   statusFilter?: string | null,
 *   waitingPartyFilter?: string | null,
 * }} [filters]
 */
export function projectCoreRequestList(requests, filters = {}) {
  // Back-compat: second arg was tenantFilter string | null
  if (typeof filters === 'string' || filters == null) {
    filters = { tenantFilter: filters };
  }
  const tenantFilter =
    filters.tenantFilter != null ? String(filters.tenantFilter).trim() : '';
  const statusFilter =
    filters.statusFilter != null ? String(filters.statusFilter).trim().toLowerCase() : '';
  const waitingFilter =
    filters.waitingPartyFilter != null
      ? String(filters.waitingPartyFilter).trim().toLowerCase()
      : '';

  return (Array.isArray(requests) ? requests : [])
    .filter((r) => (!tenantFilter ? true : r.tenant_id === tenantFilter))
    .filter((r) =>
      !statusFilter ? true : String(r.status || '').trim().toLowerCase() === statusFilter,
    )
    .filter((r) =>
      !waitingFilter ? true : String(r.waiting_party || '').trim().toLowerCase() === waitingFilter,
    )
    .map((r) => {
      const rollup = rollupComponentProgress(r.console_json?.client_view?.components || []);
      const cv = r.console_json?.client_view || {};
      return {
        request_id: r.id,
        tenant_id: r.tenant_id,
        title: r.title,
        status: r.status,
        stage: r.stage,
        milestone: cv.workflow_state || null,
        owner: r.owner || null,
        waiting_party: r.waiting_party || 'none',
        next_action: cv.workflow_next_action || null,
        updated_at: r.updated_at || null,
        progress_percent: rollup.percent,
        internal_blocker: r.internal_blocker,
        attention_required: r.attention_required === true,
      };
    });
}
