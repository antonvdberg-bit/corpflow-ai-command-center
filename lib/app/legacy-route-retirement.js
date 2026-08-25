/**
 * #1074 wave 1 — legacy route capability parity and retirement.
 *
 * Browser-safe. No Prisma. No secrets. No schema.
 * Canonical replacements already live on Operating Workspace routes.
 */

import {
  ACTION_QUEUE_PATH,
  PROSPECT_PIPELINE_PATH,
  PROSPECT_SHARED_DETAIL_PREFIX,
  PROSPECT_WORKBENCH_PATH,
} from './workspace-context.js';

/** @typedef {'UNIQUE' | 'REPLACED' | 'OBSOLETE'} ParityClass */
/** @typedef {'RETIRED' | 'REDIRECTED' | 'TEMPORARY'} Wave1Status */

/**
 * Exact capability-parity matrix for the three #1074 legacy surfaces.
 * UNIQUE items were extracted onto canonical routes in this wave using
 * existing records/APIs. REPLACED items already lived on Operating Workspace.
 * OBSOLETE items must not survive as an alternate pipeline or record model.
 *
 * @type {readonly {
 *   legacy_path: string,
 *   capability: string,
 *   parity: ParityClass,
 *   canonical_path: string | null,
 *   notes: string,
 * }[]}
 */
export const LEGACY_ROUTE_CAPABILITY_MATRIX = Object.freeze([
  // --- /admin/rapid-delivery ---
  Object.freeze({
    legacy_path: '/admin/rapid-delivery',
    capability: 'Cross-product action queue of rapid-delivery / Website Rescue leads',
    parity: 'REPLACED',
    canonical_path: ACTION_QUEUE_PATH,
    notes: 'Same Postgres leads rows via /app/queue and /api/app/queue.',
  }),
  Object.freeze({
    legacy_path: '/admin/rapid-delivery',
    capability: 'Native status / owner / next-action write',
    parity: 'REPLACED',
    canonical_path: '/app/prospects/[id]',
    notes: 'PATCH /api/app/prospect already merges rapid_delivery_operator JSON.',
  }),
  Object.freeze({
    legacy_path: '/admin/rapid-delivery',
    capability: 'Proposal-ready summary (copy markdown / plain text, no send)',
    parity: 'UNIQUE',
    canonical_path: '/app/prospects/[id]',
    notes: 'Reuses buildRapidDeliveryProposalSummary on shared detail GET. No live send.',
  }),
  Object.freeze({
    legacy_path: '/admin/rapid-delivery',
    capability: 'Status-count summary cards',
    parity: 'OBSOLETE',
    canonical_path: ACTION_QUEUE_PATH,
    notes: 'Named Action Queue filters cover needs-action / new / overdue without a second UX.',
  }),
  // --- /admin/lead-rescue list ---
  Object.freeze({
    legacy_path: '/admin/lead-rescue',
    capability: 'Lead Rescue-branded workbench grid',
    parity: 'REPLACED',
    canonical_path: `${PROSPECT_WORKBENCH_PATH}?filter=lead_rescue`,
    notes: 'Shared Workbench already filters product === ai-lead-rescue.',
  }),
  Object.freeze({
    legacy_path: '/admin/lead-rescue',
    capability: 'Region / payment_status list filters',
    parity: 'OBSOLETE',
    canonical_path: `${PROSPECT_WORKBENCH_PATH}?filter=lead_rescue`,
    notes: 'Search + product filter + shared detail cover operator triage. Not a second record model.',
  }),
  // --- /admin/lead-rescue/[id] ---
  Object.freeze({
    legacy_path: '/admin/lead-rescue/[id]',
    capability: 'Shared identity / owner / stage / next-action / notes',
    parity: 'REPLACED',
    canonical_path: '/app/prospects/[id]',
    notes: '#994 shared detail + CommercialClearancePanel.',
  }),
  Object.freeze({
    legacy_path: '/admin/lead-rescue/[id]',
    capability: 'Setup checklist item write (PAID_SETUP+)',
    parity: 'UNIQUE',
    canonical_path: '/app/prospects/[id]',
    notes: 'Reuses mergeAiLeadRescueChecklistItemPatch via PATCH setup_checklist_item.',
  }),
  Object.freeze({
    legacy_path: '/admin/lead-rescue/[id]',
    capability: 'Structured outbound activity log (channel / type)',
    parity: 'UNIQUE',
    canonical_path: '/app/prospects/[id]',
    notes: 'Reuses appendAiLeadRescueActivity via PATCH activity_append. No live send.',
  }),
  Object.freeze({
    legacy_path: '/admin/lead-rescue/[id]',
    capability: 'Operator pack GitHub doc links',
    parity: 'OBSOLETE',
    canonical_path: '/app/prospects/[id]',
    notes: 'Docs remain in the repository; not a runtime capability.',
  }),
  // --- /change/revenue ---
  Object.freeze({
    legacy_path: '/change/revenue',
    capability: 'localStorage Kanban as prospect pipeline / status model',
    parity: 'OBSOLETE',
    canonical_path: PROSPECT_PIPELINE_PATH,
    notes: 'Must not survive. Canonical pipeline is Postgres leads + canonical_stage.',
  }),
  Object.freeze({
    legacy_path: '/change/revenue',
    capability: 'Playbook / template path index and offer reminders',
    parity: 'REPLACED',
    canonical_path: PROSPECT_PIPELINE_PATH,
    notes: 'Retirement notice keeps repo path references. Not an alternate CRM.',
  }),
]);

/**
 * Wave-1 route outcomes. /change itself is out of scope and remains CANONICAL.
 *
 * @type {readonly {
 *   path: string,
 *   status: Wave1Status,
 *   canonical_path: string,
 *   reason: string,
 * }[]}
 */
export const LEGACY_ROUTE_WAVE1_STATUS = Object.freeze([
  Object.freeze({
    path: '/admin/rapid-delivery',
    status: 'REDIRECTED',
    canonical_path: ACTION_QUEUE_PATH,
    reason:
      'Queue, shared detail, native-status writes, and proposal-summary copy now live on Operating Workspace. Admin session is preserved via login next= canonical.',
  }),
  Object.freeze({
    path: '/admin/lead-rescue',
    status: 'REDIRECTED',
    canonical_path: `${PROSPECT_WORKBENCH_PATH}?filter=lead_rescue`,
    reason:
      'Workbench product filter replaces the Lead Rescue-branded grid. Unique checklist and activity contracts moved onto /app/prospects/[id].',
  }),
  Object.freeze({
    path: '/admin/lead-rescue/[id]',
    status: 'REDIRECTED',
    canonical_path: '/app/prospects/[id]',
    reason:
      'Shared detail already held identity/commercial writes. Checklist + structured activity now reuse the same JSON merge helpers.',
  }),
  Object.freeze({
    path: '/change/revenue',
    status: 'RETIRED',
    canonical_path: PROSPECT_PIPELINE_PATH,
    reason:
      'localStorage Kanban removed so it cannot remain an alternate pipeline. Page is a retirement notice. Hard redirect is unsafe: this path is mixed/unauthenticated and must not send Tenant users into Core /app/pipeline.',
  }),
]);

/**
 * @param {string} path
 * @returns {(typeof LEGACY_ROUTE_WAVE1_STATUS)[number] | null}
 */
export function wave1StatusForLegacyPath(path) {
  const raw = String(path || '').split('?')[0].replace(/\/+$/, '') || '/';
  const exact = LEGACY_ROUTE_WAVE1_STATUS.find((row) => row.path === raw);
  if (exact) return exact;
  if (raw.startsWith('/admin/lead-rescue/')) {
    return LEGACY_ROUTE_WAVE1_STATUS.find((row) => row.path === '/admin/lead-rescue/[id]') || null;
  }
  return null;
}

/**
 * Admin-session redirect target. Hash fragments are not available server-side.
 *
 * @param {string} path
 * @param {{ id?: string | null }} [opts]
 * @returns {string}
 */
export function canonicalRedirectForLegacyAdminPath(path, opts = {}) {
  const raw = String(path || '').split('?')[0].replace(/\/+$/, '') || '/';
  if (raw === '/admin/rapid-delivery') return ACTION_QUEUE_PATH;
  if (raw === '/admin/lead-rescue') return `${PROSPECT_WORKBENCH_PATH}?filter=lead_rescue`;
  if (raw.startsWith('/admin/lead-rescue/')) {
    const id = String(opts.id || raw.slice('/admin/lead-rescue/'.length) || '').trim();
    if (id) return `${PROSPECT_SHARED_DETAIL_PREFIX}${encodeURIComponent(id)}`;
    return `${PROSPECT_WORKBENCH_PATH}?filter=lead_rescue`;
  }
  return ACTION_QUEUE_PATH;
}

/**
 * @returns {boolean}
 */
export function everyRequiredLegacyCapabilityHasCanonicalHome() {
  return LEGACY_ROUTE_CAPABILITY_MATRIX.every(
    (row) => row.parity === 'OBSOLETE' || Boolean(row.canonical_path),
  );
}

/**
 * @returns {boolean}
 */
export function noTemporaryLegacyRouteRemainsInWave1() {
  return LEGACY_ROUTE_WAVE1_STATUS.every((row) => row.status !== 'TEMPORARY');
}
