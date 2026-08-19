/**
 * Prospect Operations — shared view model (#721).
 *
 * Pure adapters over existing `leads` + `qualificationJson` product namespaces.
 * No Prisma schema changes. No external send. No new CRM store.
 *
 * Product-native statuses remain authoritative for persistence.
 * Canonical stages are a presentation/intervention layer for Action Queue,
 * Prospect Workbench, and Pipeline Kanban.
 */

import {
  AI_LEAD_RESCUE_PRODUCT,
  AI_LEAD_RESCUE_STATUSES,
  leadRowToAiLeadRescueDetail,
  leadRowToAiLeadRescueListItem,
  parseAiLeadRescueActivity,
  parseAiLeadRescueOperator,
  parseIntakeMeta,
} from './ai-lead-rescue-operator.js';
import {
  RAPID_DELIVERY_OPERATOR_STATUSES,
  RAPID_DELIVERY_PRODUCT,
  leadRowToRapidDeliveryListItem,
  normalizeRapidDeliveryStatus,
} from './rapid-delivery-operator.js';
import { buildMarketEnquiryResponseDraft } from '../../public/corpflow-market-service-paths.js';

/** Canonical staff surface for CorpFlowAI prospect / market enquiries (#699 / #772). */
export const OPERATING_PROSPECTS_PATH = '/app/prospects';

/** @typedef {'ai-lead-rescue' | 'corpflow-rapid-delivery' | 'unknown'} ProspectProduct */

/**
 * Canonical pipeline stages shared across views.
 * Product-native statuses map into these; persistence stays product-native.
 *
 * @type {readonly string[]}
 */
export const PROSPECT_CANONICAL_STAGES = Object.freeze([
  'new',
  'qualifying',
  'discovery_booked',
  'proposal_ready',
  'proposal_sent',
  'awaiting_payment',
  'won',
  'delivery',
  'stalled',
  'lost',
  'not_fit',
]);

/**
 * Closure outcomes that require an explicit reason in later slices.
 * @type {readonly string[]}
 */
export const PROSPECT_CLOSURE_OUTCOMES = Object.freeze([
  'won',
  'lost',
  'not_fit',
  'stalled',
  'reactivation_due',
]);

/**
 * Shared exception / action signal vocabulary (#721 §3).
 * @type {readonly string[]}
 */
export const PROSPECT_EXCEPTION_SIGNALS = Object.freeze([
  'overdue_action',
  'due_today',
  'future_action_scheduled',
  'no_next_action',
  'new_unreviewed',
  'high_urgency',
  'stalled_no_activity',
  'missing_qualification',
  'awaiting_prospect',
  'awaiting_operator',
  'awaiting_protected_approval',
]);

/** Default stale threshold when last meaningful activity is older (days). */
export const PROSPECT_STALE_DAYS_DEFAULT = 7;

/**
 * Shared operator-surface pointers. Pipeline work lives in Operating Workspace.
 * Product desks remain temporary until later migration slices.
 *
 * @param {{ product?: string, id?: string | null }} args
 * @returns {Record<string, string>}
 */
export function prospectSourceSurfaces(args = {}) {
  const product = String(args.product || '');
  const id = String(args.id || '').trim();
  const productDetail =
    product === AI_LEAD_RESCUE_PRODUCT && id
      ? `/admin/lead-rescue/${id}`
      : product === RAPID_DELIVERY_PRODUCT && id
        ? `/admin/rapid-delivery#${id}`
        : '/admin/rapid-delivery';
  return {
    operating_workspace: OPERATING_PROSPECTS_PATH,
    action_queue: '/admin/rapid-delivery',
    workbench: '/admin/lead-rescue',
    kanban: OPERATING_PROSPECTS_PATH,
    product_detail: productDetail,
  };
}

/** Sort rank: lower = higher queue priority. */
const SIGNAL_SORT_RANK = Object.freeze({
  overdue_action: 0,
  due_today: 1,
  no_next_action: 2,
  high_urgency: 3,
  stalled_no_activity: 4,
  new_unreviewed: 5,
  missing_qualification: 6,
  awaiting_protected_approval: 7,
  awaiting_operator: 8,
  awaiting_prospect: 9,
  future_action_scheduled: 10,
});

const LR_STATUS_TO_CANONICAL = Object.freeze({
  NEW_INTAKE: 'new',
  QUALIFYING: 'qualifying',
  DEMO_OFFERED: 'qualifying',
  DEMO_BOOKED: 'discovery_booked',
  QUOTE_SENT: 'proposal_sent',
  PAYMENT_PENDING: 'awaiting_payment',
  PAID_SETUP: 'won',
  SETUP_IN_PROGRESS: 'delivery',
  LIVE_PILOT: 'delivery',
  MONITORING_OFFERED: 'delivery',
  MONTHLY_ACTIVE: 'delivery',
  LOST: 'lost',
  PAUSED: 'stalled',
});

const RD_STATUS_TO_CANONICAL = Object.freeze({
  new_intake: 'new',
  reviewing: 'qualifying',
  discovery_booked: 'discovery_booked',
  qualified: 'discovery_booked',
  quote_ready: 'proposal_ready',
  proposal_sent: 'proposal_sent',
  won: 'won',
  closed: 'won',
  not_fit: 'not_fit',
});

/** Canonical stage → representative product-native status (JSON only; no schema). */
const CANONICAL_TO_LR_NATIVE = Object.freeze({
  new: 'NEW_INTAKE',
  qualifying: 'QUALIFYING',
  discovery_booked: 'DEMO_BOOKED',
  proposal_ready: 'QUOTE_SENT',
  proposal_sent: 'QUOTE_SENT',
  awaiting_payment: 'PAYMENT_PENDING',
  won: 'PAID_SETUP',
  delivery: 'SETUP_IN_PROGRESS',
  stalled: 'PAUSED',
  lost: 'LOST',
  not_fit: 'LOST',
});

const CANONICAL_TO_RD_NATIVE = Object.freeze({
  new: 'new_intake',
  qualifying: 'reviewing',
  discovery_booked: 'discovery_booked',
  proposal_ready: 'quote_ready',
  proposal_sent: 'proposal_sent',
  awaiting_payment: 'proposal_sent',
  won: 'won',
  delivery: 'won',
  stalled: 'reviewing',
  lost: 'not_fit',
  not_fit: 'not_fit',
});

/** Forward-only style transitions on canonical stages (UI guard; APIs stay product-native). */
const CANONICAL_FORWARD = Object.freeze({
  new: ['new', 'qualifying', 'discovery_booked', 'not_fit', 'lost', 'stalled'],
  qualifying: ['qualifying', 'discovery_booked', 'proposal_ready', 'not_fit', 'lost', 'stalled'],
  discovery_booked: [
    'discovery_booked',
    'proposal_ready',
    'proposal_sent',
    'not_fit',
    'lost',
    'stalled',
  ],
  proposal_ready: ['proposal_ready', 'proposal_sent', 'not_fit', 'lost', 'stalled'],
  proposal_sent: [
    'proposal_sent',
    'awaiting_payment',
    'won',
    'not_fit',
    'lost',
    'stalled',
  ],
  awaiting_payment: ['awaiting_payment', 'won', 'lost', 'stalled', 'not_fit'],
  won: ['won', 'delivery'],
  delivery: ['delivery', 'stalled'],
  stalled: [
    'stalled',
    'new',
    'qualifying',
    'discovery_booked',
    'proposal_ready',
    'proposal_sent',
    'awaiting_payment',
    'won',
    'lost',
    'not_fit',
  ],
  lost: ['lost', 'new', 'qualifying'],
  not_fit: ['not_fit', 'new', 'qualifying'],
});

/**
 * Safe manual intervention keys shared across views (no external send).
 * @type {readonly string[]}
 */
export const PROSPECT_SAFE_INTERVENTIONS = Object.freeze([
  'change_stage',
  'assign_owner',
  'set_next_action',
  'set_priority',
  'add_note',
  'record_activity',
  'open_detail',
  'mark_closure',
  'prepare_draft',
  'correct_classification',
]);

/**
 * Protected actions — must remain gated; never auto-executed from these views.
 * @type {readonly string[]}
 */
export const PROSPECT_PROTECTED_ACTIONS = Object.freeze([
  'external_send',
  'payment_mark_received_authoritative',
  'approve_proposal_commercially',
  'deploy_production',
  'mutate_client_production',
]);

/**
 * @param {unknown} qj
 * @returns {ProspectProduct}
 */
export function detectProspectProduct(qj) {
  const meta = parseIntakeMeta(qj);
  if (meta.product === AI_LEAD_RESCUE_PRODUCT) return AI_LEAD_RESCUE_PRODUCT;
  if (meta.product === RAPID_DELIVERY_PRODUCT) return RAPID_DELIVERY_PRODUCT;
  const root = qj && typeof qj === 'object' ? qj : {};
  if (root.ai_lead_rescue_operator && typeof root.ai_lead_rescue_operator === 'object') {
    return AI_LEAD_RESCUE_PRODUCT;
  }
  if (root.rapid_delivery_operator && typeof root.rapid_delivery_operator === 'object') {
    return RAPID_DELIVERY_PRODUCT;
  }
  return 'unknown';
}

/**
 * @param {string} product
 * @param {string | null | undefined} nativeStatus
 * @returns {string}
 */
export function mapNativeStatusToCanonicalStage(product, nativeStatus) {
  const s = String(nativeStatus || '').trim();
  if (product === AI_LEAD_RESCUE_PRODUCT) {
    const key = s.toUpperCase();
    return LR_STATUS_TO_CANONICAL[key] || 'qualifying';
  }
  if (product === RAPID_DELIVERY_PRODUCT) {
    const norm = normalizeRapidDeliveryStatus(s);
    return RD_STATUS_TO_CANONICAL[norm] || 'qualifying';
  }
  return 'qualifying';
}

/**
 * Map a canonical stage onto an existing product-native status.
 * Persistence stays product-native. Unknown stages return null.
 *
 * @param {string} product
 * @param {string | null | undefined} canonicalStage
 * @returns {string | null}
 */
export function mapCanonicalStageToNativeStatus(product, canonicalStage) {
  const stage = String(canonicalStage || '').trim();
  if (!PROSPECT_CANONICAL_STAGES.includes(stage)) return null;
  if (product === AI_LEAD_RESCUE_PRODUCT) return CANONICAL_TO_LR_NATIVE[stage] || null;
  if (product === RAPID_DELIVERY_PRODUCT) return CANONICAL_TO_RD_NATIVE[stage] || null;
  return null;
}

/**
 * Shared Operating Workspace detail route (#994). Not a product desk URL.
 *
 * @param {unknown} id
 * @returns {string | null}
 */
export function sharedProspectDetailPath(id) {
  const safe = String(id || '').trim();
  if (!safe) return null;
  return `/app/prospects/${encodeURIComponent(safe)}`;
}

/**
 * @param {string} fromStage
 * @param {string} toStage
 * @returns {boolean}
 */
export function isCanonicalStageTransitionAllowed(fromStage, toStage) {
  const from = String(fromStage || '');
  const to = String(toStage || '');
  if (!PROSPECT_CANONICAL_STAGES.includes(from) || !PROSPECT_CANONICAL_STAGES.includes(to)) {
    return false;
  }
  const allowed = CANONICAL_FORWARD[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

/**
 * Product-native forward options for UI selects (does not invent new DB statuses).
 *
 * @param {string} product
 * @param {string | null | undefined} currentNativeStatus
 * @returns {readonly string[]}
 */
export function getAllowedNativeStatuses(product, currentNativeStatus) {
  if (product === AI_LEAD_RESCUE_PRODUCT) {
    const cur = String(currentNativeStatus || 'NEW_INTAKE').toUpperCase();
    const idx = AI_LEAD_RESCUE_STATUSES.indexOf(cur);
    if (idx < 0) return [...AI_LEAD_RESCUE_STATUSES];
    return AI_LEAD_RESCUE_STATUSES.slice(idx);
  }
  if (product === RAPID_DELIVERY_PRODUCT) {
    // Rapid delivery allows free select among current options (legacy included on read).
    return RAPID_DELIVERY_OPERATOR_STATUSES.filter(
      (s) => s !== 'qualified' && s !== 'closed',
    );
  }
  return [];
}

/**
 * @param {string | null | undefined} iso
 * @param {Date} [now]
 * @returns {'past' | 'today' | 'future' | 'none'}
 */
export function classifyDueDate(iso, now = new Date()) {
  if (iso == null || !String(iso).trim()) return 'none';
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return 'none';
  const startToday = new Date(now);
  startToday.setUTCHours(0, 0, 0, 0);
  const startTomorrow = new Date(startToday);
  startTomorrow.setUTCDate(startTomorrow.getUTCDate() + 1);
  if (d.getTime() < startToday.getTime()) return 'past';
  if (d.getTime() < startTomorrow.getTime()) return 'today';
  return 'future';
}

/**
 * Derive next-action due from list/detail-shaped fields or latest activity.
 *
 * @param {{
 *   next_action_due?: string | null,
 *   next_action_date?: string | null,
 *   activity?: Array<{ next_action_date?: string | null }>,
 * }} record
 * @returns {string | null}
 */
export function resolveNextActionDue(record) {
  if (record?.next_action_due && String(record.next_action_due).trim()) {
    const d = new Date(String(record.next_action_due));
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  if (record?.next_action_date && String(record.next_action_date).trim()) {
    const d = new Date(String(record.next_action_date));
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const activity = Array.isArray(record?.activity) ? record.activity : [];
  for (let i = activity.length - 1; i >= 0; i -= 1) {
    const raw = activity[i]?.next_action_date;
    if (raw == null || !String(raw).trim()) continue;
    const d = new Date(String(raw));
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

/**
 * @param {string | null | undefined} lastActivityIso
 * @param {Date} [now]
 * @param {number} [staleDays]
 * @returns {boolean}
 */
export function isStaleActivity(lastActivityIso, now = new Date(), staleDays = PROSPECT_STALE_DAYS_DEFAULT) {
  if (lastActivityIso == null || !String(lastActivityIso).trim()) return true;
  const d = new Date(String(lastActivityIso));
  if (Number.isNaN(d.getTime())) return true;
  const ms = Number(staleDays) * 24 * 60 * 60 * 1000;
  return now.getTime() - d.getTime() > ms;
}

/**
 * Compute exception signals for a canonical prospect row.
 *
 * @param {{
 *   canonical_stage?: string | null,
 *   native_status?: string | null,
 *   next_action?: string | null,
 *   next_action_due?: string | null,
 *   urgency?: string | null,
 *   last_meaningful_activity_at?: string | null,
 *   qualification_complete?: boolean | null,
 *   waiting_on?: string | null,
 *   created_at?: string | Date | null,
 * }} row
 * @param {Date} [now]
 * @param {{ staleDays?: number }} [opts]
 * @returns {string[]}
 */
export function computeProspectExceptionSignals(row, now = new Date(), opts = {}) {
  const signals = [];
  const stage = String(row?.canonical_stage || '');
  const native = String(row?.native_status || '');
  const nextAction = row?.next_action != null ? String(row.next_action).trim() : '';
  const due = resolveNextActionDue(row);
  const dueClass = classifyDueDate(due, now);

  if (dueClass === 'past') signals.push('overdue_action');
  else if (dueClass === 'today') signals.push('due_today');
  else if (dueClass === 'future') signals.push('future_action_scheduled');

  if (!nextAction) signals.push('no_next_action');

  const isNew =
    stage === 'new' ||
    native === 'NEW_INTAKE' ||
    native === 'new_intake';
  if (isNew) signals.push('new_unreviewed');

  const urgency = String(row?.urgency || '').toLowerCase();
  if (urgency === 'high' || urgency === 'urgent' || urgency === 'critical' || urgency === 'asap') {
    signals.push('high_urgency');
  }

  const closed = stage === 'won' || stage === 'lost' || stage === 'not_fit' || stage === 'delivery';
  if (!closed && isStaleActivity(row?.last_meaningful_activity_at || row?.created_at, now, opts.staleDays)) {
    signals.push('stalled_no_activity');
  }

  if (row?.qualification_complete === false) signals.push('missing_qualification');

  const waiting = String(row?.waiting_on || '').toLowerCase();
  if (waiting === 'prospect' || waiting === 'client') signals.push('awaiting_prospect');
  if (waiting === 'operator' || waiting === 'corpflow') signals.push('awaiting_operator');
  if (waiting === 'anton' || waiting === 'protected' || waiting === 'protected_approval') {
    signals.push('awaiting_protected_approval');
  }

  return signals;
}

/**
 * Default Action Queue / My Work ordering.
 * Overdue → due today → no next action → everything else (by due then created).
 *
 * @param {Array<Record<string, unknown>>} rows
 * @param {Date} [now]
 * @returns {Array<Record<string, unknown>>}
 */
export function sortProspectsForActionQueue(rows, now = new Date()) {
  const list = Array.isArray(rows) ? [...rows] : [];
  return list.sort((a, b) => {
    const sa = Array.isArray(a.exception_signals)
      ? a.exception_signals
      : computeProspectExceptionSignals(a, now);
    const sb = Array.isArray(b.exception_signals)
      ? b.exception_signals
      : computeProspectExceptionSignals(b, now);
    const ra = Math.min(...sa.map((s) => SIGNAL_SORT_RANK[s] ?? 50), 50);
    const rb = Math.min(...sb.map((s) => SIGNAL_SORT_RANK[s] ?? 50), 50);
    if (ra !== rb) return ra - rb;
    const da = resolveNextActionDue(a);
    const db = resolveNextActionDue(b);
    if (da && db) return new Date(da).getTime() - new Date(db).getTime();
    if (da && !db) return -1;
    if (!da && db) return 1;
    const ca = a.created_at ? new Date(/** @type {any} */ (a.created_at)).getTime() : 0;
    const cb = b.created_at ? new Date(/** @type {any} */ (b.created_at)).getTime() : 0;
    return ca - cb;
  });
}

/**
 * My Work / Today filter: overdue, due today, no next action, awaiting operator.
 *
 * @param {Record<string, unknown>} row
 * @param {Date} [now]
 * @returns {boolean}
 */
export function matchesMyWorkTodayFilter(row, now = new Date()) {
  const signals = Array.isArray(row.exception_signals)
    ? row.exception_signals
    : computeProspectExceptionSignals(row, now);
  return (
    signals.includes('overdue_action') ||
    signals.includes('due_today') ||
    signals.includes('no_next_action') ||
    signals.includes('awaiting_operator')
  );
}

/**
 * Project a Prisma Lead row into the shared Prospect Operations view model.
 *
 * @param {{
 *   id: string,
 *   tenantId?: string | null,
 *   name?: string | null,
 *   email?: string | null,
 *   phone?: string | null,
 *   contact?: string | null,
 *   message?: string | null,
 *   status?: string | null,
 *   createdAt?: Date | string | null,
 *   updatedAt?: Date | string | null,
 *   qualificationJson?: unknown,
 * }} row
 * @param {Date} [now]
 * @returns {Record<string, unknown>}
 */
export function leadRowToProspectViewModel(row, now = new Date()) {
  const qj = row?.qualificationJson;
  const product = detectProspectProduct(qj);
  const intake = parseIntakeMeta(qj);

  if (product === AI_LEAD_RESCUE_PRODUCT) {
    const list = leadRowToAiLeadRescueListItem(row);
    const detail = leadRowToAiLeadRescueDetail(row);
    const op = parseAiLeadRescueOperator(qj);
    const activity = parseAiLeadRescueActivity(qj);
    const nativeStatus = list.status;
    const canonicalStage = mapNativeStatusToCanonicalStage(product, nativeStatus);
    const nextActionDue = resolveNextActionDue({
      next_action_due: /** @type {any} */ (op).next_action_due || null,
      activity,
    });
    const lastActivity =
      activity.length > 0
        ? activity[activity.length - 1].at
        : list.last_contacted || (list.updated_at ? new Date(list.updated_at).toISOString() : null);
    const base = {
      id: list.id,
      reference: `LR-${String(list.id).replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || 'XXXXXX'}`,
      tenant_id: detail.tenant_id || null,
      product,
      person_name: list.contact_name || null,
      organisation_name: list.business_name || null,
      email: list.email || null,
      phone: list.phone || null,
      source: intake.page || intake.host || null,
      product_service_path: 'ai-lead-rescue',
      owner: list.owner || null,
      native_status: nativeStatus,
      native_status_label: list.status_label,
      canonical_stage: canonicalStage,
      priority: /** @type {any} */ (op).priority || null,
      urgency: /** @type {any} */ (op).urgency || null,
      next_action: list.next_action || null,
      next_action_due: nextActionDue,
      last_meaningful_activity_at: lastActivity,
      qualification_complete: Boolean(
        list.business_name && list.email && (list.lead_sources || list.region_path),
      ),
      estimated_value: list.setup_price,
      currency: list.currency,
      expected_close_date: /** @type {any} */ (op).expected_close_date || null,
      consent_contact:
        intake.consent_contact === true ||
        intake.consent_contact === 'true' ||
        intake.consent_contact === 1
          ? true
          : null,
      website: intake.website || null,
      problem_summary: intake.primary_pain || row.message || null,
      offer_slug: 'ai-lead-rescue',
      offer_title: 'AI Lead Rescue',
      enquiry_channels: intake.lead_sources || intake.enquiry_channels || null,
      notes: /** @type {any} */ (op).notes || '',
      recommended_next_action: list.next_action || null,
      response_draft: buildMarketEnquiryResponseDraft({
        contactName: list.contact_name || row.name,
        businessName: list.business_name || '',
        servicePathId: 'client-lead-service',
        offerTitle: 'AI Lead Rescue',
        primaryPain: String(intake.primary_pain || row.message || ''),
        reference: `LR-${String(list.id).replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || 'XXXXXX'}`,
      }),
      related_refs: {
        proposal: null,
        financial_approval: list.payment_status || null,
        delivery: null,
        invoice: /** @type {any} */ (detail.commercial)?.invoice_reference || null,
      },
      closure_reason: /** @type {any} */ (op).closure_reason || null,
      waiting_on: /** @type {any} */ (op).waiting_on || null,
      created_at: list.submitted_at ? new Date(list.submitted_at).toISOString() : null,
      updated_at: list.updated_at ? new Date(list.updated_at).toISOString() : null,
      detail_path: list.detail_path,
      shared_detail_path: sharedProspectDetailPath(list.id),
      detail_path: `${OPERATING_PROSPECTS_PATH}?id=${encodeURIComponent(String(list.id))}`,
      activity_count: activity.length,
      source_surfaces: prospectSourceSurfaces({ product, id: list.id }),
    };
    const exception_signals = computeProspectExceptionSignals(base, now);
    return { ...base, exception_signals };
  }

  if (product === RAPID_DELIVERY_PRODUCT) {
    const list = leadRowToRapidDeliveryListItem(row);
    const op =
      qj && typeof qj === 'object' && qj.rapid_delivery_operator && typeof qj.rapid_delivery_operator === 'object'
        ? qj.rapid_delivery_operator
        : {};
    const activity = Array.isArray(/** @type {any} */ (row.qualificationJson)?.rapid_delivery_operator?.activity)
      ? /** @type {any} */ (row.qualificationJson).rapid_delivery_operator.activity
      : [];
    const nativeStatus = list.operator_status;
    const canonicalStage = mapNativeStatusToCanonicalStage(product, nativeStatus);
    const nextActionDue = resolveNextActionDue({
      next_action_due: /** @type {any} */ (op).next_action_due || null,
      activity,
    });
    const lastActivity =
      activity.length > 0
        ? activity[activity.length - 1].at
        : list.updated_at || list.created_at;
    const base = {
      id: list.id,
      reference: list.reference,
      tenant_id: list.tenant_id,
      product,
      person_name: list.name || null,
      organisation_name: list.business_name || null,
      email: list.email || null,
      phone: list.phone || null,
      source: list.source || null,
      product_service_path: list.service_path || list.offer_slug || null,
      owner: /** @type {any} */ (op).owner || null,
      native_status: nativeStatus,
      native_status_label: list.operator_status_label,
      canonical_stage: canonicalStage,
      priority: /** @type {any} */ (op).priority || null,
      urgency: /** @type {any} */ (op).urgency || list.urgency || null,
      next_action: /** @type {any} */ (op).next_action || list.recommended_next_action || null,
      next_action_due: nextActionDue,
      last_meaningful_activity_at: lastActivity,
      qualification_complete: Boolean(
        list.business_name && list.email && (list.service_path || list.offer_slug),
      ),
      estimated_value: list.starting_price_mur,
      currency: list.starting_price_mur != null ? 'MUR' : null,
      expected_close_date: /** @type {any} */ (op).expected_close_date || null,
      consent_contact: list.consent_contact,
      website: list.website || null,
      problem_summary: list.primary_pain || list.discovery_notes || null,
      offer_slug: list.offer_slug || null,
      offer_title: list.offer_title || null,
      enquiry_channels: list.enquiry_channels || null,
      notes: list.operator_notes || '',
      recommended_next_action: list.recommended_next_action || null,
      response_draft: list.response_draft || null,
      related_refs: {
        proposal: null,
        financial_approval: null,
        delivery: null,
        invoice: null,
      },
      closure_reason: /** @type {any} */ (op).closure_reason || null,
      waiting_on: /** @type {any} */ (op).waiting_on || null,
      created_at: list.created_at,
      updated_at: list.updated_at,
      detail_path: `/admin/rapid-delivery#${list.id}`,
      shared_detail_path: sharedProspectDetailPath(list.id),
      detail_path: `${OPERATING_PROSPECTS_PATH}?id=${encodeURIComponent(String(list.id))}`,
      activity_count: activity.length,
      source_surfaces: prospectSourceSurfaces({ product, id: list.id }),
    };
    const exception_signals = computeProspectExceptionSignals(base, now);
    return { ...base, exception_signals };
  }

  return {
    id: row?.id || null,
    reference: null,
    tenant_id: row?.tenantId || null,
    product: 'unknown',
    person_name: row?.name || null,
    organisation_name: null,
    email: row?.email || null,
    phone: row?.phone || row?.contact || null,
    source: null,
    product_service_path: null,
    owner: null,
    native_status: row?.status || null,
    native_status_label: row?.status || null,
    canonical_stage: 'qualifying',
    priority: null,
    urgency: null,
    next_action: null,
    next_action_due: null,
    last_meaningful_activity_at: row?.updatedAt ? new Date(row.updatedAt).toISOString() : null,
    qualification_complete: false,
    estimated_value: null,
    currency: null,
    expected_close_date: null,
    consent_contact: null,
    related_refs: {},
    closure_reason: null,
    waiting_on: null,
    created_at: row?.createdAt ? new Date(row.createdAt).toISOString() : null,
    updated_at: row?.updatedAt ? new Date(row.updatedAt).toISOString() : null,
    detail_path: null,
    shared_detail_path: sharedProspectDetailPath(row?.id),
    activity_count: 0,
    exception_signals: ['missing_qualification', 'no_next_action'],
    source_surfaces: prospectSourceSurfaces({ product: 'unknown', id: row?.id }),
  };
}

/**
 * Canonical stages reachable from the current stage (includes staying).
 *
 * @param {string | null | undefined} fromStage
 * @returns {string[]}
 */
export function getAllowedCanonicalStages(fromStage) {
  const from = String(fromStage || '');
  const allowed = CANONICAL_FORWARD[from];
  return Array.isArray(allowed) ? [...allowed] : [];
}

/**
 * Project a Lead row into the shared Operating Workspace detail surface (#994).
 * Staff-only. Does not leak qualificationJson. No external send.
 *
 * @param {{
 *   id: string,
 *   tenantId?: string | null,
 *   name?: string | null,
 *   email?: string | null,
 *   phone?: string | null,
 *   contact?: string | null,
 *   message?: string | null,
 *   status?: string | null,
 *   createdAt?: Date | string | null,
 *   updatedAt?: Date | string | null,
 *   qualificationJson?: unknown,
 * }} row
 * @param {Date} [now]
 * @returns {Record<string, unknown>}
 */
export function leadRowToProspectDetailViewModel(row, now = new Date()) {
  const list = leadRowToProspectViewModel(row, now);
  const qj = row?.qualificationJson;
  const product = detectProspectProduct(qj);
  const intake = parseIntakeMeta(qj);
  const history = buildProspectHistory(row, product);

  const currentBlocker = resolveCurrentBlocker(list);
  const recommended =
    list.recommended_next_action ||
    list.next_action ||
    recommendFromSignals(list.exception_signals);

  return {
    ...list,
    email: list.email || null,
    phone: list.phone || null,
    qualification_summary: {
      complete: list.qualification_complete === true,
      product,
      organisation_name: list.organisation_name || null,
      person_name: list.person_name || null,
      source: list.source || null,
      product_service_path: list.product_service_path || null,
      region_or_offer: intake.region_path || list.product_service_path || intake.page || null,
      urgency: list.urgency || null,
      notes_preview: history.notes || null,
    },
    notes: history.notes,
    current_blocker: currentBlocker,
    recommended_next_action: recommended,
    history: history.entries,
    allowed_native_statuses: getAllowedNativeStatuses(product, list.native_status),
    allowed_canonical_stages: getAllowedCanonicalStages(list.canonical_stage),
    safe_interventions: [...PROSPECT_SAFE_INTERVENTIONS],
    protected_actions: [...PROSPECT_PROTECTED_ACTIONS],
    shared_detail_path: sharedProspectDetailPath(list.id),
    product_detail_path: list.detail_path || null,
    external_send: false,
  };
}

/**
 * @param {Record<string, unknown>} list
 * @returns {string | null}
 */
function resolveCurrentBlocker(list) {
  const waiting = list?.waiting_on != null ? String(list.waiting_on).trim() : '';
  const signals = Array.isArray(list?.exception_signals) ? list.exception_signals : [];
  if (signals.includes('overdue_action')) return 'Overdue next action';
  if (signals.includes('awaiting_protected_approval')) return 'Waiting on protected approval';
  if (signals.includes('awaiting_operator')) return 'Waiting on operator';
  if (signals.includes('no_next_action')) return 'Missing next action';
  if (signals.includes('stalled_no_activity')) return 'Stalled — no recent activity';
  if (waiting) return `Waiting on ${waiting}`;
  return null;
}

/**
 * @param {unknown} signals
 * @returns {string | null}
 */
function recommendFromSignals(signals) {
  const list = Array.isArray(signals) ? signals : [];
  if (list.includes('no_next_action')) return 'Set owner and next action';
  if (list.includes('overdue_action')) return 'Complete or reschedule the overdue next action';
  if (list.includes('missing_qualification')) return 'Complete qualification fields';
  if (list.includes('new_unreviewed')) return 'Review new intake';
  return null;
}

/**
 * @param {{ qualificationJson?: unknown }} row
 * @param {string} product
 * @returns {{ notes: string | null, entries: Array<Record<string, unknown>> }}
 */
function buildProspectHistory(row, product) {
  const qj = row?.qualificationJson && typeof row.qualificationJson === 'object' ? row.qualificationJson : {};
  /** @type {Array<Record<string, unknown>>} */
  const entries = [];
  let notes = null;

  if (product === AI_LEAD_RESCUE_PRODUCT) {
    const op = parseAiLeadRescueOperator(qj);
    notes = op.notes || null;
    const rawOp =
      qj.ai_lead_rescue_operator && typeof qj.ai_lead_rescue_operator === 'object'
        ? qj.ai_lead_rescue_operator
        : {};
    const rawNotes = Array.isArray(rawOp.internal_notes) ? rawOp.internal_notes : [];
    for (const n of rawNotes) {
      if (!n || typeof n !== 'object') continue;
      const text = n.text != null ? String(n.text).trim() : '';
      if (!text) continue;
      entries.push({
        at: n.at != null ? String(n.at) : null,
        actor: n.actor_label != null ? String(n.actor_label) : null,
        kind: 'note',
        note: text,
        status_after: null,
        next_action: null,
        next_action_due: null,
      });
    }
    for (const a of parseAiLeadRescueActivity(qj)) {
      entries.push({
        at: a.at,
        actor: a.actor_label,
        kind: a.type || 'activity',
        note: a.note,
        status_after: a.status_after,
        next_action: a.next_action,
        next_action_due: a.next_action_date,
      });
    }
  } else if (product === RAPID_DELIVERY_PRODUCT) {
    const op =
      qj.rapid_delivery_operator && typeof qj.rapid_delivery_operator === 'object'
        ? qj.rapid_delivery_operator
        : {};
    notes = op.notes != null && String(op.notes).trim() ? String(op.notes).trim() : null;
    const activity = Array.isArray(op.activity) ? op.activity : [];
    for (const a of activity) {
      if (!a || typeof a !== 'object') continue;
      entries.push({
        at: a.at != null ? String(a.at) : null,
        actor: a.actor != null ? String(a.actor) : null,
        kind: a.status ? 'status_change' : 'note',
        note: a.note != null ? String(a.note) : null,
        status_after: a.status != null ? String(a.status) : null,
        next_action: a.next_action != null ? String(a.next_action) : null,
        next_action_due: a.next_action_date != null ? String(a.next_action_date) : null,
      });
    }
  }

  entries.sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')));
  return { notes, entries };
}

/**
 * Assert a proposed intervention is safe (not a protected external action).
 *
 * @param {string} action
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function assertSafeProspectIntervention(action) {
  const a = String(action || '').trim();
  if (PROSPECT_PROTECTED_ACTIONS.includes(a)) {
    return { ok: false, error: 'PROTECTED_ACTION_BLOCKED' };
  }
  if (!PROSPECT_SAFE_INTERVENTIONS.includes(a)) {
    return { ok: false, error: 'UNKNOWN_INTERVENTION' };
  }
  return { ok: true };
}
