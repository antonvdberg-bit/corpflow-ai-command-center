/**
 * Commercial approval rail (#714 / WS3).
 *
 * Manual-first proposal → acceptance → payment-evidence → financially_approved
 * for Lead Rescue and Website Rescue. Publishes the boolean consumed by #715/#716.
 *
 * No payment execution, no client sends, no DB/schema/env changes.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../..');
const CONFIG_REL = 'config/commercial-approval-rail.v1.json';

/** @type {ReturnType<typeof loadConfig> | null} */
let cachedConfig = null;

/**
 * @returns {Record<string, unknown>}
 */
function loadConfig(repoRoot = REPO_ROOT) {
  const raw = readFileSync(path.join(repoRoot, CONFIG_REL), 'utf8');
  return JSON.parse(raw);
}

/**
 * @param {string} [repoRoot]
 */
export function loadCommercialApprovalConfig(repoRoot = REPO_ROOT) {
  if (cachedConfig && repoRoot === REPO_ROOT) return cachedConfig;
  const parsed = loadConfig(repoRoot);
  if (repoRoot === REPO_ROOT) cachedConfig = parsed;
  return parsed;
}

export function resetCommercialApprovalConfigCache() {
  cachedConfig = null;
}

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
 * @returns {string[]}
 */
function asStringArray(v) {
  if (!Array.isArray(v)) return [];
  return v.map((x) => asTrimmedString(x)).filter(Boolean);
}

/**
 * @param {unknown} product
 * @param {Record<string, unknown>} [config]
 * @returns {string}
 */
export function normalizeProduct(product, config = loadCommercialApprovalConfig()) {
  const raw = asTrimmedString(product).toLowerCase();
  if (!raw) return '';
  const aliases =
    config.product_aliases && typeof config.product_aliases === 'object'
      ? /** @type {Record<string, string>} */ (config.product_aliases)
      : {};
  if (aliases[raw]) return aliases[raw];
  const products = Array.isArray(config.products) ? config.products.map((p) => String(p)) : [];
  if (products.includes(raw)) return raw;
  return raw;
}

/**
 * @param {string} canonicalProduct
 * @param {Record<string, unknown>} [config]
 */
export function mapProductForOnboarding(canonicalProduct, config = loadCommercialApprovalConfig()) {
  const map =
    config.onboarding_product_map && typeof config.onboarding_product_map === 'object'
      ? /** @type {Record<string, string>} */ (config.onboarding_product_map)
      : {};
  return map[canonicalProduct] || canonicalProduct;
}

/**
 * @param {Record<string, unknown> | null | undefined} record
 */
function getProposal(record) {
  const p = record?.proposal;
  return p && typeof p === 'object' ? /** @type {Record<string, unknown>} */ (p) : null;
}

/**
 * @param {Record<string, unknown> | null | undefined} record
 */
function getAcceptance(record) {
  const a = record?.acceptance;
  return a && typeof a === 'object' ? /** @type {Record<string, unknown>} */ (a) : null;
}

/**
 * @param {Record<string, unknown> | null | undefined} record
 */
function getPaymentEvidence(record) {
  const p = record?.payment_evidence;
  return p && typeof p === 'object' ? /** @type {Record<string, unknown>} */ (p) : null;
}

/**
 * @param {Record<string, unknown> | null | undefined} record
 */
function getPaymentException(record) {
  const e = record?.payment_exception;
  return e && typeof e === 'object' ? /** @type {Record<string, unknown>} */ (e) : null;
}

/**
 * @param {Record<string, unknown> | null | undefined} record
 * @param {Record<string, unknown>} [config]
 */
export function evaluateProposalCompleteness(record, config = loadCommercialApprovalConfig()) {
  /** @type {string[]} */
  const blockers = [];
  const row = record && typeof record === 'object' ? record : {};
  const product = normalizeProduct(row.product, config);
  const products = Array.isArray(config.products) ? config.products.map((p) => String(p)) : [];

  if (!product || !products.includes(product)) {
    blockers.push('INVALID_PRODUCT');
  }

  const proposal = getProposal(row);
  if (!proposal) {
    blockers.push('MISSING_PROPOSAL');
  } else {
    const status = asTrimmedString(proposal.status || row.proposal_status);
    if (!status) blockers.push('MISSING_PROPOSAL');
    if (!asTrimmedString(proposal.version || row.proposal_version)) blockers.push('MISSING_PROPOSAL');

    const scope = asTrimmedString(proposal.scope_summary || row.scope_summary);
    if (!scope) blockers.push('MISSING_SCOPE');

    const currency = asTrimmedString(proposal.currency || row.quoted_currency);
    const setup = asFiniteNumber(proposal.setup_price ?? row.setup_price);
    if (!currency || setup == null || setup < 0) {
      blockers.push('MISSING_PRICE');
    }

    const terms = asTrimmedString(proposal.payment_terms || row.payment_terms);
    if (!terms) blockers.push('MISSING_PAYMENT_TERMS');
  }

  return {
    complete: blockers.length === 0,
    blockers: [...new Set(blockers)],
    product,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} record
 */
export function evaluateAcceptanceRecord(record) {
  /** @type {string[]} */
  const blockers = [];
  const row = record && typeof record === 'object' ? record : {};
  const acceptance = getAcceptance(row);
  const status = asTrimmedString(
    acceptance?.status || row.acceptance_status
  ).toLowerCase();

  if (status === 'rejected') {
    return { complete: false, accepted: false, rejected: true, blockers: ['PROPOSAL_REJECTED'] };
  }

  if (status !== 'accepted') {
    blockers.push('MISSING_ACCEPTANCE');
    return { complete: false, accepted: false, rejected: false, blockers };
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
 * @param {Record<string, unknown>} [config]
 */
export function evaluatePaymentEvidence(record, config = loadCommercialApprovalConfig()) {
  /** @type {string[]} */
  const blockers = [];
  const row = record && typeof record === 'object' ? record : {};
  const evidence = getPaymentEvidence(row);
  const exception = getPaymentException(row);
  const status = asTrimmedString(
    evidence?.status || row.payment_evidence_status
  ).toLowerCase();

  const allowedVerified = ['recorded', 'verified'];
  if (allowedVerified.includes(status)) {
    const ref = asTrimmedString(evidence?.evidence_ref || row.payment_evidence_ref);
    const evidenceType = asTrimmedString(evidence?.evidence_type);
    const amount = asFiniteNumber(evidence?.amount_evidenced ?? evidence?.expected_amount);
    const currency = asTrimmedString(evidence?.currency || row.quoted_currency);
    if (!ref || !evidenceType || amount == null || amount < 0 || !currency) {
      blockers.push('MISSING_PAYMENT_EVIDENCE');
    }
    return {
      complete: blockers.length === 0,
      via: 'evidence',
      blockers,
    };
  }

  if (status === 'exception_approved' || exception) {
    const authorisedBy = asTrimmedString(exception?.authorised_by);
    const reason = asTrimmedString(exception?.reason);
    const approvedAt = asTrimmedString(exception?.approved_at);
    if (!authorisedBy || !reason || !approvedAt) {
      blockers.push('PAYMENT_EXCEPTION_INCOMPLETE');
    }
    // Exception path still counts as satisfying payment-evidence gate when complete.
    if (blockers.length === 0 && status !== 'exception_approved' && !exception) {
      blockers.push('MISSING_PAYMENT_EVIDENCE');
    }
    return {
      complete: blockers.length === 0,
      via: blockers.length === 0 ? 'exception' : 'incomplete_exception',
      blockers,
    };
  }

  blockers.push('MISSING_PAYMENT_EVIDENCE');
  return { complete: false, via: 'none', blockers };
}

/**
 * Deterministic financial approval gate.
 * financially_approved may only be true when all mandatory evidence exists.
 *
 * @param {Record<string, unknown> | null | undefined} record
 * @param {Record<string, unknown>} [config]
 */
export function evaluateFinancialApprovalGate(record, config = loadCommercialApprovalConfig()) {
  const row = record && typeof record === 'object' ? /** @type {Record<string, unknown>} */ (record) : {};
  /** @type {string[]} */
  const blockers = [];

  const wonLost = asTrimmedString(row.won_lost_status).toLowerCase();
  if (wonLost === 'lost') {
    blockers.push('OPPORTUNITY_LOST');
  }

  const commercialBlockers = asStringArray(row.commercial_blockers);
  if (commercialBlockers.length > 0) {
    blockers.push('UNRESOLVED_COMMERCIAL_BLOCKER');
  }

  const proposalEval = evaluateProposalCompleteness(row, config);
  blockers.push(...proposalEval.blockers);

  const acceptanceEval = evaluateAcceptanceRecord(row);
  if (acceptanceEval.rejected) {
    blockers.push('PROPOSAL_REJECTED');
  } else {
    blockers.push(...acceptanceEval.blockers);
  }

  // Payment evidence is required only when the opportunity is still commercially open.
  if (!acceptanceEval.rejected && wonLost !== 'lost') {
    const paymentEval = evaluatePaymentEvidence(row, config);
    blockers.push(...paymentEval.blockers);
  }

  const approvedBy = asTrimmedString(row.approved_by);
  const approvalTs = asTrimmedString(row.approval_timestamp);
  if (!approvedBy) blockers.push('MISSING_FINANCIAL_APPROVER');
  if (!approvalTs) blockers.push('MISSING_APPROVAL_TIMESTAMP');

  const unique = [...new Set(blockers)];
  const ok = unique.length === 0;

  return {
    ok,
    financially_approved: ok,
    blockers: unique,
    product: proposalEval.product,
    acceptance: acceptanceEval,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} record
 * @param {Record<string, unknown>} [config]
 */
export function canMarkFinanciallyApproved(record, config = loadCommercialApprovalConfig()) {
  return evaluateFinancialApprovalGate(record, config);
}

/**
 * Build the handoff object consumed by Lead Rescue / Website Rescue onboarding.
 * Sibling validators only require financially_approved === true (strict boolean).
 *
 * @param {Record<string, unknown> | null | undefined} record
 * @param {Record<string, unknown>} [config]
 */
export function toOnboardingHandoff(record, config = loadCommercialApprovalConfig()) {
  const gate = evaluateFinancialApprovalGate(record, config);
  const row = record && typeof record === 'object' ? record : {};
  const canonical = gate.product || normalizeProduct(row.product, config);
  const onboardingProduct = mapProductForOnboarding(canonical, config);
  const ref =
    asTrimmedString(row.financial_approval_ref) ||
    asTrimmedString(row.opportunity_ref) ||
    asTrimmedString(row.id) ||
    '';

  return {
    financially_approved: gate.ok === true,
    financial_approval_ref: gate.ok ? ref : '',
    product: onboardingProduct,
    commercial_product: canonical,
    opportunity_ref: asTrimmedString(row.opportunity_ref || row.id),
    proposal_version: asTrimmedString(
      getProposal(row)?.version || row.proposal_version
    ),
    blockers: gate.blockers,
    protected_actions_executed: false,
  };
}

/**
 * @param {string} reason
 * @param {'won' | 'lost'} kind
 * @param {Record<string, unknown>} [config]
 */
export function isAllowedWonLostReason(reason, kind, config = loadCommercialApprovalConfig()) {
  const listKey = kind === 'won' ? 'won_reasons' : 'lost_reasons';
  const list = Array.isArray(config[listKey]) ? config[listKey].map((x) => String(x)) : [];
  return list.includes(asTrimmedString(reason));
}

/**
 * Validate won/lost classification: status requires a vocabulary reason.
 * @param {Record<string, unknown> | null | undefined} record
 * @param {Record<string, unknown>} [config]
 */
export function evaluateWonLostRecord(record, config = loadCommercialApprovalConfig()) {
  const row = record && typeof record === 'object' ? record : {};
  const status = asTrimmedString(row.won_lost_status).toLowerCase() || 'open';
  const reason = asTrimmedString(row.won_lost_reason);
  /** @type {string[]} */
  const issues = [];

  if (status === 'won') {
    if (!isAllowedWonLostReason(reason, 'won', config)) {
      issues.push('MISSING_OR_INVALID_WON_REASON');
    }
  } else if (status === 'lost') {
    if (!isAllowedWonLostReason(reason, 'lost', config)) {
      issues.push('MISSING_OR_INVALID_LOST_REASON');
    }
  }

  return {
    ok: issues.length === 0,
    status,
    reason,
    issues,
    notes_allowed: true,
  };
}

/**
 * Empty synthetic shell for operators / tests.
 * @param {'lead-rescue' | 'website-rescue'} product
 */
export function createEmptyCommercialApprovalRecord(product = 'lead-rescue') {
  return {
    id: '',
    opportunity_ref: '',
    product,
    proposal_status: 'draft',
    proposal_version: '',
    quoted_currency: '',
    setup_price: null,
    recurring_price: null,
    offer_kind: 'pilot',
    payment_terms: '',
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
    commercial_notes: '',
    prospect_ref: '',
    onboarding_ref: '',
    delivery_ref: '',
    scope_summary: '',
    commercial_blockers: [],
    qualification_summary_ref: '',
    qualification_summary: null,
    proposal: null,
    acceptance: null,
    payment_evidence: null,
    payment_exception: null,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} record
 */
function getQualificationSummary(record) {
  const q = record?.qualification_summary;
  return q && typeof q === 'object' ? /** @type {Record<string, unknown>} */ (q) : null;
}

/**
 * Discovery/qualification summary completeness (proposal-ready prerequisite).
 * Does not authorize financial approval by itself.
 *
 * @param {Record<string, unknown> | null | undefined} recordOrSummary
 * @param {Record<string, unknown>} [config]
 */
export function evaluateQualificationSummary(
  recordOrSummary,
  config = loadCommercialApprovalConfig()
) {
  /** @type {string[]} */
  const missing = [];
  const row =
    recordOrSummary && typeof recordOrSummary === 'object'
      ? /** @type {Record<string, unknown>} */ (recordOrSummary)
      : {};
  const summary = getQualificationSummary(row) || (row.business_name ? row : null);

  if (!summary) {
    return {
      complete: false,
      proposal_ready: false,
      missing: ['qualification_summary'],
      fit_assessment: '',
    };
  }

  const required = Array.isArray(config.qualification_summary_required_fields)
    ? config.qualification_summary_required_fields.map((x) => String(x))
    : [];

  for (const field of required) {
    const value = summary[field];
    if (field === 'proposal_ready') {
      if (value !== true && value !== false && asTrimmedString(value) === '') {
        missing.push(field);
      }
      continue;
    }
    if (asTrimmedString(value) === '') missing.push(field);
  }

  const product = normalizeProduct(summary.product || row.product, config);
  const products = Array.isArray(config.products) ? config.products.map((p) => String(p)) : [];
  if (product && !products.includes(product)) missing.push('product');

  const fit = asTrimmedString(summary.fit_assessment).toLowerCase();
  const fitValues = Array.isArray(config.qualification_fit_values)
    ? config.qualification_fit_values.map((x) => String(x))
    : [];
  if (fit && fitValues.length > 0 && !fitValues.includes(fit)) {
    missing.push('fit_assessment');
  }

  const proposalReady =
    summary.proposal_ready === true ||
    asTrimmedString(summary.proposal_ready).toLowerCase() === 'yes';

  const complete = missing.length === 0;
  return {
    complete,
    proposal_ready: complete && proposalReady && fit === 'qualified',
    missing: [...new Set(missing)],
    fit_assessment: fit,
    product,
  };
}

/**
 * Product pack completeness: required docs exist and proposal templates contain
 * scope / assumptions / exclusions / revision / responsibility markers.
 *
 * @param {'lead-rescue' | 'website-rescue' | string} product
 * @param {{ repoRoot?: string, config?: Record<string, unknown> }} [options]
 */
export function evaluateProductPackCompleteness(product, options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const config = options.config || loadCommercialApprovalConfig();
  const canonical = normalizeProduct(product, config);
  /** @type {string[]} */
  const missing = [];
  /** @type {string[]} */
  const missingMarkers = [];

  const packs =
    config.product_pack_completeness && typeof config.product_pack_completeness === 'object'
      ? /** @type {Record<string, unknown>} */ (config.product_pack_completeness)
      : {};

  const sharedDocs = Array.isArray(packs.shared_docs)
    ? packs.shared_docs.map((x) => String(x))
    : [];
  const productPack =
    packs[canonical] && typeof packs[canonical] === 'object'
      ? /** @type {Record<string, unknown>} */ (packs[canonical])
      : null;

  if (!productPack) {
    return {
      complete: false,
      product: canonical,
      missing: ['UNKNOWN_PRODUCT_PACK'],
      missing_markers: [],
      checked_docs: [],
    };
  }

  const requiredDocs = [
    ...sharedDocs,
    ...(Array.isArray(productPack.required_docs)
      ? productPack.required_docs.map((x) => String(x))
      : []),
  ];
  /** @type {string[]} */
  const checked = [];

  for (const rel of requiredDocs) {
    const abs = path.join(repoRoot, rel);
    checked.push(rel);
    if (!existsSync(abs)) {
      missing.push(rel);
      continue;
    }
    const text = readFileSync(abs, 'utf8');
    if (text.trim().length < 80) missing.push(rel);
  }

  const proposalRel = requiredDocs.find((d) => d.includes('_PROPOSAL_TEMPLATE.md'));
  const markers = Array.isArray(productPack.proposal_template_markers)
    ? productPack.proposal_template_markers.map((x) => String(x))
    : [];
  if (proposalRel && existsSync(path.join(repoRoot, proposalRel))) {
    const proposalText = readFileSync(path.join(repoRoot, proposalRel), 'utf8');
    for (const marker of markers) {
      if (!proposalText.includes(marker)) missingMarkers.push(marker);
    }
  } else if (markers.length > 0) {
    missingMarkers.push(...markers);
  }

  return {
    complete: missing.length === 0 && missingMarkers.length === 0,
    product: canonical,
    missing,
    missing_markers: missingMarkers,
    checked_docs: checked,
  };
}

/**
 * Proposal-ready requires qualification summary + proposal completeness.
 *
 * @param {Record<string, unknown> | null | undefined} record
 * @param {Record<string, unknown>} [config]
 */
export function evaluateProposalReady(record, config = loadCommercialApprovalConfig()) {
  const qualification = evaluateQualificationSummary(record, config);
  const proposal = evaluateProposalCompleteness(record, config);
  /** @type {string[]} */
  const blockers = [];
  if (!qualification.complete) blockers.push('MISSING_QUALIFICATION_SUMMARY');
  else if (!qualification.proposal_ready) blockers.push('QUALIFICATION_NOT_PROPOSAL_READY');
  blockers.push(...proposal.blockers);
  return {
    ready: blockers.length === 0,
    blockers: [...new Set(blockers)],
    qualification,
    proposal,
  };
}
