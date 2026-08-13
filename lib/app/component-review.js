/**
 * Component review + exposure controls (#883 Slice 3).
 * Server-side enforcement: non-exposed components cannot be reviewed.
 * Persistence: fixture store or cmp_tickets.console_json (existing JSON column — no schema).
 * No external send (email/WhatsApp/SMS/payment).
 */

import { REVIEW_DECISIONS } from './constants.js';
import { getAppRequest, updateAppRequest } from './request-store.js';
import { componentReviewState, normalizeMilestone } from './progress-rollup.js';

export { componentReviewState };

/**
 * @param {unknown} decision
 * @returns {string | null}
 */
export function normalizeReviewDecision(decision) {
  const v = String(decision || '')
    .trim()
    .toLowerCase();
  if (REVIEW_DECISIONS.includes(v)) return v;
  return null;
}

/**
 * Map tenant decision → Change Console preview_review.decision contract.
 * @param {string} decision
 * @returns {'approve'|'request_changes'}
 */
export function previewReviewDecisionFrom(decision) {
  return decision === 'approve' ? 'approve' : 'request_changes';
}

/**
 * Keep top-level AppRequest fields mirrored into console_json.client_view for JSON persistence.
 * @param {import('./request-normalize.js').AppRequest} req
 */
function syncClientViewMirror(req) {
  if (!req.console_json) req.console_json = { client_view: { components: [] } };
  if (!req.console_json.client_view || typeof req.console_json.client_view !== 'object') {
    req.console_json.client_view = { components: [] };
  }
  const cv = req.console_json.client_view;
  cv.client_safe_blocker = req.client_safe_blocker;
  cv.attention_required = req.attention_required === true;
  if (req.internal_blocker != null) cv.internal_blocker = req.internal_blocker;
}

/**
 * Apply review mutation onto an AppRequest (in place).
 * @param {import('./request-normalize.js').AppRequest} req
 * @param {{
 *   componentKey: string,
 *   decision: string,
 *   comment: string,
 *   byRole: string,
 *   nowIso: string,
 * }} args
 * @returns {{ ok: true, decision: string, component_key: string } | { ok: false, error: string, http_status: number }}
 */
export function mutateComponentReviewOnRequest(req, args) {
  const componentKey = String(args.componentKey || '').trim();
  const decision = normalizeReviewDecision(args.decision);
  const comment = args.comment != null ? String(args.comment).trim().slice(0, 2000) : '';
  const byRole = args.byRole != null ? String(args.byRole) : 'tenant_member';
  const nowIso = args.nowIso || new Date().toISOString();

  if (!componentKey) {
    return { ok: false, error: 'request_or_component_required', http_status: 400 };
  }
  if (!decision) {
    return { ok: false, error: 'invalid_decision', http_status: 400 };
  }
  if ((decision === 'amend' || decision === 'reject') && !comment) {
    return { ok: false, error: 'comment_required', http_status: 400 };
  }

  const list = req.console_json?.client_view?.components || [];
  const target = list.find((c) => c.key === componentKey);
  if (!target) {
    return { ok: false, error: 'component_not_found', http_status: 404 };
  }
  if (target.exposed_for_client_review !== true) {
    return { ok: false, error: 'component_not_exposed', http_status: 403 };
  }

  if (!Array.isArray(target.reviews)) target.reviews = [];
  target.reviews.push({
    decision,
    comment,
    decided_at: nowIso,
    by_role: byRole,
  });

  if (decision === 'approve') {
    target.milestone = 'approved';
    target.client_safe_status = 'Approved';
    target.attention_required = false;
  } else if (decision === 'amend') {
    target.milestone = 'changes_requested';
    target.client_safe_status = 'Amendments requested';
    target.attention_required = false;
  } else if (decision === 'reject') {
    target.milestone = 'changes_requested';
    target.client_safe_status = 'Rejected — needs rework';
    target.attention_required = false;
  }

  req.attention_required = list.some((c) => c.attention_required === true);
  if (
    decision === 'approve' &&
    !list.some((c) => normalizeMilestone(c.milestone) === 'client_review')
  ) {
    req.client_safe_blocker = null;
  }
  req.console_json.client_view.latest_client_safe_update = `Client ${decision} on ${target.title}.`;

  // Sync Change Console preview_review contract (existing JSON field — no schema).
  const previewDecision = previewReviewDecisionFrom(decision);
  const previewEntry = {
    decision: previewDecision,
    message: comment,
    decided_at: nowIso,
    by: byRole,
  };
  req.console_json.client_view.preview_review = previewEntry;
  const prevReviews = Array.isArray(req.console_json.client_view.preview_reviews)
    ? req.console_json.client_view.preview_reviews
    : [];
  req.console_json.client_view.preview_reviews = [...prevReviews, previewEntry].slice(-25);

  // Map to existing workflow vocabulary for Approved/Build derivation path.
  req.console_json.client_view.workflow_state =
    previewDecision === 'approve' ? 'client_approved' : 'changes_requested';

  req.updated_at = nowIso;
  syncClientViewMirror(req);

  return { ok: true, decision, component_key: componentKey };
}

/**
 * Apply exposure mutation onto an AppRequest (in place).
 * @param {import('./request-normalize.js').AppRequest} req
 * @param {{ componentKey: string, exposed: boolean, nowIso?: string }} args
 * @returns {{ ok: true, component_key: string, exposed: boolean } | { ok: false, error: string, http_status: number }}
 */
export function mutateComponentExposureOnRequest(req, args) {
  const componentKey = String(args.componentKey || '').trim();
  const exposed = args.exposed === true;
  const nowIso = args.nowIso || new Date().toISOString();

  if (!componentKey) {
    return { ok: false, error: 'request_or_component_required', http_status: 400 };
  }

  const list = req.console_json?.client_view?.components || [];
  const target = list.find((c) => c.key === componentKey);
  if (!target) {
    return { ok: false, error: 'component_not_found', http_status: 404 };
  }

  target.exposed_for_client_review = exposed;
  const ms = normalizeMilestone(target.milestone);
  if (exposed && (ms === 'in_progress' || ms === 'preview_ready' || ms === 'defined' || ms === 'not_started')) {
    target.milestone = 'client_review';
    target.client_safe_status = 'Ready for your review';
    target.attention_required = true;
    req.attention_required = true;
    req.client_safe_blocker = `Waiting for your review of ${target.title}.`;
    req.waiting_party = 'client';
    req.console_json.client_view.workflow_state = 'in_review';
    req.console_json.client_view.latest_client_safe_update = `${target.title} opened for client review.`;
  }
  if (!exposed) {
    target.attention_required = false;
    req.attention_required = list.some((c) => c.attention_required === true);
    if (!req.attention_required) {
      req.client_safe_blocker = null;
    }
  }

  req.updated_at = nowIso;
  syncClientViewMirror(req);

  return { ok: true, component_key: componentKey, exposed };
}

/**
 * Apply tenant review on an exposed component (fixture store — unit tests / proof).
 * @param {{
 *   requestId: string,
 *   componentKey: string,
 *   decision: unknown,
 *   comment?: unknown,
 *   byRole?: string,
 *   nowIso?: string,
 * }} args
 */
export function applyComponentReview(args) {
  const requestId = String(args.requestId || '').trim();
  const componentKey = String(args.componentKey || '').trim();
  if (!requestId || !componentKey) {
    return { ok: false, error: 'request_or_component_required', http_status: 400 };
  }

  const existing = getAppRequest(requestId);
  if (!existing) {
    return { ok: false, error: 'request_not_found', http_status: 404 };
  }

  /** @type {{ ok: boolean, error?: string, http_status?: number, decision?: string, component_key?: string }} */
  let meta = { ok: false, error: 'persist_failed', http_status: 500 };
  const updated = updateAppRequest(requestId, (req) => {
    meta = mutateComponentReviewOnRequest(req, {
      componentKey,
      decision: args.decision,
      comment: args.comment != null ? String(args.comment) : '',
      byRole: args.byRole != null ? String(args.byRole) : 'tenant_member',
      nowIso: args.nowIso || new Date().toISOString(),
    });
  });

  if (!meta.ok) {
    return {
      ok: false,
      error: meta.error || 'persist_failed',
      http_status: meta.http_status || 400,
    };
  }
  if (!updated) {
    return { ok: false, error: 'request_not_found', http_status: 404 };
  }

  return {
    ok: true,
    request: updated,
    decision: meta.decision,
    component_key: meta.component_key,
    external_send: false,
  };
}

/**
 * Core operator toggles expose-for-review (fixture store — unit tests / proof).
 * @param {{
 *   requestId: string,
 *   componentKey: string,
 *   exposed: boolean,
 * }} args
 */
export function setComponentExposure(args) {
  const requestId = String(args.requestId || '').trim();
  const componentKey = String(args.componentKey || '').trim();
  const exposed = args.exposed === true;

  if (!requestId || !componentKey) {
    return { ok: false, error: 'request_or_component_required', http_status: 400 };
  }

  const existing = getAppRequest(requestId);
  if (!existing) {
    return { ok: false, error: 'request_not_found', http_status: 404 };
  }
  const components = existing.console_json?.client_view?.components || [];
  if (!components.some((c) => c.key === componentKey)) {
    return { ok: false, error: 'component_not_found', http_status: 404 };
  }

  /** @type {{ ok: boolean, error?: string, http_status?: number, component_key?: string, exposed?: boolean }} */
  let meta = { ok: false, error: 'persist_failed', http_status: 500 };
  const updated = updateAppRequest(requestId, (req) => {
    meta = mutateComponentExposureOnRequest(req, { componentKey, exposed });
  });

  if (!meta.ok) {
    return {
      ok: false,
      error: meta.error || 'persist_failed',
      http_status: meta.http_status || 400,
    };
  }
  if (!updated) {
    return { ok: false, error: 'request_not_found', http_status: 404 };
  }

  return {
    ok: true,
    request: updated,
    component_key: meta.component_key,
    exposed: meta.exposed === true,
    external_send: false,
  };
}

/**
 * Repository-backed tenant review (fixture or cmp_tickets.console_json).
 * @param {{
 *   repo: {
 *     supportsMutations?: boolean,
 *     getForTenant: (id: string, tenantId: string) => Promise<{ request: import('./request-normalize.js').AppRequest | null }>,
 *     updateRequest: (id: string, mutator: (req: import('./request-normalize.js').AppRequest) => void, opts?: { tenantId?: string }) => Promise<import('./request-normalize.js').AppRequest | null>,
 *   },
 *   requestId: string,
 *   tenantId: string,
 *   componentKey: string,
 *   decision: unknown,
 *   comment?: unknown,
 *   byRole?: string,
 *   nowIso?: string,
 * }} args
 */
export async function applyComponentReviewWithRepo(args) {
  const requestId = String(args.requestId || '').trim();
  const tenantId = String(args.tenantId || '').trim();
  const componentKey = String(args.componentKey || '').trim();
  if (!requestId || !componentKey || !tenantId) {
    return { ok: false, error: 'request_or_component_required', http_status: 400 };
  }
  if (!args.repo || args.repo.supportsMutations !== true) {
    return {
      ok: false,
      error: 'persistence_unavailable',
      http_status: 409,
    };
  }

  const got = await args.repo.getForTenant(requestId, tenantId);
  if (!got.request) {
    return { ok: false, error: 'request_not_found', http_status: 404 };
  }

  const decision = normalizeReviewDecision(args.decision);
  const comment = args.comment != null ? String(args.comment).trim().slice(0, 2000) : '';
  if (!decision) {
    return { ok: false, error: 'invalid_decision', http_status: 400 };
  }
  if ((decision === 'amend' || decision === 'reject') && !comment) {
    return { ok: false, error: 'comment_required', http_status: 400 };
  }
  const pre = got.request.console_json?.client_view?.components || [];
  const preComp = pre.find((c) => c.key === componentKey);
  if (!preComp) {
    return { ok: false, error: 'component_not_found', http_status: 404 };
  }
  if (preComp.exposed_for_client_review !== true) {
    return { ok: false, error: 'component_not_exposed', http_status: 403 };
  }

  /** @type {{ ok: boolean, error?: string, http_status?: number, decision?: string, component_key?: string }} */
  let meta = { ok: false, error: 'persist_failed', http_status: 500 };
  const updated = await args.repo.updateRequest(
    requestId,
    (req) => {
      meta = mutateComponentReviewOnRequest(req, {
        componentKey,
        decision,
        comment,
        byRole: args.byRole != null ? String(args.byRole) : 'tenant_member',
        nowIso: args.nowIso || new Date().toISOString(),
      });
    },
    { tenantId },
  );

  if (!meta.ok) {
    return {
      ok: false,
      error: meta.error || 'persist_failed',
      http_status: meta.http_status || 400,
    };
  }
  if (!updated) {
    return { ok: false, error: 'persist_failed', http_status: 500 };
  }

  return {
    ok: true,
    request: updated,
    decision: meta.decision,
    component_key: meta.component_key,
    external_send: false,
    persistence: 'console_json',
  };
}

/**
 * Repository-backed Core expose/hide.
 * @param {{
 *   repo: {
 *     supportsMutations?: boolean,
 *     getForCore: (id: string) => Promise<{ request: import('./request-normalize.js').AppRequest | null }>,
 *     updateRequest: (id: string, mutator: (req: import('./request-normalize.js').AppRequest) => void, opts?: { tenantId?: string }) => Promise<import('./request-normalize.js').AppRequest | null>,
 *   },
 *   requestId: string,
 *   componentKey: string,
 *   exposed: boolean,
 *   nowIso?: string,
 * }} args
 */
export async function setComponentExposureWithRepo(args) {
  const requestId = String(args.requestId || '').trim();
  const componentKey = String(args.componentKey || '').trim();
  const exposed = args.exposed === true;
  if (!requestId || !componentKey) {
    return { ok: false, error: 'request_or_component_required', http_status: 400 };
  }
  if (!args.repo || args.repo.supportsMutations !== true) {
    return {
      ok: false,
      error: 'persistence_unavailable',
      http_status: 409,
    };
  }

  const got = await args.repo.getForCore(requestId);
  if (!got.request) {
    return { ok: false, error: 'request_not_found', http_status: 404 };
  }
  const pre = got.request.console_json?.client_view?.components || [];
  if (!pre.some((c) => c.key === componentKey)) {
    return { ok: false, error: 'component_not_found', http_status: 404 };
  }

  /** @type {{ ok: boolean, error?: string, http_status?: number, component_key?: string, exposed?: boolean }} */
  let meta = { ok: false, error: 'persist_failed', http_status: 500 };
  const updated = await args.repo.updateRequest(requestId, (req) => {
    meta = mutateComponentExposureOnRequest(req, {
      componentKey,
      exposed,
      nowIso: args.nowIso || new Date().toISOString(),
    });
  });

  if (!meta.ok) {
    return {
      ok: false,
      error: meta.error || 'persist_failed',
      http_status: meta.http_status || 400,
    };
  }
  if (!updated) {
    return { ok: false, error: 'persist_failed', http_status: 500 };
  }

  return {
    ok: true,
    request: updated,
    component_key: meta.component_key,
    exposed: meta.exposed === true,
    external_send: false,
    persistence: 'console_json',
  };
}
