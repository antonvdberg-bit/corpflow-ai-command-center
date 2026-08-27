/**
 * #999 — Operating Workspace Clients summary.
 *
 * Projects existing Company Master companies plus already-recorded
 * prospect / onboarding / service references. No second Client table.
 * No ERPNext write. Staff / Core environment only.
 */

import { assertProspectOperationsAccess } from './prospect-operations-workspace.js';
import {
  ACTION_QUEUE_PATH,
  canAccessOperatingWorkspace,
  CLIENTS_PATH,
  CLIENT_SHARED_DETAIL_PREFIX,
  COMMERCIAL_SUMMARY_PATH,
  COMPANY_MASTER_PATH,
  DELIVERY_PATH,
  PROSPECT_OPERATIONS_PATH,
  PROSPECT_PIPELINE_PATH,
  PROSPECT_WORKBENCH_PATH,
} from './workspace-context.js';

export const DATA_SOURCE_FIXTURE = 'fixture';
export const DATA_SOURCE_COMPANY_MASTER_READ = 'company_master_read';

export { COMPANY_MASTER_PATH };
export const TENANT_DELIVERY_PATH = '/change';
export const COMMERCIAL_SUMMARY_ISSUE = '#1004';
export const DELIVERY_SUMMARY_ISSUE = '#1005';

/**
 * @param {{
 *   proofMode?: boolean,
 *   forceFixture?: boolean,
 *   nodeEnv?: string,
 *   postgresUrl?: string,
 * }} [opts]
 * @returns {'fixture'|'company_master_read'}
 */
export function resolveClientsDataSource(opts = {}) {
  if (opts.forceFixture === true) return DATA_SOURCE_FIXTURE;
  const nodeEnv = String(opts.nodeEnv ?? process.env.NODE_ENV ?? '').trim();
  if (nodeEnv === 'test') return DATA_SOURCE_FIXTURE;
  if (opts.proofMode === true) return DATA_SOURCE_FIXTURE;
  const url = String(opts.postgresUrl ?? '').trim();
  if (!url) return DATA_SOURCE_FIXTURE;
  return DATA_SOURCE_COMPANY_MASTER_READ;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeClientName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Synthetic Company Master-shaped clients for proof / test / no-DB.
 * At least three records. No fabricated commercial or ERPNext identity.
 *
 * @returns {Array<Record<string, unknown>>}
 */
export function fixtureClientRows() {
  return [
    {
      company_id: 'cmp_corpflowai_synthetic',
      tenant_id: 'corpflowai-core',
      company_type: 'PRIVATE_COMPANY',
      jurisdiction: 'MU',
      jurisdiction_label: 'Mauritius',
      lifecycle_status: 'ACTIVE',
      verification_status: 'VERIFIED',
      approval_status: 'APPROVED',
      legal_name: 'CorpFlowAI Synthetic Ltd',
      trading_name: 'CorpFlowAI',
      public_email: 'info@example.invalid',
      public_phone: null,
      website: null,
      record_owner: 'role:company-master-operator',
      is_synthetic: true,
      primary_contact_name: null,
      erpnext_customer: null,
      onboarding_status: 'active_operator_identity',
      next_action: 'Keep Company Master evidence current',
      linked_prospect_ids: [],
    },
    {
      company_id: 'cmp_pilot_client_synthetic',
      tenant_id: null,
      company_type: 'PRIVATE_COMPANY',
      jurisdiction: 'MU',
      jurisdiction_label: 'Mauritius',
      lifecycle_status: 'EVIDENCE_INCOMPLETE',
      verification_status: 'CONFLICTING',
      approval_status: 'PENDING',
      legal_name: 'Pilot Client Synthetic Ltd',
      trading_name: 'Pilot Clients Trading Co',
      public_email: 'pilot-client@example.invalid',
      public_phone: null,
      website: null,
      record_owner: 'role:company-master-operator',
      is_synthetic: true,
      primary_contact_name: null,
      erpnext_customer: null,
      onboarding_status: 'evidence_incomplete',
      next_action: 'Resolve Company Master evidence conflict before commercial onboarding',
      linked_prospect_ids: [],
    },
    {
      company_id: 'cmp_ada_spa_synthetic',
      tenant_id: 'corpflowai',
      company_type: 'PRIVATE_COMPANY',
      jurisdiction: 'MU',
      jurisdiction_label: 'Mauritius',
      lifecycle_status: 'ACTIVE',
      verification_status: 'VERIFIED',
      approval_status: 'APPROVED',
      legal_name: 'Ada Spa Ltd',
      trading_name: 'Ada Spa',
      public_email: 'ada@example.com',
      public_phone: '+2305000000',
      website: null,
      record_owner: 'anton',
      is_synthetic: true,
      primary_contact_name: 'Ada Prospect',
      erpnext_customer: null,
      onboarding_status: 'lead_rescue_in_progress',
      next_action: null,
      linked_prospect_ids: ['syn-772-lr-ada'],
    },
    {
      company_id: 'cmp_bea_boutique_synthetic',
      tenant_id: 'corpflowai',
      company_type: 'PRIVATE_COMPANY',
      jurisdiction: 'MU',
      jurisdiction_label: 'Mauritius',
      lifecycle_status: 'ACTIVE',
      verification_status: 'UNVERIFIED',
      approval_status: 'NOT_REQUESTED',
      legal_name: 'Bea Boutique Ltd',
      trading_name: 'Bea Boutique',
      public_email: 'bea@example.com',
      public_phone: '+2305111111',
      website: 'https://example.com',
      record_owner: 'role:company-master-operator',
      is_synthetic: true,
      primary_contact_name: 'Bea Buyer',
      erpnext_customer: null,
      onboarding_status: 'website_rescue_intake',
      next_action: null,
      linked_prospect_ids: ['syn-772-rd-bea'],
    },
  ];
}

/**
 * @param {Record<string, unknown>} company
 * @param {Array<Record<string, unknown>>} prospects
 * @returns {Array<Record<string, unknown>>}
 */
export function matchProspectsToClient(company, prospects) {
  const list = Array.isArray(prospects) ? prospects : [];
  const explicit = new Set(
    (Array.isArray(company?.linked_prospect_ids) ? company.linked_prospect_ids : [])
      .map((id) => String(id || '').trim())
      .filter(Boolean),
  );
  const names = [company?.legal_name, company?.trading_name]
    .map((value) => normalizeClientName(value))
    .filter(Boolean);
  return list.filter((prospect) => {
    const id = String(prospect?.id || '').trim();
    if (id && explicit.has(id)) return true;
    const org = normalizeClientName(prospect?.organisation_name);
    if (!org || names.length === 0) return false;
    return names.some((name) => name === org);
  });
}

/**
 * @param {Array<Record<string, unknown>>} prospects
 * @returns {Array<{ product: string, stage: string | null, source: string }>}
 */
export function deriveClientServices(prospects) {
  const seen = new Set();
  /** @type {Array<{ product: string, stage: string | null, source: string }>} */
  const services = [];
  for (const prospect of Array.isArray(prospects) ? prospects : []) {
    const product = String(prospect?.product || prospect?.offer_title || prospect?.product_service_path || '')
      .trim();
    if (!product) continue;
    const key = product.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    services.push({
      product,
      stage: prospect?.canonical_stage != null ? String(prospect.canonical_stage) : null,
      source: 'related_prospect',
    });
  }
  return services;
}

/**
 * @param {Record<string, unknown>} company
 * @param {Array<Record<string, unknown>>} prospects
 * @returns {{ next_action: string | null, next_action_source: string | null }}
 */
export function deriveClientNextAction(company, prospects) {
  for (const prospect of Array.isArray(prospects) ? prospects : []) {
    const action = String(prospect?.next_action || prospect?.recommended_next_action || '').trim();
    if (action) {
      return { next_action: action, next_action_source: 'related_prospect' };
    }
  }
  const recorded = String(company?.next_action || '').trim();
  if (recorded) return { next_action: recorded, next_action_source: 'company_master' };
  return { next_action: null, next_action_source: null };
}

/**
 * @param {Record<string, unknown>} company
 * @returns {{ name: string | null, email: string | null, phone: string | null }}
 */
export function derivePrimaryContact(company) {
  const name = String(company?.primary_contact_name || '').trim() || null;
  const email = String(company?.public_email || '').trim() || null;
  const phone = String(company?.public_phone || '').trim() || null;
  return { name, email, phone };
}

/**
 * @param {Record<string, unknown>} company
 * @returns {string}
 */
export function deriveOnboardingStatus(company) {
  const recorded = String(company?.onboarding_status || '').trim();
  if (recorded) return recorded;
  const lifecycle = String(company?.lifecycle_status || '').trim();
  if (lifecycle) return lifecycle.toLowerCase();
  return 'not_recorded';
}

/**
 * @param {Record<string, unknown>} company
 * @param {Array<Record<string, unknown>>} prospects
 * @returns {string | null}
 */
export function deriveDeliveryStatus(company, prospects) {
  const recorded = String(company?.delivery_status || '').trim();
  if (recorded) return recorded;
  for (const prospect of Array.isArray(prospects) ? prospects : []) {
    const stage = String(prospect?.canonical_stage || prospect?.native_status_label || '').trim();
    if (stage) return stage;
  }
  return null;
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function recordedErpnextCustomer(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'object') {
    const row = /** @type {Record<string, unknown>} */ (value);
    const name = String(row.customer_name || row.name || '').trim();
    return name || null;
  }
  return null;
}

/**
 * @param {Record<string, unknown>} company
 * @param {Array<Record<string, unknown>>} [prospects]
 * @returns {Record<string, unknown>}
 */
export function projectClientSummary(company, prospects = []) {
  const related = matchProspectsToClient(company, prospects).map((prospect) => ({
    id: String(prospect.id || ''),
    organisation_name: prospect.organisation_name != null ? String(prospect.organisation_name) : null,
    person_name: prospect.person_name != null ? String(prospect.person_name) : null,
    product: prospect.product != null ? String(prospect.product) : null,
    canonical_stage: prospect.canonical_stage != null ? String(prospect.canonical_stage) : null,
    next_action: prospect.next_action != null ? String(prospect.next_action) : null,
    shared_detail_path: prospect.shared_detail_path != null ? String(prospect.shared_detail_path) : null,
  }));
  const contact = derivePrimaryContact(company);
  const next = deriveClientNextAction(company, related);
  const erpnextCustomer = recordedErpnextCustomer(company.erpnext_customer);
  /** @type {string[]} */
  const missing = [];
  if (!contact.name) missing.push('named_primary_contact');
  if (!erpnextCustomer) missing.push('erpnext_customer_pointer');
  const companyId = String(company.company_id || company.id || '').trim();
  return {
    company_id: companyId,
    legal_name: String(company.legal_name || '').trim() || companyId,
    trading_name: company.trading_name != null ? String(company.trading_name) : null,
    tenant_id: company.tenant_id != null ? String(company.tenant_id) : null,
    company_type: company.company_type != null ? String(company.company_type) : null,
    jurisdiction: company.jurisdiction != null ? String(company.jurisdiction) : null,
    jurisdiction_label: company.jurisdiction_label != null ? String(company.jurisdiction_label) : null,
    lifecycle_status: company.lifecycle_status != null ? String(company.lifecycle_status) : null,
    verification_status: company.verification_status != null ? String(company.verification_status) : null,
    approval_status: company.approval_status != null ? String(company.approval_status) : null,
    onboarding_status: deriveOnboardingStatus(company),
    delivery_status: deriveDeliveryStatus(company, related),
    record_owner: company.record_owner != null ? String(company.record_owner) : null,
    website: company.website != null ? String(company.website) : null,
    is_synthetic: company.is_synthetic === true,
    primary_contact: contact,
    services: deriveClientServices(related),
    next_action: next.next_action,
    next_action_source: next.next_action_source,
    related_prospects: related,
    erpnext_customer: erpnextCustomer,
    missing_fields: missing,
    summary_path: `${CLIENT_SHARED_DETAIL_PREFIX}${encodeURIComponent(companyId)}`,
    company_master_path: COMPANY_MASTER_PATH,
    workspace_context: 'operating',
    commercial_references: {
      status: 'canonical',
      issue: COMMERCIAL_SUMMARY_ISSUE,
      path: COMMERCIAL_SUMMARY_PATH,
      existing_identity_path: COMPANY_MASTER_PATH,
      note: 'Canonical operator Commercial summary is /app/commercial. Company Master remains the identity/evidence hub.',
    },
    delivery_references: {
      status: 'canonical_workspace_module',
      issue: DELIVERY_SUMMARY_ISSUE,
      existing_delivery_path: DELIVERY_PATH,
      tenant_change_path: TENANT_DELIVERY_PATH,
      action_queue_path: ACTION_QUEUE_PATH,
      pipeline_path: PROSPECT_PIPELINE_PATH,
      note: 'Canonical operator Delivery is /app/delivery. Tenant service-request stays at /change.',
    },
  };
}

/**
 * @param {unknown[]} companies
 * @param {Array<Record<string, unknown>>} [prospects]
 * @returns {Array<Record<string, unknown>>}
 */
export function projectClientSummaries(companies, prospects = []) {
  const list = Array.isArray(companies) ? companies : [];
  return list
    .filter((row) => row && typeof row === 'object' && String(row.company_id || row.id || '').trim())
    .map((row) => projectClientSummary(/** @type {Record<string, unknown>} */ (row), prospects));
}

/**
 * @param {import('./access.js').AppActor | null | undefined} actor
 * @returns {{ ok: true } | { ok: false, error: string, http_status: number }}
 */
export function assertClientsAccess(actor) {
  return assertProspectOperationsAccess(actor);
}

export { canAccessOperatingWorkspace };

/**
 * @param {{
 *   clients: Array<Record<string, unknown>>,
 *   data_source: string,
 *   proof_mode?: boolean,
 * }} args
 */
export function buildClientsListPayload(args) {
  const clients = Array.isArray(args.clients) ? args.clients : [];
  return {
    ok: true,
    workspace: 'operating',
    path: CLIENTS_PATH,
    view: 'clients',
    data_source: args.data_source,
    proof_mode: args.proof_mode === true,
    count: clients.length,
    clients,
    canonical_operator_surface: CLIENTS_PATH,
    reduces_fragmented_surfaces: [COMPANY_MASTER_PATH],
    later_slices: {},
    temporary_source_surfaces: {
      commercial: COMMERCIAL_SUMMARY_PATH,
      delivery: DELIVERY_PATH,
      company_master: COMPANY_MASTER_PATH,
      prospect_operations: PROSPECT_OPERATIONS_PATH,
      workbench: PROSPECT_WORKBENCH_PATH,
      action_queue: ACTION_QUEUE_PATH,
      pipeline: PROSPECT_PIPELINE_PATH,
      tenant_delivery: TENANT_DELIVERY_PATH,
    },
    workspace_distinction: {
      operating: 'Cross-client operator summary. Staff only.',
      tenant: 'A Tenant session cannot see this surface or other clients.',
    },
    external_send: false,
    schema_change: false,
    erpnext_write: false,
  };
}

/**
 * @param {{
 *   client: Record<string, unknown>,
 *   data_source: string,
 *   proof_mode?: boolean,
 * }} args
 */
export function buildClientDetailPayload(args) {
  const client = args.client && typeof args.client === 'object' ? args.client : {};
  return {
    ...buildClientsListPayload({
      clients: [client],
      data_source: args.data_source,
      proof_mode: args.proof_mode === true,
    }),
    path: String(client.summary_path || CLIENTS_PATH),
    view: 'client_summary',
    client,
    count: 1,
  };
}
