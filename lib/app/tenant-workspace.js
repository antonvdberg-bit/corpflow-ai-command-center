/**
 * #1006 Tenant Workspace simplification.
 *
 * Builds on #1073 continuity: tenant nav is already Requests & Progress plus
 * canonical `/change`. This slice removes remaining Operating Workspace
 * cognitive load from tenant context:
 *   - Tenant chrome does not advertise “Choose workspace”
 *   - A live Tenant session on `/app` redirects to `/app/tenant`
 *   - Staff still enter Tenant deliberately from `/app` (separate tenant sign-in)
 *
 * #884 / #883 expose-for-review is unchanged. No schema. No auth replacement.
 * Browser-safe. No Prisma. No secrets.
 */

import { TENANT_NAV_ITEMS } from './constants.js';
import {
  CHANGE_CANONICAL_PATH,
  STAFF_ONLY_TENANT_DENIED_PATHS,
  TENANT_WORKSPACE_PATH,
  isStaffOnlyTenantDeniedPath,
  tenantNavIsJourneyOnly,
  tenantNavOmitsRetiredPlaceholders,
} from './tenant-journey.js';
import {
  WORKSPACE_CHOOSER_PATH,
  isActionQueuePath,
  isClientsPath,
  isCommercialSummaryPath,
  isDeliveryPath,
  isProspectOperationsPath,
  isProspectPipelinePath,
  isProspectSharedDetailPath,
  isProspectWorkbenchPath,
  isTodayMyWorkPath,
} from './workspace-context.js';

/** @typedef {'RETAINED'|'RETIRED'|'REDIRECT'|'STAFF_ONLY_FAIL_CLOSED'|'CANONICAL'} TenantRouteDisposition */

export const TENANT_WORKSPACE_SLICE_VERSION = 'tenant-workspace-1006-v1';
export const TENANT_SERVICE_CHANGE_PATH = CHANGE_CANONICAL_PATH;

/**
 * Route / nav matrix for this slice (PR evidence).
 * Nav retirement of Home / My Work / Documents / Reports / Support shipped in
 * #1073; this matrix records that plus the #1006 chooser redirect / chrome hide.
 *
 * @type {readonly {
 *   path_or_nav: string,
 *   name: string,
 *   disposition: TenantRouteDisposition,
 *   reason: string,
 * }[]}
 */
export const TENANT_WORKSPACE_ROUTE_MATRIX = Object.freeze([
  Object.freeze({
    path_or_nav: '/app/tenant',
    name: 'Tenant Workspace shell',
    disposition: 'RETAINED',
    reason: 'Canonical tenant request / review / progress workspace.',
  }),
  Object.freeze({
    path_or_nav: '/change',
    name: 'Change Console (service & change)',
    disposition: 'RETAINED',
    reason: 'Existing tenant request/service surface. Not replaced.',
  }),
  Object.freeze({
    path_or_nav: 'nav:requests_progress',
    name: 'Requests & Progress',
    disposition: 'RETAINED',
    reason: 'Client-visible requests, status, evidence, and #884 review.',
  }),
  Object.freeze({
    path_or_nav: 'nav:service_change',
    name: 'Service & change',
    disposition: 'RETAINED',
    reason: 'In-nav link to existing /change. No new page.',
  }),
  Object.freeze({
    path_or_nav: 'nav:home',
    name: 'Home / Overview',
    disposition: 'RETIRED',
    reason: 'Removed in #1073. Requests & Progress is the landing.',
  }),
  Object.freeze({
    path_or_nav: 'nav:my_work',
    name: 'My Work',
    disposition: 'RETIRED',
    reason: 'Removed in #1073. Staff Today remains /app/today.',
  }),
  Object.freeze({
    path_or_nav: 'nav:documents',
    name: 'Documents',
    disposition: 'RETIRED',
    reason: 'Placeholder retired. No tenant documents module.',
  }),
  Object.freeze({
    path_or_nav: 'nav:reports',
    name: 'Reports',
    disposition: 'RETIRED',
    reason: 'Placeholder retired. No tenant reports module.',
  }),
  Object.freeze({
    path_or_nav: 'nav:support',
    name: 'Support',
    disposition: 'RETIRED',
    reason: 'Placeholder retired. Service path is /change.',
  }),
  Object.freeze({
    path_or_nav: '/app',
    name: 'Workspace chooser',
    disposition: 'REDIRECT',
    reason: 'Tenant session redirects to /app/tenant. Staff still use /app deliberately.',
  }),
  Object.freeze({
    path_or_nav: 'chrome:choose_workspace',
    name: 'Choose workspace chip',
    disposition: 'RETIRED',
    reason: 'Hidden on Tenant chrome so tenants do not see the Operating Workspace chooser.',
  }),
  Object.freeze({
    path_or_nav: '/app/core',
    name: 'Operating Workspace shell',
    disposition: 'STAFF_ONLY_FAIL_CLOSED',
    reason: 'Tenant session cannot enter Core / Operating Workspace.',
  }),
  Object.freeze({
    path_or_nav: '/app/today',
    name: 'Today / My Work',
    disposition: 'STAFF_ONLY_FAIL_CLOSED',
    reason: 'Operating Workspace only.',
  }),
  Object.freeze({
    path_or_nav: '/app/prospects',
    name: 'Prospect Operations',
    disposition: 'STAFF_ONLY_FAIL_CLOSED',
    reason: 'Operating Workspace only.',
  }),
  Object.freeze({
    path_or_nav: '/app/workbench',
    name: 'Prospect Workbench',
    disposition: 'STAFF_ONLY_FAIL_CLOSED',
    reason: 'Operating Workspace only.',
  }),
  Object.freeze({
    path_or_nav: '/app/pipeline',
    name: 'Prospect Pipeline',
    disposition: 'STAFF_ONLY_FAIL_CLOSED',
    reason: 'Operating Workspace only.',
  }),
  Object.freeze({
    path_or_nav: '/app/queue',
    name: 'Action Queue',
    disposition: 'STAFF_ONLY_FAIL_CLOSED',
    reason: 'Operating Workspace only.',
  }),
  Object.freeze({
    path_or_nav: '/app/clients',
    name: 'Clients summary',
    disposition: 'STAFF_ONLY_FAIL_CLOSED',
    reason: 'Operating Workspace only.',
  }),
  Object.freeze({
    path_or_nav: '/app/commercial',
    name: 'Commercial summary',
    disposition: 'STAFF_ONLY_FAIL_CLOSED',
    reason: 'Operating Workspace only. Cross-client commercial oversight stays staff-only.',
  }),
  Object.freeze({
    path_or_nav: '/app/delivery',
    name: 'Delivery summary',
    disposition: 'STAFF_ONLY_FAIL_CLOSED',
    reason: 'Operating Workspace only. Tenant session cannot see cross-client delivery or ERPNext project oversight.',
  }),
]);

/**
 * Page + API paths a tenant session must not operate.
 * Existing environment gates remain authoritative; this list is the audit set.
 *
 * @type {readonly string[]}
 */
export const OPERATING_WORKSPACE_STAFF_PATHS = Object.freeze([
  ...new Set([
    ...STAFF_ONLY_TENANT_DENIED_PATHS,
    '/api/app/today',
    '/api/app/prospects',
    '/api/app/prospect',
    '/api/app/workbench',
    '/api/app/pipeline',
    '/api/app/queue',
    '/api/app/clients',
    '/api/app/client',
    '/api/app/commercial',
    '/api/app/delivery',
  ]),
]);

/**
 * @param {string} path
 * @returns {boolean}
 */
export function isOperatingWorkspaceStaffPath(path) {
  const p = String(path || '').split('?')[0].replace(/\/+$/, '') || '/';
  if (p === TENANT_WORKSPACE_PATH || p === CHANGE_CANONICAL_PATH) return false;
  if (p === WORKSPACE_CHOOSER_PATH || p === '/api/app/shell') return false;
  return (
    p === '/app/core' ||
    isTodayMyWorkPath(p) ||
    isProspectOperationsPath(p) ||
    isProspectSharedDetailPath(p) ||
    isProspectWorkbenchPath(p) ||
    isProspectPipelinePath(p) ||
    isActionQueuePath(p) ||
    isClientsPath(p) ||
    isCommercialSummaryPath(p) ||
    isDeliveryPath(p) ||
    isStaffOnlyTenantDeniedPath(p)
  );
}

/**
 * Tenant Workspace nav is only request/progress + existing /change.
 * @returns {boolean}
 */
export function tenantNavIsClientServiceOnly() {
  return tenantNavIsJourneyOnly(TENANT_NAV_ITEMS) && tenantNavOmitsRetiredPlaceholders(TENANT_NAV_ITEMS);
}

/**
 * Tenant chrome must not advertise the staff/tenant chooser.
 *
 * @param {{ show_switch?: boolean, switch_href?: string | null }} chrome
 * @returns {boolean}
 */
export function tenantChromeHidesWorkspaceChooser(chrome) {
  if (!chrome || typeof chrome !== 'object') return false;
  if (chrome.show_switch === true) return false;
  return !String(chrome.switch_href || '').trim();
}

/** #1120 — phrases a tenant client must not see on Tenant Workspace surfaces. */
export const TENANT_CLIENT_FORBIDDEN_CHROME_PHRASES = Object.freeze([
  'Choose workspace',
  'Staff workspace chooser',
  'Deterministic test harness',
  'Open Tenant proof',
  'data source',
]);

/**
 * Tenant client HTML/source must not advertise staff chooser, proof harness,
 * or internal data-source engineering.
 *
 * @param {unknown} text
 * @returns {boolean}
 */
export function tenantClientSurfaceOmitsForbiddenChrome(text) {
  const s = String(text || '');
  return !TENANT_CLIENT_FORBIDDEN_CHROME_PHRASES.some((phrase) =>
    s.toLowerCase().includes(phrase.toLowerCase()),
  );
}

/**
 * Named staff desks that are still unimplemented (404/unrouted).
 * `/app/commercial` (#1004) and `/app/delivery` (#1005) are now live Operating
 * Workspace routes; tenants stay fail-closed via STAFF_ONLY_TENANT_DENIED_PATHS.
 *
 * @type {readonly string[]}
 */
export const STAFF_ONLY_UNIMPLEMENTED_PATHS = Object.freeze([]);

/**
 * @param {string} path
 * @returns {boolean}
 */
export function isUnimplementedStaffOnlyPath(path) {
  const p = String(path || '').split('?')[0].replace(/\/+$/, '') || '/';
  return STAFF_ONLY_UNIMPLEMENTED_PATHS.includes(p);
}

/**
 * Tenant session that successfully opens the Tenant shell must not remain
 * on the staff/tenant chooser (which advertises Operating Workspace).
 *
 * Staff Core sessions fail Tenant shell (403) and stay on /app.
 * Unauthenticated callers (401) stay on /app so they can choose a sign-in.
 *
 * @param {number | null | undefined} tenantShellHttpStatus
 * @returns {string | null}
 */
export function tenantChooserRedirectPath(tenantShellHttpStatus) {
  return Number(tenantShellHttpStatus) === 200 ? TENANT_WORKSPACE_PATH : null;
}

/**
 * Staff may still open the chooser and follow Tenant Workspace login.
 * That is not a Tenant-session bypass into Operating Workspace.
 *
 * @param {{
 *   actorEnvironment?: string | null,
 *   canCore?: boolean,
 * }} [args]
 * @returns {boolean}
 */
export function staffMayUseChooserToEnterTenant(args = {}) {
  return args.actorEnvironment === 'core' && args.canCore === true;
}
