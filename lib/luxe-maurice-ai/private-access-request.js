/**
 * LuxeMaurice AI v2 — private access request validation and lead shaping.
 * Shared by server handler and tests. Uses existing `leads` table via qualification_json.
 */

import { randomUUID } from 'node:crypto';

import { LUXE_MAURICE_AI_ACCESS_CATEGORIES } from '../client/luxe-maurice-ai-data.js';

export const LUXE_MAURICE_AI_TENANT_SLUG = 'luxe-maurice';

export const LUXE_MAURICE_AI_ACCESS_REQUEST_INTENT = 'lux_private_access_request';

export const LUXE_MAURICE_AI_ACCESS_REQUEST_SOURCE = 'luxe-maurice-ai';

export const LUXE_MAURICE_AI_ACCESS_REQUEST_STATUS = 'review_required';

const ACCESS_CATEGORY_KEYS = new Set(LUXE_MAURICE_AI_ACCESS_CATEGORIES.map((c) => c.key));

function safeStr(value) {
  return value != null ? String(value).trim() : '';
}

/**
 * Force LuxeMaurice tenant from host context — never trust client body.
 * @param {{ corpflowContext?: { surface?: string, tenant_id?: string } } | null | undefined} req
 * @returns {{ ok: true, tenantId: string } | { ok: false, status: number, error: string }}
 */
export function resolveLuxeMauriceAccessRequestTenant(req) {
  const ctx = req?.corpflowContext;
  if (!ctx || ctx.surface !== 'tenant') {
    return { ok: false, status: 400, error: 'TENANT_CONTEXT_REQUIRED' };
  }
  const hostTenant = safeStr(ctx.tenant_id);
  if (hostTenant !== LUXE_MAURICE_AI_TENANT_SLUG) {
    return { ok: false, status: 403, error: 'LUXE_MAURICE_TENANT_REQUIRED' };
  }
  return { ok: true, tenantId: LUXE_MAURICE_AI_TENANT_SLUG };
}

/**
 * @param {unknown} body
 * @returns {{ ok: true, data: Record<string, unknown> } | { ok: false, error: string, field?: string }}
 */
export function validatePrivateAccessRequestBody(body) {
  const src = body && typeof body === 'object' ? body : {};
  const fullName = safeStr(src.full_name);
  const email = safeStr(src.email).toLowerCase();

  if (!fullName) {
    return { ok: false, error: 'Name is required.', field: 'full_name' };
  }
  if (!email) {
    return { ok: false, error: 'Email is required.', field: 'email' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Enter a valid email address.', field: 'email' };
  }

  const budgetMinRaw = safeStr(src.budget_min);
  const budgetMaxRaw = safeStr(src.budget_max);
  const budgetMin = budgetMinRaw ? Number(budgetMinRaw) : null;
  const budgetMax = budgetMaxRaw ? Number(budgetMaxRaw) : null;

  if (budgetMinRaw && !Number.isFinite(budgetMin)) {
    return { ok: false, error: 'Enter a valid budget minimum.', field: 'budget_min' };
  }
  if (budgetMaxRaw && !Number.isFinite(budgetMax)) {
    return { ok: false, error: 'Enter a valid budget maximum.', field: 'budget_max' };
  }

  const accessCategory = safeStr(src.access_category) || null;
  if (accessCategory && !ACCESS_CATEGORY_KEYS.has(accessCategory)) {
    return { ok: false, error: 'Select a valid access category.', field: 'access_category' };
  }

  return {
    ok: true,
    data: {
      full_name: fullName,
      email,
      phone: safeStr(src.phone) || null,
      budget_min: budgetMin,
      budget_max: budgetMax,
      currency_code: safeStr(src.currency_code) || 'USD',
      desired_location: safeStr(src.desired_location) || null,
      access_category: accessCategory,
      property_type: safeStr(src.property_type) || null,
      access_intent: safeStr(src.access_intent) || null,
      notes: safeStr(src.notes) || null,
      property_id: safeStr(src.property_id) || null,
      property_slug: safeStr(src.property_slug) || null,
    },
  };
}

/**
 * @param {Record<string, unknown>} data
 * @param {string} nowIso
 */
export function buildPrivateAccessQualificationJson(data, nowIso) {
  return {
    access_request: {
      source: LUXE_MAURICE_AI_ACCESS_REQUEST_SOURCE,
      status: LUXE_MAURICE_AI_ACCESS_REQUEST_STATUS,
      access_category: data.access_category || null,
      budget_min: data.budget_min ?? null,
      budget_max: data.budget_max ?? null,
      currency_code: data.currency_code || 'USD',
      desired_location: data.desired_location || null,
      property_type: data.property_type || null,
      access_intent: data.access_intent || null,
      notes: data.notes || null,
      property_id: data.property_id || null,
      property_slug: data.property_slug || null,
      submitted_at: nowIso,
    },
  };
}

/**
 * @param {Record<string, unknown>} data
 */
export function buildPrivateAccessLeadMessage(data) {
  const parts = [];
  if (data.access_intent) parts.push(`Access intent: ${data.access_intent}`);
  if (data.desired_location) parts.push(`Location: ${data.desired_location}`);
  if (data.notes) parts.push(String(data.notes));
  return parts.join('\n').trim() || 'Private access request';
}

/**
 * @param {string} leadId
 */
export function formatPrivateAccessReferenceId(leadId) {
  const id = safeStr(leadId);
  if (!id) return `LM-REQ-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  return `LM-REQ-${id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`;
}

/**
 * @param {Record<string, unknown>} data
 * @param {string} tenantId
 * @param {string} nowIso
 * @param {Record<string, unknown>} operatorWorkflow
 */
export function buildPrivateAccessLeadCreateInput(data, tenantId, nowIso, operatorWorkflow) {
  const qualificationBase = buildPrivateAccessQualificationJson(data, nowIso);
  const contact = data.phone || data.email;
  const listing = data.property_slug || null;

  return {
    tenantId,
    name: data.full_name,
    email: data.email,
    contact,
    phone: data.phone || null,
    message: buildPrivateAccessLeadMessage(data),
    intent: LUXE_MAURICE_AI_ACCESS_REQUEST_INTENT,
    listing,
    status: 'new',
    qualificationJson: {
      ...qualificationBase,
      lux_operator_workflow: operatorWorkflow,
    },
  };
}

/**
 * Live persistence confirmation returned to the buyer form.
 * @param {{ id: string, createdAt: Date | string, status: string }} lead
 * @param {Record<string, unknown>} data
 */
export function buildLivePrivateAccessConfirmation(lead, data) {
  const referenceId = formatPrivateAccessReferenceId(lead.id);
  const createdAt =
    lead.createdAt instanceof Date ? lead.createdAt.toISOString() : String(lead.createdAt || new Date().toISOString());

  return {
    ok: true,
    reference_id: referenceId,
    lead_id: lead.id,
    live_persistence: true,
    message: 'Your private access request has been received for advisor review.',
    received_at: createdAt,
    summary: {
      full_name: data.full_name,
      email: data.email,
      access_category: data.access_category || null,
      property_id: data.property_id || null,
    },
  };
}

/** @deprecated Use validatePrivateAccessRequestBody */
export const validatePreviewAccessRequestBody = validatePrivateAccessRequestBody;
