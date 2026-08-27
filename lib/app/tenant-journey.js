/**
 * #1073 — Tenant Workspace request / review / /change continuity.
 *
 * Reuses the existing Tenant Workspace shell, #884 expose-for-review contract,
 * and canonical `/change` service/change surface. Does not create a second
 * ticket/request model. Browser-safe. No Prisma. No secrets.
 */

import {
  COMPATIBILITY_ROUTES,
  REFERENCE_TENANT_ID,
  TENANT_NAV_ITEMS,
} from './constants.js';

export const TENANT_JOURNEY_VERSION = 'tenant-journey-1073-v1';

export const TENANT_WORKSPACE_PATH = '/app/tenant';
export const CHANGE_CANONICAL_PATH = '/change';
export const TENANT_CHANGE_FROM = 'tenant-workspace';
export const TENANT_RETURN_FROM_CHANGE = 'change';

/** @typedef {'RETAINED'|'RETIRED'|'STAFF_ONLY_FAIL_CLOSED'|'CANONICAL'|'REDIRECT'} TenantNavDisposition */

/**
 * Exact tenant route / navigation matrix for #1073.
 * Machine copy of the acceptance matrix — keep in sync with TENANT_NAV_ITEMS.
 *
 * @type {readonly {
 *   id: string,
 *   path: string,
 *   nav_label: string | null,
 *   disposition: TenantNavDisposition,
 *   reason: string,
 * }[]}
 */
export const TENANT_ROUTE_NAV_MATRIX = Object.freeze([
  Object.freeze({
    id: 'tenant_workspace',
    path: TENANT_WORKSPACE_PATH,
    nav_label: 'Requests & Progress',
    disposition: 'CANONICAL',
    reason: 'Existing Tenant Workspace shell: request list, progress, #884 review.',
  }),
  Object.freeze({
    id: 'requests_progress',
    path: TENANT_WORKSPACE_PATH,
    nav_label: 'Requests & Progress',
    disposition: 'RETAINED',
    reason: 'Client-safe requests, progress, and deliberately exposed review.',
  }),
  Object.freeze({
    id: 'service_change',
    path: `${CHANGE_CANONICAL_PATH}?from=${TENANT_CHANGE_FROM}`,
    nav_label: 'Service & change',
    disposition: 'CANONICAL',
    reason: '/change remains the tenant service/change surface; navigation does not create a ticket.',
  }),
  Object.freeze({
    id: 'home',
    path: TENANT_WORKSPACE_PATH,
    nav_label: 'Home / Overview',
    disposition: 'RETIRED',
    reason: 'Duplicated Requests & Progress and leaked internal overview language.',
  }),
  Object.freeze({
    id: 'my_work',
    path: TENANT_WORKSPACE_PATH,
    nav_label: 'My Work',
    disposition: 'RETIRED',
    reason: 'Operating Workspace concept; tenant work is Requests & Progress.',
  }),
  Object.freeze({
    id: 'documents',
    path: TENANT_WORKSPACE_PATH,
    nav_label: 'Documents',
    disposition: 'RETIRED',
    reason: 'Placeholder with no tenant module; treated /change as leftover.',
  }),
  Object.freeze({
    id: 'reports',
    path: TENANT_WORKSPACE_PATH,
    nav_label: 'Reports',
    disposition: 'RETIRED',
    reason: 'Placeholder with no tenant module.',
  }),
  Object.freeze({
    id: 'support',
    path: `${CHANGE_CANONICAL_PATH}?from=${TENANT_CHANGE_FROM}`,
    nav_label: 'Support',
    disposition: 'RETIRED',
    reason: 'Service/change path is canonical /change, not a second support app.',
  }),
  Object.freeze({
    id: 'operating_core',
    path: '/app/core',
    nav_label: null,
    disposition: 'STAFF_ONLY_FAIL_CLOSED',
    reason: 'Operating Workspace. Tenant session must 403.',
  }),
  Object.freeze({
    id: 'operating_today',
    path: '/app/today',
    nav_label: null,
    disposition: 'STAFF_ONLY_FAIL_CLOSED',
    reason: 'Staff Today / My Work. Tenant session must 403.',
  }),
  Object.freeze({
    id: 'operating_prospects',
    path: '/app/prospects',
    nav_label: null,
    disposition: 'STAFF_ONLY_FAIL_CLOSED',
    reason: 'Prospect Operations. Tenant session must 403.',
  }),
  Object.freeze({
    id: 'operating_workbench',
    path: '/app/workbench',
    nav_label: null,
    disposition: 'STAFF_ONLY_FAIL_CLOSED',
    reason: 'Prospect Workbench. Tenant session must 403.',
  }),
  Object.freeze({
    id: 'operating_pipeline',
    path: '/app/pipeline',
    nav_label: null,
    disposition: 'STAFF_ONLY_FAIL_CLOSED',
    reason: 'Prospect Pipeline. Tenant session must 403.',
  }),
  Object.freeze({
    id: 'operating_queue',
    path: '/app/queue',
    nav_label: null,
    disposition: 'STAFF_ONLY_FAIL_CLOSED',
    reason: 'Action Queue. Tenant session must 403.',
  }),
  Object.freeze({
    id: 'operating_clients',
    path: '/app/clients',
    nav_label: null,
    disposition: 'STAFF_ONLY_FAIL_CLOSED',
    reason: 'Clients summary. Tenant session must 403.',
  }),
  Object.freeze({
    id: 'operating_commercial',
    path: '/app/commercial',
    nav_label: null,
    disposition: 'STAFF_ONLY_FAIL_CLOSED',
    reason: 'Commercial summary. Tenant session must 403.',
  }),
]);

export const STAFF_ONLY_TENANT_DENIED_PATHS = Object.freeze(
  TENANT_ROUTE_NAV_MATRIX.filter((row) => row.disposition === 'STAFF_ONLY_FAIL_CLOSED').map(
    (row) => row.path,
  ),
);

/**
 * Target tenant journey steps (#1073).
 * @type {readonly { id: string, label: string, path: string }[]}
 */
export const TENANT_JOURNEY_STEPS = Object.freeze([
  Object.freeze({
    id: 'sign_in',
    label: 'Sign in to the correct tenant context',
    path: `/login?next=${encodeURIComponent(TENANT_WORKSPACE_PATH)}`,
  }),
  Object.freeze({
    id: 'requests_progress',
    label: 'See tenant-safe requests and progress',
    path: TENANT_WORKSPACE_PATH,
  }),
  Object.freeze({
    id: 'exposed_review',
    label: 'Review only deliberately exposed content',
    path: TENANT_WORKSPACE_PATH,
  }),
  Object.freeze({
    id: 'comment_approve_request_changes',
    label: 'Comment / approve / request changes on the existing contract',
    path: TENANT_WORKSPACE_PATH,
  }),
  Object.freeze({
    id: 'service_change',
    label: 'Raise or change a request on canonical /change',
    path: `${CHANGE_CANONICAL_PATH}?from=${TENANT_CHANGE_FROM}`,
  }),
  Object.freeze({
    id: 'return_workspace',
    label: 'Return to Tenant Workspace with identity still unambiguous',
    path: `${TENANT_WORKSPACE_PATH}?from=${TENANT_RETURN_FROM_CHANGE}`,
  }),
]);

/**
 * @param {{ tenantId?: string | null, requestId?: string | null }} [opts]
 * @returns {string}
 */
export function tenantChangeHandoffHref(opts = {}) {
  const params = new URLSearchParams();
  params.set('from', TENANT_CHANGE_FROM);
  const tenantId = String(opts.tenantId || '').trim();
  if (tenantId) params.set('tenant_id', tenantId);
  const requestId = String(opts.requestId || '').trim();
  if (requestId) params.set('request_id', requestId);
  return `${CHANGE_CANONICAL_PATH}?${params.toString()}`;
}

/**
 * @param {{ tenantId?: string | null }} [opts]
 * @returns {string}
 */
export function tenantWorkspaceReturnHref(opts = {}) {
  const params = new URLSearchParams();
  params.set('from', TENANT_RETURN_FROM_CHANGE);
  const tenantId = String(opts.tenantId || '').trim();
  if (tenantId) params.set('tenant_id', tenantId);
  return `${TENANT_WORKSPACE_PATH}?${params.toString()}`;
}

/**
 * @param {unknown} query Next.js router.query or URLSearchParams-like
 * @returns {boolean}
 */
export function isTenantWorkspaceChangeEntry(query) {
  const from = queryValue(query, 'from');
  return from === TENANT_CHANGE_FROM;
}

/**
 * @param {unknown} query
 * @returns {boolean}
 */
export function isReturnFromChange(query) {
  const from = queryValue(query, 'from');
  return from === TENANT_RETURN_FROM_CHANGE;
}

/**
 * Opening /change from Tenant Workspace must not mint a ticket.
 * Ticket create stays the existing explicit Change Console action.
 * @returns {false}
 */
export function tenantChangeHandoffCreatesTicket() {
  return false;
}

/**
 * Continuity chrome for /change when entered from Tenant Workspace.
 * Hides the Core/admin affordance so the tenant does not enter Operating Workspace.
 *
 * @param {unknown} query
 * @param {{ tenantLabel?: string | null }} [opts]
 * @returns {{
 *   visible: true,
 *   workspace_label: string,
 *   tenant_chip_label: string,
 *   title: string,
 *   body: string,
 *   return_href: string,
 *   return_label: string,
 *   hide_core_app_link: true,
 *   creates_ticket: false,
 *   canonical_path: string,
 * } | null}
 */
export function tenantChangeContinuityBanner(query, opts = {}) {
  if (!isTenantWorkspaceChangeEntry(query)) return null;
  const tenantLabel = String(opts.tenantLabel || 'CorpFlowAI').trim() || 'CorpFlowAI';
  const tenantId = queryValue(query, 'tenant_id') || REFERENCE_TENANT_ID;
  return {
    visible: true,
    workspace_label: 'Tenant Workspace — CorpFlowAI',
    tenant_chip_label: tenantLabel,
    title: 'Tenant Workspace · Service & change',
    body:
      'You are still in the CorpFlowAI tenant journey. /change is the canonical place to raise or change a service request. Opening this page does not create a ticket.',
    return_href: tenantWorkspaceReturnHref({ tenantId }),
    return_label: 'Back to Tenant Workspace',
    hide_core_app_link: true,
    creates_ticket: false,
    canonical_path: CHANGE_CANONICAL_PATH,
  };
}

/**
 * Shell payload fragment so Tenant Workspace APIs advertise the same journey.
 *
 * @param {{ tenantId?: string | null, tenantLabel?: string | null }} [opts]
 */
export function tenantJourneyShellFragment(opts = {}) {
  const tenantId = String(opts.tenantId || REFERENCE_TENANT_ID).trim() || REFERENCE_TENANT_ID;
  const tenantLabel = String(opts.tenantLabel || 'CorpFlowAI').trim() || 'CorpFlowAI';
  return {
    slice_tenant_journey: TENANT_JOURNEY_VERSION,
    tenant_journey: {
      version: TENANT_JOURNEY_VERSION,
      workspace_path: TENANT_WORKSPACE_PATH,
      change_canonical_path: CHANGE_CANONICAL_PATH,
      change_handoff_href: tenantChangeHandoffHref({ tenantId }),
      return_href: tenantWorkspaceReturnHref({ tenantId }),
      creates_ticket_on_navigation: tenantChangeHandoffCreatesTicket(),
      tenant_id: tenantId,
      tenant_label: tenantLabel,
      steps: TENANT_JOURNEY_STEPS.map((step) => ({ ...step })),
      nav_matrix: TENANT_ROUTE_NAV_MATRIX.map((row) => ({ ...row })),
    },
  };
}

/**
 * Visible tenant nav must be the two-step journey only.
 * @param {readonly { id: string, href?: string | null }[]} [items]
 * @returns {boolean}
 */
export function tenantNavIsJourneyOnly(items = TENANT_NAV_ITEMS) {
  const ids = (items || []).map((item) => String(item.id || ''));
  if (ids.length !== 2) return false;
  if (ids[0] !== 'requests_progress' || ids[1] !== 'service_change') return false;
  const service = (items || []).find((item) => item.id === 'service_change');
  const href = String(service?.href || '');
  return href.startsWith(CHANGE_CANONICAL_PATH) && href.includes(`from=${TENANT_CHANGE_FROM}`);
}

/**
 * Retired placeholder ids must not appear on Tenant nav.
 * @param {readonly { id: string }[]} [items]
 * @returns {boolean}
 */
export function tenantNavOmitsRetiredPlaceholders(items = TENANT_NAV_ITEMS) {
  const retired = new Set(['home', 'my_work', 'documents', 'reports', 'support']);
  return !(items || []).some((item) => retired.has(String(item.id || '')));
}

/**
 * @param {string} path
 * @returns {boolean}
 */
export function isStaffOnlyTenantDeniedPath(path) {
  const p = String(path || '').split('?')[0].replace(/\/+$/, '') || '/';
  if (STAFF_ONLY_TENANT_DENIED_PATHS.includes(p)) return true;
  if (p.startsWith('/app/prospects/')) return true;
  if (p.startsWith('/app/clients/')) return true;
  if (p.startsWith('/admin/lead-rescue')) return true;
  if (p.startsWith('/admin/rapid-delivery')) return true;
  if (p.startsWith('/admin/company-master')) return true;
  return false;
}

/**
 * /change stays listed as an operational route — now the tenant service/change
 * canonical surface, not a leftover compatibility dump.
 * @returns {boolean}
 */
export function changeRemainsCanonicalServiceSurface() {
  const row = (COMPATIBILITY_ROUTES || []).find((r) => r.path === CHANGE_CANONICAL_PATH);
  return Boolean(row && row.path === CHANGE_CANONICAL_PATH);
}

/**
 * @param {unknown} query
 * @param {string} key
 * @returns {string}
 */
function queryValue(query, key) {
  if (!query || typeof query !== 'object') return '';
  if (typeof query.get === 'function') {
    return String(query.get(key) || '').trim();
  }
  const raw = /** @type {Record<string, unknown>} */ (query)[key];
  const s = Array.isArray(raw) ? raw[0] : raw;
  return s == null ? '' : String(s).trim();
}
