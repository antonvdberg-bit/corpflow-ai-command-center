/**
 * Core tenant service-workflow primitives.
 *
 * Pure, configuration-driven helpers for service catalogues, tenant opt-in,
 * access decisions, safe transitions, idempotency and draft-only updates.
 * Persistence, external sends, payments and domain-specific rules stay in
 * tenant adapters.
 */

const TERMINAL_DRAFT_STATUSES = Object.freeze(['accepted', 'idempotent', 'denied']);

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  return value == null ? '' : String(value).trim();
}

/**
 * @param {Record<string, unknown>} config
 * @returns {string[]}
 */
function enabledTenants(config) {
  const workflow = asObject(config.core_workflow);
  const configured = asArray(workflow.enabled_tenants).map(text).filter(Boolean);
  return configured;
}

/**
 * @param {Record<string, unknown>} config
 * @param {string} tenantId
 * @returns {boolean}
 */
export function isCoreServiceWorkflowOptedIn(config, tenantId) {
  const tenant = text(tenantId);
  return Boolean(tenant) && enabledTenants(config).includes(tenant);
}

/**
 * @param {Record<string, unknown>} config
 * @returns {Record<string, unknown>[]}
 */
export function listCoreServiceTemplates(config) {
  return Object.values(asObject(config.services))
    .map((service) => asObject(service))
    .filter((service) => text(service.service_id));
}

/**
 * @param {Record<string, unknown>} config
 * @param {string} serviceId
 * @returns {Record<string, unknown> | null}
 */
export function getCoreServiceTemplate(config, serviceId) {
  const wanted = text(serviceId);
  if (!wanted) return null;
  return listCoreServiceTemplates(config).find((service) => text(service.service_id) === wanted) || null;
}

/**
 * Resolve only configured IDs, aliases and subject cues. Domain adapters can
 * add stricter rules before calling this helper.
 *
 * @param {Record<string, unknown>} config
 * @param {unknown} input
 * @returns {string | null}
 */
export function resolveCoreServiceId(config, input) {
  const raw = text(input).toLowerCase();
  if (!raw) return null;
  for (const service of listCoreServiceTemplates(config)) {
    const candidates = [
      service.service_id,
      ...asArray(service.email_intake_slugs),
      ...asArray(service.aliases),
      ...asArray(service.subject_cues),
    ]
      .map(text)
      .filter(Boolean)
      .map((candidate) => candidate.toLowerCase());
    if (candidates.some((candidate) => raw === candidate || raw.includes(candidate))) {
      return text(service.service_id);
    }
  }
  return null;
}

/**
 * Fail closed for unauthenticated, unconfigured, cross-tenant or insufficient
 * privilege requests. The host is authoritative when supplied.
 *
 * @param {{
 *   config: Record<string, unknown>;
 *   tenantId?: string;
 *   sessionTenantId?: string;
 *   hostTenantId?: string;
 *   authenticated?: boolean;
 *   privilege?: string;
 *   requiredPrivilege?: string;
 * }} args
 * @returns {{ allowed: boolean; status: 200 | 401 | 403; reason: string }}
 */
export function resolveCoreServiceWorkflowAccess(args) {
  const config = asObject(args?.config);
  const tenantId = text(args?.tenantId);
  const sessionTenantId = text(args?.sessionTenantId);
  const hostTenantId = text(args?.hostTenantId);
  const requiredPrivilege = text(args?.requiredPrivilege) || 'operator';

  if (args?.authenticated !== true) {
    return { allowed: false, status: 401, reason: 'AUTHENTICATION_REQUIRED' };
  }
  if (!tenantId || !isCoreServiceWorkflowOptedIn(config, tenantId)) {
    return { allowed: false, status: 403, reason: 'TENANT_WORKFLOW_NOT_CONFIGURED' };
  }
  if (sessionTenantId !== tenantId || (hostTenantId && hostTenantId !== tenantId)) {
    return { allowed: false, status: 403, reason: 'TENANT_SCOPE_MISMATCH' };
  }
  if (requiredPrivilege && text(args?.privilege) !== requiredPrivilege) {
    return { allowed: false, status: 403, reason: 'INSUFFICIENT_PRIVILEGE' };
  }
  return { allowed: true, status: 200, reason: 'tenant_scoped_access' };
}

/**
 * @param {{
 *   config: Record<string, unknown>;
 *   currentState: string;
 *   intent: string;
 *   approvalGranted?: boolean;
 * }} args
 * @returns {{ applied: boolean; state: string; reason: string; protected?: boolean }}
 */
export function applyCoreServiceWorkflowIntent(args) {
  const config = asObject(args?.config);
  const currentState = text(args?.currentState);
  const intent = text(args?.intent).toLowerCase();
  const transitions = asObject(config.core_workflow).transitions;
  const transition = asObject(asObject(transitions)[currentState]);
  const nextState = text(transition[intent]);

  if (intent === 'payment' || intent === 'pay') {
    return {
      applied: false,
      state: currentState,
      reason: 'PAYMENT_PROTECTED',
      protected: true,
    };
  }
  if (intent === 'live_client_send' || intent === 'send') {
    return {
      applied: false,
      state: currentState,
      reason: 'LIVE_SEND_PROTECTED',
      protected: true,
    };
  }
  if (!nextState) {
    return { applied: false, state: currentState, reason: 'INVALID_TRANSITION' };
  }
  if (asObject(transition).requires_approval === true && args?.approvalGranted !== true) {
    return { applied: false, state: currentState, reason: 'HUMAN_APPROVAL_REQUIRED' };
  }
  return { applied: true, state: nextState, reason: 'transition_applied' };
}

/**
 * Draft-only and idempotent update helper. `seenKeys` is supplied by an
 * adapter; this function does not persist or mutate it.
 *
 * @param {{
 *   tenantId: string;
 *   actorTenantId: string;
 *   patch: Record<string, unknown>;
 *   allowedFields: string[];
 *   idempotencyKey: string;
 *   seenKeys?: ReadonlySet<string>;
 * }} args
 * @returns {{
 *   status: string;
 *   tenant_id: string;
 *   idempotency_key: string;
 *   patch?: Record<string, unknown>;
 *   reason?: string;
 * }}
 */
export function prepareCoreDraftUpdate(args) {
  const tenantId = text(args?.tenantId);
  const actorTenantId = text(args?.actorTenantId);
  const key = text(args?.idempotencyKey);
  if (!tenantId || !actorTenantId || actorTenantId !== tenantId) {
    return { status: 'denied', tenant_id: tenantId, idempotency_key: key, reason: 'TENANT_SCOPE_MISMATCH' };
  }
  if (!key) {
    return { status: 'denied', tenant_id: tenantId, idempotency_key: key, reason: 'IDEMPOTENCY_KEY_REQUIRED' };
  }
  if (args?.seenKeys?.has(key)) {
    return { status: 'idempotent', tenant_id: tenantId, idempotency_key: key };
  }
  const allowed = new Set(asArray(args?.allowedFields).map(text));
  const patch = asObject(args?.patch);
  const safePatch = Object.fromEntries(Object.entries(patch).filter(([field]) => allowed.has(field)));
  if (!Object.keys(safePatch).length || Object.keys(safePatch).length !== Object.keys(patch).length) {
    return { status: 'denied', tenant_id: tenantId, idempotency_key: key, reason: 'DRAFT_FIELD_NOT_ALLOWED' };
  }
  return { status: 'accepted', tenant_id: tenantId, idempotency_key: key, patch: safePatch };
}

export { TERMINAL_DRAFT_STATUSES };
