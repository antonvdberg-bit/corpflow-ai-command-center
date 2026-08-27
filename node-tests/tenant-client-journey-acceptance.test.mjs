/**
 * #1120 — Product acceptance: CorpFlowAI reference-tenant usable client journey.
 *
 * Reuses #884 expose/review, #1077 continuity, #1104 Tenant Workspace simplification.
 * No second portal. No schema. No factory work.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { actorFromSessionPayload, buildProofCoreActor } from '../lib/app/access.js';
import {
  CANONICAL_REQUEST_ID,
  OTHER_TENANT_REQUEST_ID,
  REFERENCE_TENANT_ID,
  TENANT_FORBIDDEN_FIELD_KEYS,
  TENANT_NAV_ITEMS,
} from '../lib/app/constants.js';
import {
  handleAppComponentReview,
  handleAppRequestDetail,
  handleAppRequestsList,
  handleAppShell,
  handleAppToday,
  tryHandleAppApi,
} from '../lib/app/handlers.js';
import { payloadContainsForbiddenTenantKeys } from '../lib/app/project.js';
import { resetRequestStore } from '../lib/app/request-store.js';
import {
  CHANGE_CANONICAL_PATH,
  TENANT_JOURNEY_STEPS,
  TENANT_WORKSPACE_PATH,
  isStaffOnlyTenantDeniedPath,
  tenantChangeHandoffCreatesTicket,
  tenantChangeHandoffHref,
} from '../lib/app/tenant-journey.js';
import {
  STAFF_ONLY_UNIMPLEMENTED_PATHS,
  TENANT_CLIENT_FORBIDDEN_CHROME_PHRASES,
  isOperatingWorkspaceStaffPath,
  isUnimplementedStaffOnlyPath,
  tenantChooserRedirectPath,
  tenantChromeHidesWorkspaceChooser,
  tenantClientSurfaceOmitsForbiddenChrome,
  tenantNavIsClientServiceOnly,
} from '../lib/app/tenant-workspace.js';
import { workspaceChromeForEnvironment } from '../lib/app/workspace-context.js';

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
    username: 'syn-1120-tenant',
    user_id: 'syn_user_1120_tenant',
    tenant_id: REFERENCE_TENANT_ID,
  });
}

describe('#1120 tenant chrome is client-appropriate', () => {
  it('hides Choose workspace and omits staff/proof/data-source copy from Tenant pages', () => {
    const chrome = workspaceChromeForEnvironment('tenant', { tenantLabel: 'CorpFlowAI' });
    assert.equal(tenantChromeHidesWorkspaceChooser(chrome), true);
    assert.equal(chrome.show_switch, false);
    assert.equal(tenantNavIsClientServiceOnly(), true);
    assert.deepEqual(
      TENANT_NAV_ITEMS.map((item) => item.id),
      ['requests_progress', 'service_change'],
    );

    const tenantSrc = readFileSync(path.join(REPO_ROOT, 'pages/app/tenant.js'), 'utf8');
    const menuSrc = readFileSync(path.join(REPO_ROOT, 'components/app/TenantMenu.js'), 'utf8');
    const progressSrc = readFileSync(
      path.join(REPO_ROOT, 'components/app/TenantRequestsProgress.js'),
      'utf8',
    );
    assert.equal(tenantClientSurfaceOmitsForbiddenChrome(tenantSrc), true);
    assert.equal(tenantClientSurfaceOmitsForbiddenChrome(menuSrc), true);
    for (const phrase of TENANT_CLIENT_FORBIDDEN_CHROME_PHRASES) {
      assert.equal(tenantSrc.toLowerCase().includes(phrase.toLowerCase()), false, phrase);
    }
    assert.doesNotMatch(tenantSrc, /proof-harness-hint/);
    assert.doesNotMatch(tenantSrc, /tenant-data-source/);
    assert.doesNotMatch(progressSrc, /Choose workspace/);
    assert.match(tenantSrc, /tenantChooserRedirectPath|\/app\/tenant/);
    assert.match(tenantSrc, /Open service/);
    assert.equal(tenantSrc.includes('/app/core'), true); // access-denied staff recovery only
    assert.equal(menuSrc.includes('/app/core'), false);
    assert.equal(menuSrc.includes('/app/commercial'), false);
    assert.equal(menuSrc.includes('/app/delivery'), false);
  });

  it('sends a live Tenant session from /app to /app/tenant', () => {
    assert.equal(tenantChooserRedirectPath(200), TENANT_WORKSPACE_PATH);
    assert.equal(tenantChooserRedirectPath(401), null);
    assert.equal(tenantChooserRedirectPath(403), null);
  });
});

describe('#1120 staff-only commercial / delivery / core remain fail-closed', () => {
  it('keeps /app/commercial and /app/delivery staff-only even after they are implemented', () => {
    assert.equal(STAFF_ONLY_UNIMPLEMENTED_PATHS.includes('/app/commercial'), false);
    assert.equal(STAFF_ONLY_UNIMPLEMENTED_PATHS.includes('/app/delivery'), false);
    for (const p of ['/app/core', '/app/commercial', '/app/delivery']) {
      assert.equal(isStaffOnlyTenantDeniedPath(p), true, p);
      assert.equal(isOperatingWorkspaceStaffPath(p), true, p);
    }
    assert.equal(isUnimplementedStaffOnlyPath('/app/commercial'), false);
    assert.equal(isUnimplementedStaffOnlyPath('/app/delivery'), false);
    assert.equal(isUnimplementedStaffOnlyPath('/app/tenant'), false);
    assert.equal(isStaffOnlyTenantDeniedPath('/app/tenant'), false);
    assert.equal(isStaffOnlyTenantDeniedPath('/change'), false);
  });
});

describe('#1120 one complete reference-tenant client journey', () => {
  it('signs in, reviews only exposed work, persists for Core, and hands off to Service & change', async () => {
    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
      const actor = tenantActor();
      assert.equal(actor.environment, 'tenant');
      assert.equal(actor.can_core, false);
      assert.equal(TENANT_JOURNEY_STEPS[0].id, 'sign_in');

      const shellRes = mockRes();
      await handleAppShell(
        {
          method: 'GET',
          url: `/api/app/shell?env=tenant&tenant_id=${REFERENCE_TENANT_ID}`,
          headers: {},
          __testAppActor: actor,
        },
        shellRes,
      );
      assert.equal(shellRes.state.statusCode, 200);
      assert.equal(shellRes.state.body.ok, true);
      assert.equal(shellRes.state.body.environment, 'tenant');
      assert.equal(shellRes.state.body.selected.tenant_id, REFERENCE_TENANT_ID);
      assert.equal(shellRes.state.body.workspace.show_switch, false);
      const menuIds = (shellRes.state.body.menus || []).map((m) => m.id);
      assert.deepEqual(menuIds, ['requests_progress', 'service_change']);
      assert.equal(
        String(shellRes.state.body.tenant_journey.change_handoff_href).startsWith(CHANGE_CANONICAL_PATH),
        true,
      );
      assert.equal(shellRes.state.body.tenant_journey.creates_ticket_on_navigation, false);

      const listRes = mockRes();
      await handleAppRequestsList(
        {
          method: 'GET',
          url: `/api/app/requests?env=tenant&tenant_id=${REFERENCE_TENANT_ID}`,
          headers: {},
          __testAppActor: actor,
        },
        listRes,
      );
      assert.equal(listRes.state.statusCode, 200);
      const ids = (listRes.state.body.requests || []).map((r) => r.request_id);
      assert.ok(ids.includes(CANONICAL_REQUEST_ID));
      assert.equal(ids.includes(OTHER_TENANT_REQUEST_ID), false);
      assert.equal(payloadContainsForbiddenTenantKeys(listRes.state.body.requests), false);

      const detailRes = mockRes();
      await handleAppRequestDetail(
        {
          method: 'GET',
          url: `/api/app/request?env=tenant&tenant_id=${REFERENCE_TENANT_ID}&id=${CANONICAL_REQUEST_ID}`,
          headers: {},
          __testAppActor: actor,
        },
        detailRes,
      );
      assert.equal(detailRes.state.statusCode, 200);
      const request = detailRes.state.body.request;
      assert.equal(payloadContainsForbiddenTenantKeys(request), false);
      for (const key of TENANT_FORBIDDEN_FIELD_KEYS) {
        assert.equal(JSON.stringify(request).includes(`"${key}"`), false, key);
      }
      const landing = request.components.find((c) => c.key === 'landing_copy');
      const wiring = request.components.find((c) => c.key === 'internal_wiring');
      assert.equal(landing.exposed_for_client_review, true);
      assert.equal(landing.review_enabled, true);
      assert.equal(wiring.exposed_for_client_review, false);
      assert.equal(wiring.view_only, true);
      assert.equal(wiring.github, undefined);
      assert.equal(wiring.internal_note, undefined);

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
      assert.equal(blocked.state.body.error, 'component_not_exposed');

      const review = mockRes();
      await handleAppComponentReview(
        {
          method: 'POST',
          url: '/api/app/component-review',
          headers: {},
          body: {
            request_id: CANONICAL_REQUEST_ID,
            component_key: 'landing_copy',
            decision: 'approve',
            comment: 'Please publish this copy.',
            env: 'tenant',
            tenant_id: REFERENCE_TENANT_ID,
          },
          __testAppActor: actor,
        },
        review,
      );
      assert.equal(review.state.statusCode, 200);
      const after = review.state.body.request.components.find((c) => c.key === 'landing_copy');
      assert.equal(after.latest_review.decision, 'approve');
      assert.equal(after.latest_review.comment, 'Please publish this copy.');

      const coreActor = buildProofCoreActor();
      const coreDetail = mockRes();
      await handleAppRequestDetail(
        {
          method: 'GET',
          url: `/api/app/request?env=core&id=${CANONICAL_REQUEST_ID}`,
          headers: {},
          __testAppActor: coreActor,
        },
        coreDetail,
      );
      assert.equal(coreDetail.state.statusCode, 200);
      const coreLanding = coreDetail.state.body.request.components.find((c) => c.key === 'landing_copy');
      assert.equal(coreLanding.latest_client_decision.decision, 'approve');
      assert.equal(coreLanding.latest_client_decision.comment, 'Please publish this copy.');
      assert.ok(coreLanding.github);
      assert.ok(coreLanding.internal_note);

      const today = mockRes();
      await handleAppToday(
        {
          method: 'GET',
          url: '/api/app/today?env=core',
          headers: {},
          __testAppActor: actor,
        },
        today,
      );
      assert.equal(today.state.statusCode, 403);

      const coreApi = mockRes();
      const handledCore = await tryHandleAppApi(
        {
          method: 'GET',
          url: `/api/app/request?env=core&id=${CANONICAL_REQUEST_ID}`,
          headers: {},
          __testAppActor: actor,
        },
        coreApi,
        'app/request',
      );
      assert.equal(handledCore, true);
      assert.ok(coreApi.state.statusCode === 403 || coreApi.state.body.ok !== true);

      const handoff = tenantChangeHandoffHref({ tenantId: REFERENCE_TENANT_ID });
      assert.equal(handoff.startsWith(`${CHANGE_CANONICAL_PATH}?`), true);
      assert.equal(handoff.includes('from=tenant-workspace'), true);
      assert.equal(tenantChangeHandoffCreatesTicket(), false);

      const verdict = {
        tenant_chrome_client_safe: tenantChromeHidesWorkspaceChooser(shellRes.state.body.workspace),
        tenant_session_lands_on_workspace: tenantChooserRedirectPath(200) === TENANT_WORKSPACE_PATH,
        exposed_reviewable: landing.review_enabled === true,
        internal_view_only: wiring.view_only === true,
        review_persists: after.latest_review.decision === 'approve',
        core_sees_decision: coreLanding.latest_client_decision.decision === 'approve',
        change_reachable: handoff.startsWith(CHANGE_CANONICAL_PATH),
        staff_core_denied: today.state.statusCode === 403,
        commercial_delivery_classified:
          isStaffOnlyTenantDeniedPath('/app/commercial') &&
          isStaffOnlyTenantDeniedPath('/app/delivery'),
        no_github_on_tenant: payloadContainsForbiddenTenantKeys(request) === false,
      };
      assert.deepEqual(
        Object.values(verdict).every(Boolean),
        true,
        JSON.stringify(verdict),
      );
      assert.equal(
        Object.values(verdict).every(Boolean)
          ? 'REFERENCE TENANT CLIENT JOURNEY READY FOR LIVE VERIFICATION'
          : 'NOT READY',
        'REFERENCE TENANT CLIENT JOURNEY READY FOR LIVE VERIFICATION',
      );
    } finally {
      process.env.NODE_ENV = prevNode;
    }
  });
});
