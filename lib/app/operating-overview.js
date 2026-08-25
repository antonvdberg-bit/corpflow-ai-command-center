/**
 * #1071 — Operating Workspace cross-client overview.
 *
 * Thin summary over existing Prospect, Client, Commercial-reference and
 * Delivery contracts. No second analytics store, KPI engine, CRM, or task
 * system. Counts and exception lists only; full tables stay on canonical
 * routes.
 */

import {
  COMPANY_MASTER_PATH,
  COMMERCIAL_SUMMARY_ISSUE,
  DELIVERY_SUMMARY_ISSUE,
  TENANT_DELIVERY_PATH,
} from './clients-workspace.js';
import {
  ACTION_QUEUE_PATH,
  CLIENTS_PATH,
  CLIENT_SHARED_DETAIL_PREFIX,
  OPERATING_OVERVIEW_PATH,
  PROSPECT_OPERATIONS_PATH,
  PROSPECT_PIPELINE_PATH,
  PROSPECT_SHARED_DETAIL_PREFIX,
  PROSPECT_WORKBENCH_PATH,
  TODAY_MY_WORK_PATH,
} from './workspace-context.js';
import {
  countActionQueueFilters,
  filterProspectsForActionQueue,
  filterProspectsForMyWorkToday,
} from './prospect-operations-workspace.js';

export const OVERVIEW_EXCEPTION_LIMIT = 5;
export const OVERVIEW_ISSUE = '#1071';

/** @typedef {{ id: string, title: string, reason: string, href: string, kind: 'prospect'|'client'|'request' }} OverviewExceptionItem */

/**
 * @param {unknown} signals
 * @param {string} id
 * @returns {boolean}
 */
function hasSignal(signals, id) {
  return Array.isArray(signals) && signals.includes(id);
}

/**
 * Company Master states that already mean a commercial / onboarding blocker.
 * Missing ERPNext pointers are "not recorded", not a fabricated blocker.
 *
 * @param {Record<string, unknown>} client
 * @returns {Array<{ code: string, label: string }>}
 */
export function clientCommercialBlockerReasons(client) {
  const row = client && typeof client === 'object' ? client : {};
  /** @type {Array<{ code: string, label: string }>} */
  const reasons = [];
  const lifecycle = String(row.lifecycle_status || '').trim().toUpperCase();
  const onboarding = String(row.onboarding_status || '').trim().toLowerCase();
  const verification = String(row.verification_status || '').trim().toUpperCase();
  const approval = String(row.approval_status || '').trim().toUpperCase();

  if (lifecycle === 'EVIDENCE_INCOMPLETE' || onboarding === 'evidence_incomplete') {
    reasons.push({
      code: 'evidence_incomplete',
      label: 'Company Master evidence is incomplete',
    });
  }
  if (verification === 'CONFLICTING') {
    reasons.push({
      code: 'verification_conflicting',
      label: 'Company Master verification is conflicting',
    });
  }
  if (approval === 'PENDING') {
    reasons.push({
      code: 'approval_pending',
      label: 'Company Master approval is pending',
    });
  }
  return reasons;
}

/**
 * @param {Record<string, unknown>} client
 * @param {Array<Record<string, unknown>>} prospects
 * @returns {boolean}
 */
export function clientHasRelatedProtectedApproval(client, prospects) {
  const relatedIds = new Set(
    (Array.isArray(client?.related_prospects) ? client.related_prospects : [])
      .map((row) => String(row?.id || '').trim())
      .filter(Boolean),
  );
  if (relatedIds.size === 0) return false;
  return (Array.isArray(prospects) ? prospects : []).some((prospect) => {
    const id = String(prospect?.id || '').trim();
    if (!id || !relatedIds.has(id)) return false;
    return hasSignal(prospect.exception_signals, 'awaiting_protected_approval');
  });
}

/**
 * @param {Record<string, unknown>} prospect
 * @returns {OverviewExceptionItem}
 */
export function prospectExceptionItem(prospect) {
  const id = String(prospect?.id || '').trim();
  const title =
    String(prospect?.organisation_name || '').trim() ||
    String(prospect?.person_name || '').trim() ||
    id;
  const signals = Array.isArray(prospect?.exception_signals) ? prospect.exception_signals : [];
  let reason = 'Needs action now';
  if (signals.includes('overdue_action')) reason = 'Overdue next action';
  else if (signals.includes('due_today')) reason = 'Due today';
  else if (signals.includes('stalled_no_activity')) reason = 'Stalled — no recent activity';
  else if (signals.includes('awaiting_protected_approval')) reason = 'Awaiting protected approval';
  else if (signals.includes('no_next_action')) reason = 'Missing next action';
  else if (signals.includes('awaiting_operator')) reason = 'Waiting on the operator';
  else if (signals.includes('new_unreviewed')) reason = 'New / unreviewed';
  const detail =
    prospect?.shared_detail_path != null
      ? String(prospect.shared_detail_path)
      : `${PROSPECT_SHARED_DETAIL_PREFIX}${encodeURIComponent(id)}`;
  return {
    id,
    title,
    reason,
    href: detail,
    kind: 'prospect',
  };
}

/**
 * @param {Record<string, unknown>} client
 * @param {Array<{ code: string, label: string }>} reasons
 * @returns {OverviewExceptionItem}
 */
export function clientExceptionItem(client, reasons) {
  const id = String(client?.company_id || '').trim();
  const title =
    String(client?.trading_name || '').trim() ||
    String(client?.legal_name || '').trim() ||
    id;
  const href =
    client?.summary_path != null
      ? String(client.summary_path)
      : `${CLIENT_SHARED_DETAIL_PREFIX}${encodeURIComponent(id)}`;
  return {
    id,
    title,
    reason: reasons.map((row) => row.label).join('; ') || 'Commercial blocker recorded',
    href,
    kind: 'client',
  };
}

/**
 * @param {Record<string, unknown>} request
 * @param {string} reason
 * @returns {OverviewExceptionItem}
 */
export function requestExceptionItem(request, reason) {
  const id = String(request?.request_id || '').trim();
  const title = String(request?.title || '').trim() || id;
  return {
    id,
    title,
    reason,
    href: TENANT_DELIVERY_PATH,
    kind: 'request',
  };
}

/**
 * @param {Array<Record<string, unknown>>} prospects
 * @returns {Array<Record<string, unknown>>}
 */
export function overdueProspects(prospects) {
  return (Array.isArray(prospects) ? prospects : []).filter((row) =>
    hasSignal(row.exception_signals, 'overdue_action'),
  );
}

/**
 * @param {Array<Record<string, unknown>>} prospects
 * @returns {Array<Record<string, unknown>>}
 */
export function stalledProspects(prospects) {
  return (Array.isArray(prospects) ? prospects : []).filter((row) =>
    hasSignal(row.exception_signals, 'stalled_no_activity'),
  );
}

/**
 * @param {Array<Record<string, unknown>>} clients
 * @param {Array<Record<string, unknown>>} prospects
 * @returns {Array<{ client: Record<string, unknown>, reasons: Array<{ code: string, label: string }> }>}
 */
export function clientsWithCommercialBlockers(clients, prospects) {
  const list = Array.isArray(clients) ? clients : [];
  /** @type {Array<{ client: Record<string, unknown>, reasons: Array<{ code: string, label: string }> }>} */
  const out = [];
  for (const client of list) {
    const reasons = [...clientCommercialBlockerReasons(client)];
    if (clientHasRelatedProtectedApproval(client, prospects)) {
      reasons.push({
        code: 'related_protected_approval',
        label: 'Related prospect is awaiting protected approval',
      });
    }
    if (reasons.length) out.push({ client, reasons });
  }
  return out;
}

/**
 * Delivery attention from existing request list fields. `/app/delivery` is
 * not on current main; `/change` remains the canonical delivery/ticket route.
 *
 * @param {Array<Record<string, unknown>>} requests
 * @returns {{
 *   blocked: Array<Record<string, unknown>>,
 *   awaiting_review: Array<Record<string, unknown>>,
 * }}
 */
export function classifyDeliveryRequests(requests) {
  const list = Array.isArray(requests) ? requests : [];
  /** @type {Array<Record<string, unknown>>} */
  const blocked = [];
  /** @type {Array<Record<string, unknown>>} */
  const awaitingReview = [];
  for (const row of list) {
    const waiting = String(row?.waiting_party || '').trim().toLowerCase();
    const milestone = String(row?.milestone || '').trim().toLowerCase();
    const blocker = String(row?.internal_blocker || '').trim();
    const attention = row?.attention_required === true;
    const isReview =
      attention ||
      waiting === 'client' ||
      milestone === 'in_review' ||
      milestone === 'client_review';
    const isBlocked =
      Boolean(blocker) && waiting !== 'client' && !isReview;
    if (isBlocked) blocked.push(row);
    else if (isReview) awaitingReview.push(row);
  }
  return { blocked, awaiting_review: awaitingReview };
}

/**
 * @param {unknown[]} rows
 * @param {number} [limit]
 * @returns {unknown[]}
 */
export function takeOverviewExceptions(rows, limit = OVERVIEW_EXCEPTION_LIMIT) {
  const list = Array.isArray(rows) ? rows : [];
  const n = Number.isFinite(limit) ? Math.max(0, Number(limit)) : OVERVIEW_EXCEPTION_LIMIT;
  return list.slice(0, n);
}

/**
 * @param {OverviewExceptionItem | null} item
 * @returns {{ label: string, href: string, reason: string } | null}
 */
function openNextFromItem(item) {
  if (!item) return null;
  return {
    label: item.title,
    href: item.href,
    reason: item.reason,
  };
}

/**
 * @param {{
 *   prospects?: Array<Record<string, unknown>>,
 *   clients?: Array<Record<string, unknown>>,
 *   requests?: Array<Record<string, unknown>>,
 *   data_sources?: Record<string, string | null | undefined>,
 *   proof_mode?: boolean,
 *   section_errors?: Array<{ section: string, error: string }>,
 * }} args
 */
export function buildOperatingOverviewPayload(args = {}) {
  const prospects = Array.isArray(args.prospects) ? args.prospects : [];
  const clients = Array.isArray(args.clients) ? args.clients : [];
  const requests = Array.isArray(args.requests) ? args.requests : [];
  const sectionErrors = Array.isArray(args.section_errors) ? args.section_errors : [];
  const sources = args.data_sources && typeof args.data_sources === 'object' ? args.data_sources : {};

  const needsAction = filterProspectsForActionQueue(prospects, 'needs_action');
  const today = filterProspectsForMyWorkToday(prospects);
  const overdue = overdueProspects(prospects);
  const stalled = stalledProspects(prospects);
  const protectedApproval = filterProspectsForActionQueue(prospects, 'awaiting_protected_approval');
  const commercial = clientsWithCommercialBlockers(clients, prospects);
  const delivery = classifyDeliveryRequests(requests);
  const filterCounts = countActionQueueFilters(prospects);

  const needsItems = takeOverviewExceptions(needsAction.map(prospectExceptionItem));
  const overdueItems = takeOverviewExceptions(overdue.map(prospectExceptionItem));
  const stalledItems = takeOverviewExceptions(stalled.map(prospectExceptionItem));
  const commercialItems = takeOverviewExceptions(
    commercial.map((row) => clientExceptionItem(row.client, row.reasons)),
  );
  const blockedItems = takeOverviewExceptions(
    delivery.blocked.map((row) =>
      requestExceptionItem(row, String(row.internal_blocker || 'Delivery blocked')),
    ),
  );
  const reviewItems = takeOverviewExceptions(
    delivery.awaiting_review.map((row) =>
      requestExceptionItem(row, 'Awaiting review'),
    ),
  );
  const protectedItems = takeOverviewExceptions(
    protectedApproval.map((row) => {
      const item = prospectExceptionItem(row);
      return { ...item, reason: 'Awaiting protected approval' };
    }),
  );

  const openNext =
    openNextFromItem(needsItems[0] || null) ||
    openNextFromItem(overdueItems[0] || null) ||
    openNextFromItem(commercialItems[0] || null) ||
    openNextFromItem(reviewItems[0] || null) ||
    openNextFromItem(protectedItems[0] || null) ||
    openNextFromItem(blockedItems[0] || null);

  const uniqueSources = [...new Set(Object.values(sources).filter(Boolean).map((value) => String(value)))];

  return {
    ok: true,
    workspace: 'operating',
    path: OPERATING_OVERVIEW_PATH,
    view: 'overview',
    issue: OVERVIEW_ISSUE,
    data_source: uniqueSources.length === 1 ? uniqueSources[0] : uniqueSources.join('+') || 'fixture',
    data_sources: {
      prospects: sources.prospects || null,
      clients: sources.clients || null,
      requests: sources.requests || null,
    },
    proof_mode: args.proof_mode === true,
    counts: {
      needs_action_now: needsAction.length,
      today_my_work: today.length,
      overdue_prospects: overdue.length,
      stalled_prospects: stalled.length,
      client_commercial_blockers: commercial.length,
      deliveries_blocked: delivery.blocked.length,
      deliveries_awaiting_review: delivery.awaiting_review.length,
      deliveries_awaiting_protected_approval: protectedApproval.length,
    },
    queue_filter_counts: filterCounts,
    sections: {
      needs_action: {
        title: 'Needs action now',
        href: ACTION_QUEUE_PATH,
        count: needsAction.length,
        items: needsItems,
      },
      overdue_prospects: {
        title: 'Overdue prospects',
        href: `${ACTION_QUEUE_PATH}?filter=overdue`,
        count: overdue.length,
        items: overdueItems,
      },
      stalled_prospects: {
        title: 'Stalled prospects',
        href: `${PROSPECT_WORKBENCH_PATH}?filter=stalled`,
        count: stalled.length,
        items: stalledItems,
      },
      client_commercial_blockers: {
        title: 'Clients with a commercial blocker',
        href: CLIENTS_PATH,
        count: commercial.length,
        items: commercialItems,
      },
      deliveries_blocked: {
        title: 'Deliveries blocked',
        href: TENANT_DELIVERY_PATH,
        count: delivery.blocked.length,
        items: blockedItems,
      },
      deliveries_awaiting_review: {
        title: 'Deliveries awaiting review',
        href: TENANT_DELIVERY_PATH,
        count: delivery.awaiting_review.length,
        items: reviewItems,
      },
      deliveries_awaiting_protected_approval: {
        title: 'Awaiting protected approval',
        href: `${ACTION_QUEUE_PATH}?filter=awaiting_protected_approval`,
        count: protectedApproval.length,
        items: protectedItems,
      },
    },
    open_next: openNext,
    canonical_routes: {
      overview: OPERATING_OVERVIEW_PATH,
      today: TODAY_MY_WORK_PATH,
      queue: ACTION_QUEUE_PATH,
      prospects: PROSPECT_OPERATIONS_PATH,
      clients: CLIENTS_PATH,
      workbench: PROSPECT_WORKBENCH_PATH,
      pipeline: PROSPECT_PIPELINE_PATH,
      delivery: TENANT_DELIVERY_PATH,
      company_master: COMPANY_MASTER_PATH,
    },
    later_slices: {
      commercial_summary: COMMERCIAL_SUMMARY_ISSUE,
      delivery_summary: DELIVERY_SUMMARY_ISSUE,
    },
    reduces_fragmented_overview: [
      TODAY_MY_WORK_PATH,
      ACTION_QUEUE_PATH,
      PROSPECT_OPERATIONS_PATH,
      CLIENTS_PATH,
      TENANT_DELIVERY_PATH,
    ],
    section_errors: sectionErrors,
    external_send: false,
    schema_change: false,
    erpnext_write: false,
    fabricated_kpis: false,
  };
}
