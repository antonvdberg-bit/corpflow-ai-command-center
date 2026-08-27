/**
 * #1004 — Operating Workspace Commercial summary.
 *
 * Read-only projection of existing #714 commercial-approval rail records onto
 * existing Prospect Operations + Company Master identity. Does not create a
 * billing ledger, quotation model, payment system, or schema.
 *
 * ERPNext identifiers are references only — this module never calls ERPNext
 * and never flips financially_approved.
 */

import { leadRowToProspectViewModel } from '../cmp/_lib/prospect-operations-view-model.js';
import {
  evaluateAcceptanceRecord,
  evaluateFinancialApprovalGate,
  evaluatePaymentEvidence,
  evaluateProposalCompleteness,
} from '../revenue/commercial-approval.js';
import {
  productForCommercialRail,
  readCommercialApprovalFromQualification,
} from '../revenue/commercial-approval-record.js';
import { fixtureClientRows } from './clients-workspace.js';
import {
  COMMERCIAL_FILTERS,
  COMMERCIAL_STATE_LABELS,
  normalizeCommercialFilter,
} from './commercial-summary-constants.js';
import { fixtureProspectLeadRows, publicProspectListItem } from './prospect-operations-workspace.js';
import {
  CLIENTS_SUMMARY_PATH,
  COMMERCIAL_SUMMARY_PATH,
  COMPANY_MASTER_PATH,
} from './workspace-context.js';

export {
  COMMERCIAL_FILTERS,
  COMMERCIAL_STATE_LABELS,
  COMMERCIAL_STATES,
  normalizeCommercialFilter,
} from './commercial-summary-constants.js';

export const DATA_SOURCE_FIXTURE = 'fixture';
export const DATA_SOURCE_LEADS_READ = 'leads_read';

/**
 * @param {unknown} v
 * @returns {string}
 */
function asTrimmedString(v) {
  if (v == null) return '';
  return String(v).trim();
}

/**
 * @param {unknown} record
 * @returns {Record<string, unknown>}
 */
function asRecord(record) {
  return record && typeof record === 'object' && !Array.isArray(record)
    ? /** @type {Record<string, unknown>} */ (record)
    : {};
}

/**
 * Existing Company Master identity already linked to a prospect.
 * @param {string} prospectId
 * @returns {string | null}
 */
export function companyMasterIdForProspect(prospectId) {
  const id = asTrimmedString(prospectId);
  if (!id) return null;
  for (const client of fixtureClientRows()) {
    const linked = Array.isArray(client.linked_prospect_ids) ? client.linked_prospect_ids : [];
    if (linked.map((item) => asTrimmedString(item)).includes(id)) {
      return asTrimmedString(client.company_id) || null;
    }
  }
  return null;
}

/**
 * @param {string[]} blockers
 * @param {boolean} financiallyApproved
 * @returns {string}
 */
export function classifyCommercialState(blockers, financiallyApproved) {
  if (financiallyApproved === true) return 'financially_approved';
  const list = Array.isArray(blockers) ? blockers : [];
  if (
    list.includes('MISSING_PROPOSAL') ||
    list.includes('MISSING_PRICE') ||
    list.includes('MISSING_SCOPE') ||
    list.includes('MISSING_PAYMENT_TERMS') ||
    list.includes('INVALID_PRODUCT')
  ) {
    return 'quote_not_prepared';
  }
  if (list.includes('MISSING_ACCEPTANCE')) return 'awaiting_acceptance';
  if (list.includes('MISSING_PAYMENT_EVIDENCE') || list.includes('PAYMENT_EXCEPTION_INCOMPLETE')) {
    return 'payment_evidence_pending';
  }
  if (list.includes('MISSING_FINANCIAL_APPROVER') || list.includes('MISSING_APPROVAL_TIMESTAMP')) {
    return 'awaiting_approval';
  }
  return 'financial_gate_blocking';
}

/**
 * @param {string} state
 * @param {string[]} blockers
 * @returns {string}
 */
export function commercialNextAction(state, blockers) {
  const list = Array.isArray(blockers) ? blockers : [];
  if (state === 'financially_approved') return 'Proceed to onboarding / delivery (financial gate open)';
  if (state === 'quote_not_prepared') {
    if (list.includes('MISSING_PRICE') || list.includes('MISSING_PAYMENT_TERMS') || list.includes('MISSING_SCOPE')) {
      return 'Complete the quotation (price, terms, scope) before sending';
    }
    return 'Prepare quotation from the existing commercial template';
  }
  if (state === 'awaiting_acceptance') return 'Record client acceptance on the existing rail';
  if (state === 'payment_evidence_pending') return 'Record payment evidence or an approved payment exception';
  if (state === 'awaiting_approval') return 'Named financial approver must complete the #714 gate';
  if (list.includes('PROPOSAL_REJECTED')) return 'Proposal rejected — record lost reason or amend';
  if (list.includes('OPPORTUNITY_LOST')) return 'Opportunity lost — no delivery start';
  if (!list.length) return 'Confirm next commercial step';
  return `Resolve commercial blocker: ${list[0]}`;
}

/**
 * Authoritative ERPNext Quotation name already stored on the selling pointer.
 * Commercial Workspace reads this; it does not copy the quotation into a second ledger.
 *
 * @param {Record<string, unknown> | null | undefined} lead
 * @returns {string}
 */
export function erpnextQuotationPointerFromLead(lead) {
  const row = asRecord(lead);
  const qj = asRecord(row.qualificationJson || row.qualification_json);
  const erp = asRecord(qj.erpnext);
  return asTrimmedString(erp.erpnext_quotation || erp.quotation);
}

/**
 * @param {Record<string, unknown> | null | undefined} prospect
 * @returns {Record<string, unknown> | null}
 */
export function commercialRecordFromProspect(prospect) {
  const row = prospect && typeof prospect === 'object' ? prospect : null;
  if (!row) return null;
  const nested =
    row.commercial_approval && typeof row.commercial_approval === 'object'
      ? /** @type {Record<string, unknown>} */ (row.commercial_approval)
      : row.commercial && typeof row.commercial === 'object'
        ? /** @type {Record<string, unknown>} */ (row.commercial)
        : readCommercialApprovalFromQualification(row.qualificationJson || row.qualification_json);
  if (!nested) return null;
  const pointerQuotation = erpnextQuotationPointerFromLead(row);
  return {
    ...nested,
    prospect_id: nested.prospect_id || nested.prospect_ref || row.id,
    prospect_ref: nested.prospect_ref || nested.prospect_id || row.id,
    client_label: nested.client_label || row.organisation_name || row.person_name || null,
    owner: nested.owner || row.owner || null,
    company_master_id: nested.company_master_id || row.company_master_id || companyMasterIdForProspect(String(row.id || '')),
    erpnext_quotation: asTrimmedString(nested.erpnext_quotation) || pointerQuotation || null,
  };
}

/**
 * @param {Record<string, unknown>} record
 * @param {Record<string, unknown> | null} [prospect]
 * @returns {Record<string, unknown>}
 */
export function projectCommercialRow(record, prospect = null) {
  const row = asRecord(record);
  const prospectRow = prospect && typeof prospect === 'object' ? prospect : null;
  const proposalEval = evaluateProposalCompleteness(row);
  const acceptanceEval = evaluateAcceptanceRecord(row);
  const paymentEval = evaluatePaymentEvidence(row);
  const gate = evaluateFinancialApprovalGate(row);
  const state = classifyCommercialState(gate.blockers, gate.ok === true);
  const prospectId = asTrimmedString(row.prospect_id || row.prospect_ref || prospectRow?.id);
  const companyId = asTrimmedString(row.company_master_id) || companyMasterIdForProspect(prospectId) || '';
  const quotation =
    asTrimmedString(row.erpnext_quotation) || erpnextQuotationPointerFromLead(prospectRow);
  const proforma = asTrimmedString(row.erpnext_proforma);
  const invoice = asTrimmedString(row.erpnext_sales_invoice);
  const owner = asTrimmedString(row.owner || prospectRow?.owner);
  const nextAction = commercialNextAction(state, gate.blockers);
  const needsAttention = state !== 'financially_approved';
  const clientsHref = companyId
    ? `${CLIENTS_SUMMARY_PATH}/${encodeURIComponent(companyId)}`
    : CLIENTS_SUMMARY_PATH;

  return {
    id: asTrimmedString(row.id || prospectId),
    opportunity_ref: asTrimmedString(row.opportunity_ref || row.id || prospectId),
    product: gate.product || asTrimmedString(row.product || prospectRow?.product),
    prospect_id: prospectId || null,
    prospect_label:
      asTrimmedString(prospectRow?.organisation_name || prospectRow?.person_name || row.client_label || prospectId) ||
      null,
    client_label: asTrimmedString(row.client_label || prospectRow?.organisation_name) || null,
    company_master_id: companyId || null,
    owner: owner || null,
    commercial_state: state,
    commercial_state_label: COMMERCIAL_STATE_LABELS[state] || state,
    proposal_status: asTrimmedString(row.proposal_status || asRecord(row.proposal).status) || null,
    proposal_version: asTrimmedString(row.proposal_version || asRecord(row.proposal).version) || null,
    acceptance_status: asTrimmedString(row.acceptance_status || asRecord(row.acceptance).status) || null,
    payment_evidence_status:
      asTrimmedString(row.payment_evidence_status || asRecord(row.payment_evidence).status) || null,
    payment_evidence_ref:
      asTrimmedString(row.payment_evidence_ref || asRecord(row.payment_evidence).evidence_ref) || null,
    financial_review_status: asTrimmedString(row.financial_review_status) || null,
    financially_approved: gate.ok === true,
    financial_gate_blocking: gate.ok !== true,
    blockers: gate.blockers,
    proposal_complete: proposalEval.complete === true,
    acceptance_complete: acceptanceEval.complete === true,
    payment_evidence_complete: paymentEval.complete === true,
    owner_missing: !owner,
    next_action_missing: !nextAction,
    next_action: nextAction,
    needs_attention: needsAttention,
    shared_detail_path: prospectId ? `/app/prospects/${encodeURIComponent(prospectId)}` : null,
    quotation_evidence_path:
      quotation && (prospectId || asTrimmed(row.id))
        ? `/app/commercial/${encodeURIComponent(prospectId || asTrimmed(row.id))}`
        : null,
    clients_path: clientsHref,
    company_master_path: COMPANY_MASTER_PATH,
    company_master_href: companyId
      ? `${COMPANY_MASTER_PATH}?company_id=${encodeURIComponent(companyId)}`
      : COMPANY_MASTER_PATH,
    erpnext: {
      quotation: quotation || null,
      proforma: proforma || null,
      sales_invoice: invoice || null,
      customer: asTrimmedString(row.erpnext_customer || prospectRow?.erpnext_customer) || null,
      authoritative: Boolean(quotation || proforma || invoice),
      mutated: false,
    },
    related_refs: {
      prospect: prospectId || null,
      company_master: companyId || null,
      opportunity: asTrimmedString(row.opportunity_ref) || null,
      quotation: quotation || null,
      proforma: proforma || null,
      invoice: invoice || null,
      payment_evidence: asTrimmedString(row.payment_evidence_ref || asRecord(row.payment_evidence).evidence_ref) || null,
      financial_approval: asTrimmedString(row.financial_approval_ref) || null,
    },
    quoted_currency: row.quoted_currency || asRecord(row.proposal).currency || prospectRow?.currency || null,
    setup_price: row.setup_price ?? asRecord(row.proposal).setup_price ?? null,
    exception_signals: needsAttention ? [state] : [],
    protected_actions_executed: false,
    payment_processed: false,
    external_send: false,
  };
}

/**
 * @param {Record<string, unknown>} lead
 * @param {Date} [now]
 * @returns {Record<string, unknown>}
 */
export function prospectIdentityFromLead(lead, now = new Date()) {
  return publicProspectListItem(leadRowToProspectViewModel(lead, now));
}

/**
 * When a lead has no commercial JSON, project quote_not_prepared from existing
 * prospect identity only — no fabricated prices. If the selling pointer already
 * stores an ERPNext Quotation name, expose that name as a read-only reference.
 *
 * @param {Record<string, unknown>} lead
 * @param {Date} [now]
 * @returns {Record<string, unknown>}
 */
export function deriveCommercialRowFromLead(lead, now = new Date()) {
  const identity = prospectIdentityFromLead(lead, now);
  const id = asTrimmedString(lead?.id || identity.id);
  const product = productForCommercialRail(identity.product || lead?.product) || asTrimmedString(identity.product);
  return projectCommercialRow(
    {
      id,
      opportunity_ref: asTrimmedString(identity.reference || id),
      product,
      prospect_id: id,
      prospect_ref: id,
      company_master_id: companyMasterIdForProspect(id),
      client_label: identity.organisation_name || identity.person_name || null,
      owner: identity.owner || null,
      erpnext_quotation: erpnextQuotationPointerFromLead(lead) || null,
      erpnext_proforma: null,
      erpnext_sales_invoice: null,
      proposal_status: '',
      proposal_version: '',
      quoted_currency: identity.currency || '',
      setup_price: null,
      payment_terms: '',
      scope_summary: '',
      acceptance_status: 'pending',
      payment_evidence_status: 'pending',
      financially_approved: false,
      commercial_notes: 'Derived from existing prospect identity — no commercial rail record yet.',
      commercial_blockers: [],
      proposal: null,
      acceptance: null,
      payment_evidence: null,
    },
    identity,
  );
}

/**
 * @param {Array<Record<string, unknown>>} leads
 * @param {Date} [now]
 * @returns {Array<Record<string, unknown>>}
 */
export function projectCommercialRowsFromLeads(leads, now = new Date()) {
  const list = Array.isArray(leads) ? leads : [];
  return list
    .filter((row) => row && typeof row === 'object' && asTrimmedString(row.id))
    .map((lead) => {
      const identity = prospectIdentityFromLead(lead, now);
      const recorded = commercialRecordFromProspect({ ...identity, ...lead, id: lead.id });
      if (recorded) return projectCommercialRow(recorded, identity);
      return deriveCommercialRowFromLead(lead, now);
    });
}

/**
 * Synthetic #714 / #772 records already in the Operating Workspace fixtures.
 * Values come from existing prospect qualificationJson.commercial_approval
 * or from prospect identity when that rail JSON is absent.
 *
 * @param {Date} [now]
 * @returns {Array<Record<string, unknown>>}
 */
export function fixtureCommercialRecords(now = new Date()) {
  return projectCommercialRowsFromLeads(fixtureProspectLeadRows(now), now);
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {Array<Record<string, unknown>>} [prospects]
 * @returns {Array<Record<string, unknown>>}
 */
export function projectCommercialRows(records, prospects = []) {
  const list = Array.isArray(records) ? records : [];
  const prospectList = Array.isArray(prospects) ? prospects : [];
  const byId = new Map(
    prospectList.map((row) => [asTrimmedString(row?.id), row]).filter(([id]) => id),
  );
  return list.map((record) => {
    const prospectId = asTrimmedString(record?.prospect_id || record?.prospect_ref || record?.id);
    return projectCommercialRow(record, byId.get(prospectId) || null);
  });
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {string} [filter]
 * @returns {Array<Record<string, unknown>>}
 */
export function filterCommercialRows(rows, filter = 'needs_attention') {
  const list = Array.isArray(rows) ? rows : [];
  const id = normalizeCommercialFilter(filter);
  if (id === 'all') return list;
  if (id === 'needs_attention') return list.filter((row) => row.needs_attention === true);
  return list.filter((row) => String(row.commercial_state) === id);
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @returns {Record<string, number>}
 */
export function countCommercialFilters(rows) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const id of COMMERCIAL_FILTERS) {
    counts[id] = filterCommercialRows(rows, id).length;
  }
  return counts;
}

/**
 * @param {{
 *   leads?: Array<Record<string, unknown>>,
 *   records?: Array<Record<string, unknown>>,
 *   prospects?: Array<Record<string, unknown>>,
 *   data_source: string,
 *   proof_mode?: boolean,
 *   filter?: string,
 *   now?: Date,
 * }} args
 */
export function buildCommercialSummaryPayload(args) {
  const now = args.now instanceof Date ? args.now : new Date();
  const leads = Array.isArray(args.leads) ? args.leads : null;
  const all = leads
    ? projectCommercialRowsFromLeads(leads, now)
    : projectCommercialRows(
        Array.isArray(args.records) ? args.records : fixtureProspectLeadRows(now).map((row) => commercialRecordFromProspect(row) || deriveCommercialRowFromLead(row, now)),
        Array.isArray(args.prospects) ? args.prospects : [],
      );
  const filter = normalizeCommercialFilter(args.filter);
  const rows = filterCommercialRows(all, filter);
  return {
    ok: true,
    workspace: 'operating',
    path: COMMERCIAL_SUMMARY_PATH,
    view: 'commercial',
    canonical: true,
    filter,
    data_source: args.data_source,
    proof_mode: args.proof_mode === true,
    count: rows.length,
    unfiltered_count: all.length,
    rows,
    filter_counts: countCommercialFilters(all),
    clients_surface: CLIENTS_SUMMARY_PATH,
    clients_identity_source: COMPANY_MASTER_PATH,
    shared_detail_surface: '/app/prospects/[id]',
    reduces_fragmented_surfaces: [
      'Company Master identity at /admin/company-master (Clients summary remains /app/clients)',
      'Shared Prospect detail commercial clearance panel at /app/prospects/[id]',
      'docs/revenue proposal / acceptance / payment-evidence operator files',
      'Lead Rescue / Website Rescue onboarding commercial JSON',
      'ERPNext Quotation / Sales Invoice names as read-only references',
    ],
    temporary_source_surfaces: {
      commercial: COMMERCIAL_SUMMARY_PATH,
      clients: CLIENTS_SUMMARY_PATH,
      company_master: COMPANY_MASTER_PATH,
      prospect_detail: '/app/prospects/[id]',
    },
    external_send: false,
    email_sent: false,
    whatsapp_sent: false,
    sms_sent: false,
    payment_processed: false,
    erpnext_mutated: false,
    schema_changed: false,
  };
}
