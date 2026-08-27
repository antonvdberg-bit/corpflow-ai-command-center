/**
 * #1155 in-process probe for Lead Rescue tenant delivery progress.
 * Writes artifacts/lead-rescue-tenant-progress-1155/probe.json
 */
import fs from 'node:fs';
import path from 'node:path';

import { actorFromSessionPayload, buildProofCoreActor } from '../lib/app/access.js';
import {
  LEAD_RESCUE_TENANT_REQUEST_ID,
  OTHER_TENANT_ID,
  REFERENCE_TENANT_ID,
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
import { tenantChangeHandoffCreatesTicket, tenantChangeHandoffHref } from '../lib/app/tenant-journey.js';
import {
  LEAD_RESCUE_PREVIEW_COMPONENT_KEY,
  LEAD_RESCUE_SERVICE_NAME,
} from '../lib/lead-rescue/tenant-delivery-progress.js';

const OUT_DIR = path.resolve('artifacts/lead-rescue-tenant-progress-1155');
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

const tenant = actorFromSessionPayload({
  typ: 'tenant',
  username: 'syn-1155-probe',
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
const summary = (list.state.body.requests || []).find(
  (r) => r.request_id === LEAD_RESCUE_TENANT_REQUEST_ID,
);

const detail = mockRes();
await handleAppRequestDetail(
  {
    method: 'GET',
    url: `/api/app/request?env=tenant&tenant_id=${REFERENCE_TENANT_ID}&id=${LEAD_RESCUE_TENANT_REQUEST_ID}`,
    headers: {},
    __testAppActor: tenant,
  },
  detail,
);
const request = detail.state.body.request || {};
const preview = (request.components || []).find((c) => c.key === LEAD_RESCUE_PREVIEW_COMPONENT_KEY);

const other = actorFromSessionPayload({
  typ: 'tenant',
  username: 'syn-1155-other',
  tenant_id: OTHER_TENANT_ID,
});
const cross = mockRes();
await handleAppRequestDetail(
  {
    method: 'GET',
    url: `/api/app/request?env=tenant&tenant_id=${OTHER_TENANT_ID}&id=${LEAD_RESCUE_TENANT_REQUEST_ID}`,
    headers: {},
    __testAppActor: other,
  },
  cross,
);

const staff = {};
for (const [name, handler, url] of [
  ['delivery', handleAppDelivery, '/api/app/delivery?env=tenant'],
  ['prospects', handleAppProspects, '/api/app/prospects?env=tenant'],
  ['commercial', handleAppCommercial, '/api/app/commercial?env=tenant'],
]) {
  const res = mockRes();
  await handler(
    { method: 'GET', url, headers: {}, __testAppActor: tenant },
    res,
  );
  staff[name] = res.state.statusCode;
}

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

const expected = {
  list_ok: true,
  service_name: LEAD_RESCUE_SERVICE_NAME,
  high_level_stage: 'client_review',
  preview_exposed: true,
  cross_tenant: 404,
  staff_denied: true,
  review_ok: true,
  change_href_canonical: true,
};
const actual = {
  list_ok: list.state.statusCode === 200 && Boolean(summary),
  service_name: request.service_name || null,
  high_level_stage: request.high_level_stage || null,
  preview_exposed: preview?.exposed_for_client_review === true,
  cross_tenant: cross.state.statusCode,
  staff_denied: Object.values(staff).every((code) => code === 403 || code === 401),
  review_ok: review.state.statusCode === 200,
  change_href_canonical:
    tenantChangeHandoffHref({ tenantId: REFERENCE_TENANT_ID }).startsWith('/change') &&
    tenantChangeHandoffCreatesTicket() === false,
  leak: payloadContainsForbiddenTenantKeys(request),
};

const pass =
  actual.list_ok &&
  actual.service_name === expected.service_name &&
  actual.high_level_stage === expected.high_level_stage &&
  actual.preview_exposed &&
  actual.cross_tenant === expected.cross_tenant &&
  actual.staff_denied &&
  actual.review_ok &&
  actual.change_href_canonical &&
  actual.leak === false;

const probe = {
  issue: 1155,
  route: '/app/tenant',
  request_id: LEAD_RESCUE_TENANT_REQUEST_ID,
  delivery_record_id: 'synthetic-lr-client-review',
  tenant_id: REFERENCE_TENANT_ID,
  expected,
  actual,
  staff_status: staff,
  core_latest_decision:
    core.state.body?.request?.components?.find((c) => c.key === LEAD_RESCUE_PREVIEW_COMPONENT_KEY)
      ?.latest_client_decision?.decision || null,
  verdict: pass ? 'LEAD RESCUE TENANT DELIVERY PROGRESS USABLE' : 'NOT READY — probe mismatch',
};

fs.writeFileSync(path.join(OUT_DIR, 'probe.json'), `${JSON.stringify(probe, null, 2)}\n`);
process.env.NODE_ENV = prev;
console.log(JSON.stringify(probe, null, 2));
if (!pass) process.exit(1);
