/**
 * HTTP handlers for /api/app/* (Slice 1).
 * Wired from api/factory_router.js. Synthetic store only — no external send.
 *
 * Core and Tenant are separately authenticated environments:
 * - Core APIs require Core session (typ=admin / proof_core)
 * - Tenant APIs require Tenant session (typ=tenant / proof_tenant)
 * - No shared ScopeSwitcher / dual-scope actor
 */

import { getSessionFromRequest } from '../server/session.js';
import {
  actorFromSessionPayload,
  assertEnvironmentAccess,
  buildProofCoreActor,
  buildProofTenantActor,
  environmentDescriptorForActor,
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
 * @returns {'core'|'tenant'}
 */
function resolveEnvironment(req) {
  const q = queryOf(req);
  const fromEnv = String(q.env || q.scope || '').trim().toLowerCase();
  if (fromEnv === 'tenant') return 'tenant';
  if (fromEnv === 'core') return 'core';
  const body = /** @type {{ body?: Record<string, unknown> }} */ (req).body;
  if (body && typeof body === 'object') {
    const bs = String(body.env || body.scope || '').trim().toLowerCase();
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
 * Resolve actor for the *requested* environment.
 * Proof mode mints a single-environment actor matching env — never dual-scope.
 * Real sessions must match: admin→core only, tenant→tenant only.
 *
 * @param {import('http').IncomingMessage} req
 * @param {'core'|'tenant'} [forcedEnv]
 */
function resolveActor(req, forcedEnv) {
  const environment = forcedEnv || resolveEnvironment(req);
  const q = queryOf(req);
  const wantProof =
    q.proof === '1' ||
    String(req.headers?.['x-corpflow-app-proof'] || '').trim() === '1';

  // Test injection (NODE_ENV=test only) — simulates real Core/Tenant sessions.
  const testActor = /** @type {{ __testAppActor?: import('./access.js').AppActor }} */ (req)
    .__testAppActor;
  if (process.env.NODE_ENV === 'test' && testActor) {
    return { actor: testActor, proof: false, environment };
  }

  if (wantProof && isProofModeAllowed()) {
    const actor =
      environment === 'tenant' ? buildProofTenantActor() : buildProofCoreActor();
    return { actor, proof: true, environment };
  }

  const sess = getSessionFromRequest(req);
  if (!(sess?.ok === true && sess.payload)) {
    return { actor: null, proof: false, environment };
  }
  return {
    actor: actorFromSessionPayload(sess.payload),
    proof: false,
    environment,
  };
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
 * GET /api/app/shell — environment fixed by env/scope query (no switcher).
 */
export async function handleAppShell(req, res) {
  if (req.method !== 'GET') {
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  const { actor, proof, environment } = resolveActor(req);
  if (!actor) {
    return send(res, 401, { ok: false, error: 'authentication_required' });
  }
  const tenantId = resolveTenantId(req);
  const gate = assertEnvironmentAccess(actor, environment, tenantId);
  if (!gate.ok) {
    return send(res, gate.http_status, { ok: false, error: gate.error });
  }
  const descriptor = environmentDescriptorForActor(actor);
  return send(res, 200, {
    ok: true,
    slice: APP_SLICE1_VERSION,
    proof_mode: proof === true,
    environment,
    actor: {
      typ: actor.typ,
      username: actor.username,
      role: actor.role,
      can_core: actor.can_core,
      can_tenant_ids: actor.can_tenant_ids,
      environment: actor.environment,
      source: actor.source,
    },
    selected: {
      environment,
      scope: environment,
      tenant_id: environment === 'tenant' ? tenantId : null,
      tenant_label: environment === 'tenant' ? 'CorpFlowAI' : null,
      role: actor.role,
    },
    /** @deprecated No ScopeSwitcher — single environment only */
    available_scopes: [
      {
        scope: descriptor.environment,
        label: descriptor.label,
        tenant_id: descriptor.tenant_id,
      },
    ],
    menus:
      environment === 'core'
        ? [
            { id: 'global_requests', label: 'All requests' },
            { id: 'tenant_requests', label: 'Tenant · CorpFlowAI' },
            { id: 'request_work', label: 'Request / work' },
          ]
        : [{ id: 'requests_progress', label: 'Requests & Progress' }],
    synthetic_request_id: SYNTHETIC_REQUEST_ID,
    login_hints: {
      core: '/login?next=' + encodeURIComponent('/app/core'),
      tenant: '/login?next=' + encodeURIComponent('/app/tenant'),
    },
  });
}

/**
 * GET /api/app/requests
 */
export async function handleAppRequestsList(req, res) {
  if (req.method !== 'GET') {
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  const { actor, environment } = resolveActor(req);
  if (!actor) {
    return send(res, 401, { ok: false, error: 'authentication_required' });
  }
  const tenantId = resolveTenantId(req);
  const gate = assertEnvironmentAccess(actor, environment, tenantId);
  if (!gate.ok) {
    return send(res, gate.http_status, { ok: false, error: gate.error });
  }

  const all = listSyntheticRequests();
  if (environment === 'tenant') {
    return send(res, 200, {
      ok: true,
      environment: 'tenant',
      scope: 'tenant',
      tenant_id: tenantId,
      requests: projectTenantRequestList(all, tenantId),
    });
  }

  // Core: global list when tenant_id omitted / "all"; else per-tenant filter
  const q = queryOf(req);
  const filterRaw = String(q.tenant_id || '').trim();
  const global = q.view === 'global' || filterRaw === '' || filterRaw === 'all';
  if (global && q.view === 'global') {
    return send(res, 200, {
      ok: true,
      environment: 'core',
      scope: 'core',
      tenant_id: null,
      view: 'global',
      requests: projectCoreRequestList(all, null),
    });
  }
  const filter = filterRaw || REFERENCE_TENANT_ID;
  return send(res, 200, {
    ok: true,
    environment: 'core',
    scope: 'core',
    tenant_id: filter,
    view: 'tenant',
    requests: projectCoreRequestList(all, filter),
  });
}

/**
 * GET /api/app/request — query: id, env/scope, tenant_id
 */
export async function handleAppRequestDetail(req, res) {
  if (req.method !== 'GET') {
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  const { actor, environment } = resolveActor(req);
  if (!actor) {
    return send(res, 401, { ok: false, error: 'authentication_required' });
  }
  const q = queryOf(req);
  const id = String(q.id || '').trim();
  if (!id) {
    return send(res, 400, { ok: false, error: 'id_required' });
  }
  const tenantId = resolveTenantId(req);
  const gate = assertEnvironmentAccess(actor, environment, tenantId);
  if (!gate.ok) {
    return send(res, gate.http_status, { ok: false, error: gate.error });
  }

  const request = getSyntheticRequest(id);
  if (!request) {
    return send(res, 404, { ok: false, error: 'request_not_found' });
  }

  if (environment === 'tenant') {
    if (request.tenant_id !== tenantId) {
      return send(res, 404, { ok: false, error: 'request_not_found' });
    }
    return send(res, 200, { ok: true, request: projectTenantRequest(request) });
  }

  // Core internal work/evidence view
  return send(res, 200, { ok: true, request: projectCoreRequest(request) });
}

/**
 * POST /api/app/component-review — Tenant environment only
 */
export async function handleAppComponentReview(req, res) {
  if (req.method !== 'POST') {
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  // Force tenant environment for review (ignore mistaken scope=core)
  const { actor } = resolveActor(req, 'tenant');
  if (!actor) {
    return send(res, 401, { ok: false, error: 'authentication_required' });
  }
  const body =
    req.body && typeof req.body === 'object'
      ? /** @type {Record<string, unknown>} */ (req.body)
      : {};
  const tenantId =
    String(body.tenant_id || '').trim() || resolveTenantId(req) || REFERENCE_TENANT_ID;
  const gate = assertEnvironmentAccess(actor, 'tenant', tenantId);
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
 * POST /api/app/component-expose — Core environment only
 */
export async function handleAppComponentExpose(req, res) {
  if (req.method !== 'POST') {
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  const { actor } = resolveActor(req, 'core');
  if (!actor) {
    return send(res, 401, { ok: false, error: 'authentication_required' });
  }
  const gate = assertEnvironmentAccess(actor, 'core');
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
