/**
 * #1075 — consolidated application release qualification.
 *
 * Machine copy of the route matrix, demo path, and verdict for current main
 * plus live corpflow_test. Browser-safe. No Prisma. No secrets.
 *
 * Does not implement later slices that still have open PRs (#1004 / #1005 /
 * #1072 / #1073 / #1074). Those rows are NOT LIVE, not duplicated here.
 */

/** @typedef {'LIVE'|'NOT_LIVE'|'AUTH_REDIRECT'} LiveStatus */
/** @typedef {'CANONICAL'|'REUSE'|'MIGRATE'|'TEMPORARY'|'EXPERIMENTAL'|'NOT_YET'} SurfaceDisposition */
/** @typedef {'chooser'|'core'|'tenant'|'mixed'|'public'} AuthEnvironment */

export const RELEASE_QUALIFICATION_VERSION = '1075-v1';
export const RELEASE_QUALIFICATION_ISSUE = '#1075';
export const RELEASE_QUALIFICATION_PARENT = '#772';

export const FINAL_VERDICT = 'CORPFLOWAI CONSOLIDATED APPLICATION READY FOR OPERATOR REVIEW';

/** Current-main commit probed on corpflow_test during this packet. */
export const LIVE_PROBE = Object.freeze({
  probed_at: '2026-08-25T16:00:00Z',
  commit_sha: 'b82979d7518f40f9ec3f32435ed5540c80240416',
  github_production_deployment_id: '6082122270',
  factory_host: 'https://core.corpflowai.com',
  lux_host: 'https://lux.corpflowai.com',
  environment: 'corpflow_test',
});

/**
 * Named later slices still in open implementation PRs.
 * This packet must not duplicate them.
 */
export const OPEN_LATER_SLICES = Object.freeze([
  Object.freeze({
    issue: '#1004',
    pr: '#1045',
    title: 'Operating Workspace Commercial summary',
    route: '/app/commercial',
  }),
  Object.freeze({
    issue: '#1005',
    pr: '#1048',
    title: 'Operating Workspace Delivery summary',
    route: '/app/delivery',
    pr_draft: true,
  }),
  Object.freeze({
    issue: '#1006',
    pr: '#1047',
    title: 'Tenant Workspace simplification',
    route: '/app/tenant',
    pr_draft: true,
  }),
  Object.freeze({
    issue: '#1072',
    pr: '#1076',
    title: 'Prospect-to-client-to-delivery continuity',
    route: 'n/a',
  }),
  Object.freeze({
    issue: '#1073',
    pr: '#1077',
    title: 'Tenant request/review/change continuity',
    route: '/app/tenant',
  }),
  Object.freeze({
    issue: '#1074',
    pr: '#1084',
    title: 'Extract unique legacy-desk contracts and retire wave 1',
    route: '/admin/lead-rescue',
  }),
]);

/** One Postgres. Three record types for three jobs — not three CRMs. */
export const RECORD_SOURCES_OF_TRUTH = Object.freeze([
  Object.freeze({
    domain: 'prospects',
    record_type: 'leads',
    canonical_routes: Object.freeze([
      '/app/today',
      '/app/queue',
      '/app/workbench',
      '/app/pipeline',
      '/app/prospects',
      '/app/prospects/[id]',
    ]),
    not_canonical: Object.freeze(['/admin/lead-rescue', '/admin/rapid-delivery', '/change/revenue']),
  }),
  Object.freeze({
    domain: 'clients',
    record_type: 'company_master',
    canonical_routes: Object.freeze(['/app/clients', '/app/clients/[id]']),
    not_canonical: Object.freeze(['/admin/company-master']),
  }),
  Object.freeze({
    domain: 'tickets_change_requests',
    record_type: 'cmp_tickets',
    canonical_routes: Object.freeze(['/app/core', '/app/tenant', '/change']),
    not_canonical: Object.freeze(['/change-v2']),
  }),
]);

export const STAFF_ONLY_API_PATHS = Object.freeze([
  '/api/app/today',
  '/api/app/queue',
  '/api/app/workbench',
  '/api/app/pipeline',
  '/api/app/prospects',
  '/api/app/prospect',
  '/api/app/clients',
  '/api/app/client',
  '/api/app/component-expose',
]);

export const STAFF_ONLY_PAGE_PATHS = Object.freeze([
  '/app/core',
  '/app/today',
  '/app/queue',
  '/app/workbench',
  '/app/pipeline',
  '/app/prospects',
  '/app/clients',
]);

/**
 * Operator demo path using synthetic proof fixtures (local / Preview) or the
 * matching live records after Core / Tenant sign-in on corpflow_test.
 */
export const STAFF_DEMO_PATH = Object.freeze([
  Object.freeze({
    step: 1,
    label: 'Choose workspace',
    path: '/app',
    proof: '/app',
    note: 'Deliberate Operating vs Tenant entry. Separate sign-in.',
  }),
  Object.freeze({
    step: 2,
    label: 'Today / My Work',
    path: '/app/today',
    proof: '/app/today?proof=1',
    note: 'Items that need action now. Same leads rows as the rest of Prospect Operations.',
  }),
  Object.freeze({
    step: 3,
    label: 'Action Queue',
    path: '/app/queue',
    proof: '/app/queue?proof=1',
    note: 'Cross-product queue. Open Ada Spa → shared Prospect detail.',
  }),
  Object.freeze({
    step: 4,
    label: 'Shared Prospect',
    path: '/app/prospects/syn-772-lr-ada',
    proof: '/app/prospects/syn-772-lr-ada?proof=1',
    note: 'Identity, qualification, history. Commercial clearance on the same leads row (#551).',
  }),
  Object.freeze({
    step: 5,
    label: 'Client summary',
    path: '/app/clients/cmp_ada_spa_synthetic',
    proof: '/app/clients/cmp_ada_spa_synthetic?proof=1',
    note: 'Company Master identity. Related prospect is the same Ada Spa lead. No second client table.',
  }),
  Object.freeze({
    step: 6,
    label: 'Commercial (current-main stand-in)',
    path: '/app/prospects/syn-772-lr-ada',
    proof: '/app/prospects/syn-772-lr-ada?proof=1',
    note: 'Dedicated /app/commercial is NOT LIVE (#1004 / PR #1045). Use Commercial clearance on Prospect detail.',
  }),
  Object.freeze({
    step: 7,
    label: 'Delivery (current-main stand-in)',
    path: '/change',
    proof: '/app/prospects/syn-716-wr-cleared?proof=1',
    note: 'Dedicated /app/delivery is NOT LIVE (#1005 / PR #1048). Website Rescue delivery is on Prospect detail; tenant service/change stays at /change. Nav Delivery also opens /change.',
  }),
]);

export const TENANT_DEMO_PATH = Object.freeze([
  Object.freeze({
    step: 1,
    label: 'Choose Tenant Workspace',
    path: '/app',
    proof: '/app',
    note: 'Open Tenant Workspace — CorpFlowAI. Tenant session cannot enter Operating Workspace.',
  }),
  Object.freeze({
    step: 2,
    label: 'Requests & Progress',
    path: '/app/tenant',
    proof: '/app/tenant?proof=1',
    note: 'Client-safe request list. Fixture id syn_slice1_req_corpflowai_001.',
  }),
  Object.freeze({
    step: 3,
    label: 'Exposed review / comment / approval',
    path: '/app/tenant',
    proof: '/app/tenant?proof=1',
    note: 'Landing copy is already exposed. Approve or request changes. Internal wiring stays view-only.',
  }),
  Object.freeze({
    step: 4,
    label: 'Change Console',
    path: '/change',
    proof: '/change',
    note: 'Canonical ticket/change/service-request surface on the same cmp_tickets rows. Not absorbed into Operating Workspace.',
  }),
]);

/**
 * Route-by-route qualification matrix.
 *
 * live_status is from GET against corpflow_test (core.corpflowai.com unless noted)
 * on the Production commit above. App pages return HTML 200 then authenticate
 * in the browser; admin desks SSR-redirect to login.
 *
 * @type {readonly {
 *   path: string,
 *   name: string,
 *   live_status: LiveStatus,
 *   live_http: number,
 *   canonical_purpose: string,
 *   auth_boundary: string,
 *   source_of_truth: string,
 *   disposition: SurfaceDisposition,
 *   environment: AuthEnvironment,
 *   desktop_mobile: string,
 *   defects: string,
 *   legacy_replaced_or_reduced: string,
 * }[]}
 */
export const CONSOLIDATED_ROUTE_MATRIX = Object.freeze([
  Object.freeze({
    path: '/app',
    name: 'Workspace chooser',
    live_status: 'LIVE',
    live_http: 200,
    canonical_purpose: 'Deliberate Operating vs Tenant entry',
    auth_boundary: 'Public chooser; each door uses its own existing sign-in',
    source_of_truth: 'none',
    disposition: 'CANONICAL',
    environment: 'chooser',
    desktop_mobile: 'PASS — stacked actions, wrap chrome',
    defects: 'none',
    legacy_replaced_or_reduced: 'Replaces implicit /change-as-home for workspace entry',
  }),
  Object.freeze({
    path: '/app/core',
    name: 'Operating Workspace shell',
    live_status: 'LIVE',
    live_http: 200,
    canonical_purpose: 'Staff requests/progress + expose-for-review',
    auth_boundary: 'Core / admin session only. Tenant → 403',
    source_of_truth: 'cmp_tickets',
    disposition: 'CANONICAL',
    environment: 'core',
    desktop_mobile: 'PASS — wrap nav, loading/empty/error panels',
    defects: 'none',
    legacy_replaced_or_reduced: 'Product name over technical Core shell (#778/#877)',
  }),
  Object.freeze({
    path: '/app/tenant',
    name: 'Tenant Workspace shell',
    live_status: 'LIVE',
    live_http: 200,
    canonical_purpose: 'Client-safe requests, progress, exposed review',
    auth_boundary: 'Tenant session bound to tenant_id. Core cannot enter. Cross-tenant 404',
    source_of_truth: 'cmp_tickets (client-safe projection)',
    disposition: 'CANONICAL',
    environment: 'tenant',
    desktop_mobile: 'PASS — wrap chrome, empty/error/loading',
    defects: 'Most Tenant nav items remain in-shell placeholders (later #1006 / PR #1047). Not a missing capability.',
    legacy_replaced_or_reduced: 'Client-safe progress no longer requires opening /change first',
  }),
  Object.freeze({
    path: '/app/today',
    name: 'Today / My Work',
    live_status: 'LIVE',
    live_http: 200,
    canonical_purpose: 'Staff landing: overdue / due today / missing next action',
    auth_boundary: 'Operating Workspace / Core only. Tenant → 403',
    source_of_truth: 'leads via matchesMyWorkTodayFilter',
    disposition: 'CANONICAL',
    environment: 'core',
    desktop_mobile: 'PASS — table overflow-x, wrap chrome',
    defects: 'none',
    legacy_replaced_or_reduced: 'My Work is no longer an unfiltered Requests alias',
  }),
  Object.freeze({
    path: '/app/queue',
    name: 'Prospect Action Queue',
    live_status: 'LIVE',
    live_http: 200,
    canonical_purpose: 'What needs action now across products',
    auth_boundary: 'Operating Workspace / Core only. Tenant → 403',
    source_of_truth: 'leads via matchesActionQueueFilter',
    disposition: 'CANONICAL',
    environment: 'core',
    desktop_mobile: 'PASS — table overflow-x',
    defects: 'none',
    legacy_replaced_or_reduced: 'Reduces /admin/rapid-delivery as the operator queue (desk still TEMPORARY/MIGRATE until #1074 merges)',
  }),
  Object.freeze({
    path: '/app/workbench',
    name: 'Shared Prospect Workbench',
    live_status: 'LIVE',
    live_http: 200,
    canonical_purpose: 'Cross-product processing grid',
    auth_boundary: 'Operating Workspace / Core only. Tenant → 403',
    source_of_truth: 'leads',
    disposition: 'CANONICAL',
    environment: 'core',
    desktop_mobile: 'PASS — table overflow-x, wrap filters',
    defects: 'none',
    legacy_replaced_or_reduced: 'Reduces /admin/lead-rescue branded grid (desk still MIGRATE until #1074 merges)',
  }),
  Object.freeze({
    path: '/app/pipeline',
    name: 'Prospect Pipeline',
    live_status: 'LIVE',
    live_http: 200,
    canonical_purpose: 'Canonical-stage lanes for the same leads rows',
    auth_boundary: 'Operating Workspace / Core only. Tenant → 403',
    source_of_truth: 'leads via canonical_stage',
    disposition: 'CANONICAL',
    environment: 'core',
    desktop_mobile: 'PASS — lane board overflow-x',
    defects: 'none',
    legacy_replaced_or_reduced: 'Replaces /change/revenue localStorage as canonical pipeline',
  }),
  Object.freeze({
    path: '/app/prospects',
    name: 'Prospect Operations list',
    live_status: 'LIVE',
    live_http: 200,
    canonical_purpose: 'Shared staff prospect list',
    auth_boundary: 'Operating Workspace / Core only. Tenant → 403',
    source_of_truth: 'leads',
    disposition: 'CANONICAL',
    environment: 'core',
    desktop_mobile: 'PASS — table overflow-x',
    defects: 'none',
    legacy_replaced_or_reduced: 'One list instead of product-branded enquiry desks',
  }),
  Object.freeze({
    path: '/app/prospects/[id]',
    name: 'Shared Prospect detail',
    live_status: 'LIVE',
    live_http: 200,
    canonical_purpose: 'Identity / qualification / history / safe JSON actions; commercial clearance; Website Rescue delivery',
    auth_boundary: 'Operating Workspace / Core only. Tenant → 403',
    source_of_truth: 'leads + qualificationJson',
    disposition: 'CANONICAL',
    environment: 'core',
    desktop_mobile: 'PASS — form grid auto-fit, wrap chrome',
    defects: 'none (missing-record back path added in this packet)',
    legacy_replaced_or_reduced: 'Shared detail over product-desk detail; commercial/delivery evidence lives here until #1004/#1005',
  }),
  Object.freeze({
    path: '/app/clients',
    name: 'Clients summary',
    live_status: 'LIVE',
    live_http: 200,
    canonical_purpose: 'Staff overview of Company Master client/business records',
    auth_boundary: 'Operating Workspace / Core only. Tenant → 403',
    source_of_truth: 'company_master + related leads',
    disposition: 'CANONICAL',
    environment: 'core',
    desktop_mobile: 'PASS — table overflow-x',
    defects: 'none',
    legacy_replaced_or_reduced: 'Operator Clients summary; Company Master remains the evidence editor',
  }),
  Object.freeze({
    path: '/app/clients/[id]',
    name: 'Client summary / detail',
    live_status: 'LIVE',
    live_http: 200,
    canonical_purpose: 'One client identity with related prospect / commercial / delivery links',
    auth_boundary: 'Operating Workspace / Core only. Tenant → 403',
    source_of_truth: 'company_master + related leads',
    disposition: 'CANONICAL',
    environment: 'core',
    desktop_mobile: 'PASS — definition list auto-fit',
    defects: 'none',
    legacy_replaced_or_reduced: 'No second Client table',
  }),
  Object.freeze({
    path: '/app/commercial',
    name: 'Commercial summary (later slice)',
    live_status: 'NOT_LIVE',
    live_http: 404,
    canonical_purpose: 'Not on current main. Staff commercial stand-in is Prospect commercial clearance + Company Master.',
    auth_boundary: 'Would be Core only once #1004 lands',
    source_of_truth: 'n/a on current main',
    disposition: 'NOT_YET',
    environment: 'core',
    desktop_mobile: 'n/a — 404 now links back to /app',
    defects: 'NOT LIVE — open PR #1045 (#1004). Not duplicated.',
    legacy_replaced_or_reduced: 'none yet',
  }),
  Object.freeze({
    path: '/app/delivery',
    name: 'Delivery summary (later slice)',
    live_status: 'NOT_LIVE',
    live_http: 404,
    canonical_purpose: 'Not on current main. Staff stand-in is Website Rescue delivery panel + nav Delivery → /change.',
    auth_boundary: 'Would be Core only once #1005 lands',
    source_of_truth: 'n/a on current main',
    disposition: 'NOT_YET',
    environment: 'core',
    desktop_mobile: 'n/a — 404 now links back to /app',
    defects: 'NOT LIVE — draft PR #1048 (#1005). Not duplicated.',
    legacy_replaced_or_reduced: 'none yet',
  }),
  Object.freeze({
    path: '/change',
    name: 'Change Console',
    live_status: 'LIVE',
    live_http: 200,
    canonical_purpose: 'Tenant service / change / ticket control surface',
    auth_boundary: 'Tenant or admin on the host; not absorbed into Operating Workspace',
    source_of_truth: 'cmp_tickets + console_json',
    disposition: 'CANONICAL',
    environment: 'mixed',
    desktop_mobile: 'PASS — existing Change Console layout (live 200 on core and lux)',
    defects: 'none for this qualification',
    legacy_replaced_or_reduced: 'Remains canonical for tickets; Core nav Delivery/Operations still land here until #1005',
  }),
  Object.freeze({
    path: '/change/revenue',
    name: 'Revenue Cockpit checklist',
    live_status: 'LIVE',
    live_http: 200,
    canonical_purpose: 'Optional personal checklist only',
    auth_boundary: 'mixed / operator page',
    source_of_truth: 'localStorage (not leads)',
    disposition: 'MIGRATE',
    environment: 'mixed',
    desktop_mobile: 'PASS — links back to /app/pipeline and /app/prospects',
    defects: 'Must not be demonstrated as the pipeline. Canonical pipeline is /app/pipeline.',
    legacy_replaced_or_reduced: 'Reduced to checklist; retirement owned by open PR #1084',
  }),
  Object.freeze({
    path: '/change-v2',
    name: 'Experimental Change Console',
    live_status: 'LIVE',
    live_http: 200,
    canonical_purpose: 'Experimental only — not the production control surface',
    auth_boundary: 'mixed',
    source_of_truth: 'cmp_tickets (experimental UI)',
    disposition: 'EXPERIMENTAL',
    environment: 'mixed',
    desktop_mobile: 'PASS — links back to /change',
    defects: 'Do not demo as canonical',
    legacy_replaced_or_reduced: 'Not promoted',
  }),
  Object.freeze({
    path: '/change/lux-feedback',
    name: 'Lux owner feedback queue',
    live_status: 'LIVE',
    live_http: 200,
    canonical_purpose: 'Lux-specific operator addition',
    auth_boundary: 'operator / mixed',
    source_of_truth: 'static operator queue',
    disposition: 'TEMPORARY',
    environment: 'mixed',
    desktop_mobile: 'n/a this packet',
    defects: 'Do not copy into Tenant Workspace',
    legacy_replaced_or_reduced: 'Classify per capability; not part of the staff demo path',
  }),
  Object.freeze({
    path: '/admin/lead-rescue',
    name: 'Temporary Lead Rescue desk',
    live_status: 'AUTH_REDIRECT',
    live_http: 307,
    canonical_purpose: 'Temporary product desk until #1074',
    auth_boundary: 'requireAdminPageSession — SSR login redirect',
    source_of_truth: 'leads (ai-lead-rescue) via admin API',
    disposition: 'MIGRATE',
    environment: 'core',
    desktop_mobile: 'n/a unauthenticated (login redirect)',
    defects: 'Still live. Canonical workbench is /app/workbench. Retirement owned by PR #1084 — not duplicated.',
    legacy_replaced_or_reduced: 'UX owner is /app/workbench + /app/prospects/[id]',
  }),
  Object.freeze({
    path: '/admin/rapid-delivery',
    name: 'Temporary Rapid Delivery desk',
    live_status: 'AUTH_REDIRECT',
    live_http: 307,
    canonical_purpose: 'Temporary product desk until #1074',
    auth_boundary: 'requireAdminPageSession — SSR login redirect',
    source_of_truth: 'leads (corpflow-rapid-delivery) via admin API',
    disposition: 'MIGRATE',
    environment: 'core',
    desktop_mobile: 'n/a unauthenticated (login redirect)',
    defects: 'Still live. Canonical queue is /app/queue. Retirement owned by PR #1084 — not duplicated.',
    legacy_replaced_or_reduced: 'UX owner is /app/queue + /app/prospects/[id]',
  }),
  Object.freeze({
    path: '/admin/company-master',
    name: 'Company Master editor',
    live_status: 'AUTH_REDIRECT',
    live_http: 307,
    canonical_purpose: 'Evidence / asset editor for company identity',
    auth_boundary: 'requireAdminPageSession — SSR login redirect',
    source_of_truth: 'company_master',
    disposition: 'REUSE',
    environment: 'core',
    desktop_mobile: 'n/a unauthenticated (login redirect)',
    defects: 'none — editor stays; /app/clients is the operator summary',
    legacy_replaced_or_reduced: 'Not retired. Canonical operator summary is /app/clients',
  }),
]);

/**
 * Unknown /app, /admin, or /change URLs must not strand the operator on a
 * marketing-only 404.
 *
 * @param {string} path
 * @returns {boolean}
 */
export function needsWorkspaceEscape(path) {
  const p = String(path || '').split('?')[0];
  return p.startsWith('/app') || p.startsWith('/admin') || p.startsWith('/change');
}

/**
 * @param {string} path
 * @returns {(typeof CONSOLIDATED_ROUTE_MATRIX)[number] | null}
 */
export function qualifyConsolidatedRoute(path) {
  const raw = String(path || '').split('?')[0].replace(/\/+$/, '') || '/';
  const exact = CONSOLIDATED_ROUTE_MATRIX.find((row) => row.path === raw);
  if (exact) return exact;
  if (raw.startsWith('/app/prospects/') && raw !== '/app/prospects') {
    return CONSOLIDATED_ROUTE_MATRIX.find((row) => row.path === '/app/prospects/[id]') || null;
  }
  if (raw.startsWith('/app/clients/') && raw !== '/app/clients') {
    return CONSOLIDATED_ROUTE_MATRIX.find((row) => row.path === '/app/clients/[id]') || null;
  }
  if (raw.startsWith('/admin/lead-rescue/')) {
    return CONSOLIDATED_ROUTE_MATRIX.find((row) => row.path === '/admin/lead-rescue') || null;
  }
  return null;
}

/**
 * @returns {boolean}
 */
export function noSecondCrmOnCurrentMain() {
  const domains = RECORD_SOURCES_OF_TRUTH.map((row) => row.record_type);
  return (
    domains.includes('leads') &&
    domains.includes('company_master') &&
    domains.includes('cmp_tickets') &&
    domains.length === 3
  );
}
