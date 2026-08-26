/**
 * #772 workspace identity — Operating Workspace vs Tenant Workspace.
 *
 * Product names sit on top of the existing separately authenticated
 * Core / Tenant environments (#778 / #877). This module does not create a
 * shared session switcher: a Core session still cannot enter Tenant, and a
 * Tenant session still cannot enter Core. "Switch workspace" means return to
 * `/app` and enter the matching authenticated environment.
 *
 * Browser-safe. No Prisma. No secrets.
 */

import { CORE_NAV_ITEMS, TENANT_NAV_ITEMS } from './constants.js';

/** @typedef {'operating'|'tenant'} WorkspaceId */
/** @typedef {'core'|'tenant'} AppEnvironment */
/** @typedef {'CANONICAL'|'REUSE'|'MIGRATE'|'TEMPORARY'|'RETIRE'} SurfaceDisposition */

export const WORKSPACE_OPERATING = 'operating';
export const WORKSPACE_TENANT = 'tenant';

export const OPERATING_WORKSPACE_LABEL = 'CorpFlowAI Operating Workspace';
export const TENANT_WORKSPACE_LABEL = 'Tenant Workspace — CorpFlowAI';

/** First shared Prospect Operations route (Operating Workspace only). */
export const PROSPECT_OPERATIONS_PATH = '/app/prospects';

/** Today / My Work landing — Operating Workspace only. Reuses #721 My Work filter. */
export const TODAY_MY_WORK_PATH = '/app/today';

/** Shared Prospect detail / action / history (#994). Operating Workspace only. */
export const PROSPECT_SHARED_DETAIL_PREFIX = '/app/prospects/';

/** Shared Prospect Workbench (#996). Operating Workspace only. */
export const PROSPECT_WORKBENCH_PATH = '/app/workbench';

/** Canonical Prospect Action Queue — Operating Workspace only (#995). */
export const ACTION_QUEUE_PATH = '/app/queue';

/** Postgres-backed Prospect Pipeline / Kanban (#997). Operating Workspace only. */
export const PROSPECT_PIPELINE_PATH = '/app/pipeline';

/** Canonical Commercial summary (#1004). Operating Workspace only. */
export const COMMERCIAL_SUMMARY_PATH = '/app/commercial';

/** Operating Workspace Clients summary (#999). Company Master reuse. */
export const CLIENTS_PATH = '/app/clients';

/** Alias used by Commercial summary links. Same surface as CLIENTS_PATH. */
export const CLIENTS_SUMMARY_PATH = CLIENTS_PATH;

/** Shared Client summary / detail (#999). Operating Workspace only. */
export const CLIENT_SHARED_DETAIL_PREFIX = '/app/clients/';

/** Existing Company Master identity surface reused by Clients / Commercial. */
export const COMPANY_MASTER_PATH = '/admin/company-master';

/** Operating Workspace Delivery summary (#1005). Lead Rescue / Website Rescue / Change reuse. */
export const DELIVERY_PATH = '/app/delivery';

/** Deliberate workspace re-entry (not a session switcher). */
export const WORKSPACE_CHOOSER_PATH = '/app';

/**
 * @param {AppEnvironment} environment
 * @returns {WorkspaceId}
 */
export function workspaceIdForEnvironment(environment) {
  return environment === 'tenant' ? WORKSPACE_TENANT : WORKSPACE_OPERATING;
}

/**
 * Persistent chrome copy for a fixed environment.
 *
 * @param {AppEnvironment} environment
 * @param {{ tenantLabel?: string | null }} [opts]
 * @returns {{
 *   environment: AppEnvironment,
 *   workspace_id: WorkspaceId,
 *   workspace_label: string,
 *   tenant_chip_label: string,
 *   switch_href: string,
 *   switch_label: string,
 *   show_switch: boolean,
 * }}
 */
export function workspaceChromeForEnvironment(environment, opts = {}) {
  if (environment === 'tenant') {
    const tenantLabel = String(opts.tenantLabel || 'CorpFlowAI').trim() || 'CorpFlowAI';
    return {
      environment: 'tenant',
      workspace_id: WORKSPACE_TENANT,
      workspace_label: TENANT_WORKSPACE_LABEL,
      tenant_chip_label: tenantLabel,
      switch_href: '',
      switch_label: '',
      show_switch: false,
    };
  }
  return {
    environment: 'core',
    workspace_id: WORKSPACE_OPERATING,
    workspace_label: OPERATING_WORKSPACE_LABEL,
    tenant_chip_label: '—',
    switch_href: WORKSPACE_CHOOSER_PATH,
    switch_label: 'Choose workspace',
    show_switch: true,
  };
}

/**
 * Staff-only Operating Workspace access — same gate as Core (#778).
 *
 * @param {import('./access.js').AppActor | null | undefined} actor
 * @returns {boolean}
 */
export function canAccessOperatingWorkspace(actor) {
  return !!(actor && actor.can_core === true && actor.environment === 'core');
}

/**
 * Prospect Operations is an Operating Workspace capability.
 * Tenant Workspace must not receive this nav or API.
 *
 * @param {string} path
 * @returns {boolean}
 */
export function isProspectOperationsPath(path) {
  const p = String(path || '').split('?')[0].replace(/\/+$/, '') || '/';
  return (
    p === PROSPECT_OPERATIONS_PATH ||
    p === '/api/app/prospects' ||
    isProspectSharedDetailPath(p)
  );
}

/**
 * Shared Prospect detail is an Operating Workspace capability.
 * Tenant Workspace must not receive this nav or API.
 *
 * @param {string} path
 * @returns {boolean}
 */
export function isProspectSharedDetailPath(path) {
  const p = String(path || '').split('?')[0].replace(/\/+$/, '') || '/';
  if (p === '/api/app/prospect' || p === '/api/app/prospects/detail') return true;
  if (!p.startsWith(PROSPECT_SHARED_DETAIL_PREFIX)) return false;
  return p.length > PROSPECT_SHARED_DETAIL_PREFIX.length;
}

/**
 * Today / My Work is an Operating Workspace capability.
 * Tenant Workspace must not receive this nav or API.
 *
 * @param {string} path
 * @returns {boolean}
 */
export function isTodayMyWorkPath(path) {
  const p = String(path || '').split('?')[0].replace(/\/+$/, '') || '/';
  return p === TODAY_MY_WORK_PATH || p === '/api/app/today';
}

/**
 * Prospect Workbench is an Operating Workspace capability.
 * Tenant Workspace must not receive this nav or API.
 *
 * @param {string} path
 * @returns {boolean}
 */
export function isProspectWorkbenchPath(path) {
  const p = String(path || '').split('?')[0].replace(/\/+$/, '') || '/';
  return p === PROSPECT_WORKBENCH_PATH || p === '/api/app/workbench';
}

/**
 * Action Queue is an Operating Workspace capability.
 * Tenant Workspace must not receive this nav or API.
 *
 * @param {string} path
 * @returns {boolean}
 */
export function isActionQueuePath(path) {
  const p = String(path || '').split('?')[0].replace(/\/+$/, '') || '/';
  return p === ACTION_QUEUE_PATH || p === '/api/app/queue';
}

/**
 * Prospect Pipeline is an Operating Workspace capability.
 * Tenant Workspace must not receive this nav or API.
 *
 * @param {string} path
 * @returns {boolean}
 */
export function isProspectPipelinePath(path) {
  const p = String(path || '').split('?')[0].replace(/\/+$/, '') || '/';
  return p === PROSPECT_PIPELINE_PATH || p === '/api/app/pipeline';
}

/**
 * Commercial summary is an Operating Workspace capability.
 * Tenant Workspace must not receive this nav or API.
 *
 * @param {string} path
 * @returns {boolean}
 */
export function isCommercialSummaryPath(path) {
  const p = String(path || '').split('?')[0].replace(/\/+$/, '') || '/';
  return p === COMMERCIAL_SUMMARY_PATH || p === '/api/app/commercial';
}

/**
 * Clients summary is an Operating Workspace capability.
 * Tenant Workspace must not receive this nav or API.
 *
 * @param {string} path
 * @returns {boolean}
 */
export function isClientsPath(path) {
  const p = String(path || '').split('?')[0].replace(/\/+$/, '') || '/';
  return p === CLIENTS_PATH || p === '/api/app/clients' || isClientSharedDetailPath(p);
}

/**
 * Shared Client summary is an Operating Workspace capability.
 * Tenant Workspace must not receive this nav or API.
 *
 * @param {string} path
 * @returns {boolean}
 */
export function isClientSharedDetailPath(path) {
  const p = String(path || '').split('?')[0].replace(/\/+$/, '') || '/';
  if (p === '/api/app/client' || p === '/api/app/clients/detail') return true;
  if (!p.startsWith(CLIENT_SHARED_DETAIL_PREFIX)) return false;
  return p.length > CLIENT_SHARED_DETAIL_PREFIX.length;
}

/**
 * @param {readonly { id: string }[]} items
 * @returns {boolean}
 */
export function navIncludesProspectOperations(items) {
  return (items || []).some((item) => {
    const id = String(item?.id || '');
    const href = String(/** @type {{ href?: string }} */ (item).href || '');
    return id === 'prospects' || href === PROSPECT_OPERATIONS_PATH;
  });
}

/**
 * @param {readonly { id: string, href?: string | null }[]} items
 * @returns {boolean}
 */
export function navIncludesTodayMyWork(items) {
  return (items || []).some((item) => {
    const id = String(item?.id || '');
    const href = String(/** @type {{ href?: string }} */ (item).href || '');
    return id === 'my_work' && href === TODAY_MY_WORK_PATH;
  });
}

/**
 * @param {readonly { id: string, href?: string | null }[]} items
 * @returns {boolean}
 */
export function navIncludesProspectPipeline(items) {
  return (items || []).some((item) => {
    const id = String(item?.id || '');
    const href = String(/** @type {{ href?: string }} */ (item).href || '');
    return id === 'pipeline' || href === PROSPECT_PIPELINE_PATH;
  });
}

/**
 * Route / capability matrix for #772 Phase 1.
 * Disposition is the migration class; environment is the current auth entry.
 *
 * @type {readonly {
 *   path: string,
 *   name: string,
 *   environment: AppEnvironment | 'chooser' | 'public' | 'mixed',
 *   record_type: string,
 *   data_source: string,
 *   disposition: SurfaceDisposition,
 *   notes: string,
 * }[]}
 */
export const WORKSPACE_SURFACE_MATRIX = Object.freeze([
  Object.freeze({
    path: '/app',
    name: 'Workspace chooser',
    environment: 'chooser',
    record_type: 'none',
    data_source: 'none',
    disposition: 'CANONICAL',
    notes: 'Staff deliberate entry. Live Tenant session redirects to /app/tenant (#1006). No shared switcher.',
  }),
  Object.freeze({
    path: '/app/core',
    name: 'Operating Workspace shell (Core environment)',
    environment: 'core',
    record_type: 'cmp_tickets (requests)',
    data_source: 'fixture | cmp_tickets_read',
    disposition: 'CANONICAL',
    notes: 'Existing #778/#877 shell. Product name is Operating Workspace.',
  }),
  Object.freeze({
    path: '/app/tenant',
    name: 'Tenant Workspace shell',
    environment: 'tenant',
    record_type: 'cmp_tickets (client-safe projection)',
    data_source: 'fixture | cmp_tickets_read',
    disposition: 'CANONICAL',
    notes: 'Existing #778/#877 shell. CorpFlowAI uses normal tenant auth. #1073 journey: Requests & Progress → #884 review → canonical /change.',
  }),
  Object.freeze({
    path: '/app/prospects',
    name: 'Prospect Operations (first shared route)',
    environment: 'core',
    record_type: 'leads',
    data_source: 'fixture | leads_read',
    disposition: 'CANONICAL',
    notes: 'Staff-only. Reuses #721 view-model. Canonical operator queue for #699 market enquiries. Not shown in Tenant nav.',
  }),
  Object.freeze({
    path: '/app/today',
    name: 'Today / My Work landing',
    environment: 'core',
    record_type: 'leads',
    data_source: 'fixture | leads_read via matchesMyWorkTodayFilter',
    disposition: 'CANONICAL',
    notes: 'Staff-only. Filters shared Prospect Operations with #721 My Work / Today rules. Tenant nav stays a placeholder.',
  }),
  Object.freeze({
    path: '/app/prospects/[id]',
    name: 'Shared Prospect detail / actions / history',
    environment: 'core',
    record_type: 'leads',
    data_source: 'fixture | leads_read + existing qualificationJson write paths',
    disposition: 'CANONICAL',
    notes: 'Staff-only #994 slice. Same Lead Rescue and Website Rescue rows. Does not retire product desks.',
  }),
  Object.freeze({
    path: '/app/workbench',
    name: 'Shared Prospect Workbench',
    environment: 'core',
    record_type: 'leads',
    data_source: 'fixture | leads_read + existing qualificationJson write paths',
    disposition: 'CANONICAL',
    notes: 'Staff-only #996. Cross-product processing grid. Opens #994 shared detail. Temporary Lead Rescue desk remains until retirement.',
  }),
  Object.freeze({
    path: '/app/queue',
    name: 'Prospect Action Queue',
    environment: 'core',
    record_type: 'leads',
    data_source: 'fixture | leads_read via matchesActionQueueFilter',
    disposition: 'CANONICAL',
    notes: 'Staff-only #995. Cross-product queue. Opens #994 shared detail. Temporary Rapid Delivery desk remains until retirement.',
  }),
  Object.freeze({
    path: '/app/pipeline',
    name: 'Prospect Pipeline / Kanban',
    environment: 'core',
    record_type: 'leads',
    data_source: 'fixture | leads_read via canonical_stage lanes',
    disposition: 'CANONICAL',
    notes: 'Staff-only #997 slice. Same Postgres leads as Prospect Operations. Replaces /change/revenue localStorage as canonical pipeline.',
  }),
  Object.freeze({
    path: '/app/clients',
    name: 'Clients summary',
    environment: 'core',
    record_type: 'company_master',
    data_source: 'fixture | company_master_read + related leads',
    disposition: 'CANONICAL',
    notes: 'Staff-only #999. Reuses Company Master identity. No second Client table. Links existing prospect/commercial/delivery surfaces.',
  }),
  Object.freeze({
    path: '/app/clients/[id]',
    name: 'Client summary / detail',
    environment: 'core',
    record_type: 'company_master',
    data_source: 'fixture | company_master_read + related leads',
    disposition: 'CANONICAL',
    notes: 'Staff-only #999 detail. Existing records only. Company Master remains the evidence/asset editor.',
  }),
  Object.freeze({
    path: '/app/commercial',
    name: 'Commercial summary',
    environment: 'core',
    record_type: 'commercial_approval_rail + company_master refs',
    data_source: 'fixture | existing commercial-approval records + leads identity',
    disposition: 'CANONICAL',
    notes: 'Staff-only #1004. Read-only commercial state over existing #714 rail and Company Master identity. No billing ledger, payment execution, or ERPNext mutation.',
  }),
  Object.freeze({
    path: '/app/delivery',
    name: 'Delivery summary',
    environment: 'core',
    record_type: 'leads + cmp_tickets',
    data_source: 'fixture | leads_read + cmp_tickets_read',
    disposition: 'CANONICAL',
    notes: 'Staff-only #1005. Projects Lead Rescue, Website Rescue, and Change/request delivery. No second project system. Tenant 403.',
  }),
  Object.freeze({
    path: '/admin/rapid-delivery',
    name: 'Temporary Rapid Delivery desk (legacy Action Queue UX)',
    environment: 'core',
    record_type: 'leads (corpflow-rapid-delivery)',
    data_source: 'Postgres leads via admin-rapid-delivery-api',
    disposition: 'MIGRATE',
    notes: 'REUSE components/API; migrate UX into Operating Workspace Action Queue.',
  }),
  Object.freeze({
    path: '/admin/lead-rescue',
    name: 'Lead Rescue workbench list',
    environment: 'core',
    record_type: 'leads (ai-lead-rescue)',
    data_source: 'Postgres leads via admin-lead-rescue-api',
    disposition: 'MIGRATE',
    notes: 'REUSE list/detail/actions; extract Prospect Workbench from product brand into /app/workbench.',
  }),
  Object.freeze({
    path: '/admin/lead-rescue/[id]',
    name: 'Lead Rescue workbench detail',
    environment: 'core',
    record_type: 'leads (ai-lead-rescue)',
    data_source: 'Postgres leads via admin-lead-rescue-api',
    disposition: 'MIGRATE',
    notes: 'Temporary product_detail until shared detail layer (#721 Slice 2).',
  }),
  Object.freeze({
    path: '/change/revenue',
    name: 'Revenue Cockpit Kanban',
    environment: 'mixed',
    record_type: 'localStorage cards (not leads)',
    data_source: 'corpflow.revenue.cockpit.v1 localStorage',
    disposition: 'MIGRATE',
    notes: 'Optional personal checklist only. Canonical pipeline is /app/pipeline (#997) on the same Postgres leads rows.',
  }),
  Object.freeze({
    path: '/change',
    name: 'Change Console',
    environment: 'mixed',
    record_type: 'cmp_tickets',
    data_source: 'Postgres cmp_tickets + console_json',
    disposition: 'CANONICAL',
    notes: 'Canonical tenant service/change/tickets. Operator Delivery summary is /app/delivery (#1005). Tenant Workspace hands off with from=tenant-workspace. Do not promote whole tree into Operating Workspace. Navigation does not create a ticket.',
  }),
  Object.freeze({
    path: '/change/lux-feedback',
    name: 'Lux owner feedback queue',
    environment: 'mixed',
    record_type: 'static operator queue',
    data_source: 'lib/client/lux-owner-feedback-queue.js',
    disposition: 'TEMPORARY',
    notes: 'Lux-specific operator addition on /change. Classify per capability; do not copy blindly.',
  }),
  Object.freeze({
    path: '/admin/company-master',
    name: 'Company Master',
    environment: 'core',
    record_type: 'company_master',
    data_source: 'Postgres company master',
    disposition: 'REUSE',
    notes: 'Evidence/asset editor. Canonical operator Clients summary is /app/clients (#999). Commercial summary (#1004) reuses this identity. Do not retire this desk in this slice.',
  }),
]);

/**
 * @param {string} path
 * @returns {(typeof WORKSPACE_SURFACE_MATRIX)[number] | null}
 */
export function classifyWorkspaceSurface(path) {
  const raw = String(path || '').split('?')[0].replace(/\/+$/, '') || '/';
  const exact = WORKSPACE_SURFACE_MATRIX.find((row) => row.path === raw);
  if (exact) return exact;
  if (raw.startsWith('/admin/lead-rescue/')) {
    return WORKSPACE_SURFACE_MATRIX.find((row) => row.path === '/admin/lead-rescue/[id]') || null;
  }
  if (isProspectSharedDetailPath(raw) && raw.startsWith('/app/prospects/')) {
    return WORKSPACE_SURFACE_MATRIX.find((row) => row.path === '/app/prospects/[id]') || null;
  }
  if (isClientSharedDetailPath(raw) && raw.startsWith('/app/clients/')) {
    return WORKSPACE_SURFACE_MATRIX.find((row) => row.path === '/app/clients/[id]') || null;
  }
  return null;
}

/**
 * Tenant Workspace nav must never include Prospect Operations.
 * @returns {boolean}
 */
export function tenantNavOmitsProspectOperations() {
  return !navIncludesProspectOperations(TENANT_NAV_ITEMS);
}

/**
 * Operating Workspace nav includes the first Prospect Operations route.
 * @returns {boolean}
 */
export function operatingNavIncludesProspectOperations() {
  return navIncludesProspectOperations(CORE_NAV_ITEMS);
}

/**
 * Operating Workspace nav points My Work at the Today landing.
 * Tenant My Work is retired from Tenant nav (#1073); Operating Workspace Today stays staff-only.
 * @returns {boolean}
 */
export function operatingNavIncludesTodayMyWork() {
  return navIncludesTodayMyWork(CORE_NAV_ITEMS);
}

/**
 * Tenant Workspace must not expose the Operating Workspace Today route.
 * @returns {boolean}
 */
export function tenantNavOmitsTodayMyWork() {
  return !navIncludesTodayMyWork(TENANT_NAV_ITEMS);
}

/**
 * @param {readonly { id: string, href?: string | null }[]} items
 * @returns {boolean}
 */
export function navIncludesProspectWorkbench(items) {
  return (items || []).some((item) => {
    const id = String(item?.id || '');
    const href = String(/** @type {{ href?: string }} */ (item).href || '');
    return id === 'workbench' && href === PROSPECT_WORKBENCH_PATH;
  });
}

/**
 * Operating Workspace nav includes the shared Prospect Workbench.
 * @returns {boolean}
 */
export function operatingNavIncludesProspectWorkbench() {
  return navIncludesProspectWorkbench(CORE_NAV_ITEMS);
}

/**
 * Tenant Workspace must not expose the Prospect Workbench.
 * @returns {boolean}
 */
export function tenantNavOmitsProspectWorkbench() {
  return !navIncludesProspectWorkbench(TENANT_NAV_ITEMS);
}

/**
 * @param {readonly { id: string, href?: string | null }[]} items
 * @returns {boolean}
 */
export function navIncludesActionQueue(items) {
  return (items || []).some((item) => {
    const id = String(item?.id || '');
    const href = String(/** @type {{ href?: string }} */ (item).href || '');
    return id === 'queue' || href === ACTION_QUEUE_PATH;
  });
}

/**
 * Operating Workspace nav includes the canonical Action Queue.
 * @returns {boolean}
 */
export function operatingNavIncludesActionQueue() {
  return navIncludesActionQueue(CORE_NAV_ITEMS);
}

/**
 * Tenant Workspace must not expose the Operating Workspace Action Queue.
 * @returns {boolean}
 */
export function tenantNavOmitsActionQueue() {
  return !navIncludesActionQueue(TENANT_NAV_ITEMS);
}

/**
 * Operating Workspace nav includes the Prospect Pipeline route.
 * @returns {boolean}
 */
export function operatingNavIncludesProspectPipeline() {
  return navIncludesProspectPipeline(CORE_NAV_ITEMS);
}

/**
 * Tenant Workspace must not expose the Operating Workspace Pipeline route.
 * @returns {boolean}
 */
export function tenantNavOmitsProspectPipeline() {
  return !navIncludesProspectPipeline(TENANT_NAV_ITEMS);
}

/**
 * @param {readonly { id: string, href?: string | null }[]} items
 * @returns {boolean}
 */
export function navIncludesClients(items) {
  return (items || []).some((item) => {
    const id = String(item?.id || '');
    const href = String(/** @type {{ href?: string }} */ (item).href || '');
    return id === 'clients' || href === CLIENTS_PATH;
  });
}

/**
 * Operating Workspace nav includes the Clients summary.
 * @returns {boolean}
 */
export function operatingNavIncludesClients() {
  return navIncludesClients(CORE_NAV_ITEMS);
}

/**
 * Tenant Workspace must not expose the Operating Workspace Clients summary.
 * @returns {boolean}
 */
export function tenantNavOmitsClients() {
  return !navIncludesClients(TENANT_NAV_ITEMS);
}

/**
 * @param {readonly { id: string, href?: string | null }[]} items
 * @returns {boolean}
 */
export function navIncludesCommercialSummary(items) {
  return (items || []).some((item) => {
    const id = String(item?.id || '');
    const href = String(/** @type {{ href?: string }} */ (item).href || '');
    return id === 'commercial' || href === COMMERCIAL_SUMMARY_PATH;
  });
}

/**
 * Operating Workspace nav includes the Commercial summary.
 * @returns {boolean}
 */
export function operatingNavIncludesCommercialSummary() {
  return navIncludesCommercialSummary(CORE_NAV_ITEMS);
}

/**
 * Tenant Workspace must not expose the Operating Workspace Commercial summary.
 * @returns {boolean}
 */
export function tenantNavOmitsCommercialSummary() {
  return !navIncludesCommercialSummary(TENANT_NAV_ITEMS);
}

/**
 * Delivery summary is an Operating Workspace capability.
 * Tenant Workspace must not receive this nav or API.
 *
 * @param {string} path
 * @returns {boolean}
 */
export function isDeliveryPath(path) {
  const p = String(path || '').split('?')[0].replace(/\/+$/, '') || '/';
  return p === DELIVERY_PATH || p === '/api/app/delivery';
}

/**
 * @param {readonly { id: string, href?: string | null }[]} items
 * @returns {boolean}
 */
export function navIncludesDelivery(items) {
  return (items || []).some((item) => {
    const id = String(item?.id || '');
    const href = String(/** @type {{ href?: string }} */ (item).href || '');
    return id === 'delivery' && href === DELIVERY_PATH;
  });
}

/**
 * Operating Workspace nav includes the Delivery summary.
 * @returns {boolean}
 */
export function operatingNavIncludesDelivery() {
  return navIncludesDelivery(CORE_NAV_ITEMS);
}

/**
 * Tenant Workspace must not expose the Operating Workspace Delivery summary.
 * @returns {boolean}
 */
export function tenantNavOmitsDelivery() {
  return !navIncludesDelivery(TENANT_NAV_ITEMS);
}
