/**
 * HTTP handlers for /api/app/* (#778 + #877 Slice 2 + #883 Slice 3).
 * Wired from api/factory_router.js.
 *
 * Repository selector: fixture (proof/test/no DB) or cmp_tickets via Prisma.
 * Slice 3: expose/review persist into existing cmp_tickets.console_json (no schema).
 * normalizeCmpTicketRow → Core/Tenant projectors. No external send.
 *
 * Core and Tenant are separately authenticated environments.
 * Slice 2: normal session path is default; proof remains harness-only.
 */

import { getEffectiveMemberships } from '../server/effective-memberships.js';
import { getSessionFromRequest } from '../server/session.js';
import {
  actorFromSessionPayload,
  assertEnvironmentAccess,
  buildProofCoreActor,
  buildProofTenantActor,
  environmentDescriptorForActor,
  isProofModeAllowed,
  resolveAuthorisedTenantId,
} from './access.js';
import {
  APP_SLICE1_VERSION,
  APP_SLICE2_VERSION,
  APP_SLICE3_VERSION,
  APP_WORKSPACE_SLICE_VERSION,
  CANONICAL_REQUEST_ID,
  COMPATIBILITY_ROUTES,
  CORE_NAV_ITEMS,
  REFERENCE_TENANT_ID,
  TENANT_NAV_ITEMS,
} from './constants.js';
import { tenantJourneyShellFragment } from './tenant-journey.js';
import { loadProspectDetail, loadProspectOperationsList, loadProspectWorkbenchList, saveProspectDetail } from './prospect-operations-list.js';
import { buildProspectPipelinePayload } from './prospect-operations-pipeline.js';
import { loadClientDetail, loadClientsList } from './clients-list.js';
import { buildCommercialSummaryPayload, loadCommercialSummaryList } from './commercial-summary-list.js';
import { normalizeCommercialFilter } from './commercial-summary-constants.js';
import {
  buildCommercialQuotationEvidencePayload,
  loadCommercialQuotationEvidence,
  loadCommercialQuotationPdf,
} from './commercial-quotation-evidence.js';
import {
  assertClientsAccess,
  buildClientDetailPayload,
  buildClientsListPayload,
} from './clients-workspace.js';
import {
  assertDeliveryWorkspaceAccess,
  buildDeliveryPayload,
  loadDeliverySummary,
  normalizeDeliveryFilter,
} from './delivery-workspace.js';
import {
  buildOperatingOverviewPayload,
  loadOperatingOverview,
} from './operating-overview.js';
import {
  assertProspectOperationsAccess,
  buildActionQueuePayload,
  buildProspectDetailPayload,
  buildProspectOperationsPayload,
  buildProspectWorkbenchPayload,
  buildTodayMyWorkPayload,
  countActionQueueFilters,
  countWorkbenchFilters,
  filterProspectsForActionQueue,
  filterProspectsForMyWorkToday,
  filterProspectsForWorkbench,
} from './prospect-operations-workspace.js';
import { workspaceChromeForEnvironment } from './workspace-context.js';
import {
  normalizeActionQueueFilter,
  normalizeWorkbenchFilter,
  normalizeWorkbenchSort,
  normalizeWorkbenchSortDir,
} from '../cmp/_lib/prospect-operations-view-model.js';
import {
  applyComponentReviewWithRepo,
  setComponentExposureWithRepo,
} from './component-review.js';
import {
  projectCoreRequest,
  projectCoreRequestList,
  projectTenantRequest,
  projectTenantRequestList,
} from './project.js';
import { getRequestRepository } from './request-repository-select.js';

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
 * Load membership tenant ids from the existing IM-2 helper.
 * Fail soft to [] when DB is unavailable — session tenant_id still binds the actor.
 *
 * @param {string} userId
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<string[]>}
 */
async function loadMembershipTenantIds(userId, req) {
  const injected = /** @type {{ __testMembershipTenantIds?: string[] }} */ (req)
    .__testMembershipTenantIds;
  // Tests never hit live membership DB unless an array is explicitly injected.
  if (process.env.NODE_ENV === 'test') {
    if (Array.isArray(injected)) {
      return injected.map((x) => String(x || '').trim()).filter(Boolean);
    }
    return [];
  }
  const id = String(userId || '').trim();
  if (!id) return [];
  try {
    const eff = await getEffectiveMemberships(id);
    if (!eff || eff.not_found === true || eff.enabled === false) return [];
    return (Array.isArray(eff.memberships) ? eff.memberships : [])
      .map((m) => String(m?.tenant_id || '').trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {'core'|'tenant'} [forcedEnv]
 */
async function resolveActor(req, forcedEnv) {
  const environment = forcedEnv || resolveEnvironment(req);
  const q = queryOf(req);
  const wantProof =
    q.proof === '1' ||
    String(req.headers?.['x-corpflow-app-proof'] || '').trim() === '1';

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

  /** @type {unknown} */
  let payload = null;
  const testPayload = /** @type {{ __testSessionPayload?: unknown }} */ (req).__testSessionPayload;
  if (process.env.NODE_ENV === 'test' && testPayload) {
    payload = testPayload;
  } else {
    const sess = getSessionFromRequest(req);
    if (sess?.ok === true && sess.payload) payload = sess.payload;
  }
  if (!payload || typeof payload !== 'object') {
    return { actor: null, proof: false, environment };
  }

  const p = /** @type {Record<string, unknown>} */ (payload);
  const membershipTenantIds = await loadMembershipTenantIds(
    p.user_id != null ? String(p.user_id) : '',
    req,
  );
  return {
    actor: actorFromSessionPayload(payload, { membershipTenantIds }),
    proof: false,
    environment,
  };
}

/**
 * Tenant id for the request: Core ignores; Tenant binds to authorised membership/session.
 * @param {import('http').IncomingMessage} req
 * @param {import('./access.js').AppActor | null} actor
 * @param {'core'|'tenant'} environment
 */
function resolveBoundTenantId(req, actor, environment) {
  if (environment !== 'tenant') {
    return { ok: true, tenant_id: resolveTenantId(req) };
  }
  return resolveAuthorisedTenantId(actor, resolveTenantId(req));
}

/**
 * @param {unknown} err
 * @returns {string}
 */
function repositoryErrorCode(err) {
  const msg = err instanceof Error ? err.message : String(err || '');
  if (/P1001|P1017|ECONNREFUSED|timeout|connect/i.test(msg)) {
    return 'repository_unavailable';
  }
  return 'repository_error';
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {boolean} proof
 */
function repoForRequest(req, proof) {
  const injected = /** @type {{ __testAppRepository?: import('./request-repository.js').AppRequestRepository }} */ (
    req
  ).__testAppRepository;
  if (process.env.NODE_ENV === 'test' && injected) return injected;
  return getRequestRepository({ proofMode: proof === true });
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
 * Binary PDF response. Never JSON-encodes bytes. Never logs the buffer.
 * @param {import('http').ServerResponse} res
 * @param {number} status
 * @param {Buffer} bytes
 * @param {string} filename
 */
function sendPdf(res, status, bytes, filename) {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes || []);
  const safeName = String(filename || 'quotation.pdf').replace(/[\r\n"]/g, '_');
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', String(buf.length));
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
  if (typeof res.status === 'function') res.status(status);
  else res.statusCode = status;
  if (typeof res.end === 'function') return res.end(buf);
  return send(res, status, { ok: false, error: 'pdf_transport_unavailable' });
}

/**
 * GET /api/app/shell
 */
export async function handleAppShell(req, res) {
  if (req.method !== 'GET') {
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  const { actor, proof, environment } = await resolveActor(req);
  if (!actor) {
    return send(res, 401, { ok: false, error: 'authentication_required' });
  }
  const bound = resolveBoundTenantId(req, actor, environment);
  if (!bound.ok) {
    return send(res, bound.http_status, { ok: false, error: bound.error });
  }
  const tenantId = bound.tenant_id;
  const gate = assertEnvironmentAccess(actor, environment, tenantId);
  if (!gate.ok) {
    return send(res, gate.http_status, { ok: false, error: gate.error });
  }
  const descriptor = environmentDescriptorForActor(actor);
  const repo = repoForRequest(req, proof);
  const tenantLabel =
    environment === 'tenant'
      ? tenantId === REFERENCE_TENANT_ID
        ? 'CorpFlowAI'
        : tenantId
      : null;
  const workspace = workspaceChromeForEnvironment(environment, { tenantLabel });
  return send(res, 200, {
    ok: true,
    slice: APP_SLICE3_VERSION,
    slice_workspace_chrome: APP_WORKSPACE_SLICE_VERSION,
    slice_workspace: APP_SLICE2_VERSION,
    slice_foundation: APP_SLICE1_VERSION,
    proof_mode: proof === true,
    auth_mode: proof === true ? 'proof_harness' : 'session',
    environment,
    data_source: repo.dataSource,
    mutations_enabled: repo.supportsMutations === true,
    persistence_path: repo.persistencePath || null,
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
      tenant_label: tenantLabel,
      role: actor.role,
      workspace_id: workspace.workspace_id,
      workspace_label: workspace.workspace_label,
    },
    workspace,
    available_scopes: [
      {
        scope: descriptor.environment,
        label: descriptor.label,
        tenant_id: descriptor.tenant_id,
      },
    ],
    menus: environment === 'core' ? [...CORE_NAV_ITEMS] : [...TENANT_NAV_ITEMS],
    ...(environment === 'tenant'
      ? tenantJourneyShellFragment({ tenantId, tenantLabel })
      : { slice_tenant_journey: null, tenant_journey: null }),
    canonical_request_id: CANONICAL_REQUEST_ID,
    /** @deprecated */
    synthetic_request_id: CANONICAL_REQUEST_ID,
    compatibility_routes: [...COMPATIBILITY_ROUTES],
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
  const { actor, proof, environment } = await resolveActor(req);
  if (!actor) {
    return send(res, 401, { ok: false, error: 'authentication_required' });
  }
  const bound = resolveBoundTenantId(req, actor, environment);
  if (!bound.ok) {
    return send(res, bound.http_status, { ok: false, error: bound.error });
  }
  const tenantId = bound.tenant_id;
  const gate = assertEnvironmentAccess(actor, environment, tenantId);
  if (!gate.ok) {
    return send(res, gate.http_status, { ok: false, error: gate.error });
  }

  const repo = repoForRequest(req, proof);

  try {
    if (environment === 'tenant') {
      const listed = await repo.listForTenant(tenantId);
      return send(res, 200, {
        ok: true,
        environment: 'tenant',
        scope: 'tenant',
        tenant_id: tenantId,
        auth_mode: proof === true ? 'proof_harness' : 'session',
        requests: projectTenantRequestList(listed.requests, tenantId),
        data_source: listed.data_source,
        excluded_missing_tenant: listed.excluded_missing_tenant,
      });
    }

    const q = queryOf(req);
    const filterRaw = String(q.tenant_id || '').trim();
    const statusFilter = String(q.status || '').trim();
    const waitingFilter = String(q.waiting_party || '').trim();
    const isGlobal = q.view === 'global' || filterRaw === '' || filterRaw === 'all';
    /** @type {string | null} */
    const tenantFilter = isGlobal ? null : filterRaw || REFERENCE_TENANT_ID;
    const listed = await repo.listForCore({
      tenantFilter,
      statusFilter: statusFilter || null,
      waitingPartyFilter: waitingFilter || null,
    });
    const coreList = projectCoreRequestList(listed.requests, {
      tenantFilter: null,
      statusFilter: null,
      waitingPartyFilter: null,
    });

    return send(res, 200, {
      ok: true,
      environment: 'core',
      scope: 'core',
      tenant_id: tenantFilter,
      auth_mode: proof === true ? 'proof_harness' : 'session',
      view: isGlobal ? 'global' : 'tenant',
      filters: {
        tenant_id: tenantFilter,
        status: statusFilter || null,
        waiting_party: waitingFilter || null,
      },
      tenant_options: listed.tenant_options,
      requests: coreList,
      data_source: listed.data_source,
      excluded_missing_tenant: listed.excluded_missing_tenant,
    });
  } catch (err) {
    return send(res, 503, {
      ok: false,
      error: repositoryErrorCode(err),
      environment,
      data_source: repo.dataSource,
    });
  }
}

/**
 * GET /api/app/request
 */
export async function handleAppRequestDetail(req, res) {
  if (req.method !== 'GET') {
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  const { actor, proof, environment } = await resolveActor(req);
  if (!actor) {
    return send(res, 401, { ok: false, error: 'authentication_required' });
  }
  const q = queryOf(req);
  const id = String(q.id || '').trim();
  if (!id) {
    return send(res, 400, { ok: false, error: 'id_required' });
  }
  const bound = resolveBoundTenantId(req, actor, environment);
  if (!bound.ok) {
    return send(res, bound.http_status, { ok: false, error: bound.error });
  }
  const tenantId = bound.tenant_id;
  const gate = assertEnvironmentAccess(actor, environment, tenantId);
  if (!gate.ok) {
    return send(res, gate.http_status, { ok: false, error: gate.error });
  }

  const repo = repoForRequest(req, proof);

  try {
    if (environment === 'tenant') {
      const got = await repo.getForTenant(id, tenantId);
      if (!got.request) {
        return send(res, 404, { ok: false, error: 'request_not_found' });
      }
      return send(res, 200, {
        ok: true,
        auth_mode: proof === true ? 'proof_harness' : 'session',
        request: projectTenantRequest(got.request),
        data_source: got.data_source,
      });
    }

    const got = await repo.getForCore(id);
    if (!got.request) {
      return send(res, 404, {
        ok: false,
        error: 'request_not_found',
        data_quality: got.data_quality || null,
      });
    }
    return send(res, 200, {
      ok: true,
      auth_mode: proof === true ? 'proof_harness' : 'session',
      request: projectCoreRequest(got.request),
      data_source: got.data_source,
    });
  } catch (err) {
    return send(res, 503, {
      ok: false,
      error: repositoryErrorCode(err),
      environment,
      data_source: repo.dataSource,
    });
  }
}

/**
 * GET /api/app/overview — Operating Workspace / Core only.
 * Action overview (#1159). Read-only projection of existing Prospect, Client,
 * Commercial and Delivery records. No KPI store. No schema.
 */
export async function handleAppOverview(req, res) {
  if (req.method !== 'GET') {
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  const { actor, proof } = await resolveActor(req, 'core');
  if (!actor) {
    return send(res, 401, { ok: false, error: 'authentication_required' });
  }
  const gate = assertProspectOperationsAccess(actor);
  if (!gate.ok) {
    return send(res, gate.http_status, { ok: false, error: gate.error });
  }
  const repo = repoForRequest(req, proof);
  const loaded = await loadOperatingOverview({
    proofMode: proof === true,
    listRequests: async () => {
      const listed = await repo.listForCore({ tenantFilter: null });
      return {
        requests: listed.requests,
        data_source: listed.data_source,
      };
    },
  });
  if (!loaded.ok) {
    return send(res, 503, {
      ok: false,
      error: loaded.error,
      data_source: loaded.data_source,
      workspace: 'operating',
    });
  }
  return send(
    res,
    200,
    buildOperatingOverviewPayload({
      prospects: loaded.prospects,
      commercialRows: loaded.commercialRows,
      clients: loaded.clients,
      deliveryItems: loaded.deliveryItems,
      data_source: loaded.data_source,
      proof_mode: proof === true,
      now: loaded.now,
    }),
  );
}

/**
 * GET /api/app/prospects — Operating Workspace / Core only.
 * Shared Prospect Operations list (#772 / #721). Read-only. No external send.
 */
export async function handleAppProspects(req, res) {
  if (req.method !== 'GET') {
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  const { actor, proof } = await resolveActor(req, 'core');
  if (!actor) {
    return send(res, 401, { ok: false, error: 'authentication_required' });
  }
  const gate = assertProspectOperationsAccess(actor);
  if (!gate.ok) {
    return send(res, gate.http_status, { ok: false, error: gate.error });
  }
  const loaded = await loadProspectOperationsList({ proofMode: proof === true });
  if (!loaded.ok) {
    return send(res, 503, {
      ok: false,
      error: loaded.error,
      data_source: loaded.data_source,
      workspace: 'operating',
    });
  }
  return send(
    res,
    200,
    buildProspectOperationsPayload({
      prospects: loaded.prospects,
      data_source: loaded.data_source,
      proof_mode: proof === true,
    }),
  );
}

/**
 * GET /api/app/today — Operating Workspace / Core only.
 * Today / My Work landing (#772 next slice). Same leads as Prospect Operations,
 * filtered with #721 matchesMyWorkTodayFilter. Read-only. No external send.
 */
export async function handleAppToday(req, res) {
  if (req.method !== 'GET') {
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  const { actor, proof } = await resolveActor(req, 'core');
  if (!actor) {
    return send(res, 401, { ok: false, error: 'authentication_required' });
  }
  const gate = assertProspectOperationsAccess(actor);
  if (!gate.ok) {
    return send(res, gate.http_status, { ok: false, error: gate.error });
  }
  const loaded = await loadProspectOperationsList({ proofMode: proof === true });
  if (!loaded.ok) {
    return send(res, 503, {
      ok: false,
      error: loaded.error,
      data_source: loaded.data_source,
      workspace: 'operating',
    });
  }
  return send(
    res,
    200,
    buildTodayMyWorkPayload({
      prospects: filterProspectsForMyWorkToday(loaded.prospects),
      data_source: loaded.data_source,
      proof_mode: proof === true,
    }),
  );
}

/**
 * GET /api/app/pipeline — Operating Workspace / Core only.
 * Postgres-backed Prospect Pipeline (#997). Same leads as Prospect Operations.
 * Stage writes go through PATCH /api/app/prospect. No localStorage. No external send.
 */
export async function handleAppPipeline(req, res) {
  if (req.method !== 'GET') {
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  const { actor, proof } = await resolveActor(req, 'core');
  if (!actor) {
    return send(res, 401, { ok: false, error: 'authentication_required' });
  }
  const gate = assertProspectOperationsAccess(actor);
  if (!gate.ok) {
    return send(res, gate.http_status, { ok: false, error: gate.error });
  }
  const loaded = await loadProspectOperationsList({ proofMode: proof === true });
  if (!loaded.ok) {
    return send(res, 503, {
      ok: false,
      error: loaded.error,
      data_source: loaded.data_source,
      workspace: 'operating',
    });
  }
  const q = queryOf(req);
  return send(
    res,
    200,
    buildProspectPipelinePayload({
      prospects: loaded.prospects,
      data_source: loaded.data_source,
      proof_mode: proof === true,
      filters: {
        owner: q.owner || '',
        product: q.product || '',
        source: q.source || '',
        urgency: q.urgency || '',
      },
    }),
  );
}

/**
 * GET /api/app/workbench — Operating Workspace / Core only.
 * Shared Prospect Workbench (#996). Filter/sort in-process. Safe PATCH stays on /api/app/prospect.
 */
export async function handleAppWorkbench(req, res) {
  if (req.method !== 'GET') {
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  const { actor, proof } = await resolveActor(req, 'core');
  if (!actor) {
    return send(res, 401, { ok: false, error: 'authentication_required' });
  }
  const gate = assertProspectOperationsAccess(actor);
  if (!gate.ok) {
    return send(res, gate.http_status, { ok: false, error: gate.error });
  }
  const q = queryOf(req);
  const filter = normalizeWorkbenchFilter(q.filter);
  const sort = normalizeWorkbenchSort(q.sort);
  const dir = normalizeWorkbenchSortDir(q.dir);
  const query = String(q.q || '').trim();
  const loaded = await loadProspectWorkbenchList({ proofMode: proof === true });
  if (!loaded.ok) {
    return send(res, 503, {
      ok: false,
      error: loaded.error,
      data_source: loaded.data_source,
      workspace: 'operating',
    });
  }
  const all = loaded.prospects;
  return send(
    res,
    200,
    buildProspectWorkbenchPayload({
      prospects: filterProspectsForWorkbench(all, { filter, sort, dir, q: query }),
      data_source: loaded.data_source,
      filter,
      sort,
      dir,
      q: query,
      filter_counts: countWorkbenchFilters(all),
      proof_mode: proof === true,
    }),
  );
}

/**
 * GET /api/app/queue — Operating Workspace / Core only.
 * Canonical Prospect Action Queue (#995). Same cross-product leads as Workbench,
 * filtered with #721 matchesActionQueueFilter. No external send.
 */
export async function handleAppActionQueue(req, res) {
  if (req.method !== 'GET') {
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  const { actor, proof } = await resolveActor(req, 'core');
  if (!actor) {
    return send(res, 401, { ok: false, error: 'authentication_required' });
  }
  const gate = assertProspectOperationsAccess(actor);
  if (!gate.ok) {
    return send(res, gate.http_status, { ok: false, error: gate.error });
  }
  const q = queryOf(req);
  const filter = normalizeActionQueueFilter(q.filter);
  const loaded = await loadProspectWorkbenchList({ proofMode: proof === true });
  if (!loaded.ok) {
    return send(res, 503, {
      ok: false,
      error: loaded.error,
      data_source: loaded.data_source,
      workspace: 'operating',
    });
  }
  return send(
    res,
    200,
    buildActionQueuePayload({
      prospects: filterProspectsForActionQueue(loaded.prospects, filter),
      data_source: loaded.data_source,
      proof_mode: proof === true,
      filter,
      filter_counts: countActionQueueFilters(loaded.prospects),
    }),
  );
}

/**
 * GET /api/app/commercial — Operating Workspace / Core only.
 * Commercial summary (#1004). Read-only projection of existing #714 rail + identity.
 * No payment, send, schema, or ERPNext mutation.
 */
export async function handleAppCommercial(req, res) {
  if (req.method !== 'GET') {
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  const { actor, proof } = await resolveActor(req, 'core');
  if (!actor) {
    return send(res, 401, { ok: false, error: 'authentication_required' });
  }
  const gate = assertProspectOperationsAccess(actor);
  if (!gate.ok) {
    return send(res, gate.http_status, { ok: false, error: gate.error });
  }
  const loaded = await loadCommercialSummaryList({ proofMode: proof === true });
  if (!loaded.ok) {
    return send(res, 503, {
      ok: false,
      error: loaded.error,
      data_source: loaded.data_source,
      workspace: 'operating',
    });
  }
  const q = queryOf(req);
  return send(
    res,
    200,
    buildCommercialSummaryPayload({
      leads: loaded.leads,
      data_source: loaded.data_source,
      proof_mode: proof === true,
      filter: normalizeCommercialFilter(q.filter),
      now: loaded.now,
    }),
  );
}

/**
 * GET /api/app/commercial-quotation — Operating Workspace / Core only.
 * Bounded ERPNext Quotation evidence for an existing Commercial row (#1160).
 * Read-only GET. No ERPNext write. No Postgres copy.
 */
export async function handleAppCommercialQuotation(req, res) {
  if (req.method !== 'GET') {
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  const { actor, proof } = await resolveActor(req, 'core');
  if (!actor) {
    return send(res, 401, { ok: false, error: 'authentication_required' });
  }
  const gate = assertProspectOperationsAccess(actor);
  if (!gate.ok) {
    return send(res, gate.http_status, { ok: false, error: gate.error });
  }
  const q = queryOf(req);
  const testClient = /** @type {{ __testFrappeClient?: object }} */ (req).__testFrappeClient;
  const loaded = await loadCommercialQuotationEvidence({
    id: String(q.id || q.prospect_id || ''),
    proofMode: proof === true,
    client: testClient || undefined,
  });
  if (!loaded.ok) {
    return send(res, loaded.http_status || 400, {
      ok: false,
      error: loaded.error,
      blocker: loaded.blocker || null,
      data_source: loaded.data_source || null,
      workspace: 'operating',
      erpnext_mutated: false,
      copied_to_postgres: false,
    });
  }
  return send(
    res,
    200,
    buildCommercialQuotationEvidencePayload({
      row: loaded.row,
      evidence: loaded.evidence,
      data_source: loaded.data_source,
      proof_mode: proof === true,
      print_available: loaded.print_available !== false,
    }),
  );
}

/**
 * GET /api/app/commercial-quotation-pdf — Operating Workspace / Core only.
 * Printable PDF for the Commercial row's existing ERPNext Quotation. GET only.
 */
export async function handleAppCommercialQuotationPdf(req, res) {
  if (req.method !== 'GET') {
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  const { actor, proof } = await resolveActor(req, 'core');
  if (!actor) {
    return send(res, 401, { ok: false, error: 'authentication_required' });
  }
  const gate = assertProspectOperationsAccess(actor);
  if (!gate.ok) {
    return send(res, gate.http_status, { ok: false, error: gate.error });
  }
  const q = queryOf(req);
  const testClient = /** @type {{ __testFrappeClient?: object }} */ (req).__testFrappeClient;
  const loaded = await loadCommercialQuotationPdf({
    id: String(q.id || q.prospect_id || ''),
    proofMode: proof === true,
    client: testClient || undefined,
  });
  if (!loaded.ok) {
    return send(res, loaded.http_status || 400, {
      ok: false,
      error: loaded.error,
      blocker: loaded.blocker || null,
      data_source: loaded.data_source || null,
      workspace: 'operating',
      erpnext_mutated: false,
    });
  }
  return sendPdf(res, 200, loaded.bytes, loaded.filename || 'quotation.pdf');
}

/**
 * GET /api/app/clients — Operating Workspace / Core only.
 * Clients summary (#999). Reuses Company Master + related prospect references.
 * Read-only. No second Client table. No ERPNext write. No external send.
 */
export async function handleAppClients(req, res) {
  if (req.method !== 'GET') {
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  const { actor, proof } = await resolveActor(req, 'core');
  if (!actor) {
    return send(res, 401, { ok: false, error: 'authentication_required' });
  }
  const gate = assertClientsAccess(actor);
  if (!gate.ok) {
    return send(res, gate.http_status, { ok: false, error: gate.error });
  }
  const loaded = await loadClientsList({ proofMode: proof === true });
  if (!loaded.ok) {
    return send(res, 503, {
      ok: false,
      error: loaded.error,
      data_source: loaded.data_source,
      workspace: 'operating',
    });
  }
  return send(
    res,
    200,
    buildClientsListPayload({
      clients: loaded.clients,
      data_source: loaded.data_source,
      proof_mode: proof === true,
    }),
  );
}

/**
 * GET /api/app/client — Operating Workspace Clients summary detail (#999).
 * Core only. Read-only. No external send.
 */
export async function handleAppClientDetail(req, res) {
  if (req.method !== 'GET') {
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  const { actor, proof } = await resolveActor(req, 'core');
  if (!actor) {
    return send(res, 401, { ok: false, error: 'authentication_required' });
  }
  const gate = assertClientsAccess(actor);
  if (!gate.ok) {
    return send(res, gate.http_status, { ok: false, error: gate.error });
  }
  const q = queryOf(req);
  const id = String(q.id || q.company_id || '').trim();
  if (!id) {
    return send(res, 400, { ok: false, error: 'id_required', workspace: 'operating' });
  }
  const loaded = await loadClientDetail({ id, proofMode: proof === true });
  if (!loaded.ok) {
    return send(res, loaded.http_status || 500, {
      ok: false,
      error: loaded.error,
      data_source: loaded.data_source,
      workspace: 'operating',
    });
  }
  return send(
    res,
    200,
    buildClientDetailPayload({
      client: loaded.client,
      data_source: loaded.data_source,
      proof_mode: proof === true,
    }),
  );
}

/**
 * GET /api/app/delivery — Operating Workspace / Core only.
 * Delivery summary (#1005). Lead Rescue + Website Rescue leads plus existing
 * Change / request tickets. Read-only. No external send. No schema.
 */
export async function handleAppDelivery(req, res) {
  if (req.method !== 'GET') {
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  const { actor, proof } = await resolveActor(req, 'core');
  if (!actor) {
    return send(res, 401, { ok: false, error: 'authentication_required' });
  }
  const gate = assertDeliveryWorkspaceAccess(actor);
  if (!gate.ok) {
    return send(res, gate.http_status, { ok: false, error: gate.error });
  }
  const q = queryOf(req);
  const filter = normalizeDeliveryFilter(q.filter);
  const repo = repoForRequest(req, proof);
  const loaded = await loadDeliverySummary({
    proofMode: proof === true,
    listRequests: async () => {
      const listed = await repo.listForCore({ tenantFilter: null });
      return {
        requests: listed.requests,
        data_source: listed.data_source,
      };
    },
  });
  if (!loaded.ok) {
    return send(res, 503, {
      ok: false,
      error: loaded.error,
      data_source: loaded.data_source,
      workspace: 'operating',
    });
  }
  return send(
    res,
    200,
    buildDeliveryPayload({
      items: loaded.items,
      data_source: loaded.data_source,
      proof_mode: proof === true,
      filter,
    }),
  );
}

/**
 * GET / PATCH /api/app/prospect — Operating Workspace shared detail (#994).
 * Core only. JSON-only writes. No external send.
 */
export async function handleAppProspectDetail(req, res) {
  if (req.method !== 'GET' && req.method !== 'PATCH' && req.method !== 'POST') {
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  const { actor, proof } = await resolveActor(req, 'core');
  if (!actor) {
    return send(res, 401, { ok: false, error: 'authentication_required' });
  }
  const gate = assertProspectOperationsAccess(actor);
  if (!gate.ok) {
    return send(res, gate.http_status, { ok: false, error: gate.error });
  }

  const q = queryOf(req);
  const body =
    req.body && typeof req.body === 'object' ? /** @type {Record<string, unknown>} */ (req.body) : {};
  const id = String(q.id || body.id || body.lead_id || '').trim();
  if (!id) {
    return send(res, 400, { ok: false, error: 'id_required', workspace: 'operating' });
  }

  const actorLabel =
    (actor.username != null && String(actor.username).trim()) ||
    (actor.role != null && String(actor.role).trim()) ||
    'operator';

  if (req.method === 'GET') {
    const loaded = await loadProspectDetail({ id, proofMode: proof === true });
    if (!loaded.ok) {
      return send(res, loaded.http_status || 500, {
        ok: false,
        error: loaded.error,
        data_source: loaded.data_source,
        workspace: 'operating',
      });
    }
    return send(
      res,
      200,
      buildProspectDetailPayload({
        prospect: loaded.prospect,
        data_source: loaded.data_source,
        proof_mode: proof === true,
      }),
    );
  }

  const saved = await saveProspectDetail({
    id,
    patch: body,
    actorLabel,
    proofMode: proof === true,
  });
  if (!saved.ok) {
    return send(res, saved.http_status || 500, {
      ok: false,
      error: saved.error,
      data_source: saved.data_source,
      workspace: 'operating',
      external_send: false,
    });
  }
  return send(res, 200, {
    ...buildProspectDetailPayload({
      prospect: saved.prospect,
      data_source: saved.data_source,
      proof_mode: proof === true,
    }),
    saved: true,
  });
}

/**
 * POST /api/app/component-review — Tenant only.
 * Persists via repository into fixture store or cmp_tickets.console_json.
 * No external send.
 */
export async function handleAppComponentReview(req, res) {
  if (req.method !== 'POST') {
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  const { actor, proof } = await resolveActor(req, 'tenant');
  if (!actor) {
    return send(res, 401, { ok: false, error: 'authentication_required' });
  }
  const body =
    req.body && typeof req.body === 'object'
      ? /** @type {Record<string, unknown>} */ (req.body)
      : {};
  const requestedTenant =
    String(body.tenant_id || '').trim() || resolveTenantId(req) || REFERENCE_TENANT_ID;
  const bound = resolveAuthorisedTenantId(actor, requestedTenant);
  if (!bound.ok) {
    return send(res, bound.http_status, { ok: false, error: bound.error });
  }
  const tenantId = bound.tenant_id;
  const gate = assertEnvironmentAccess(actor, 'tenant', tenantId);
  if (!gate.ok) {
    return send(res, gate.http_status, { ok: false, error: gate.error });
  }

  const repo = repoForRequest(req, proof);
  const result = await applyComponentReviewWithRepo({
    repo,
    requestId: String(body.request_id || '').trim(),
    tenantId,
    componentKey: String(body.component_key || '').trim(),
    decision: body.decision,
    comment: body.comment,
    byRole: actor.role,
  });
  if (!result.ok) {
    const payload = {
      ok: false,
      error: result.error,
      data_source: repo.dataSource,
      persistence_path: repo.persistencePath || null,
      external_send: false,
    };
    if (result.error === 'persistence_unavailable') {
      payload.hint =
        'Review writes require a repository that supports console_json mutations.';
    }
    return send(res, result.http_status || 400, payload);
  }
  return send(res, 200, {
    ok: true,
    decision: result.decision,
    component_key: result.component_key,
    request: projectTenantRequest(result.request),
    data_source: repo.dataSource,
    persistence_path: repo.persistencePath || null,
    external_send: false,
    email_sent: false,
    whatsapp_sent: false,
    sms_sent: false,
    payment_processed: false,
  });
}

/**
 * POST /api/app/component-expose — Core only.
 * Persists via repository into fixture store or cmp_tickets.console_json.
 */
export async function handleAppComponentExpose(req, res) {
  if (req.method !== 'POST') {
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }
  const { actor, proof } = await resolveActor(req, 'core');
  if (!actor) {
    return send(res, 401, { ok: false, error: 'authentication_required' });
  }
  const gate = assertEnvironmentAccess(actor, 'core');
  if (!gate.ok) {
    return send(res, gate.http_status, { ok: false, error: gate.error });
  }
  const repo = repoForRequest(req, proof);
  const body =
    req.body && typeof req.body === 'object'
      ? /** @type {Record<string, unknown>} */ (req.body)
      : {};
  const result = await setComponentExposureWithRepo({
    repo,
    requestId: String(body.request_id || '').trim(),
    componentKey: String(body.component_key || '').trim(),
    exposed: body.exposed === true,
  });
  if (!result.ok) {
    const payload = {
      ok: false,
      error: result.error,
      data_source: repo.dataSource,
      persistence_path: repo.persistencePath || null,
      external_send: false,
    };
    if (result.error === 'persistence_unavailable') {
      payload.hint =
        'Expose/hide writes require a repository that supports console_json mutations.';
    }
    return send(res, result.http_status || 400, payload);
  }
  return send(res, 200, {
    ok: true,
    component_key: result.component_key,
    exposed: result.exposed,
    request: projectCoreRequest(result.request),
    data_source: repo.dataSource,
    persistence_path: repo.persistencePath || null,
    external_send: false,
  });
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse & { status: Function, json: Function }} res
 * @param {string} pathSeg
 * @returns {Promise<boolean>}
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
  if (pathSeg === 'app/overview') {
    await handleAppOverview(req, res);
    return true;
  }
  if (pathSeg === 'app/prospects') {
    await handleAppProspects(req, res);
    return true;
  }
  if (pathSeg === 'app/today') {
    await handleAppToday(req, res);
    return true;
  }
  if (pathSeg === 'app/pipeline') {
    await handleAppPipeline(req, res);
    return true;
  }
  if (pathSeg === 'app/commercial') {
    await handleAppCommercial(req, res);
    return true;
  }
  if (pathSeg === 'app/commercial-quotation' || pathSeg === 'app/commercial/quotation') {
    await handleAppCommercialQuotation(req, res);
    return true;
  }
  if (
    pathSeg === 'app/commercial-quotation-pdf' ||
    pathSeg === 'app/commercial/quotation-pdf'
  ) {
    await handleAppCommercialQuotationPdf(req, res);
    return true;
  }
  if (pathSeg === 'app/workbench') {
    await handleAppWorkbench(req, res);
    return true;
  }
  if (pathSeg === 'app/queue') {
    await handleAppActionQueue(req, res);
    return true;
  }
  if (pathSeg === 'app/clients') {
    await handleAppClients(req, res);
    return true;
  }
  if (pathSeg === 'app/client' || pathSeg === 'app/clients/detail') {
    await handleAppClientDetail(req, res);
    return true;
  }
  if (pathSeg === 'app/delivery') {
    await handleAppDelivery(req, res);
    return true;
  }
  if (pathSeg === 'app/prospect' || pathSeg === 'app/prospects/detail') {
    await handleAppProspectDetail(req, res);
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
