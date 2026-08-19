/**
 * #772 / #721 — Operating Workspace Prospect Operations list.
 *
 * Projects existing `leads` rows through the shared view-model.
 * No schema. No external send. Staff / Core environment only.
 */

import { AI_LEAD_RESCUE_PRODUCT, parseIntakeMeta } from '../cmp/_lib/ai-lead-rescue-operator.js';
import { RAPID_DELIVERY_PRODUCT } from '../cmp/_lib/rapid-delivery-operator.js';
import {
  ACTION_QUEUE_FILTERS,
  detectProspectProduct,
  leadRowToProspectDetailViewModel,
  matchesActionQueueFilter,
  matchesMyWorkTodayFilter,
  normalizeActionQueueFilter,
  sortProspectsForActionQueue,
} from '../cmp/_lib/prospect-operations-view-model.js';
import {
  ACTION_QUEUE_PATH,
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

/** @type {Map<string, Record<string, unknown>> | null} */
let prospectFixtureStore = null;

/**
 * Clone a synthetic Lead row so fixture patches do not mutate the factory template.
 * @param {Record<string, unknown>} row
 * @returns {Record<string, unknown>}
 */
export function cloneProspectLeadRow(row) {
  const qj = row?.qualificationJson;
  return {
    ...row,
    createdAt:
      row.createdAt instanceof Date ? new Date(row.createdAt.getTime()) : row.createdAt,
    updatedAt:
      row.updatedAt instanceof Date ? new Date(row.updatedAt.getTime()) : row.updatedAt,
    qualificationJson:
      qj && typeof qj === 'object' ? JSON.parse(JSON.stringify(qj)) : qj ?? null,
  };
}

export function resetProspectFixtureStore() {
  prospectFixtureStore = null;
}

/**
 * @returns {Map<string, Record<string, unknown>>}
 */
function ensureProspectFixtureStore() {
  if (!prospectFixtureStore) {
    prospectFixtureStore = new Map();
  }
  for (const row of fixtureProspectLeadRows()) {
    if (!prospectFixtureStore.has(String(row.id))) {
      prospectFixtureStore.set(String(row.id), cloneProspectLeadRow(row));
    }
  }
  return prospectFixtureStore;
}

/**
 * Mutable fixture rows for proof / test / no-DB. Patches persist in-process.
 * @returns {Array<Record<string, unknown>>}
 */
export function getProspectFixtureRows() {
  return [...ensureProspectFixtureStore().values()];
}

/**
 * @param {string} id
 * @returns {Record<string, unknown> | null}
 */
export function getProspectFixtureById(id) {
  const key = String(id || '').trim();
  if (!key) return null;
  return ensureProspectFixtureStore().get(key) || null;
}

/**
 * @param {Record<string, unknown>} row
 */
export function upsertProspectFixtureRow(row) {
  const id = String(row?.id || '').trim();
  if (!id) return;
  ensureProspectFixtureStore().set(id, cloneProspectLeadRow(row));
}

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
  'shared_detail_path',
]);

const PUBLIC_PROSPECT_DETAIL_KEYS = Object.freeze([
  ...PUBLIC_PROSPECT_KEYS,
  'email',
  'phone',
  'qualification_summary',
  'notes',
  'current_blocker',
  'recommended_next_action',
  'history',
  'allowed_native_statuses',
  'allowed_canonical_stages',
  'safe_interventions',
  'protected_actions',
  'product_detail_path',
  'external_send',
]);

/**
 * Synthetic rows for proof / test / no-DB. Same shape as Prisma `Lead`.
 * @param {Date} [now]
 * @returns {Array<Record<string, unknown>>}
 */
export function fixtureProspectLeadRows(now = new Date()) {
  const dueToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 15, 0, 0),
  ).toISOString();
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
      createdAt: now,
      updatedAt: now,
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
              at: now.toISOString(),
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
    {
      id: 'syn-995-lr-due',
      tenantId: 'corpflowai',
      name: 'Due Dana',
      email: 'dana@example.com',
      phone: '+2305444444',
      status: 'QUALIFYING',
      createdAt: new Date('2026-08-04T08:00:00.000Z'),
      updatedAt: new Date('2026-08-04T08:00:00.000Z'),
      qualificationJson: {
        intake_meta: {
          product: AI_LEAD_RESCUE_PRODUCT,
          business_name: 'Dana Day Spa',
          region_path: 'mauritius',
          page: '/lead-rescue',
          host: 'corpflowai.com',
        },
        ai_lead_rescue_operator: {
          status: 'QUALIFYING',
          owner: 'anton',
          next_action: 'Call Dana today',
          next_action_due: dueToday,
          notes: 'Due today',
          activity: [
            {
              at: '2026-08-04T08:00:00.000Z',
              actor_label: 'anton',
              channel: 'internal',
              type: 'note',
              note: 'Queued for today',
              next_action: 'Call Dana today',
              next_action_date: dueToday,
              status_after: 'QUALIFYING',
            },
          ],
        },
      },
    },
    {
      id: 'syn-995-lr-op',
      tenantId: 'corpflowai',
      name: 'Op Owen',
      email: 'owen@example.com',
      phone: '+2305555555',
      status: 'QUALIFYING',
      createdAt: new Date('2026-08-04T09:00:00.000Z'),
      updatedAt: new Date('2026-08-04T09:00:00.000Z'),
      qualificationJson: {
        intake_meta: {
          product: AI_LEAD_RESCUE_PRODUCT,
          business_name: 'Owen Office',
          region_path: 'mauritius',
          page: '/lead-rescue',
          host: 'corpflowai.com',
        },
        ai_lead_rescue_operator: {
          status: 'QUALIFYING',
          owner: 'anton',
          next_action: 'Draft discovery notes',
          next_action_due: '2027-02-01T00:00:00.000Z',
          waiting_on: 'operator',
          notes: 'Waiting on CorpFlowAI',
          activity: [],
        },
      },
    },
    {
      id: 'syn-995-lr-prot',
      tenantId: 'corpflowai',
      name: 'Pat Protected',
      email: 'pat@example.com',
      phone: '+2305666666',
      status: 'QUOTE_SENT',
      createdAt: new Date('2026-08-04T10:00:00.000Z'),
      updatedAt: new Date('2026-08-04T10:00:00.000Z'),
      qualificationJson: {
        intake_meta: {
          product: AI_LEAD_RESCUE_PRODUCT,
          business_name: 'Pat Partners',
          region_path: 'mauritius',
          page: '/lead-rescue',
          host: 'corpflowai.com',
        },
        ai_lead_rescue_operator: {
          status: 'QUOTE_SENT',
          owner: 'anton',
          next_action: 'Hold for Anton commercial approval',
          next_action_due: '2027-02-02T00:00:00.000Z',
          waiting_on: 'protected',
          notes: 'Awaiting protected approval',
          activity: [],
        },
      },
    },
    {
      id: 'syn-995-gen-dee',
      tenantId: 'corpflowai',
      name: 'Dee General',
      email: 'dee@example.com',
      phone: '+2305777777',
      status: 'NEW',
      createdAt: new Date('2026-08-04T11:00:00.000Z'),
      updatedAt: new Date('2026-08-04T11:00:00.000Z'),
      qualificationJson: {
        intake_meta: {
          business_name: 'Dee Design',
          source: 'corpflow-market-gateway',
          page: '/contact',
          host: 'corpflowai.com',
          urgency: 'this_week',
          consent_contact: true,
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
 * Staff-only detail projection. Omits qualificationJson. Includes contact identity.
 *
 * @param {Record<string, unknown>} vm
 * @returns {Record<string, unknown>}
 */
export function publicProspectDetailItem(vm) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const key of PUBLIC_PROSPECT_DETAIL_KEYS) {
    if (Object.prototype.hasOwnProperty.call(vm, key)) out[key] = vm[key];
  }
  return out;
}

/**
 * @param {unknown} row
 * @param {Date} [now]
 * @returns {Record<string, unknown> | null}
 */
export function projectProspectDetail(row, now = new Date()) {
  if (!isKnownProspectLeadRow(row)) return null;
  return publicProspectDetailItem(
    leadRowToProspectDetailViewModel(/** @type {Record<string, unknown>} */ (row), now),
  );
}

/**
 * @param {unknown} row
 * @returns {boolean}
 */
export function isGeneralMarketEnquiryLeadRow(row) {
  const qj =
    row && typeof row === 'object'
      ? /** @type {Record<string, unknown>} */ (row).qualificationJson
      : null;
  const product = detectProspectProduct(qj);
  if (product !== 'unknown') return false;
  const meta = parseIntakeMeta(qj);
  return meta.source === 'corpflow-market-gateway' || meta.page === '/contact';
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
  if (product === AI_LEAD_RESCUE_PRODUCT || product === RAPID_DELIVERY_PRODUCT) return true;
  return isGeneralMarketEnquiryLeadRow(row);
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
    projected.push(publicProspectListItem(leadRowToProspectDetailViewModel(row, now)));
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
 * Canonical Action Queue filter over the shared prospect list.
 *
 * @param {Array<Record<string, unknown>>} rows
 * @param {string} [filter]
 * @param {Date} [now]
 * @returns {Array<Record<string, unknown>>}
 */
export function filterProspectsForActionQueue(rows, filter = 'needs_action', now = new Date()) {
  const list = Array.isArray(rows) ? rows : [];
  const id = normalizeActionQueueFilter(filter);
  return sortProspectsForActionQueue(
    list.filter((row) => matchesActionQueueFilter(row, id, now)),
    now,
  );
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {Date} [now]
 * @returns {Record<string, number>}
 */
export function countActionQueueFilters(rows, now = new Date()) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const id of ACTION_QUEUE_FILTERS) {
    counts[id] = filterProspectsForActionQueue(rows, id, now).length;
  }
  return counts;
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
      action_queue: ACTION_QUEUE_PATH,
      workbench: '/admin/lead-rescue',
      kanban: PROSPECT_OPERATIONS_PATH,
      rapid_delivery_desk: '/admin/rapid-delivery',
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
      action_queue: ACTION_QUEUE_PATH,
      workbench: '/admin/lead-rescue',
      kanban: PROSPECT_OPERATIONS_PATH,
      prospect_operations: PROSPECT_OPERATIONS_PATH,
      rapid_delivery_desk: '/admin/rapid-delivery',
    },
    external_send: false,
  };
}

/**
 * @param {{
 *   prospect: Record<string, unknown>,
 *   data_source: string,
 *   proof_mode?: boolean,
 * }} args
 */
export function buildProspectDetailPayload(args) {
  const prospect = args.prospect && typeof args.prospect === 'object' ? args.prospect : {};
  return {
    ok: true,
    workspace: 'operating',
    path: String(prospect.shared_detail_path || PROSPECT_OPERATIONS_PATH),
    view: 'shared_detail',
    data_source: args.data_source,
    proof_mode: args.proof_mode === true,
    prospect,
    temporary_source_surfaces: {
      action_queue: ACTION_QUEUE_PATH,
      workbench: '/admin/lead-rescue',
      kanban: '/change/revenue',
      product_detail: prospect.product_detail_path || prospect.detail_path || null,
      rapid_delivery_desk: '/admin/rapid-delivery',
    },
    mutations_enabled: true,
    external_send: false,
    email_sent: false,
    whatsapp_sent: false,
    sms_sent: false,
    payment_processed: false,
  };
}

/**
 * @param {{
 *   prospects: Array<Record<string, unknown>>,
 *   data_source: string,
 *   proof_mode?: boolean,
 *   filter?: string,
 *   filter_counts?: Record<string, number>,
 * }} args
 */
export function buildActionQueuePayload(args) {
  const prospects = Array.isArray(args.prospects) ? args.prospects : [];
  const filter = normalizeActionQueueFilter(args.filter);
  return {
    ok: true,
    workspace: 'operating',
    path: ACTION_QUEUE_PATH,
    view: 'action_queue',
    filter,
    filters: [...ACTION_QUEUE_FILTERS],
    filter_counts: args.filter_counts && typeof args.filter_counts === 'object' ? args.filter_counts : {},
    data_source: args.data_source,
    proof_mode: args.proof_mode === true,
    count: prospects.length,
    prospects,
    canonical_operator_surface: ACTION_QUEUE_PATH,
    shared_detail_surface: '/app/prospects/[id]',
    temporary_source_surfaces: {
      action_queue: ACTION_QUEUE_PATH,
      workbench: '/admin/lead-rescue',
      kanban: PROSPECT_OPERATIONS_PATH,
      prospect_operations: PROSPECT_OPERATIONS_PATH,
      rapid_delivery_desk: '/admin/rapid-delivery',
    },
    mutations_enabled: true,
    external_send: false,
    email_sent: false,
    whatsapp_sent: false,
    sms_sent: false,
    payment_processed: false,
  };
}
