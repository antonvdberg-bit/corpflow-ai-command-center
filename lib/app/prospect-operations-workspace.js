/**
 * #772 / #721 — Operating Workspace Prospect Operations list.
 *
 * Projects existing `leads` rows through the shared view-model.
 * No schema. No external send. Staff / Core environment only.
 */

import { AI_LEAD_RESCUE_PRODUCT } from '../cmp/_lib/ai-lead-rescue-operator.js';
import { RAPID_DELIVERY_PRODUCT } from '../cmp/_lib/rapid-delivery-operator.js';
import {
  detectProspectProduct,
  leadRowToProspectViewModel,
  matchesMyWorkTodayFilter,
  sortProspectsForActionQueue,
} from '../cmp/_lib/prospect-operations-view-model.js';
import {
  canAccessOperatingWorkspace,
  PROSPECT_OPERATIONS_PATH,
  TODAY_MY_WORK_PATH,
} from './workspace-context.js';

export const DATA_SOURCE_FIXTURE = 'fixture';
export const DATA_SOURCE_LEADS_READ = 'leads_read';

/**
 * @param {{
 *   proofMode?: boolean,
 *   forceFixture?: boolean,
 *   nodeEnv?: string,
 *   postgresUrl?: string,
 * }} [opts]
 * @returns {'fixture'|'leads_read'}
 */
export function resolveProspectOperationsDataSource(opts = {}) {
  if (opts.forceFixture === true) return DATA_SOURCE_FIXTURE;
  const nodeEnv = String(opts.nodeEnv ?? process.env.NODE_ENV ?? '').trim();
  if (nodeEnv === 'test') return DATA_SOURCE_FIXTURE;
  if (opts.proofMode === true) return DATA_SOURCE_FIXTURE;
  const url = String(opts.postgresUrl ?? '').trim();
  if (!url) return DATA_SOURCE_FIXTURE;
  return DATA_SOURCE_LEADS_READ;
}

export const PROSPECT_LIST_TAKE = 200;

const PUBLIC_PROSPECT_KEYS = Object.freeze([
  'id',
  'reference',
  'tenant_id',
  'product',
  'person_name',
  'organisation_name',
  'email',
  'phone',
  'website',
  'source',
  'product_service_path',
  'offer_slug',
  'offer_title',
  'problem_summary',
  'enquiry_channels',
  'notes',
  'recommended_next_action',
  'response_draft',
  'consent_contact',
  'owner',
  'native_status',
  'native_status_label',
  'canonical_stage',
  'priority',
  'urgency',
  'next_action',
  'next_action_due',
  'last_meaningful_activity_at',
  'qualification_complete',
  'estimated_value',
  'currency',
  'waiting_on',
  'created_at',
  'updated_at',
  'detail_path',
  'activity_count',
  'exception_signals',
  'source_surfaces',
]);

/**
 * Synthetic rows for proof / test / no-DB. Same shape as Prisma `Lead`.
 * @returns {Array<Record<string, unknown>>}
 */
export function fixtureProspectLeadRows() {
  return [
    {
      id: 'syn-772-lr-ada',
      tenantId: 'corpflowai',
      name: 'Ada Prospect',
      email: 'ada@example.com',
      phone: '+2305000000',
      status: 'QUALIFYING',
      createdAt: new Date('2026-08-01T10:00:00.000Z'),
      updatedAt: new Date('2026-08-02T10:00:00.000Z'),
      qualificationJson: {
        intake_meta: {
          product: AI_LEAD_RESCUE_PRODUCT,
          business_name: 'Ada Spa',
          region_path: 'mauritius',
          lead_sources: 'whatsapp',
          page: '/lead-rescue',
          host: 'corpflowai.com',
        },
        ai_lead_rescue_operator: {
          status: 'QUALIFYING',
          owner: 'anton',
          next_action: 'Book discovery',
          notes: 'Warm intro',
          activity: [
            {
              at: '2026-08-02T09:00:00.000Z',
              actor_label: 'anton',
              channel: 'whatsapp',
              type: 'outbound_opener',
              note: 'Opened',
              next_action: 'Book discovery',
              next_action_date: '2026-08-01T00:00:00.000Z',
              status_after: 'QUALIFYING',
            },
          ],
        },
      },
    },
    {
      id: 'syn-772-rd-bea',
      tenantId: 'corpflowai',
      name: 'Bea Buyer',
      email: 'bea@example.com',
      phone: '+2305111111',
      status: 'NEW',
      createdAt: new Date('2026-08-03T08:00:00.000Z'),
      updatedAt: new Date('2026-08-03T08:00:00.000Z'),
      qualificationJson: {
        intake_meta: {
          product: RAPID_DELIVERY_PRODUCT,
          business_name: 'Bea Boutique',
          offer_slug: 'premium-landing-page-rescue',
          service_path: 'website-digital',
          primary_pain: 'Weak enquiry path on the existing site',
          website: 'https://example.com',
          urgency: 'asap',
          consent_contact: true,
          host: 'corpflowai.com',
          page: '/offers/premium-landing-page-rescue',
          source: 'corpflow-market-gateway',
        },
        rapid_delivery_operator: {
          status: 'new_intake',
          notes: 'Review Website Rescue fit today',
          activity: [],
          updated_at: '2026-08-03T08:00:00.000Z',
        },
      },
    },
    {
      id: 'syn-772-lr-cal',
      tenantId: 'corpflowai',
      name: 'Cal Scheduled',
      email: 'cal@example.com',
      phone: '+2305222222',
      status: 'QUALIFYING',
      createdAt: new Date('2026-08-03T09:00:00.000Z'),
      updatedAt: new Date('2026-08-03T09:00:00.000Z'),
      qualificationJson: {
        intake_meta: {
          product: AI_LEAD_RESCUE_PRODUCT,
          business_name: 'Cal Clinic',
          region_path: 'mauritius',
          lead_sources: 'website',
          page: '/lead-rescue',
          host: 'corpflowai.com',
        },
        ai_lead_rescue_operator: {
          status: 'QUALIFYING',
          owner: 'anton',
          next_action: 'Review Thursday',
          next_action_due: '2027-01-15T00:00:00.000Z',
          waiting_on: 'prospect',
          notes: 'Scheduled follow-up — not today',
          activity: [
            {
              at: '2026-08-03T09:00:00.000Z',
              actor_label: 'anton',
              channel: 'whatsapp',
              type: 'outbound_opener',
              note: 'Booked follow-up',
              next_action: 'Review Thursday',
              next_action_date: '2027-01-15T00:00:00.000Z',
              status_after: 'QUALIFYING',
            },
          ],
        },
      },
    },
  ];
}

/**
 * Staff Operating Workspace projection.
 * Includes contact and #699 enquiry-handoff fields; still omits raw qualificationJson.
 *
 * @param {Record<string, unknown>} vm
 * @returns {Record<string, unknown>}
 */
export function publicProspectListItem(vm) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const key of PUBLIC_PROSPECT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(vm, key)) out[key] = vm[key];
  }
  return out;
}

/**
 * @param {unknown} row
 * @returns {boolean}
 */
export function isKnownProspectLeadRow(row) {
  const qj =
    row && typeof row === 'object'
      ? /** @type {Record<string, unknown>} */ (row).qualificationJson
      : null;
  const product = detectProspectProduct(qj);
  return product === AI_LEAD_RESCUE_PRODUCT || product === RAPID_DELIVERY_PRODUCT;
}

/**
 * @param {unknown[]} rows
 * @param {Date} [now]
 * @returns {Array<Record<string, unknown>>}
 */
export function projectProspectLeadRows(rows, now = new Date()) {
  const list = Array.isArray(rows) ? rows : [];
  const projected = [];
  for (const row of list) {
    if (!isKnownProspectLeadRow(row)) continue;
    projected.push(publicProspectListItem(leadRowToProspectViewModel(row, now)));
  }
  return sortProspectsForActionQueue(projected, now);
}

/**
 * Today / My Work: overdue, due today, no next action, awaiting operator.
 *
 * @param {Array<Record<string, unknown>>} rows
 * @param {Date} [now]
 * @returns {Array<Record<string, unknown>>}
 */
export function filterProspectsForMyWorkToday(rows, now = new Date()) {
  const list = Array.isArray(rows) ? rows : [];
  return sortProspectsForActionQueue(
    list.filter((row) => matchesMyWorkTodayFilter(row, now)),
    now,
  );
}

/**
 * @param {import('./access.js').AppActor | null | undefined} actor
 * @returns {{ ok: true } | { ok: false, error: string, http_status: number }}
 */
export function assertProspectOperationsAccess(actor) {
  if (!actor) {
    return { ok: false, error: 'authentication_required', http_status: 401 };
  }
  if (!canAccessOperatingWorkspace(actor)) {
    return { ok: false, error: 'core_access_denied', http_status: 403 };
  }
  return { ok: true };
}

/**
 * @param {{
 *   prospects: Array<Record<string, unknown>>,
 *   data_source: string,
 *   proof_mode?: boolean,
 * }} args
 */
export function buildProspectOperationsPayload(args) {
  const prospects = Array.isArray(args.prospects) ? args.prospects : [];
  return {
    ok: true,
    workspace: 'operating',
    path: PROSPECT_OPERATIONS_PATH,
    data_source: args.data_source,
    proof_mode: args.proof_mode === true,
    count: prospects.length,
    prospects,
    canonical_operator_surface: PROSPECT_OPERATIONS_PATH,
    temporary_source_surfaces: {
      action_queue: '/admin/rapid-delivery',
      workbench: '/admin/lead-rescue',
      kanban: PROSPECT_OPERATIONS_PATH,
    },
    external_send: false,
  };
}

/**
 * @param {{
 *   prospects: Array<Record<string, unknown>>,
 *   data_source: string,
 *   proof_mode?: boolean,
 * }} args
 */
export function buildTodayMyWorkPayload(args) {
  const prospects = Array.isArray(args.prospects) ? args.prospects : [];
  return {
    ok: true,
    workspace: 'operating',
    path: TODAY_MY_WORK_PATH,
    view: 'today',
    filter: 'matchesMyWorkTodayFilter',
    data_source: args.data_source,
    proof_mode: args.proof_mode === true,
    count: prospects.length,
    prospects,
    temporary_source_surfaces: {
      action_queue: '/admin/rapid-delivery',
      workbench: '/admin/lead-rescue',
      kanban: PROSPECT_OPERATIONS_PATH,
      prospect_operations: PROSPECT_OPERATIONS_PATH,
    },
    external_send: false,
  };
}
