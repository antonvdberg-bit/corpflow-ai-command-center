/**
 * #1155 — tenant-safe Lead Rescue delivery/onboarding progress.
 *
 * Projects the existing #715 delivery record into the Tenant Workspace
 * Requests & Progress contract. Identity join is explicit tenant_id on the
 * request row only — never business name, email, or shared marketing-lead tenant.
 *
 * The #715 record remains authoritative for delivery_state. This module does
 * not create a second status model, schema, messaging runtime, or portal.
 *
 * Server-only (reads fixtures via process.cwd()). Browser-safe pages must
 * consume the projected AppRequest, not this loader. Config/fixture load
 * uses process.cwd() so this module stays legal on the CJS-wrapped
 * factory_router graph (#1015).
 */

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { payloadContainsForbiddenTenantKeys } from '../app/project.js';

const FIXTURE_DIR_REL = 'fixtures/lead-rescue-onboarding';

export const LEAD_RESCUE_TENANT_PROGRESS_VERSION = 'lead-rescue-tenant-progress-1155-v1';
export const LEAD_RESCUE_TENANT_PROGRESS_ISSUE = 1155;
export const LEAD_RESCUE_SERVICE_NAME = 'Lead Rescue';
export const LEAD_RESCUE_PRODUCT = 'ai-lead-rescue';
export const LEAD_RESCUE_CLIENT_REVIEW_RECORD_ID = 'synthetic-lr-client-review';
export const LEAD_RESCUE_PREVIEW_COMPONENT_KEY = 'lead_rescue_preview';
export const LEAD_RESCUE_VERIFICATION_COMPONENT_KEY = 'lead_rescue_verification';

export const LEAD_RESCUE_TENANT_FORBIDDEN_KEYS = Object.freeze([
  'operator_note',
  'internal_note',
  'internal_blocker',
  'financially_approved',
  'messaging_runtime_authorized',
  'allow_real_client_sends',
  'approved_response_rules',
  'lead_stages',
  'users_operators',
  'current_process_summary',
  'escalation_rules',
  'qualification',
  'qualification_json',
  'ai_lead_rescue_operator',
  'commercial_approval',
  'payment_evidence',
  'payment_evidence_status',
  'payment_evidence_ref',
  'lead_scoring',
  'activity',
  'github',
  'pr_number',
  'commit_sha',
]);

/** Client-safe labels for #715 delivery_states. */
export const LEAD_RESCUE_CLIENT_STAGE_LABELS = Object.freeze({
  approved_to_onboard: 'Setup approved',
  onboarding_in_progress: 'Collecting setup details',
  onboarding_blocked: 'Waiting on you',
  onboarding_complete: 'Setup details complete',
  build_blocked: 'Setup paused',
  build_started: 'Building your Lead Rescue',
  preview_evidence: 'Preparing preview',
  verification_evidence: 'Checking the setup',
  client_review: 'Ready for your review',
  accepted: 'You accepted the setup',
  handover_complete: 'Handover in progress',
  acceptance_ready: 'Lead Rescue is ready',
});

const CLIENT_SAFE_BLOCKED_INPUTS = Object.freeze({
  primary_leaky_source_access_pending: 'Waiting for access to your main enquiry source.',
});

/** @type {Map<string, Record<string, unknown>> | null} */
let deliveryStore = null;

/**
 * @param {unknown} v
 * @returns {string}
 */
function asText(v) {
  if (v == null) return '';
  return String(v).trim();
}

/**
 * @param {unknown} v
 * @returns {Record<string, unknown>}
 */
function asObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? /** @type {Record<string, unknown>} */ (v)
    : {};
}

/**
 * @returns {Map<string, Record<string, unknown>>}
 */
function ensureDeliveryStore() {
  if (deliveryStore) return deliveryStore;
  deliveryStore = new Map();
  const dir = path.join(process.cwd(), FIXTURE_DIR_REL);
  let names = [];
  try {
    names = readdirSync(dir).filter((name) => name.endsWith('.json'));
  } catch {
    names = [];
  }
  for (const name of names) {
    try {
      const parsed = JSON.parse(readFileSync(path.join(dir, name), 'utf8'));
      const id = asText(parsed?.id);
      if (id) deliveryStore.set(id, parsed);
    } catch {
      // Skip unreadable fixtures; fail-closed per record.
    }
  }
  return deliveryStore;
}

/** Reset in-memory delivery records (tests). Reloads fixtures. */
export function resetLeadRescueDeliveryStore() {
  deliveryStore = null;
}

/**
 * @param {string} id
 * @returns {Record<string, unknown> | null}
 */
export function getLeadRescueDeliveryRecord(id) {
  const key = asText(id);
  if (!key) return null;
  const found = ensureDeliveryStore().get(key);
  return found ? structuredClone(found) : null;
}

/**
 * In-memory override for tests proving the #715 record stays authoritative.
 * @param {Record<string, unknown>} record
 */
export function upsertLeadRescueDeliveryRecord(record) {
  const id = asText(record?.id);
  if (!id) return;
  ensureDeliveryStore().set(id, structuredClone(record));
}

/**
 * Explicit identity bind. Missing tenant_id or record_id is the exact blocker —
 * do not invent a join from business name, email, or marketing-lead tenant.
 *
 * @param {{ tenant_id?: unknown, record_id?: unknown }} args
 * @returns {{ ok: true, tenant_id: string, record_id: string } | { ok: false, error: string }}
 */
export function bindLeadRescueDeliveryIdentity(args = {}) {
  const tenantId = asText(args.tenant_id);
  const recordId = asText(args.record_id);
  if (!tenantId) {
    return { ok: false, error: 'missing_tenant_id' };
  }
  if (!recordId) {
    return { ok: false, error: 'missing_delivery_record_id' };
  }
  return { ok: true, tenant_id: tenantId, record_id: recordId };
}

/**
 * @param {unknown} product
 * @returns {string}
 */
export function leadRescueServiceName(product) {
  const p = asText(product);
  if (!p || p === LEAD_RESCUE_PRODUCT || p === 'lead-rescue') return LEAD_RESCUE_SERVICE_NAME;
  return LEAD_RESCUE_SERVICE_NAME;
}

/**
 * @param {unknown} deliveryState
 * @returns {string}
 */
export function leadRescueClientStageLabel(deliveryState) {
  const state = asText(deliveryState);
  return LEAD_RESCUE_CLIENT_STAGE_LABELS[state] || 'In progress';
}

/**
 * @param {Record<string, unknown> | null | undefined} record
 * @returns {string}
 */
export function leadRescueClientNextAction(record) {
  const state = asText(record?.delivery_state);
  switch (state) {
    case 'approved_to_onboard':
      return 'No action needed — setup details come next.';
    case 'onboarding_in_progress':
      return 'Share any remaining setup details.';
    case 'onboarding_blocked':
      return leadRescueClientVisibleBlocker(record) || 'Complete the outstanding setup item.';
    case 'onboarding_complete':
      return 'No action needed — we will start building.';
    case 'build_blocked':
      return 'No action needed — CorpFlowAI will confirm the next step.';
    case 'build_started':
      return 'No action needed — we are building your Lead Rescue.';
    case 'preview_evidence':
      return 'No action needed — preview is being prepared.';
    case 'verification_evidence':
      return 'No action needed — we are checking the setup.';
    case 'client_review':
      return 'Review the Lead Rescue preview.';
    case 'accepted':
      return 'No action needed — handover follows.';
    case 'handover_complete':
      return 'No action needed — finishing handover.';
    case 'acceptance_ready':
      return 'Raise a service or change request if you need something else.';
    default:
      return 'No action needed.';
  }
}

/**
 * Map blocked_inputs / blocked states to client-safe wording. Never emit
 * internal codes, commercial/payment, or operator notes.
 *
 * @param {Record<string, unknown> | null | undefined} record
 * @returns {string | null}
 */
export function leadRescueClientVisibleBlocker(record) {
  const state = asText(record?.delivery_state);
  if (state === 'client_review') {
    return 'Waiting for your review of the Lead Rescue preview.';
  }
  if (state === 'onboarding_blocked') {
    const blocked = Array.isArray(record?.blocked_inputs) ? record.blocked_inputs : [];
    for (const item of blocked) {
      const mapped = CLIENT_SAFE_BLOCKED_INPUTS[asText(item)];
      if (mapped) return mapped;
    }
    return 'Waiting on a setup item from you.';
  }
  if (state === 'build_blocked') {
    return 'Setup cannot start yet. CorpFlowAI will confirm the next step.';
  }
  return null;
}

/**
 * @param {unknown} deliveryState
 * @returns {string}
 */
export function leadRescueWorkflowState(deliveryState) {
  const state = asText(deliveryState);
  switch (state) {
    case 'approved_to_onboard':
    case 'onboarding_in_progress':
    case 'onboarding_blocked':
      return 'intake';
    case 'onboarding_complete':
    case 'build_blocked':
    case 'build_started':
      return 'building';
    case 'preview_evidence':
    case 'verification_evidence':
      return 'preview_ready';
    case 'client_review':
      return 'in_review';
    case 'accepted':
    case 'handover_complete':
      return 'client_approved';
    case 'acceptance_ready':
      return 'published';
    default:
      return 'building';
  }
}

/**
 * @param {unknown} deliveryState
 * @returns {string}
 */
function milestoneForDeliveryState(deliveryState) {
  const state = asText(deliveryState);
  switch (state) {
    case 'approved_to_onboard':
    case 'onboarding_in_progress':
    case 'onboarding_blocked':
      return 'defined';
    case 'onboarding_complete':
    case 'build_blocked':
    case 'build_started':
      return 'in_progress';
    case 'preview_evidence':
    case 'verification_evidence':
      return 'preview_ready';
    case 'client_review':
      return 'client_review';
    case 'accepted':
    case 'handover_complete':
      return 'approved';
    case 'acceptance_ready':
      return 'live_verified';
    default:
      return 'in_progress';
  }
}

/**
 * @param {unknown} payload
 * @returns {boolean}
 */
export function leadRescueTenantProjectionLeaks(payload) {
  if (payloadContainsForbiddenTenantKeys(payload)) return true;
  const s = JSON.stringify(payload || {});
  for (const key of LEAD_RESCUE_TENANT_FORBIDDEN_KEYS) {
    if (s.includes(`"${key}"`)) return true;
  }
  if (
    /financially_approved|messaging_runtime|approved_response_rules|lead scoring|qualification|payment evidence|operator_note/i.test(
      s,
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Tenant-safe client_view from the authoritative #715 record.
 *
 * @param {Record<string, unknown> | null | undefined} record
 * @returns {Record<string, unknown>}
 */
export function projectLeadRescueDeliveryToClientView(record) {
  const row = record && typeof record === 'object' ? record : {};
  const deliveryState = asText(row.delivery_state) || 'approved_to_onboard';
  const stageLabel = leadRescueClientStageLabel(deliveryState);
  const nextAction = leadRescueClientNextAction(row);
  const blocker = leadRescueClientVisibleBlocker(row);
  const workflow = leadRescueWorkflowState(deliveryState);
  const exposePreview = deliveryState === 'client_review';
  const evidence = asObj(row.evidence);
  const hasPreview = Boolean(asObj(evidence.preview).captured_at) || exposePreview;
  const hasVerification = Boolean(asObj(evidence.verification).captured_at);

  /** @type {Array<Record<string, unknown>>} */
  const components = [];
  if (hasPreview) {
    components.push({
      key: LEAD_RESCUE_PREVIEW_COMPONENT_KEY,
      title: 'Lead Rescue preview',
      milestone: exposePreview ? 'client_review' : milestoneForDeliveryState(deliveryState),
      exposed_for_client_review: exposePreview,
      client_safe_summary:
        'Preview of your Lead Rescue lead log and stages is ready to look at.',
      client_safe_status: exposePreview ? 'Ready for your review' : stageLabel,
      attention_required: exposePreview,
      reviews: [],
    });
  }
  if (hasVerification) {
    components.push({
      key: LEAD_RESCUE_VERIFICATION_COMPONENT_KEY,
      title: 'Setup check',
      milestone: milestoneForDeliveryState(deliveryState),
      exposed_for_client_review: false,
      client_safe_summary: 'CorpFlowAI is checking a marked test enquiry on your setup.',
      client_safe_status: 'In progress',
      attention_required: false,
      reviews: [],
    });
  }
  if (components.length === 0) {
    components.push({
      key: 'lead_rescue_setup',
      title: 'Lead Rescue setup',
      milestone: milestoneForDeliveryState(deliveryState),
      exposed_for_client_review: false,
      client_safe_summary: 'CorpFlowAI is working through your Lead Rescue setup.',
      client_safe_status: stageLabel,
      attention_required: false,
      reviews: [],
    });
  }

  return {
    workflow_state: workflow,
    workflow_next_action: nextAction,
    progress_message: stageLabel,
    latest_client_safe_update: stageLabel,
    client_safe_blocker: blocker,
    desired_outcome: 'Lead Rescue setup you can follow and review in Tenant Workspace.',
    service_name: leadRescueServiceName(row.product),
    high_level_stage: deliveryState,
    high_level_stage_label: stageLabel,
    components,
    preview_review: null,
  };
}

/**
 * Merge persisted #884 reviews onto a freshly projected client_view so the
 * delivery record stays authoritative for stage while review decisions survive.
 *
 * @param {Record<string, unknown>} freshView
 * @param {Record<string, unknown> | null | undefined} existingView
 * @returns {Record<string, unknown>}
 */
export function mergeLeadRescueClientViewReviews(freshView, existingView) {
  const fresh = asObj(freshView);
  const existing = asObj(existingView);
  const existingComponents = Array.isArray(existing.components) ? existing.components : [];
  const byKey = new Map(
    existingComponents.map((c) => [asText(c?.key), c && typeof c === 'object' ? c : null]),
  );
  const components = (Array.isArray(fresh.components) ? fresh.components : []).map((comp) => {
    const row = { ...asObj(comp) };
    const prior = byKey.get(asText(row.key));
    const reviews = Array.isArray(prior?.reviews) ? prior.reviews.map((r) => ({ ...asObj(r) })) : [];
    row.reviews = reviews;
    const latest = reviews.length ? reviews[reviews.length - 1] : null;
    const decision = asText(latest?.decision);
    if (decision === 'approve') {
      row.milestone = 'approved';
      row.client_safe_status = 'Approved';
      row.attention_required = false;
    } else if (decision === 'amend') {
      row.milestone = 'changes_requested';
      row.client_safe_status = 'Amendments requested';
      row.attention_required = false;
      row.exposed_for_client_review = true;
    } else if (decision === 'reject') {
      row.milestone = 'changes_requested';
      row.client_safe_status = 'Rejected — needs rework';
      row.attention_required = false;
      row.exposed_for_client_review = true;
    }
    return row;
  });

  const merged = {
    ...fresh,
    components,
  };
  if (asText(existing.latest_client_safe_update) && reviewsPresent(existingComponents)) {
    merged.latest_client_safe_update = existing.latest_client_safe_update;
  }
  if (asText(existing.workflow_state) && reviewsPresent(existingComponents)) {
    merged.workflow_state = existing.workflow_state;
    merged.preview_review = existing.preview_review || null;
    if (Array.isArray(existing.preview_reviews)) {
      merged.preview_reviews = existing.preview_reviews;
    }
  }
  if (
    reviewsPresent(existingComponents) &&
    existingComponents.some((c) => {
      const latest = Array.isArray(c?.reviews) ? c.reviews[c.reviews.length - 1] : null;
      return asText(latest?.decision) === 'approve';
    })
  ) {
    merged.client_safe_blocker = null;
  }
  return merged;
}

/**
 * @param {unknown[]} components
 */
function reviewsPresent(components) {
  return (Array.isArray(components) ? components : []).some(
    (c) => Array.isArray(c?.reviews) && c.reviews.length > 0,
  );
}

/**
 * Overlay the authoritative #715 record onto an AppRequest. Fail closed (leave
 * unchanged) when the bind is missing or the record cannot be loaded.
 *
 * @param {import('../app/request-normalize.js').AppRequest | null} request
 * @returns {import('../app/request-normalize.js').AppRequest | null}
 */
export function hydrateLeadRescueTenantRequest(request) {
  if (!request || typeof request !== 'object') return request;
  const pointer = asObj(request.console_json?.lead_rescue_delivery);
  const bind = bindLeadRescueDeliveryIdentity({
    tenant_id: request.tenant_id,
    record_id: pointer.record_id,
  });
  if (!bind.ok) return request;
  if (asText(pointer.tenant_id) && asText(pointer.tenant_id) !== bind.tenant_id) {
    return request;
  }
  const record = getLeadRescueDeliveryRecord(bind.record_id);
  if (!record) return request;

  const fresh = projectLeadRescueDeliveryToClientView(record);
  const mergedView = mergeLeadRescueClientViewReviews(fresh, request.console_json?.client_view);
  const next = structuredClone(request);
  next.title = `${LEAD_RESCUE_SERVICE_NAME} setup`;
  next.outcome = String(mergedView.desired_outcome || next.outcome);
  next.client_safe_blocker =
    mergedView.client_safe_blocker != null ? String(mergedView.client_safe_blocker) : null;
  next.internal_blocker = null;
  next.attention_required = (Array.isArray(mergedView.components) ? mergedView.components : []).some(
    (c) => c.attention_required === true,
  );
  next.console_json = {
    ...next.console_json,
    lead_rescue_delivery: {
      schema: 'corpflow.lead_rescue_tenant_progress.v1',
      issue: LEAD_RESCUE_TENANT_PROGRESS_ISSUE,
      record_id: bind.record_id,
      tenant_id: bind.tenant_id,
      product: LEAD_RESCUE_PRODUCT,
      source: 'lead_rescue_onboarding_delivery.v1',
    },
    client_view: mergedView,
  };
  return next;
}

/**
 * Build a cmp_tickets-shaped fixture row bound to an existing tenant_id.
 *
 * @param {{
 *   request_id: string,
 *   tenant_id: string,
 *   record_id: string,
 *   updated_at?: string,
 * }} args
 * @returns {Record<string, unknown> | null}
 */
export function buildLeadRescueTenantRequestRow(args) {
  const bind = bindLeadRescueDeliveryIdentity({
    tenant_id: args.tenant_id,
    record_id: args.record_id,
  });
  if (!bind.ok) return null;
  const record = getLeadRescueDeliveryRecord(bind.record_id);
  if (!record) return null;
  const clientView = projectLeadRescueDeliveryToClientView(record);
  if (leadRescueTenantProjectionLeaks(clientView)) {
    throw new Error('lead_rescue_tenant_projection_leak');
  }
  return {
    id: asText(args.request_id),
    tenant_id: bind.tenant_id,
    status: 'Approved',
    stage: 'Build',
    description: `${LEAD_RESCUE_SERVICE_NAME} setup`,
    updated_at: asText(args.updated_at) || '2026-08-27T08:00:00.000Z',
    owner: 'core_operator',
    source: 'fixture',
    client_safe_blocker: clientView.client_safe_blocker,
    internal_blocker: null,
    attention_required: (Array.isArray(clientView.components) ? clientView.components : []).some(
      (c) => c.attention_required === true,
    ),
    console_json: {
      owner: 'core_operator',
      brief: {
        requested_change: String(clientView.desired_outcome || ''),
      },
      lead_rescue_delivery: {
        schema: 'corpflow.lead_rescue_tenant_progress.v1',
        issue: LEAD_RESCUE_TENANT_PROGRESS_ISSUE,
        record_id: bind.record_id,
        tenant_id: bind.tenant_id,
        product: LEAD_RESCUE_PRODUCT,
        source: 'lead_rescue_onboarding_delivery.v1',
      },
      client_view: clientView,
      promotion: { pr_number: 0, merged: false },
      technical_lead: { summary: 'Lead Rescue delivery — Core only.' },
    },
  };
}
