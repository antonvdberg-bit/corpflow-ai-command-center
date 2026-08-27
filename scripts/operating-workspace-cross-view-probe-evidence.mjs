/**
 * #1219 in-process Operating Workspace cross-view probe.
 * Writes artifacts/operating-workspace-cross-view-1219/probe.json
 */
import fs from 'node:fs';
import path from 'node:path';

import { actorFromSessionPayload, buildProofCoreActor } from '../lib/app/access.js';
import { REFERENCE_TENANT_ID } from '../lib/app/constants.js';
import {
  handleAppActionQueue,
  handleAppClientDetail,
  handleAppClients,
  handleAppCommercial,
  handleAppDelivery,
  handleAppOverview,
  handleAppProspectDetail,
  handleAppShell,
} from '../lib/app/handlers.js';
import { resetProspectFixtureStore } from '../lib/app/prospect-operations-workspace.js';
import {
  OVERVIEW_LIST_ERROR_BODY,
  overviewErrorCopyImpliesFalseClear,
  operatingOverviewPanelKind,
} from '../lib/app/staff-workspace-load-state.js';

const OUT_DIR = path.resolve('artifacts/operating-workspace-cross-view-1219');
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

async function hit(handler, url, actor) {
  const res = mockRes();
  await handler(
    {
      method: 'GET',
      url,
      headers: {},
      ...(actor ? { __testAppActor: actor } : {}),
    },
    res,
  );
  return { status: res.state.statusCode, error: res.state.body?.error || null, ok: res.state.body?.ok === true, body: res.state.body };
}

const tenant = actorFromSessionPayload({
  typ: 'tenant',
  tenant_id: REFERENCE_TENANT_ID,
  username: 'syn-1219-tenant',
});

const overview = await hit(handleAppOverview, '/api/app/overview?proof=1&env=core');
const queue = await hit(handleAppActionQueue, '/api/app/queue?proof=1&env=core&filter=all');
const clients = await hit(handleAppClients, '/api/app/clients?proof=1&env=core');
const client = await hit(handleAppClientDetail, '/api/app/client?proof=1&env=core&id=cmp_ada_spa_synthetic');
const commercial = await hit(handleAppCommercial, '/api/app/commercial?proof=1&env=core&filter=needs_attention');
const delivery = await hit(handleAppDelivery, '/api/app/delivery?proof=1&env=core&filter=all');
const prospect = await hit(handleAppProspectDetail, '/api/app/prospect?proof=1&env=core&id=syn-772-lr-ada');
const shell = await hit(handleAppShell, '/api/app/shell?proof=1&env=core');

const tenantHits = {};
{
  const prevForTenant = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  tenantHits.overview = await hit(handleAppOverview, '/api/app/overview?env=core', tenant);
  tenantHits.queue = await hit(handleAppActionQueue, '/api/app/queue?env=core', tenant);
  tenantHits.clients = await hit(handleAppClients, '/api/app/clients?env=core', tenant);
  tenantHits.commercial = await hit(handleAppCommercial, '/api/app/commercial?env=core', tenant);
  tenantHits.delivery = await hit(handleAppDelivery, '/api/app/delivery?env=core', tenant);
  process.env.NODE_ENV = prevForTenant;
}

const items = Object.values(overview.body?.sections || {}).flatMap((section) =>
  Array.isArray(section.items) ? section.items : [],
);

const adaDelivery = (delivery.body?.items || []).find((row) => row.source_id === 'syn-772-lr-ada') || null;
const adaCommercial = (commercial.body?.rows || []).find((row) => row.prospect_id === 'syn-772-lr-ada') || null;

const matrix = items.map((item) => ({
  id: item.id,
  kind: item.kind,
  href: item.href,
  identity: item.identity || {},
}));

const failedLoadKind = operatingOverviewPanelKind({
  busy: false,
  error: 'overview_503',
  exceptionCount: 0,
  overviewOk: false,
});

const evidence = {
  current_main_sha: 'b731411734edb01b7dbb8d7e20247c5a7805983a',
  source_issue: 1219,
  proof_core_actor: buildProofCoreActor().can_core === true,
  shell: { status: shell.status, workspace: shell.body?.workspace_chrome?.workspace_id || shell.body?.workspace || null },
  http: {
    overview: overview.status,
    queue: queue.status,
    clients: clients.status,
    client_ada: client.status,
    commercial: commercial.status,
    delivery: delivery.status,
    prospect_ada: prospect.status,
  },
  tenant_fail_closed: Object.fromEntries(
    Object.entries(tenantHits).map(([key, value]) => [key, { status: value.status, error: value.error }]),
  ),
  identifiers: {
    prospect_id: 'syn-772-lr-ada',
    company_id: client.body?.client?.company_id || null,
    commercial_id: adaCommercial?.id || null,
    delivery_source_id: adaDelivery?.source_id || null,
    owner_prospect: prospect.body?.prospect?.owner || null,
    owner_commercial: adaCommercial?.owner || null,
    owner_delivery: adaDelivery?.owner || null,
    next_action_prospect: prospect.body?.prospect?.next_action || null,
    next_action_commercial: adaCommercial?.next_action || null,
    next_action_delivery: adaDelivery?.next_action || null,
  },
  route_matrix: matrix,
  canonical_routes: overview.body?.canonical_routes || {},
  failed_load: {
    panel_kind: failedLoadKind,
    error_copy_implies_false_clear: overviewErrorCopyImpliesFalseClear(OVERVIEW_LIST_ERROR_BODY),
  },
};

const tenantAll403 = Object.values(evidence.tenant_fail_closed).every(
  (row) => row.status === 403 && row.error === 'core_access_denied',
);
const hrefsCanonical = matrix.every((item) => {
  if (item.kind === 'prospect') return String(item.href).startsWith('/app/prospects/');
  if (item.kind === 'client') return String(item.href).startsWith('/app/clients/');
  if (item.kind === 'commercial') return String(item.href).startsWith('/app/commercial');
  if (item.kind === 'delivery') return String(item.href).startsWith('/app/delivery');
  return String(item.href).startsWith('/app/');
});

evidence.pass =
  overview.status === 200 &&
  queue.status === 200 &&
  clients.status === 200 &&
  client.status === 200 &&
  commercial.status === 200 &&
  delivery.status === 200 &&
  prospect.status === 200 &&
  tenantAll403 &&
  hrefsCanonical &&
  evidence.identifiers.company_id === 'cmp_ada_spa_synthetic' &&
  evidence.identifiers.delivery_source_id === 'syn-772-lr-ada' &&
  failedLoadKind === 'error' &&
  evidence.failed_load.error_copy_implies_false_clear === false;

fs.writeFileSync(path.join(OUT_DIR, 'probe.json'), JSON.stringify(evidence, null, 2));
process.env.NODE_ENV = prevNode;
if (prevVercel == null) delete process.env.VERCEL_ENV;
else process.env.VERCEL_ENV = prevVercel;

console.log(JSON.stringify({ wrote: path.join(OUT_DIR, 'probe.json'), pass: evidence.pass }, null, 2));
if (!evidence.pass) process.exit(1);
