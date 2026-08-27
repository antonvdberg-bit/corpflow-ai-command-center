/**
 * #1005 — Operating Workspace Delivery summary.
 *
 * Read-only projection over existing Lead Rescue / Website Rescue leads and
 * Change / request tickets. No second project system. No schema. No send.
 */

import { AI_LEAD_RESCUE_PRODUCT } from '../cmp/_lib/ai-lead-rescue-operator.js';
import { RAPID_DELIVERY_PRODUCT } from '../cmp/_lib/rapid-delivery-operator.js';
import { nextActionForWorkflowState } from '../cmp/_lib/change-workflow-state.js';
import { MILESTONE_META } from './constants.js';
import {
  CHANGE_CONSOLE_PATH,
  CLIENTS_SUMMARY_PATH,
  COMMERCIAL_EXISTING_PATH,
  COMMERCIAL_SUMMARY_ISSUE,
  COMPANY_MASTER_PATH,
  DELIVERY_EXCEPTION_FILTERS,
  DELIVERY_PATH,
  DELIVERY_RECORD_KINDS,
  PROSPECTS_PATH,
  REQUEST_WORKSPACE_PATH,
  asDeliveryText,
  deliveryKindLabel,
  normalizeDeliveryFilter,
} from './delivery-summary-constants.js';
import { normalizeMilestone } from './progress-rollup.js';
import { projectCoreRequest } from './project.js';
import { workflowToMilestone } from './request-normalize.js';
import { canAccessOperatingWorkspace } from './workspace-context.js';
import { loadProspectOperationsList } from './prospect-operations-list.js';
import { loadClientsList } from './clients-list.js';

export {
  CHANGE_CONSOLE_PATH,
  CLIENTS_SUMMARY_PATH,
  COMMERCIAL_EXISTING_PATH,
  COMMERCIAL_SUMMARY_ISSUE,
  COMPANY_MASTER_PATH,
  DELIVERY_API_PATH,
  DELIVERY_EXCEPTION_FILTERS,
  DELIVERY_EXCEPTION_LABELS,
  DELIVERY_PATH,
  DELIVERY_RECORD_KINDS,
  PROSPECTS_PATH,
  REQUEST_WORKSPACE_PATH,
  deliveryKindLabel,
  normalizeDeliveryFilter,
} from './delivery-summary-constants.js';

export const DATA_SOURCE_FIXTURE = 'fixture';
export const DATA_SOURCE_MIXED = 'leads_read+cmp_tickets_read';

const TERMINAL_STAGES = Object.freeze(['live_verified', 'published', 'closed', 'lost']);

/**
 * @param {unknown} value
 * @returns {string}
 */
function asText(value) {
  return asDeliveryText(value);
}

/**
 * @param {import('./access.js').AppActor | null | undefined} actor
 * @returns {{ ok: true } | { ok: false, error: string, http_status: number }}
 */
export function assertDeliveryWorkspaceAccess(actor) {
  if (!actor) {
    return { ok: false, error: 'authentication_required', http_status: 401 };
  }
  if (!canAccessOperatingWorkspace(actor)) {
    return { ok: false, error: 'core_access_denied', http_status: 403 };
  }
  return { ok: true };
}

/**
 * @param {unknown} product
 * @returns {'lead_rescue'|'website_rescue'|null}
 */
export function deliveryKindForProspectProduct(product) {
  const p = asText(product);
  if (p === AI_LEAD_RESCUE_PRODUCT) return 'lead_rescue';
  if (p === RAPID_DELIVERY_PRODUCT) return 'website_rescue';
  return null;
}

/**
 * @param {string | null | undefined} due
 * @param {Date} now
 */
export function isOverdueNextAction(due, now) {
  const raw = asText(due);
  if (!raw) return false;
  const ts = Date.parse(raw);
  if (!Number.isFinite(ts)) return false;
  return ts < now.getTime();
}

/**
 * @param {string} stage
 */
export function isTerminalDeliveryStage(stage) {
  const s = asText(stage).toLowerCase();
  return TERMINAL_STAGES.includes(s);
}

/**
 * Derive a blocker from already-recorded waiting_on / exception signals.
 * Does not invent commercial or delivery facts.
 *
 * @param {{
 *   waiting_on?: string | null,
 *   exception_signals?: unknown,
 *   current_blocker?: string | null,
 *   internal_blocker?: string | null,
 *   client_safe_blocker?: string | null,
 * }} row
 * @returns {string}
 */
export function deriveRecordedBlocker(row) {
  const recorded = asText(row.current_blocker || row.internal_blocker || row.client_safe_blocker);
  if (recorded) return recorded;
  const signals = Array.isArray(row.exception_signals) ? row.exception_signals.map((s) => String(s)) : [];
  if (signals.includes('overdue_action')) return 'Overdue next action';
  if (signals.includes('awaiting_protected_approval')) return 'Waiting on protected approval';
  if (signals.includes('awaiting_operator')) return 'Waiting on operator';
  if (signals.includes('no_next_action')) return 'Missing next action';
  if (signals.includes('stalled_no_activity')) return 'Stalled — no recent activity';
  const waiting = asText(row.waiting_on);
  if (waiting === 'protected') return 'Waiting on protected approval';
  if (waiting === 'operator') return 'Waiting on operator';
  if (waiting === 'client' || waiting === 'prospect') return `Waiting on ${waiting}`;
  if (waiting && waiting !== 'none') return `Waiting on ${waiting}`;
  return '';
}

/**
 * @param {{
 *   waiting_on?: string | null,
 *   workflow_state?: string | null,
 *   milestone?: string | null,
 *   next_action?: string | null,
 *   next_action_due?: string | null,
 *   qualification_complete?: boolean,
 *   current_blocker?: string | null,
 *   promotion_merged?: boolean | null,
 *   native_status?: string | null,
 * }} row
 * @param {Date} now
 * @returns {string[]}
 */
export function computeDeliveryExceptions(row, now = new Date()) {
  /** @type {string[]} */
  const signals = [];
  const waiting = asText(row.waiting_on).toLowerCase();
  const workflow = asText(row.workflow_state).toLowerCase();
  const milestone = asText(row.milestone).toLowerCase();
  const native = asText(row.native_status).toLowerCase();
  const blocker = asText(row.current_blocker);

  if (
    waiting === 'protected' ||
    workflow === 'publishing' ||
    workflow === 'client_approved' ||
    (row.promotion_merged === false && (workflow === 'publishing' || workflow === 'client_approved'))
  ) {
    signals.push('protected_deploy_approval_required');
  }
  if (blocker || milestone === 'blocked' || waiting === 'blocked') {
    signals.push('blocked');
  }
  if (isOverdueNextAction(row.next_action_due, now)) {
    signals.push('overdue_next_action');
  }
  if (
    workflow === 'in_review' ||
    milestone === 'client_review' ||
    waiting === 'client' ||
    waiting === 'prospect'
  ) {
    signals.push('client_review_pending');
  }
  if (workflow === 'preview_ready' || milestone === 'preview_ready') {
    signals.push('preview_ready');
  }
  const missingAction = !asText(row.next_action);
  const incomplete = row.qualification_complete === false;
  const intakeLike =
    workflow === 'intake' ||
    native === 'new_intake' ||
    native === 'new' ||
    milestone === 'not_started' ||
    milestone === 'defined';
  if (missingAction || incomplete || intakeLike) {
    signals.push('inputs_pending');
  }
  return signals;
}

/**
 * @param {string[]} signals
 */
export function primaryDeliveryException(signals) {
  const list = Array.isArray(signals) ? signals : [];
  for (const id of DELIVERY_EXCEPTION_FILTERS) {
    if (id === 'all') continue;
    if (list.includes(id)) return id;
  }
  return '';
}

/**
 * @param {Record<string, unknown>} prospect
 * @param {Array<Record<string, unknown>>} [clients]
 */
export function matchClientForProspect(prospect, clients = []) {
  const prospectId = asText(prospect?.id || prospect?.source_id);
  if (!prospectId) return null;
  for (const client of Array.isArray(clients) ? clients : []) {
    const related = Array.isArray(client?.related_prospects) ? client.related_prospects : [];
    const linked = Array.isArray(client?.linked_prospect_ids) ? client.linked_prospect_ids : [];
    if (related.some((row) => asText(row?.id) === prospectId)) return client;
    if (linked.some((id) => asText(id) === prospectId)) return client;
    const companyId = asText(client?.company_id);
    const recordedCompany = asText(prospect?.company_master_id || prospect?.client_id);
    if (companyId && recordedCompany && companyId === recordedCompany) return client;
  }
  return null;
}

/**
 * @param {Record<string, unknown>} prospect
 * @param {Date} [now]
 * @param {Array<Record<string, unknown>>} [clients]
 * @returns {Record<string, unknown> | null}
 */
export function projectProspectToDeliveryItem(prospect, now = new Date(), clients = []) {
  const kind = deliveryKindForProspectProduct(prospect?.product);
  if (!kind) return null;
  const id = asText(prospect.id);
  if (!id) return null;

  const stage = asText(prospect.canonical_stage || prospect.native_status);
  if (isTerminalDeliveryStage(stage)) return null;

  const waitingOn = asText(prospect.waiting_on);
  const nextAction = asText(prospect.next_action || prospect.recommended_next_action);
  const due = asText(prospect.next_action_due) || null;
  const qualificationComplete = prospect.qualification_complete === true;
  const currentBlocker = deriveRecordedBlocker({
    waiting_on: waitingOn,
    exception_signals: prospect.exception_signals,
    current_blocker: asText(prospect.current_blocker) || null,
  });

  const protectedGate = waitingOn === 'protected';
  const exceptions = computeDeliveryExceptions(
    {
      waiting_on: waitingOn,
      workflow_state: null,
      milestone: stage,
      next_action: nextAction,
      next_action_due: due,
      qualification_complete: qualificationComplete,
      current_blocker: currentBlocker,
      promotion_merged: null,
      native_status: asText(prospect.native_status),
    },
    now,
  );

  const sharedDetail = asText(prospect.shared_detail_path) || `/app/prospects/${encodeURIComponent(id)}`;
  const productDesk =
    kind === 'lead_rescue' ? `/admin/lead-rescue/${encodeURIComponent(id)}` : '/admin/rapid-delivery';
  const matchedClient = matchClientForProspect(prospect, clients);
  const clientPath = matchedClient?.summary_path
    ? asText(matchedClient.summary_path)
    : CLIENTS_SUMMARY_PATH;

  /** @type {Array<{ label: string, href: string, kind: string }>} */
  const evidence = [
    { label: 'Shared prospect', href: sharedDetail, kind: 'safe' },
    {
      label: matchedClient ? 'Client summary' : 'Clients',
      href: clientPath,
      kind: 'safe',
    },
    { label: 'Company Master', href: COMPANY_MASTER_PATH, kind: 'reuse' },
    { label: 'Change Console', href: CHANGE_CONSOLE_PATH, kind: 'safe' },
  ];

  return {
    id: `lead:${id}`,
    source_id: id,
    record_kind: kind,
    record_kind_label: deliveryKindLabel(kind),
    client_business: asText(prospect.organisation_name || prospect.person_name) || 'Unnamed business',
    product_service: kind === 'lead_rescue' ? 'Lead Rescue' : 'Website Rescue',
    delivery_stage: stage || asText(prospect.native_status_label) || 'unknown',
    owner: asText(prospect.owner) || 'Unassigned',
    current_blocker: currentBlocker || 'None recorded',
    next_action: nextAction || 'None recorded',
    next_action_due: due,
    review_approval_state: protectedGate
      ? 'Protected approval required'
      : asText(prospect.native_status_label || prospect.canonical_stage) || 'In delivery',
    exception_signals: exceptions,
    primary_exception: primaryDeliveryException(exceptions),
    protected_gate: protectedGate,
    protected_action_label: protectedGate ? 'Protected commercial / client approval' : '',
    tenant_id: asText(prospect.tenant_id) || null,
    client_id: matchedClient?.company_id ? asText(matchedClient.company_id) : null,
    evidence,
    links: {
      prospect: sharedDetail,
      clients: clientPath,
      company_master: COMPANY_MASTER_PATH,
      commercial: COMMERCIAL_EXISTING_PATH,
      change: CHANGE_CONSOLE_PATH,
      product_desk: productDesk,
    },
    source_contract: kind === 'lead_rescue' ? 'leads.ai-lead-rescue' : 'leads.corpflow-rapid-delivery',
    fabricated: false,
  };
}

/**
 * @param {Record<string, unknown>} request
 * @param {Date} [now]
 * @returns {Record<string, unknown> | null}
 */
export function projectRequestToDeliveryItem(request, now = new Date()) {
  if (!request || typeof request !== 'object') return null;
  const core = projectCoreRequest(/** @type {any} */ (request));
  const id = asText(core.request_id);
  if (!id) return null;

  const workflow = asText(core.workflow_state);
  const milestone = workflowToMilestone(workflow);
  const stage = asText(core.stage || milestone || workflow);
  if (isTerminalDeliveryStage(asText(core.status)) || isTerminalDeliveryStage(workflow)) {
    return null;
  }

  const promotion =
    core.internal_refs && typeof core.internal_refs === 'object'
      ? /** @type {Record<string, unknown>} */ (core.internal_refs).promotion
      : null;
  const promotionMerged =
    promotion && typeof promotion === 'object' ? promotion.merged === true : null;
  const nextAction =
    asText(core.workflow_next_action) || nextActionForWorkflowState(/** @type {any} */ (workflow));
  const currentBlocker = deriveRecordedBlocker({
    waiting_on: asText(core.waiting_party),
    current_blocker: asText(core.internal_blocker || core.client_safe_blocker) || null,
  });
  const waitingOn = asText(core.waiting_party);
  const protectedGate =
    workflow === 'publishing' ||
    workflow === 'client_approved' ||
    (promotionMerged === false && (workflow === 'publishing' || workflow === 'client_approved'));

  const exceptions = computeDeliveryExceptions(
    {
      waiting_on: waitingOn === 'client' ? 'client' : waitingOn,
      workflow_state: workflow,
      milestone,
      next_action: nextAction,
      next_action_due: null,
      qualification_complete: workflow !== 'intake',
      current_blocker: currentBlocker,
      promotion_merged: promotionMerged,
      native_status: asText(core.status),
    },
    now,
  );

  const milestoneLabel = MILESTONE_META[normalizeMilestone(milestone) || '']?.label || stage;

  return {
    id: `ticket:${id}`,
    source_id: id,
    record_kind: 'general_delivery',
    record_kind_label: deliveryKindLabel('general_delivery'),
    client_business: asText(core.tenant_id) || 'Unknown tenant',
    product_service: asText(core.title) || 'Change / delivery request',
    delivery_stage: workflow || stage || 'unknown',
    owner: asText(core.owner) || 'Unassigned',
    current_blocker: currentBlocker || 'None recorded',
    next_action: nextAction || 'None recorded',
    next_action_due: null,
    review_approval_state: protectedGate
      ? 'Protected deploy approval required'
      : milestoneLabel || workflow || 'In delivery',
    exception_signals: exceptions,
    primary_exception: primaryDeliveryException(exceptions),
    protected_gate: protectedGate,
    protected_action_label: protectedGate ? 'Protected deploy / publish' : '',
    tenant_id: asText(core.tenant_id) || null,
    client_id: null,
    evidence: [
      { label: 'Change Console', href: CHANGE_CONSOLE_PATH, kind: 'safe' },
      { label: 'Request workspace', href: REQUEST_WORKSPACE_PATH, kind: 'safe' },
      { label: 'Clients', href: CLIENTS_SUMMARY_PATH, kind: 'safe' },
      { label: 'Company Master', href: COMPANY_MASTER_PATH, kind: 'reuse' },
    ],
    links: {
      prospect: null,
      clients: CLIENTS_SUMMARY_PATH,
      company_master: COMPANY_MASTER_PATH,
      commercial: COMMERCIAL_EXISTING_PATH,
      change: CHANGE_CONSOLE_PATH,
      product_desk: null,
    },
    source_contract: 'cmp_tickets + console_json',
    fabricated: false,
  };
}

/**
 * @param {Array<Record<string, unknown>>} items
 * @param {string} [filter]
 */
export function filterDeliveryItems(items, filter = 'all') {
  const id = normalizeDeliveryFilter(filter);
  const list = Array.isArray(items) ? items : [];
  if (id === 'all') return list;
  return list.filter((row) => {
    const signals = Array.isArray(row.exception_signals) ? row.exception_signals : [];
    return signals.includes(id) || row.primary_exception === id;
  });
}

/**
 * @param {Array<Record<string, unknown>>} items
 */
export function countDeliveryFilters(items) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const id of DELIVERY_EXCEPTION_FILTERS) {
    counts[id] = filterDeliveryItems(items, id).length;
  }
  return counts;
}

/**
 * @param {Array<Record<string, unknown>>} items
 */
export function sortDeliveryItems(items) {
  const rank = (row) => {
    if (row.protected_gate === true) return 0;
    const primary = asText(row.primary_exception);
    const order = DELIVERY_EXCEPTION_FILTERS.indexOf(/** @type {any} */ (primary));
    return order === -1 ? 80 : order;
  };
  return [...(Array.isArray(items) ? items : [])].sort((a, b) => {
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    return asText(a.client_business).localeCompare(asText(b.client_business));
  });
}

/**
 * @param {{
 *   prospects?: Array<Record<string, unknown>>,
 *   requests?: Array<Record<string, unknown>>,
 *   clients?: Array<Record<string, unknown>>,
 *   now?: Date,
 * }} args
 */
export function projectDeliveryItems(args = {}) {
  const now = args.now instanceof Date ? args.now : new Date();
  const clients = Array.isArray(args.clients) ? args.clients : [];
  /** @type {Array<Record<string, unknown>>} */
  const items = [];
  for (const row of Array.isArray(args.prospects) ? args.prospects : []) {
    const projected = projectProspectToDeliveryItem(row, now, clients);
    if (projected) items.push(projected);
  }
  for (const row of Array.isArray(args.requests) ? args.requests : []) {
    const projected = projectRequestToDeliveryItem(row, now);
    if (projected) items.push(projected);
  }
  return sortDeliveryItems(items);
}

/**
 * @param {{
 *   items: Array<Record<string, unknown>>,
 *   data_source: string,
 *   proof_mode?: boolean,
 *   filter?: string,
 * }} args
 */
export function buildDeliveryPayload(args) {
  const filter = normalizeDeliveryFilter(args.filter);
  const all = Array.isArray(args.items) ? args.items : [];
  const items = filterDeliveryItems(all, filter);
  return {
    ok: true,
    workspace: 'operating',
    path: DELIVERY_PATH,
    view: 'delivery',
    filter,
    filter_counts: countDeliveryFilters(all),
    data_source: args.data_source,
    proof_mode: args.proof_mode === true,
    count: items.length,
    items,
    record_kinds: [...DELIVERY_RECORD_KINDS],
    related_surfaces: {
      clients: CLIENTS_SUMMARY_PATH,
      commercial_existing: COMMERCIAL_EXISTING_PATH,
      commercial_summary_issue: COMMERCIAL_SUMMARY_ISSUE,
      company_master: COMPANY_MASTER_PATH,
      prospects: PROSPECTS_PATH,
      change: CHANGE_CONSOLE_PATH,
      request_workspace: REQUEST_WORKSPACE_PATH,
      lead_rescue_desk: '/admin/lead-rescue',
      website_rescue_desk: '/admin/rapid-delivery',
    },
    protected_actions: {
      client_production_deploy: false,
      live_send: false,
      payment: false,
      schema: false,
      note: 'Deploy, live messaging, payment and schema stay gated. This surface only marks them.',
    },
    external_send: false,
    schema_change: false,
    fragmented_surfaces_reduced: [
      '/admin/lead-rescue',
      '/admin/rapid-delivery',
      '/change',
      '/app/core',
    ],
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
export async function loadDeliverySummary(args) {
  const loaded = await loadProspectOperationsList({
    proofMode: args.proofMode === true,
    now: args.now,
  });
  if (!loaded.ok) {
    return {
      ok: false,
      error: loaded.error,
      data_source: loaded.data_source,
    };
  }
  let listed;
  try {
    listed = await args.listRequests();
  } catch {
    return {
      ok: false,
      error: 'repository_unavailable',
      data_source: loaded.data_source,
    };
  }
  let clients = [];
  try {
    const clientsLoaded = await loadClientsList({ proofMode: args.proofMode === true });
    if (clientsLoaded.ok) clients = clientsLoaded.clients;
  } catch {
    clients = [];
  }
  const items = projectDeliveryItems({
    prospects: loaded.prospects,
    requests: listed.requests,
    clients,
    now: args.now,
  });
  const requestSource = asText(listed.data_source) || DATA_SOURCE_FIXTURE;
  const dataSource =
    loaded.data_source === DATA_SOURCE_FIXTURE && requestSource === DATA_SOURCE_FIXTURE
      ? DATA_SOURCE_FIXTURE
      : `${loaded.data_source}+${requestSource}`;
  return {
    ok: true,
    items,
    data_source: dataSource,
  };
}
