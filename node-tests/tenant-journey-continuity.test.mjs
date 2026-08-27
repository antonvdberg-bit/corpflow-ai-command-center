/**
 * #1073 — Tenant request / review / /change continuity.
 * One synthetic tenant journey on existing #884 / Tenant Workspace / /change contracts.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { actorFromSessionPayload, buildProofTenantActor } from '../lib/app/access.js';
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
  TENANT_CHANGE_FROM,
  TENANT_JOURNEY_STEPS,
  TENANT_ROUTE_NAV_MATRIX,
  TENANT_WORKSPACE_PATH,
  changeRemainsCanonicalServiceSurface,
  isStaffOnlyTenantDeniedPath,
  isTenantWorkspaceChangeEntry,
  tenantChangeContinuityBanner,
  tenantChangeHandoffCreatesTicket,
  tenantChangeHandoffHref,
  tenantJourneyShellFragment,
  tenantNavIsJourneyOnly,
  tenantNavOmitsRetiredPlaceholders,
  tenantWorkspaceReturnHref,
} from '../lib/app/tenant-journey.js';
import { tenantNavOmitsProspectOperations } from '../lib/app/workspace-context.js';

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
    username: 'syn-1073-tenant',
    user_id: 'syn_user_1073_tenant',
    tenant_id: REFERENCE_TENANT_ID,
  });
}

describe('#1073 tenant route / navigation matrix', () => {
  it('keeps Requests & Progress and canonical /change; retires placeholder nav', () => {
    assert.equal(tenantNavIsJourneyOnly(), true);
    assert.equal(tenantNavOmitsRetiredPlaceholders(), true);
    assert.equal(tenantNavOmitsProspectOperations(), true);
    assert.equal(changeRemainsCanonicalServiceSurface(), true);
    assert.equal(tenantChangeHandoffCreatesTicket(), false);

    const retained = TENANT_ROUTE_NAV_MATRIX.filter((row) =>
      ['CANONICAL', 'RETAINED'].includes(row.disposition),
    );
    assert.ok(retained.some((row) => row.path === TENANT_WORKSPACE_PATH));
    assert.ok(retained.some((row) => row.path.startsWith(CHANGE_CANONICAL_PATH)));

    const retiredIds = TENANT_ROUTE_NAV_MATRIX.filter((row) => row.disposition === 'RETIRED').map(
      (row) => row.id,
    );
    assert.deepEqual(retiredIds.sort(), ['documents', 'home', 'my_work', 'reports', 'support']);

    const navIds = TENANT_NAV_ITEMS.map((item) => item.id);
    assert.deepEqual(navIds, ['requests_progress', 'service_change']);
    assert.equal(TENANT_NAV_ITEMS.find((item) => item.id === 'service_change')?.href, tenantChangeHandoffHref());
  });

  it('handoff and return hrefs preserve tenant context without minting a ticket', () => {
    const handoff = tenantChangeHandoffHref({ tenantId: REFERENCE_TENANT_ID });
    assert.equal(handoff.startsWith('/change?'), true);
    assert.equal(handoff.includes(`from=${TENANT_CHANGE_FROM}`), true);
    assert.equal(handoff.includes('/app/core'), false);
    assert.equal(tenantChangeHandoffCreatesTicket(), false);

    const ret = tenantWorkspaceReturnHref({ tenantId: REFERENCE_TENANT_ID });
    assert.equal(ret.startsWith(TENANT_WORKSPACE_PATH), true);
    assert.equal(ret.includes('from=change'), true);

    assert.equal(isTenantWorkspaceChangeEntry({ from: TENANT_CHANGE_FROM }), true);
    assert.equal(isTenantWorkspaceChangeEntry({ from: 'core' }), false);

    const banner = tenantChangeContinuityBanner(
      { from: TENANT_CHANGE_FROM, tenant_id: REFERENCE_TENANT_ID },
      { tenantLabel: 'CorpFlowAI' },
    );
    assert.ok(banner);
    assert.equal(banner.hide_core_app_link, true);
    assert.equal(banner.creates_ticket, false);
    assert.equal(banner.canonical_path, CHANGE_CANONICAL_PATH);
    assert.equal(banner.return_href, ret);
    assert.equal(tenantChangeContinuityBanner({}), null);
  });

  it('classifies Operating Workspace routes as staff-only fail-closed', () => {
    for (const path of [
      '/app/core',
      '/app/today',
      '/app/prospects',
      '/app/workbench',
      '/app/pipeline',
      '/app/queue',
      '/app/clients',
      '/app/commercial',
      '/admin/lead-rescue',
    ]) {
      assert.equal(isStaffOnlyTenantDeniedPath(path), true, path);
    }
    assert.equal(isStaffOnlyTenantDeniedPath('/app/tenant'), false);
    assert.equal(isStaffOnlyTenantDeniedPath('/change'), false);
  });

  it('gates Core/admin chrome on /change tenant-workspace entry in source', async () => {
    const fs = await import('node:fs/promises');
    const changeSrc = await fs.readFile(new URL('../pages/change.js', import.meta.url), 'utf8');
    assert.ok(changeSrc.includes('tenantChangeContinuityBanner'));
    assert.ok(changeSrc.includes('tenant-change-continuity'));
    assert.ok(changeSrc.includes('hide_core_app_link') || changeSrc.includes('tenantContinuity ?'));
    const tenantSrc = await fs.readFile(new URL('../pages/app/tenant.js', import.meta.url), 'utf8');
    assert.ok(tenantSrc.includes('tenant-open-change'));
    assert.equal(tenantSrc.includes('tenant-placeholder-'), false);
    const menuSrc = await fs.readFile(new URL('../components/app/TenantMenu.js', import.meta.url), 'utf8');
    assert.ok(menuSrc.includes('service_change'));
    assert.equal(menuSrc.includes('Home / Overview'), false);
  });
});

describe('#1073 one complete synthetic tenant journey', () => {
  it('signs in, sees tenant-safe work, reviews only exposed content, persists, hands off to /change, and returns', async () => {
    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
      const actor = tenantActor();
      assert.ok(actor);
      assert.equal(actor.environment, 'tenant');
      assert.equal(actor.can_core, false);
      assert.deepEqual(actor.can_tenant_ids, [REFERENCE_TENANT_ID]);
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
      assert.equal(shellRes.state.body.selected.workspace_id, 'tenant');
      assert.equal(shellRes.state.body.tenant_journey.change_canonical_path, CHANGE_CANONICAL_PATH);
      assert.equal(shellRes.state.body.tenant_journey.creates_ticket_on_navigation, false);
      const menuIds = shellRes.state.body.menus.map((m) => m.id);
      assert.deepEqual(menuIds, ['requests_progress', 'service_change']);
      assert.equal(menuIds.includes('home'), false);
      const menuHrefs = shellRes.state.body.menus.map((m) => String(m.href || ''));
      assert.equal(menuHrefs.some((href) => href.startsWith('/app/core')), false);
      assert.equal(String(shellRes.state.body.tenant_journey.change_handoff_href).startsWith('/change'), true);
      assert.equal(
        decodeURIComponent(String(shellRes.state.body.login_hints?.tenant || '')).includes('/app/tenant'),
        true,
      );

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
      const ids = listRes.state.body.requests.map((r) => r.request_id);
      assert.ok(ids.includes(CANONICAL_REQUEST_ID));
      assert.equal(ids.includes(OTHER_TENANT_REQUEST_ID), false);
      assert.equal(payloadContainsForbiddenTenantKeys(listRes.state.body.requests), false);
      for (const key of TENANT_FORBIDDEN_FIELD_KEYS) {
        assert.equal(JSON.stringify(listRes.state.body.requests).includes(`"${key}"`), false, key);
      }

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
      assert.equal(request.tenant_id, REFERENCE_TENANT_ID);
      assert.equal(payloadContainsForbiddenTenantKeys(request), false);
      const landing = request.components.find((c) => c.key === 'landing_copy');
      const wiring = request.components.find((c) => c.key === 'internal_wiring');
      assert.equal(landing.exposed_for_client_review, true);
      assert.equal(landing.review_enabled, true);
      assert.equal(wiring.exposed_for_client_review, false);
      assert.equal(wiring.view_only, true);
      assert.equal(wiring.internal_note, undefined);
      assert.equal(wiring.github, undefined);

      const blocked = mockRes();
      await handleAppComponentReview(
        {
          method: 'POST',
          url: '/api/app/component-review',
          headers: {},
          body: {
            request_id: CANONICAL_REQUEST_ID,
            component_key: 'internal_wiring',
            decision: 'amend',
            comment: 'should not land on an internal component',
            env: 'tenant',
            tenant_id: REFERENCE_TENANT_ID,
          },
          __testAppActor: actor,
        },
        blocked,
      );
      assert.equal(blocked.state.statusCode, 403);

      const review = mockRes();
      await handleAppComponentReview(
        {
          method: 'POST',
          url: '/api/app/component-review',
          headers: {},
          body: {
            request_id: CANONICAL_REQUEST_ID,
            component_key: 'landing_copy',
            decision: 'amend',
            comment: 'Please tighten the headline.',
            env: 'tenant',
            tenant_id: REFERENCE_TENANT_ID,
          },
          __testAppActor: actor,
        },
        review,
      );
      assert.equal(review.state.statusCode, 200);
      assert.equal(review.state.body.ok, true);
      const after = review.state.body.request.components.find((c) => c.key === 'landing_copy');
      assert.equal(after.latest_review.decision, 'amend');
      assert.equal(after.latest_review.comment, 'Please tighten the headline.');
      assert.equal(review.state.body.request.workflow_state, 'changes_requested');

      const fragment = tenantJourneyShellFragment({ tenantId: REFERENCE_TENANT_ID });
      assert.equal(fragment.tenant_journey.change_handoff_href.includes('/app/core'), false);
      assert.equal(fragment.tenant_journey.creates_ticket_on_navigation, false);
      assert.equal(fragment.tenant_journey.return_href.startsWith(TENANT_WORKSPACE_PATH), true);

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

      const cross = mockRes();
      await handleAppRequestDetail(
        {
          method: 'GET',
          url: `/api/app/request?env=tenant&tenant_id=${REFERENCE_TENANT_ID}&id=${OTHER_TENANT_REQUEST_ID}`,
          headers: {},
          __testAppActor: actor,
        },
        cross,
      );
      assert.ok(cross.state.statusCode === 404 || cross.state.body.ok !== true);

      const otherTenant = actorFromSessionPayload({
        typ: 'tenant',
        username: 'syn-1073-other',
        tenant_id: 'cursor-test',
      });
      const otherList = mockRes();
      await handleAppRequestsList(
        {
          method: 'GET',
          url: '/api/app/requests?env=tenant&tenant_id=cursor-test',
          headers: {},
          __testAppActor: otherTenant,
        },
        otherList,
      );
      const otherIds = (otherList.state.body.requests || []).map((r) => r.request_id);
      assert.equal(otherIds.includes(CANONICAL_REQUEST_ID), false);

      const verdict = {
        signed_in_tenant_context: shellRes.state.body.selected.tenant_id === REFERENCE_TENANT_ID,
        tenant_safe_requests: !ids.includes(OTHER_TENANT_REQUEST_ID),
        review_only_when_exposed: landing.exposed_for_client_review === true && wiring.view_only === true,
        review_persists: after.latest_review.decision === 'amend',
        change_handoff_not_core: fragment.tenant_journey.change_handoff_href.startsWith('/change'),
        return_identity_unambiguous: fragment.tenant_journey.return_href.startsWith(TENANT_WORKSPACE_PATH),
        staff_and_cross_tenant_denied: today.state.statusCode === 403,
        navigation_does_not_create_ticket: tenantChangeHandoffCreatesTicket() === false,
      };
      assert.deepEqual(
        Object.values(verdict).every(Boolean),
        true,
        JSON.stringify(verdict),
      );
      assert.equal(
        Object.values(verdict).every(Boolean) ? 'TENANT JOURNEY COHERENT' : 'NOT READY',
        'TENANT JOURNEY COHERENT',
      );
    } finally {
      process.env.NODE_ENV = prevNode;
    }
  });

  it('proof tenant actor cannot call Operating Workspace APIs', async () => {
    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
      const res = mockRes();
      const handled = await tryHandleAppApi(
        {
          method: 'GET',
          url: '/api/app/queue?env=core',
          headers: {},
          __testAppActor: buildProofTenantActor(),
        },
        res,
        'app/queue',
      );
      assert.equal(handled, true);
      assert.equal(res.state.statusCode, 403);
    } finally {
      process.env.NODE_ENV = prevNode;
    }
  });
});
