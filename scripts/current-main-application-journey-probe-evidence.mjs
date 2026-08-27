/**
 * #1149 in-process + live corpflow_test probe for the current-main application journey.
 * Writes artifacts/current-main-application-journey-1149/probe.json
 *
 * Optional local Next:
 *   NEXT_PORT=3050 node scripts/current-main-application-journey-probe-evidence.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

import {
  actorFromSessionPayload,
  buildProofCoreActor,
  isProofModeAllowed,
} from '../lib/app/access.js';
import {
  CANONICAL_REQUEST_ID,
  OTHER_TENANT_REQUEST_ID,
  REFERENCE_TENANT_ID,
} from '../lib/app/constants.js';
import {
  handleAppCommercial,
  handleAppDelivery,
  handleAppRequestDetail,
  handleAppRequestsList,
  handleAppShell,
} from '../lib/app/handlers.js';
import { resetRequestStore } from '../lib/app/request-store.js';
import {
  tenantChangeHandoffCreatesTicket,
  tenantChangeHandoffHref,
} from '../lib/app/tenant-journey.js';
import {
  tenantChromeHidesWorkspaceChooser,
  tenantClientSurfaceOmitsForbiddenChrome,
} from '../lib/app/tenant-workspace.js';
import {
  COMMERCIAL_SUMMARY_PATH,
  DELIVERY_PATH,
  operatingNavIncludesCommercialSummary,
  operatingNavIncludesDelivery,
  tenantNavOmitsCommercialSummary,
  tenantNavOmitsDelivery,
} from '../lib/app/workspace-context.js';

const OUT_DIR = path.resolve('artifacts/current-main-application-journey-1149');
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

function gitSha() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

async function hit(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'CorpFlowAI-1149-acceptance/1.0' },
    redirect: 'manual',
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return {
    status: res.status,
    content_type: res.headers.get('content-type'),
    bytes: text.length,
    has_choose_workspace: /Choose workspace/i.test(text),
    has_tenant_workspace: /Tenant Workspace/i.test(text),
    has_sign_in: /Sign in/i.test(text),
    title: (text.match(/<title[^>]*>([^<]+)/i) || [])[1] || null,
    json_error: json && json.error ? json.error : null,
    json_ok: json && json.ok === true,
  };
}

const prev = process.env.NODE_ENV;
process.env.NODE_ENV = 'test';
resetRequestStore();

const tenant = actorFromSessionPayload({
  typ: 'tenant',
  username: 'syn-1149-probe',
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
const commercialDenied = mockRes();
await handleAppCommercial(
  {
    method: 'GET',
    url: '/api/app/commercial?env=core',
    headers: {},
    __testAppActor: tenant,
  },
  commercialDenied,
);
const deliveryDenied = mockRes();
await handleAppDelivery(
  {
    method: 'GET',
    url: '/api/app/delivery?env=core',
    headers: {},
    __testAppActor: tenant,
  },
  deliveryDenied,
);

process.env.NODE_ENV = 'development';
delete process.env.VERCEL_ENV;
const core = buildProofCoreActor();
const commercial = mockRes();
await handleAppCommercial(
  {
    method: 'GET',
    url: '/api/app/commercial?proof=1&env=core&filter=all',
    headers: {},
    __testAppActor: core,
  },
  commercial,
);
const delivery = mockRes();
await handleAppDelivery(
  {
    method: 'GET',
    url: '/api/app/delivery?proof=1&env=core&filter=all',
    headers: {},
    __testAppActor: core,
  },
  delivery,
);

const request = detail.state.body.request || {};
const landing = (request.components || []).find((c) => c.key === 'landing_copy');
const wiring = (request.components || []).find((c) => c.key === 'internal_wiring');
const ids = (list.state.body.requests || []).map((r) => r.request_id);
const adaCommercial = (commercial.state.body.rows || []).find((row) => row.id === 'syn-772-lr-ada');
const adaDelivery = (delivery.state.body.items || []).find((row) => row.source_id === 'syn-772-lr-ada');
const tenantSrc = fs.readFileSync(path.resolve('pages/app/tenant.js'), 'utf8');

const liveBase = process.env.LIVE_BASE_URL || 'https://core.corpflowai.com';
const luxBase = process.env.LUX_BASE_URL || 'https://lux.corpflowai.com';
/** @type {Record<string, unknown>} */
let liveHttp = {};
try {
  liveHttp = {
    '/app': await hit(`${liveBase}/app`),
    '/app/tenant': await hit(`${liveBase}/app/tenant`),
    '/app/commercial': await hit(`${liveBase}/app/commercial`),
    '/app/delivery': await hit(`${liveBase}/app/delivery`),
    '/change': await hit(`${liveBase}/change`),
    '/change?from=tenant-workspace': await hit(`${liveBase}/change?from=tenant-workspace`),
    '/api/app/shell?env=tenant': await hit(`${liveBase}/api/app/shell?env=tenant`),
    '/api/app/shell?proof=1&env=tenant': await hit(`${liveBase}/api/app/shell?proof=1&env=tenant`),
    '/api/app/shell?proof=1&env=core': await hit(`${liveBase}/api/app/shell?proof=1&env=core`),
    '/api/app/commercial?proof=1&env=core': await hit(`${liveBase}/api/app/commercial?proof=1&env=core`),
    '/api/app/delivery?proof=1&env=core': await hit(`${liveBase}/api/app/delivery?proof=1&env=core`),
    '/api/factory/health': await hit(`${liveBase}/api/factory/health`),
    'lux /change': await hit(`${luxBase}/change`),
    'lux /app/tenant': await hit(`${luxBase}/app/tenant`),
  };
} catch (err) {
  liveHttp = { error: String(err?.message || err) };
}

const nextPort = Number(process.env.NEXT_PORT || 0);
/** @type {Record<string, unknown>} */
let nextHttp = { skipped: true };
if (nextPort) {
  const base = `http://127.0.0.1:${nextPort}`;
  nextHttp = {
    skipped: false,
    '/app/tenant': await hit(`${base}/app/tenant`),
    '/app/commercial': await hit(`${base}/app/commercial`),
    '/app/delivery': await hit(`${base}/app/delivery`),
    '/change?from=tenant-workspace': await hit(`${base}${tenantChangeHandoffHref({ tenantId: REFERENCE_TENANT_ID })}`),
  };
}

const checks = {
  tenant_chrome_hides_chooser: tenantChromeHidesWorkspaceChooser(shell.state.body.workspace),
  tenant_source_omits_forbidden_chrome: tenantClientSurfaceOmitsForbiddenChrome(tenantSrc),
  tenant_safe_list: ids.includes(CANONICAL_REQUEST_ID) && !ids.includes(OTHER_TENANT_REQUEST_ID),
  exposed_reviewable: landing?.review_enabled === true,
  internal_view_only: wiring?.view_only === true,
  change_handoff: tenantChangeHandoffHref({ tenantId: REFERENCE_TENANT_ID }).startsWith('/change?'),
  navigation_does_not_create_ticket: tenantChangeHandoffCreatesTicket() === false,
  operating_nav_has_commercial: operatingNavIncludesCommercialSummary() === true,
  operating_nav_has_delivery: operatingNavIncludesDelivery() === true,
  tenant_nav_omits_commercial: tenantNavOmitsCommercialSummary() === true,
  tenant_nav_omits_delivery: tenantNavOmitsDelivery() === true,
  tenant_denied_commercial: commercialDenied.state.statusCode === 403,
  tenant_denied_delivery: deliveryDenied.state.statusCode === 403,
  staff_commercial_existing_ada: adaCommercial?.prospect_id === 'syn-772-lr-ada',
  staff_delivery_links_change: adaDelivery?.links?.change === '/change',
  staff_delivery_links_clients: String(adaDelivery?.links?.clients || '').startsWith('/app/clients'),
  commercial_no_payment: commercial.state.body.payment_processed === false,
  commercial_no_send: commercial.state.body.external_send === false,
  proof_blocked_on_production: isProofModeAllowed({ vercelEnv: 'production' }) === false,
  live_tenant_200: liveHttp['/app/tenant']?.status === 200,
  live_commercial_200: liveHttp['/app/commercial']?.status === 200,
  live_delivery_200: liveHttp['/app/delivery']?.status === 200,
  live_change_200: liveHttp['/change?from=tenant-workspace']?.status === 200,
  live_proof_fail_closed: liveHttp['/api/app/shell?proof=1&env=core']?.status === 401,
  live_health_ok: liveHttp['/api/factory/health']?.status === 200,
};

const allPass = Object.values(checks).every(Boolean);
const evidence = {
  captured_at: new Date().toISOString(),
  issue: 1149,
  parents: [772, 1120, 1004, 1005],
  merged_foundations: [1124, 1122, 1142],
  environment: 'corpflow_test',
  current_main_sha: gitSha(),
  verdict: allPass
    ? 'CORPFLOWAI CURRENT-MAIN APPLICATION JOURNEY USABLE'
    : `NOT READY — ${Object.entries(checks)
        .filter(([, v]) => !v)
        .map(([k]) => k)
        .join(', ')}`,
  checks,
  expected_vs_actual: {
    'Tenant chrome has no Choose workspace': {
      expected: true,
      actual: checks.tenant_chrome_hides_chooser,
    },
    'Service & change reaches /change': {
      expected: '/change?from=tenant-workspace',
      actual: tenantChangeHandoffHref({ tenantId: REFERENCE_TENANT_ID }),
    },
    'Staff Commercial reuses Ada Spa fixture': {
      expected: 'syn-772-lr-ada',
      actual: adaCommercial?.prospect_id || null,
    },
    'Staff Delivery links Change Console': {
      expected: '/change',
      actual: adaDelivery?.links?.change || null,
    },
    'Tenant denied Commercial': {
      expected: 403,
      actual: commercialDenied.state.statusCode,
    },
    'Tenant denied Delivery': {
      expected: 403,
      actual: deliveryDenied.state.statusCode,
    },
    'Production proof harness fail-closed': {
      expected: 401,
      actual: liveHttp['/api/app/shell?proof=1&env=core']?.status,
    },
  },
  live_http: liveHttp,
  next_http: nextHttp,
  authenticated_live_boundary:
    'No existing safe test session cookie in this runner. Production rejects ?proof=1. Authenticated live Tenant/Core sessions were not invented.',
};

fs.writeFileSync(path.join(OUT_DIR, 'probe.json'), JSON.stringify(evidence, null, 2));
process.env.NODE_ENV = prev;
console.log(JSON.stringify({ verdict: evidence.verdict, out: path.join(OUT_DIR, 'probe.json') }, null, 2));
if (!allPass) process.exit(1);
