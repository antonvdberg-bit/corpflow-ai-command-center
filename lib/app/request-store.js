/**
 * Production-shaped request fixtures + in-memory repository.
 *
 * Shaped like cmp_tickets rows (id, tenant_id, status, stage, description,
 * updated_at, console_json) so the same normalizeCmpTicketRow adapter used
 * for live rows also powers Preview / local / tests — no parallel request DB.
 *
 * Mutations stay in-memory (Preview-safe). No production DB writes.
 */

import {
  CANONICAL_REQUEST_ID,
  OTHER_TENANT_ID,
  OTHER_TENANT_REQUEST_ID,
  REFERENCE_TENANT_ID,
  SECOND_REQUEST_ID,
} from './constants.js';
import { normalizeCmpTicketRow } from './request-normalize.js';

/**
 * @returns {Array<Record<string, unknown>>}
 */
function buildSeedTicketRows() {
  return [
    {
      id: CANONICAL_REQUEST_ID,
      tenant_id: REFERENCE_TENANT_ID,
      status: 'Approved',
      stage: 'Build',
      description: 'Central app shell — Requests & Progress foundation',
      updated_at: '2026-08-06T18:00:00.000Z',
      owner: 'core_operator',
      source: 'fixture',
      console_json: {
        owner: 'core_operator',
        brief: {
          requested_change:
            'Authorised users can see client-safe progress and review one exposed component.',
        },
        client_view: {
          workflow_state: 'in_review',
          progress_message: 'One component is ready for your review.',
          latest_client_safe_update: 'Landing copy opened for client review.',
          client_safe_blocker: 'Waiting for your review of Landing copy.',
          internal_blocker: 'Blocked on client review of landing_copy before wiring merge.',
          desired_outcome:
            'Authorised users can see client-safe progress and review one exposed component.',
          components: [
            {
              key: 'landing_copy',
              title: 'Landing copy',
              milestone: 'client_review',
              exposed_for_client_review: true,
              client_safe_summary: 'Headline and supporting sentence for the first viewport.',
              client_safe_status: 'Ready for your review',
              attention_required: true,
              internal_task_ref: 'task_syn_landing_copy_01',
              internal_evidence_refs: ['ev_syn_copy_diff_01', 'ev_syn_preview_shot_01'],
              internal_note: 'Operator note: keep CTA buyer-intent; do not expose PR links.',
              github: {
                pr_number: 778,
                commit_sha: 'deadbeefslice1001',
                ci: 'Agent CI — green (fixture)',
              },
              reviews: [],
            },
            {
              key: 'internal_wiring',
              title: 'Internal wiring',
              milestone: 'in_progress',
              exposed_for_client_review: false,
              client_safe_summary: 'Background setup work CorpFlowAI is completing for you.',
              client_safe_status: 'In progress',
              attention_required: false,
              internal_task_ref: 'task_syn_wiring_02',
              internal_evidence_refs: ['ev_syn_route_map_02'],
              internal_note: 'Do not expose GitHub/CI detail to tenant scope.',
              github: {
                pr_number: 774,
                commit_sha: 'cafef00dslice1002',
                ci: 'pending (fixture)',
              },
              reviews: [],
            },
          ],
          preview_review: null,
        },
        promotion: { pr_number: 778, merged: false, head_sha: 'deadbeefslice1001' },
        technical_lead: { summary: 'Fixture TL note — Core only.' },
      },
    },
    {
      id: SECOND_REQUEST_ID,
      tenant_id: REFERENCE_TENANT_ID,
      status: 'Draft',
      stage: 'Intake',
      description: 'Secondary CorpFlowAI request — filter / queue proof',
      updated_at: '2026-08-05T12:00:00.000Z',
      owner: 'core_operator',
      source: 'fixture',
      console_json: {
        owner: 'core_operator',
        brief: { requested_change: 'Demonstrate multi-request queue filtering.' },
        client_view: {
          workflow_state: 'intake',
          progress_message: 'Request defined; work not started.',
          latest_client_safe_update: 'Request captured.',
          client_safe_blocker: null,
          internal_blocker: null,
          desired_outcome: 'Demonstrate multi-request queue filtering.',
          components: [
            {
              key: 'intake_brief',
              title: 'Intake brief',
              milestone: 'defined',
              exposed_for_client_review: false,
              client_safe_summary: 'We captured what you asked for.',
              client_safe_status: 'Defined',
              attention_required: false,
              internal_task_ref: 'task_syn_intake_03',
              internal_evidence_refs: [],
              internal_note: 'Queue foil — same tenant.',
              github: null,
              reviews: [],
            },
          ],
        },
        promotion: { pr_number: 0, merged: false },
        technical_lead: { summary: 'Intake only.' },
      },
    },
    {
      id: OTHER_TENANT_REQUEST_ID,
      tenant_id: OTHER_TENANT_ID,
      status: 'Draft',
      stage: 'Intake',
      description: 'Other-tenant isolation foil (fixture)',
      updated_at: '2026-08-04T09:00:00.000Z',
      owner: null,
      source: 'fixture',
      console_json: {
        brief: { requested_change: 'Must never appear under Tenant — CorpFlowAI.' },
        client_view: {
          workflow_state: 'intake',
          progress_message: 'Isolation foil.',
          latest_client_safe_update: 'Isolation foil.',
          client_safe_blocker: null,
          internal_blocker: null,
          desired_outcome: 'Must never appear under Tenant — CorpFlowAI.',
          components: [
            {
              key: 'foil_component',
              title: 'Foil component',
              milestone: 'not_started',
              exposed_for_client_review: false,
              client_safe_summary: 'Should not be visible to corpflowai.',
              client_safe_status: 'Not started',
              attention_required: false,
              internal_task_ref: 'task_syn_foil_01',
              internal_evidence_refs: [],
              internal_note: 'Isolation foil.',
              github: null,
              reviews: [],
            },
          ],
        },
        promotion: { pr_number: 0, merged: false },
        technical_lead: { summary: 'Foil.' },
      },
    },
  ];
}

/** @type {Array<Record<string, unknown>>} */
let ticketRows = buildSeedTicketRows();

/**
 * Reset fixture repository (tests / proof server).
 */
export function resetRequestStore() {
  ticketRows = buildSeedTicketRows();
}

/** @deprecated Prefer resetRequestStore */
export function resetSyntheticStore() {
  resetRequestStore();
}

/**
 * @returns {import('./request-normalize.js').AppRequest[]}
 */
export function listAppRequests() {
  return ticketRows
    .map((row) => normalizeCmpTicketRow(row, { source: 'fixture' }))
    .filter(Boolean)
    .map((r) => structuredClone(/** @type {import('./request-normalize.js').AppRequest} */ (r)));
}

/** @deprecated Prefer listAppRequests */
export function listSyntheticRequests() {
  return listAppRequests();
}

/**
 * @param {string} id
 * @returns {import('./request-normalize.js').AppRequest | null}
 */
export function getAppRequest(id) {
  const found = ticketRows.find((r) => String(r.id || '').trim() === String(id || '').trim());
  if (!found) return null;
  const normalized = normalizeCmpTicketRow(found, { source: 'fixture' });
  return normalized ? structuredClone(normalized) : null;
}

/** @deprecated Prefer getAppRequest */
export function getSyntheticRequest(id) {
  return getAppRequest(id);
}

/**
 * Mutate underlying fixture row via AppRequest mutator; returns cloned AppRequest.
 * @param {string} id
 * @param {(req: import('./request-normalize.js').AppRequest) => void} mutator
 * @returns {import('./request-normalize.js').AppRequest | null}
 */
export function updateAppRequest(id, mutator) {
  const idx = ticketRows.findIndex((r) => String(r.id || '').trim() === String(id || '').trim());
  if (idx < 0) return null;
  const current = normalizeCmpTicketRow(ticketRows[idx], { source: 'fixture' });
  if (!current) return null;
  const working = structuredClone(current);
  mutator(working);
  // Write back production-shaped row (console_json only — no schema)
  ticketRows[idx] = {
    id: working.id,
    tenant_id: working.tenant_id,
    status: working.status,
    stage: working.stage,
    description: working.title,
    updated_at: working.updated_at || new Date().toISOString(),
    owner: working.owner,
    source: 'fixture',
    console_json: working.console_json,
    client_safe_blocker: working.client_safe_blocker,
    internal_blocker: working.internal_blocker,
    attention_required: working.attention_required,
  };
  const next = normalizeCmpTicketRow(ticketRows[idx], { source: 'fixture' });
  return next ? structuredClone(next) : null;
}

/** @deprecated Prefer updateAppRequest */
export function updateSyntheticRequest(id, mutator) {
  return updateAppRequest(id, mutator);
}

/**
 * List distinct tenant ids present in the store (Core filter options).
 * @returns {string[]}
 */
export function listRequestTenantIds() {
  const set = new Set();
  for (const row of ticketRows) {
    const tid = String(row.tenant_id || '').trim();
    if (tid) set.add(tid);
  }
  return [...set].sort();
}
