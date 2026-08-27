/**
 * #1120 in-process + optional Next probe for the reference-tenant client journey.
 * Writes artifacts/tenant-client-journey-1120/probe.json
 *
 * Optional live Next:
 *   NEXT_PORT=3050 node scripts/tenant-client-journey-probe-evidence.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

import { actorFromSessionPayload, buildProofCoreActor } from '../lib/app/access.js';
import {
  CANONICAL_REQUEST_ID,
  OTHER_TENANT_REQUEST_ID,
  REFERENCE_TENANT_ID,
} from '../lib/app/constants.js';
import {
  handleAppComponentReview,
  handleAppRequestDetail,
  handleAppRequestsList,
  handleAppShell,
} from '../lib/app/handlers.js';
import { payloadContainsForbiddenTenantKeys } from '../lib/app/project.js';
import { resetRequestStore } from '../lib/app/request-store.js';
import {
  tenantChangeHandoffCreatesTicket,
  tenantChangeHandoffHref,
} from '../lib/app/tenant-journey.js';
import {
  tenantChooserRedirectPath,
  tenantChromeHidesWorkspaceChooser,
  tenantClientSurfaceOmitsForbiddenChrome,
} from '../lib/app/tenant-workspace.js';

const OUT_DIR = path.resolve('artifacts/tenant-client-journey-1120');
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
  username: 'syn-1120-probe',
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
const detail = mockRes();
await handleAppRequestDetail(
  {
    method: 'GET',
    url: `/api/app/request?env=tenant&tenant_id=${REFERENCE_TENANT_ID}&id=${CANONICAL_REQUEST_ID}`,
    headers: {},
    __testAppActor: tenant,
  },
  detail,
);
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
      request_id: CANONICAL_REQUEST_ID,
      component_key: 'landing_copy',
      decision: 'approve',
      comment: 'Please publish this copy.',
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
    url: `/api/app/request?env=core&id=${CANONICAL_REQUEST_ID}`,
    headers: {},
    __testAppActor: buildProofCoreActor(),
  },
  core,
);

const request = detail.state.body.request || {};
const landing = (request.components || []).find((c) => c.key === 'landing_copy');
const wiring = (request.components || []).find((c) => c.key === 'internal_wiring');
const coreLanding = (core.state.body.request?.components || []).find((c) => c.key === 'landing_copy');
const ids = (list.state.body.requests || []).map((r) => r.request_id);
const tenantSrc = fs.readFileSync(path.resolve('pages/app/tenant.js'), 'utf8');

const nextPort = Number(process.env.NEXT_PORT || 0);
/** @type {Record<string, unknown>} */
let nextHttp = { skipped: true };
if (nextPort) {
  const base = `http://127.0.0.1:${nextPort}`;
  async function hit(urlPath) {
    const res = await fetch(base + urlPath);
    const text = await res.text();
    return { status: res.status, bytes: text.length, has_choose_workspace: /Choose workspace/i.test(text) };
  }
  nextHttp = {
    skipped: false,
    '/app/tenant': await hit('/app/tenant'),
    '/app': await hit('/app'),
    '/change?from=tenant-workspace': await hit(tenantChangeHandoffHref({ tenantId: REFERENCE_TENANT_ID })),
    '/app/commercial': await hit('/app/commercial'),
    '/app/delivery': await hit('/app/delivery'),
    '/api/app/shell?proof=1&env=tenant': await (async () => {
      const res = await fetch(`${base}/api/app/shell?proof=1&env=tenant`);
      const body = await res.json().catch(() => ({}));
      return { status: res.status, ok: body.ok === true, environment: body.environment };
    })(),
  };
}

const checks = {
  tenant_chrome_hides_chooser: tenantChromeHidesWorkspaceChooser(shell.state.body.workspace),
  tenant_source_omits_forbidden_chrome: tenantClientSurfaceOmitsForbiddenChrome(tenantSrc),
  tenant_app_redirects: tenantChooserRedirectPath(200) === '/app/tenant',
  tenant_safe_list: ids.includes(CANONICAL_REQUEST_ID) && !ids.includes(OTHER_TENANT_REQUEST_ID),
  exposed_reviewable: landing?.review_enabled === true,
  internal_view_only: wiring?.view_only === true,
  internal_review_blocked: blocked.state.statusCode === 403,
  review_persists: review.state.body.request?.components?.find((c) => c.key === 'landing_copy')
    ?.latest_review?.decision === 'approve',
  core_sees_decision: coreLanding?.latest_client_decision?.decision === 'approve',
  no_forbidden_tenant_fields: payloadContainsForbiddenTenantKeys(request) === false,
  change_handoff: tenantChangeHandoffHref({ tenantId: REFERENCE_TENANT_ID }).startsWith('/change?'),
  navigation_does_not_create_ticket: tenantChangeHandoffCreatesTicket() === false,
};

const allPass = Object.values(checks).every(Boolean);
const evidence = {
  captured_at: new Date().toISOString(),
  issue: 1120,
  parent_issue: 773,
  related: [884, 1077, 1104],
  environment: 'corpflow_test',
  verdict: allPass
    ? 'REFERENCE TENANT CLIENT JOURNEY READY FOR LIVE VERIFICATION'
    : 'NOT READY — tenant client journey check failed',
  checks,
  expected_vs_actual: {
    'Tenant chrome has no Choose workspace': {
      expected: true,
      actual: checks.tenant_chrome_hides_chooser,
    },
    '/app tenant session continues at /app/tenant': {
      expected: '/app/tenant',
      actual: tenantChooserRedirectPath(200),
    },
    'Exposed component is reviewable': { expected: true, actual: checks.exposed_reviewable },
    'Internal component is view-only': { expected: true, actual: checks.internal_view_only },
    'Tenant decision visible in Core': { expected: 'approve', actual: coreLanding?.latest_client_decision?.decision },
    'Service & change reaches /change': {
      expected: '/change?from=tenant-workspace',
      actual: tenantChangeHandoffHref({ tenantId: REFERENCE_TENANT_ID }),
    },
  },
  next_http: nextHttp,
};

fs.writeFileSync(path.join(OUT_DIR, 'probe.json'), JSON.stringify(evidence, null, 2));
process.env.NODE_ENV = prev;
console.log(JSON.stringify({ verdict: evidence.verdict, out: path.join(OUT_DIR, 'probe.json') }, null, 2));
if (!allPass) process.exit(1);
