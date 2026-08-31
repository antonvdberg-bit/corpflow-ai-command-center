/**
 * #1201 — Client acceptance: Tenant delivery progress live current-main journey.
 *
 * One Lead Rescue fixture + one Website Rescue fixture on /app/tenant,
 * then canonical /change and return. Staff Commercial / Delivery / Prospect
 * stay inaccessible. Loading / empty / list-error must not imply completion.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { actorFromSessionPayload, buildProofCoreActor } from '../lib/app/access.js';
import {
  LEAD_RESCUE_TENANT_REQUEST_ID,
  OTHER_TENANT_ID,
  OTHER_TENANT_REQUEST_ID,
  REFERENCE_TENANT_ID,
  TENANT_FORBIDDEN_FIELD_KEYS,
  WEBSITE_RESCUE_TENANT_PROGRESS_FOIL_ID,
  WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID,
} from '../lib/app/constants.js';
import {
  handleAppCommercial,
  handleAppComponentReview,
  handleAppDelivery,
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
  TENANT_PROGRESS_LIST_ERROR_BODY,
  TENANT_PROGRESS_LIST_ERROR_TITLE,
  TENANT_PROGRESS_LOADING_TITLE,
  tenantPanelCopyImpliesFalseCompletion,
  tenantProgressPanelKind,
} from '../lib/app/tenant-workspace.js';
import { payloadContainsForbiddenWebsiteRescueTenantKeys } from '../lib/app/website-rescue-tenant-progress.js';
import {
  LEAD_RESCUE_PREVIEW_COMPONENT_KEY,
  LEAD_RESCUE_SERVICE_NAME,
  LEAD_RESCUE_VERIFICATION_COMPONENT_KEY,
  resetLeadRescueDeliveryStore,
} from '../lib/lead-rescue/tenant-delivery-progress.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

beforeEach(() => {
  resetRequestStore();
  resetProspectFixtureStore();
  resetLeadRescueDeliveryStore();
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
    username: 'syn-1201-tenant',
    user_id: 'syn_user_1201_tenant',
    tenant_id: tenantId,
  });
}

describe('#1201 loading / empty / list-error do not imply false completion', () => {
  it('keeps list-load failure distinct from empty, and copy does not claim completion', () => {
    assert.equal(
      tenantProgressPanelKind({ listReady: false, requestCount: 0, error: '', busy: true }),
      'loading',
    );
    assert.equal(
      tenantProgressPanelKind({
        listReady: true,
        requestCount: 0,
        error: 'requests_503',
        busy: false,
      }),
      'error',
    );
    assert.equal(
      tenantProgressPanelKind({ listReady: true, requestCount: 0, error: '', busy: false }),
      'empty',
    );
    assert.equal(
      tenantProgressPanelKind({
        listReady: true,
        requestCount: 2,
        error: 'request_500',
        busy: false,
      }),
      'ready',
    );

    assert.equal(tenantPanelCopyImpliesFalseCompletion(TENANT_PROGRESS_LOADING_TITLE), false);
    assert.equal(tenantPanelCopyImpliesFalseCompletion(TENANT_PROGRESS_LIST_ERROR_TITLE), false);
    assert.equal(tenantPanelCopyImpliesFalseCompletion(TENANT_PROGRESS_LIST_ERROR_BODY), false);
    assert.equal(
      tenantPanelCopyImpliesFalseCompletion(
        'No authorised requests for this tenant yet. When CorpFlowAI has work for you, client-safe progress will appear here.',
      ),
      false,
    );
    assert.equal(
      tenantPanelCopyImpliesFalseCompletion('Website Rescue delivery is complete.'),
      true,
    );

    const tenantSrc = readFileSync(path.join(REPO_ROOT, 'pages/app/tenant.js'), 'utf8');
    assert.match(tenantSrc, /tenantProgressPanelKind/);
    assert.match(tenantSrc, /app-tenant-list-error/);
    assert.match(tenantSrc, /TENANT_PROGRESS_LIST_ERROR_TITLE/);
    assert.match(tenantSrc, /TENANT_PROGRESS_LIST_ERROR_BODY/);
    assert.equal(tenantSrc.includes('empty={listReady && list.length === 0}'), false);
    assert.match(tenantSrc, /progressPanelKind === 'empty'/);
  });
});

describe('#1201 one Lead Rescue and one Website Rescue tenant journey', () => {
  it('shows coherent stage, next action, and exposed evidence then hands off to /change', async () => {
    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
      const actor = tenantActor();
      const routeSequence = [
        TENANT_WORKSPACE_PATH_FOR_TEST(),
        `/app/tenant?id=${LEAD_RESCUE_TENANT_REQUEST_ID}`,
        tenantChangeHandoffHref({ tenantId: REFERENCE_TENANT_ID }),
        tenantWorkspaceReturnHref({ tenantId: REFERENCE_TENANT_ID }),
        `/app/tenant?id=${WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID}`,
        tenantChangeHandoffHref({ tenantId: REFERENCE_TENANT_ID }),
        tenantWorkspaceReturnHref({ tenantId: REFERENCE_TENANT_ID }),
      ];

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
      assert.equal(shell.state.body.selected.tenant_id, REFERENCE_TENANT_ID);
      assert.equal(shell.state.body.workspace.show_switch, false);
      const menuIds = (shell.state.body.menus || []).map((m) => m.id);
      assert.deepEqual(menuIds, ['requests_progress', 'service_change']);

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
      assert.equal(list.state.statusCode, 200);
      const rows = list.state.body.requests || [];
      const ids = rows.map((r) => r.request_id);
      assert.ok(ids.includes(LEAD_RESCUE_TENANT_REQUEST_ID));
      assert.ok(ids.includes(WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID));
      assert.equal(ids.includes(OTHER_TENANT_REQUEST_ID), false);
      assert.equal(ids.includes(WEBSITE_RESCUE_TENANT_PROGRESS_FOIL_ID), false);
      assert.equal(payloadContainsForbiddenTenantKeys(rows), false);

      const lrRow = rows.find((r) => r.request_id === LEAD_RESCUE_TENANT_REQUEST_ID);
      assert.equal(lrRow.service_name, LEAD_RESCUE_SERVICE_NAME);
      assert.equal(lrRow.high_level_stage_label, 'Ready for your review');
      assert.match(String(lrRow.next_action), /Lead Rescue preview/i);

      const wrRow = rows.find((r) => r.request_id === WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID);
      assert.equal(wrRow.service_name, 'Website Rescue');
      assert.equal(wrRow.delivery_stage, 'Preview ready');
      assert.match(String(wrRow.next_action), /Review your Website Rescue preview/i);
      assert.ok(Number(wrRow.progress_percent) < 100);

      const lrDetail = mockRes();
      await handleAppRequestDetail(
        {
          method: 'GET',
          url: `/api/app/request?env=tenant&tenant_id=${REFERENCE_TENANT_ID}&id=${LEAD_RESCUE_TENANT_REQUEST_ID}`,
          headers: {},
          __testAppActor: actor,
        },
        lrDetail,
      );
      assert.equal(lrDetail.state.statusCode, 200);
      const lr = lrDetail.state.body.request;
      assert.equal(lr.service_name, LEAD_RESCUE_SERVICE_NAME);
      assert.equal(lr.high_level_stage_label, lrRow.high_level_stage_label);
      assert.equal(lr.next_action, lrRow.next_action);
      assert.equal(payloadContainsForbiddenTenantKeys(lr), false);
      for (const key of TENANT_FORBIDDEN_FIELD_KEYS) {
        assert.equal(JSON.stringify(lr).includes(`"${key}"`), false, key);
      }
      const lrPreview = lr.components.find((c) => c.key === LEAD_RESCUE_PREVIEW_COMPONENT_KEY);
      const lrCheck = lr.components.find((c) => c.key === LEAD_RESCUE_VERIFICATION_COMPONENT_KEY);
      assert.equal(lrPreview.exposed_for_client_review, true);
      assert.equal(lrPreview.review_enabled, true);
      assert.equal(lrCheck.exposed_for_client_review, false);
      assert.equal(lrCheck.view_only, true);

      const wrDetail = mockRes();
      await handleAppRequestDetail(
        {
          method: 'GET',
          url: `/api/app/request?env=tenant&tenant_id=${REFERENCE_TENANT_ID}&id=${WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID}`,
          headers: {},
          __testAppActor: actor,
        },
        wrDetail,
      );
      assert.equal(wrDetail.state.statusCode, 200);
      const wr = wrDetail.state.body.request;
      assert.equal(wr.service_name, 'Website Rescue');
      assert.equal(wr.delivery_stage, wrRow.delivery_stage);
      assert.equal(wr.next_action, wrRow.next_action);
      assert.equal(wr.preview_review_ready, true);
      assert.equal(payloadContainsForbiddenWebsiteRescueTenantKeys(wr), false);
      const wrPreview = wr.components.find((c) => c.key === 'website_rescue_preview');
      assert.equal(wrPreview.exposed_for_client_review, false);
      assert.equal(wrPreview.view_only, true);
      assert.ok(wrPreview.exposed_evidence.href);

      const wrReview = mockRes();
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
        wrReview,
      );
      assert.ok(wrReview.state.statusCode === 404 || wrReview.state.statusCode === 403);

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

      const staff = {};
      for (const [name, handler, url] of [
        ['commercial', handleAppCommercial, '/api/app/commercial?env=tenant'],
        ['delivery', handleAppDelivery, '/api/app/delivery?env=tenant'],
        ['prospects', handleAppProspects, '/api/app/prospects?env=tenant'],
      ]) {
        const res = mockRes();
        await handler({ method: 'GET', url, headers: {}, __testAppActor: actor }, res);
        staff[name] = res.state.statusCode;
        assert.equal(res.state.statusCode, 403, name);
        assert.equal(isStaffOnlyTenantDeniedPath(url.split('?')[0].replace('/api', '')), true);
      }

      const handoff = tenantChangeHandoffHref({ tenantId: REFERENCE_TENANT_ID });
      const ret = tenantWorkspaceReturnHref({ tenantId: REFERENCE_TENANT_ID });
      assert.equal(handoff.startsWith(`${CHANGE_CANONICAL_PATH}?`), true);
      assert.equal(handoff.includes('from=tenant-workspace'), true);
      assert.equal(handoff.includes(`tenant_id=${REFERENCE_TENANT_ID}`), true);
      assert.equal(ret.startsWith('/app/tenant?'), true);
      assert.equal(ret.includes('from=change'), true);
      assert.equal(ret.includes(`tenant_id=${REFERENCE_TENANT_ID}`), true);
      assert.equal(tenantChangeHandoffCreatesTicket(), false);

      const core = mockRes();
      await handleAppRequestDetail(
        {
          method: 'GET',
          url: `/api/app/request?env=core&id=${LEAD_RESCUE_TENANT_REQUEST_ID}`,
          headers: {},
          __testAppActor: buildProofCoreActor(),
        },
        core,
      );
      assert.equal(core.state.statusCode, 200);
      assert.ok(core.state.body.request.internal_refs || core.state.body.request.components);

      const verdictBits = {
        both_fixtures_listed: true,
        lr_coherent: lr.service_name === LEAD_RESCUE_SERVICE_NAME && lr.next_action === lrRow.next_action,
        wr_coherent: wr.service_name === 'Website Rescue' && wr.next_action === wrRow.next_action,
        lr_preview_exposed: lrPreview.exposed_for_client_review === true,
        wr_preview_link_only: wrPreview.exposed_for_client_review === false && Boolean(wrPreview.exposed_evidence.href),
        no_false_completion_on_in_progress: Number(wrRow.progress_percent) < 100,
        cross_tenant_closed: crossLr.state.statusCode === 404 && crossWr.state.statusCode === 404,
        staff_denied: Object.values(staff).every((code) => code === 403),
        change_canonical: handoff.startsWith(CHANGE_CANONICAL_PATH) && tenantChangeHandoffCreatesTicket() === false,
        return_keeps_tenant: ret.includes(`tenant_id=${REFERENCE_TENANT_ID}`),
        no_list_error_as_empty:
          tenantProgressPanelKind({
            listReady: true,
            requestCount: 0,
            error: 'requests_503',
          }) === 'error',
      };
      assert.equal(
        Object.values(verdictBits).every(Boolean),
        true,
        JSON.stringify({ verdictBits, routeSequence, staff }),
      );
      assert.equal(
        Object.values(verdictBits).every(Boolean)
          ? 'TENANT DELIVERY PROGRESS JOURNEY USABLE'
          : 'NOT READY',
        'TENANT DELIVERY PROGRESS JOURNEY USABLE',
      );
    } finally {
      process.env.NODE_ENV = prevNode;
    }
  });
});

function TENANT_WORKSPACE_PATH_FOR_TEST() {
  return '/app/tenant';
}
