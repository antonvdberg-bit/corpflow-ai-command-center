/**
 * HTTP handlers for /api/app/* (Slice 1).
 * Wired from api/factory_router.js. Synthetic store only — no external send.
 */

import { getSessionFromRequest } from '../server/session.js';
import {
  actorFromSessionPayload,
  assertScopeAccess,
  availableScopesForActor,
  buildProofActor,
  isProofModeAllowed,
} from './access.js';
import { APP_SLICE1_VERSION, REFERENCE_TENANT_ID, SYNTHETIC_REQUEST_ID } from './constants.js';
import { applyComponentReview, setComponentExposure } from './component-review.js';
import {
  projectCoreRequest,
  projectCoreRequestList,
  projectTenantRequest,
  projectTenantRequestList,
} from './project.js';
import { getSyntheticRequest, listSyntheticRequests } from './synthetic-store.js';

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Record<string, string>}
 */
function queryOf(req) {
  /** @type {Record<string, string>} */
  const out = {};
  try {
    const raw = req.url || '';
    const u = new URL(raw, 'http://local.invalid');
    u.searchParams.forEach((v, k) => {
      out[k] = v;
    });
  } catch {
    /* ignore */
  }
  // Also merge Vercel-style req.query if present
  const q = /** @type {{ query?: Record<string, unknown> }} */ (req).query;
  if (q && typeof q === 'object') {
    for (const [k, v] of Object.entries(q)) {
      if (Array.isArray(v)) out[k] = String(v[0] ?? '');
      else if (v != null) out[k] = String(v);
    }
  }
  return out;
}

/**
 * @param {import('http').IncomingMessage} req
 */
function resolveActor(req) {
  const q = queryOf(req);
  const wantProof =
    q.proof === '1' ||
    String(req.headers?.['x-corpflow-app-proof'] || '').trim() === '1';

  if (wantProof && isProofModeAllowed()) {
    return { actor: buildProofActor(), proof: true };
  }

  const sess = getSessionFromRequest(req);
  if (!(sess?.ok === true && sess.payload)) {
    return { actor: null, proof: false };
  }
  return {
    actor: actorFromSessionPayload(sess.payload),
    proof: false,
  };
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {'core'|'tenant'}
 */
function resolveScope(req) {
  const q = queryOf(req);
  const s = String(q.scope || '').trim().toLowerCase();
  if (s === 'tenant') return 'tenant';
  if (s === 'core') return 'core';
  // Body may carry scope for POSTs
  const body = /** @type {{ body?: Record<string, unknown> }} */ (req).body;
  if (body && typeof body === 'object') {
    const bs = String(body.scope || '').trim().toLowerCase();
    if (bs === 'tenant') return 'tenant';
    if (bs === 'core') return 'core';
  }
  return 'core';
}

/**
 * @param {import('http').IncomingMessage} req
 */
function resolveTenantId(req) {
  const q = queryOf(req);
  const fromQ = String(q.tenant_id || '').trim();
  if (fromQ) return fromQ;
  const body = /** @type {{ body?: Record<string, unknown> }} */ (req).body;
  if (body && typeof body === 'object') {
    const fromB = String(body.tenant_id || '').trim();
    if (fromB) return fromB;
  }
  return REFERENCE_TENANT_ID;
}

/**
 * @param {import('http').ServerResponse & { status: Function, json: Function }} res
 * @param {number} status
 * @param {Record<string, unknown>} payload
 */
function send(res, status, payload) {
  return res.status(status).json(payload);
}

/**
 * GET /api/app/shell
 */
export async function handleAppShell(req, res) {
  if (req.method !== 'GET') {
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  const { actor, proof } = resolveActor(req);
  if (!actor) {
    return send(res, 401, { ok: false, error: 'authentication_required' });
  }
  const scopes = availableScopesForActor(actor);
  const scope = resolveScope(req);
  const tenantId = resolveTenantId(req);
  const gate = assertScopeAccess(actor, scope, tenantId);
  if (!gate.ok) {
    return send(res, gate.http_status, { ok: false, error: gate.error });
  }
  return send(res, 200, {
    ok: true,
    slice: APP_SLICE1_VERSION,
    proof_mode: proof === true,
    actor: {
      typ: actor.typ,
      username: actor.username,
      role: actor.role,
      can_core: actor.can_core,
      can_tenant_ids: actor.can_tenant_ids,
      source: actor.source,
    },
    selected: {
      scope,
      tenant_id: scope === 'tenant' ? tenantId : null,
      tenant_label: scope === 'tenant' ? 'CorpFlowAI' : null,
      role: actor.role,
    },
    available_scopes: scopes,
    synthetic_request_id: SYNTHETIC_REQUEST_ID,
  });
}

/**
 * GET /api/app/requests
 */
export async function handleAppRequestsList(req, res) {
  if (req.method !== 'GET') {
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  const { actor } = resolveActor(req);
  if (!actor) {
    return send(res, 401, { ok: false, error: 'authentication_required' });
  }
  const scope = resolveScope(req);
  const tenantId = resolveTenantId(req);
  const gate = assertScopeAccess(actor, scope, tenantId);
  if (!gate.ok) {
    return send(res, gate.http_status, { ok: false, error: gate.error });
  }

  const all = listSyntheticRequests();
  if (scope === 'tenant') {
    return send(res, 200, {
      ok: true,
      scope: 'tenant',
      tenant_id: tenantId,
      requests: projectTenantRequestList(all, tenantId),
    });
  }
  // Core: default filter to reference tenant for Slice 1 focus; allow ?tenant_id=
  const filter = String(queryOf(req).tenant_id || REFERENCE_TENANT_ID).trim();
  if (!actor.can_tenant_ids.includes(filter) && filter !== REFERENCE_TENANT_ID && !actor.can_core) {
    return send(res, 403, { ok: false, error: 'tenant_access_denied' });
  }
  return send(res, 200, {
    ok: true,
    scope: 'core',
    tenant_id: filter,
    requests: projectCoreRequestList(all, filter),
  });
}

/**
 * GET /api/app/requests/detail — query: id, scope, tenant_id
 * (Avoid nested path parsing issues in the single factory router.)
 */
export async function handleAppRequestDetail(req, res) {
  if (req.method !== 'GET') {
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  const { actor } = resolveActor(req);
  if (!actor) {
    return send(res, 401, { ok: false, error: 'authentication_required' });
  }
  const q = queryOf(req);
  const id = String(q.id || '').trim();
  if (!id) {
    return send(res, 400, { ok: false, error: 'id_required' });
  }
  const scope = resolveScope(req);
  const tenantId = resolveTenantId(req);
  const gate = assertScopeAccess(actor, scope, tenantId);
  if (!gate.ok) {
    return send(res, gate.http_status, { ok: false, error: gate.error });
  }

  const request = getSyntheticRequest(id);
  if (!request) {
    return send(res, 404, { ok: false, error: 'request_not_found' });
  }

  // Tenant isolation: never return another tenant's request
  if (scope === 'tenant') {
    if (request.tenant_id !== tenantId) {
      return send(res, 404, { ok: false, error: 'request_not_found' });
    }
    return send(res, 200, { ok: true, request: projectTenantRequest(request) });
  }

  // Core may view any synthetic request they are authorised to see for that tenant
  if (!canCoreViewTenant(actor, request.tenant_id)) {
    return send(res, 404, { ok: false, error: 'request_not_found' });
  }
  return send(res, 200, { ok: true, request: projectCoreRequest(request) });
}

/**
 * @param {import('./access.js').AppActor} actor
 * @param {string} tenantId
 */
function canCoreViewTenant(actor, tenantId) {
  if (actor.can_core) return true;
  return actor.can_tenant_ids.includes(String(tenantId || '').trim());
}

/**
 * POST /api/app/component-review
 * body: { request_id, component_key, decision, comment?, scope?, tenant_id? }
 */
export async function handleAppComponentReview(req, res) {
  if (req.method !== 'POST') {
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  const { actor } = resolveActor(req);
  if (!actor) {
    return send(res, 401, { ok: false, error: 'authentication_required' });
  }
  const body =
    req.body && typeof req.body === 'object'
      ? /** @type {Record<string, unknown>} */ (req.body)
      : {};
  const tenantId =
    String(body.tenant_id || '').trim() || resolveTenantId(req) || REFERENCE_TENANT_ID;
  // Review is a Tenant-scope action
  const gate = assertScopeAccess(actor, 'tenant', tenantId);
  if (!gate.ok) {
    return send(res, gate.http_status, { ok: false, error: gate.error });
  }

  const requestId = String(body.request_id || '').trim();
  const request = getSyntheticRequest(requestId);
  if (!request || request.tenant_id !== tenantId) {
    return send(res, 404, { ok: false, error: 'request_not_found' });
  }

  const result = applyComponentReview({
    requestId,
    componentKey: String(body.component_key || '').trim(),
    decision: body.decision,
    comment: body.comment,
    byRole: actor.role,
  });
  if (!result.ok) {
    return send(res, result.http_status || 400, { ok: false, error: result.error });
  }
  return send(res, 200, {
    ok: true,
    decision: result.decision,
    component_key: result.component_key,
    request: projectTenantRequest(result.request),
    external_send: false,
  });
}

/**
 * POST /api/app/component-expose
 * body: { request_id, component_key, exposed: boolean }
 */
export async function handleAppComponentExpose(req, res) {
  if (req.method !== 'POST') {
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  const { actor } = resolveActor(req);
  if (!actor) {
    return send(res, 401, { ok: false, error: 'authentication_required' });
  }
  const gate = assertScopeAccess(actor, 'core');
  if (!gate.ok) {
    return send(res, gate.http_status, { ok: false, error: gate.error });
  }
  const body =
    req.body && typeof req.body === 'object'
      ? /** @type {Record<string, unknown>} */ (req.body)
      : {};
  const result = setComponentExposure({
    requestId: String(body.request_id || '').trim(),
    componentKey: String(body.component_key || '').trim(),
    exposed: body.exposed === true,
  });
  if (!result.ok) {
    return send(res, result.http_status || 400, { ok: false, error: result.error });
  }
  return send(res, 200, {
    ok: true,
    component_key: result.component_key,
    exposed: result.exposed,
    request: projectCoreRequest(result.request),
    external_send: false,
  });
}

/**
 * Dispatch /api/app/* path segments.
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse & { status: Function, json: Function }} res
 * @param {string} pathSeg
 * @returns {Promise<boolean>} true if handled
 */
export async function tryHandleAppApi(req, res, pathSeg) {
  if (pathSeg === 'app/shell') {
    await handleAppShell(req, res);
    return true;
  }
  if (pathSeg === 'app/requests') {
    await handleAppRequestsList(req, res);
    return true;
  }
  if (pathSeg === 'app/request' || pathSeg === 'app/requests/detail') {
    await handleAppRequestDetail(req, res);
    return true;
  }
  if (pathSeg === 'app/component-review') {
    await handleAppComponentReview(req, res);
    return true;
  }
  if (pathSeg === 'app/component-expose') {
    await handleAppComponentExpose(req, res);
    return true;
  }
  return false;
}
