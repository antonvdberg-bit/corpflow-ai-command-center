/**
 * Browser-safe Delivery summary constants (#1005).
 * No Prisma, fs, or request-repository imports.
 */

export const DELIVERY_PATH = '/app/delivery';
export const DELIVERY_API_PATH = '/api/app/delivery';
export const CLIENTS_SUMMARY_PATH = '/app/clients';
export const COMPANY_MASTER_PATH = '/admin/company-master';
export const CHANGE_CONSOLE_PATH = '/change';
export const REQUEST_WORKSPACE_PATH = '/app/core';
export const PROSPECTS_PATH = '/app/prospects';

/** Canonical Commercial summary (#1004) — live Operating Workspace route. */
export const COMMERCIAL_SUMMARY_ISSUE = '#1004';
export const COMMERCIAL_EXISTING_PATH = '/app/commercial';

/** @typedef {'lead_rescue'|'website_rescue'|'general_delivery'} DeliveryRecordKind */

export const DELIVERY_RECORD_KINDS = Object.freeze([
  'lead_rescue',
  'website_rescue',
  'general_delivery',
]);

export const DELIVERY_EXCEPTION_FILTERS = Object.freeze([
  'all',
  'inputs_pending',
  'preview_ready',
  'client_review_pending',
  'protected_deploy_approval_required',
  'blocked',
  'overdue_next_action',
]);

export const DELIVERY_EXCEPTION_LABELS = Object.freeze({
  all: 'All active',
  inputs_pending: 'Inputs pending',
  preview_ready: 'Preview ready',
  client_review_pending: 'Client review pending',
  protected_deploy_approval_required: 'Protected deploy approval',
  blocked: 'Blocked delivery',
  overdue_next_action: 'Overdue next action',
});

const KIND_LABELS = Object.freeze({
  lead_rescue: 'Lead Rescue',
  website_rescue: 'Website Rescue',
  general_delivery: 'General delivery',
});

/**
 * @param {unknown} value
 * @returns {string}
 */
export function asDeliveryText(value) {
  return value == null ? '' : String(value).trim();
}

/**
 * @param {string} raw
 * @returns {(typeof DELIVERY_EXCEPTION_FILTERS)[number]}
 */
export function normalizeDeliveryFilter(raw) {
  const id = asDeliveryText(raw) || 'all';
  return DELIVERY_EXCEPTION_FILTERS.includes(/** @type {any} */ (id))
    ? /** @type {(typeof DELIVERY_EXCEPTION_FILTERS)[number]} */ (id)
    : 'all';
}

/**
 * @param {string} kind
 */
export function deliveryKindLabel(kind) {
  return KIND_LABELS[kind] || 'Delivery';
}

/**
 * Keep Delivery evidence hops inside the proof harness when that is the
 * operator session. Only `/app/*` Operating Workspace routes accept `proof=1`.
 * `/change` and `/admin/*` stay on their existing auth.
 *
 * @param {unknown} href
 * @param {boolean} [proofWanted]
 */
export function withDeliveryProof(href, proofWanted) {
  const raw = asDeliveryText(href);
  if (!raw || proofWanted !== true) return raw;
  if (!raw.startsWith('/app/')) return raw;
  if (/(?:^|[?&])proof=1(?:&|$)/.test(raw)) return raw;
  return `${raw}${raw.includes('?') ? '&' : '?'}proof=1`;
}
