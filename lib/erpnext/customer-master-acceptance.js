/**
 * #1206 ERPNext Customer / Contact master acceptance (GET/read-only).
 *
 * Reuses proven synthetic Customer / Contact / Address names. Never creates,
 * updates, submits, or disables ERPNext rows. Never copies commercial identity
 * into a second CorpFlowAI ledger.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildDeliveryHandoff, evaluateQuotationSuitability } from './client-master.js';
import { searchExistingCustomerIdentity } from './customer-bridge.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../..');
const CONFIG_REL = 'config/erpnext-customer-master-acceptance.v1.json';

export const CANONICAL_VERDICT = 'ERPNext CUSTOMER MASTER READY FOR QUOTATION / DELIVERY';
export const POINTER_SCHEMA = 'corpflow.qualification.erpnext.v1';
export const BRIDGE_ID = 'qualified_customer_identity';

/** @type {ReturnType<typeof loadConfig> | null} */
let cachedConfig = null;

function asTrimmed(value) {
  return value == null ? '' : String(value).trim();
}

function loadConfig(repoRoot = REPO_ROOT) {
  return JSON.parse(readFileSync(path.join(repoRoot, CONFIG_REL), 'utf8'));
}

export function loadCustomerMasterAcceptanceConfig(repoRoot = REPO_ROOT) {
  if (cachedConfig && repoRoot === REPO_ROOT) return cachedConfig;
  const parsed = loadConfig(repoRoot);
  if (repoRoot === REPO_ROOT) cachedConfig = parsed;
  return parsed;
}

export function resetCustomerMasterAcceptanceConfigCache() {
  cachedConfig = null;
}

function enabledCustomerCount(rows) {
  const list = Array.isArray(rows) ? rows : [];
  return list.filter((row) => !row?.disabled && Number(row?.disabled) !== 1).length;
}

function pickIdentity(cfg) {
  const primary = cfg?.primary_identity || {};
  return {
    customer: asTrimmed(primary.customer),
    contact: asTrimmed(primary.contact),
    address: asTrimmed(primary.address),
    quotation: asTrimmed(primary.quotation),
    leadId: asTrimmed(primary.corpflow_lead_id),
  };
}

/**
 * Recorded ERPNext Customer name already stored on a Prospect / lead pointer.
 * Does not invent a join from legal/trading names.
 *
 * @param {unknown} lead
 * @returns {string}
 */
export function erpnextCustomerPointerFromQualification(lead) {
  const row = lead && typeof lead === 'object' && !Array.isArray(lead) ? lead : {};
  const qj =
    row.qualificationJson && typeof row.qualificationJson === 'object'
      ? row.qualificationJson
      : row.qualification_json && typeof row.qualification_json === 'object'
        ? row.qualification_json
        : {};
  const erp = qj.erpnext && typeof qj.erpnext === 'object' && !Array.isArray(qj.erpnext) ? qj.erpnext : {};
  return asTrimmed(erp.customer || erp.customer_name);
}

function redactCustomer(row) {
  if (!row || typeof row !== 'object') return null;
  return {
    name: asTrimmed(row.name) || null,
    customer_name: asTrimmed(row.customer_name) || null,
    customer_type: asTrimmed(row.customer_type) || null,
    customer_group: asTrimmed(row.customer_group) || null,
    territory: asTrimmed(row.territory) || null,
    default_currency: asTrimmed(row.default_currency) || null,
    default_price_list: asTrimmed(row.default_price_list) || null,
    website: asTrimmed(row.website) || null,
    email_id: asTrimmed(row.email_id) || null,
    disabled: Boolean(row.disabled),
    customer_primary_contact: asTrimmed(row.customer_primary_contact) || null,
    customer_primary_address: asTrimmed(row.customer_primary_address) || null,
    lead_name: asTrimmed(row.lead_name) || null,
  };
}

function redactContact(row) {
  if (!row || typeof row !== 'object') return null;
  return {
    name: asTrimmed(row.name) || null,
    first_name: asTrimmed(row.first_name) || null,
    last_name: asTrimmed(row.last_name) || null,
    email_id: asTrimmed(row.email_id) || null,
    company_name: asTrimmed(row.company_name) || null,
  };
}

function redactAddress(row) {
  if (!row || typeof row !== 'object') return null;
  return {
    name: asTrimmed(row.name) || null,
    address_title: asTrimmed(row.address_title) || null,
    address_type: asTrimmed(row.address_type) || null,
    address_line1: asTrimmed(row.address_line1) || null,
    city: asTrimmed(row.city) || null,
    country: asTrimmed(row.country) || null,
  };
}

/**
 * GET/read-only acceptance of one recorded Customer / Contact / Address set.
 *
 * @param {{
 *   client: { get: Function, list: Function, getLoggedUser?: Function },
 *   repoRoot?: string,
 *   currentMainSha?: string,
 * }} args
 */
export async function acceptCustomerMasterReadOnly(args) {
  const cfg = loadCustomerMasterAcceptanceConfig(args?.repoRoot || REPO_ROOT);
  const identity = pickIdentity(cfg);
  const client = args?.client;
  if (!client || typeof client.get !== 'function' || typeof client.list !== 'function') {
    return {
      ok: false,
      verdict: 'NOT READY — ERPNext GET client unavailable',
      exact_blocker: 'erpnext_read_unavailable',
      erpnext_mutated: false,
    };
  }
  let identityUser = '';
  if (typeof client.getLoggedUser === 'function') {
    const auth = await client.getLoggedUser();
    identityUser = asTrimmed(auth?.user);
    if (!auth?.ok) {
      return {
        ok: false,
        verdict: 'NOT READY — ERPNext authentication failed',
        exact_blocker: `authentication_failed_http_${auth?.http || 0}`,
        erpnext_mutated: false,
      };
    }
  }

  const [customerGet, contactGet, addressGet, quotationGet] = await Promise.all([
    client.get('Customer', identity.customer),
    client.get('Contact', identity.contact),
    client.get('Address', identity.address),
    identity.quotation ? client.get('Quotation', identity.quotation) : Promise.resolve({ ok: true, row: null, http: 0 }),
  ]);

  if (!customerGet?.ok || !customerGet.row) {
    return {
      ok: false,
      verdict: `NOT READY — Customer GET failed for ${identity.customer}`,
      exact_blocker: `customer_get_http_${customerGet?.http || 0}`,
      erpnext_mutated: false,
      http: customerGet?.http || 0,
    };
  }
  if (!contactGet?.ok || !contactGet.row) {
    return {
      ok: false,
      verdict: `NOT READY — Contact GET failed for ${identity.contact}`,
      exact_blocker: `contact_get_http_${contactGet?.http || 0}`,
      erpnext_mutated: false,
      http: contactGet?.http || 0,
    };
  }
  if (!addressGet?.ok || !addressGet.row) {
    return {
      ok: false,
      verdict: `NOT READY — Address GET failed for ${identity.address}`,
      exact_blocker: `address_get_http_${addressGet?.http || 0}`,
      erpnext_mutated: false,
      http: addressGet?.http || 0,
    };
  }

  const customer = customerGet.row;
  const contact = contactGet.row;
  const address = addressGet.row;
  const quotation = quotationGet?.ok ? quotationGet.row : null;

  const search = await searchExistingCustomerIdentity(client, {
    customer_name: identity.customer,
    email: asTrimmed(contact.email_id),
    idempotency_key: `corpflow.sales_lifecycle.v1:lead=${identity.leadId}`,
  });
  if (!search.ok) {
    return {
      ok: false,
      verdict: 'NOT READY — search-before-create GET failed',
      exact_blocker: `customer_search_http_${search.http || 0}`,
      erpnext_mutated: false,
    };
  }

  const duplicateCount = enabledCustomerCount(search.customers);
  const suitability = evaluateQuotationSuitability(customer, contact, address);
  const quotationPartyMatches =
    !quotation ||
    asTrimmed(quotation.party_name || quotation.customer_name || quotation.customer) === identity.customer;
  const contactLinked =
    asTrimmed(customer.customer_primary_contact) === identity.contact ||
    asTrimmed(contact.company_name) === identity.customer;
  const addressLinked =
    asTrimmed(customer.customer_primary_address) === identity.address ||
    asTrimmed(address.address_title) === identity.customer;
  const handoff = buildDeliveryHandoff({
    customer_name: identity.customer,
    product: 'website-rescue',
    financially_approved: false,
  });

  const blockers = [];
  if (customer.disabled) blockers.push('customer_disabled');
  if (duplicateCount !== 1) blockers.push(`duplicate_enabled_customer_count_${duplicateCount}`);
  if (!contactLinked) blockers.push('contact_not_linked');
  if (!addressLinked) blockers.push('address_not_linked');
  if (!suitability.ok) blockers.push(`quotation_suitability_missing_${(suitability.missing || []).join('_') || 'unknown'}`);
  if (quotation && !quotationPartyMatches) blockers.push('quotation_party_mismatch');
  if (handoff.do_not_copy_commercial_fields_into_delivery !== true) {
    blockers.push('delivery_handoff_would_copy_commercial_fields');
  }

  const exactBlocker = blockers[0] || null;
  const ready = !exactBlocker;
  return {
    ok: ready,
    verdict: ready ? CANONICAL_VERDICT : `NOT READY — ${exactBlocker}`,
    exact_blocker: exactBlocker,
    erpnext_mutated: false,
    postgres_written: false,
    secrets_printed: false,
    identity: identityUser || null,
    current_main_sha:
      asTrimmed(args.currentMainSha) || asTrimmed(cfg.live_proof?.current_main_sha) || null,
    identifiers: {
      customer: asTrimmed(customer.name),
      customer_name: asTrimmed(customer.customer_name),
      contact: asTrimmed(contact.name),
      address: asTrimmed(address.name),
      quotation: identity.quotation || null,
    },
    customer: redactCustomer(customer),
    contact: redactContact(contact),
    address: redactAddress(address),
    quotation: quotation
      ? {
          name: asTrimmed(quotation.name),
          party_name: asTrimmed(quotation.party_name || quotation.customer_name),
          contact_person: asTrimmed(quotation.contact_person),
          customer_address: asTrimmed(quotation.customer_address),
          docstatus: Number(quotation.docstatus) || 0,
        }
      : null,
    search_before_create: {
      ok: search.ok,
      enabled_duplicate_count: duplicateCount,
      created_on_replay: false,
    },
    quotation_suitability: {
      ok: suitability.ok,
      missing: suitability.missing,
      warnings: suitability.warnings,
      quotation_party: suitability.quotation_party,
    },
    corpflow_reference: {
      pointer_location: 'leads.qualification_json.erpnext',
      copies_customer_ledger: false,
      delivery_handoff_customer_only: handoff.erpnext_customer,
      company_master_erpnext_column: false,
    },
    workspace_recorded_pointers: cfg.workspace_recorded_pointers || [],
  };
}
