/**
 * ERPNext selling / quote-to-cash bridge (#1056 / onboarding C).
 *
 * Reuses WP1 Frappe client, WP2 Lead/Opportunity/Customer, #882 commercial
 * documents, #881 catalogue, and the #551/#714 financial approval rail.
 * Operator/factory invoked. No cron. No schema. No second CRM.
 * Draft Quotation only. No Sales Invoice posting. No Payment Entry. No send.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  conversionRateIsSafe,
  syntheticDocumentsMustStayDraft,
  toCommercialRailProposalStub,
} from './commercial-documents.js';
import {
  createMemoryReferenceStore,
  isForbiddenLiveCustomerName,
  mergeErpnextPointerIntoQualificationJson,
  rowMatchesFrappeFilter,
} from './customer-bridge.js';
import { asTrimmedString, listForbiddenSecretKeys } from './client-master.js';
import { getCatalogueItem, toQuotationLine } from './product-catalogue.js';
import { canMarkFinanciallyApproved } from '../revenue/commercial-approval.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../..');
const CONFIG_REL = 'config/erpnext-selling-quote-to-cash.v1.json';

export const CANONICAL_VERDICT = 'NOT READY — BLOCKED BY ACCOUNTANT FOUNDATION';
export const SELLING_QUOTATION_SUB_VERDICT = 'SELLING_QUOTATION_PATH_PROVEN';
export const POINTER_SCHEMA = 'corpflow.qualification.erpnext.v1';
export const BRIDGE_ID = 'quotation_invoice';
export { createMemoryReferenceStore, rowMatchesFrappeFilter };

/** @type {ReturnType<typeof loadConfig> | null} */
let cachedConfig = null;

function loadConfig(repoRoot = REPO_ROOT) {
  return JSON.parse(readFileSync(path.join(repoRoot, CONFIG_REL), 'utf8'));
}

export function loadSellingQuoteToCashConfig(repoRoot = REPO_ROOT) {
  if (cachedConfig && repoRoot === REPO_ROOT) return cachedConfig;
  const parsed = loadConfig(repoRoot);
  if (repoRoot === REPO_ROOT) cachedConfig = parsed;
  return parsed;
}

export function resetSellingQuoteToCashConfigCache() {
  cachedConfig = null;
}

function asString(v) {
  return asTrimmedString(v);
}

function asNumber(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function docstatusOf(row) {
  const n = asNumber(row?.docstatus);
  return n == null ? 0 : n;
}

export function buildSellingIdempotencyKey(leadId, repoRoot = REPO_ROOT) {
  const prefix = asString(loadSellingQuoteToCashConfig(repoRoot).idempotency_prefix) || 'corpflow.selling_q2c.v1';
  return `${prefix}:lead=${asString(leadId)}`;
}

export function extractSellingLeadIdFromText(text) {
  const match = asString(text).match(/corpflow\.selling_q2c\.v1:lead=([^\s|\]]+)/i);
  return match ? asString(match[1]) : '';
}

export function quotationTitleFor(productLabel, leadId, repoRoot = REPO_ROOT) {
  const key = buildSellingIdempotencyKey(leadId, repoRoot);
  return `CF1056 SYNTHETIC MUR ${asString(productLabel) || 'Website Rescue'} — TEST-ONLY DO NOT SEND [${key}]`;
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(days));
  return d.toISOString().slice(0, 10);
}

function todayUtc(now) {
  const raw = asString(now) || new Date().toISOString();
  return raw.slice(0, 10);
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
    erpnext_quotation: extra.erpnext_quotation || null,
    customer: extra.customer || null,
    erpnext_lead: extra.erpnext_lead || null,
    erpnext_opportunity: extra.erpnext_opportunity || null,
    pointer: null,
    pointer_persisted: false,
    postgres_persist: 'not_written',
    duplicate_quotation_count: extra.duplicate_quotation_count || 0,
    sales_invoice_created: false,
    payment_entry_created: false,
    taxes_applied: false,
    readback: extra.readback || null,
    audit: extra.audit || [],
    error: code,
    ...extra,
  };
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

function rowIdempotencyText(row) {
  return [row?.title, row?.customer_notes, row?.remarks, row?.name].map(asString).join(' | ');
}

export function acceptedCommercialRecordMechanism(repoRoot = REPO_ROOT) {
  const cfg = loadSellingQuoteToCashConfig(repoRoot).accepted_commercial_record || {};
  return {
    custom_acceptance_engine: cfg.custom_engine === true,
    sales_order_required: cfg.sales_order_required === true,
    primary_erpnext_doctype: asString(cfg.primary_doctype) || 'Quotation',
    synthetic_state: cfg.synthetic_state || { docstatus: 0, status: 'Draft' },
    live_after_anton_gates: cfg.live_after_anton_gates || { docstatus: 1, status: 'Open' },
    erpnext_acceptance: asString(cfg.erpnext_acceptance),
    corpflow_acceptance: asString(cfg.corpflow_acceptance),
    this_packet_submits_quotation: false,
    this_packet_creates_comment: false,
    reason:
      'Standard ERPNext Quotation is the offer. Services do not require Sales Order. Synthetic proof stays draft. Comment create is not required for this mapping packet.',
  };
}

export function classifyAccountingFoundation(snapshot, repoRoot = REPO_ROOT) {
  const cfg = loadSellingQuoteToCashConfig(repoRoot).accountant_foundation || {};
  const row = snapshot && typeof snapshot === 'object' ? snapshot : cfg;
  const blockers = [];
  if (row.accountant_coa_approved !== true) blockers.push('COA_NOT_ACCOUNTANT_APPROVED');
  if (row.accountant_tax_approved !== true) blockers.push('TAX_VAT_NOT_ACCOUNTANT_APPROVED');
  if (row.accountant_defaults_approved !== true) {
    blockers.push('RECEIVABLE_INCOME_DEFAULTS_NOT_ACCOUNTANT_APPROVED');
  }
  return {
    ok: blockers.length === 0,
    blockers,
    classification: blockers.length ? 'BLOCKED BY ACCOUNTANT FOUNDATION' : 'ACCOUNTANT_FOUNDATION_APPROVED',
    stop_point: asString(cfg.stop_point),
    source_issue: Number(cfg.source_issue) || 1055,
  };
}

export function salesInvoicePostingAllowed(snapshot, repoRoot = REPO_ROOT) {
  const foundation = classifyAccountingFoundation(snapshot, repoRoot);
  return {
    allowed: foundation.ok,
    create_draft_this_packet: false,
    submit: false,
    reason: foundation.ok ? '' : 'BLOCKED BY ACCOUNTANT FOUNDATION',
    blockers: foundation.blockers,
  };
}

export function invoiceDoesNotGrantProceedApproved(invoiceDoc, extra = {}) {
  const product = asString(extra.product) || 'website-rescue';
  const stub = toCommercialRailProposalStub(invoiceDoc, product);
  const record = {
    product,
    proposal: {
      status: stub.proposal_status,
      version: stub.proposal_version || asString(invoiceDoc?.name) || 'ACC-SINV-SYN',
      scope_summary: asString(extra.scope_summary) || 'Synthetic Website Rescue landing-page rescue.',
      currency: stub.quoted_currency || asString(invoiceDoc?.currency) || 'MUR',
      setup_price: stub.setup_price ?? asNumber(invoiceDoc?.grand_total) ?? 45000,
      payment_terms: stub.payment_terms || '50% deposit by manual bank transfer. Proof-of-payment is not clearance.',
    },
  };
  const gate = canMarkFinanciallyApproved(record);
  return {
    ok: stub.financially_approved === false && gate.ok === false,
    financially_approved: false,
    erpnext_never_sets_financially_approved: stub.financially_approved === false,
    gate_ok: gate.ok === true,
    blockers: gate.blockers,
    invoice_name: asString(invoiceDoc?.name),
    invoice_docstatus: asNumber(invoiceDoc?.docstatus),
  };
}

export function mapPaymentEvidenceWithoutPaymentEntry(opts = {}) {
  const status = asString(opts.status) || 'recorded';
  return {
    doctype_used: 'none',
    payment_entry_created: false,
    payment_entry_forbidden: true,
    rail: 714,
    payment_evidence: {
      status,
      evidence_type: asString(opts.evidence_type) || 'bank_transfer_reference',
      evidence_ref: asString(opts.evidence_ref) || 'SYN-1056-POP-REF',
      amount_evidenced: asNumber(opts.amount) ?? 22500,
      currency: asString(opts.currency) || 'MUR',
      linked_quotation: asString(opts.quotation) || '',
      linked_invoice: asString(opts.invoice) || '',
    },
    erpnext_payment_entry: null,
    note: 'Manual verification is recorded on the #714 rail. Bank clearance remains operator-owned. Do not create a Payment Entry in this packet.',
  };
}

export function evaluateProceedApprovedFromSellingPath(record) {
  const gate = canMarkFinanciallyApproved(record);
  return {
    ok: gate.ok === true,
    financially_approved: gate.ok === true,
    blockers: gate.blockers,
  };
}

export function usdReuseProof(repoRoot = REPO_ROOT) {
  const reuse = loadSellingQuoteToCashConfig(repoRoot).reuse_882 || {};
  return {
    created_this_packet: false,
    quotation: asString(reuse.usd_quotation),
    invoice_draft: asString(reuse.usd_invoice_draft),
    conversion_rate: Number(reuse.usd_conversion_rate) || 47.15,
    path: 'reuse_existing_882_only',
  };
}

function expectedLine(repoRoot) {
  const cfg = loadSellingQuoteToCashConfig(repoRoot);
  const item = getCatalogueItem(cfg.item.item_code, repoRoot);
  if (!item) return { item_code: cfg.item.item_code, qty: cfg.item.qty, uom: cfg.item.uom, rate: cfg.item.expected_rate_mur };
  return toQuotationLine(item, { qty: cfg.item.qty, rate: cfg.item.expected_rate_mur });
}

export function buildDraftQuotationPayload(event, opts = {}) {
  const repoRoot = opts.repoRoot || REPO_ROOT;
  const cfg = loadSellingQuoteToCashConfig(repoRoot);
  const now = todayUtc(opts.now);
  const leadId = asString(event.lead_id || event.id);
  const customer = asString(event.customer || event.legal_name);
  const idempotencyKey = buildSellingIdempotencyKey(leadId, repoRoot);
  const line = expectedLine(repoRoot);
  return {
    doctype: 'Quotation',
    quotation_to: cfg.quotation.quotation_to,
    party_name: customer,
    company: cfg.company,
    order_type: cfg.quotation.order_type,
    transaction_date: now,
    valid_till: addDays(now, cfg.quotation.validity_days),
    currency: cfg.primary_currency,
    conversion_rate: 1,
    selling_price_list: cfg.quotation.selling_price_list,
    price_list_currency: cfg.primary_currency,
    plc_conversion_rate: 1,
    tc_name: cfg.quotation.terms_name,
    letter_head: cfg.quotation.letter_head,
    title: quotationTitleFor('Website Rescue', leadId, repoRoot),
    customer_notes: `synthetic=true issue=1056 ${idempotencyKey} DO NOT SEND DO NOT SUBMIT`,
    opportunity: asString(event.erpnext_opportunity) || undefined,
    customer_address: asString(event.address) || undefined,
    contact_person: asString(event.contact) || undefined,
    items: [
      {
        item_code: line.item_code,
        qty: line.qty,
        uom: line.uom,
      },
    ],
  };
}

async function searchExistingQuotation(client, { customer, currency, idempotency_key, item_code }) {
  const listed = await client.list('Quotation', {
    fields: ['name', 'title', 'party_name', 'customer_name', 'currency', 'grand_total', 'docstatus', 'status', 'opportunity'],
    filters: [
      ['party_name', '=', customer],
      ['currency', '=', currency],
    ],
    limit: 50,
  });
  if (!listed.ok) return { ok: false, http: listed.http, error: listed.error, quotations: [] };
  const rows = uniqueRows(listed.rows || []);
  const keyed = rows.filter((row) => rowIdempotencyText(row).includes(idempotency_key));
  return { ok: true, http: listed.http, error: null, quotations: rows, keyed, item_code };
}

function decideQuotationAction(search, { idempotency_key, item_code }) {
  const keyed = uniqueRows(search.keyed || []);
  if (keyed.length > 1) {
    return { action: 'CONFLICT', reason: 'DUPLICATE_QUOTATION', canonical: asString(keyed[0]?.name) };
  }
  if (keyed.length === 1) {
    return { action: 'UPDATE', reason: 'IDEMPOTENT_MATCH', canonical: asString(keyed[0].name) };
  }
  const others = (search.quotations || []).filter((row) => {
    if (asNumber(row.docstatus) !== 0) return false;
    const items = Array.isArray(row.items) ? row.items : [];
    if (items.length && item_code && !items.some((item) => asString(item.item_code) === item_code)) return false;
    return !rowIdempotencyText(row).includes(idempotency_key);
  });
  if (others.length) {
    return { action: 'CONFLICT', reason: 'EXISTING_DRAFT_WITHOUT_KEY', canonical: asString(others[0].name) };
  }
  return { action: 'CREATE', reason: 'NO_MATCH', canonical: '' };
}

async function persistPointer(referenceStore, leadId, pointer) {
  if (!referenceStore || typeof referenceStore.getLead !== 'function' || typeof referenceStore.saveLead !== 'function') {
    return false;
  }
  const existing = referenceStore.getLead(leadId) || { id: leadId, qualification_json: {} };
  referenceStore.saveLead({
    ...existing,
    id: leadId,
    qualification_json: mergeErpnextPointerIntoQualificationJson(existing.qualification_json, pointer),
  });
  return true;
}

/**
 * Create or update exactly one draft MUR Quotation for a reused WP2 Customer.
 */
export async function reconcileDraftQuotation(event, opts) {
  const repoRoot = opts.repoRoot || REPO_ROOT;
  const now = asString(opts.now) || new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const client = opts.client;
  const referenceStore = opts.referenceStore;
  const audit = [];
  const cfg = loadSellingQuoteToCashConfig(repoRoot);

  const leadId = asString(event.lead_id || event.id);
  const intake = event.intake && typeof event.intake === 'object' ? { ...event.intake } : { ...event };
  const synthetic = event.synthetic === true || intake.synthetic === true;
  const customer = asString(event.customer || intake.customer || intake.legal_name);
  const opportunity = asString(event.erpnext_opportunity || intake.erpnext_opportunity);
  const leadName = asString(event.erpnext_lead || intake.erpnext_lead);

  if (!leadId) return fail('LEAD_ID_REQUIRED', { audit });
  if (!synthetic && opts.allowRealCustomer !== true) {
    return fail('REAL_PROSPECT_REQUIRES_ANTON', { audit, customer });
  }
  const secrets = listForbiddenSecretKeys({ ...intake, ...event });
  if (secrets.length) return fail('SECRET_FIELDS_FORBIDDEN', { audit, secret_field_names: secrets });
  if (!customer) return fail('CUSTOMER_REQUIRED', { audit });
  if (
    isForbiddenLiveCustomerName(customer, repoRoot) ||
    (cfg.forbidden_customer_names || []).some((name) => asString(name).toLowerCase() === customer.toLowerCase())
  ) {
    return fail('FORBIDDEN_CUSTOMER_NAME', { audit, customer });
  }
  if (!leadName) return fail('UPSTREAM_LEAD_REQUIRED', { audit, customer });
  if (!opportunity) return fail('UPSTREAM_OPPORTUNITY_REQUIRED', { audit, customer, erpnext_lead: leadName });

  const idempotencyKey = buildSellingIdempotencyKey(leadId, repoRoot);
  const payload = buildDraftQuotationPayload(
    { ...event, ...intake, lead_id: leadId, customer, erpnext_opportunity: opportunity },
    { repoRoot, now },
  );

  const search = await searchExistingQuotation(client, {
    customer,
    currency: cfg.primary_currency,
    idempotency_key: idempotencyKey,
    item_code: cfg.item.item_code,
  });
  audit.push(
    auditEvent({
      at: now,
      action: 'SEARCH_QUOTATION',
      ok: search.ok === true,
      reason: search.ok ? 'SEARCH_BEFORE_CREATE' : 'SEARCH_FAILED',
      http: search.http,
      doctype: 'Quotation',
      error: search.error,
    }),
  );
  if (!search.ok) return fail('QUOTATION_SEARCH_FAILED', { audit, http: search.http, customer, erpnext_lead: leadName });

  const decision = decideQuotationAction(search, { idempotency_key: idempotencyKey, item_code: cfg.item.item_code });
  if (decision.action === 'CONFLICT') {
    audit.push(
      auditEvent({
        at: now,
        action: 'CONFLICT',
        ok: false,
        reason: decision.reason,
        doctype: 'Quotation',
        name: decision.canonical,
      }),
    );
    return fail(decision.reason, {
      audit,
      action: 'CONFLICT',
      erpnext_quotation: decision.canonical,
      customer,
      erpnext_lead: leadName,
    });
  }

  let liveName = decision.canonical;
  let action = decision.action;
  if (decision.action === 'UPDATE') {
    const updated = await client.update(
      'Quotation',
      decision.canonical,
      pickAllowed(payload, cfg.allowed_quotation_update_fields),
    );
    audit.push(
      auditEvent({
        at: now,
        action: 'UPDATE_QUOTATION',
        ok: updated.ok === true,
        reason: decision.reason,
        http: updated.http,
        doctype: 'Quotation',
        name: decision.canonical,
        error: updated.error,
      }),
    );
    if (!updated.ok) {
      return fail('QUOTATION_UPDATE_FAILED', {
        audit,
        http: updated.http,
        erpnext_quotation: decision.canonical,
        customer,
        erpnext_lead: leadName,
      });
    }
    liveName = asString(updated.row?.name) || decision.canonical;
  } else {
    const created = await client.create('Quotation', payload);
    audit.push(
      auditEvent({
        at: now,
        action: 'CREATE_QUOTATION',
        ok: created.ok === true,
        reason: decision.reason,
        http: created.http,
        doctype: 'Quotation',
        name: asString(created.row?.name),
        error: created.error,
      }),
    );
    if (!created.ok || !created.row?.name) {
      return fail('QUOTATION_CREATE_FAILED', { audit, http: created.http, customer, erpnext_lead: leadName });
    }
    liveName = asString(created.row.name);
    action = 'CREATE';
  }

  const got = await client.get('Quotation', liveName);
  if (!got.ok || !got.row) {
    return fail('QUOTATION_READBACK_FAILED', { audit, http: got.http, erpnext_quotation: liveName, customer });
  }

  const recount = await searchExistingQuotation(client, {
    customer,
    currency: cfg.primary_currency,
    idempotency_key: idempotencyKey,
    item_code: cfg.item.item_code,
  });
  const matching = uniqueRows(recount.keyed || []);
  const duplicateCount = matching.length;

  const items = Array.isArray(got.row.items) ? got.row.items : [];
  const firstItem = items[0] || {};
  const fx = conversionRateIsSafe(got.row, cfg.primary_currency);
  const draft = syntheticDocumentsMustStayDraft(got.row);
  const mismatches = [];
  if (asString(got.row.party_name) !== customer && asString(got.row.customer_name) !== customer) {
    mismatches.push('customer');
  }
  if (asString(got.row.currency) !== cfg.primary_currency) mismatches.push('currency');
  if (!fx.ok) mismatches.push(...fx.blockers);
  if (!draft.ok) mismatches.push(...draft.blockers);
  if (docstatusOf(got.row) !== 0) mismatches.push('docstatus');
  if (asString(got.row.taxes_and_charges)) mismatches.push('taxes_applied');
  if (asString(firstItem.item_code) !== cfg.item.item_code) mismatches.push('item_code');
  if (asNumber(got.row.grand_total) !== cfg.item.expected_rate_mur) mismatches.push('grand_total');
  if (!rowIdempotencyText(got.row).includes(idempotencyKey)) mismatches.push('idempotency_key');

  const pointer = {
    schema: POINTER_SCHEMA,
    quotation_bridge: BRIDGE_ID,
    selling_issue: 1056,
    lead_id: leadId,
    quotation_idempotency_key: idempotencyKey,
    erpnext_quotation: liveName,
    erpnext_lead: leadName,
    erpnext_opportunity: opportunity,
    customer,
    last_quotation_action: action,
    updated_at: now,
  };
  const pointerPersisted = await persistPointer(referenceStore, leadId, pointer);

  const ok = mismatches.length === 0 && duplicateCount === 1 && docstatusOf(got.row) === 0;
  return {
    ok,
    action,
    reason: decision.reason,
    erpnext_quotation: liveName,
    customer,
    erpnext_lead: leadName,
    erpnext_opportunity: opportunity,
    contact: asString(event.contact || intake.contact),
    address: asString(event.address || intake.address),
    idempotency_key: idempotencyKey,
    pointer,
    pointer_persisted: pointerPersisted,
    pointer_location: cfg.persistence.approved_pointer_location,
    postgres_persist: 'not_written',
    duplicate_quotation_count: duplicateCount,
    sales_invoice_created: false,
    payment_entry_created: false,
    taxes_applied: Boolean(asString(got.row.taxes_and_charges)),
    mismatches,
    readback: {
      name: asString(got.row.name),
      docstatus: docstatusOf(got.row),
      status: asString(got.row.status),
      currency: asString(got.row.currency),
      conversion_rate: asNumber(got.row.conversion_rate),
      grand_total: asNumber(got.row.grand_total),
      selling_price_list: asString(got.row.selling_price_list),
      tc_name: asString(got.row.tc_name),
      valid_till: asString(got.row.valid_till),
      title: asString(got.row.title),
      item_code: asString(firstItem.item_code),
      item_rate: asNumber(firstItem.rate),
      taxes_and_charges: asString(got.row.taxes_and_charges) || null,
      opportunity: asString(got.row.opportunity),
    },
    audit,
    error: ok ? null : mismatches.length ? 'READBACK_MISMATCH' : 'DUPLICATE_QUOTATION',
  };
}

export async function proveSellingQuotationIdempotency(event, opts) {
  const first = await reconcileDraftQuotation(event, opts);
  const second = await reconcileDraftQuotation(event, opts);
  return {
    ok: first.ok === true && second.ok === true && second.action === 'UPDATE' && second.duplicate_quotation_count === 1,
    first,
    second,
    created_on_replay: second.action === 'CREATE',
  };
}

export function evaluateQuoteToCashReadiness(evidence, repoRoot = REPO_ROOT) {
  const missing = [];
  if (!asString(evidence?.upstream?.erpnext_lead)) missing.push('UPSTREAM_LEAD');
  if (!asString(evidence?.upstream?.erpnext_opportunity)) missing.push('UPSTREAM_OPPORTUNITY');
  if (!asString(evidence?.upstream?.customer)) missing.push('UPSTREAM_CUSTOMER');
  if (!asString(evidence?.quotation?.name)) missing.push('QUOTATION');
  if (evidence?.quotation && docstatusOf(evidence.quotation) !== 0) missing.push('QUOTATION_NOT_DRAFT');
  if (evidence?.proceed_approved_gate?.ok !== true) missing.push('PROCEED_APPROVED_GATE_UNPROVEN');
  if (evidence?.invoice_does_not_approve?.ok !== true) missing.push('INVOICE_GATE_UNPROVEN');

  const foundation = classifyAccountingFoundation(evidence?.accountant_foundation, repoRoot);
  const sellingOk = missing.length === 0;
  const quoteToCashReady = sellingOk && foundation.ok === true && evidence?.sales_invoice_posted === true;
  return {
    selling_quotation_ready: sellingOk,
    selling_quotation_sub_verdict: sellingOk ? SELLING_QUOTATION_SUB_VERDICT : `NOT READY — ${missing[0] || 'SELLING_GAP'}`,
    accountant_foundation: foundation,
    sales_invoice_posted: evidence?.sales_invoice_posted === true,
    payment_entry_created: evidence?.payment_entry_created === true,
    quote_to_cash_ready: quoteToCashReady,
    missing,
    verdict: quoteToCashReady ? 'ERPNext SELLING / QUOTE-TO-CASH READY' : CANONICAL_VERDICT,
    exact_blocker: quoteToCashReady ? null : foundation.ok ? missing[0] : 'BLOCKED BY ACCOUNTANT FOUNDATION',
  };
}
