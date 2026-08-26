/**
 * #778 / #773 / #877 — Core/Tenant app constants.
 * Production-shaped request contracts; no schema. CorpFlowAI is a normal reference tenant.
 */

export const APP_SLICE1_VERSION = 'slice1-v2';

/** Slice 2 — authenticated live request workspace (#877). */
export const APP_SLICE2_VERSION = 'slice2-v1';

/** Slice 3 — governed client review expose / comment / approve (#883). */
export const APP_SLICE3_VERSION = 'slice3-v1';

/** #772 / #1006 / #1005 / #1119 — Operating / Tenant Workspace chrome + Prospect Operations + Today / My Work + shared detail + workbench + Pipeline + Action Queue + Clients + Tenant simplification + Delivery. */
export const APP_WORKSPACE_SLICE_VERSION = 'workspace-1119-v1';

/** #1073 — Tenant request / review / /change continuity. */
export const APP_TENANT_JOURNEY_VERSION = 'tenant-journey-1073-v1';

/** Reference tenant used for Tenant — CorpFlowAI (normal rules, no bypass). */
export const REFERENCE_TENANT_ID = 'corpflowai';

/**
 * Canonical request id shared by Core and Tenant projections.
 * Stable fixture id shaped like a cmp_tickets primary key string.
 */
export const CANONICAL_REQUEST_ID = 'syn_slice1_req_corpflowai_001';

/** @deprecated Prefer CANONICAL_REQUEST_ID — kept for call-site compatibility. */
export const SYNTHETIC_REQUEST_ID = CANONICAL_REQUEST_ID;

/** Isolation foil — another tenant's request (must never leak to corpflowai). */
export const OTHER_TENANT_ID = 'cursor-test';
export const OTHER_TENANT_REQUEST_ID = 'syn_slice1_req_other_001';

/** Secondary CorpFlowAI request for queue/filter proof (same tenant). */
export const SECOND_REQUEST_ID = 'syn_slice1_req_corpflowai_002';

/** @typedef {'core'|'tenant'} AppScope */

/**
 * Deterministic component / delivery milestones.
 * Required set: not_started, defined, in_progress, preview_ready, client_review, approved, live_verified.
 * Aliases (planned, ready_for_review, complete, …) normalize into this set.
 *
 * @typedef {'not_started'|'defined'|'in_progress'|'preview_ready'|'client_review'|'changes_requested'|'approved'|'live_verified'|'blocked'} ComponentMilestone
 */

/**
 * Deterministic milestone meta for progress roll-up.
 * weight ∈ [0..6]; percent = round(100 * mean(weight) / 6).
 * Terminal milestones count as complete for complete_count.
 */
export const MILESTONE_META = Object.freeze({
  not_started: Object.freeze({ label: 'Not started', terminal: false, weight: 0 }),
  defined: Object.freeze({ label: 'Defined', terminal: false, weight: 1 }),
  in_progress: Object.freeze({ label: 'In progress', terminal: false, weight: 2 }),
  preview_ready: Object.freeze({ label: 'Preview ready', terminal: false, weight: 3 }),
  client_review: Object.freeze({ label: 'Client review', terminal: false, weight: 4 }),
  changes_requested: Object.freeze({ label: 'Changes requested', terminal: false, weight: 2 }),
  approved: Object.freeze({ label: 'Approved', terminal: true, weight: 5 }),
  live_verified: Object.freeze({ label: 'Live verified', terminal: true, weight: 6 }),
  blocked: Object.freeze({ label: 'Blocked', terminal: false, weight: 1 }),
  // Aliases kept for older fixtures / call sites (same weight as canonical).
  planned: Object.freeze({ label: 'Not started', terminal: false, weight: 0, alias_of: 'not_started' }),
  ready_for_review: Object.freeze({
    label: 'Client review',
    terminal: false,
    weight: 4,
    alias_of: 'client_review',
  }),
  complete: Object.freeze({ label: 'Live verified', terminal: true, weight: 6, alias_of: 'live_verified' }),
});

/** Alias → canonical milestone */
export const MILESTONE_ALIASES = Object.freeze({
  planned: 'not_started',
  ready_for_review: 'client_review',
  complete: 'live_verified',
});

/** Fields / substrings that must never appear in Tenant projections. */
export const TENANT_FORBIDDEN_FIELD_KEYS = Object.freeze([
  'github',
  'pr_number',
  'pr_url',
  'commit',
  'commit_sha',
  'ci',
  'check_runs',
  'agent',
  'agent_id',
  'internal_note',
  'internal_notes',
  'internal_evidence',
  'internal_blocker',
  'internal_task_ref',
  'internal_evidence_refs',
  'internal_refs',
  'reality_panel',
  'technical_lead',
  'promotion',
  'itinerary',
  'console_json',
  'dispatch_ok',
  'sandbox',
  'branch_name',
  'github_repo',
]);

export const REVIEW_DECISIONS = Object.freeze(['approve', 'amend', 'reject']);

/** Core navigation — may link to existing management surfaces. */
export const CORE_NAV_ITEMS = Object.freeze([
  Object.freeze({ id: 'my_work', label: 'My Work', href: '/app/today' }),
  Object.freeze({ id: 'queue', label: 'Action Queue', href: '/app/queue' }),
  Object.freeze({ id: 'tenants', label: 'Tenants', href: null }),
  Object.freeze({ id: 'requests', label: 'Requests', href: null }),
  Object.freeze({ id: 'prospects', label: 'Prospects', href: '/app/prospects' }),
  Object.freeze({ id: 'clients', label: 'Clients', href: '/app/clients' }),
  Object.freeze({ id: 'workbench', label: 'Workbench', href: '/app/workbench' }),
  Object.freeze({ id: 'pipeline', label: 'Pipeline', href: '/app/pipeline' }),
  Object.freeze({ id: 'delivery', label: 'Delivery', href: '/app/delivery' }),
  Object.freeze({ id: 'approvals', label: 'Approvals', href: null }),
  Object.freeze({ id: 'releases', label: 'Releases', href: null }),
  Object.freeze({ id: 'operations', label: 'Operations', href: '/change' }),
]);

/**
 * Tenant navigation (#1073 continuity).
 * Requests & Progress stays in the Tenant Workspace shell.
 * Service & change is a deliberate handoff to canonical `/change` (no second request model).
 */
export const TENANT_NAV_ITEMS = Object.freeze([
  Object.freeze({ id: 'requests_progress', label: 'Requests & Progress', href: '/app/tenant' }),
  Object.freeze({
    id: 'service_change',
    label: 'Service & change',
    href: '/change?from=tenant-workspace',
  }),
]);

/** Compatibility routes that remain operational (not deleted / not production-redirected). */
export const COMPATIBILITY_ROUTES = Object.freeze([
  Object.freeze({
    path: '/change',
    role: 'canonical_tenant_service_change',
    note: 'Canonical tenant service/change surface. Reached from Tenant Workspace; not expanded into /app shell. Navigation does not create a ticket.',
  }),
  Object.freeze({
    path: '/change-v2',
    role: 'experimental',
    note: 'Experimental; not promoted.',
  }),
]);
