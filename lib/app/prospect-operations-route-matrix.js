/**
 * #1040 Prospect Operations production-coherence matrix.
 *
 * Exact CANONICAL / REDIRECT / TEMPORARY / RETIRE classification for the
 * operator prospect surfaces. No hard redirects in this slice: unique
 * product-desk capabilities remain live behind TEMPORARY routes.
 *
 * Browser-safe. No Prisma. No secrets.
 */

/** @typedef {'CANONICAL'|'REDIRECT'|'TEMPORARY'|'RETIRE'} ProspectRouteDisposition */

/**
 * @type {readonly {
 *   path: string,
 *   name: string,
 *   disposition: ProspectRouteDisposition,
 *   canonical_href: string | null,
 *   unique_capability: string | null,
 *   hard_redirect: false,
 *   staff_only: boolean,
 *   reason: string,
 * }[]}
 */
export const PROSPECT_OPERATIONS_ROUTE_MATRIX = Object.freeze([
  Object.freeze({
    path: '/app/today',
    name: 'Today / My Work',
    disposition: 'CANONICAL',
    canonical_href: '/app/today',
    unique_capability: null,
    hard_redirect: false,
    staff_only: true,
    reason: 'Staff landing for overdue, due-today, missing next action, and waiting-on-operator items.',
  }),
  Object.freeze({
    path: '/app/queue',
    name: 'Action Queue',
    disposition: 'CANONICAL',
    canonical_href: '/app/queue',
    unique_capability: null,
    hard_redirect: false,
    staff_only: true,
    reason: 'Cross-product “what needs action now” queue. Opens shared Prospect detail.',
  }),
  Object.freeze({
    path: '/app/workbench',
    name: 'Prospect Workbench',
    disposition: 'CANONICAL',
    canonical_href: '/app/workbench',
    unique_capability: null,
    hard_redirect: false,
    staff_only: true,
    reason: 'Cross-product processing grid with safe inline edits and shared detail.',
  }),
  Object.freeze({
    path: '/app/pipeline',
    name: 'Prospect Pipeline',
    disposition: 'CANONICAL',
    canonical_href: '/app/pipeline',
    unique_capability: null,
    hard_redirect: false,
    staff_only: true,
    reason: 'Postgres-backed canonical-stage lanes. Same leads rows as the other Operating Workspace views.',
  }),
  Object.freeze({
    path: '/app/prospects/[id]',
    name: 'Shared Prospect detail / history',
    disposition: 'CANONICAL',
    canonical_href: '/app/prospects/[id]',
    unique_capability: null,
    hard_redirect: false,
    staff_only: true,
    reason: 'One identity, qualification, history, and safe write path for every prospect.',
  }),
  Object.freeze({
    path: '/app/prospects',
    name: 'Prospect Operations list',
    disposition: 'CANONICAL',
    canonical_href: '/app/prospects',
    unique_capability: null,
    hard_redirect: false,
    staff_only: true,
    reason: 'Shared list that opens the same detail surface. Not a second record store.',
  }),
  Object.freeze({
    path: '/admin/rapid-delivery',
    name: 'Rapid Delivery product desk',
    disposition: 'TEMPORARY',
    canonical_href: '/app/queue',
    unique_capability: 'Rapid Delivery proposal copy, offer-specific desk, and product-native status tools.',
    hard_redirect: false,
    staff_only: true,
    reason: 'Canonical Action Queue is /app/queue. Keep this desk until those unique tools are absorbed.',
  }),
  Object.freeze({
    path: '/admin/lead-rescue',
    name: 'Lead Rescue product desk',
    disposition: 'TEMPORARY',
    canonical_href: '/app/workbench',
    unique_capability: 'Lead Rescue commercial fields, rich activity, and product-native status grid.',
    hard_redirect: false,
    staff_only: true,
    reason: 'Canonical Workbench is /app/workbench. Do not hard-redirect while unique fields remain.',
  }),
  Object.freeze({
    path: '/admin/lead-rescue/[id]',
    name: 'Lead Rescue product detail',
    disposition: 'TEMPORARY',
    canonical_href: '/app/prospects/[id]',
    unique_capability: 'Lead Rescue payment, commercial, and typed activity fields not yet on shared detail.',
    hard_redirect: false,
    staff_only: true,
    reason: 'Canonical shared detail is /app/prospects/[id]. Product detail stays for unique fields.',
  }),
  Object.freeze({
    path: '/change/revenue',
    name: 'Revenue Cockpit personal checklist',
    disposition: 'TEMPORARY',
    canonical_href: '/app/pipeline',
    unique_capability: 'Browser-only localStorage personal checklist (not leads).',
    hard_redirect: false,
    staff_only: false,
    reason: 'Canonical pipeline is /app/pipeline. This is not a second CRM and is not localStorage canonical state.',
  }),
  Object.freeze({
    path: '/change',
    name: 'Change Console',
    disposition: 'CANONICAL',
    canonical_href: '/change',
    unique_capability: 'Tenant / service-request / ticket workflow.',
    hard_redirect: false,
    staff_only: false,
    reason: 'Keep /change as the tenant service-request surface. Do not turn it into the staff prospect CRM.',
  }),
]);

/**
 * @param {string} path
 * @returns {string}
 */
export function normalizeProspectRoutePath(path) {
  const raw = String(path || '').split('?')[0].replace(/\/+$/, '') || '/';
  if (raw.startsWith('/admin/lead-rescue/') && raw !== '/admin/lead-rescue/[id]') {
    return '/admin/lead-rescue/[id]';
  }
  if (raw.startsWith('/app/prospects/') && raw !== '/app/prospects') {
    return '/app/prospects/[id]';
  }
  return raw;
}

/**
 * @param {string} path
 * @returns {(typeof PROSPECT_OPERATIONS_ROUTE_MATRIX)[number] | null}
 */
export function classifyProspectOperationsRoute(path) {
  const key = normalizeProspectRoutePath(path);
  return PROSPECT_OPERATIONS_ROUTE_MATRIX.find((row) => row.path === key) || null;
}

/**
 * Hard redirects are reserved for routes whose replacement is functionally complete.
 * #1040 keeps unique product desks live, so this always returns null.
 *
 * @param {string} path
 * @returns {null}
 */
export function legacyProspectHardRedirect(path) {
  const row = classifyProspectOperationsRoute(path);
  if (!row || row.disposition !== 'REDIRECT' || row.hard_redirect !== true) return null;
  return null;
}

/**
 * @param {string} path
 * @returns {{
 *   path: string,
 *   disposition: ProspectRouteDisposition,
 *   canonical_href: string,
 *   unique_capability: string,
 *   title: string,
 *   body: string,
 * } | null}
 */
export function prospectLegacyDeprecationNotice(path) {
  const row = classifyProspectOperationsRoute(path);
  if (!row || row.disposition !== 'TEMPORARY') return null;
  return {
    path: row.path,
    disposition: row.disposition,
    canonical_href: String(row.canonical_href || ''),
    unique_capability: String(row.unique_capability || ''),
    title: `Temporary route — ${row.name}`,
    body: row.reason,
  };
}

/**
 * Coherent Operating Workspace path for #1040 acceptance.
 * @type {readonly string[]}
 */
export const CANONICAL_OPERATOR_PATH = Object.freeze([
  '/app/today',
  '/app/queue',
  '/app/workbench',
  '/app/pipeline',
  '/app/prospects/[id]',
]);

/**
 * @returns {readonly { path: string, disposition: ProspectRouteDisposition }[]}
 */
export function listRetiredProspectRoutes() {
  return PROSPECT_OPERATIONS_ROUTE_MATRIX.filter((row) => row.disposition === 'RETIRE');
}

/**
 * @returns {readonly { path: string, canonical_href: string | null }[]}
 */
export function listRedirectedProspectRoutes() {
  return PROSPECT_OPERATIONS_ROUTE_MATRIX.filter((row) => row.disposition === 'REDIRECT');
}

/**
 * @returns {readonly { path: string, canonical_href: string | null, unique_capability: string | null }[]}
 */
export function listTemporaryProspectRoutes() {
  return PROSPECT_OPERATIONS_ROUTE_MATRIX.filter((row) => row.disposition === 'TEMPORARY');
}
