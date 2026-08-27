/**
 * #1212 in-process + live GET probe for Clients Workspace operator usability.
 * Writes artifacts/clients-workspace-1212/probe.json
 *
 * Optional live Next:
 *   NEXT_PORT=3051 node scripts/clients-workspace-1212-probe-evidence.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

import { actorFromSessionPayload } from '../lib/app/access.js';
import { REFERENCE_TENANT_ID } from '../lib/app/constants.js';
import {
  handleAppClientDetail,
  handleAppClients,
  handleAppShell,
} from '../lib/app/handlers.js';
import { CLIENTS_PATH, withOperatingWorkspaceProof } from '../lib/app/workspace-context.js';
import { resetProspectFixtureStore } from '../lib/app/prospect-operations-workspace.js';

const OUT_DIR = path.resolve('artifacts/clients-workspace-1212');
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

const prevNode = process.env.NODE_ENV;
const prevVercel = process.env.VERCEL_ENV;
process.env.NODE_ENV = 'development';
delete process.env.VERCEL_ENV;
resetProspectFixtureStore();

const list = mockRes();
await handleAppClients(
  { method: 'GET', url: '/api/app/clients?proof=1&env=core', headers: {} },
  list,
);
const clients = Array.isArray(list.state.body?.clients) ? list.state.body.clients : [];
const ada = clients.find((row) => row.company_id === 'cmp_ada_spa_synthetic') || null;

const detail = mockRes();
await handleAppClientDetail(
  {
    method: 'GET',
    url: '/api/app/client?proof=1&env=core&id=cmp_ada_spa_synthetic',
    headers: {},
  },
  detail,
);
const client = detail.state.body?.client || null;
const hops = client?.hop_paths || {};
const related = Array.isArray(client?.related_prospects) ? client.related_prospects : [];

const missing = mockRes();
await handleAppClientDetail(
  { method: 'GET', url: '/api/app/client?proof=1&env=core&id=does-not-exist', headers: {} },
  missing,
);

process.env.NODE_ENV = 'test';
const tenant = mockRes();
await handleAppClients(
  {
    method: 'GET',
    url: '/api/app/clients?env=core',
    headers: {},
    __testAppActor: actorFromSessionPayload({
      typ: 'tenant',
      tenant_id: REFERENCE_TENANT_ID,
      username: 'syn-1212-tenant',
    }),
  },
  tenant,
);
const tenantDetail = mockRes();
await handleAppClientDetail(
  {
    method: 'GET',
    url: '/api/app/client?env=core&id=cmp_ada_spa_synthetic',
    headers: {},
    __testAppActor: actorFromSessionPayload({
      typ: 'tenant',
      tenant_id: REFERENCE_TENANT_ID,
      username: 'syn-1212-tenant',
    }),
  },
  tenantDetail,
);

process.env.NODE_ENV = 'development';
const tenantShell = mockRes();
await handleAppShell(
  {
    method: 'GET',
    url: `/api/app/shell?proof=1&env=tenant&tenant_id=${REFERENCE_TENANT_ID}`,
    headers: {},
  },
  tenantShell,
);
const tenantHrefs = (tenantShell.state.body?.menus || []).map((m) => m.href);

process.env.NODE_ENV = 'production';
process.env.VERCEL_ENV = 'production';
const prodProof = mockRes();
await handleAppClients(
  { method: 'GET', url: '/api/app/clients?proof=1&env=core', headers: {} },
  prodProof,
);

async function liveGet(url) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    const text = await res.text();
    return {
      status: res.status,
      bytes: text.length,
      content_type: res.headers.get('content-type'),
      has_clients_page: text.includes('"/app/clients"') || text.includes('Clients'),
    };
  } catch (err) {
    return { status: 0, error: String(err?.message || err) };
  }
}

const live = {
  clients: await liveGet('https://core.corpflowai.com/app/clients'),
  clients_detail: await liveGet('https://core.corpflowai.com/app/clients/cmp_ada_spa_synthetic'),
  clients_api: await liveGet('https://core.corpflowai.com/api/app/clients?env=core'),
  clients_proof_api: await liveGet('https://core.corpflowai.com/api/app/clients?proof=1&env=core'),
  health: await liveGet('https://core.corpflowai.com/api/factory/health'),
  lux: await liveGet('https://lux.corpflowai.com/'),
};

const nextPort = Number(process.env.NEXT_PORT || 0);
const localNext = {};
if (nextPort) {
  const base = `http://127.0.0.1:${nextPort}`;
  localNext.clients = await liveGet(`${base}/app/clients`);
  localNext.clients_proof = await liveGet(`${base}/app/clients?proof=1`);
  localNext.clients_detail = await liveGet(`${base}/app/clients/cmp_ada_spa_synthetic?proof=1`);
}

const proofHops = {
  prospect: withOperatingWorkspaceProof(hops.prospect, true),
  commercial: withOperatingWorkspaceProof(hops.commercial, true),
  delivery: withOperatingWorkspaceProof(hops.delivery, true),
  pipeline: withOperatingWorkspaceProof(hops.pipeline, true),
  company_master: withOperatingWorkspaceProof(hops.company_master, true),
  change: withOperatingWorkspaceProof(hops.change, true),
};

const checks = {
  core_proof_ok: list.state.statusCode === 200 && list.state.body?.ok === true,
  at_least_three: clients.length >= 3,
  ada_identity: ada?.legal_name === 'Ada Spa Ltd' && ada?.trading_name === 'Ada Spa',
  ada_owner: ada?.record_owner === 'anton',
  ada_service: Array.isArray(ada?.services) && ada.services.some((row) => String(row.product || '').length > 0),
  ada_next_action: Boolean(String(ada?.next_action || '').trim()),
  recorded_prospect: related.length === 1 && related[0]?.id === 'syn-772-lr-ada',
  recorded_prospect_path: hops.prospect === '/app/prospects/syn-772-lr-ada',
  commercial_path: hops.commercial === '/app/commercial',
  delivery_path: hops.delivery === '/app/delivery',
  proof_on_app_hops:
    proofHops.prospect === '/app/prospects/syn-772-lr-ada?proof=1' &&
    proofHops.commercial === '/app/commercial?proof=1' &&
    proofHops.delivery === '/app/delivery?proof=1' &&
    proofHops.pipeline === '/app/pipeline?proof=1',
  admin_change_unproofed: proofHops.company_master === '/admin/company-master' && proofHops.change === '/change',
  missing_is_404: missing.state.statusCode === 404 && missing.state.body?.error === 'client_not_found',
  tenant_list_denied: tenant.state.statusCode === 403 && tenant.state.body?.error === 'core_access_denied',
  tenant_detail_denied:
    tenantDetail.state.statusCode === 403 && tenantDetail.state.body?.error === 'core_access_denied',
  tenant_nav_hides_clients: tenantHrefs.includes(CLIENTS_PATH) === false,
  production_proof_fail_closed: prodProof.state.statusCode === 401,
  live_clients_html: live.clients.status === 200,
  live_api_unauth: live.clients_api.status === 401,
};

const pass = Object.values(checks).every(Boolean);
const evidence = {
  captured_at: new Date().toISOString(),
  issue: 1212,
  environment: 'corpflow_test',
  current_main_sha: 'b731411734edb01b7dbb8d7e20247c5a7805983a',
  exact_url: 'https://core.corpflowai.com/app/clients',
  proof_url: 'https://core.corpflowai.com/app/clients?proof=1',
  path: CLIENTS_PATH,
  route_sequence: [
    '/app/clients?proof=1',
    '/app/clients/cmp_ada_spa_synthetic?proof=1',
    '/app/prospects/syn-772-lr-ada?proof=1',
    '/app/commercial?proof=1',
    '/app/delivery?proof=1',
  ],
  identifiers: {
    company_id: 'cmp_ada_spa_synthetic',
    prospect_id: 'syn-772-lr-ada',
    legal_name: client?.legal_name || null,
    trading_name: client?.trading_name || null,
    record_owner: client?.record_owner || null,
    onboarding_status: client?.onboarding_status || null,
    next_action: client?.next_action || null,
    services: client?.services || [],
  },
  in_process: {
    list_status: list.state.statusCode,
    detail_status: detail.state.statusCode,
    ok: list.state.body?.ok === true && detail.state.body?.ok === true,
    data_source: list.state.body?.data_source,
    count: list.state.body?.count,
    client_ids: clients.map((row) => row.company_id),
  },
  hops: proofHops,
  tenant: {
    list_status: tenant.state.statusCode,
    list_error: tenant.state.body?.error || null,
    detail_status: tenantDetail.state.statusCode,
    detail_error: tenantDetail.state.body?.error || null,
    shell_hrefs: tenantHrefs,
  },
  production_proof: {
    status: prodProof.state.statusCode,
    error: prodProof.state.body?.error || null,
  },
  live,
  local_next: localNext,
  checks,
  verdict: pass
    ? 'CLIENTS WORKSPACE CURRENT-MAIN USABLE'
    : `NOT READY — ${Object.entries(checks)
        .filter(([, ok]) => !ok)
        .map(([k]) => k)
        .join(', ')}`,
};

fs.writeFileSync(path.join(OUT_DIR, 'probe.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(
  JSON.stringify(
    { wrote: path.join(OUT_DIR, 'probe.json'), verdict: evidence.verdict, checks },
    null,
    2,
  ),
);

process.env.NODE_ENV = prevNode;
if (prevVercel == null) delete process.env.VERCEL_ENV;
else process.env.VERCEL_ENV = prevVercel;
