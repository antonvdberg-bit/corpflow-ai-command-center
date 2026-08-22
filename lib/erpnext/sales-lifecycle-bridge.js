/**
 * ERPNext WP2 sales lifecycle bridge (#1018).
 *
 * CorpFlowAI prospect → ERPNext Lead → Opportunity → existing/reused Customer.
 * Reuses WP1 Frappe client, Customer bridge, and qualification_json.erpnext pointer.
 * Operator/factory invoked. No cron. No schema. No quotation. No secret logging.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  asTrimmedString,
  listForbiddenSecretKeys,
  loadErpnextClientMasterConfig,
  normalizeCustomerName,
  normalizeEmail,
  splitPersonName,
} from './client-master.js';
import {
  createMemoryReferenceStore,
  isForbiddenLiveCustomerName,
  mergeErpnextPointerIntoQualificationJson,
  reconcileQualifiedCustomer,
  rowMatchesFrappeFilter,
} from './customer-bridge.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../..');
const CONFIG_REL = 'config/erpnext-sales-lifecycle-bridge.v1.json';

export const CANONICAL_VERDICT = 'WP2 SALES LIFECYCLE BRIDGE READY FOR REVIEW';
export const POINTER_SCHEMA = 'corpflow.qualification.erpnext.v1';
export const BRIDGE_ID = 'lead_opportunity_promotion';
export { createMemoryReferenceStore, rowMatchesFrappeFilter };

/** @type {ReturnType<typeof loadConfig> | null} */
let cachedConfig = null;

function loadConfig(repoRoot = REPO_ROOT) {
  return JSON.parse(readFileSync(path.join(repoRoot, CONFIG_REL), 'utf8'));
}

export function loadSalesLifecycleBridgeConfig(repoRoot = REPO_ROOT) {
  if (cachedConfig && repoRoot === REPO_ROOT) return cachedConfig;
  const parsed = loadConfig(repoRoot);
  if (repoRoot === REPO_ROOT) cachedConfig = parsed;
  return parsed;
}

export function resetSalesLifecycleBridgeConfigCache() {
  cachedConfig = null;
}

function asString(v) {
  return asTrimmedString(v);
}

export function buildSalesLifecycleIdempotencyKey(leadId, repoRoot = REPO_ROOT) {
  const prefix = asString(loadSalesLifecycleBridgeConfig(repoRoot).idempotency_prefix) || 'corpflow.sales_lifecycle.v1';
  return `${prefix}:lead=${asString(leadId)}`;
}

export function classifyLifecycleStage(stage, repoRoot = REPO_ROOT) {
  const stages = loadSalesLifecycleBridgeConfig(repoRoot).stages || {};
  const value = asString(stage);
  for (const [cls, aliases] of Object.entries(stages)) {
    if (Array.isArray(aliases) && aliases.includes(value)) return cls;
  }
  return 'unknown';
}

export function lifecyclePlan(stage, repoRoot = REPO_ROOT) {
  const cfg = loadSalesLifecycleBridgeConfig(repoRoot);
  const cls = classifyLifecycleStage(stage, repoRoot);
  const createOpportunity = (cfg.create_opportunity_classes || []).includes(cls);
  const createCustomer = (cfg.create_customer_classes || []).includes(cls);
  return {
    class: cls,
    known: cls !== 'unknown',
    create_lead: cls !== 'unknown',
    create_opportunity: createOpportunity,
    update_opportunity_if_exists: cls === 'lost' || createOpportunity,
    create_customer: createCustomer,
    lead_status: asString(cfg.lead_status?.[cls]) || 'Open',
    opportunity_status: asString(cfg.opportunity_status?.[cls]) || 'Open',
  };
}

function auditEvent(fields) {
  return {
    at: fields.at,
    action: fields.action,
    ok: fields.ok === true,
    reason: asString(fields.reason),
    http: fields.http == null ? null : Number(fields.http),
    doctype: asString(fields.doctype || ''),
    name: asString(fields.name || ''),
    error: asString(fields.error || ''),
  };
}

function fail(code, extra = {}) {
  return {
    ok: false,
    action: extra.action || 'NONE',
    reason: code,
    lifecycle_class: extra.lifecycle_class || null,
    erpnext_lead: extra.erpnext_lead || null,
    erpnext_opportunity: extra.erpnext_opportunity || null,
    customer: extra.customer || null,
    contact: extra.contact || null,
    address: extra.address || null,
    pointer: null,
    pointer_persisted: false,
    postgres_persist: 'not_written',
    duplicate_lead_count: extra.duplicate_lead_count || 0,
    duplicate_opportunity_count: extra.duplicate_opportunity_count || 0,
    duplicate_customer_count: extra.duplicate_customer_count || 0,
    readback: extra.readback || null,
    audit: extra.audit || [],
    error: code,
    ...extra,
  };
}

function isSkippableSearchError(result) {
  const http = Number(result?.http) || 0;
  return http === 403 || http === 404 || http === 417;
}

function uniqueRows(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const name = asString(row?.name);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(row);
  }
  return out;
}

function pickAllowed(payload, allowed) {
  const keys = new Set(allowed || []);
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const key of keys) {
    if (payload[key] !== undefined) out[key] = payload[key];
  }
  return out;
}

export function extractCorpflowLeadIdFromText(text) {
  const match = asString(text).match(/corpflow\.sales_lifecycle\.v1:lead=([^\s|]+)/i);
  return match ? asString(match[1]) : '';
}

export function opportunityTitleFor(companyName, leadId) {
  return `CF1018 ${asString(companyName)} [${asString(leadId)}]`;
}

function buildLeadPayload(intake, plan, leadId, idempotencyKey) {
  const person = splitPersonName(asString(intake.primary_contact_name));
  const companyName = asString(intake.legal_name) || asString(intake.business_display_name);
  return {
    doctype: 'Lead',
    first_name: person.first_name || 'Synthetic',
    last_name: person.last_name || undefined,
    email_id: asString(intake.working_email) || undefined,
    company_name: companyName,
    status: plan.lead_status,
    website: asString(intake.website) || undefined,
    mobile_no: asString(intake.working_whatsapp) || asString(intake.working_phone) || undefined,
    whatsapp_no: asString(intake.working_whatsapp) || undefined,
    utm_content: idempotencyKey,
  };
}

function buildOpportunityPayload(intake, plan, leadId, leadName, idempotencyKey) {
  const companyName = asString(intake.legal_name) || asString(intake.business_display_name);
  const defaults = loadErpnextClientMasterConfig().defaults || {};
  return {
    doctype: 'Opportunity',
    opportunity_from: 'Lead',
    party_name: leadName,
    opportunity_type: 'Sales',
    status: plan.opportunity_status,
    title: opportunityTitleFor(companyName, leadId),
    currency: asString(intake.default_currency) || defaults.company_default_currency || 'MUR',
    utm_content: idempotencyKey,
  };
}

/**
 * @param {object} client
 * @param {{ email?: string, company_name: string, idempotency_key: string, lead_id: string }} candidate
 */
export async function searchExistingLeadIdentity(client, candidate) {
  const fields = [
    'name',
    'first_name',
    'last_name',
    'email_id',
    'company_name',
    'status',
    'website',
    'utm_source',
    'utm_campaign',
    'utm_content',
  ];
  const searches = [
    client.list('Lead', {
      fields,
      filters: [['utm_content', '=', candidate.idempotency_key]],
      limit: 20,
    }),
    client.list('Lead', {
      fields,
      filters: [['email_id', '=', candidate.email]],
      limit: 20,
    }),
    client.list('Lead', {
      fields,
      filters: [['company_name', '=', candidate.company_name]],
      limit: 20,
    }),
  ];
  const results = await Promise.all(searches);
  const usable = [];
  for (const result of results) {
    if (result.ok) {
      usable.push(result);
      continue;
    }
    if (isSkippableSearchError(result)) continue;
    return { ok: false, error: 'SEARCH_FAILED', http: result.http, leads: [] };
  }
  if (!usable.length) {
    return { ok: false, error: 'SEARCH_FAILED', http: results[0]?.http || 0, leads: [] };
  }
  const leads = uniqueRows(usable.flatMap((result) => result.rows || []));
  return { ok: true, error: null, http: 200, leads };
}

/**
 * @param {object} client
 * @param {{ lead_id: string, idempotency_key: string, lead_name?: string, title?: string }} candidate
 */
export async function searchExistingOpportunityIdentity(client, candidate) {
  const fields = ['name', 'title', 'opportunity_from', 'party_name', 'status', 'currency', 'utm_content', 'utm_campaign'];
  const searches = [
    client.list('Opportunity', {
      fields,
      filters: [['utm_content', '=', candidate.idempotency_key]],
      limit: 20,
    }),
    client.list('Opportunity', {
      fields,
      filters: [['title', 'like', `%${candidate.lead_id}%`]],
      limit: 20,
    }),
  ];
  if (candidate.lead_name) {
    searches.push(
      client.list('Opportunity', {
        fields,
        filters: [
          ['opportunity_from', '=', 'Lead'],
          ['party_name', '=', candidate.lead_name],
        ],
        limit: 20,
      }),
    );
  }
  const results = await Promise.all(searches);
  const usable = [];
  for (const result of results) {
    if (result.ok) {
      usable.push(result);
      continue;
    }
    if (isSkippableSearchError(result)) continue;
    return { ok: false, error: 'SEARCH_FAILED', http: result.http, opportunities: [] };
  }
  if (!usable.length) {
    return { ok: false, error: 'SEARCH_FAILED', http: results[0]?.http || 0, opportunities: [] };
  }
  const opportunities = uniqueRows(usable.flatMap((result) => result.rows || []));
  return { ok: true, error: null, http: 200, opportunities };
}

function rowIdempotencyText(row) {
  return `${asString(row?.utm_content)} ${asString(row?.notes)} ${asString(row?.title)}`;
}

function decideLeadAction(leads, candidate) {
  const email = normalizeEmail(candidate.email);
  const company = normalizeCustomerName(candidate.company_name);
  const sameKey = leads.filter((row) => rowIdempotencyText(row).includes(candidate.idempotency_key));
  if (sameKey.length) {
    return { action: 'UPDATE', reason: 'MATCH_IDEMPOTENCY_KEY', canonical: asString(sameKey[0].name), row: sameKey[0] };
  }
  const emailHits = email ? leads.filter((row) => normalizeEmail(row.email_id) === email) : [];
  for (const hit of emailHits) {
    const otherId = extractCorpflowLeadIdFromText(rowIdempotencyText(hit));
    if (otherId && otherId !== candidate.lead_id) {
      return { action: 'CONFLICT', reason: 'LEAD_EMAIL_OWNED_BY_OTHER_CORPFLOW_REF', canonical: asString(hit.name), row: hit };
    }
    if (!otherId) {
      return { action: 'CONFLICT', reason: 'LEAD_EMAIL_PREEXISTING_WITHOUT_CORPFLOW_REF', canonical: asString(hit.name), row: hit };
    }
  }
  const companyHits = leads.filter((row) => normalizeCustomerName(row.company_name) === company);
  for (const hit of companyHits) {
    const otherId = extractCorpflowLeadIdFromText(rowIdempotencyText(hit));
    if (otherId && otherId !== candidate.lead_id) {
      return { action: 'CONFLICT', reason: 'LEAD_COMPANY_OWNED_BY_OTHER_CORPFLOW_REF', canonical: asString(hit.name), row: hit };
    }
    if (!otherId && email && normalizeEmail(hit.email_id) && normalizeEmail(hit.email_id) !== email) {
      return { action: 'CONFLICT', reason: 'LEAD_COMPANY_PREEXISTING_DIFFERENT_EMAIL', canonical: asString(hit.name), row: hit };
    }
  }
  return { action: 'CREATE', reason: 'NO_MATCH', canonical: null, row: null };
}

function decideOpportunityAction(opportunities, candidate) {
  const sameKey = opportunities.filter((row) => rowIdempotencyText(row).includes(candidate.idempotency_key));
  if (sameKey.length) {
    return { action: 'UPDATE', reason: 'MATCH_IDEMPOTENCY_KEY', canonical: asString(sameKey[0].name), row: sameKey[0] };
  }
  const titleHits = opportunities.filter((row) => asString(row.title).includes(candidate.lead_id));
  for (const hit of titleHits) {
    const otherId = extractCorpflowLeadIdFromText(rowIdempotencyText(hit));
    if (otherId && otherId !== candidate.lead_id) {
      return { action: 'CONFLICT', reason: 'OPPORTUNITY_TITLE_OWNED_BY_OTHER_CORPFLOW_REF', canonical: asString(hit.name), row: hit };
    }
    return { action: 'UPDATE', reason: 'MATCH_TITLE', canonical: asString(hit.name), row: hit };
  }
  const partyHits = candidate.lead_name
    ? opportunities.filter((row) => asString(row.party_name) === candidate.lead_name)
    : [];
  for (const hit of partyHits) {
    const otherId = extractCorpflowLeadIdFromText(rowIdempotencyText(hit));
    if (otherId && otherId !== candidate.lead_id) {
      return { action: 'CONFLICT', reason: 'OPPORTUNITY_PARTY_OWNED_BY_OTHER_CORPFLOW_REF', canonical: asString(hit.name), row: hit };
    }
    if (!otherId) {
      return { action: 'CONFLICT', reason: 'OPPORTUNITY_PARTY_PREEXISTING_WITHOUT_CORPFLOW_REF', canonical: asString(hit.name), row: hit };
    }
  }
  return { action: 'CREATE', reason: 'NO_MATCH', canonical: null, row: null };
}

async function persistPointer(referenceStore, leadId, stage, pointer) {
  if (!referenceStore || typeof referenceStore.getLead !== 'function' || typeof referenceStore.saveLead !== 'function') {
    return false;
  }
  const existing = referenceStore.getLead(leadId) || { id: leadId, stage, synthetic: true };
  referenceStore.saveLead({
    ...existing,
    id: leadId,
    stage,
    synthetic: true,
    qualification_json: mergeErpnextPointerIntoQualificationJson(existing.qualification_json, pointer),
  });
  return true;
}

/**
 * Reconcile one CorpFlowAI sales-lifecycle event into ERPNext Lead / Opportunity / Customer.
 *
 * @param {Record<string, unknown>} event
 * @param {{ client: object, referenceStore?: object, now?: string, repoRoot?: string, allowRealCustomer?: boolean }} opts
 */
export async function reconcileSalesLifecycle(event, opts) {
  const repoRoot = opts.repoRoot || REPO_ROOT;
  const now = asString(opts.now) || new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const client = opts.client;
  const referenceStore = opts.referenceStore;
  const audit = [];
  const cfg = loadSalesLifecycleBridgeConfig(repoRoot);
  loadErpnextClientMasterConfig(repoRoot);

  const leadId = asString(event.lead_id || event.id);
  const stage = asString(event.stage);
  const intake = event.intake && typeof event.intake === 'object' ? { ...event.intake } : { ...event };
  const synthetic = event.synthetic === true || intake.synthetic === true;
  const plan = lifecyclePlan(stage, repoRoot);

  if (!leadId) return fail('LEAD_ID_REQUIRED', { audit });
  if (!plan.known) return fail('STAGE_UNKNOWN', { audit, stage, lifecycle_class: plan.class });
  if (!synthetic && opts.allowRealCustomer !== true) {
    return fail('REAL_PROSPECT_REQUIRES_ANTON', { audit, lifecycle_class: plan.class });
  }

  const secrets = listForbiddenSecretKeys(intake);
  if (secrets.length) return fail('SECRET_FIELDS_FORBIDDEN', { audit, secret_field_names: secrets, lifecycle_class: plan.class });

  intake.synthetic = true;
  intake.issue = intake.issue || 1018;
  intake.external_ref = asString(intake.external_ref) || leadId;

  const companyName = asString(intake.legal_name) || asString(intake.business_display_name);
  if (!companyName) return fail('COMPANY_NAME_REQUIRED', { audit, lifecycle_class: plan.class });
  if (isForbiddenLiveCustomerName(companyName, repoRoot) || (cfg.forbidden_customer_names || []).some((name) => asString(name).toLowerCase() === companyName.toLowerCase())) {
    return fail('FORBIDDEN_CUSTOMER_NAME', { audit, customer_name: companyName, lifecycle_class: plan.class });
  }

  const idempotencyKey = buildSalesLifecycleIdempotencyKey(leadId, repoRoot);
  const email = asString(intake.working_email);
  const leadPayload = buildLeadPayload(intake, plan, leadId, idempotencyKey);

  const leadSearch = await searchExistingLeadIdentity(client, {
    email,
    company_name: companyName,
    idempotency_key: idempotencyKey,
    lead_id: leadId,
  });
  audit.push(
    auditEvent({
      at: now,
      action: 'SEARCH_LEAD',
      ok: leadSearch.ok === true,
      reason: leadSearch.ok ? 'SEARCH_BEFORE_CREATE' : 'SEARCH_FAILED',
      http: leadSearch.http,
      doctype: 'Lead',
      error: leadSearch.error,
    }),
  );
  if (!leadSearch.ok) return fail('LEAD_SEARCH_FAILED', { audit, http: leadSearch.http, lifecycle_class: plan.class });

  const leadDecision = decideLeadAction(leadSearch.leads || [], {
    email,
    company_name: companyName,
    idempotency_key: idempotencyKey,
    lead_id: leadId,
  });
  if (leadDecision.action === 'CONFLICT') {
    audit.push(auditEvent({ at: now, action: 'CONFLICT', ok: false, reason: leadDecision.reason, doctype: 'Lead', name: leadDecision.canonical }));
    return fail(leadDecision.reason, { audit, action: 'CONFLICT', erpnext_lead: leadDecision.canonical, lifecycle_class: plan.class });
  }

  let leadRow = null;
  let leadAction = leadDecision.action;
  if (leadDecision.action === 'UPDATE') {
    const canonical = asString(leadDecision.canonical);
    const updated = await client.update('Lead', canonical, pickAllowed(leadPayload, cfg.allowed_lead_update_fields));
    audit.push(
      auditEvent({
        at: now,
        action: 'UPDATE_LEAD',
        ok: updated.ok === true,
        reason: leadDecision.reason,
        http: updated.http,
        doctype: 'Lead',
        name: canonical,
        error: updated.error,
      }),
    );
    if (!updated.ok || !updated.row) return fail('LEAD_UPDATE_FAILED', { audit, http: updated.http, erpnext_lead: canonical, lifecycle_class: plan.class });
    leadRow = updated.row;
  } else {
    const created = await client.create('Lead', leadPayload);
    audit.push(
      auditEvent({
        at: now,
        action: 'CREATE_LEAD',
        ok: created.ok === true,
        reason: leadDecision.reason,
        http: created.http,
        doctype: 'Lead',
        name: created.row?.name,
        error: created.error,
      }),
    );
    if (!created.ok || !created.row) return fail('LEAD_CREATE_FAILED', { audit, http: created.http, lifecycle_class: plan.class });
    leadRow = created.row;
    leadAction = 'CREATE';
  }

  const liveLeadName = asString(leadRow.name);
  let opportunityRow = null;
  let opportunityAction = 'NONE';
  let opportunityDecision = { action: 'NONE', reason: 'NOT_REQUIRED', canonical: null };

  const oppSearch = await searchExistingOpportunityIdentity(client, {
    lead_id: leadId,
    idempotency_key: idempotencyKey,
    lead_name: liveLeadName,
    title: opportunityTitleFor(companyName, leadId),
  });
  audit.push(
    auditEvent({
      at: now,
      action: 'SEARCH_OPPORTUNITY',
      ok: oppSearch.ok === true,
      reason: oppSearch.ok ? 'SEARCH_BEFORE_CREATE' : 'SEARCH_FAILED',
      http: oppSearch.http,
      doctype: 'Opportunity',
      error: oppSearch.error,
    }),
  );
  if (!oppSearch.ok) {
    return fail('OPPORTUNITY_SEARCH_FAILED', { audit, http: oppSearch.http, erpnext_lead: liveLeadName, lifecycle_class: plan.class });
  }

  opportunityDecision = decideOpportunityAction(oppSearch.opportunities || [], {
    lead_id: leadId,
    idempotency_key: idempotencyKey,
    lead_name: liveLeadName,
  });

  if (opportunityDecision.action === 'CONFLICT') {
    audit.push(auditEvent({ at: now, action: 'CONFLICT', ok: false, reason: opportunityDecision.reason, doctype: 'Opportunity', name: opportunityDecision.canonical }));
    return fail(opportunityDecision.reason, {
      audit,
      action: 'CONFLICT',
      erpnext_lead: liveLeadName,
      erpnext_opportunity: opportunityDecision.canonical,
      lifecycle_class: plan.class,
    });
  }

  const shouldWriteOpportunity = plan.create_opportunity || (plan.update_opportunity_if_exists && opportunityDecision.action === 'UPDATE');
  if (shouldWriteOpportunity) {
    const oppPayload = buildOpportunityPayload(intake, plan, leadId, liveLeadName, idempotencyKey);
    if (opportunityDecision.action === 'UPDATE') {
      const canonical = asString(opportunityDecision.canonical);
      const updated = await client.update('Opportunity', canonical, pickAllowed(oppPayload, cfg.allowed_opportunity_update_fields));
      audit.push(
        auditEvent({
          at: now,
          action: 'UPDATE_OPPORTUNITY',
          ok: updated.ok === true,
          reason: opportunityDecision.reason,
          http: updated.http,
          doctype: 'Opportunity',
          name: canonical,
          error: updated.error,
        }),
      );
      if (!updated.ok || !updated.row) {
        return fail('OPPORTUNITY_UPDATE_FAILED', { audit, http: updated.http, erpnext_lead: liveLeadName, erpnext_opportunity: canonical, lifecycle_class: plan.class });
      }
      opportunityRow = updated.row;
      opportunityAction = 'UPDATE';
    } else if (plan.create_opportunity) {
      const created = await client.create('Opportunity', oppPayload);
      audit.push(
        auditEvent({
          at: now,
          action: 'CREATE_OPPORTUNITY',
          ok: created.ok === true,
          reason: opportunityDecision.reason,
          http: created.http,
          doctype: 'Opportunity',
          name: created.row?.name,
          error: created.error,
        }),
      );
      if (!created.ok || !created.row) {
        return fail('OPPORTUNITY_CREATE_FAILED', { audit, http: created.http, erpnext_lead: liveLeadName, lifecycle_class: plan.class });
      }
      opportunityRow = created.row;
      opportunityAction = 'CREATE';
    }
  }

  let customerResult = null;
  if (plan.create_customer) {
    customerResult = await reconcileQualifiedCustomer(
      {
        ...event,
        lead_id: leadId,
        stage,
        synthetic: true,
        product: event.product || intake.product || 'website-rescue',
        intake,
      },
      opts,
    );
    audit.push(
      auditEvent({
        at: now,
        action: `CUSTOMER_${customerResult.action || 'NONE'}`,
        ok: customerResult.ok === true,
        reason: customerResult.reason || customerResult.error,
        doctype: 'Customer',
        name: customerResult.customer,
        error: customerResult.error,
      }),
    );
    if (!customerResult.ok) {
      return fail(customerResult.reason || 'CUSTOMER_BRIDGE_FAILED', {
        audit,
        erpnext_lead: liveLeadName,
        erpnext_opportunity: opportunityRow?.name,
        customer: customerResult.customer,
        lifecycle_class: plan.class,
        customer_result: {
          action: customerResult.action,
          reason: customerResult.reason,
          error: customerResult.error,
        },
      });
    }
    if (customerResult.customer && liveLeadName) {
      const linked = await client.update('Customer', customerResult.customer, {
        lead_name: liveLeadName,
      });
      audit.push(
        auditEvent({
          at: now,
          action: 'LINK_CUSTOMER_LEAD',
          ok: linked.ok === true,
          reason: 'CUSTOMER_LEAD_NAME',
          http: linked.http,
          doctype: 'Customer',
          name: customerResult.customer,
          error: linked.error,
        }),
      );
    }
  }

  const gotLead = await client.get('Lead', liveLeadName);
  if (!gotLead.ok || !gotLead.row) {
    return fail('LEAD_READBACK_FAILED', { audit, erpnext_lead: liveLeadName, http: gotLead.http, lifecycle_class: plan.class });
  }
  let gotOpportunity = { ok: true, row: opportunityRow };
  if (opportunityRow?.name) {
    gotOpportunity = await client.get('Opportunity', opportunityRow.name);
    if (!gotOpportunity.ok || !gotOpportunity.row) {
      return fail('OPPORTUNITY_READBACK_FAILED', {
        audit,
        erpnext_lead: liveLeadName,
        erpnext_opportunity: opportunityRow.name,
        http: gotOpportunity.http,
        lifecycle_class: plan.class,
      });
    }
  }

  const recountLeads = await searchExistingLeadIdentity(client, {
    email,
    company_name: companyName,
    idempotency_key: idempotencyKey,
    lead_id: leadId,
  });
  const recountOpps = await searchExistingOpportunityIdentity(client, {
    lead_id: leadId,
    idempotency_key: idempotencyKey,
    lead_name: liveLeadName,
  });
  const matchingLeads = (recountLeads.leads || []).filter(
    (row) => rowIdempotencyText(row).includes(idempotencyKey) || normalizeEmail(row.email_id) === normalizeEmail(email),
  );
  const matchingOpps = (recountOpps.opportunities || []).filter(
    (row) => rowIdempotencyText(row).includes(idempotencyKey) || asString(row.title).includes(leadId),
  );
  const duplicateLeadCount = uniqueRows(matchingLeads).length;
  const duplicateOpportunityCount = uniqueRows(matchingOpps).length;
  const duplicateCustomerCount = customerResult ? customerResult.duplicate_count || 0 : 0;
  const expectedOppCount = plan.create_opportunity || opportunityRow ? 1 : 0;
  const expectedCustomerCount = plan.create_customer ? 1 : 0;

  const pointer = {
    schema: POINTER_SCHEMA,
    bridge: BRIDGE_ID,
    customer_bridge: customerResult?.customer ? 'qualified_customer_identity' : '',
    issue: 1018,
    lead_id: leadId,
    idempotency_key: idempotencyKey,
    erpnext_lead: liveLeadName,
    erpnext_opportunity: asString(gotOpportunity.row?.name),
    customer: asString(customerResult?.customer),
    customer_name: asString(customerResult?.customer_name || customerResult?.customer),
    contact: asString(customerResult?.contact),
    address: asString(customerResult?.address),
    lifecycle_class: plan.class,
    last_action: [leadAction, opportunityAction, customerResult?.action || 'NONE'].join(','),
    last_reason: leadDecision.reason,
    updated_at: now,
  };

  const pointerPersisted = await persistPointer(referenceStore, leadId, stage, pointer);
  const mismatches = [];
  if (asString(gotLead.row.company_name) !== companyName) mismatches.push('lead_company_name');
  if (email && normalizeEmail(gotLead.row.email_id) !== normalizeEmail(email)) mismatches.push('lead_email');
  if (!rowIdempotencyText(gotLead.row).includes(idempotencyKey)) mismatches.push('lead_idempotency_key');
  if (plan.create_opportunity) {
    if (!gotOpportunity.row) mismatches.push('opportunity_missing');
    else if (!rowIdempotencyText(gotOpportunity.row).includes(idempotencyKey) && !asString(gotOpportunity.row.title).includes(leadId)) {
      mismatches.push('opportunity_idempotency_key');
    } else if (asString(gotOpportunity.row.party_name) !== liveLeadName) mismatches.push('opportunity_party_name');
  }
  if (plan.create_customer && !customerResult?.customer) mismatches.push('customer_missing');
  if (plan.create_customer && customerResult?.customer) {
    const gotCustomer = await client.get('Customer', customerResult.customer);
    if (!gotCustomer.ok || asString(gotCustomer.row?.lead_name) !== liveLeadName) {
      mismatches.push('customer_lead_name');
    }
  }

  const ok =
    mismatches.length === 0 &&
    duplicateLeadCount === 1 &&
    duplicateOpportunityCount === expectedOppCount &&
    duplicateCustomerCount === expectedCustomerCount;

  return {
    ok,
    action: leadAction,
    lead_action: leadAction,
    opportunity_action: opportunityAction,
    customer_action: customerResult?.action || 'NONE',
    reason: leadDecision.reason,
    lifecycle_class: plan.class,
    erpnext_lead: liveLeadName,
    erpnext_opportunity: asString(gotOpportunity.row?.name) || null,
    customer: asString(customerResult?.customer) || null,
    contact: asString(customerResult?.contact) || null,
    address: asString(customerResult?.address) || null,
    idempotency_key: idempotencyKey,
    pointer,
    pointer_persisted: pointerPersisted,
    pointer_location: cfg.persistence.approved_pointer_location,
    postgres_persist: 'not_written',
    duplicate_lead_count: duplicateLeadCount,
    duplicate_opportunity_count: duplicateOpportunityCount,
    duplicate_customer_count: duplicateCustomerCount,
    mismatches,
    readback: {
      lead_name: asString(gotLead.row.name),
      lead_company: asString(gotLead.row.company_name),
      lead_email: asString(gotLead.row.email_id),
      lead_status: asString(gotLead.row.status),
      opportunity_name: asString(gotOpportunity.row?.name),
      opportunity_status: asString(gotOpportunity.row?.status),
      opportunity_party: asString(gotOpportunity.row?.party_name),
      customer: asString(customerResult?.customer),
      customer_group: asString(customerResult?.readback?.customer_group),
      email_id: asString(customerResult?.readback?.email_id || gotLead.row.email_id),
    },
    audit,
    error: ok ? null : mismatches.length ? 'READBACK_MISMATCH' : 'DUPLICATE_SALES_RECORD',
  };
}

/**
 * Run the same synthetic event twice. Second run must not create another Lead/Opportunity/Customer.
 */
export async function proveSalesLifecycleIdempotency(event, opts) {
  const first = await reconcileSalesLifecycle(event, opts);
  const second = await reconcileSalesLifecycle(event, opts);
  const plan = lifecyclePlan(event.stage, opts.repoRoot);
  const replayOk =
    second.lead_action === 'UPDATE' &&
    (plan.create_opportunity ? second.opportunity_action === 'UPDATE' : second.opportunity_action === 'NONE') &&
    (plan.create_customer ? second.customer_action === 'UPDATE' : second.customer_action === 'NONE') &&
    second.duplicate_lead_count === 1 &&
    second.duplicate_opportunity_count === (plan.create_opportunity ? 1 : 0) &&
    second.duplicate_customer_count === (plan.create_customer ? 1 : 0);
  return {
    ok: first.ok === true && second.ok === true && replayOk,
    first,
    second,
    created_on_replay: second.lead_action === 'CREATE' || second.opportunity_action === 'CREATE' || second.customer_action === 'CREATE',
  };
}
