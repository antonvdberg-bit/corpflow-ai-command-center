/**
 * #551 — persist the #714 commercial approval rail on existing prospect JSON.
 *
 * Stored at qualification_json.commercial_approval. No schema, no ERPNext write,
 * no payment execution, no client send. financially_approved is computed by the
 * #714 gate and is never trusted from the client.
 */

import { AI_LEAD_RESCUE_PRODUCT } from '../cmp/_lib/ai-lead-rescue-operator.js';
import { RAPID_DELIVERY_PRODUCT } from '../cmp/_lib/rapid-delivery-operator.js';
import {
  createEmptyCommercialApprovalRecord,
  evaluateFinancialApprovalGate,
  loadCommercialApprovalConfig,
  normalizeProduct,
} from './commercial-approval.js';

export const COMMERCIAL_APPROVAL_NAMESPACE = 'commercial_approval';
export const COMMERCIAL_APPROVAL_ISSUE = 551;

const FORBIDDEN_KEY =
  /password|secret|token|iban|account[_-]?number|card[_-]?number|cvv|cvc|api[_-]?key|private[_-]?key|authorization|pin$/i;

const PROTECTED_COMMERCIAL_FLAGS = Object.freeze([
  'payment_execute',
  'collect_payment',
  'bank_write',
  'send_invoice',
  'send',
  'external_send',
  'email_send',
  'whatsapp_send',
  'sms_send',
  'deploy',
]);

const BLOCKER_NEXT = Object.freeze({
  MISSING_PROPOSAL: 'Record the quotation / pro-forma reference (ERPNext name or version).',
  MISSING_SCOPE: 'Record the accepted scope in one paragraph.',
  MISSING_PRICE: 'Record price and currency from the pricing guide.',
  MISSING_PAYMENT_TERMS: 'Record payment terms.',
  MISSING_ACCEPTANCE: 'Record who accepted and when.',
  MISSING_PAYMENT_EVIDENCE: 'Record payment evidence (reference only — no bank secrets).',
  PAYMENT_EXCEPTION_INCOMPLETE: 'Complete the deferred-payment exception (who / why / when).',
  MISSING_FINANCIAL_APPROVER: 'Record the named financial approver.',
  MISSING_APPROVAL_TIMESTAMP: 'Record the financial-approval timestamp.',
  INVALID_PRODUCT: 'Choose Lead Rescue or Website Rescue.',
  PROPOSAL_REJECTED: 'Proposal was rejected — do not start delivery.',
  OPPORTUNITY_LOST: 'Opportunity is lost — do not start delivery.',
  UNRESOLVED_COMMERCIAL_BLOCKER: 'Clear the listed commercial blocker first.',
});

/**
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
 * @param {unknown} v
 * @returns {Record<string, unknown>}
 */
function asObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? /** @type {Record<string, unknown>} */ (v) : {};
}

/**
 * @param {unknown} product
 * @returns {string}
 */
export function productForCommercialRail(product) {
  const raw = asTrimmedString(product);
  if (raw === AI_LEAD_RESCUE_PRODUCT) return 'lead-rescue';
  if (raw === RAPID_DELIVERY_PRODUCT) return 'website-rescue';
  return normalizeProduct(raw);
}

/**
 * @param {unknown} node
 * @param {string[]} [found]
 * @returns {string[]}
 */
function collectForbiddenKeys(node, found = []) {
  if (!node || typeof node !== 'object') return found;
  if (Array.isArray(node)) {
    for (const item of node) collectForbiddenKeys(item, found);
    return found;
  }
  for (const [key, value] of Object.entries(node)) {
    if (FORBIDDEN_KEY.test(key)) found.push(key);
    collectForbiddenKeys(value, found);
  }
  return found;
}

/**
 * @param {unknown} patch
 * @returns {{ ok: true } | { ok: false, error: string, http_status: number }}
 */
export function assertCommercialApprovalPatchSafe(patch) {
  if (patch == null) return { ok: true };
  if (typeof patch !== 'object' || Array.isArray(patch)) {
    return { ok: false, error: 'invalid_commercial_approval', http_status: 400 };
  }
  const row = /** @type {Record<string, unknown>} */ (patch);
  for (const flag of PROTECTED_COMMERCIAL_FLAGS) {
    if (row[flag] === true) {
      return { ok: false, error: 'PROTECTED_ACTION_BLOCKED', http_status: 403 };
    }
  }
  const forbidden = collectForbiddenKeys(row);
  if (forbidden.length > 0) {
    return { ok: false, error: 'FORBIDDEN_SENSITIVE_FIELD', http_status: 400 };
  }
  return { ok: true };
}

/**
 * @param {unknown} qualificationJson
 * @returns {Record<string, unknown> | null}
 */
export function readCommercialApprovalFromQualification(qualificationJson) {
  const qj = asObj(qualificationJson);
  const row = qj[COMMERCIAL_APPROVAL_NAMESPACE];
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
  return /** @type {Record<string, unknown>} */ (row);
}

/**
 * @param {unknown} existing
 * @param {unknown} incoming
 * @returns {Record<string, unknown>}
 */
function mergeNested(existing, incoming) {
  const base = asObj(existing);
  const next = asObj(incoming);
  if (Object.keys(next).length === 0) return base;
  /** @type {Record<string, unknown>} */
  const out = { ...base };
  for (const [key, value] of Object.entries(next)) {
    if (value === undefined) continue;
    if (FORBIDDEN_KEY.test(key)) continue;
    out[key] = value;
  }
  return out;
}

/**
 * Apply operator-recorded commercial evidence onto an existing rail record.
 *
 * @param {Record<string, unknown> | null | undefined} existing
 * @param {Record<string, unknown>} patch
 * @param {{
 *   actorLabel?: string,
 *   nowIso?: string,
 *   prospectId?: string,
 *   product?: string,
 * }} [opts]
 */
export function applyCommercialEvidencePatch(existing, patch, opts = {}) {
  const config = loadCommercialApprovalConfig();
  const nowIso = asTrimmedString(opts.nowIso) || new Date().toISOString();
  const actorLabel = asTrimmedString(opts.actorLabel) || 'operator';
  const prospectId = asTrimmedString(opts.prospectId);
  const product = productForCommercialRail(patch.product || existing?.product || opts.product);
  const base =
    existing && typeof existing === 'object'
      ? { ...createEmptyCommercialApprovalRecord(product === 'website-rescue' ? 'website-rescue' : 'lead-rescue'), ...existing }
      : createEmptyCommercialApprovalRecord(product === 'website-rescue' ? 'website-rescue' : 'lead-rescue');

  const assign = (key, val) => {
    if (val === undefined) return;
    base[key] = val;
  };

  assign('product', product || base.product);
  assign('opportunity_ref', patch.opportunity_ref != null ? asTrimmedString(patch.opportunity_ref) : undefined);
  if (!asTrimmedString(base.opportunity_ref) && prospectId) base.opportunity_ref = prospectId;
  if (!asTrimmedString(base.prospect_ref) && prospectId) base.prospect_ref = prospectId;
  assign('id', prospectId || base.id);

  assign('proposal_status', patch.proposal_status != null ? asTrimmedString(patch.proposal_status) : undefined);
  assign('proposal_version', patch.proposal_version != null ? asTrimmedString(patch.proposal_version) : undefined);
  assign('quoted_currency', patch.quoted_currency != null ? asTrimmedString(patch.quoted_currency) : undefined);
  if (patch.setup_price !== undefined) base.setup_price = asFiniteNumber(patch.setup_price);
  if (patch.recurring_price !== undefined) base.recurring_price = asFiniteNumber(patch.recurring_price);
  assign('offer_kind', patch.offer_kind != null ? asTrimmedString(patch.offer_kind) : undefined);
  assign('payment_terms', patch.payment_terms != null ? asTrimmedString(patch.payment_terms) : undefined);
  assign('scope_summary', patch.scope_summary != null ? asTrimmedString(patch.scope_summary) : undefined);
  assign('acceptance_status', patch.acceptance_status != null ? asTrimmedString(patch.acceptance_status) : undefined);
  assign('accepted_by', patch.accepted_by != null ? asTrimmedString(patch.accepted_by) : undefined);
  assign('acceptance_timestamp', patch.acceptance_timestamp != null ? asTrimmedString(patch.acceptance_timestamp) : undefined);
  assign('payment_evidence_status', patch.payment_evidence_status != null ? asTrimmedString(patch.payment_evidence_status) : undefined);
  assign('payment_evidence_ref', patch.payment_evidence_ref != null ? asTrimmedString(patch.payment_evidence_ref) : undefined);
  assign('won_lost_status', patch.won_lost_status != null ? asTrimmedString(patch.won_lost_status) : undefined);
  assign('won_lost_reason', patch.won_lost_reason != null ? asTrimmedString(patch.won_lost_reason) : undefined);
  assign('commercial_notes', patch.commercial_notes != null ? asTrimmedString(patch.commercial_notes) : undefined);

  const erpnextQuotation = asTrimmedString(patch.erpnext_quotation ?? base.erpnext_quotation);
  const erpnextInvoice = asTrimmedString(patch.erpnext_sales_invoice ?? base.erpnext_sales_invoice);
  if (erpnextQuotation) base.erpnext_quotation = erpnextQuotation;
  if (erpnextInvoice) base.erpnext_sales_invoice = erpnextInvoice;
  if (patch.erpnext_customer !== undefined) {
    base.erpnext_customer = asTrimmedString(patch.erpnext_customer);
  }

  base.proposal = mergeNested(base.proposal, patch.proposal);
  base.acceptance = mergeNested(base.acceptance, patch.acceptance);
  base.payment_evidence = mergeNested(base.payment_evidence, patch.payment_evidence);
  if (patch.payment_exception !== undefined) {
    base.payment_exception =
      patch.payment_exception && typeof patch.payment_exception === 'object'
        ? mergeNested(base.payment_exception, patch.payment_exception)
        : null;
  }

  if (erpnextQuotation) {
    if (!asTrimmedString(base.proposal_version)) base.proposal_version = erpnextQuotation;
    const proposal = asObj(base.proposal);
    if (!asTrimmedString(proposal.version)) proposal.version = erpnextQuotation;
    if (!asTrimmedString(proposal.status)) proposal.status = asTrimmedString(base.proposal_status) || 'draft';
    base.proposal = proposal;
  }

  const proposal = asObj(base.proposal);
  if (!asTrimmedString(proposal.version) && asTrimmedString(base.proposal_version)) {
    proposal.version = asTrimmedString(base.proposal_version);
  }
  if (!asTrimmedString(proposal.status) && asTrimmedString(base.proposal_status)) {
    proposal.status = asTrimmedString(base.proposal_status);
  }
  if (!asTrimmedString(proposal.currency) && asTrimmedString(base.quoted_currency)) {
    proposal.currency = asTrimmedString(base.quoted_currency);
  }
  if (proposal.setup_price == null && base.setup_price != null) proposal.setup_price = base.setup_price;
  if (!asTrimmedString(proposal.payment_terms) && asTrimmedString(base.payment_terms)) {
    proposal.payment_terms = asTrimmedString(base.payment_terms);
  }
  if (!asTrimmedString(proposal.scope_summary) && asTrimmedString(base.scope_summary)) {
    proposal.scope_summary = asTrimmedString(base.scope_summary);
  }
  if (Object.keys(proposal).length > 0) base.proposal = proposal;

  const acceptance = asObj(base.acceptance);
  if (!asTrimmedString(acceptance.status) && asTrimmedString(base.acceptance_status)) {
    acceptance.status = asTrimmedString(base.acceptance_status);
  }
  if (!asTrimmedString(acceptance.accepted_by) && asTrimmedString(base.accepted_by)) {
    acceptance.accepted_by = asTrimmedString(base.accepted_by);
  }
  if (!asTrimmedString(acceptance.acceptance_timestamp) && asTrimmedString(base.acceptance_timestamp)) {
    acceptance.acceptance_timestamp = asTrimmedString(base.acceptance_timestamp);
  }
  if (patch.acceptance_method != null) {
    acceptance.acceptance_method = asTrimmedString(patch.acceptance_method);
  }
  if (Object.keys(acceptance).length > 0) base.acceptance = acceptance;

  const evidence = asObj(base.payment_evidence);
  if (!asTrimmedString(evidence.status) && asTrimmedString(base.payment_evidence_status)) {
    evidence.status = asTrimmedString(base.payment_evidence_status);
  }
  if (!asTrimmedString(evidence.evidence_ref) && asTrimmedString(base.payment_evidence_ref)) {
    evidence.evidence_ref = asTrimmedString(base.payment_evidence_ref);
  }
  if (patch.payment_evidence_type != null) {
    evidence.evidence_type = asTrimmedString(patch.payment_evidence_type);
  }
  if (patch.payment_evidence_amount !== undefined) {
    evidence.amount_evidenced = asFiniteNumber(patch.payment_evidence_amount);
    if (evidence.expected_amount == null) evidence.expected_amount = evidence.amount_evidenced;
  }
  if (patch.payment_evidence_currency != null) {
    evidence.currency = asTrimmedString(patch.payment_evidence_currency);
  }
  if (!asTrimmedString(evidence.currency) && asTrimmedString(base.quoted_currency)) {
    evidence.currency = asTrimmedString(base.quoted_currency);
  }
  if (evidence.amount_evidenced == null && base.setup_price != null && asTrimmedString(evidence.status)) {
    const status = asTrimmedString(evidence.status).toLowerCase();
    if (status === 'recorded' || status === 'verified') {
      evidence.amount_evidenced = asFiniteNumber(base.setup_price);
      if (evidence.expected_amount == null) evidence.expected_amount = evidence.amount_evidenced;
    }
  }
  if (erpnextInvoice && !asTrimmedString(evidence.invoice_ref)) {
    evidence.invoice_ref = erpnextInvoice;
  }
  if (Object.keys(evidence).length > 0) base.payment_evidence = evidence;

  const recordApproval = patch.record_financial_approval === true;
  if (recordApproval) {
    base.approved_by = asTrimmedString(patch.approved_by) || actorLabel;
    base.approval_timestamp = asTrimmedString(patch.approval_timestamp) || nowIso;
    base.financial_review_status = 'in_review';
  } else {
    if (patch.approved_by !== undefined) base.approved_by = asTrimmedString(patch.approved_by);
    if (patch.approval_timestamp !== undefined) {
      base.approval_timestamp = asTrimmedString(patch.approval_timestamp);
    }
  }

  const gate = evaluateFinancialApprovalGate(base, config);
  base.financially_approved = gate.ok === true;
  base.financial_review_status = gate.ok
    ? 'approved'
    : asTrimmedString(base.approved_by)
      ? 'blocked'
      : asTrimmedString(base.financial_review_status) || 'not_started';
  if (gate.ok && asTrimmedString(base.won_lost_status) !== 'lost') {
    if (!asTrimmedString(base.won_lost_status) || asTrimmedString(base.won_lost_status) === 'open') {
      base.won_lost_status = 'won';
    }
    if (!asTrimmedString(base.won_lost_reason)) base.won_lost_reason = 'accepted_pilot';
  }
  if (!asTrimmedString(base.financial_approval_ref) && gate.ok && prospectId) {
    base.financial_approval_ref = `FA-${prospectId}`;
  }
  base.updated_at = nowIso;
  base.updated_by = actorLabel;
  base.protected_actions_executed = false;
  base.payment_executed = false;
  base.issue = COMMERCIAL_APPROVAL_ISSUE;
  return base;
}

/**
 * @param {unknown} qualificationJson
 * @param {unknown} patch
 * @param {{
 *   actorLabel?: string,
 *   nowIso?: string,
 *   prospectId?: string,
 *   product?: string,
 * }} [opts]
 */
export function mergeCommercialApprovalIntoQualification(qualificationJson, patch, opts = {}) {
  const safety = assertCommercialApprovalPatchSafe(patch);
  if (!safety.ok) return safety;
  const qj = asObj(qualificationJson);
  const existing = readCommercialApprovalFromQualification(qj);
  const next = applyCommercialEvidencePatch(existing, asObj(patch), opts);
  return {
    ok: true,
    qualificationJson: {
      ...qj,
      [COMMERCIAL_APPROVAL_NAMESPACE]: next,
    },
    record: next,
  };
}

/**
 * Operator-facing clearance projection. Never includes raw qualification JSON
 * or secret-like fields.
 *
 * @param {Record<string, unknown> | null | undefined} record
 * @param {{
 *   erpnext_customer?: string,
 *   product?: string,
 * }} [opts]
 */
export function projectCommercialClearance(record, opts = {}) {
  const config = loadCommercialApprovalConfig();
  const product = productForCommercialRail(record?.product || opts.product);
  const row =
    record && typeof record === 'object'
      ? record
      : createEmptyCommercialApprovalRecord(product === 'website-rescue' ? 'website-rescue' : 'lead-rescue');
  if (!record) row.product = product || row.product;
  const gate = evaluateFinancialApprovalGate(row, config);
  const blockers = Array.isArray(gate.blockers) ? gate.blockers : [];
  const nextRequired = blockers
    .map((code) => BLOCKER_NEXT[code] || code)
    .filter(Boolean);
  const proposal = asObj(row.proposal);
  const acceptance = asObj(row.acceptance);
  const evidence = asObj(row.payment_evidence);
  const recorded = Boolean(
    asTrimmedString(row.proposal_version) ||
      asTrimmedString(row.erpnext_quotation) ||
      asTrimmedString(row.acceptance_status) ||
      asTrimmedString(row.payment_evidence_ref) ||
      asTrimmedString(row.approved_by),
  );

  return {
    schema: 'corpflow.commercial_clearance.v1',
    issue: COMMERCIAL_APPROVAL_ISSUE,
    rail_issue: 714,
    product: product || asTrimmedString(row.product),
    recorded,
    commercially_cleared: gate.ok === true,
    financially_approved: gate.ok === true,
    clearance_label: gate.ok === true ? 'CLEARED TO BUILD' : 'NOT CLEARED',
    blockers,
    next_required: nextRequired[0] || (gate.ok ? 'Proceed to onboarding / build.' : 'Record commercial evidence.'),
    proposal: {
      status: asTrimmedString(proposal.status || row.proposal_status) || null,
      version: asTrimmedString(proposal.version || row.proposal_version) || null,
      erpnext_quotation: asTrimmedString(row.erpnext_quotation) || null,
      erpnext_sales_invoice: asTrimmedString(row.erpnext_sales_invoice) || null,
      currency: asTrimmedString(proposal.currency || row.quoted_currency) || null,
      setup_price: asFiniteNumber(proposal.setup_price ?? row.setup_price),
      payment_terms: asTrimmedString(proposal.payment_terms || row.payment_terms) || null,
      scope_summary: asTrimmedString(proposal.scope_summary || row.scope_summary) || null,
    },
    acceptance: {
      status: asTrimmedString(acceptance.status || row.acceptance_status) || null,
      accepted_by: asTrimmedString(acceptance.accepted_by || row.accepted_by) || null,
      acceptance_timestamp:
        asTrimmedString(acceptance.acceptance_timestamp || row.acceptance_timestamp) || null,
      acceptance_method: asTrimmedString(acceptance.acceptance_method) || null,
    },
    payment_evidence: {
      status: asTrimmedString(evidence.status || row.payment_evidence_status) || null,
      evidence_type: asTrimmedString(evidence.evidence_type) || null,
      evidence_ref: asTrimmedString(evidence.evidence_ref || row.payment_evidence_ref) || null,
      amount_evidenced: asFiniteNumber(evidence.amount_evidenced),
      currency: asTrimmedString(evidence.currency || row.quoted_currency) || null,
      invoice_ref: asTrimmedString(evidence.invoice_ref || row.erpnext_sales_invoice) || null,
    },
    financial_approval: {
      approved_by: asTrimmedString(row.approved_by) || null,
      approval_timestamp: asTrimmedString(row.approval_timestamp) || null,
      review_status: asTrimmedString(row.financial_review_status) || null,
    },
    erpnext_customer: asTrimmedString(row.erpnext_customer || opts.erpnext_customer) || null,
    vocab: {
      proposal_statuses: Array.isArray(config.proposal_statuses) ? config.proposal_statuses : [],
      payment_evidence_statuses: Array.isArray(config.payment_evidence_statuses)
        ? config.payment_evidence_statuses
        : [],
      payment_evidence_types: Array.isArray(config.payment_evidence_types)
        ? config.payment_evidence_types
        : [],
      payment_term_options: Array.isArray(config.payment_term_options) ? config.payment_term_options : [],
      acceptance_methods: Array.isArray(config.acceptance_methods) ? config.acceptance_methods : [],
    },
    protected_actions_executed: false,
    payment_executed: false,
  };
}

/**
 * @param {unknown} qualificationJson
 * @param {{ product?: string }} [opts]
 */
export function projectCommercialClearanceFromQualification(qualificationJson, opts = {}) {
  const qj = asObj(qualificationJson);
  const erpnext = asObj(qj.erpnext);
  const record = readCommercialApprovalFromQualification(qj);
  return projectCommercialClearance(record, {
    product: opts.product,
    erpnext_customer: asTrimmedString(erpnext.customer_name || erpnext.customer),
  });
}
