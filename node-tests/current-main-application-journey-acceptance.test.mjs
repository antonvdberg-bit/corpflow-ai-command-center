/**
 * #1149 — Current-main application journey acceptance.
 *
 * One coherent client/operator journey on merged Tenant (#1124), Commercial
 * (#1122), and Delivery (#1142) foundations. Reuses existing fixtures only.
 * No schema. No send. No second tenant/client model.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  actorFromSessionPayload,
  buildProofCoreActor,
  buildProofTenantActor,
  isProofModeAllowed,
} from '../lib/app/access.js';
import {
  CANONICAL_REQUEST_ID,
  CORE_NAV_ITEMS,
  OTHER_TENANT_REQUEST_ID,
  REFERENCE_TENANT_ID,
  TENANT_NAV_ITEMS,
} from '../lib/app/constants.js';
import {
  handleAppCommercial,
  handleAppComponentReview,
  handleAppDelivery,
  handleAppRequestDetail,
  handleAppRequestsList,
  handleAppShell,
} from '../lib/app/handlers.js';
import { payloadContainsForbiddenTenantKeys } from '../lib/app/project.js';
import { resetRequestStore } from '../lib/app/request-store.js';
import {
  CHANGE_CANONICAL_PATH,
  TENANT_WORKSPACE_PATH,
  changeRemainsCanonicalServiceSurface,
  isStaffOnlyTenantDeniedPath,
  tenantChangeHandoffCreatesTicket,
  tenantChangeHandoffHref,
} from '../lib/app/tenant-journey.js';
import {
  isOperatingWorkspaceStaffPath,
  tenantChromeHidesWorkspaceChooser,
  tenantClientSurfaceOmitsForbiddenChrome,
  tenantNavIsClientServiceOnly,
} from '../lib/app/tenant-workspace.js';
import {
  CLIENTS_SUMMARY_PATH,
  COMMERCIAL_SUMMARY_PATH,
  DELIVERY_PATH,
  operatingNavIncludesCommercialSummary,
  operatingNavIncludesDelivery,
  tenantNavOmitsCommercialSummary,
  tenantNavOmitsDelivery,
} from '../lib/app/workspace-context.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

beforeEach(() => {
  resetRequestStore();
});

function mockRes() {
  /** @type {{ statusCode: number, body: any }} */
  const state = { statusCode: 0, body: null };
  return {
    state,
    status(code) {
      state.statusCode = code;
      return this;
    },
    json(payload) {
      state.body = payload;
      return this;
    },
  };
}

function tenantActor() {
  return actorFromSessionPayload({
    typ: 'tenant',
    username: 'syn-1149-tenant',
    user_id: 'syn_user_1149_tenant',
    tenant_id: REFERENCE_TENANT_ID,
  });
}

describe('#1149 tenant-safe Requests / Progress / review / change', () => {
  it('keeps Tenant nav on Requests & Progress plus canonical /change only', () => {
    assert.equal(tenantNavIsClientServiceOnly(), true);
    assert.deepEqual(
      TENANT_NAV_ITEMS.map((item) => item.id),
      ['requests_progress', 'service_change'],
    );
    assert.equal(TENANT_NAV_ITEMS[1].href, '/change?from=tenant-workspace');
    assert.equal(changeRemainsCanonicalServiceSurface(), true);
    assert.equal(tenantChangeHandoffCreatesTicket(), false);
    assert.equal(tenantChangeHandoffHref({ tenantId: REFERENCE_TENANT_ID }).startsWith('/change?'), true);
    assert.match(tenantChangeHandoffHref({ tenantId: REFERENCE_TENANT_ID }), /from=tenant-workspace/);
    assert.equal(tenantNavOmitsCommercialSummary(), true);
    assert.equal(tenantNavOmitsDelivery(), true);

    const tenantSrc = readFileSync(path.join(REPO_ROOT, 'pages/app/tenant.js'), 'utf8');
    const menuSrc = readFileSync(path.join(REPO_ROOT, 'components/app/TenantMenu.js'), 'utf8');
    assert.equal(tenantClientSurfaceOmitsForbiddenChrome(tenantSrc), true);
    assert.equal(menuSrc.includes('/app/commercial'), false);
    assert.equal(menuSrc.includes('/app/delivery'), false);
    assert.equal(menuSrc.includes('/app/core'), false);
  });

  it('lets a reference-tenant actor see only CorpFlowAI requests and exposed review', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
      const actor = tenantActor();
      const shell = mockRes();
      await handleAppShell(
        {
          method: 'GET',
          url: `/api/app/shell?env=tenant&tenant_id=${REFERENCE_TENANT_ID}`,
          headers: {},
          __testAppActor: actor,
        },
        shell,
      );
      assert.equal(shell.state.statusCode, 200);
      assert.equal(tenantChromeHidesWorkspaceChooser(shell.state.body.workspace), true);

      const list = mockRes();
      await handleAppRequestsList(
        {
          method: 'GET',
          url: `/api/app/requests?env=tenant&tenant_id=${REFERENCE_TENANT_ID}`,
          headers: {},
          __testAppActor: actor,
        },
        list,
      );
      const ids = (list.state.body.requests || []).map((row) => row.request_id);
      assert.equal(ids.includes(CANONICAL_REQUEST_ID), true);
      assert.equal(ids.includes(OTHER_TENANT_REQUEST_ID), false);

      const detail = mockRes();
      await handleAppRequestDetail(
        {
          method: 'GET',
          url: `/api/app/request?env=tenant&tenant_id=${REFERENCE_TENANT_ID}&id=${CANONICAL_REQUEST_ID}`,
          headers: {},
          __testAppActor: actor,
        },
        detail,
      );
      const request = detail.state.body.request || {};
      const landing = (request.components || []).find((c) => c.key === 'landing_copy');
      const wiring = (request.components || []).find((c) => c.key === 'internal_wiring');
      assert.equal(landing?.review_enabled, true);
      assert.equal(wiring?.view_only, true);
      assert.equal(payloadContainsForbiddenTenantKeys(request), false);

      const blocked = mockRes();
      await handleAppComponentReview(
        {
          method: 'POST',
          url: '/api/app/component-review',
          headers: {},
          body: {
            request_id: CANONICAL_REQUEST_ID,
            component_key: 'internal_wiring',
            decision: 'approve',
            env: 'tenant',
            tenant_id: REFERENCE_TENANT_ID,
          },
          __testAppActor: actor,
        },
        blocked,
      );
      assert.equal(blocked.state.statusCode, 403);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});

describe('#1149 staff Commercial + Delivery on existing records, tenant fail-closed', () => {
  it('puts Commercial and Delivery on Operating Workspace nav and not Tenant nav', () => {
    assert.equal(operatingNavIncludesCommercialSummary(), true);
    assert.equal(operatingNavIncludesDelivery(), true);
    assert.equal(
      CORE_NAV_ITEMS.some((item) => item.id === 'commercial' && item.href === COMMERCIAL_SUMMARY_PATH),
      true,
    );
    assert.equal(CORE_NAV_ITEMS.some((item) => item.id === 'delivery' && item.href === DELIVERY_PATH), true);
    assert.equal(CORE_NAV_ITEMS.some((item) => item.id === 'operations' && item.href === CHANGE_CANONICAL_PATH), true);
    for (const p of [COMMERCIAL_SUMMARY_PATH, DELIVERY_PATH, '/app/core']) {
      assert.equal(isStaffOnlyTenantDeniedPath(p), true, p);
      assert.equal(isOperatingWorkspaceStaffPath(p), true, p);
    }
    assert.equal(isStaffOnlyTenantDeniedPath(TENANT_WORKSPACE_PATH), false);
    assert.equal(isStaffOnlyTenantDeniedPath(CHANGE_CANONICAL_PATH), false);
  });

  it('staff proof fixtures reuse existing prospect/client ids and link Change / Clients', async () => {
    const prev = process.env.NODE_ENV;
    const prevVercel = process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'development';
    delete process.env.VERCEL_ENV;
    try {
      const core = buildProofCoreActor();
      const commercial = mockRes();
      await handleAppCommercial(
        {
          method: 'GET',
          url: '/api/app/commercial?proof=1&env=core&filter=all',
          headers: {},
          __testAppActor: core,
        },
        commercial,
      );
      assert.equal(commercial.state.statusCode, 200);
      assert.equal(commercial.state.body.ok, true);
      assert.equal(commercial.state.body.payment_processed, false);
      assert.equal(commercial.state.body.external_send, false);
      assert.equal(commercial.state.body.schema_changed, false);
      const ada = (commercial.state.body.rows || []).find((row) => row.id === 'syn-772-lr-ada');
      assert.ok(ada, 'existing Ada Spa commercial fixture missing');
      assert.equal(ada.prospect_id, 'syn-772-lr-ada');
      assert.equal(ada.shared_detail_path, '/app/prospects/syn-772-lr-ada');
      assert.equal(ada.clients_path, '/app/clients/cmp_ada_spa_synthetic');
      assert.equal(String(ada.clients_path).startsWith(CLIENTS_SUMMARY_PATH), true);

      const delivery = mockRes();
      await handleAppDelivery(
        {
          method: 'GET',
          url: '/api/app/delivery?proof=1&env=core&filter=all',
          headers: {},
          __testAppActor: core,
        },
        delivery,
      );
      assert.equal(delivery.state.statusCode, 200);
      assert.equal(delivery.state.body.ok, true);
      const adaDelivery = (delivery.state.body.items || []).find((row) => row.source_id === 'syn-772-lr-ada');
      assert.ok(adaDelivery, 'existing Ada Spa delivery fixture missing');
      assert.equal(adaDelivery.links.prospect, '/app/prospects/syn-772-lr-ada');
      assert.equal(adaDelivery.links.clients, '/app/clients/cmp_ada_spa_synthetic');
      assert.equal(adaDelivery.links.commercial, COMMERCIAL_SUMMARY_PATH);
      assert.equal(adaDelivery.links.change, CHANGE_CANONICAL_PATH);
      const hrefs = JSON.stringify(delivery.state.body);
      assert.equal(hrefs.includes('/change'), true);
      assert.equal(hrefs.includes(CLIENTS_SUMMARY_PATH), true);
    } finally {
      process.env.NODE_ENV = prev;
      if (prevVercel == null) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prevVercel;
    }
  });

  it('denies Tenant sessions on Commercial and Delivery even if env=core is requested', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
      const tenant = tenantActor();
      for (const handler of [handleAppCommercial, handleAppDelivery]) {
        const res = mockRes();
        await handler(
          {
            method: 'GET',
            url: handler === handleAppCommercial ? '/api/app/commercial?env=core' : '/api/app/delivery?env=core',
            headers: {},
            __testAppActor: tenant,
          },
          res,
        );
        assert.equal(res.state.statusCode, 403);
        assert.equal(res.state.body.error, 'core_access_denied');
      }
      const proofTenant = mockRes();
      await handleAppCommercial(
        {
          method: 'GET',
          url: '/api/app/commercial?env=tenant',
          headers: {},
          __testAppActor: buildProofTenantActor(),
        },
        proofTenant,
      );
      assert.equal(proofTenant.state.statusCode, 403);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});

describe('#1149 production proof harness stays fail-closed and no duplicate model is introduced', () => {
  it('rejects proof mode on Vercel Production', () => {
    assert.equal(isProofModeAllowed({ nodeEnv: 'production', vercelEnv: 'production' }), false);
    assert.equal(isProofModeAllowed({ nodeEnv: 'development', vercelEnv: 'production' }), false);
    assert.equal(isProofModeAllowed({ nodeEnv: 'development', vercelEnv: 'preview' }), true);
  });

  it('does not add a second change/commercial/delivery page tree', () => {
    assert.equal(CHANGE_CANONICAL_PATH, '/change');
    assert.equal(COMMERCIAL_SUMMARY_PATH, '/app/commercial');
    assert.equal(DELIVERY_PATH, '/app/delivery');
    assert.equal(TENANT_WORKSPACE_PATH, '/app/tenant');
    const commercialSrc = readFileSync(path.join(REPO_ROOT, 'pages/app/commercial.js'), 'utf8');
    const deliverySrc = readFileSync(path.join(REPO_ROOT, 'pages/app/delivery.js'), 'utf8');
    assert.match(commercialSrc, /no payment/i);
    assert.match(deliverySrc, /staff-only|Tenant session cannot open Delivery/i);
  });
});
