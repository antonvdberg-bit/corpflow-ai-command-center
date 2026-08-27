/**
 * #1175 in-process probe for Lead + Website Rescue Tenant progress
 * and the existing review / /change journey.
 * Writes artifacts/tenant-delivery-progress-review-change-1175/probe.json
 */
import fs from 'node:fs';
import path from 'node:path';

import { actorFromSessionPayload, buildProofCoreActor } from '../lib/app/access.js';
import {
  LEAD_RESCUE_TENANT_REQUEST_ID,
  OTHER_TENANT_ID,
  REFERENCE_TENANT_ID,
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
  tenantChangeHandoffCreatesTicket,
  tenantChangeHandoffHref,
} from '../lib/app/tenant-journey.js';
import { payloadContainsForbiddenWebsiteRescueTenantKeys } from '../lib/app/website-rescue-tenant-progress.js';
import {
  LEAD_RESCUE_PREVIEW_COMPONENT_KEY,
  LEAD_RESCUE_SERVICE_NAME,
  LEAD_RESCUE_VERIFICATION_COMPONENT_KEY,
  leadRescueTenantProjectionLeaks,
} from '../lib/lead-rescue/tenant-delivery-progress.js';

const OUT_DIR = path.resolve('artifacts/tenant-delivery-progress-review-change-1175');
fs.mkdirSync(OUT_DIR, { recursive: true });

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

const prev = process.env.NODE_ENV;
process.env.NODE_ENV = 'test';
resetRequestStore();
resetProspectFixtureStore();

const tenant = actorFromSessionPayload({
  typ: 'tenant',
  username: 'syn-1175-probe',
  tenant_id: REFERENCE_TENANT_ID,
});

const shell = mockRes();
await handleAppShell(
  {
    method: 'GET',
    url: `/api/app/shell?env=tenant&tenant_id=${REFERENCE_TENANT_ID}`,
    headers: {},
    __testAppActor: tenant,
  },
  shell,
);

const list = mockRes();
await handleAppRequestsList(
  {
    method: 'GET',
    url: `/api/app/requests?env=tenant&tenant_id=${REFERENCE_TENANT_ID}`,
    headers: {},
    __testAppActor: tenant,
  },
  list,
);
const ids = (list.state.body.requests || []).map((r) => r.request_id);
const lrSummary = (list.state.body.requests || []).find(
  (r) => r.request_id === LEAD_RESCUE_TENANT_REQUEST_ID,
);
const wrSummary = (list.state.body.requests || []).find(
  (r) => r.request_id === WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID,
);

const lrDetail = mockRes();
await handleAppRequestDetail(
  {
    method: 'GET',
    url: `/api/app/request?env=tenant&tenant_id=${REFERENCE_TENANT_ID}&id=${LEAD_RESCUE_TENANT_REQUEST_ID}`,
    headers: {},
    __testAppActor: tenant,
  },
  lrDetail,
);
const lrRequest = lrDetail.state.body.request || {};
const lrPreview = (lrRequest.components || []).find((c) => c.key === LEAD_RESCUE_PREVIEW_COMPONENT_KEY);
const lrVerification = (lrRequest.components || []).find(
  (c) => c.key === LEAD_RESCUE_VERIFICATION_COMPONENT_KEY,
);

const wrDetail = mockRes();
await handleAppRequestDetail(
  {
    method: 'GET',
    url: `/api/app/request?env=tenant&tenant_id=${REFERENCE_TENANT_ID}&id=${WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID}`,
    headers: {},
    __testAppActor: tenant,
  },
  wrDetail,
);
const wrRequest = wrDetail.state.body.request || {};
const wrPreview = (wrRequest.components || []).find((c) => c.key === 'website_rescue_preview');

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
    __testAppActor: tenant,
  },
  blocked,
);

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
    __testAppActor: tenant,
  },
  review,
);

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
    __testAppActor: tenant,
  },
  wrReview,
);

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
const corePreview = ((core.state.body.request || {}).components || []).find(
  (c) => c.key === LEAD_RESCUE_PREVIEW_COMPONENT_KEY,
);

const other = actorFromSessionPayload({
  typ: 'tenant',
  username: 'syn-1175-other',
  tenant_id: OTHER_TENANT_ID,
});
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

const staff = {};
for (const [name, handler, url] of [
  ['delivery', handleAppDelivery, '/api/app/delivery?env=tenant'],
  ['prospects', handleAppProspects, '/api/app/prospects?env=tenant'],
  ['commercial', handleAppCommercial, '/api/app/commercial?env=tenant'],
  [
    'prospect_detail',
    handleAppProspectDetail,
    `/api/app/prospect?env=tenant&id=${WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID}`,
  ],
]) {
  const res = mockRes();
  await handler({ method: 'GET', url, headers: {}, __testAppActor: tenant }, res);
  staff[name] = res.state.statusCode;
}

const changeHref = tenantChangeHandoffHref({ tenantId: REFERENCE_TENANT_ID });
const checks = {
  list_ok: list.state.statusCode === 200 && ids.includes(LEAD_RESCUE_TENANT_REQUEST_ID)
    && ids.includes(WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID),
  lr_stage: lrSummary?.high_level_stage_label === 'Ready for your review'
    && lrRequest.service_name === LEAD_RESCUE_SERVICE_NAME,
  lr_preview_exposed: lrPreview?.exposed_for_client_review === true,
  lr_verification_view_only: lrVerification?.exposed_for_client_review === false,
  wr_stage: wrSummary?.delivery_stage === 'Preview ready' && wrRequest.service_name === 'Website Rescue',
  wr_preview_link: Boolean(wrPreview?.exposed_evidence?.href) && wrPreview?.review_enabled === false,
  lr_internal_review_blocked: blocked.state.statusCode === 403,
  lr_review_ok: review.state.statusCode === 200,
  wr_ticket_review_blocked: wrReview.state.statusCode === 404 || wrReview.state.statusCode === 403,
  core_sees_decision: corePreview?.latest_client_decision?.decision === 'approve',
  no_forbidden_keys: payloadContainsForbiddenTenantKeys(list.state.body.requests) === false
    && payloadContainsForbiddenTenantKeys(lrRequest) === false
    && payloadContainsForbiddenWebsiteRescueTenantKeys(wrRequest) === false
    && leadRescueTenantProjectionLeaks(lrRequest) === false,
  cross_tenant: crossLr.state.statusCode === 404 && crossWr.state.statusCode === 404,
  staff_denied: Object.values(staff).every((code) => code === 403),
  change_href_canonical: changeHref.startsWith('/change') && changeHref.includes('from=tenant-workspace'),
  navigation_does_not_create_ticket: tenantChangeHandoffCreatesTicket() === false,
  shell_ok: shell.state.statusCode === 200,
};

const allPass = Object.values(checks).every(Boolean);
const probe = {
  captured_at: new Date().toISOString(),
  issue: 1175,
  sources: [1169, 1124, 1073],
  current_main_sha: 'b731411734edb01b7dbb8d7e20247c5a7805983a',
  environment: 'corpflow_test',
  route: '/app/tenant',
  tenant_id: REFERENCE_TENANT_ID,
  lead_rescue_request_id: LEAD_RESCUE_TENANT_REQUEST_ID,
  website_rescue_request_id: WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID,
  expected: {
    both_services_listed: true,
    client_safe_stage_and_next_action: true,
    deliberately_exposed_review_only: true,
    change_handoff_canonical: true,
    staff_fail_closed: true,
  },
  actual: checks,
  staff_status: staff,
  change_href: changeHref,
  core_latest_decision: corePreview?.latest_client_decision?.decision || null,
  wr_review_status: wrReview.state.statusCode,
  verdict: allPass
    ? 'TENANT DELIVERY PROGRESS + REVIEW/CHANGE JOURNEY USABLE'
    : 'NOT READY — one client-journey check failed',
};

fs.writeFileSync(path.join(OUT_DIR, 'probe.json'), JSON.stringify(probe, null, 2) + '\n');
process.env.NODE_ENV = prev;
console.log(JSON.stringify({ out: path.join(OUT_DIR, 'probe.json'), verdict: probe.verdict }, null, 2));
if (!allPass) process.exit(1);
