/**
 * In-memory synthetic request store for Slice 1.
 * No Postgres writes. Resettable for tests.
 */

import {
  OTHER_TENANT_ID,
  OTHER_TENANT_REQUEST_ID,
  REFERENCE_TENANT_ID,
  SYNTHETIC_REQUEST_ID,
} from './constants.js';

/**
 * @typedef {{
 *   key: string,
 *   title: string,
 *   milestone: string,
 *   exposed_for_client_review: boolean,
 *   client_safe_summary: string,
 *   client_safe_status: string,
 *   attention_required: boolean,
 *   internal_task_ref: string,
 *   internal_evidence_refs: string[],
 *   internal_note: string,
 *   github: { pr_number: number, commit_sha: string, ci: string } | null,
 *   reviews: Array<{
 *     decision: string,
 *     comment: string,
 *     decided_at: string,
 *     by_role: string,
 *   }>,
 * }} SynthComponent
 *
 * @typedef {{
 *   id: string,
 *   tenant_id: string,
 *   title: string,
 *   outcome: string,
 *   status: string,
 *   stage: string,
 *   client_safe_blocker: string | null,
 *   internal_blocker: string | null,
 *   attention_required: boolean,
 *   console_json: {
 *     client_view: {
 *       workflow_state: string,
 *       progress_message: string,
 *       components: SynthComponent[],
 *     },
 *     promotion: { pr_number: number, merged: boolean },
 *     technical_lead: { summary: string },
 *   },
 * }} SynthRequest
 */

/** @returns {SynthRequest[]} */
function buildSeedRequests() {
  return [
    {
      id: SYNTHETIC_REQUEST_ID,
      tenant_id: REFERENCE_TENANT_ID,
      title: 'Central app shell — Requests & Progress proof',
      outcome: 'Authorised users can see client-safe progress and review one exposed component.',
      status: 'Approved',
      stage: 'Build',
      client_safe_blocker: 'Waiting for your review of Landing copy.',
      internal_blocker: 'Blocked on client review of landing_copy before wiring merge.',
      attention_required: true,
      console_json: {
        client_view: {
          workflow_state: 'in_review',
          progress_message: 'One component is ready for your review.',
          components: [
            {
              key: 'landing_copy',
              title: 'Landing copy',
              milestone: 'ready_for_review',
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
                ci: 'Agent CI — green (synthetic)',
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
                ci: 'pending (synthetic)',
              },
              reviews: [],
            },
          ],
        },
        promotion: { pr_number: 778, merged: false },
        technical_lead: { summary: 'Synthetic TL note — Core only.' },
      },
    },
    {
      id: OTHER_TENANT_REQUEST_ID,
      tenant_id: OTHER_TENANT_ID,
      title: 'Other-tenant isolation foil (synthetic)',
      outcome: 'Must never appear under Tenant — CorpFlowAI.',
      status: 'Draft',
      stage: 'Intake',
      client_safe_blocker: null,
      internal_blocker: null,
      attention_required: false,
      console_json: {
        client_view: {
          workflow_state: 'intake',
          progress_message: 'Isolation foil.',
          components: [
            {
              key: 'foil_component',
              title: 'Foil component',
              milestone: 'planned',
              exposed_for_client_review: false,
              client_safe_summary: 'Should not be visible to corpflowai.',
              client_safe_status: 'Planned',
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

/** @type {SynthRequest[]} */
let requests = buildSeedRequests();

export function resetSyntheticStore() {
  requests = buildSeedRequests();
}

/** @returns {SynthRequest[]} */
export function listSyntheticRequests() {
  return requests.map((r) => structuredClone(r));
}

/**
 * @param {string} id
 * @returns {SynthRequest | null}
 */
export function getSyntheticRequest(id) {
  const found = requests.find((r) => r.id === String(id || '').trim());
  return found ? structuredClone(found) : null;
}

/**
 * Mutate a request in place via updater; returns cloned result or null.
 * @param {string} id
 * @param {(req: SynthRequest) => void} mutator
 * @returns {SynthRequest | null}
 */
export function updateSyntheticRequest(id, mutator) {
  const idx = requests.findIndex((r) => r.id === String(id || '').trim());
  if (idx < 0) return null;
  const working = structuredClone(requests[idx]);
  mutator(working);
  requests[idx] = working;
  return structuredClone(working);
}
