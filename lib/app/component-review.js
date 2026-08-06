/**
 * Component review + exposure controls for Slice 1 (synthetic store only).
 * No external send.
 */

import { REVIEW_DECISIONS } from './constants.js';
import { getSyntheticRequest, updateSyntheticRequest } from './synthetic-store.js';
import { normalizeMilestone } from './progress-rollup.js';

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
 * Apply tenant review on an exposed component.
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
  const decision = normalizeReviewDecision(args.decision);
  const comment = args.comment != null ? String(args.comment).trim().slice(0, 2000) : '';
  const byRole = args.byRole != null ? String(args.byRole) : 'tenant_member';
  const nowIso = args.nowIso || new Date().toISOString();

  if (!requestId || !componentKey) {
    return { ok: false, error: 'request_or_component_required', http_status: 400 };
  }
  if (!decision) {
    return { ok: false, error: 'invalid_decision', http_status: 400 };
  }
  if ((decision === 'amend' || decision === 'reject') && !comment) {
    return { ok: false, error: 'comment_required', http_status: 400 };
  }

  const existing = getSyntheticRequest(requestId);
  if (!existing) {
    return { ok: false, error: 'request_not_found', http_status: 404 };
  }

  const components = existing.console_json?.client_view?.components || [];
  const comp = components.find((c) => c.key === componentKey);
  if (!comp) {
    return { ok: false, error: 'component_not_found', http_status: 404 };
  }
  if (comp.exposed_for_client_review !== true) {
    return { ok: false, error: 'component_not_exposed', http_status: 403 };
  }

  const updated = updateSyntheticRequest(requestId, (req) => {
    const list = req.console_json.client_view.components;
    const target = list.find((c) => c.key === componentKey);
    if (!target) return;
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
    // Clear request-level attention if no component still needs attention
    req.attention_required = list.some((c) => c.attention_required === true);
    if (decision === 'approve' && !list.some((c) => normalizeMilestone(c.milestone) === 'ready_for_review')) {
      req.client_safe_blocker = null;
    }
  });

  return { ok: true, request: updated, decision, component_key: componentKey };
}

/**
 * Core operator toggles expose-for-review.
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

  const existing = getSyntheticRequest(requestId);
  if (!existing) {
    return { ok: false, error: 'request_not_found', http_status: 404 };
  }
  const components = existing.console_json?.client_view?.components || [];
  if (!components.some((c) => c.key === componentKey)) {
    return { ok: false, error: 'component_not_found', http_status: 404 };
  }

  const updated = updateSyntheticRequest(requestId, (req) => {
    const target = req.console_json.client_view.components.find((c) => c.key === componentKey);
    if (!target) return;
    target.exposed_for_client_review = exposed;
    if (exposed && normalizeMilestone(target.milestone) === 'in_progress') {
      target.milestone = 'ready_for_review';
      target.client_safe_status = 'Ready for your review';
      target.attention_required = true;
      req.attention_required = true;
      req.client_safe_blocker = `Waiting for your review of ${target.title}.`;
    }
    if (!exposed) {
      target.attention_required = false;
      req.attention_required = req.console_json.client_view.components.some(
        (c) => c.attention_required === true,
      );
    }
  });

  return { ok: true, request: updated, component_key: componentKey, exposed };
}
