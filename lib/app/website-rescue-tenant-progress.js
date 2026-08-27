/**
 * #1151 — tenant-safe Website Rescue delivery progress.
 *
 * Projects the existing prospect `qualification_json.website_rescue_delivery`
 * record into the Tenant Workspace Requests & Progress contract.
 *
 * Linkage already present: `leads.tenant_id` + authorised tenant session.
 * No schema. No copied cmp_tickets status model. No staff Commercial /
 * Delivery / Prospect APIs opened to Tenant.
 */

import { PrismaClient } from '@prisma/client';

import { detectProspectProduct } from '../cmp/_lib/prospect-operations-view-model.js';
import {
  isWebsiteRescueDeliveryProduct,
  projectWebsiteRescueDeliveryFromQualification,
  resolveFinanciallyApprovedFromQualification,
} from '../website-rescue/onboarding-delivery-record.js';
import { cfg } from '../server/runtime-config.js';
import {
  OTHER_TENANT_ID,
  TENANT_FORBIDDEN_FIELD_KEYS,
} from './constants.js';
import {
  DATA_SOURCE_FIXTURE,
  DATA_SOURCE_LEADS_READ,
  getProspectFixtureById,
  getProspectFixtureRows,
  resolveProspectOperationsDataSource,
} from './prospect-operations-workspace.js';
import { payloadContainsForbiddenTenantKeys } from './project.js';

export const WEBSITE_RESCUE_TENANT_RECORD_KIND = 'website_rescue';
export const WEBSITE_RESCUE_TENANT_SERVICE_NAME = 'Website Rescue';
export const WEBSITE_RESCUE_AUTHORITATIVE_RECORD = 'qualification_json.website_rescue_delivery';

/** Extra keys that must never appear on the tenant Website Rescue slice. */
export const WEBSITE_RESCUE_TENANT_FORBIDDEN_FIELD_KEYS = Object.freeze([
  ...TENANT_FORBIDDEN_FIELD_KEYS,
  'financially_approved',
  'commercially_cleared',
  'commercial_notes',
  'commercial_approval',
  'commercial_clearance',
  'payment_evidence',
  'payment_evidence_ref',
  'payment_evidence_status',
  'payment_exception',
  'operator_note',
  'rapid_delivery_operator',
  'working_email',
  'working_phone',
  'hosting_facts_summary',
  'deploy_approval_simulated',
  'dns_cutover_authorized_simulated',
  'real_dns_cutover_executed',
  'real_client_production_deploy',
  'can_start_build',
  'build_gate_reason',
  'qualificationJson',
  'qualification_json',
  'shared_checklist',
  'erpnext',
  'allowed_next_states',
  'intake_missing',
  'checklist_missing',
]);

const CLIENT_STAGE = Object.freeze({
  approved_to_onboard: Object.freeze({
    label: 'Getting started',
    percent: 10,
    workflow_state: 'intake',
    milestone: 'defined',
  }),
  onboarding_in_progress: Object.freeze({
    label: 'Collecting your details',
    percent: 20,
    workflow_state: 'intake',
    milestone: 'in_progress',
  }),
  onboarding_blocked: Object.freeze({
    label: 'Waiting on your details',
    percent: 18,
    workflow_state: 'blocked',
    milestone: 'blocked',
  }),
  onboarding_complete: Object.freeze({
    label: 'Ready to build',
    percent: 35,
    workflow_state: 'in_progress',
    milestone: 'in_progress',
  }),
  build_blocked: Object.freeze({
    label: 'Build waiting',
    percent: 32,
    workflow_state: 'blocked',
    milestone: 'blocked',
  }),
  build_started: Object.freeze({
    label: 'Build in progress',
    percent: 45,
    workflow_state: 'in_progress',
    milestone: 'in_progress',
  }),
  preview_evidence: Object.freeze({
    label: 'Preview ready',
    percent: 60,
    workflow_state: 'in_review',
    milestone: 'preview_ready',
  }),
  revision_cycle: Object.freeze({
    label: 'Updating from your feedback',
    percent: 55,
    workflow_state: 'in_progress',
    milestone: 'changes_requested',
  }),
  deploy_approval_pending: Object.freeze({
    label: 'Preparing go-live',
    percent: 72,
    workflow_state: 'in_progress',
    milestone: 'in_progress',
  }),
  deploy_approved_simulated: Object.freeze({
    label: 'Preparing go-live',
    percent: 78,
    workflow_state: 'in_progress',
    milestone: 'in_progress',
  }),
  dns_cutover_gated: Object.freeze({
    label: 'Preparing go-live',
    percent: 82,
    workflow_state: 'in_progress',
    milestone: 'in_progress',
  }),
  live_validation_simulated: Object.freeze({
    label: 'Checking the live site',
    percent: 88,
    workflow_state: 'in_progress',
    milestone: 'in_progress',
  }),
  accepted: Object.freeze({
    label: 'Accepted',
    percent: 94,
    workflow_state: 'client_approved',
    milestone: 'approved',
  }),
  handover_complete: Object.freeze({
    label: 'Handed over',
    percent: 98,
    workflow_state: 'published',
    milestone: 'live_verified',
  }),
  acceptance_ready: Object.freeze({
    label: 'Complete',
    percent: 100,
    workflow_state: 'published',
    milestone: 'live_verified',
  }),
});

/** @type {PrismaClient | null} */
let defaultPrisma = null;

function getDefaultPrisma() {
  if (!defaultPrisma) defaultPrisma = new PrismaClient();
  return defaultPrisma;
}

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
  return v && typeof v === 'object' && !Array.isArray(v) ? /** @type {Record<string, unknown>} */ (v) : {};
}

/**
 * @param {unknown} row
 * @returns {string}
 */
export function tenantIdOfLead(row) {
  const rec = asObj(row);
  return asText(rec.tenantId || rec.tenant_id);
}

/**
 * @param {unknown} qualificationJson
 * @returns {boolean}
 */
export function isAuthorisedWebsiteRescueClient(qualificationJson) {
  const product = detectProspectProduct(qualificationJson);
  if (!isWebsiteRescueDeliveryProduct(product)) return false;
  return resolveFinanciallyApprovedFromQualification(qualificationJson) === true;
}

/**
 * @param {unknown} evidence
 * @returns {{ href: string, captured_at: string | null } | null}
 */
export function readDeliberatelyExposedPreview(evidence) {
  const preview = asObj(asObj(evidence).preview);
  if (preview.exposed_for_client_review !== true) return null;
  const href = asText(preview.preview_url_or_artefact);
  if (!href) return null;
  return {
    href,
    captured_at: asText(preview.captured_at) || null,
  };
}

/**
 * @param {string} deliveryState
 * @param {string[]} blockers
 * @param {{ previewExposed: boolean, intakeComplete: boolean, contentReady: boolean, accessReady: boolean }} flags
 */
function clientSafeCopy(deliveryState, blockers, flags) {
  const stage = CLIENT_STAGE[deliveryState] || CLIENT_STAGE.approved_to_onboard;
  const waitingOnClient =
    blockers.includes('MISSING_REQUIRED_CLIENT_INPUTS') ||
    blockers.includes('MISSING_CONTENT_OR_ASSETS') ||
    blockers.includes('MISSING_APPROVED_ACCESS') ||
    flags.intakeComplete === false ||
    flags.contentReady === false;

  if (deliveryState === 'preview_evidence' && flags.previewExposed) {
    return {
      ...stage,
      next_action: 'Review your Website Rescue preview, then use Service & change if you want changes.',
      client_safe_blocker: null,
      latest_client_safe_update: 'Your Website Rescue preview is ready to look at.',
      progress_message: 'Preview is ready for your review.',
      attention_required: true,
    };
  }
  if (deliveryState === 'preview_evidence') {
    return {
      ...stage,
      label: 'Preview in progress',
      next_action: 'CorpFlowAI will show the preview here when it is ready for you.',
      client_safe_blocker: null,
      latest_client_safe_update: 'CorpFlowAI is preparing your preview.',
      progress_message: 'Preview is being prepared.',
      attention_required: false,
    };
  }
  if (waitingOnClient && (deliveryState === 'approved_to_onboard' || deliveryState === 'onboarding_in_progress' || deliveryState === 'onboarding_blocked' || deliveryState === 'build_blocked')) {
    const blocker = blockers.includes('MISSING_CONTENT_OR_ASSETS')
      ? 'Please share the remaining content or brand assets.'
      : 'Please share the remaining website details we asked for.';
    return {
      ...stage,
      next_action: blocker,
      client_safe_blocker: blocker,
      latest_client_safe_update: 'Website Rescue is waiting on information from you.',
      progress_message: blocker,
      attention_required: true,
    };
  }
  if (deliveryState === 'revision_cycle') {
    return {
      ...stage,
      next_action: 'CorpFlowAI is applying your feedback. Use Service & change if you need to add more.',
      client_safe_blocker: null,
      latest_client_safe_update: 'Your requested changes are being applied.',
      progress_message: 'Updates from your feedback are in progress.',
      attention_required: false,
    };
  }
  if (deliveryState === 'accepted' || deliveryState === 'handover_complete' || deliveryState === 'acceptance_ready') {
    return {
      ...stage,
      next_action: 'No remaining client action on this Website Rescue delivery.',
      client_safe_blocker: null,
      latest_client_safe_update: 'Website Rescue delivery is complete.',
      progress_message: 'Website Rescue delivery is complete.',
      attention_required: false,
    };
  }
  return {
    ...stage,
    next_action: 'CorpFlowAI is completing the next Website Rescue step.',
    client_safe_blocker: null,
    latest_client_safe_update: `Current stage: ${stage.label}.`,
    progress_message: `Website Rescue is in ${stage.label.toLowerCase()}.`,
    attention_required: false,
  };
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function payloadContainsForbiddenWebsiteRescueTenantKeys(value) {
  if (payloadContainsForbiddenTenantKeys(value)) return true;
  const s = JSON.stringify(value || {});
  for (const key of WEBSITE_RESCUE_TENANT_FORBIDDEN_FIELD_KEYS) {
    if (s.includes(`"${key}"`)) return true;
  }
  if (
    /PAY-EV-|SAL-QTN-|ACC-SINV-|commercial_notes|operator_note|financially_approved|payment_evidence/i.test(
      s,
    )
  ) {
    return true;
  }
  return false;
}

/**
 * @param {unknown} row
 * @param {string} tenantId
 * @returns {Record<string, unknown> | null}
 */
export function projectTenantWebsiteRescueProgress(row, tenantId) {
  const tid = asText(tenantId);
  if (!tid) return null;
  if (tenantIdOfLead(row) !== tid) return null;

  const rec = asObj(row);
  const requestId = asText(rec.id);
  if (!requestId) return null;

  const qj = rec.qualificationJson != null ? rec.qualificationJson : rec.qualification_json;
  if (!isAuthorisedWebsiteRescueClient(qj)) return null;

  const staff = projectWebsiteRescueDeliveryFromQualification(qj);
  if (!staff) return null;

  const evidence = asObj(staff.evidence);
  const exposedPreview = readDeliberatelyExposedPreview(evidence);
  const copy = clientSafeCopy(asText(staff.delivery_state) || 'approved_to_onboard', Array.isArray(staff.blockers) ? staff.blockers : [], {
    previewExposed: Boolean(exposedPreview),
    intakeComplete: staff.intake_complete === true,
    contentReady: staff.content_assets_ready === true,
    accessReady: staff.approved_access_confirmed === true,
  });

  const intake = asObj(staff.intake);
  const businessName = asText(intake.business_display_name) || asText(asObj(asObj(qj).intake_meta).business_name);
  const title = businessName
    ? `${WEBSITE_RESCUE_TENANT_SERVICE_NAME} — ${businessName}`
    : WEBSITE_RESCUE_TENANT_SERVICE_NAME;

  const previewComponent = {
    key: 'website_rescue_preview',
    title: 'Website preview',
    milestone: exposedPreview ? 'preview_ready' : copy.milestone,
    milestone_label: exposedPreview ? 'Preview ready' : copy.label,
    review_state: exposedPreview ? 'awaiting_client' : 'view_only',
    exposed_for_client_review: false,
    client_safe_summary: exposedPreview
      ? 'Your Website Rescue preview is ready to look at.'
      : 'The preview will appear here when CorpFlowAI opens it for you.',
    client_safe_status: exposedPreview ? 'Preview ready' : copy.label,
    attention_required: exposedPreview,
    review_enabled: false,
    view_only: true,
    latest_review: null,
    exposed_evidence: exposedPreview
      ? {
          kind: 'preview',
          href: exposedPreview.href,
          captured_at: exposedPreview.captured_at,
        }
      : null,
  };

  const deliveryComponent = {
    key: 'website_rescue_stage',
    title: 'Delivery progress',
    milestone: copy.milestone,
    milestone_label: copy.label,
    review_state: 'view_only',
    exposed_for_client_review: false,
    client_safe_summary: `Current Website Rescue stage: ${copy.label}.`,
    client_safe_status: copy.label,
    attention_required: copy.attention_required === true && !exposedPreview,
    review_enabled: false,
    view_only: true,
    latest_review: null,
    exposed_evidence: null,
  };

  const components = [deliveryComponent, previewComponent];
  const completeCount = copy.percent >= 100 ? 2 : copy.percent >= 60 && exposedPreview ? 1 : 0;
  const remainingCount = 2 - completeCount;

  const projection = {
    scope: 'tenant',
    request_id: requestId,
    tenant_id: tid,
    title,
    outcome: 'A professional Website Rescue delivered through CorpFlowAI, with a clear next step for you.',
    workflow_state: copy.workflow_state,
    progress_message: copy.progress_message,
    latest_client_safe_update: copy.latest_client_safe_update,
    progress: {
      percent: copy.percent,
      complete_count: completeCount,
      remaining_count: remainingCount,
      total_count: 2,
      complete_keys: completeCount === 2 ? ['website_rescue_stage', 'website_rescue_preview'] : completeCount === 1 ? ['website_rescue_stage'] : [],
      remaining_keys:
        completeCount === 2
          ? []
          : completeCount === 1
            ? ['website_rescue_preview']
            : ['website_rescue_stage', 'website_rescue_preview'],
    },
    next_action: copy.next_action,
    client_safe_blocker: copy.client_safe_blocker,
    attention_required: copy.attention_required === true,
    components,
    service_name: WEBSITE_RESCUE_TENANT_SERVICE_NAME,
    delivery_stage: copy.label,
    preview_review_ready: Boolean(exposedPreview),
    record_kind: WEBSITE_RESCUE_TENANT_RECORD_KIND,
    authoritative_record: WEBSITE_RESCUE_AUTHORITATIVE_RECORD,
    change_follow_up: true,
  };

  if (payloadContainsForbiddenWebsiteRescueTenantKeys(projection)) {
    throw new Error('tenant_website_rescue_projection_leak');
  }
  return projection;
}

/**
 * List-row shape matching `projectTenantRequestList`, plus Website Rescue fields.
 * @param {Record<string, unknown>} full
 */
export function toTenantWebsiteRescueListItem(full) {
  return {
    request_id: full.request_id,
    tenant_id: full.tenant_id,
    title: full.title,
    outcome: full.outcome,
    progress_percent: full.progress && typeof full.progress === 'object' ? /** @type {Record<string, unknown>} */ (full.progress).percent : 0,
    attention_required: full.attention_required,
    client_safe_blocker: full.client_safe_blocker,
    next_action: full.next_action,
    latest_client_safe_update: full.latest_client_safe_update,
    workflow_state: full.workflow_state,
    service_name: full.service_name,
    delivery_stage: full.delivery_stage,
    preview_review_ready: full.preview_review_ready === true,
    record_kind: WEBSITE_RESCUE_TENANT_RECORD_KIND,
  };
}

/**
 * @param {unknown[]} rows
 * @param {string} tenantId
 */
export function projectTenantWebsiteRescueProgressList(rows, tenantId) {
  const tid = asText(tenantId);
  if (!tid) return [];
  /** @type {Array<Record<string, unknown>>} */
  const out = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const full = projectTenantWebsiteRescueProgress(row, tid);
    if (!full) continue;
    out.push(toTenantWebsiteRescueListItem(full));
  }
  return out;
}

/**
 * @param {{
 *   tenantId: string,
 *   proofMode?: boolean,
 *   forceFixture?: boolean,
 *   nodeEnv?: string,
 *   prisma?: import('@prisma/client').PrismaClient,
 * }} opts
 */
async function loadLeadRowsForTenant(opts) {
  const tenantId = asText(opts.tenantId);
  const dataSource = resolveProspectOperationsDataSource({
    proofMode: opts.proofMode === true,
    forceFixture: opts.forceFixture === true,
    nodeEnv: opts.nodeEnv,
    postgresUrl: cfg('POSTGRES_URL', ''),
  });
  if (!tenantId) {
    return { ok: true, data_source: dataSource, rows: [] };
  }
  if (dataSource === DATA_SOURCE_FIXTURE) {
    const rows = getProspectFixtureRows().filter((row) => tenantIdOfLead(row) === tenantId);
    return { ok: true, data_source: DATA_SOURCE_FIXTURE, rows };
  }
  try {
    const db = opts.prisma || getDefaultPrisma();
    const rows = await db.lead.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    return { ok: true, data_source: DATA_SOURCE_LEADS_READ, rows };
  } catch {
    return { ok: false, error: 'repository_unavailable', data_source: DATA_SOURCE_LEADS_READ, rows: [] };
  }
}

/**
 * @param {{
 *   tenantId: string,
 *   proofMode?: boolean,
 *   forceFixture?: boolean,
 *   nodeEnv?: string,
 *   prisma?: import('@prisma/client').PrismaClient,
 * }} opts
 */
export async function listTenantWebsiteRescueProgress(opts) {
  const loaded = await loadLeadRowsForTenant(opts);
  if (!loaded.ok) {
    return { ok: false, error: loaded.error, data_source: loaded.data_source, items: [] };
  }
  return {
    ok: true,
    data_source: loaded.data_source,
    items: projectTenantWebsiteRescueProgressList(loaded.rows, opts.tenantId),
  };
}

/**
 * @param {{
 *   id: string,
 *   tenantId: string,
 *   proofMode?: boolean,
 *   forceFixture?: boolean,
 *   nodeEnv?: string,
 *   prisma?: import('@prisma/client').PrismaClient,
 * }} opts
 */
export async function getTenantWebsiteRescueProgress(opts) {
  const id = asText(opts.id);
  const tenantId = asText(opts.tenantId);
  const dataSource = resolveProspectOperationsDataSource({
    proofMode: opts.proofMode === true,
    forceFixture: opts.forceFixture === true,
    nodeEnv: opts.nodeEnv,
    postgresUrl: cfg('POSTGRES_URL', ''),
  });
  if (!id || !tenantId) {
    return { ok: false, error: 'request_not_found', data_source: dataSource, request: null };
  }
  /** @type {Record<string, unknown> | null} */
  let row = null;
  if (dataSource === DATA_SOURCE_FIXTURE) {
    row = getProspectFixtureById(id);
  } else {
    try {
      const db = opts.prisma || getDefaultPrisma();
      row = await db.lead.findUnique({ where: { id } });
    } catch {
      return { ok: false, error: 'repository_unavailable', data_source: DATA_SOURCE_LEADS_READ, request: null };
    }
  }
  if (!row || tenantIdOfLead(row) !== tenantId) {
    return { ok: false, error: 'request_not_found', data_source: dataSource, request: null };
  }
  const request = projectTenantWebsiteRescueProgress(row, tenantId);
  if (!request) {
    return { ok: false, error: 'request_not_found', data_source: dataSource, request: null };
  }
  return { ok: true, data_source: dataSource, request };
}

/**
 * Tickets stay first. Website Rescue rows append when the id is not already present.
 * @param {Array<Record<string, unknown>>} ticketList
 * @param {Array<Record<string, unknown>>} wrList
 */
export function mergeTenantProgressLists(ticketList, wrList) {
  const tickets = Array.isArray(ticketList) ? ticketList : [];
  const wr = Array.isArray(wrList) ? wrList : [];
  const seen = new Set(tickets.map((row) => asText(row.request_id)));
  const extra = wr.filter((row) => {
    const id = asText(row.request_id);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return [...tickets, ...extra];
}

export { OTHER_TENANT_ID };
