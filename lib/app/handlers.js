/**
 * #778 Slice 1 — thin /api/app/* handlers (synthetic data only; no external send).
 */

import { getSessionFromRequest } from '../server/session.js';
import { getEffectiveMemberships } from '../server/effective-memberships.js';
import { buildAppChrome, canAccessCoreScope, canAccessTenantScope } from './access.js';
import { projectCoreRequest, projectTenantRequest, findTenantLeakPaths } from './projection.js';
import {
  REFERENCE_TENANT_ID,
  SYNTHETIC_REQUEST_ID,
  applyComponentReview,
  getSyntheticRequest,
  listSyntheticRequests,
  setComponentExposure,
} from './synthetic-store.js';

function deny(res, status, error, extra) {
  const payload = { error };
  if (extra) Object.assign(payload, extra);
  return res.status(status).json(payload);
}

function firstQuery(query, key) {
  if (!query || typeof query !== 'object') return undefined;
  const v = query[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

function parseJsonBody(req) {
  const body = req.body;
  if (body && typeof body === 'object') return { ok: true, body };
  return { ok: false, error: 'Missing JSON body' };
}

/**
 * @typedef {{
 *   getSessionFromRequestFn?: typeof getSessionFromRequest,
 *   getEffectiveMembershipsFn?: typeof getEffectiveMemberships,
 * }} AppHandlerDeps
 */

/**
 * @param {import('http').IncomingMessage} req
 * @param {AppHandlerDeps} [deps]
 * @returns {Promise<{
 *   sess: { ok?: boolean, payload?: Record<string, unknown> | null },
 *   memberships: Array<{ tenant_id?: string }>,
 *   factoryMaster: boolean,
 * }>}
 */
async function resolveCaller(req, deps = {}) {
  const getSess = deps.getSessionFromRequestFn || getSessionFromRequest;
  const getEff = deps.getEffectiveMembershipsFn || getEffectiveMemberships;
  const sess = getSess(req) || { ok: false, payload: null };
  let memberships = [];
  let factoryMaster = false;
  const userId =
    sess?.ok === true && sess.payload?.user_id != null ? String(sess.payload.user_id).trim() : '';
  if (userId) {
    try {
      const eff = await getEff({ userId });
      memberships = Array.isArray(eff?.memberships) ? eff.memberships : [];
      factoryMaster = eff?.factory_master === true;
    } catch {
      memberships = [];
      factoryMaster = sess?.payload?.factory_master === true;
    }
  } else if (sess?.payload?.factory_master === true) {
    factoryMaster = true;
  }
  return { sess, memberships, factoryMaster };
}

/**
 * GET /api/app/context?scope=core|tenant&tenant_id=corpflowai
 * @param {AppHandlerDeps} [deps]
 */
export async function handleAppContext(req, res, deps = {}) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return deny(res, 405, 'Method not allowed');
  }
  const { sess, memberships, factoryMaster } = await resolveCaller(req, deps);
  if (!(sess?.ok === true)) {
    return deny(res, 401, 'Authentication required');
  }
  const scopeRaw = String(firstQuery(req.query, 'scope') || 'core')
    .trim()
    .toLowerCase();
  const selectedScope = scopeRaw === 'tenant' ? 'tenant' : 'core';
  const tenantId =
    String(firstQuery(req.query, 'tenant_id') || REFERENCE_TENANT_ID).trim() || REFERENCE_TENANT_ID;
  const chrome = buildAppChrome({
    sess,
    selectedScope,
    selectedTenantId: tenantId,
    memberships,
    factoryMaster,
  });
  return res.status(200).json({
    ok: true,
    chrome,
    reference_tenant_id: REFERENCE_TENANT_ID,
    synthetic_request_id: SYNTHETIC_REQUEST_ID,
    slice: '778-slice1',
  });
}

/**
 * GET /api/app/requests?scope=tenant|core&tenant_id=corpflowai
 * @param {AppHandlerDeps} [deps]
 */
export async function handleAppRequestsList(req, res, deps = {}) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return deny(res, 405, 'Method not allowed');
  }
  const { sess, memberships, factoryMaster } = await resolveCaller(req, deps);
  if (!(sess?.ok === true)) {
    return deny(res, 401, 'Authentication required');
  }
  const scopeRaw = String(firstQuery(req.query, 'scope') || 'tenant')
    .trim()
    .toLowerCase();
  const scope = scopeRaw === 'core' ? 'core' : 'tenant';
  const tenantId =
    String(firstQuery(req.query, 'tenant_id') || REFERENCE_TENANT_ID).trim() || REFERENCE_TENANT_ID;

  if (scope === 'core') {
    if (!canAccessCoreScope(sess)) {
      return deny(res, 403, 'Core scope requires an admin session');
    }
  } else if (
    !canAccessTenantScope({
      sess,
      tenantId,
      memberships,
      factoryMaster,
    })
  ) {
    return deny(res, 403, 'Tenant scope denied for this session');
  }

  // Tenant isolation: never list another tenant's synthetic rows.
  const rows = listSyntheticRequests().filter((r) => String(r.tenant_id || '') === tenantId);
  if (scope === 'tenant') {
    const projected = rows.map((r) => projectTenantRequest(r));
    for (const p of projected) {
      const leaks = findTenantLeakPaths(p);
      if (leaks.length) {
        return deny(res, 500, 'Tenant projection safety failure', { leaks });
      }
    }
    return res.status(200).json({ ok: true, scope, tenant_id: tenantId, requests: projected });
  }
  return res.status(200).json({
    ok: true,
    scope,
    tenant_id: tenantId,
    requests: rows.map((r) => projectCoreRequest(r)),
  });
}

/**
 * GET /api/app/request?id=...&scope=tenant|core
 * @param {AppHandlerDeps} [deps]
 */
export async function handleAppRequestGet(req, res, deps = {}) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return deny(res, 405, 'Method not allowed');
  }
  const { sess, memberships, factoryMaster } = await resolveCaller(req, deps);
  if (!(sess?.ok === true)) {
    return deny(res, 401, 'Authentication required');
  }
  const id = String(firstQuery(req.query, 'id') || SYNTHETIC_REQUEST_ID).trim();
  const scopeRaw = String(firstQuery(req.query, 'scope') || 'tenant')
    .trim()
    .toLowerCase();
  const scope = scopeRaw === 'core' ? 'core' : 'tenant';
  const row = getSyntheticRequest(id);
  if (!row) return deny(res, 404, 'Request not found');

  const tenantId = String(row.tenant_id || '');
  if (scope === 'core') {
    if (!canAccessCoreScope(sess)) {
      return deny(res, 403, 'Core scope requires an admin session');
    }
  } else if (
    !canAccessTenantScope({
      sess,
      tenantId,
      memberships,
      factoryMaster,
    })
  ) {
    return deny(res, 403, 'Tenant scope denied for this session');
  }

  // Cross-tenant probe: if caller asked for another tenant via query, still isolate by row.
  const askedTenant = firstQuery(req.query, 'tenant_id');
  if (askedTenant != null && String(askedTenant).trim() && String(askedTenant).trim() !== tenantId) {
    return deny(res, 404, 'Request not found');
  }

  if (scope === 'tenant') {
    const projected = projectTenantRequest(row);
    const leaks = findTenantLeakPaths(projected);
    if (leaks.length) {
      return deny(res, 500, 'Tenant projection safety failure', { leaks });
    }
    return res.status(200).json({ ok: true, scope, request: projected });
  }
  return res.status(200).json({ ok: true, scope, request: projectCoreRequest(row) });
}

/**
 * POST /api/app/expose — Core operator sets exposed_for_client_review.
 * Body: { request_id, component_key, exposed: boolean }
 * @param {AppHandlerDeps} [deps]
 */
export async function handleAppExpose(req, res, deps = {}) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return deny(res, 405, 'Method not allowed');
  }
  const { sess } = await resolveCaller(req, deps);
  if (!(sess?.ok === true)) {
    return deny(res, 401, 'Authentication required');
  }
  if (!canAccessCoreScope(sess)) {
    return deny(res, 403, 'Only Core operators may change exposure');
  }
  const parsed = parseJsonBody(req);
  if (!parsed.ok) return deny(res, 400, parsed.error);
  const body = parsed.body;
  const requestId = String(body.request_id || SYNTHETIC_REQUEST_ID).trim();
  const componentKey = String(body.component_key || '').trim();
  const exposed = body.exposed === true;
  if (!componentKey) return deny(res, 400, 'component_key required');
  const result = setComponentExposure(requestId, componentKey, exposed);
  if (!result.ok) return deny(res, 404, result.error);
  return res.status(200).json({
    ok: true,
    external_send: false,
    request: projectCoreRequest(result.request),
    client_projection_preview: projectTenantRequest(result.request),
  });
}

/**
 * POST /api/app/review — Tenant review on an exposed component.
 * Body: { request_id, component_key, decision: approve|amend|reject, comment? }
 * No email/WhatsApp/SMS — persisted in synthetic store only.
 * @param {AppHandlerDeps} [deps]
 */
export async function handleAppReview(req, res, deps = {}) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return deny(res, 405, 'Method not allowed');
  }
  const { sess, memberships, factoryMaster } = await resolveCaller(req, deps);
  if (!(sess?.ok === true)) {
    return deny(res, 401, 'Authentication required');
  }
  const parsed = parseJsonBody(req);
  if (!parsed.ok) return deny(res, 400, parsed.error);
  const body = parsed.body;
  const requestId = String(body.request_id || SYNTHETIC_REQUEST_ID).trim();
  const componentKey = String(body.component_key || '').trim();
  const decision = String(body.decision || '').trim();
  const comment = body.comment != null ? String(body.comment) : '';
  if (!componentKey) return deny(res, 400, 'component_key required');

  const existing = getSyntheticRequest(requestId);
  if (!existing) return deny(res, 404, 'Request not found');
  const tenantId = String(existing.tenant_id || '');
  if (
    !canAccessTenantScope({
      sess,
      tenantId,
      memberships,
      factoryMaster,
    })
  ) {
    return deny(res, 403, 'Tenant scope denied for this session');
  }

  const result = applyComponentReview({
    requestId,
    componentKey,
    decision,
    comment,
    by: 'tenant',
  });
  if (!result.ok) {
    return deny(res, result.status || 400, result.error);
  }
  const projected = projectTenantRequest(result.request);
  const leaks = findTenantLeakPaths(projected);
  if (leaks.length) {
    return deny(res, 500, 'Tenant projection safety failure', { leaks });
  }
  return res.status(200).json({
    ok: true,
    external_send: false,
    request: projected,
  });
}

/**
 * Dispatch /api/app/* from factory_router.
 * @param {import('http').IncomingMessage & { method?: string, query?: any, body?: any }} req
 * @param {import('http').ServerResponse & { status: Function, json: Function, setHeader: Function }} res
 * @param {string} pathSeg
 */
export async function handleAppApi(req, res, pathSeg) {
  const rest = String(pathSeg || '')
    .replace(/^app\/?/, '')
    .replace(/\/+$/, '');
  if (!rest || rest === 'context') return handleAppContext(req, res);
  if (rest === 'requests') return handleAppRequestsList(req, res);
  if (rest === 'request') return handleAppRequestGet(req, res);
  if (rest === 'expose') return handleAppExpose(req, res);
  if (rest === 'review') return handleAppReview(req, res);
  return deny(res, 404, 'Unknown /api/app route');
}
