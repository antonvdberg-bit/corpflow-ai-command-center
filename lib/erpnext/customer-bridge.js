/**
 * ERPNext WP1 Customer bridge (#1009).
 *
 * CorpFlowAI qualified lead → ERPNext Customer / Contact / Address.
 * Uses the merged #993 / #880 mapping. Search-before-create.
 * Operator/factory invoked. No cron. No schema. No secret logging.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  asTrimmedString,
  buildAddressPayload,
  buildContactPayload,
  buildCustomerPayload,
  findDuplicateMatches,
  listForbiddenSecretKeys,
  loadErpnextClientMasterConfig,
  normalizeCustomerName,
  normalizeEmail,
  resolveDuplicateAction,
} from './client-master.js';
import { customerNameIsForbiddenLiveClient } from './prestige-foundation.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../..');
const CONFIG_REL = 'config/erpnext-customer-bridge.v1.json';

export const CANONICAL_VERDICT = 'WP1 CUSTOMER BRIDGE READY FOR REVIEW';
export const POINTER_SCHEMA = 'corpflow.qualification.erpnext.v1';
export const BRIDGE_ID = 'qualified_customer_identity';

/** @type {ReturnType<typeof loadConfig> | null} */
let cachedConfig = null;

function loadConfig(repoRoot = REPO_ROOT) {
  return JSON.parse(readFileSync(path.join(repoRoot, CONFIG_REL), 'utf8'));
}

export function loadCustomerBridgeConfig(repoRoot = REPO_ROOT) {
  if (cachedConfig && repoRoot === REPO_ROOT) return cachedConfig;
  const parsed = loadConfig(repoRoot);
  if (repoRoot === REPO_ROOT) cachedConfig = parsed;
  return parsed;
}

export function resetCustomerBridgeConfigCache() {
  cachedConfig = null;
}

function asString(v) {
  return asTrimmedString(v);
}

export function buildIdempotencyKey(leadId, repoRoot = REPO_ROOT) {
  const prefix = asString(loadCustomerBridgeConfig(repoRoot).idempotency_prefix) || 'corpflow.customer_bridge.v1';
  return `${prefix}:lead=${asString(leadId)}`;
}

export function isForbiddenLiveCustomerName(customerName, repoRoot = REPO_ROOT) {
  if (customerNameIsForbiddenLiveClient(customerName, repoRoot)) return true;
  const forbidden = loadCustomerBridgeConfig(repoRoot).forbidden_customer_names || [];
  const want = asString(customerName).toLowerCase();
  return forbidden.some((name) => asString(name).toLowerCase() === want);
}

export function isCommerciallyQualifiedStage(stage, repoRoot = REPO_ROOT) {
  const allowed = loadCustomerBridgeConfig(repoRoot).qualified_stages || [];
  return allowed.includes(asString(stage));
}

export function allowedCustomerUpdateFields(repoRoot = REPO_ROOT) {
  return [...(loadCustomerBridgeConfig(repoRoot).allowed_customer_update_fields || [])];
}

/**
 * Approved persistence location from #993: qualification_json.erpnext.
 * Does not add a column. Caller decides whether to write Postgres.
 *
 * @param {unknown} qualificationJson
 * @param {Record<string, unknown>} pointer
 */
export function mergeErpnextPointerIntoQualificationJson(qualificationJson, pointer) {
  const base =
    qualificationJson && typeof qualificationJson === 'object' && !Array.isArray(qualificationJson)
      ? { ...qualificationJson }
      : {};
  const previous =
    base.erpnext && typeof base.erpnext === 'object' && !Array.isArray(base.erpnext) ? { ...base.erpnext } : {};
  return {
    ...base,
    erpnext: {
      ...previous,
      ...pointer,
    },
  };
}

export function buildErpnextPointer(args) {
  return {
    schema: POINTER_SCHEMA,
    bridge: BRIDGE_ID,
    issue: 1009,
    lead_id: asString(args.lead_id),
    idempotency_key: asString(args.idempotency_key),
    customer: asString(args.customer),
    customer_name: asString(args.customer_name || args.customer),
    contact: asString(args.contact || ''),
    address: asString(args.address || ''),
    last_action: asString(args.last_action),
    last_reason: asString(args.last_reason || ''),
    updated_at: asString(args.updated_at),
  };
}

/**
 * In-memory CorpFlowAI reference store (lead id + qualification_json).
 * Does not touch Postgres.
 *
 * @param {Array<Record<string, unknown>>} [seedLeads]
 */
export function createMemoryReferenceStore(seedLeads = []) {
  /** @type {Map<string, Record<string, unknown>>} */
  const leads = new Map();
  for (const row of seedLeads) {
    const id = asString(row.id || row.lead_id);
    if (id) leads.set(id, { ...row, id });
  }
  return {
    kind: 'memory',
    getLead(id) {
      const row = leads.get(asString(id));
      return row ? { ...row } : null;
    },
    saveLead(lead) {
      const id = asString(lead.id || lead.lead_id);
      if (!id) throw new Error('REFERENCE_LEAD_ID_REQUIRED');
      const next = { ...lead, id };
      leads.set(id, next);
      return { ...next };
    },
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
    customer: extra.customer || null,
    contact: extra.contact || null,
    address: extra.address || null,
    pointer: null,
    pointer_persisted: false,
    postgres_persist: 'not_written',
    duplicate_count: extra.duplicate_count || 0,
    readback: extra.readback || null,
    audit: extra.audit || [],
    error: code,
    ...extra,
  };
}

function pickAllowedUpdates(payload, repoRoot = REPO_ROOT) {
  const allowed = new Set(allowedCustomerUpdateFields(repoRoot));
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const key of allowed) {
    if (payload[key] !== undefined) out[key] = payload[key];
  }
  return out;
}

function uniqueRows(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const name = asString(row?.name || row?.customer_name);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(row);
  }
  return out;
}

function matchesLike(value, pattern) {
  const text = asString(value).toLowerCase();
  const raw = asString(pattern);
  const escaped = raw.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.');
  return new RegExp(`^${escaped}$`, 'i').test(text) || text.includes(raw.replace(/%/g, '').toLowerCase());
}

export function rowMatchesFrappeFilter(row, filter) {
  if (!Array.isArray(filter) || filter.length < 3) return true;
  const [field, op, expected] = filter;
  const value = row?.[field];
  const left = asString(value);
  const right = asString(expected);
  if (op === '=') return left === right;
  if (op === '!=') return left !== right;
  if (op === 'like') return matchesLike(left, right);
  return false;
}

/**
 * @param {object} client
 * @param {{ customer_name: string, email?: string, tax_id?: string, idempotency_key: string }} candidate
 */
export async function searchExistingCustomerIdentity(client, candidate) {
  const customerFields = [
    'name',
    'customer_name',
    'tax_id',
    'disabled',
    'customer_details',
    'customer_group',
    'territory',
    'default_currency',
    'default_price_list',
    'website',
    'customer_primary_contact',
    'customer_primary_address',
  ];
  const searches = [
    client.list('Customer', {
      fields: customerFields,
      filters: [['customer_details', 'like', `%${candidate.idempotency_key}%`]],
      limit: 20,
    }),
    client.list('Customer', {
      fields: customerFields,
      filters: [['customer_name', '=', candidate.customer_name]],
      limit: 20,
    }),
    client.list('Customer', {
      fields: customerFields,
      filters: [['customer_name', 'like', `${candidate.customer_name}%`]],
      limit: 20,
    }),
  ];
  if (candidate.email) {
    searches.push(
      client.list('Contact', {
        fields: ['name', 'email_id', 'company_name'],
        filters: [['email_id', '=', candidate.email]],
        limit: 20,
      }),
    );
  }

  const results = await Promise.all(searches);
  for (const result of results) {
    if (!result.ok) {
      return {
        ok: false,
        error: 'SEARCH_FAILED',
        http: result.http,
        customers: [],
        contacts: [],
      };
    }
  }

  const [byKey, byName, byNameLike, byEmail] = results;
  const customers = uniqueRows([...(byKey.rows || []), ...(byName.rows || []), ...(byNameLike.rows || [])]).filter(
    (row) => {
      const name = asString(row.customer_name || row.name);
      const details = asString(row.customer_details);
      return (
        normalizeCustomerName(name) === normalizeCustomerName(candidate.customer_name) ||
        details.includes(candidate.idempotency_key)
      );
    },
  );
  const contacts = Array.isArray(byEmail?.rows) ? byEmail.rows : [];
  return { ok: true, error: null, http: 200, customers, contacts };
}

async function ensureContact(client, intake, customerName, existingContacts) {
  const payload = buildContactPayload(intake, customerName);
  const email = normalizeEmail(payload.email_id || '');
  const hit = (existingContacts || []).find((row) => normalizeEmail(row.email_id || row.email) === email);
  if (hit && asString(hit.name)) {
    const linked = asString(hit.company_name);
    if (linked && normalizeCustomerName(linked) !== normalizeCustomerName(customerName)) {
      return { ok: false, reason: 'EMAIL_OWNED_BY_OTHER_CUSTOMER', row: hit };
    }
    const updated = await client.update('Contact', hit.name, {
      first_name: payload.first_name,
      last_name: payload.last_name,
      company_name: customerName,
      designation: payload.designation,
      is_primary_contact: 1,
      is_billing_contact: 1,
      email_id: payload.email_id,
      mobile_no: payload.mobile_no,
      links: payload.links,
    });
    if (!updated.ok || !updated.row) {
      return { ok: false, reason: 'CONTACT_UPDATE_FAILED', http: updated.http, error: updated.error };
    }
    return { ok: true, action: 'UPDATE', row: updated.row };
  }
  const created = await client.create('Contact', payload);
  if (!created.ok || !created.row) {
    return { ok: false, reason: 'CONTACT_CREATE_FAILED', http: created.http, error: created.error };
  }
  return { ok: true, action: 'CREATE', row: created.row };
}

async function ensureAddress(client, intake, customerName) {
  const payload = buildAddressPayload(intake, customerName);
  const listed = await client.list('Address', {
    fields: ['name', 'address_title', 'address_type', 'address_line1', 'city', 'country'],
    filters: [
      ['address_title', '=', customerName],
      ['address_type', '=', payload.address_type],
    ],
    limit: 10,
  });
  if (!listed.ok) {
    return { ok: false, reason: 'ADDRESS_SEARCH_FAILED', http: listed.http, error: listed.error };
  }
  const hit = (listed.rows || [])[0];
  if (hit && asString(hit.name)) {
    const updated = await client.update('Address', hit.name, {
      address_line1: payload.address_line1,
      address_line2: payload.address_line2,
      city: payload.city,
      country: payload.country,
      is_primary_address: 1,
      is_shipping_address: 1,
      links: payload.links,
    });
    if (!updated.ok || !updated.row) {
      return { ok: false, reason: 'ADDRESS_UPDATE_FAILED', http: updated.http, error: updated.error };
    }
    return { ok: true, action: 'UPDATE', row: updated.row };
  }
  const created = await client.create('Address', payload);
  if (!created.ok || !created.row) {
    return { ok: false, reason: 'ADDRESS_CREATE_FAILED', http: created.http, error: created.error };
  }
  return { ok: true, action: 'CREATE', row: created.row };
}

async function disableSuffixDuplicates(client, customers, canonicalName, audit, now) {
  const canonicalNorm = normalizeCustomerName(canonicalName);
  for (const row of customers) {
    const name = asString(row.name || row.customer_name);
    if (!name || name === canonicalName) continue;
    if (normalizeCustomerName(name) !== canonicalNorm) continue;
    if (row.disabled) continue;
    const updated = await client.update('Customer', name, {
      disabled: 1,
      customer_details: `${asString(row.customer_details)} | DUPLICATE_OF=${canonicalName}`.trim(),
    });
    audit.push(
      auditEvent({
        at: now,
        action: 'DISABLE_SUFFIX_DUPLICATE',
        ok: updated.ok === true,
        reason: updated.ok ? 'SUFFIX_DUPLICATE' : 'DISABLE_FAILED',
        http: updated.http,
        doctype: 'Customer',
        name,
        error: updated.error,
      }),
    );
  }
}

function compareMappedIdentity(customer, contact, address, expected) {
  const mismatches = [];
  if (normalizeCustomerName(customer.customer_name || customer.name) !== normalizeCustomerName(expected.customer_name)) {
    mismatches.push('customer_name');
  }
  if (asString(customer.customer_group) !== asString(expected.customer_group)) mismatches.push('customer_group');
  if (asString(customer.territory) !== asString(expected.territory)) mismatches.push('territory');
  if (asString(customer.default_currency) !== asString(expected.default_currency)) mismatches.push('default_currency');
  if (asString(customer.customer_details).includes(expected.idempotency_key) !== true) {
    mismatches.push('idempotency_key');
  }
  if (expected.email && normalizeEmail(contact.email_id || customer.email_id) !== normalizeEmail(expected.email)) {
    mismatches.push('contact_email');
  }
  if (expected.address_line1 && asString(address.address_line1) !== asString(expected.address_line1)) {
    mismatches.push('address_line1');
  }
  return mismatches;
}

/**
 * Reconcile one CorpFlowAI qualified-customer event into ERPNext.
 *
 * @param {Record<string, unknown>} event
 * @param {{ client: object, referenceStore?: object, now?: string, repoRoot?: string, allowRealCustomer?: boolean }} opts
 */
export async function reconcileQualifiedCustomer(event, opts) {
  const repoRoot = opts.repoRoot || REPO_ROOT;
  const now = asString(opts.now) || new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const client = opts.client;
  const referenceStore = opts.referenceStore;
  const audit = [];
  const cfg = loadCustomerBridgeConfig(repoRoot);
  loadErpnextClientMasterConfig(repoRoot);

  const leadId = asString(event.lead_id || event.id);
  const stage = asString(event.stage);
  const intake = event.intake && typeof event.intake === 'object' ? { ...event.intake } : { ...event };
  const synthetic = event.synthetic === true || intake.synthetic === true;
  const product = asString(event.product || intake.product || 'website-rescue');

  if (!leadId) return fail('LEAD_ID_REQUIRED', { audit });
  if (!isCommerciallyQualifiedStage(stage, repoRoot)) {
    return fail('NOT_COMMERCIALLY_QUALIFIED', { audit, stage });
  }
  if (!synthetic && opts.allowRealCustomer !== true) {
    return fail('REAL_CUSTOMER_REQUIRES_ANTON', { audit });
  }

  const secrets = listForbiddenSecretKeys(intake);
  if (secrets.length) return fail('SECRET_FIELDS_FORBIDDEN', { audit, secret_field_names: secrets });

  intake.synthetic = true;
  intake.issue = intake.issue || 1009;
  intake.external_ref = asString(intake.external_ref) || leadId;
  const customerPayload = buildCustomerPayload(intake, product);
  const customerName = asString(customerPayload.customer_name);
  if (!customerName) return fail('CUSTOMER_NAME_REQUIRED', { audit });
  if (isForbiddenLiveCustomerName(customerName, repoRoot)) {
    return fail('FORBIDDEN_CUSTOMER_NAME', { audit, customer_name: customerName });
  }

  const idempotencyKey = buildIdempotencyKey(leadId, repoRoot);
  customerPayload.customer_details = `${asString(customerPayload.customer_details)} | idempotency_key=${idempotencyKey}`;

  const email = asString(intake.working_email);
  const search = await searchExistingCustomerIdentity(client, {
    customer_name: customerName,
    email,
    tax_id: asString(customerPayload.tax_id),
    idempotency_key: idempotencyKey,
  });
  audit.push(
    auditEvent({
      at: now,
      action: 'SEARCH',
      ok: search.ok === true,
      reason: search.ok ? 'SEARCH_BEFORE_CREATE' : 'SEARCH_FAILED',
      http: search.http,
      doctype: 'Customer',
      error: search.error,
    }),
  );
  if (!search.ok) {
    return fail('SEARCH_FAILED', { audit, http: search.http, postgres_persist: 'not_written' });
  }

  const wantedNorm = normalizeCustomerName(customerName);
  const enabledSameName = (search.customers || []).filter(
    (row) => !row.disabled && normalizeCustomerName(row.customer_name || row.name) === wantedNorm,
  );
  const canonicalRow =
    enabledSameName.find((row) => asString(row.customer_name || row.name) === customerName) ||
    enabledSameName.find((row) => !/ - \d+$/.test(asString(row.customer_name || row.name))) ||
    enabledSameName[0] ||
    null;
  const customersForDecision = (search.customers || []).filter((row) => {
    const sameNorm = normalizeCustomerName(row.customer_name || row.name) === wantedNorm;
    if (!sameNorm) return true;
    if (!canonicalRow) return true;
    return asString(row.name) === asString(canonicalRow.name);
  });

  const decision = resolveDuplicateAction(
    findDuplicateMatches(
      { customers: customersForDecision, contacts: search.contacts },
      {
        customer_name: customerName,
        email,
        tax_id: asString(customerPayload.tax_id),
      },
    ),
    { customer_name: customerName, email },
  );

  if (decision.action === 'CONFLICT') {
    audit.push(auditEvent({ at: now, action: 'CONFLICT', ok: false, reason: decision.reason, doctype: 'Customer', name: decision.canonical }));
    return fail(decision.reason, { audit, action: 'CONFLICT', customer: decision.canonical });
  }

  let customerRow = null;
  let action = decision.action;

  if (decision.action === 'UPDATE') {
    const canonical = asString(decision.canonical);
    const updated = await client.update('Customer', canonical, pickAllowedUpdates(customerPayload, repoRoot));
    audit.push(
      auditEvent({
        at: now,
        action: 'UPDATE',
        ok: updated.ok === true,
        reason: 'MATCH_EXISTING',
        http: updated.http,
        doctype: 'Customer',
        name: canonical,
        error: updated.error,
      }),
    );
    if (!updated.ok || !updated.row) {
      return fail('CUSTOMER_UPDATE_FAILED', { audit, http: updated.http, customer: canonical });
    }
    customerRow = updated.row;
    await disableSuffixDuplicates(client, search.customers, canonical, audit, now);
  } else {
    const created = await client.create('Customer', customerPayload);
    audit.push(
      auditEvent({
        at: now,
        action: 'CREATE',
        ok: created.ok === true,
        reason: 'NO_MATCH',
        http: created.http,
        doctype: 'Customer',
        name: created.row?.name,
        error: created.error,
      }),
    );
    if (!created.ok || !created.row) {
      return fail('CUSTOMER_CREATE_FAILED', { audit, http: created.http });
    }
    customerRow = created.row;
    action = 'CREATE';
  }

  const liveCustomerName = asString(customerRow.name || customerRow.customer_name);
  const contactResult = await ensureContact(client, intake, liveCustomerName, search.contacts);
  audit.push(
    auditEvent({
      at: now,
      action: `CONTACT_${contactResult.action || 'NONE'}`,
      ok: contactResult.ok === true,
      reason: contactResult.reason || contactResult.action,
      http: contactResult.http,
      doctype: 'Contact',
      name: contactResult.row?.name,
      error: contactResult.error,
    }),
  );
  if (!contactResult.ok) {
    return fail(contactResult.reason || 'CONTACT_FAILED', {
      audit,
      customer: liveCustomerName,
      http: contactResult.http,
    });
  }

  const addressResult = await ensureAddress(client, intake, liveCustomerName);
  audit.push(
    auditEvent({
      at: now,
      action: `ADDRESS_${addressResult.action || 'NONE'}`,
      ok: addressResult.ok === true,
      reason: addressResult.reason || addressResult.action,
      http: addressResult.http,
      doctype: 'Address',
      name: addressResult.row?.name,
      error: addressResult.error,
    }),
  );
  if (!addressResult.ok) {
    return fail(addressResult.reason || 'ADDRESS_FAILED', {
      audit,
      customer: liveCustomerName,
      contact: contactResult.row?.name,
      http: addressResult.http,
    });
  }

  const primaryPatch = await client.update('Customer', liveCustomerName, {
    customer_primary_contact: contactResult.row.name,
    customer_primary_address: addressResult.row.name,
  });
  if (primaryPatch.ok && primaryPatch.row) customerRow = primaryPatch.row;

  const gotCustomer = await client.get('Customer', liveCustomerName);
  const gotContact = await client.get('Contact', contactResult.row.name);
  const gotAddress = await client.get('Address', addressResult.row.name);
  if (!gotCustomer.ok || !gotCustomer.row) {
    return fail('CUSTOMER_READBACK_FAILED', { audit, customer: liveCustomerName, http: gotCustomer.http });
  }

  const mismatches = compareMappedIdentity(gotCustomer.row, gotContact.row || {}, gotAddress.row || {}, {
    customer_name: customerName,
    customer_group: customerPayload.customer_group,
    territory: customerPayload.territory,
    default_currency: customerPayload.default_currency,
    idempotency_key: idempotencyKey,
    email,
    address_line1: asString(intake.billing_address_line1) || 'Address to be confirmed',
  });

  const recount = await searchExistingCustomerIdentity(client, {
    customer_name: customerName,
    email,
    tax_id: asString(customerPayload.tax_id),
    idempotency_key: idempotencyKey,
  });
  const enabledMatches = (recount.customers || []).filter((row) => !row.disabled);
  const duplicateCount = enabledMatches.length;

  const pointer = buildErpnextPointer({
    lead_id: leadId,
    idempotency_key: idempotencyKey,
    customer: liveCustomerName,
    customer_name: asString(gotCustomer.row.customer_name || liveCustomerName),
    contact: asString(gotContact.row?.name),
    address: asString(gotAddress.row?.name),
    last_action: action,
    last_reason: decision.reason,
    updated_at: now,
  });

  let pointerPersisted = false;
  if (referenceStore && typeof referenceStore.getLead === 'function' && typeof referenceStore.saveLead === 'function') {
    const existing = referenceStore.getLead(leadId) || { id: leadId, stage, synthetic: true };
    const next = {
      ...existing,
      id: leadId,
      stage,
      synthetic: true,
      qualification_json: mergeErpnextPointerIntoQualificationJson(existing.qualification_json, pointer),
    };
    referenceStore.saveLead(next);
    pointerPersisted = true;
  }

  return {
    ok: mismatches.length === 0 && duplicateCount === 1,
    action,
    reason: decision.reason,
    customer: liveCustomerName,
    customer_name: asString(gotCustomer.row.customer_name || liveCustomerName),
    contact: asString(gotContact.row?.name),
    address: asString(gotAddress.row?.name),
    idempotency_key: idempotencyKey,
    pointer,
    pointer_persisted: pointerPersisted,
    pointer_location: cfg.persistence.approved_pointer_location,
    postgres_persist: 'not_written',
    duplicate_count: duplicateCount,
    mismatches,
    readback: {
      customer_name: asString(gotCustomer.row.customer_name),
      customer_group: asString(gotCustomer.row.customer_group),
      territory: asString(gotCustomer.row.territory),
      default_currency: asString(gotCustomer.row.default_currency),
      website: asString(gotCustomer.row.website),
      email_id: asString(gotContact.row?.email_id || gotCustomer.row.email_id),
      address_line1: asString(gotAddress.row?.address_line1),
      city: asString(gotAddress.row?.city),
      country: asString(gotAddress.row?.country),
      disabled: Boolean(gotCustomer.row.disabled),
    },
    audit,
    error: mismatches.length ? 'READBACK_MISMATCH' : duplicateCount === 1 ? null : 'DUPLICATE_CUSTOMER',
  };
}

/**
 * Run the same synthetic event twice. Second run must not create another Customer.
 */
export async function proveCustomerBridgeIdempotency(event, opts) {
  const first = await reconcileQualifiedCustomer(event, opts);
  const second = await reconcileQualifiedCustomer(event, opts);
  return {
    ok: first.ok === true && second.ok === true && second.action === 'UPDATE' && second.duplicate_count === 1,
    first,
    second,
    created_on_replay: second.action === 'CREATE',
  };
}
