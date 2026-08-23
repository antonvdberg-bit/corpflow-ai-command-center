/**
 * #1006 Tenant Workspace simplification.
 *
 * Tenant users see only client-relevant request / review / progress surfaces.
 * Operating Workspace / Core / cross-client controls stay staff-only.
 * #884 / #883 expose-for-review is unchanged: only deliberately exposed
 * components may be reviewed. /change remains the tenant service surface.
 *
 * Browser-safe. No Prisma. No secrets. No auth-model replacement.
 */

import { TENANT_NAV_ITEMS } from './constants.js';
import {
  ACTION_QUEUE_PATH,
  PROSPECT_OPERATIONS_PATH,
  PROSPECT_PIPELINE_PATH,
  PROSPECT_WORKBENCH_PATH,
  TODAY_MY_WORK_PATH,
  isActionQueuePath,
  isProspectOperationsPath,
  isProspectPipelinePath,
  isProspectSharedDetailPath,
  isProspectWorkbenchPath,
  isTodayMyWorkPath,
} from './workspace-context.js';

/** @typedef {'RETAINED'|'RETIRED'|'REDIRECT'|'STAFF_ONLY_FAIL_CLOSED'} TenantRouteDisposition */

export const TENANT_WORKSPACE_SLICE_VERSION = 'tenant-workspace-1006-v1';

export const TENANT_WORKSPACE_PATH = '/app/tenant';
export const TENANT_SERVICE_CHANGE_PATH = '/change';
export const WORKSPACE_CHOOSER_PATH = '/app';

/**
 * Navigation ids removed from Tenant Workspace in this slice.
 * Kept as a documented matrix (not rendered).
 *
 * @type {readonly {
 *   id: string,
 *   label: string,
 *   disposition: 'RETIRED',
 *   reason: string,
 * }[]}
 */
export const TENANT_NAV_RETIRED = Object.freeze([
  Object.freeze({
    id: 'home',
    label: 'Home / Overview',
    disposition: 'RETIRED',
    reason: 'Duplicated Requests & Progress and used internal overview language.',
  }),
  Object.freeze({
    id: 'my_work',
    label: 'My Work',
    disposition: 'RETIRED',
    reason: 'Operating Workspace Today / My Work concept; not a tenant function.',
  }),
  Object.freeze({
    id: 'documents',
    label: 'Documents',
    disposition: 'RETIRED',
    reason: 'Placeholder with no tenant capability; leaked future-ops load.',
  }),
  Object.freeze({
    id: 'reports',
    label: 'Reports',
    disposition: 'RETIRED',
    reason: 'Placeholder; no tenant reports surface exists.',
  }),
  Object.freeze({
    id: 'support',
    label: 'Support',
    disposition: 'RETIRED',
    reason: 'Placeholder; /change remains the tenant service path.',
  }),
]);

/**
 * Route / nav matrix for this slice (PR evidence).
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
    reason: 'Removed from tenant nav. Requests & Progress is the landing.',
  }),
  Object.freeze({
    path_or_nav: 'nav:my_work',
    name: 'My Work',
    disposition: 'RETIRED',
    reason: 'Removed from tenant nav. Staff Today remains /app/today.',
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
]);

/**
 * Page + API paths a tenant session must not operate.
 * Existing environment gates remain authoritative; this list is the audit set.
 *
 * @type {readonly string[]}
 */
export const OPERATING_WORKSPACE_STAFF_PATHS = Object.freeze([
  '/app/core',
  TODAY_MY_WORK_PATH,
  PROSPECT_OPERATIONS_PATH,
  PROSPECT_WORKBENCH_PATH,
  PROSPECT_PIPELINE_PATH,
  ACTION_QUEUE_PATH,
  '/api/app/today',
  '/api/app/prospects',
  '/api/app/prospect',
  '/api/app/workbench',
  '/api/app/pipeline',
  '/api/app/queue',
]);

/**
 * @param {string} path
 * @returns {boolean}
 */
export function isOperatingWorkspaceStaffPath(path) {
  const p = String(path || '').split('?')[0].replace(/\/+$/, '') || '/';
  if (p === '/app/core' || p === '/api/app/shell') return p === '/app/core';
  return (
    isTodayMyWorkPath(p) ||
    isProspectOperationsPath(p) ||
    isProspectSharedDetailPath(p) ||
    isProspectWorkbenchPath(p) ||
    isProspectPipelinePath(p) ||
    isActionQueuePath(p) ||
    p === '/app/core'
  );
}

/**
 * Tenant Workspace nav must not include retired internal / placeholder items.
 * @returns {boolean}
 */
export function tenantNavOmitsRetiredInternalItems() {
  const ids = new Set((TENANT_NAV_ITEMS || []).map((item) => String(item.id || '')));
  return TENANT_NAV_RETIRED.every((row) => !ids.has(row.id));
}

/**
 * Tenant Workspace nav is only request/progress + existing /change.
 * @returns {boolean}
 */
export function tenantNavIsClientServiceOnly() {
  const items = TENANT_NAV_ITEMS || [];
  if (items.length !== 2) return false;
  const ids = items.map((item) => String(item.id || ''));
  const hrefs = items.map((item) => (item.href == null ? null : String(item.href)));
  return (
    ids.includes('requests_progress') &&
    ids.includes('service_change') &&
    hrefs.includes(TENANT_SERVICE_CHANGE_PATH) &&
    tenantNavOmitsRetiredInternalItems()
  );
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
