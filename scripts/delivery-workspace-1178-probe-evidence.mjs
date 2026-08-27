/**
 * #1178 in-process + live GET probe for Delivery Workspace operator usability.
 * Writes artifacts/delivery-workspace-1178/probe.json
 *
 * Optional live Next:
 *   NEXT_PORT=3050 node scripts/delivery-workspace-1178-probe-evidence.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

import { actorFromSessionPayload } from '../lib/app/access.js';
import { REFERENCE_TENANT_ID } from '../lib/app/constants.js';
import { COMMERCIAL_EXISTING_PATH, DELIVERY_PATH } from '../lib/app/delivery-summary-constants.js';
import { handleAppDelivery, handleAppShell } from '../lib/app/handlers.js';
import { resetProspectFixtureStore } from '../lib/app/prospect-operations-workspace.js';
import { resetRequestStore } from '../lib/app/request-store.js';

const OUT_DIR = path.resolve('artifacts/delivery-workspace-1178');
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
resetRequestStore();
resetProspectFixtureStore();

const core = mockRes();
await handleAppDelivery(
  { method: 'GET', url: '/api/app/delivery?proof=1&env=core', headers: {} },
  core,
);
const items = Array.isArray(core.state.body?.items) ? core.state.body.items : [];
const kinds = {};
for (const row of items) {
  const kind = String(row.record_kind || 'unknown');
  kinds[kind] = (kinds[kind] || 0) + 1;
}

function evidenceHas(row, label, hrefPrefix) {
  return (Array.isArray(row.evidence) ? row.evidence : []).some(
    (link) => String(link.label) === label && String(link.href || '').startsWith(hrefPrefix),
  );
}

const commercialOnEveryRow = items.length > 0 && items.every((row) => evidenceHas(row, 'Commercial', COMMERCIAL_EXISTING_PATH));
const prospectRows = items.filter((row) => row.record_kind === 'lead_rescue' || row.record_kind === 'website_rescue');
const prospectHops = prospectRows.length > 0 && prospectRows.every((row) => evidenceHas(row, 'Shared prospect', '/app/prospects/'));
const clientHops = items.every((row) =>
  (Array.isArray(row.evidence) ? row.evidence : []).some((link) =>
    String(link.label).startsWith('Client') && String(link.href || '').startsWith('/app/clients'),
  ),
);
const changeHops = items.every((row) => evidenceHas(row, 'Change Console', '/change'));

process.env.NODE_ENV = 'test';
const tenant = mockRes();
await handleAppDelivery(
  {
    method: 'GET',
    url: '/api/app/delivery?env=core',
    headers: {},
    __testAppActor: actorFromSessionPayload({
      typ: 'tenant',
      tenant_id: REFERENCE_TENANT_ID,
      username: 'syn-1178-tenant',
    }),
  },
  tenant,
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
await handleAppDelivery(
  { method: 'GET', url: '/api/app/delivery?proof=1&env=core', headers: {} },
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
      has_delivery_page: text.includes('"/app/delivery"') || text.includes('Delivery'),
    };
  } catch (err) {
    return { status: 0, error: String(err?.message || err) };
  }
}

const live = {
  delivery: await liveGet('https://core.corpflowai.com/app/delivery'),
  delivery_api: await liveGet('https://core.corpflowai.com/api/app/delivery?env=core'),
  delivery_proof_api: await liveGet('https://core.corpflowai.com/api/app/delivery?proof=1&env=core'),
  commercial: await liveGet('https://core.corpflowai.com/app/commercial'),
  health: await liveGet('https://core.corpflowai.com/api/factory/health'),
  lux: await liveGet('https://lux.corpflowai.com/'),
};

const nextPort = Number(process.env.NEXT_PORT || 0);
const localNext = {};
if (nextPort) {
  const base = `http://127.0.0.1:${nextPort}`;
  localNext.delivery = await liveGet(`${base}/app/delivery`);
  localNext.delivery_proof = await liveGet(`${base}/app/delivery?proof=1`);
}

const filters = core.state.body?.filter_counts || {};
const keyStatesPresent = {
  inputs_pending: Number(filters.inputs_pending || 0) > 0,
  client_review_pending: Number(filters.client_review_pending || 0) > 0,
  blocked: Number(filters.blocked || 0) > 0,
  protected_deploy_approval_required: Number(filters.protected_deploy_approval_required || 0) > 0,
  preview_ready_empty_ok: Number(filters.preview_ready || 0) === 0,
};

const checks = {
  core_proof_ok: core.state.statusCode === 200 && core.state.body?.ok === true,
  lead_rescue: Number(kinds.lead_rescue || 0) > 0,
  website_rescue: Number(kinds.website_rescue || 0) > 0,
  general_delivery: Number(kinds.general_delivery || 0) > 0,
  commercial_evidence: commercialOnEveryRow,
  prospect_evidence: prospectHops,
  client_evidence: clientHops,
  change_evidence: changeHops,
  tenant_delivery_denied: tenant.state.statusCode === 403 && tenant.state.body?.error === 'core_access_denied',
  tenant_nav_hides_delivery: tenantHrefs.includes(DELIVERY_PATH) === false,
  production_proof_fail_closed: prodProof.state.statusCode === 401,
  live_delivery_html: live.delivery.status === 200,
  live_api_unauth: live.delivery_api.status === 401,
  key_exception_states: Object.values(keyStatesPresent).every(Boolean),
};

const pass = Object.values(checks).every(Boolean);
const evidence = {
  captured_at: new Date().toISOString(),
  issue: 1178,
  environment: 'corpflow_test',
  current_main_sha: 'b731411734edb01b7dbb8d7e20247c5a7805983a',
  exact_url: 'https://core.corpflowai.com/app/delivery',
  proof_url: 'https://core.corpflowai.com/app/delivery?proof=1',
  path: DELIVERY_PATH,
  in_process: {
    status: core.state.statusCode,
    ok: core.state.body?.ok === true,
    data_source: core.state.body?.data_source,
    count: core.state.body?.count,
    filter_counts: filters,
    kinds,
    sample_ids: items.slice(0, 8).map((row) => row.id),
    protected_item: items.find((row) => row.protected_gate === true)?.id || null,
  },
  hops: {
    commercialOnEveryRow,
    prospectHops,
    clientHops,
    changeHops,
  },
  tenant: {
    delivery_status: tenant.state.statusCode,
    delivery_error: tenant.state.body?.error || null,
    shell_hrefs: tenantHrefs,
  },
  production_proof: {
    status: prodProof.state.statusCode,
    error: prodProof.state.body?.error || null,
  },
  live,
  local_next: localNext,
  key_states: keyStatesPresent,
  checks,
  verdict: pass
    ? 'DELIVERY WORKSPACE LIVE OPERATOR JOURNEY USABLE'
    : `NOT READY — ${Object.entries(checks)
        .filter(([, ok]) => !ok)
        .map(([k]) => k)
        .join(', ')}`,
};

fs.writeFileSync(path.join(OUT_DIR, 'probe.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ wrote: path.join(OUT_DIR, 'probe.json'), verdict: evidence.verdict, checks }, null, 2));

process.env.NODE_ENV = prevNode;
if (prevVercel == null) delete process.env.VERCEL_ENV;
else process.env.VERCEL_ENV = prevVercel;
