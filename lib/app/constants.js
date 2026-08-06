/**
 * Slice 1 (#778 / #773) — Core/Tenant shell constants.
 * Synthetic-only; no schema. CorpFlowAI is a normal reference tenant.
 */

export const APP_SLICE1_VERSION = 'slice1-v1';

/** Reference tenant used for Tenant — CorpFlowAI scope (normal rules, no bypass). */
export const REFERENCE_TENANT_ID = 'corpflowai';

/** Stable synthetic request id for Slice 1 proof. */
export const SYNTHETIC_REQUEST_ID = 'syn_slice1_req_corpflowai_001';

/** Isolation foil — another tenant's synthetic request (must never leak to corpflowai). */
export const OTHER_TENANT_ID = 'cursor-test';
export const OTHER_TENANT_REQUEST_ID = 'syn_slice1_req_other_001';

/** @typedef {'core'|'tenant'} AppScope */

/** @typedef {'planned'|'in_progress'|'ready_for_review'|'changes_requested'|'approved'|'complete'|'blocked'} ComponentMilestone */

/**
 * Deterministic milestone weights for progress roll-up.
 * Terminal milestones count as complete for overall %.
 */
export const MILESTONE_META = Object.freeze({
  planned: Object.freeze({ label: 'Planned', terminal: false, weight: 0 }),
  in_progress: Object.freeze({ label: 'In progress', terminal: false, weight: 0 }),
  ready_for_review: Object.freeze({ label: 'Ready for review', terminal: false, weight: 0 }),
  changes_requested: Object.freeze({ label: 'Changes requested', terminal: false, weight: 0 }),
  approved: Object.freeze({ label: 'Approved', terminal: true, weight: 1 }),
  complete: Object.freeze({ label: 'Complete', terminal: true, weight: 1 }),
  blocked: Object.freeze({ label: 'Blocked', terminal: false, weight: 0 }),
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
  'reality_panel',
  'technical_lead',
  'promotion',
  'itinerary',
  'console_json',
  'dispatch_ok',
  'sandbox',
]);

export const REVIEW_DECISIONS = Object.freeze(['approve', 'amend', 'reject']);
