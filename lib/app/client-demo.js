/**
 * #778 Slice 1 — browser-safe synthetic demo helpers for preview screenshots.
 * Imports only pure modules (no server/session/Prisma).
 */

import {
  buildAppChrome,
  canAccessCoreScope,
  canAccessTenantScope,
} from './access.js';
import { projectCoreRequest, projectTenantRequest } from './projection.js';
import {
  SYNTHETIC_REQUEST_ID,
  REFERENCE_TENANT_ID,
  applyComponentReview,
  getSyntheticRequest,
  resetSyntheticStore,
  setComponentExposure,
  ensureSyntheticRequest,
} from './synthetic-store.js';

const DEMO_NS = 'browser-demo';

/** Dual-authorised synthetic session for local/preview evidence only. */
export function demoDualSession() {
  return {
    ok: true,
    payload: {
      typ: 'admin',
      user_id: 'demo-slice1-operator',
      factory_master: true,
      acting_tenant_id: REFERENCE_TENANT_ID,
      session_version: 1,
    },
  };
}

export function demoTenantOnlySession() {
  return {
    ok: true,
    payload: {
      typ: 'tenant',
      user_id: 'demo-slice1-tenant',
      tenant_id: REFERENCE_TENANT_ID,
      acting_tenant_id: REFERENCE_TENANT_ID,
      session_version: 1,
    },
  };
}

/**
 * @param {'core'|'tenant'} scope
 */
export function getDemoChrome(scope) {
  const sess = demoDualSession();
  const memberships = [{ tenant_id: REFERENCE_TENANT_ID, tenant_name: 'CorpFlowAI' }];
  const chrome = buildAppChrome({
    sess,
    selectedScope: scope,
    selectedTenantId: REFERENCE_TENANT_ID,
    memberships,
    factoryMaster: true,
  });
  return {
    ...chrome,
    synthetic_request_id: SYNTHETIC_REQUEST_ID,
    demo: true,
  };
}

export function ensureDemoStore() {
  ensureSyntheticRequest(DEMO_NS);
}

export function resetDemoStore() {
  resetSyntheticStore(DEMO_NS);
}

/**
 * @param {'core'|'tenant'} scope
 */
export function getDemoRequest(scope) {
  ensureDemoStore();
  const row = getSyntheticRequest(SYNTHETIC_REQUEST_ID, DEMO_NS);
  if (!row) return null;
  return scope === 'core' ? projectCoreRequest(row) : projectTenantRequest(row);
}

export function demoExpose(componentKey, exposed) {
  ensureDemoStore();
  return setComponentExposure(SYNTHETIC_REQUEST_ID, componentKey, exposed, DEMO_NS);
}

export function demoReview({ component_key, decision, comment }) {
  ensureDemoStore();
  return applyComponentReview({
    requestId: SYNTHETIC_REQUEST_ID,
    componentKey: component_key,
    decision,
    comment,
    by: 'tenant-demo',
    namespace: DEMO_NS,
  });
}

export function demoAccessChecks() {
  const dual = demoDualSession();
  const tenantOnly = demoTenantOnlySession();
  return {
    dual_can_core: canAccessCoreScope(dual),
    dual_can_tenant: canAccessTenantScope({
      sess: dual,
      tenantId: REFERENCE_TENANT_ID,
      memberships: [{ tenant_id: REFERENCE_TENANT_ID }],
      factoryMaster: true,
    }),
    tenant_only_can_core: canAccessCoreScope(tenantOnly),
    tenant_only_can_tenant: canAccessTenantScope({
      sess: tenantOnly,
      tenantId: REFERENCE_TENANT_ID,
      memberships: [{ tenant_id: REFERENCE_TENANT_ID }],
    }),
    tenant_only_other_tenant: canAccessTenantScope({
      sess: tenantOnly,
      tenantId: 'luxe-maurice',
      memberships: [{ tenant_id: REFERENCE_TENANT_ID }],
    }),
  };
}
