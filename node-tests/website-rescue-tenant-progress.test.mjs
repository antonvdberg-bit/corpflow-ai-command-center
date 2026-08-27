/**
 * #1151 — Website Rescue tenant delivery progress in Requests & Progress.
 *
 * Projects the existing prospect delivery record. No copied status model.
 * Cross-tenant fail-closed. Staff Commercial / Delivery / Prospect stay Core-only.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { actorFromSessionPayload, buildProofCoreActor } from '../lib/app/access.js';
import {
  CANONICAL_REQUEST_ID,
  OTHER_TENANT_ID,
  OTHER_TENANT_REQUEST_ID,
  REFERENCE_TENANT_ID,
  TENANT_FORBIDDEN_FIELD_KEYS,
  WEBSITE_RESCUE_TENANT_PROGRESS_FOIL_ID,
  WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID,
} from '../lib/app/constants.js';
import {
  handleAppComponentReview,
  handleAppCommercial,
  handleAppDelivery,
  handleAppProspectDetail,
  handleAppProspects,
  handleAppRequestDetail,
  handleAppRequestsList,
} from '../lib/app/handlers.js';
import { payloadContainsForbiddenTenantKeys } from '../lib/app/project.js';
import {
  fixtureProspectLeadRows,
  resetProspectFixtureStore,
} from '../lib/app/prospect-operations-workspace.js';
import { resetRequestStore } from '../lib/app/request-store.js';
import { isStaffOnlyTenantDeniedPath } from '../lib/app/tenant-journey.js';
import {
  getTenantWebsiteRescueProgress,
  listTenantWebsiteRescueProgress,
  payloadContainsForbiddenWebsiteRescueTenantKeys,
  projectTenantWebsiteRescueProgress,
} from '../lib/app/website-rescue-tenant-progress.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

beforeEach(() => {
  resetRequestStore();
  resetProspectFixtureStore();
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
    username: 'syn-1151-tenant',
    user_id: 'syn_user_1151_tenant',
    tenant_id: tenantId,
  });
}

describe('Website Rescue tenant delivery progress #1151', () => {
  it('projects the existing Pia delivery record into a tenant-safe progress slice', () => {
    const pia = fixtureProspectLeadRows().find((row) => row.id === WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID);
    assert.ok(pia);
    const projection = projectTenantWebsiteRescueProgress(pia, REFERENCE_TENANT_ID);
    assert.ok(projection);
    assert.equal(projection.request_id, WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID);
    assert.equal(projection.tenant_id, REFERENCE_TENANT_ID);
    assert.equal(projection.service_name, 'Website Rescue');
    assert.equal(projection.delivery_stage, 'Preview ready');
    assert.equal(projection.preview_review_ready, true);
    assert.equal(projection.record_kind, 'website_rescue');
    assert.equal(projection.authoritative_record, 'qualification_json.website_rescue_delivery');
    assert.match(String(projection.next_action), /Review your Website Rescue preview/i);
    assert.equal(projection.client_safe_blocker, null);
    const preview = projection.components.find((c) => c.key === 'website_rescue_preview');
    assert.equal(preview.exposed_for_client_review, false);
    assert.equal(preview.review_enabled, false);
    assert.equal(preview.view_only, true);
    assert.equal(preview.exposed_evidence.href, 'https://preview.example/pia-studio-rescue');
    assert.equal(payloadContainsForbiddenWebsiteRescueTenantKeys(projection), false);
    const blob = JSON.stringify(projection);
    assert.equal(blob.includes('operator_note'), false);
    assert.equal(blob.includes('commercial_notes'), false);
    assert.equal(blob.includes('PAY-EV-'), false);
    assert.equal(blob.includes('financially_approved'), false);
    assert.equal(blob.includes('working_email'), false);
    assert.equal(blob.includes('deploy_approval_simulated'), false);
  });

  it('also projects the existing Wren authorised client from the same delivery record', () => {
    const wren = fixtureProspectLeadRows().find((row) => row.id === 'syn-716-wr-cleared');
    const projection = projectTenantWebsiteRescueProgress(wren, REFERENCE_TENANT_ID);
    assert.ok(projection);
    assert.equal(projection.request_id, 'syn-716-wr-cleared');
    assert.equal(projection.delivery_stage, 'Getting started');
    assert.equal(projection.preview_review_ready, false);
    assert.match(String(projection.next_action), /remaining (website details|content or brand assets)/i);
  });

  it('does not invent a tenant slice for unauthorised Website Rescue or other products', () => {
    const bea = fixtureProspectLeadRows().find((row) => row.id === 'syn-772-rd-bea');
    const ada = fixtureProspectLeadRows().find((row) => row.id === 'syn-772-lr-ada');
    assert.equal(projectTenantWebsiteRescueProgress(bea, REFERENCE_TENANT_ID), null);
    assert.equal(projectTenantWebsiteRescueProgress(ada, REFERENCE_TENANT_ID), null);
  });

  it('fails closed across tenants on the same underlying delivery identity', async () => {
    const listed = await listTenantWebsiteRescueProgress({
      tenantId: REFERENCE_TENANT_ID,
      forceFixture: true,
    });
    assert.equal(listed.ok, true);
    const ids = listed.items.map((row) => row.request_id);
    assert.ok(ids.includes(WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID));
    assert.ok(ids.includes('syn-716-wr-cleared'));
    assert.equal(ids.includes(WEBSITE_RESCUE_TENANT_PROGRESS_FOIL_ID), false);

    const own = await getTenantWebsiteRescueProgress({
      id: WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID,
      tenantId: REFERENCE_TENANT_ID,
      forceFixture: true,
    });
    assert.equal(own.ok, true);

    const cross = await getTenantWebsiteRescueProgress({
      id: WEBSITE_RESCUE_TENANT_PROGRESS_FOIL_ID,
      tenantId: REFERENCE_TENANT_ID,
      forceFixture: true,
    });
    assert.equal(cross.ok, false);
    assert.equal(cross.error, 'request_not_found');

    const wrongTenant = await getTenantWebsiteRescueProgress({
      id: WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID,
      tenantId: OTHER_TENANT_ID,
      forceFixture: true,
    });
    assert.equal(wrongTenant.ok, false);
    assert.equal(wrongTenant.error, 'request_not_found');
  });

  it('tenant Requests & Progress journey shows stage, next action, and only exposed evidence', async () => {
    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
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
    assert.ok(ids.includes(CANONICAL_REQUEST_ID));
    assert.ok(ids.includes(WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID));
    assert.equal(ids.includes(OTHER_TENANT_REQUEST_ID), false);
    assert.equal(ids.includes(WEBSITE_RESCUE_TENANT_PROGRESS_FOIL_ID), false);
    assert.equal(payloadContainsForbiddenTenantKeys(listRes.state.body.requests), false);
    for (const key of TENANT_FORBIDDEN_FIELD_KEYS) {
      assert.equal(JSON.stringify(listRes.state.body.requests).includes(`"${key}"`), false, key);
    }

    const piaRow = listRes.state.body.requests.find(
      (r) => r.request_id === WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID,
    );
    assert.equal(piaRow.service_name, 'Website Rescue');
    assert.equal(piaRow.delivery_stage, 'Preview ready');
    assert.match(String(piaRow.next_action), /Review your Website Rescue preview/i);

    const detailRes = mockRes();
    await handleAppRequestDetail(
      {
        method: 'GET',
        url: `/api/app/request?env=tenant&tenant_id=${REFERENCE_TENANT_ID}&id=${WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID}`,
        headers: {},
        __testAppActor: actor,
      },
      detailRes,
    );
    assert.equal(detailRes.state.statusCode, 200);
    const request = detailRes.state.body.request;
    assert.equal(request.record_kind, 'website_rescue');
    assert.equal(request.preview_review_ready, true);
    const preview = request.components.find((c) => c.key === 'website_rescue_preview');
    assert.equal(preview.exposed_for_client_review, false);
    assert.ok(preview.exposed_evidence.href);
    assert.equal(payloadContainsForbiddenWebsiteRescueTenantKeys(request), false);

    const progressSrc = readFileSync(
      path.join(REPO_ROOT, 'components/app/TenantRequestsProgress.js'),
      'utf8',
    );
    assert.match(progressSrc, /tenant-delivery-stage/);
    assert.match(progressSrc, /tenant-service-name/);
    assert.match(progressSrc, /Open exposed preview/);
    assert.match(progressSrc, /Review or request a change/);
    assert.match(progressSrc, /exposed_for_client_review === true/);
    const tenantSrc = readFileSync(path.join(REPO_ROOT, 'pages/app/tenant.js'), 'utf8');
    assert.match(tenantSrc, /router\.query\.id/);
    } finally {
      process.env.NODE_ENV = prevNode;
    }
  });

  it('tenant cannot review the Website Rescue record through the ticket review API', async () => {
    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
    const actor = tenantActor();
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
    } finally {
      process.env.NODE_ENV = prevNode;
    }
  });

  it('staff Commercial, Delivery, and Prospect remain inaccessible to Tenant', async () => {
    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
    const actor = tenantActor();
    for (const pathName of ['/app/commercial', '/app/delivery', '/app/prospects']) {
      assert.equal(isStaffOnlyTenantDeniedPath(pathName), true);
    }

    const commercial = mockRes();
    await handleAppCommercial(
      {
        method: 'GET',
        url: `/api/app/commercial?env=tenant&tenant_id=${REFERENCE_TENANT_ID}`,
        headers: {},
        __testAppActor: actor,
      },
      commercial,
    );
    assert.equal(commercial.state.statusCode, 403);

    const delivery = mockRes();
    await handleAppDelivery(
      {
        method: 'GET',
        url: `/api/app/delivery?env=tenant&tenant_id=${REFERENCE_TENANT_ID}`,
        headers: {},
        __testAppActor: actor,
      },
      delivery,
    );
    assert.equal(delivery.state.statusCode, 403);

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

    const routed = mockRes();
    await handleAppProspects(
      {
        method: 'GET',
        url: `/api/app/prospects?env=tenant&tenant_id=${REFERENCE_TENANT_ID}`,
        headers: {},
        __testAppActor: actor,
      },
      routed,
    );
    assert.equal(routed.state.statusCode, 403);
    } finally {
      process.env.NODE_ENV = prevNode;
    }
  });

  it('Core still sees the same underlying Website Rescue delivery on Prospect detail', async () => {
    const core = mockRes();
    await handleAppProspectDetail(
      {
        method: 'GET',
        url: `/api/app/prospect?proof=1&env=core&id=${WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID}`,
        headers: {},
        __testAppActor: buildProofCoreActor(),
      },
      core,
    );
    assert.equal(core.state.statusCode, 200);
    assert.equal(core.state.body.prospect.website_rescue_delivery.delivery_state, 'preview_evidence');
    assert.equal(
      core.state.body.prospect.website_rescue_delivery.evidence.preview.operator_note.includes('Staff-only'),
      true,
    );
  });

  it('architecture doc names the tenant route and identity contract', () => {
    const doc = readFileSync(
      path.join(REPO_ROOT, 'docs/architecture/WEBSITE_RESCUE_TENANT_DELIVERY_PROGRESS_V1.md'),
      'utf8',
    );
    assert.match(doc, /#1151/);
    assert.match(doc, /\/app\/tenant/);
    assert.match(doc, /syn-1151-wr-tenant-progress/);
    assert.match(doc, /qualification_json\.website_rescue_delivery/);
    assert.match(doc, /\/change/);
  });
});
