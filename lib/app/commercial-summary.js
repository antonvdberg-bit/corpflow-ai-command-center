/**
 * #1004 — Operating Workspace Commercial summary.
 *
 * Read-only projection of existing commercial-approval rail records onto
 * existing Prospect Operations + Company Master identity. Does not create a
 * billing ledger, quotation model, payment system, or schema.
 *
 * ERPNext identifiers are references only — this module never calls ERPNext
 * and never flips financially_approved.
 */

import {
  COMMERCIAL_FILTERS,
  COMMERCIAL_STATE_LABELS,
  normalizeCommercialFilter,
} from './commercial-summary-constants.js';
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

const COMPANY_MASTER_ID = 'cmp_corpflowai_synthetic';

const RAIL_PRODUCTS = Object.freeze(['lead-rescue', 'website-rescue']);
const RAIL_PRODUCT_ALIASES = Object.freeze({
  'ai-lead-rescue': 'lead-rescue',
  'corpflow-rapid-delivery': 'website-rescue',
});

/**
 * Local #714 field evaluation. Do not statically import
 * lib/revenue/commercial-approval.js from this file — that module uses
 * import.meta.url and must stay off the factory_router CJS boot graph (#1015).
 *
 * @param {unknown} v
 * @returns {string}
 */
function asTrimmedString(v) {
  if (v == null) return '';
  return String(v).trim();
}

/**
 * @param {unknown} v
 * @returns {number | null}
 */
function asFiniteNumber(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * @param {Record<string, unknown> | null | undefined} record
 * @param {string} key
 * @returns {Record<string, unknown> | null}
 */
function nestedObject(record, key) {
  const value = record?.[key];
  return value && typeof value === 'object' ? /** @type {Record<string, unknown>} */ (value) : null;
}

/**
 * @param {unknown} product
 * @returns {string}
 */
function normalizeRailProduct(product) {
  const raw = asTrimmedString(product).toLowerCase();
  if (!raw) return '';
  return RAIL_PRODUCT_ALIASES[raw] || raw;
}

/**
 * @param {Record<string, unknown> | null | undefined} record
 */
function evaluateProposalCompleteness(record) {
  /** @type {string[]} */
  const blockers = [];
  const row = record && typeof record === 'object' ? record : {};
  const product = normalizeRailProduct(row.product);
  if (!product || !RAIL_PRODUCTS.includes(product)) blockers.push('INVALID_PRODUCT');
  const proposal = nestedObject(row, 'proposal');
  if (!proposal) {
    blockers.push('MISSING_PROPOSAL');
  } else {
    const status = asTrimmedString(proposal.status || row.proposal_status);
    if (!status) blockers.push('MISSING_PROPOSAL');
    if (!asTrimmedString(proposal.version || row.proposal_version)) blockers.push('MISSING_PROPOSAL');
    if (!asTrimmedString(proposal.scope_summary || row.scope_summary)) blockers.push('MISSING_SCOPE');
    const currency = asTrimmedString(proposal.currency || row.quoted_currency);
    const setup = asFiniteNumber(proposal.setup_price ?? row.setup_price);
    if (!currency || setup == null || setup < 0) blockers.push('MISSING_PRICE');
    if (!asTrimmedString(proposal.payment_terms || row.payment_terms)) blockers.push('MISSING_PAYMENT_TERMS');
  }
  return { complete: blockers.length === 0, blockers: [...new Set(blockers)], product };
}

/**
 * @param {Record<string, unknown> | null | undefined} record
 */
function evaluateAcceptanceRecord(record) {
  /** @type {string[]} */
  const blockers = [];
  const row = record && typeof record === 'object' ? record : {};
  const acceptance = nestedObject(row, 'acceptance');
  const status = asTrimmedString(acceptance?.status || row.acceptance_status).toLowerCase();
  if (status === 'rejected') {
    return { complete: false, accepted: false, rejected: true, blockers: ['PROPOSAL_REJECTED'] };
  }
  if (status !== 'accepted') {
    return { complete: false, accepted: false, rejected: false, blockers: ['MISSING_ACCEPTANCE'] };
  }
  const acceptedBy = asTrimmedString(acceptance?.accepted_by || row.accepted_by);
  const ts = asTrimmedString(acceptance?.acceptance_timestamp || row.acceptance_timestamp);
  if (!acceptedBy || !ts) blockers.push('MISSING_ACCEPTANCE');
  return {
    complete: blockers.length === 0,
    accepted: blockers.length === 0,
    rejected: false,
    blockers,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} record
 */
function evaluatePaymentEvidence(record) {
  /** @type {string[]} */
  const blockers = [];
  const row = record && typeof record === 'object' ? record : {};
  const evidence = nestedObject(row, 'payment_evidence');
  const exception = nestedObject(row, 'payment_exception');
  const status = asTrimmedString(evidence?.status || row.payment_evidence_status).toLowerCase();
  if (status === 'recorded' || status === 'verified') {
    const ref = asTrimmedString(evidence?.evidence_ref || row.payment_evidence_ref);
    const evidenceType = asTrimmedString(evidence?.evidence_type);
    const amount = asFiniteNumber(evidence?.amount_evidenced ?? evidence?.expected_amount);
    const currency = asTrimmedString(evidence?.currency || row.quoted_currency);
    if (!ref || !evidenceType || amount == null || amount < 0 || !currency) {
      blockers.push('MISSING_PAYMENT_EVIDENCE');
    }
    return { complete: blockers.length === 0, blockers };
  }
  if (status === 'exception_approved' || exception) {
    const authorisedBy = asTrimmedString(exception?.authorised_by);
    const reason = asTrimmedString(exception?.reason);
    const approvedAt = asTrimmedString(exception?.approved_at);
    if (!authorisedBy || !reason || !approvedAt) blockers.push('PAYMENT_EXCEPTION_INCOMPLETE');
    return { complete: blockers.length === 0, blockers };
  }
  blockers.push('MISSING_PAYMENT_EVIDENCE');
  return { complete: false, blockers };
}

/**
 * @param {Record<string, unknown> | null | undefined} record
 */
function evaluateFinancialApprovalGate(record) {
  const row = record && typeof record === 'object' ? /** @type {Record<string, unknown>} */ (record) : {};
  /** @type {string[]} */
  const blockers = [];
  if (asTrimmedString(row.won_lost_status).toLowerCase() === 'lost') blockers.push('OPPORTUNITY_LOST');
  const commercialBlockers = Array.isArray(row.commercial_blockers)
    ? row.commercial_blockers.map((item) => asTrimmedString(item)).filter(Boolean)
    : [];
  if (commercialBlockers.length > 0) blockers.push('UNRESOLVED_COMMERCIAL_BLOCKER');
  const proposalEval = evaluateProposalCompleteness(row);
  blockers.push(...proposalEval.blockers);
  const acceptanceEval = evaluateAcceptanceRecord(row);
  if (acceptanceEval.rejected) blockers.push('PROPOSAL_REJECTED');
  else blockers.push(...acceptanceEval.blockers);
  if (!acceptanceEval.rejected && asTrimmedString(row.won_lost_status).toLowerCase() !== 'lost') {
    blockers.push(...evaluatePaymentEvidence(row).blockers);
  }
  if (!asTrimmedString(row.approved_by)) blockers.push('MISSING_FINANCIAL_APPROVER');
  if (!asTrimmedString(row.approval_timestamp)) blockers.push('MISSING_APPROVAL_TIMESTAMP');
  const unique = [...new Set(blockers)];
  return {
    ok: unique.length === 0,
    blockers: unique,
    product: proposalEval.product,
  };
}

/**
 * Existing #714 rail fixtures, linked to existing #772 prospect IDs and
 * Company Master identity. Values are copied from fixtures/commercial-approval
 * — not invented here.
 *
 * @returns {Array<Record<string, unknown>>}
 */
export function fixtureCommercialRecords() {
  return [
    {
      id: 'synthetic-ca-wr-incomplete-proposal',
      opportunity_ref: 'OPP-SYN-WR-002',
      product: 'website-rescue',
      prospect_id: 'syn-772-rd-bea',
      prospect_ref: 'syn-772-rd-bea',
      company_master_id: COMPANY_MASTER_ID,
      client_label: 'Bea Boutique',
      owner: null,
      erpnext_quotation: null,
      erpnext_proforma: null,
      erpnext_sales_invoice: null,
      proposal_status: 'draft',
      proposal_version: 'v0.1',
      quoted_currency: '',
      setup_price: null,
      recurring_price: null,
      offer_kind: 'standard',
      payment_terms: '',
      scope_summary: '',
      acceptance_status: 'pending',
      accepted_by: '',
      acceptance_timestamp: '',
      payment_evidence_status: 'pending',
      payment_evidence_ref: '',
      financial_review_status: 'not_started',
      financially_approved: false,
      approved_by: '',
      approval_timestamp: '',
      won_lost_status: 'open',
      won_lost_reason: '',
      commercial_notes: 'Incomplete draft — missing price and payment terms.',
      commercial_blockers: [],
      proposal: {
        status: 'draft',
        version: 'v0.1',
        currency: '',
        setup_price: null,
        payment_terms: '',
        scope_summary: '',
      },
      acceptance: null,
      payment_evidence: null,
      payment_exception: null,
    },
    {
      id: 'synthetic-ca-lr-awaiting-acceptance',
      opportunity_ref: 'OPP-SYN-LR-003',
      product: 'lead-rescue',
      prospect_id: 'syn-995-lr-op',
      prospect_ref: 'syn-995-lr-op',
      company_master_id: COMPANY_MASTER_ID,
      client_label: 'Owen Office',
      owner: 'anton',
      erpnext_quotation: 'QTN-SYN-LR-003',
      erpnext_proforma: null,
      erpnext_sales_invoice: null,
      proposal_status: 'provided_to_client',
      proposal_version: 'v1.0',
      quoted_currency: 'USD',
      setup_price: 150,
      recurring_price: 99,
      offer_kind: 'pilot',
      payment_terms: 'pilot_full_upfront',
      scope_summary:
        'Connect one leaky enquiry source; 48-hour setup; 7-day monitoring pilot; daily summary; no messaging runtime without separate authorisation.',
      acceptance_status: 'pending',
      accepted_by: '',
      acceptance_timestamp: '',
      payment_evidence_status: 'pending',
      payment_evidence_ref: '',
      financial_review_status: 'not_started',
      financially_approved: false,
      approved_by: '',
      approval_timestamp: '',
      won_lost_status: 'open',
      won_lost_reason: '',
      commercial_notes: 'Proposal prepared from the existing rail template; acceptance not recorded.',
      commercial_blockers: [],
      proposal: {
        status: 'provided_to_client',
        version: 'v1.0',
        currency: 'USD',
        setup_price: 150,
        recurring_price: 99,
        payment_terms: 'pilot_full_upfront',
        scope_summary:
          'Connect one leaky enquiry source; 48-hour setup; 7-day monitoring pilot; daily summary; no messaging runtime without separate authorisation.',
        offer_kind: 'pilot',
      },
      acceptance: null,
      payment_evidence: null,
      payment_exception: null,
    },
    {
      id: 'synthetic-ca-lr-payment-pending',
      opportunity_ref: 'OPP-SYN-LR-002',
      product: 'lead-rescue',
      prospect_id: 'syn-995-lr-prot',
      prospect_ref: 'syn-995-lr-prot',
      company_master_id: COMPANY_MASTER_ID,
      client_label: 'Pat Partners',
      owner: 'anton',
      erpnext_quotation: 'QTN-SYN-LR-002',
      erpnext_proforma: null,
      erpnext_sales_invoice: null,
      proposal_status: 'accepted',
      proposal_version: 'v1.0',
      quoted_currency: 'USD',
      setup_price: 150,
      recurring_price: 99,
      offer_kind: 'pilot',
      payment_terms: 'pilot_full_upfront',
      scope_summary: 'Lead Rescue pilot — one source, 7-day monitoring.',
      acceptance_status: 'accepted',
      accepted_by: 'Alex Operator (client)',
      acceptance_timestamp: '2026-08-01T10:00:00Z',
      payment_evidence_status: 'pending',
      payment_evidence_ref: '',
      financial_review_status: 'blocked',
      financially_approved: false,
      approved_by: 'Anton (operator financial approver)',
      approval_timestamp: '2026-08-01T12:00:00Z',
      won_lost_status: 'open',
      won_lost_reason: '',
      commercial_notes: 'Accepted but payment not yet evidenced.',
      commercial_blockers: [],
      proposal: {
        status: 'accepted',
        version: 'v1.0',
        currency: 'USD',
        setup_price: 150,
        recurring_price: 99,
        payment_terms: 'pilot_full_upfront',
        scope_summary: 'Lead Rescue pilot — one source, 7-day monitoring.',
        offer_kind: 'pilot',
      },
      acceptance: {
        status: 'accepted',
        accepted_by: 'Alex Operator (client)',
        acceptance_timestamp: '2026-08-01T10:00:00Z',
      },
      payment_evidence: { status: 'pending' },
      payment_exception: null,
    },
    {
      id: 'synthetic-ca-lr-approved',
      opportunity_ref: 'OPP-SYN-LR-001',
      product: 'lead-rescue',
      prospect_id: 'syn-772-lr-ada',
      prospect_ref: 'syn-772-lr-ada',
      company_master_id: COMPANY_MASTER_ID,
      client_label: 'Ada Spa',
      owner: 'anton',
      erpnext_quotation: 'QTN-SYN-LR-001',
      erpnext_proforma: 'PINV-SYN-LR-001',
      erpnext_sales_invoice: null,
      proposal_status: 'accepted',
      proposal_version: 'v1.0',
      quoted_currency: 'USD',
      setup_price: 150,
      recurring_price: 99,
      offer_kind: 'pilot',
      payment_terms: 'pilot_full_upfront',
      scope_summary:
        'Connect one leaky enquiry source; 48-hour setup; 7-day monitoring pilot; daily summary; no messaging runtime without separate authorisation.',
      acceptance_status: 'accepted',
      accepted_by: 'Alex Operator (client)',
      acceptance_timestamp: '2026-08-01T10:00:00Z',
      payment_evidence_status: 'verified',
      payment_evidence_ref: 'PAY-EV-SYN-LR-001',
      financial_review_status: 'approved',
      financially_approved: false,
      approved_by: 'Anton (operator financial approver)',
      approval_timestamp: '2026-08-01T12:00:00Z',
      won_lost_status: 'won',
      won_lost_reason: 'accepted_pilot',
      commercial_notes: 'Synthetic Lead Rescue approved rail record — no real client data.',
      commercial_blockers: [],
      financial_approval_ref: 'FA-SYN-LR-001',
      proposal: {
        status: 'accepted',
        version: 'v1.0',
        currency: 'USD',
        setup_price: 150,
        recurring_price: 99,
        payment_terms: 'pilot_full_upfront',
        scope_summary:
          'Connect one leaky enquiry source; 48-hour setup; 7-day monitoring pilot; daily summary; no messaging runtime without separate authorisation.',
        offer_kind: 'pilot',
      },
      acceptance: {
        status: 'accepted',
        accepted_by: 'Alex Operator (client)',
        acceptance_timestamp: '2026-08-01T10:00:00Z',
        acceptance_method: 'email_confirmation',
        proposal_version: 'v1.0',
      },
      payment_evidence: {
        status: 'verified',
        evidence_type: 'bank_transfer_reference',
        evidence_ref: 'PAY-EV-SYN-LR-001',
        evidence_date: '2026-08-01',
        expected_amount: 150,
        amount_evidenced: 150,
        currency: 'USD',
        payment_term: 'pilot_full_upfront',
        verified_by: 'Anton (operator)',
        notes: 'Synthetic wire reference only — no bank credentials.',
      },
      payment_exception: null,
    },
  ];
}

/**
 * @param {string[]} blockers
 * @param {boolean} financiallyApproved
 * @returns {string}
 */
export function classifyCommercialState(blockers, financiallyApproved) {
  if (financiallyApproved === true) return 'financially_approved';
  const list = Array.isArray(blockers) ? blockers : [];
  if (list.includes('MISSING_PROPOSAL') || list.includes('MISSING_PRICE') || list.includes('MISSING_SCOPE') || list.includes('MISSING_PAYMENT_TERMS') || list.includes('INVALID_PRODUCT')) {
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
        : null;
  if (!nested) return null;
  return {
    ...nested,
    prospect_id: nested.prospect_id || row.id,
    prospect_ref: nested.prospect_ref || nested.prospect_id || row.id,
    client_label: nested.client_label || row.organisation_name || row.person_name || null,
    owner: nested.owner || row.owner || null,
    company_master_id: nested.company_master_id || row.company_master_id || null,
  };
}

/**
 * @param {Record<string, unknown>} record
 * @param {Record<string, unknown> | null} [prospect]
 * @returns {Record<string, unknown>}
 */
export function projectCommercialRow(record, prospect = null) {
  const row = record && typeof record === 'object' ? record : {};
  const prospectRow = prospect && typeof prospect === 'object' ? prospect : null;
  const proposalEval = evaluateProposalCompleteness(row);
  const acceptanceEval = evaluateAcceptanceRecord(row);
  const paymentEval = evaluatePaymentEvidence(row);
  const gate = evaluateFinancialApprovalGate(row);
  const state = classifyCommercialState(gate.blockers, gate.ok === true);
  const prospectId = String(row.prospect_id || row.prospect_ref || prospectRow?.id || '').trim();
  const companyId = String(row.company_master_id || '').trim();
  const quotation = String(row.erpnext_quotation || row.proposal_version || '').trim();
  const proforma = String(row.erpnext_proforma || '').trim();
  const invoice = String(row.erpnext_sales_invoice || '').trim();
  const owner = String(row.owner || prospectRow?.owner || '').trim();
  const nextAction = commercialNextAction(state, gate.blockers);
  const needsAttention = state !== 'financially_approved';

  return {
    id: String(row.id || prospectId || ''),
    opportunity_ref: String(row.opportunity_ref || row.id || ''),
    product: gate.product || String(row.product || prospectRow?.product || ''),
    prospect_id: prospectId || null,
    prospect_label:
      String(prospectRow?.organisation_name || prospectRow?.person_name || row.client_label || prospectId || '').trim() ||
      null,
    client_label: String(row.client_label || prospectRow?.organisation_name || '').trim() || null,
    company_master_id: companyId || null,
    owner: owner || null,
    commercial_state: state,
    commercial_state_label: COMMERCIAL_STATE_LABELS[state] || state,
    proposal_status: String(row.proposal_status || row.proposal?.status || '').trim() || null,
    proposal_version: String(row.proposal_version || row.proposal?.version || '').trim() || null,
    acceptance_status: String(row.acceptance_status || row.acceptance?.status || '').trim() || null,
    payment_evidence_status: String(row.payment_evidence_status || row.payment_evidence?.status || '').trim() || null,
    payment_evidence_ref: String(row.payment_evidence_ref || row.payment_evidence?.evidence_ref || '').trim() || null,
    financial_review_status: String(row.financial_review_status || '').trim() || null,
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
    clients_path: CLIENTS_SUMMARY_PATH,
    company_master_path: COMPANY_MASTER_PATH,
    company_master_href: companyId
      ? `${COMPANY_MASTER_PATH}?company_id=${encodeURIComponent(companyId)}`
      : COMPANY_MASTER_PATH,
    erpnext: {
      quotation: quotation || null,
      proforma: proforma || null,
      sales_invoice: invoice || null,
      authoritative: Boolean(quotation || proforma || invoice),
      mutated: false,
    },
    related_refs: {
      prospect: prospectId || null,
      company_master: companyId || null,
      opportunity: String(row.opportunity_ref || '') || null,
      quotation: quotation || null,
      proforma: proforma || null,
      invoice: invoice || null,
      payment_evidence: String(row.payment_evidence_ref || row.payment_evidence?.evidence_ref || '') || null,
      financial_approval: String(row.financial_approval_ref || '') || null,
    },
    quoted_currency: row.quoted_currency || row.proposal?.currency || prospectRow?.currency || null,
    setup_price: row.setup_price ?? row.proposal?.setup_price ?? null,
    exception_signals: needsAttention ? [state] : [],
    protected_actions_executed: false,
    payment_processed: false,
    external_send: false,
  };
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
    prospectList.map((row) => [String(row?.id || '').trim(), row]).filter(([id]) => id),
  );
  return list.map((record) => {
    const prospectId = String(record?.prospect_id || record?.prospect_ref || '').trim();
    return projectCommercialRow(record, byId.get(prospectId) || null);
  });
}

/**
 * When live leads have no commercial JSON, project a quote_not_prepared row
 * from existing prospect identity only — no fabricated prices or ERPNext names.
 *
 * @param {Record<string, unknown>} prospect
 * @returns {Record<string, unknown>}
 */
export function deriveCommercialRowFromProspect(prospect) {
  const row = prospect && typeof prospect === 'object' ? prospect : {};
  const id = String(row.id || '').trim();
  const productRaw = String(row.product || '').trim();
  const product =
    productRaw === 'ai-lead-rescue' || productRaw === 'lead-rescue'
      ? 'lead-rescue'
      : productRaw === 'corpflow-rapid-delivery' || productRaw === 'website-rescue'
        ? 'website-rescue'
        : productRaw || 'lead-rescue';
  return projectCommercialRow(
    {
      id: `derived-ca-${id}`,
      opportunity_ref: String(row.reference || id),
      product,
      prospect_id: id,
      prospect_ref: id,
      company_master_id: COMPANY_MASTER_ID,
      client_label: row.organisation_name || row.person_name || null,
      owner: row.owner || null,
      erpnext_quotation: row.related_refs && typeof row.related_refs === 'object' ? row.related_refs.proposal : null,
      erpnext_proforma: null,
      erpnext_sales_invoice:
        row.related_refs && typeof row.related_refs === 'object' ? row.related_refs.invoice : null,
      proposal_status: '',
      proposal_version: '',
      quoted_currency: row.currency || '',
      setup_price: row.estimated_value ?? null,
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
    row,
  );
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
 *   records?: Array<Record<string, unknown>>,
 *   prospects?: Array<Record<string, unknown>>,
 *   data_source: string,
 *   proof_mode?: boolean,
 *   filter?: string,
 * }} args
 */
export function buildCommercialSummaryPayload(args) {
  const prospects = Array.isArray(args.prospects) ? args.prospects : [];
  const explicit = Array.isArray(args.records) ? args.records : fixtureCommercialRecords();
  const projected = projectCommercialRows(explicit, prospects);
  const covered = new Set(projected.map((row) => String(row.prospect_id || '')));
  const derived =
    args.data_source === DATA_SOURCE_LEADS_READ
      ? prospects
          .filter((row) => {
            const id = String(row?.id || '').trim();
            return id && !covered.has(id) && !commercialRecordFromProspect(row);
          })
          .map((row) => deriveCommercialRowFromProspect(row))
      : [];
  const fromProspectJson = prospects
    .map((row) => commercialRecordFromProspect(row))
    .filter(Boolean)
    .filter((row) => !covered.has(String(row.prospect_id || row.prospect_ref || '')))
    .map((row) => projectCommercialRow(row, prospects.find((p) => String(p.id) === String(row.prospect_id)) || null));

  const all = [...projected, ...fromProspectJson, ...derived];
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
      'Company Master identity at /admin/company-master (Clients summary is /app/clients)',
      'docs/revenue proposal / acceptance / payment-evidence records (operator files)',
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
