/**
 * #1201 in-process probe for combined Lead Rescue + Website Rescue tenant journey.
 * Writes artifacts/tenant-delivery-progress-1201/probe.json
 */
import fs from 'node:fs';
import path from 'node:path';

import { actorFromSessionPayload } from '../lib/app/access.js';
import {
  LEAD_RESCUE_TENANT_REQUEST_ID,
  OTHER_TENANT_ID,
  REFERENCE_TENANT_ID,
  WEBSITE_RESCUE_TENANT_PROGRESS_FOIL_ID,
  WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID,
} from '../lib/app/constants.js';
import {
  handleAppCommercial,
  handleAppDelivery,
  handleAppProspects,
  handleAppRequestDetail,
  handleAppRequestsList,
} from '../lib/app/handlers.js';
import { payloadContainsForbiddenTenantKeys } from '../lib/app/project.js';
import { resetProspectFixtureStore } from '../lib/app/prospect-operations-workspace.js';
import { resetRequestStore } from '../lib/app/request-store.js';
import {
  tenantChangeHandoffCreatesTicket,
  tenantChangeHandoffHref,
  tenantWorkspaceReturnHref,
} from '../lib/app/tenant-journey.js';
import { tenantProgressPanelKind } from '../lib/app/tenant-workspace.js';
import { payloadContainsForbiddenWebsiteRescueTenantKeys } from '../lib/app/website-rescue-tenant-progress.js';
import {
  LEAD_RESCUE_CLIENT_REVIEW_RECORD_ID,
  LEAD_RESCUE_PREVIEW_COMPONENT_KEY,
  LEAD_RESCUE_SERVICE_NAME,
  resetLeadRescueDeliveryStore,
} from '../lib/lead-rescue/tenant-delivery-progress.js';

const OUT_DIR = path.resolve('artifacts/tenant-delivery-progress-1201');
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
resetLeadRescueDeliveryStore();

const tenant = actorFromSessionPayload({
  typ: 'tenant',
  username: 'syn-1201-probe',
  tenant_id: REFERENCE_TENANT_ID,
});

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
const rows = list.state.body.requests || [];
const lrRow = rows.find((r) => r.request_id === LEAD_RESCUE_TENANT_REQUEST_ID);
const wrRow = rows.find((r) => r.request_id === WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID);

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
const lr = lrDetail.state.body.request || {};
const lrPreview = (lr.components || []).find((c) => c.key === LEAD_RESCUE_PREVIEW_COMPONENT_KEY);

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
const wr = wrDetail.state.body.request || {};
const wrPreview = (wr.components || []).find((c) => c.key === 'website_rescue_preview');

const other = actorFromSessionPayload({
  typ: 'tenant',
  username: 'syn-1201-other',
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
  ['commercial', handleAppCommercial, '/api/app/commercial?env=tenant'],
  ['delivery', handleAppDelivery, '/api/app/delivery?env=tenant'],
  ['prospects', handleAppProspects, '/api/app/prospects?env=tenant'],
]) {
  const res = mockRes();
  await handler({ method: 'GET', url, headers: {}, __testAppActor: tenant }, res);
  staff[name] = res.state.statusCode;
}

const handoff = tenantChangeHandoffHref({ tenantId: REFERENCE_TENANT_ID });
const ret = tenantWorkspaceReturnHref({ tenantId: REFERENCE_TENANT_ID });
const listErrorKind = tenantProgressPanelKind({
  listReady: true,
  requestCount: 0,
  error: 'requests_503',
});

const expected = {
  list_ok: true,
  lr_service: LEAD_RESCUE_SERVICE_NAME,
  wr_service: 'Website Rescue',
  lr_stage: 'Ready for your review',
  wr_stage: 'Preview ready',
  lr_preview_exposed: true,
  wr_preview_link: true,
  wr_not_review_api: true,
  cross_tenant: 404,
  staff_denied: true,
  change_canonical: true,
  list_error_not_empty: true,
};
const actual = {
  list_ok: list.state.statusCode === 200 && Boolean(lrRow) && Boolean(wrRow),
  lr_service: lr.service_name || null,
  wr_service: wr.service_name || null,
  lr_stage: lr.high_level_stage_label || null,
  wr_stage: wr.delivery_stage || null,
  lr_next_action: lr.next_action || null,
  wr_next_action: wr.next_action || null,
  lr_list_detail_next_match: lr.next_action === lrRow?.next_action,
  wr_list_detail_next_match: wr.next_action === wrRow?.next_action,
  lr_preview_exposed: lrPreview?.exposed_for_client_review === true,
  wr_preview_link: Boolean(wrPreview?.exposed_evidence?.href) && wrPreview?.exposed_for_client_review === false,
  wr_progress_lt_100: Number(wrRow?.progress_percent) < 100,
  foil_absent: !rows.some((r) => r.request_id === WEBSITE_RESCUE_TENANT_PROGRESS_FOIL_ID),
  leak: payloadContainsForbiddenTenantKeys(lr) || payloadContainsForbiddenWebsiteRescueTenantKeys(wr),
  cross_tenant: crossLr.state.statusCode,
  cross_wr: crossWr.state.statusCode,
  staff_denied: Object.values(staff).every((code) => code === 403),
  change_canonical: handoff.startsWith('/change') && tenantChangeHandoffCreatesTicket() === false,
  return_tenant: ret.includes(`tenant_id=${REFERENCE_TENANT_ID}`) && ret.includes('from=change'),
  list_error_not_empty: listErrorKind === 'error',
};

const pass =
  actual.list_ok &&
  actual.lr_service === expected.lr_service &&
  actual.wr_service === expected.wr_service &&
  actual.lr_stage === expected.lr_stage &&
  actual.wr_stage === expected.wr_stage &&
  actual.lr_list_detail_next_match &&
  actual.wr_list_detail_next_match &&
  actual.lr_preview_exposed &&
  actual.wr_preview_link &&
  actual.wr_progress_lt_100 &&
  actual.foil_absent &&
  actual.leak === false &&
  actual.cross_tenant === 404 &&
  actual.cross_wr === 404 &&
  actual.staff_denied &&
  actual.change_canonical &&
  actual.return_tenant &&
  actual.list_error_not_empty;

const probe = {
  issue: 1201,
  current_main_sha: 'eb31cfd3d3c74a3f8a17b81ae4d6cccf54c07751',
  environment: 'corpflow_test',
  route_sequence: [
    '/app/tenant',
    `/app/tenant?id=${LEAD_RESCUE_TENANT_REQUEST_ID}`,
    handoff,
    ret,
    `/app/tenant?id=${WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID}`,
    handoff,
    ret,
  ],
  fixtures: {
    tenant_id: REFERENCE_TENANT_ID,
    lead_rescue_request_id: LEAD_RESCUE_TENANT_REQUEST_ID,
    lead_rescue_delivery_record_id: LEAD_RESCUE_CLIENT_REVIEW_RECORD_ID,
    website_rescue_request_id: WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID,
  },
  expected,
  actual,
  staff_status: staff,
  verdict: pass ? 'TENANT DELIVERY PROGRESS JOURNEY USABLE' : 'NOT READY — probe mismatch',
};

fs.writeFileSync(path.join(OUT_DIR, 'probe.json'), `${JSON.stringify(probe, null, 2)}\n`);
process.env.NODE_ENV = prev;
console.log(JSON.stringify(probe, null, 2));
if (!pass) process.exit(1);
