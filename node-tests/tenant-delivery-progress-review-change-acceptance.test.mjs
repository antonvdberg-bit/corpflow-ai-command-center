/**
 * #1175 — Client acceptance of the merged Lead Rescue + Website Rescue
 * Tenant Workspace progress and review/change journey.
 *
 * Reuses #1165 / #1120 / #1073. No second portal. No schema. No live mutation.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { actorFromSessionPayload, buildProofCoreActor } from '../lib/app/access.js';
import {
  CANONICAL_REQUEST_ID,
  LEAD_RESCUE_TENANT_REQUEST_ID,
  OTHER_TENANT_ID,
  OTHER_TENANT_REQUEST_ID,
  REFERENCE_TENANT_ID,
  TENANT_FORBIDDEN_FIELD_KEYS,
  TENANT_NAV_ITEMS,
  WEBSITE_RESCUE_TENANT_PROGRESS_FOIL_ID,
  WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID,
} from '../lib/app/constants.js';
import {
  handleAppCommercial,
  handleAppComponentReview,
  handleAppDelivery,
  handleAppProspectDetail,
  handleAppProspects,
  handleAppRequestDetail,
  handleAppRequestsList,
  handleAppShell,
} from '../lib/app/handlers.js';
import { payloadContainsForbiddenTenantKeys } from '../lib/app/project.js';
import { resetProspectFixtureStore } from '../lib/app/prospect-operations-workspace.js';
import { resetRequestStore } from '../lib/app/request-store.js';
import {
  CHANGE_CANONICAL_PATH,
  isStaffOnlyTenantDeniedPath,
  tenantChangeHandoffCreatesTicket,
  tenantChangeHandoffHref,
  tenantWorkspaceReturnHref,
} from '../lib/app/tenant-journey.js';
import {
  TENANT_CLIENT_FORBIDDEN_CHROME_PHRASES,
  isOperatingWorkspaceStaffPath,
  tenantClientSurfaceOmitsForbiddenChrome,
} from '../lib/app/tenant-workspace.js';
import { payloadContainsForbiddenWebsiteRescueTenantKeys } from '../lib/app/website-rescue-tenant-progress.js';
import {
  LEAD_RESCUE_PREVIEW_COMPONENT_KEY,
  LEAD_RESCUE_SERVICE_NAME,
  LEAD_RESCUE_VERIFICATION_COMPONENT_KEY,
  leadRescueTenantProjectionLeaks,
  resetLeadRescueDeliveryStore,
} from '../lib/lead-rescue/tenant-delivery-progress.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let previousNodeEnv = '';

beforeEach(() => {
  previousNodeEnv = process.env.NODE_ENV || '';
  process.env.NODE_ENV = 'test';
  resetRequestStore();
  resetProspectFixtureStore();
});

afterEach(() => {
  resetLeadRescueDeliveryStore();
  resetRequestStore();
  resetProspectFixtureStore();
  process.env.NODE_ENV = previousNodeEnv;
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

function tenantActor(tenantId = REFERENCE_TENANT_ID) {
  return actorFromSessionPayload({
    typ: 'tenant',
    username: 'syn-1175-tenant',
    user_id: 'syn_user_1175_tenant',
    tenant_id: tenantId,
  });
}

describe('#1175 merged Tenant Workspace lists Lead Rescue and Website Rescue together', () => {
  it('shows both client-safe progress rows for the bound tenant and hides other tenants', async () => {
    const actor = tenantActor();
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
    const rows = listRes.state.body.requests || [];
    const ids = rows.map((r) => r.request_id);
    assert.ok(ids.includes(CANONICAL_REQUEST_ID));
    assert.ok(ids.includes(LEAD_RESCUE_TENANT_REQUEST_ID));
    assert.ok(ids.includes(WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID));
    assert.equal(ids.includes(OTHER_TENANT_REQUEST_ID), false);
    assert.equal(ids.includes(WEBSITE_RESCUE_TENANT_PROGRESS_FOIL_ID), false);
    assert.equal(payloadContainsForbiddenTenantKeys(rows), false);

    const lr = rows.find((r) => r.request_id === LEAD_RESCUE_TENANT_REQUEST_ID);
    assert.equal(lr.service_name, LEAD_RESCUE_SERVICE_NAME);
    assert.equal(lr.high_level_stage_label, 'Ready for your review');
    assert.match(String(lr.next_action), /review/i);

    const wr = rows.find((r) => r.request_id === WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID);
    assert.equal(wr.service_name, 'Website Rescue');
    assert.equal(wr.delivery_stage, 'Preview ready');
    assert.match(String(wr.next_action), /Review your Website Rescue preview/i);

    const blob = JSON.stringify(rows);
    for (const leak of [
      'operator_note',
      'financially_approved',
      'commercial_notes',
      'payment_evidence',
      'Prospect Operations',
      'internal_blocker',
    ]) {
      assert.equal(blob.includes(`"${leak}"`) || blob.includes(leak + '":'), false, leak);
    }
  });
});

describe('#1175 Lead Rescue review and Website Rescue exposed preview', () => {
  it('lets the client review only the deliberately exposed Lead Rescue preview', async () => {
    const actor = tenantActor();
    const detail = mockRes();
    await handleAppRequestDetail(
      {
        method: 'GET',
        url: `/api/app/request?env=tenant&tenant_id=${REFERENCE_TENANT_ID}&id=${LEAD_RESCUE_TENANT_REQUEST_ID}`,
        headers: {},
        __testAppActor: actor,
      },
      detail,
    );
    assert.equal(detail.state.statusCode, 200);
    const request = detail.state.body.request;
    assert.equal(request.service_name, LEAD_RESCUE_SERVICE_NAME);
    assert.equal(request.high_level_stage_label, 'Ready for your review');
    assert.equal(leadRescueTenantProjectionLeaks(request), false);
    const preview = request.components.find((c) => c.key === LEAD_RESCUE_PREVIEW_COMPONENT_KEY);
    const verification = request.components.find((c) => c.key === LEAD_RESCUE_VERIFICATION_COMPONENT_KEY);
    assert.equal(preview.exposed_for_client_review, true);
    assert.equal(preview.review_enabled, true);
    assert.equal(verification.exposed_for_client_review, false);
    assert.equal(verification.view_only, true);
    for (const key of TENANT_FORBIDDEN_FIELD_KEYS) {
      assert.equal(JSON.stringify(request).includes(`"${key}"`), false, key);
    }

    const blocked = mockRes();
    await handleAppComponentReview(
      {
        method: 'POST',
        url: '/api/app/component-review',
        headers: {},
        body: {
          request_id: LEAD_RESCUE_TENANT_REQUEST_ID,
          component_key: LEAD_RESCUE_VERIFICATION_COMPONENT_KEY,
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
          request_id: LEAD_RESCUE_TENANT_REQUEST_ID,
          component_key: LEAD_RESCUE_PREVIEW_COMPONENT_KEY,
          decision: 'approve',
          comment: 'Preview looks right.',
          env: 'tenant',
          tenant_id: REFERENCE_TENANT_ID,
        },
        __testAppActor: actor,
      },
      review,
    );
    assert.equal(review.state.statusCode, 200);

    const core = mockRes();
    await handleAppRequestDetail(
      {
        method: 'GET',
        url: `/api/app/request?proof=1&env=core&id=${LEAD_RESCUE_TENANT_REQUEST_ID}`,
        headers: {},
        __testAppActor: buildProofCoreActor(),
      },
      core,
    );
    const corePreview = core.state.body.request.components.find(
      (c) => c.key === LEAD_RESCUE_PREVIEW_COMPONENT_KEY,
    );
    assert.equal(corePreview.latest_client_decision.decision, 'approve');
  });

  it('shows Website Rescue exposed preview as view-only and refuses ticket review of that record', async () => {
    const actor = tenantActor();
    const detail = mockRes();
    await handleAppRequestDetail(
      {
        method: 'GET',
        url: `/api/app/request?env=tenant&tenant_id=${REFERENCE_TENANT_ID}&id=${WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID}`,
        headers: {},
        __testAppActor: actor,
      },
      detail,
    );
    assert.equal(detail.state.statusCode, 200);
    const request = detail.state.body.request;
    assert.equal(request.service_name, 'Website Rescue');
    assert.equal(request.delivery_stage, 'Preview ready');
    assert.equal(request.preview_review_ready, true);
    const preview = request.components.find((c) => c.key === 'website_rescue_preview');
    assert.equal(preview.exposed_for_client_review, false);
    assert.equal(preview.review_enabled, false);
    assert.equal(preview.view_only, true);
    assert.ok(preview.exposed_evidence.href);
    assert.equal(payloadContainsForbiddenWebsiteRescueTenantKeys(request), false);

    const review = mockRes();
    await handleAppComponentReview(
      {
        method: 'POST',
        url: '/api/app/component-review',
        headers: {},
        body: {
          request_id: WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID,
          component_key: 'website_rescue_preview',
          decision: 'approve',
          env: 'tenant',
          tenant_id: REFERENCE_TENANT_ID,
        },
        __testAppActor: actor,
      },
      review,
    );
    assert.ok(review.state.statusCode === 404 || review.state.statusCode === 403);
  });
});

describe('#1175 /change handoff and staff fail-closed', () => {
  it('hands off to canonical /change without creating a ticket and returns to Tenant Workspace', async () => {
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
    assert.deepEqual(
      (shell.state.body.menus || []).map((m) => m.id),
      ['requests_progress', 'service_change'],
    );
    assert.equal(shell.state.body.workspace.show_switch, false);
    const href = tenantChangeHandoffHref({ tenantId: REFERENCE_TENANT_ID });
    assert.equal(href.startsWith(CHANGE_CANONICAL_PATH), true);
    assert.match(href, /from=tenant-workspace/);
    assert.equal(tenantChangeHandoffCreatesTicket(), false);
    assert.equal(
      tenantWorkspaceReturnHref({ tenantId: REFERENCE_TENANT_ID }),
      `/app/tenant?from=change&tenant_id=${REFERENCE_TENANT_ID}`,
    );
    assert.equal(shell.state.body.tenant_journey.creates_ticket_on_navigation, false);
  });

  it('keeps Prospect, Commercial, and Delivery fail-closed to a Tenant session', async () => {
    const actor = tenantActor();
    for (const p of ['/app/prospects', '/app/commercial', '/app/delivery']) {
      assert.equal(isStaffOnlyTenantDeniedPath(p), true, p);
      assert.equal(isOperatingWorkspaceStaffPath(p), true, p);
    }
    assert.deepEqual(
      TENANT_NAV_ITEMS.map((item) => item.id),
      ['requests_progress', 'service_change'],
    );

    for (const [pathSeg, handler] of [
      ['/api/app/prospects', handleAppProspects],
      ['/api/app/commercial', handleAppCommercial],
      ['/api/app/delivery', handleAppDelivery],
    ]) {
      const res = mockRes();
      await handler(
        {
          method: 'GET',
          url: `${pathSeg}?env=tenant&tenant_id=${REFERENCE_TENANT_ID}`,
          headers: {},
          __testAppActor: actor,
        },
        res,
      );
      assert.equal(res.state.statusCode, 403, pathSeg);
    }

    const prospect = mockRes();
    await handleAppProspectDetail(
      {
        method: 'GET',
        url: `/api/app/prospect?env=tenant&id=${WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID}`,
        headers: {},
        __testAppActor: actor,
      },
      prospect,
    );
    assert.equal(prospect.state.statusCode, 403);

    const other = tenantActor(OTHER_TENANT_ID);
    const crossLr = mockRes();
    await handleAppRequestDetail(
      {
        method: 'GET',
        url: `/api/app/request?env=tenant&tenant_id=${OTHER_TENANT_ID}&id=${LEAD_RESCUE_TENANT_REQUEST_ID}`,
        headers: {},
        __testAppActor: other,
      },
      crossLr,
    );
    assert.equal(crossLr.state.statusCode, 404);
    const crossWr = mockRes();
    await handleAppRequestDetail(
      {
        method: 'GET',
        url: `/api/app/request?env=tenant&tenant_id=${OTHER_TENANT_ID}&id=${WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID}`,
        headers: {},
        __testAppActor: other,
      },
      crossWr,
    );
    assert.equal(crossWr.state.statusCode, 404);
  });
});

describe('#1175 Tenant Workspace still uses Requests & Progress (no second portal)', () => {
  it('renders review only when exposed and omits staff/commercial chrome', () => {
    const tenantSrc = readFileSync(path.join(REPO_ROOT, 'pages/app/tenant.js'), 'utf8');
    const progressSrc = readFileSync(
      path.join(REPO_ROOT, 'components/app/TenantRequestsProgress.js'),
      'utf8',
    );
    const menuSrc = readFileSync(path.join(REPO_ROOT, 'components/app/TenantMenu.js'), 'utf8');
    assert.equal(tenantClientSurfaceOmitsForbiddenChrome(tenantSrc), true);
    assert.equal(tenantClientSurfaceOmitsForbiddenChrome(progressSrc), true);
    for (const phrase of TENANT_CLIENT_FORBIDDEN_CHROME_PHRASES) {
      assert.equal(tenantSrc.toLowerCase().includes(phrase.toLowerCase()), false, phrase);
    }
    assert.match(progressSrc, /exposed_for_client_review === true/);
    assert.match(progressSrc, /tenant-high-level-stage/);
    assert.match(progressSrc, /tenant-delivery-stage/);
    assert.match(progressSrc, /Open exposed preview/);
    assert.equal(tenantSrc.includes('/app/lead-rescue'), false);
    assert.equal(tenantSrc.includes('/app/website-rescue'), false);
    assert.equal(menuSrc.includes('/app/commercial'), false);
    assert.equal(menuSrc.includes('/app/delivery'), false);
    assert.equal(menuSrc.includes('/app/prospects'), false);
    assert.equal(progressSrc.includes('Prospect Operations'), false);
  });
});
