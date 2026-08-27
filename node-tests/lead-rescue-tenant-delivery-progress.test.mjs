/**
 * #1155 — Lead Rescue delivery/onboarding progress in Tenant Workspace.
 *
 * One synthetic tenant journey over the existing #715 record + Requests & Progress.
 * No second status model. No schema. No staff Prospect/Commercial/Delivery leak.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { actorFromSessionPayload, buildProofCoreActor } from '../lib/app/access.js';
import {
  LEAD_RESCUE_TENANT_REQUEST_ID,
  OTHER_TENANT_ID,
  OTHER_TENANT_REQUEST_ID,
  REFERENCE_TENANT_ID,
  TENANT_FORBIDDEN_FIELD_KEYS,
} from '../lib/app/constants.js';
import {
  handleAppCommercial,
  handleAppComponentReview,
  handleAppDelivery,
  handleAppProspects,
  handleAppRequestDetail,
  handleAppRequestsList,
} from '../lib/app/handlers.js';
import { payloadContainsForbiddenTenantKeys } from '../lib/app/project.js';
import { resetRequestStore } from '../lib/app/request-store.js';
import {
  isStaffOnlyTenantDeniedPath,
  tenantChangeHandoffCreatesTicket,
  tenantChangeHandoffHref,
} from '../lib/app/tenant-journey.js';
import { isOperatingWorkspaceStaffPath } from '../lib/app/tenant-workspace.js';
import {
  LEAD_RESCUE_CLIENT_REVIEW_RECORD_ID,
  LEAD_RESCUE_PREVIEW_COMPONENT_KEY,
  LEAD_RESCUE_SERVICE_NAME,
  LEAD_RESCUE_VERIFICATION_COMPONENT_KEY,
  bindLeadRescueDeliveryIdentity,
  getLeadRescueDeliveryRecord,
  hydrateLeadRescueTenantRequest,
  leadRescueClientNextAction,
  leadRescueClientStageLabel,
  leadRescueTenantProjectionLeaks,
  projectLeadRescueDeliveryToClientView,
  resetLeadRescueDeliveryStore,
  upsertLeadRescueDeliveryRecord,
} from '../lib/lead-rescue/tenant-delivery-progress.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let previousNodeEnv = '';

beforeEach(() => {
  previousNodeEnv = process.env.NODE_ENV || '';
  process.env.NODE_ENV = 'test';
  resetRequestStore();
});

afterEach(() => {
  resetLeadRescueDeliveryStore();
  resetRequestStore();
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
    username: 'syn-1155-tenant',
    user_id: 'syn_user_1155_tenant',
    tenant_id: tenantId,
  });
}

describe('#1155 identity bind is explicit tenant_id only', () => {
  it('refuses to invent a join without tenant_id or delivery record id', () => {
    assert.deepEqual(bindLeadRescueDeliveryIdentity({ record_id: LEAD_RESCUE_CLIENT_REVIEW_RECORD_ID }), {
      ok: false,
      error: 'missing_tenant_id',
    });
    assert.deepEqual(bindLeadRescueDeliveryIdentity({ tenant_id: REFERENCE_TENANT_ID }), {
      ok: false,
      error: 'missing_delivery_record_id',
    });
    assert.deepEqual(
      bindLeadRescueDeliveryIdentity({
        tenant_id: REFERENCE_TENANT_ID,
        record_id: LEAD_RESCUE_CLIENT_REVIEW_RECORD_ID,
      }),
      {
        ok: true,
        tenant_id: REFERENCE_TENANT_ID,
        record_id: LEAD_RESCUE_CLIENT_REVIEW_RECORD_ID,
      },
    );
  });

  it('does not bind by business display name or email', () => {
    const record = getLeadRescueDeliveryRecord(LEAD_RESCUE_CLIENT_REVIEW_RECORD_ID);
    assert.ok(record);
    assert.equal(record.tenant_id, undefined);
    const guessed = bindLeadRescueDeliveryIdentity({
      tenant_id: record.intake?.business_display_name,
      record_id: record.intake?.working_email,
    });
    assert.equal(guessed.ok, true);
    assert.notEqual(guessed.tenant_id, REFERENCE_TENANT_ID);
    assert.notEqual(guessed.record_id, LEAD_RESCUE_CLIENT_REVIEW_RECORD_ID);
  });
});

describe('#1155 #715 record stays authoritative', () => {
  it('projects tenant-safe stage and next action from the existing delivery record', () => {
    const record = getLeadRescueDeliveryRecord(LEAD_RESCUE_CLIENT_REVIEW_RECORD_ID);
    assert.equal(record.delivery_state, 'client_review');
    assert.equal(leadRescueClientStageLabel(record.delivery_state), 'Ready for your review');
    assert.equal(leadRescueClientNextAction(record), 'Review the Lead Rescue preview.');
    const view = projectLeadRescueDeliveryToClientView(record);
    assert.equal(view.service_name, LEAD_RESCUE_SERVICE_NAME);
    assert.equal(view.high_level_stage, 'client_review');
    assert.equal(view.high_level_stage_label, 'Ready for your review');
    assert.equal(view.client_safe_blocker, 'Waiting for your review of the Lead Rescue preview.');
    assert.equal(leadRescueTenantProjectionLeaks(view), false);
    const preview = view.components.find((c) => c.key === LEAD_RESCUE_PREVIEW_COMPONENT_KEY);
    const verification = view.components.find((c) => c.key === LEAD_RESCUE_VERIFICATION_COMPONENT_KEY);
    assert.equal(preview.exposed_for_client_review, true);
    assert.equal(verification.exposed_for_client_review, false);
  });

  it('strips operator notes, commercial/payment, response rules, and messaging flags', () => {
    const record = getLeadRescueDeliveryRecord(LEAD_RESCUE_CLIENT_REVIEW_RECORD_ID);
    assert.equal(record.financially_approved, true);
    assert.ok(record.intake.approved_response_rules);
    assert.ok(record.evidence.preview.operator_note);
    const view = projectLeadRescueDeliveryToClientView(record);
    const blob = JSON.stringify(view);
    assert.equal(blob.includes('operator_note'), false);
    assert.equal(blob.includes('financially_approved'), false);
    assert.equal(blob.includes('approved_response_rules'), false);
    assert.equal(blob.includes('messaging_runtime_authorized'), false);
    assert.equal(blob.includes('lead_stages'), false);
    assert.equal(blob.includes('+230-555-0100'), false);
    assert.equal(leadRescueTenantProjectionLeaks(view), false);
  });

  it('changing delivery_state on the #715 record changes the tenant view (no duplicate status)', () => {
    const record = getLeadRescueDeliveryRecord(LEAD_RESCUE_CLIENT_REVIEW_RECORD_ID);
    record.delivery_state = 'onboarding_blocked';
    record.blocked_inputs = ['primary_leaky_source_access_pending'];
    upsertLeadRescueDeliveryRecord(record);
    const hydrated = hydrateLeadRescueTenantRequest({
      id: LEAD_RESCUE_TENANT_REQUEST_ID,
      tenant_id: REFERENCE_TENANT_ID,
      title: 'Lead Rescue setup',
      outcome: '',
      status: 'Approved',
      stage: 'Build',
      owner: null,
      waiting_party: 'client',
      updated_at: null,
      client_safe_blocker: null,
      internal_blocker: null,
      attention_required: false,
      source: 'fixture',
      console_json: {
        lead_rescue_delivery: {
          record_id: LEAD_RESCUE_CLIENT_REVIEW_RECORD_ID,
          tenant_id: REFERENCE_TENANT_ID,
        },
        client_view: { components: [] },
      },
    });
    assert.equal(hydrated.console_json.client_view.high_level_stage, 'onboarding_blocked');
    assert.equal(hydrated.console_json.client_view.high_level_stage_label, 'Waiting on you');
    assert.equal(
      hydrated.client_safe_blocker,
      'Waiting for access to your main enquiry source.',
    );
    assert.equal(hydrated.console_json.client_view.high_level_stage, record.delivery_state);
  });
});

describe('#1155 Tenant Workspace journey', () => {
  it('shows Lead Rescue stage and next action on Requests & Progress for the bound tenant', async () => {
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
    const ids = (listRes.state.body.requests || []).map((r) => r.request_id);
    assert.ok(ids.includes(LEAD_RESCUE_TENANT_REQUEST_ID));
    assert.equal(ids.includes(OTHER_TENANT_REQUEST_ID), false);
    const summary = listRes.state.body.requests.find((r) => r.request_id === LEAD_RESCUE_TENANT_REQUEST_ID);
    assert.equal(summary.service_name, LEAD_RESCUE_SERVICE_NAME);
    assert.equal(summary.high_level_stage, 'client_review');
    assert.equal(summary.high_level_stage_label, 'Ready for your review');
    assert.equal(payloadContainsForbiddenTenantKeys(listRes.state.body.requests), false);

    const detailRes = mockRes();
    await handleAppRequestDetail(
      {
        method: 'GET',
        url: `/api/app/request?env=tenant&tenant_id=${REFERENCE_TENANT_ID}&id=${LEAD_RESCUE_TENANT_REQUEST_ID}`,
        headers: {},
        __testAppActor: actor,
      },
      detailRes,
    );
    assert.equal(detailRes.state.statusCode, 200);
    const request = detailRes.state.body.request;
    assert.equal(request.service_name, LEAD_RESCUE_SERVICE_NAME);
    assert.equal(request.high_level_stage_label, 'Ready for your review');
    assert.equal(request.next_action, 'Review “Lead Rescue preview”');
    assert.equal(request.client_safe_blocker, 'Waiting for your review of the Lead Rescue preview.');
    const preview = request.components.find((c) => c.key === LEAD_RESCUE_PREVIEW_COMPONENT_KEY);
    const verification = request.components.find((c) => c.key === LEAD_RESCUE_VERIFICATION_COMPONENT_KEY);
    assert.equal(preview.exposed_for_client_review, true);
    assert.equal(preview.review_enabled, true);
    assert.equal(verification.exposed_for_client_review, false);
    assert.equal(verification.view_only, true);
    assert.equal(verification.github, undefined);
    assert.equal(verification.internal_note, undefined);
    for (const key of TENANT_FORBIDDEN_FIELD_KEYS) {
      assert.equal(JSON.stringify(request).includes(`"${key}"`), false, key);
    }
    assert.equal(leadRescueTenantProjectionLeaks(request), false);
  });

  it('persists #884 review on the exposed preview only; internal setup check stays view-only', async () => {
    const actor = tenantActor();
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
    assert.equal(review.state.body.ok, true);

    const tenantAfter = mockRes();
    await handleAppRequestDetail(
      {
        method: 'GET',
        url: `/api/app/request?env=tenant&tenant_id=${REFERENCE_TENANT_ID}&id=${LEAD_RESCUE_TENANT_REQUEST_ID}`,
        headers: {},
        __testAppActor: actor,
      },
      tenantAfter,
    );
    const preview = tenantAfter.state.body.request.components.find(
      (c) => c.key === LEAD_RESCUE_PREVIEW_COMPONENT_KEY,
    );
    assert.equal(preview.latest_review.decision, 'approve');
    assert.equal(preview.milestone, 'approved');
    assert.equal(tenantAfter.state.body.request.high_level_stage, 'client_review');

    const coreActor = buildProofCoreActor();
    const coreRes = mockRes();
    await handleAppRequestDetail(
      {
        method: 'GET',
        url: `/api/app/request?proof=1&env=core&id=${LEAD_RESCUE_TENANT_REQUEST_ID}`,
        headers: {},
        __testAppActor: coreActor,
      },
      coreRes,
    );
    const corePreview = coreRes.state.body.request.components.find(
      (c) => c.key === LEAD_RESCUE_PREVIEW_COMPONENT_KEY,
    );
    assert.equal(corePreview.latest_client_decision.decision, 'approve');
  });

  it('hands off to canonical /change without creating a ticket', () => {
    const href = tenantChangeHandoffHref({ tenantId: REFERENCE_TENANT_ID });
    assert.equal(href.startsWith('/change'), true);
    assert.equal(tenantChangeHandoffCreatesTicket(), false);
  });
});

describe('#1155 tenant isolation and staff desks stay fail-closed', () => {
  it('cross-tenant access to the Lead Rescue request fails closed', async () => {
    const other = tenantActor(OTHER_TENANT_ID);
    const listRes = mockRes();
    await handleAppRequestsList(
      {
        method: 'GET',
        url: `/api/app/requests?env=tenant&tenant_id=${OTHER_TENANT_ID}`,
        headers: {},
        __testAppActor: other,
      },
      listRes,
    );
    const ids = (listRes.state.body.requests || []).map((r) => r.request_id);
    assert.equal(ids.includes(LEAD_RESCUE_TENANT_REQUEST_ID), false);

    const detail = mockRes();
    await handleAppRequestDetail(
      {
        method: 'GET',
        url: `/api/app/request?env=tenant&tenant_id=${OTHER_TENANT_ID}&id=${LEAD_RESCUE_TENANT_REQUEST_ID}`,
        headers: {},
        __testAppActor: other,
      },
      detail,
    );
    assert.equal(detail.state.statusCode, 404);
  });

  it('Tenant cannot open staff Prospect / Commercial / Delivery oversight', async () => {
    const actor = tenantActor();
    assert.equal(isStaffOnlyTenantDeniedPath('/app/delivery'), true);
    assert.equal(isOperatingWorkspaceStaffPath('/app/prospects'), true);
    assert.equal(isOperatingWorkspaceStaffPath('/app/commercial'), true);

    for (const [pathSeg, handler] of [
      ['/api/app/delivery', handleAppDelivery],
      ['/api/app/prospects', handleAppProspects],
      ['/api/app/commercial', handleAppCommercial],
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
      assert.ok(res.state.statusCode === 403 || res.state.statusCode === 401, pathSeg);
    }
  });
});

describe('#1155 Tenant Workspace UI still uses Requests & Progress', () => {
  it('does not add a second Lead Rescue dashboard route', () => {
    const tenantSrc = readFileSync(path.join(REPO_ROOT, 'pages/app/tenant.js'), 'utf8');
    const progressSrc = readFileSync(
      path.join(REPO_ROOT, 'components/app/TenantRequestsProgress.js'),
      'utf8',
    );
    assert.match(progressSrc, /tenant-service-name/);
    assert.match(progressSrc, /tenant-high-level-stage/);
    assert.equal(tenantSrc.includes('/app/lead-rescue'), false);
    assert.equal(progressSrc.includes('Prospect Operations'), false);
  });
});
