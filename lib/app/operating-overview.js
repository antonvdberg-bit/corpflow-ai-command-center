/**
 * #1159 — Operating Workspace action overview.
 *
 * Read-only projection over already-merged Prospect, Client, Commercial and
 * Delivery contracts. No copied records, KPI store, forecast, schema, or
 * second task model. Counts are lengths of existing filtered lists.
 */

import {
  matchesActionQueueFilter,
  matchesWorkbenchFilter,
} from '../cmp/_lib/prospect-operations-view-model.js';
import { loadClientsList } from './clients-list.js';
import { loadCommercialSummaryList } from './commercial-summary-list.js';
import {
  filterCommercialRows,
  projectCommercialRowsFromLeads,
} from './commercial-summary.js';
import {
  filterDeliveryItems,
  projectDeliveryItems,
} from './delivery-workspace.js';
import { loadProspectOperationsList } from './prospect-operations-list.js';
import { assertProspectOperationsAccess } from './prospect-operations-workspace.js';
import {
  ACTION_QUEUE_PATH,
  CLIENTS_PATH,
  COMMERCIAL_SUMMARY_PATH,
  DELIVERY_PATH,
  OPERATING_OVERVIEW_API_PATH,
  OPERATING_OVERVIEW_PATH,
  PROSPECT_OPERATIONS_PATH,
  PROSPECT_WORKBENCH_PATH,
  TODAY_MY_WORK_PATH,
  canAccessOperatingWorkspace,
} from './workspace-context.js';

export { OPERATING_OVERVIEW_API_PATH, OPERATING_OVERVIEW_PATH };
export const OVERVIEW_LIST_LIMIT = 5;
export const DATA_SOURCE_FIXTURE = 'fixture';

export { assertProspectOperationsAccess, canAccessOperatingWorkspace };

/**
 * @param {unknown} value
 * @returns {string}
 */
function asText(value) {
  return value == null ? '' : String(value).trim();
}

/**
 * @template T
 * @param {T[]} list
 * @param {number} [limit]
 * @returns {T[]}
 */
function take(list, limit = OVERVIEW_LIST_LIMIT) {
  return Array.isArray(list) ? list.slice(0, limit) : [];
}

/**
 * Recorded Client identity/evidence exceptions only — no invented health score.
 *
 * @param {Record<string, unknown> | null | undefined} client
 * @returns {boolean}
 */
export function clientHasRecordedException(client) {
  if (!client || typeof client !== 'object') return false;
  const verification = asText(client.verification_status).toUpperCase();
  const lifecycle = asText(client.lifecycle_status).toUpperCase();
  const onboarding = asText(client.onboarding_status).toLowerCase();
  const approval = asText(client.approval_status).toUpperCase();
  if (verification === 'CONFLICTING') return true;
  if (lifecycle === 'EVIDENCE_INCOMPLETE') return true;
  if (onboarding === 'evidence_incomplete') return true;
  if (approval === 'PENDING') return true;
  return false;
}

/**
 * @param {Record<string, unknown> | null | undefined} client
 * @returns {string}
 */
export function clientExceptionReason(client) {
  const verification = asText(client?.verification_status).toUpperCase();
  if (verification === 'CONFLICTING') return 'Company Master evidence conflict';
  const lifecycle = asText(client?.lifecycle_status).toUpperCase();
  if (lifecycle === 'EVIDENCE_INCOMPLETE') return 'Company Master evidence incomplete';
  const onboarding = asText(client?.onboarding_status).toLowerCase();
  if (onboarding === 'evidence_incomplete') return 'Onboarding evidence incomplete';
  if (asText(client?.approval_status).toUpperCase() === 'PENDING') {
    return 'Company Master approval pending';
  }
  return asText(client?.next_action) || 'Client record needs attention';
}

/**
 * @param {{
 *   id: string,
 *   kind: 'prospect' | 'client' | 'commercial' | 'delivery',
 *   label: string,
 *   reason: string,
 *   href: string,
 *   identity?: Record<string, string | null>,
 * }} args
 * @returns {Record<string, unknown>}
 */
export function projectOverviewExceptionItem(args) {
  const identity = args.identity && typeof args.identity === 'object' ? args.identity : {};
  return {
    id: asText(args.id),
    kind: args.kind,
    label: asText(args.label) || asText(args.id),
    reason: asText(args.reason),
    href: asText(args.href),
    identity,
  };
}

/**
 * @param {Array<Record<string, unknown>>} prospects
 * @param {Date} now
 */
export function filterOverdueProspects(prospects, now = new Date()) {
  return (Array.isArray(prospects) ? prospects : []).filter((row) =>
    matchesActionQueueFilter(row, 'overdue', now),
  );
}

/**
 * @param {Array<Record<string, unknown>>} prospects
 * @param {Date} now
 */
export function filterStalledProspects(prospects, now = new Date()) {
  return (Array.isArray(prospects) ? prospects : []).filter((row) =>
    matchesWorkbenchFilter(row, 'stalled', now),
  );
}

/**
 * @param {Array<Record<string, unknown>>} clients
 */
export function filterExceptionClients(clients) {
  return (Array.isArray(clients) ? clients : []).filter((row) => clientHasRecordedException(row));
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @returns {Array<Record<string, unknown>>}
 */
export function projectProspectOverdueItems(rows) {
  return take(
    (Array.isArray(rows) ? rows : []).map((row) => {
      const id = asText(row.id);
      return projectOverviewExceptionItem({
        id: `prospect-overdue:${id}`,
        kind: 'prospect',
        label: asText(row.organisation_name || row.person_name || id),
        reason: 'Overdue next action',
        href: asText(row.shared_detail_path) || `${PROSPECT_OPERATIONS_PATH}/${encodeURIComponent(id)}`,
        identity: { prospect_id: id || null },
      });
    }),
  );
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @returns {Array<Record<string, unknown>>}
 */
export function projectProspectStalledItems(rows) {
  return take(
    (Array.isArray(rows) ? rows : []).map((row) => {
      const id = asText(row.id);
      return projectOverviewExceptionItem({
        id: `prospect-stalled:${id}`,
        kind: 'prospect',
        label: asText(row.organisation_name || row.person_name || id),
        reason: 'Stalled — no recent activity',
        href: asText(row.shared_detail_path) || `${PROSPECT_OPERATIONS_PATH}/${encodeURIComponent(id)}`,
        identity: { prospect_id: id || null },
      });
    }),
  );
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @returns {Array<Record<string, unknown>>}
 */
export function projectClientExceptionItems(rows) {
  return take(
    (Array.isArray(rows) ? rows : []).map((row) => {
      const id = asText(row.company_id || row.id);
      return projectOverviewExceptionItem({
        id: `client:${id}`,
        kind: 'client',
        label: asText(row.trading_name || row.legal_name || id),
        reason: clientExceptionReason(row),
        href: asText(row.summary_path) || `${CLIENTS_PATH}/${encodeURIComponent(id)}`,
        identity: { company_id: id || null },
      });
    }),
  );
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @returns {Array<Record<string, unknown>>}
 */
export function projectCommercialExceptionItems(rows) {
  return take(
    (Array.isArray(rows) ? rows : []).map((row) => {
      const id = asText(row.id || row.prospect_id);
      const prospectId = asText(row.prospect_id);
      const href =
        asText(row.shared_detail_path) ||
        (prospectId ? `${PROSPECT_OPERATIONS_PATH}/${encodeURIComponent(prospectId)}` : COMMERCIAL_SUMMARY_PATH);
      return projectOverviewExceptionItem({
        id: `commercial:${id}`,
        kind: 'commercial',
        label: asText(row.client_label || row.prospect_label || id),
        reason: asText(row.commercial_state_label || row.next_action || 'Commercial blocker'),
        href,
        identity: {
          prospect_id: prospectId || null,
          company_id: asText(row.company_master_id) || null,
        },
      });
    }),
  );
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @returns {Array<Record<string, unknown>>}
 */
export function projectDeliveryExceptionItems(rows) {
  return take(
    (Array.isArray(rows) ? rows : []).map((row) => {
      const id = asText(row.id);
      const links = row.links && typeof row.links === 'object' ? /** @type {Record<string, unknown>} */ (row.links) : {};
      const prospectHref = asText(links.prospect);
      const changeHref = asText(links.change);
      const href = prospectHref || changeHref || DELIVERY_PATH;
      return projectOverviewExceptionItem({
        id: `delivery:${id}`,
        kind: 'delivery',
        label: asText(row.client_business || row.product_service || id),
        reason: asText(row.current_blocker || row.review_approval_state || row.primary_exception || 'Delivery exception'),
        href,
        identity: {
          source_id: asText(row.source_id) || null,
          record_kind: asText(row.record_kind) || null,
          prospect_id: prospectHref ? asText(row.source_id) : null,
          request_id: asText(row.record_kind) === 'general_delivery' ? asText(row.source_id) : null,
        },
      });
    }),
  );
}

export const OVERVIEW_NEXT_DESTINATION_RULES = Object.freeze([
  Object.freeze({
    count_key: 'delivery_protected',
    href: `${DELIVERY_PATH}?filter=protected_deploy_approval_required`,
    label: 'Delivery — protected gates',
    reason: 'Protected deploy / approval is waiting',
  }),
  Object.freeze({
    count_key: 'delivery_blocked',
    href: `${DELIVERY_PATH}?filter=blocked`,
    label: 'Delivery — blocked work',
    reason: 'Blocked deliveries need an operator',
  }),
  Object.freeze({
    count_key: 'prospects_overdue',
    href: `${ACTION_QUEUE_PATH}?filter=overdue`,
    label: 'Action Queue — overdue',
    reason: 'Overdue prospect actions',
  }),
  Object.freeze({
    count_key: 'commercial_blockers',
    href: `${COMMERCIAL_SUMMARY_PATH}?filter=needs_attention`,
    label: 'Commercial — blockers',
    reason: 'Commercial gates are blocking',
  }),
  Object.freeze({
    count_key: 'prospects_stalled',
    href: `${PROSPECT_WORKBENCH_PATH}?filter=stalled`,
    label: 'Workbench — stalled',
    reason: 'Stalled prospects need a next action',
  }),
  Object.freeze({
    count_key: 'delivery_review',
    href: `${DELIVERY_PATH}?filter=client_review_pending`,
    label: 'Delivery — client review',
    reason: 'Client review is pending',
  }),
  Object.freeze({
    count_key: 'clients_exceptions',
    href: CLIENTS_PATH,
    label: 'Clients — evidence exceptions',
    reason: 'Client identity / evidence needs attention',
  }),
]);

/**
 * @param {Record<string, number>} counts
 * @returns {Record<string, unknown>}
 */
export function chooseNextDestination(counts) {
  const nums = counts && typeof counts === 'object' ? counts : {};
  for (const rule of OVERVIEW_NEXT_DESTINATION_RULES) {
    const count = Number(nums[rule.count_key] || 0);
    if (count > 0) {
      return {
        href: rule.href,
        label: rule.label,
        reason: rule.reason,
        count,
      };
    }
  }
  return {
    href: TODAY_MY_WORK_PATH,
    label: 'Today / My Work',
    reason: 'No exceptions recorded — continue today’s work',
    count: 0,
  };
}

/**
 * @param {string[]} parts
 * @returns {string}
 */
function combineDataSources(parts) {
  const unique = [...new Set(parts.map((part) => asText(part)).filter(Boolean))];
  if (!unique.length) return DATA_SOURCE_FIXTURE;
  if (unique.every((part) => part === DATA_SOURCE_FIXTURE)) return DATA_SOURCE_FIXTURE;
  return unique.join('+');
}

/**
 * @param {{
 *   prospects: Array<Record<string, unknown>>,
 *   commercialRows: Array<Record<string, unknown>>,
 *   clients: Array<Record<string, unknown>>,
 *   deliveryItems: Array<Record<string, unknown>>,
 *   data_source: string,
 *   proof_mode?: boolean,
 *   now?: Date,
 * }} args
 */
export function buildOperatingOverviewPayload(args) {
  const now = args.now instanceof Date ? args.now : new Date();
  const prospects = Array.isArray(args.prospects) ? args.prospects : [];
  const commercialRows = Array.isArray(args.commercialRows) ? args.commercialRows : [];
  const clients = Array.isArray(args.clients) ? args.clients : [];
  const deliveryItems = Array.isArray(args.deliveryItems) ? args.deliveryItems : [];

  const overdue = filterOverdueProspects(prospects, now);
  const stalled = filterStalledProspects(prospects, now);
  const clientExceptions = filterExceptionClients(clients);
  const commercialBlockers = filterCommercialRows(commercialRows, 'needs_attention');
  const deliveryBlocked = filterDeliveryItems(deliveryItems, 'blocked');
  const deliveryReview = filterDeliveryItems(deliveryItems, 'client_review_pending');
  const deliveryProtected = filterDeliveryItems(deliveryItems, 'protected_deploy_approval_required');

  const counts = {
    prospects_overdue: overdue.length,
    prospects_stalled: stalled.length,
    clients_exceptions: clientExceptions.length,
    commercial_blockers: commercialBlockers.length,
    delivery_blocked: deliveryBlocked.length,
    delivery_review: deliveryReview.length,
    delivery_protected: deliveryProtected.length,
  };
  const nextDestination = chooseNextDestination(counts);
  const exceptionCount = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return {
    ok: true,
    workspace: 'operating',
    path: OPERATING_OVERVIEW_PATH,
    view: 'overview',
    data_source: args.data_source,
    proof_mode: args.proof_mode === true,
    counts,
    exception_count: exceptionCount,
    next_destination: nextDestination,
    sections: {
      prospects_overdue: {
        title: 'Overdue prospects',
        count: counts.prospects_overdue,
        href: `${ACTION_QUEUE_PATH}?filter=overdue`,
        items: projectProspectOverdueItems(overdue),
      },
      prospects_stalled: {
        title: 'Stalled prospects',
        count: counts.prospects_stalled,
        href: `${PROSPECT_WORKBENCH_PATH}?filter=stalled`,
        items: projectProspectStalledItems(stalled),
      },
      clients: {
        title: 'Client exceptions',
        count: counts.clients_exceptions,
        href: CLIENTS_PATH,
        items: projectClientExceptionItems(clientExceptions),
      },
      commercial: {
        title: 'Commercial blockers',
        count: counts.commercial_blockers,
        href: `${COMMERCIAL_SUMMARY_PATH}?filter=needs_attention`,
        items: projectCommercialExceptionItems(commercialBlockers),
      },
      delivery_blocked: {
        title: 'Delivery blockers',
        count: counts.delivery_blocked,
        href: `${DELIVERY_PATH}?filter=blocked`,
        items: projectDeliveryExceptionItems(deliveryBlocked),
      },
      delivery_review: {
        title: 'Delivery review',
        count: counts.delivery_review,
        href: `${DELIVERY_PATH}?filter=client_review_pending`,
        items: projectDeliveryExceptionItems(deliveryReview),
      },
      delivery_protected: {
        title: 'Protected gates',
        count: counts.delivery_protected,
        href: `${DELIVERY_PATH}?filter=protected_deploy_approval_required`,
        items: projectDeliveryExceptionItems(deliveryProtected),
      },
    },
    canonical_routes: {
      overview: OPERATING_OVERVIEW_PATH,
      today: TODAY_MY_WORK_PATH,
      queue: ACTION_QUEUE_PATH,
      prospects: PROSPECT_OPERATIONS_PATH,
      clients: CLIENTS_PATH,
      commercial: COMMERCIAL_SUMMARY_PATH,
      delivery: DELIVERY_PATH,
    },
    fabricated: false,
    kpi_store: false,
    schema_change: false,
    external_send: false,
  };
}

/**
 * @param {{
 *   proofMode?: boolean,
 *   listRequests: () => Promise<{
 *     requests: Array<Record<string, unknown>>,
 *     data_source: string,
 *   }>,
 *   now?: Date,
 * }} args
 */
export async function loadOperatingOverview(args) {
  const now = args.now instanceof Date ? args.now : new Date();
  const proofMode = args.proofMode === true;
  const prospectsLoaded = await loadProspectOperationsList({ proofMode, now });
  if (!prospectsLoaded.ok) {
    return {
      ok: false,
      error: prospectsLoaded.error,
      data_source: prospectsLoaded.data_source,
    };
  }
  const commercialLoaded = await loadCommercialSummaryList({ proofMode, now });
  if (!commercialLoaded.ok) {
    return {
      ok: false,
      error: commercialLoaded.error,
      data_source: commercialLoaded.data_source,
    };
  }
  const clientsLoaded = await loadClientsList({ proofMode });
  if (!clientsLoaded.ok) {
    return {
      ok: false,
      error: clientsLoaded.error,
      data_source: clientsLoaded.data_source,
    };
  }
  let listed;
  try {
    listed = await args.listRequests();
  } catch {
    return {
      ok: false,
      error: 'repository_unavailable',
      data_source: prospectsLoaded.data_source,
    };
  }
  const deliveryItems = projectDeliveryItems({
    prospects: prospectsLoaded.prospects,
    requests: listed.requests,
    clients: clientsLoaded.clients,
    now,
  });
  const commercialRows = projectCommercialRowsFromLeads(commercialLoaded.leads, now);
  return {
    ok: true,
    prospects: prospectsLoaded.prospects,
    commercialRows,
    clients: clientsLoaded.clients,
    deliveryItems,
    data_source: combineDataSources([
      prospectsLoaded.data_source,
      commercialLoaded.data_source,
      clientsLoaded.data_source,
      asText(listed.data_source) || DATA_SOURCE_FIXTURE,
    ]),
    now,
  };
}
