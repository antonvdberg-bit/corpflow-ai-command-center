/**
 * ERPNext Client Master (#880).
 *
 * Pure mapping + duplicate/update rules for onboarding commercial identity
 * onto standard ERPNext Customer / Contact / Address.
 *
 * No live ERPNext calls. No secrets. No custom fields.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../..');
const CONFIG_REL = 'config/erpnext-client-master.v1.json';

/** @type {Record<string, unknown> | null} */
let cachedConfig = null;

export const STORE = Object.freeze({
  ERPNEXT_COMMERCIAL: 'erpnext_commercial',
  CORPFLOW_DELIVERY: 'corpflow_delivery',
  COMPANY_MASTER_EVIDENCE: 'company_master_evidence',
  APPROVED_SECURE_CHANNEL: 'approved_secure_channel',
});

/** Intake / shared fields that belong on ERPNext Customer / Contact / Address. */
const COMMERCIAL_FIELD_IDS = new Set([
  'business_display_name',
  'legal_name',
  'trading_name',
  'primary_contact_name',
  'working_email',
  'working_whatsapp',
  'working_phone',
  'named_approver',
  'tax_id',
  'brn',
  'billing_address_line1',
  'billing_city',
  'billing_country',
  'website',
  'current_site_url',
  'service_area',
  'shared.business_identity',
  'shared.primary_contact',
]);

/** Delivery-only intake from #715 / #716 (and Mauritius process rows). */
const DELIVERY_FIELD_IDS = new Set([
  'timezone',
  'enquiry_sources',
  'primary_leaky_source',
  'current_process_summary',
  'users_operators',
  'lead_stages',
  'escalation_rules',
  'approved_response_rules',
  'test_scenarios',
  'reporting_requirements',
  'client_responsibilities',
  'exclusions',
  'acceptance_measures',
  'review_cadence',
  'case_type',
  'tier',
  'domain_hostname',
  'hosting_facts_summary',
  'brand_assets_status',
  'pages_in_scope',
  'services_or_products_summary',
  'content_ownership',
  'enquiry_destination',
  'design_preferences',
  'revision_authority',
  'maintenance_boundary',
  'content_assets_ready',
  'approved_access_confirmed',
  'dns_cutover_in_scope',
  'shared.financial_approval',
  'shared.named_approver',
  'shared.client_responsibilities_ack',
  'shared.exclusions_ack',
  'shared.acceptance_measures',
  'shared.review_cadence',
]);

const SECRET_FIELD_IDS = new Set([
  'passwords',
  'password',
  'otps',
  'otp',
  'card_numbers',
  'cvv',
  'bank_account_numbers',
  'government_id',
  'api_keys',
  'api_key',
  'ssh_key',
  'private_key',
  'dns_password',
  'hosting_password',
  'registrar_password',
  'ftp_password',
  'mailbox_password',
  'messaging_token',
  'full_crm_exports',
  'health_data',
]);

const SECRET_KEY_RE =
  /password|passwd|otp|secret|token|api[_-]?key|private[_-]?key|ssh|card_number|cvv|iban|bank_account|government_id|national_id/i;

/**
 * @param {string} [repoRoot]
 * @returns {Record<string, unknown>}
 */
export function loadErpnextClientMasterConfig(repoRoot = REPO_ROOT) {
  if (cachedConfig && repoRoot === REPO_ROOT) return cachedConfig;
  const parsed = JSON.parse(readFileSync(path.join(repoRoot, CONFIG_REL), 'utf8'));
  if (repoRoot === REPO_ROOT) cachedConfig = parsed;
  return parsed;
}

export function resetErpnextClientMasterConfigCache() {
  cachedConfig = null;
}

/**
 * @param {unknown} v
 * @returns {string}
 */
export function asTrimmedString(v) {
  if (v == null) return '';
  return String(v).trim();
}

/**
 * @param {string} name
 * @returns {string}
 */
export function normalizeCustomerName(name) {
  return asTrimmedString(name)
    .toLowerCase()
    .replace(/\s+-\s+\d+$/, '')
    .replace(/[^\p{L}\p{N}&]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {string} email
 * @returns {string}
 */
export function normalizeEmail(email) {
  return asTrimmedString(email).toLowerCase();
}

/**
 * @param {string} fullName
 * @returns {{ first_name: string, last_name: string }}
 */
export function splitPersonName(fullName) {
  const parts = asTrimmedString(fullName).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: '', last_name: '' };
  if (parts.length === 1) return { first_name: parts[0], last_name: '' };
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
}

/**
 * @param {string} fieldId
 * @returns {string}
 */
export function classifyField(fieldId) {
  const id = asTrimmedString(fieldId);
  if (!id) return STORE.CORPFLOW_DELIVERY;
  if (SECRET_FIELD_IDS.has(id) || SECRET_KEY_RE.test(id)) return STORE.APPROVED_SECURE_CHANNEL;
  if (COMMERCIAL_FIELD_IDS.has(id)) return STORE.ERPNEXT_COMMERCIAL;
  if (DELIVERY_FIELD_IDS.has(id)) return STORE.CORPFLOW_DELIVERY;
  if (id.startsWith('asset.') || id.startsWith('evidence.') || id.startsWith('brand.logo')) {
    return STORE.COMPANY_MASTER_EVIDENCE;
  }
  return STORE.CORPFLOW_DELIVERY;
}

/**
 * @param {Record<string, unknown>} record
 * @returns {string[]}
 */
export function listForbiddenSecretKeys(record) {
  if (!record || typeof record !== 'object') return [];
  const hits = [];
  for (const key of Object.keys(record)) {
    if (classifyField(key) === STORE.APPROVED_SECURE_CHANNEL) hits.push(key);
    const value = record[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const nested of listForbiddenSecretKeys(/** @type {Record<string, unknown>} */ (value))) {
        hits.push(`${key}.${nested}`);
      }
    }
  }
  return hits;
}

/**
 * @param {Record<string, unknown>} intake
 * @param {string} product
 * @param {Record<string, unknown>} [config]
 */
export function buildCustomerPayload(intake, product, config = loadErpnextClientMasterConfig()) {
  const defaults = /** @type {Record<string, string>} */ (config.defaults || {});
  const legalName = asTrimmedString(intake.legal_name) || asTrimmedString(intake.business_display_name);
  const tradingName = asTrimmedString(intake.trading_name);
  const website = asTrimmedString(intake.website) || asTrimmedString(intake.current_site_url);
  const currency =
    asTrimmedString(intake.default_currency) ||
    (product === 'ai-lead-rescue' ? 'USD' : defaults.company_default_currency || 'MUR');
  const territory =
    asTrimmedString(intake.territory) ||
    (asTrimmedString(intake.service_area).toLowerCase().includes('mauritius') || !asTrimmedString(intake.service_area)
      ? defaults.territory_mu
      : defaults.territory_other);
  const details = [
    'corpflow.client_master.v1',
    `product=${product}`,
    intake.synthetic ? 'synthetic=true' : null,
    intake.issue ? `issue=${intake.issue}` : 'issue=880',
    intake.external_ref ? `ref=${asTrimmedString(intake.external_ref)}` : null,
    tradingName && tradingName !== legalName ? `trading_name=${tradingName}` : null,
    'do_not_use_for_live_billing=' + (intake.synthetic ? 'true' : 'false'),
  ]
    .filter(Boolean)
    .join(' | ');

  return {
    doctype: 'Customer',
    customer_name: legalName,
    customer_type: asTrimmedString(intake.customer_type) || defaults.customer_type_company,
    customer_group: asTrimmedString(intake.customer_group) || defaults.customer_group,
    territory,
    default_currency: currency,
    default_price_list: asTrimmedString(intake.default_price_list) || defaults.selling_price_list,
    tax_id: asTrimmedString(intake.tax_id) || asTrimmedString(intake.brn) || undefined,
    website: website || undefined,
    customer_details: details,
  };
}

/**
 * @param {Record<string, unknown>} intake
 * @param {string} customerName
 * @param {Record<string, unknown>} [config]
 */
export function buildContactPayload(intake, customerName, config = loadErpnextClientMasterConfig()) {
  const defaults = /** @type {Record<string, string>} */ (config.defaults || {});
  const person = splitPersonName(asTrimmedString(intake.primary_contact_name));
  const email = asTrimmedString(intake.working_email);
  const mobile = asTrimmedString(intake.working_whatsapp) || asTrimmedString(intake.working_phone);
  const designation =
    asTrimmedString(intake.contact_designation) ||
    (asTrimmedString(intake.named_approver) === asTrimmedString(intake.primary_contact_name)
      ? 'Owner / named approver'
      : 'Primary contact');
  return {
    doctype: 'Contact',
    first_name: person.first_name,
    last_name: person.last_name || undefined,
    company_name: customerName,
    designation,
    status: defaults.contact_status,
    is_primary_contact: 1,
    is_billing_contact: 1,
    email_id: email || undefined,
    mobile_no: mobile || undefined,
    email_ids: email ? [{ email_id: email, is_primary: 1 }] : [],
    phone_nos: mobile ? [{ phone: mobile, is_primary_mobile_no: 1 }] : [],
    links: [{ link_doctype: 'Customer', link_name: customerName }],
  };
}

/**
 * @param {Record<string, unknown>} intake
 * @param {string} customerName
 * @param {Record<string, unknown>} [config]
 */
export function buildAddressPayload(intake, customerName, config = loadErpnextClientMasterConfig()) {
  const defaults = /** @type {Record<string, string>} */ (config.defaults || {});
  return {
    doctype: 'Address',
    address_title: customerName,
    address_type: asTrimmedString(intake.address_type) || defaults.address_type,
    address_line1: asTrimmedString(intake.billing_address_line1) || 'Address to be confirmed',
    address_line2: asTrimmedString(intake.billing_address_line2) || undefined,
    city: asTrimmedString(intake.billing_city) || 'Port Louis',
    country: asTrimmedString(intake.billing_country) || 'Mauritius',
    is_primary_address: 1,
    is_shipping_address: 1,
    links: [{ link_doctype: 'Customer', link_name: customerName }],
  };
}

/**
 * @param {{ customers?: Array<Record<string, unknown>>, contacts?: Array<Record<string, unknown>> }} existing
 * @param {{ customer_name: string, email?: string, tax_id?: string }} candidate
 */
export function findDuplicateMatches(existing, candidate) {
  const wantName = normalizeCustomerName(candidate.customer_name);
  const wantEmail = normalizeEmail(candidate.email || '');
  const wantTax = asTrimmedString(candidate.tax_id);
  const customers = Array.isArray(existing.customers) ? existing.customers : [];
  const contacts = Array.isArray(existing.contacts) ? existing.contacts : [];
  const matches = [];

  for (const row of customers) {
    const name = asTrimmedString(row.customer_name || row.name);
    const reasons = [];
    if (wantName && normalizeCustomerName(name) === wantName) reasons.push('normalized_customer_name');
    if (wantTax && asTrimmedString(row.tax_id) && asTrimmedString(row.tax_id) === wantTax) reasons.push('tax_id');
    if (reasons.length) {
      matches.push({
        kind: 'customer',
        name: asTrimmedString(row.name) || name,
        customer_name: name,
        disabled: Boolean(row.disabled),
        reasons,
      });
    }
  }

  if (wantEmail) {
    for (const row of contacts) {
      const email = normalizeEmail(asTrimmedString(row.email_id || row.email));
      if (email && email === wantEmail) {
        matches.push({
          kind: 'contact_email',
          name: asTrimmedString(row.name),
          customer_name: asTrimmedString(row.company_name || row.link_name),
          disabled: false,
          reasons: ['primary_email'],
        });
      }
    }
  }

  return matches;
}

/**
 * @param {ReturnType<typeof findDuplicateMatches>} matches
 * @param {{ customer_name: string, email?: string }} candidate
 */
export function resolveDuplicateAction(matches, candidate) {
  if (!matches.length) return { action: 'CREATE', reason: 'NO_MATCH' };

  const enabledCustomers = matches.filter((m) => m.kind === 'customer' && !m.disabled);
  const disabledCustomers = matches.filter((m) => m.kind === 'customer' && m.disabled);
  const emailMatches = matches.filter((m) => m.kind === 'contact_email');

  if (enabledCustomers.length > 1) {
    return {
      action: 'CONFLICT',
      reason: 'MULTIPLE_ENABLED_CUSTOMERS',
      canonical: enabledCustomers[0].name,
    };
  }

  if (enabledCustomers.length === 1) {
    const canonical = enabledCustomers[0];
    const emailOnOther = emailMatches.find(
      (m) => m.customer_name && normalizeCustomerName(m.customer_name) !== normalizeCustomerName(canonical.customer_name),
    );
    if (emailOnOther) {
      return { action: 'CONFLICT', reason: 'EMAIL_OWNED_BY_OTHER_CUSTOMER', canonical: canonical.name };
    }
    return { action: 'UPDATE', reason: 'MATCH_EXISTING', canonical: canonical.name };
  }

  if (emailMatches.length && !enabledCustomers.length) {
    const otherName = emailMatches[0].customer_name;
    if (otherName && normalizeCustomerName(otherName) !== normalizeCustomerName(candidate.customer_name)) {
      return { action: 'CONFLICT', reason: 'EMAIL_OWNED_BY_OTHER_CUSTOMER', canonical: otherName };
    }
  }

  if (disabledCustomers.length) {
    return {
      action: 'CONFLICT',
      reason: 'DISABLED_DUPLICATE_NEEDS_OPERATOR',
      canonical: disabledCustomers[0].name,
    };
  }

  return { action: 'CREATE', reason: 'NO_MATCH' };
}

/**
 * @param {Record<string, unknown>} customer
 * @param {Record<string, unknown>} [contact]
 * @param {Record<string, unknown>} [address]
 */
export function evaluateQuotationSuitability(customer, contact = {}, address = {}) {
  const missing = [];
  if (!asTrimmedString(customer.name || customer.customer_name)) missing.push('customer');
  if (customer.disabled) missing.push('customer_disabled');
  if (!asTrimmedString(customer.customer_type)) missing.push('customer_type');
  if (!asTrimmedString(customer.customer_group)) missing.push('customer_group');
  if (!asTrimmedString(customer.territory)) missing.push('territory');
  if (!asTrimmedString(customer.default_currency)) missing.push('default_currency');
  if (!asTrimmedString(customer.default_price_list)) missing.push('default_price_list');
  if (!asTrimmedString(customer.customer_primary_contact) && !asTrimmedString(contact.name)) {
    missing.push('primary_contact');
  }
  if (!asTrimmedString(contact.email_id) && !asTrimmedString(customer.email_id)) missing.push('contact_email');
  if (!asTrimmedString(customer.customer_primary_address) && !asTrimmedString(address.name)) {
    missing.push('primary_address');
  }
  if (!asTrimmedString(address.address_line1)) missing.push('address_line1');
  if (!asTrimmedString(address.city)) missing.push('city');
  if (!asTrimmedString(address.country)) missing.push('country');

  const warnings = [];
  const currency = asTrimmedString(customer.default_currency);
  const priceList = asTrimmedString(customer.default_price_list);
  if (currency === 'USD' && priceList === 'Standard Selling') {
    warnings.push('PRICE_LIST_CURRENCY_MISMATCH');
  }

  return {
    ok: missing.length === 0,
    missing,
    warnings,
    quotation_party: {
      quotation_to: 'Customer',
      party_name: asTrimmedString(customer.name || customer.customer_name),
      contact_person: asTrimmedString(customer.customer_primary_contact || contact.name),
      customer_address: asTrimmedString(customer.customer_primary_address || address.name),
    },
    sales_invoice_party: {
      customer: asTrimmedString(customer.name || customer.customer_name),
      contact_person: asTrimmedString(customer.customer_primary_contact || contact.name),
      customer_address: asTrimmedString(customer.customer_primary_address || address.name),
    },
  };
}

/**
 * @param {{ customer_name: string, product: string, financially_approved: boolean }} args
 */
export function buildDeliveryHandoff(args) {
  return {
    commercial_master: 'erpnext',
    erpnext_customer: args.customer_name,
    product: args.product,
    financially_approved: args.financially_approved === true,
    delivery_store: STORE.CORPFLOW_DELIVERY,
    next_state: args.financially_approved === true ? 'approved_to_onboard' : 'awaiting_financial_approval',
    do_not_copy_commercial_fields_into_delivery: true,
  };
}
