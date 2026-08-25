/**
 * #1075 — integrated application release qualification.
 * Synthetic staff + tenant journeys on current-main handlers. No schema.
 * Does not implement open later-slice PRs.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, beforeEach } from 'node:test';

import {
  actorFromSessionPayload,
  buildProofTenantActor,
} from '../lib/app/access.js';
import {
  FINAL_VERDICT,
  LIVE_PROBE,
  OPEN_LATER_SLICES,
  RECORD_SOURCES_OF_TRUTH,
  RELEASE_QUALIFICATION_ISSUE,
  STAFF_DEMO_PATH,
  STAFF_ONLY_API_PATHS,
  TENANT_DEMO_PATH,
  CONSOLIDATED_ROUTE_MATRIX,
  needsWorkspaceEscape,
  noSecondCrmOnCurrentMain,
  qualifyConsolidatedRoute,
} from '../lib/app/consolidated-release-qualification.js';
import {
  CANONICAL_REQUEST_ID,
  OTHER_TENANT_ID,
  OTHER_TENANT_REQUEST_ID,
  REFERENCE_TENANT_ID,
} from '../lib/app/constants.js';
import {
  handleAppActionQueue,
  handleAppClientDetail,
  handleAppClients,
  handleAppComponentExpose,
  handleAppComponentReview,
  handleAppProspectDetail,
  handleAppRequestDetail,
  handleAppRequestsList,
  handleAppShell,
  handleAppToday,
  tryHandleAppApi,
} from '../lib/app/handlers.js';
import { resetProspectFixtureStore } from '../lib/app/prospect-operations-workspace.js';
import { resetRequestStore } from '../lib/app/request-store.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

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

function withProofEnv(fn) {
  return async () => {
    const prevNode = process.env.NODE_ENV;
    const prevVercel = process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'development';
    delete process.env.VERCEL_ENV;
    resetProspectFixtureStore();
    resetRequestStore();
    try {
      await fn();
    } finally {
      process.env.NODE_ENV = prevNode;
      if (prevVercel == null) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prevVercel;
    }
  };
}

beforeEach(() => {
  resetRequestStore();
  resetProspectFixtureStore();
});

test('qualification packet names #1075 and keeps later slices as open dependencies', () => {
  assert.equal(RELEASE_QUALIFICATION_ISSUE, '#1075');
  assert.equal(FINAL_VERDICT, 'CORPFLOWAI CONSOLIDATED APPLICATION READY FOR OPERATOR REVIEW');
  assert.equal(LIVE_PROBE.environment, 'corpflow_test');
  const issues = OPEN_LATER_SLICES.map((row) => row.issue);
  assert.ok(issues.includes('#1004'));
  assert.ok(issues.includes('#1005'));
  assert.ok(issues.includes('#1072'));
  assert.ok(issues.includes('#1073'));
  assert.ok(issues.includes('#1074'));
  assert.equal(qualifyConsolidatedRoute('/app/commercial')?.live_status, 'NOT_LIVE');
  assert.equal(qualifyConsolidatedRoute('/app/delivery')?.live_status, 'NOT_LIVE');
});

test('route matrix covers required surfaces with LIVE / NOT_LIVE and a source of truth', () => {
  const byPath = Object.fromEntries(CONSOLIDATED_ROUTE_MATRIX.map((row) => [row.path, row]));
  for (const path of [
    '/app',
    '/app/core',
    '/app/tenant',
    '/app/today',
    '/app/queue',
    '/app/workbench',
    '/app/pipeline',
    '/app/prospects',
    '/app/prospects/[id]',
    '/app/clients',
    '/app/clients/[id]',
    '/change',
  ]) {
    const row = byPath[path];
    assert.ok(row, `missing matrix row ${path}`);
    assert.equal(row.live_status, 'LIVE');
    assert.equal(row.disposition, 'CANONICAL');
    assert.ok(String(row.canonical_purpose || '').length > 8);
    assert.ok(String(row.auth_boundary || '').length > 8);
    assert.ok(String(row.source_of_truth || '').length > 3);
    assert.ok(String(row.desktop_mobile || '').length > 3);
  }
  assert.equal(byPath['/app/commercial'].live_status, 'NOT_LIVE');
  assert.equal(byPath['/app/delivery'].live_status, 'NOT_LIVE');
  assert.equal(byPath['/change/revenue'].disposition, 'MIGRATE');
  assert.equal(byPath['/admin/lead-rescue'].disposition, 'MIGRATE');
  assert.equal(qualifyConsolidatedRoute('/app/prospects/syn-772-lr-ada')?.path, '/app/prospects/[id]');
  assert.equal(qualifyConsolidatedRoute('/app/clients/cmp_ada_spa_synthetic')?.path, '/app/clients/[id]');
});

test('D: no second CRM / client / project / ticket source of truth', () => {
  assert.equal(noSecondCrmOnCurrentMain(), true);
  const types = RECORD_SOURCES_OF_TRUTH.map((row) => row.record_type).sort();
  assert.deepEqual(types, ['cmp_tickets', 'company_master', 'leads']);
  const prospectCanonical = RECORD_SOURCES_OF_TRUTH.find((row) => row.domain === 'prospects');
  assert.ok(prospectCanonical.canonical_routes.includes('/app/queue'));
  assert.ok(prospectCanonical.not_canonical.includes('/change/revenue'));
});

test(
  'A: staff Today → Queue → Prospect → Client → Commercial → Delivery uses the same records',
  withProofEnv(async () => {
    const today = mockRes();
    await handleAppToday({ method: 'GET', url: '/api/app/today?proof=1&env=core', headers: {} }, today);
    assert.equal(today.state.statusCode, 200);
    assert.equal(today.state.body.workspace, 'operating');
    assert.equal(today.state.body.external_send, false);

    const queue = mockRes();
    await handleAppActionQueue(
      { method: 'GET', url: '/api/app/queue?proof=1&env=core&filter=all', headers: {} },
      queue,
    );
    assert.equal(queue.state.statusCode, 200);
    const queueIds = queue.state.body.prospects.map((row) => row.id);
    assert.ok(queueIds.includes('syn-772-lr-ada'));
    const queuedAda = queue.state.body.prospects.find((row) => row.id === 'syn-772-lr-ada');
    assert.equal(queuedAda.shared_detail_path, '/app/prospects/syn-772-lr-ada');

    const prospect = mockRes();
    await handleAppProspectDetail(
      { method: 'GET', url: '/api/app/prospect?proof=1&env=core&id=syn-772-lr-ada', headers: {} },
      prospect,
    );
    assert.equal(prospect.state.statusCode, 200);
    assert.equal(prospect.state.body.prospect.id, 'syn-772-lr-ada');
    assert.equal(prospect.state.body.prospect.organisation_name, 'Ada Spa');
    assert.ok(prospect.state.body.prospect.commercial_clearance);
    assert.equal(prospect.state.body.external_send, false);
    assert.equal(JSON.stringify(prospect.state.body).includes('qualificationJson'), false);

    const clients = mockRes();
    await handleAppClients({ method: 'GET', url: '/api/app/clients?proof=1&env=core', headers: {} }, clients);
    assert.equal(clients.state.statusCode, 200);
    const adaClient = clients.state.body.clients.find((row) => row.company_id === 'cmp_ada_spa_synthetic');
    assert.ok(adaClient);
    assert.ok(adaClient.related_prospects.some((row) => row.id === 'syn-772-lr-ada'));
    assert.equal(adaClient.related_prospects.find((row) => row.id === 'syn-772-lr-ada').shared_detail_path, '/app/prospects/syn-772-lr-ada');

    const client = mockRes();
    await handleAppClientDetail(
      { method: 'GET', url: '/api/app/client?proof=1&env=core&id=cmp_ada_spa_synthetic', headers: {} },
      client,
    );
    assert.equal(client.state.statusCode, 200);
    assert.equal(client.state.body.client.company_id, 'cmp_ada_spa_synthetic');
    assert.equal(client.state.body.client.commercial_references.existing_identity_path, '/admin/company-master');
    assert.equal(client.state.body.client.delivery_references.existing_delivery_path, '/change');
    assert.equal(client.state.body.schema_change, false);

    const wr = mockRes();
    await handleAppProspectDetail(
      { method: 'GET', url: '/api/app/prospect?proof=1&env=core&id=syn-716-wr-cleared', headers: {} },
      wr,
    );
    assert.equal(wr.state.statusCode, 200);
    assert.ok(wr.state.body.prospect.website_rescue_delivery);
    assert.equal(STAFF_DEMO_PATH[3].path, '/app/prospects/syn-772-lr-ada');
    assert.equal(STAFF_DEMO_PATH[4].path, '/app/clients/cmp_ada_spa_synthetic');
  }),
);

test(
  'B: tenant Tenant Workspace → request/progress → exposed review → /change sibling',
  withProofEnv(async () => {
    const shell = mockRes();
    await handleAppShell(
      { method: 'GET', url: '/api/app/shell?proof=1&env=tenant&tenant_id=corpflowai', headers: {} },
      shell,
    );
    assert.equal(shell.state.statusCode, 200);
    assert.equal(shell.state.body.workspace.workspace_id, 'tenant');
    assert.equal(shell.state.body.selected.tenant_id, REFERENCE_TENANT_ID);
    assert.equal(
      shell.state.body.menus.some((item) => item.href === '/app/prospects' || item.href === '/app/queue'),
      false,
    );

    const list = mockRes();
    await handleAppRequestsList(
      { method: 'GET', url: '/api/app/requests?proof=1&env=tenant&tenant_id=corpflowai', headers: {} },
      list,
    );
    assert.equal(list.state.statusCode, 200);
    assert.ok(list.state.body.requests.some((row) => row.request_id === CANONICAL_REQUEST_ID));
    const blob = JSON.stringify(list.state.body);
    assert.equal(blob.includes('internal_note'), false);
    assert.equal(blob.includes('commit_sha'), false);

    const detail = mockRes();
    await handleAppRequestDetail(
      {
        method: 'GET',
        url: `/api/app/request?proof=1&env=tenant&tenant_id=corpflowai&id=${CANONICAL_REQUEST_ID}`,
        headers: {},
      },
      detail,
    );
    assert.equal(detail.state.statusCode, 200);
    assert.equal(detail.state.body.request.request_id, CANONICAL_REQUEST_ID);
    const landing = (detail.state.body.request.components || []).find((row) => row.key === 'landing_copy');
    assert.ok(landing);
    assert.equal(landing.exposed_for_client_review, true);

    const review = mockRes();
    await handleAppComponentReview(
      {
        method: 'POST',
        url: '/api/app/component-review',
        headers: { 'x-corpflow-app-proof': '1' },
        body: {
          request_id: CANONICAL_REQUEST_ID,
          component_key: 'landing_copy',
          decision: 'approve',
          comment: 'synthetic tenant approve',
          tenant_id: REFERENCE_TENANT_ID,
          env: 'tenant',
        },
      },
      review,
    );
    assert.equal(review.state.statusCode, 200);
    assert.equal(review.state.body.external_send, false);

    const coreSee = mockRes();
    await handleAppRequestDetail(
      {
        method: 'GET',
        url: `/api/app/request?proof=1&env=core&id=${CANONICAL_REQUEST_ID}`,
        headers: {},
      },
      coreSee,
    );
    assert.equal(coreSee.state.statusCode, 200);
    const coreLanding = (coreSee.state.body.request.components || []).find((row) => row.key === 'landing_copy');
    assert.ok(coreLanding);
    assert.equal(TENANT_DEMO_PATH[3].path, '/change');
  }),
);

test('C: staff-only APIs fail closed to tenant users and cross-tenant access fails closed', async () => {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'test';
  delete process.env.VERCEL_ENV;
  try {
    const tenantActor = actorFromSessionPayload({
      typ: 'tenant',
      tenant_id: REFERENCE_TENANT_ID,
      username: 'tenant-user',
    });
    const apiSeg = {
      '/api/app/today': 'app/today',
      '/api/app/queue': 'app/queue',
      '/api/app/workbench': 'app/workbench',
      '/api/app/pipeline': 'app/pipeline',
      '/api/app/prospects': 'app/prospects',
      '/api/app/prospect': 'app/prospect',
      '/api/app/clients': 'app/clients',
      '/api/app/client': 'app/client',
      '/api/app/component-expose': 'app/component-expose',
    };
    assert.deepEqual(Object.keys(apiSeg).sort(), [...STAFF_ONLY_API_PATHS].sort());
    for (const [urlPath, seg] of Object.entries(apiSeg)) {
      const res = mockRes();
      const method = urlPath.endsWith('component-expose') ? 'POST' : 'GET';
      await tryHandleAppApi(
        {
          method,
          url: `${urlPath}?env=core&id=syn-772-lr-ada`,
          headers: {},
          __testAppActor: tenantActor,
          body: { request_id: CANONICAL_REQUEST_ID, component_key: 'landing_copy', exposed: true },
        },
        res,
        seg,
      );
      assert.equal(res.state.statusCode, 403, `${urlPath} should 403 for tenant`);
      assert.equal(res.state.body.error, 'core_access_denied');
    }

    const otherTenant = mockRes();
    await handleAppRequestDetail(
      {
        method: 'GET',
        url: `/api/app/request?proof=1&env=tenant&tenant_id=${REFERENCE_TENANT_ID}&id=${OTHER_TENANT_REQUEST_ID}`,
        headers: {},
      },
      otherTenant,
    );
    assert.equal(otherTenant.state.statusCode, 404);
    assert.equal(otherTenant.state.body.error, 'request_not_found');

    const crossEnv = mockRes();
    await handleAppShell(
      {
        method: 'GET',
        url: `/api/app/shell?env=tenant&tenant_id=${OTHER_TENANT_ID}`,
        headers: {},
        __testAppActor: buildProofTenantActor(),
      },
      crossEnv,
    );
    assert.equal(crossEnv.state.statusCode, 403);
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
});

test('chrome stays workspace/tenant/role distinct across Operating vs Tenant shells', withProofEnv(async () => {
  const core = mockRes();
  await handleAppShell({ method: 'GET', url: '/api/app/shell?proof=1&env=core', headers: {} }, core);
  assert.equal(core.state.statusCode, 200);
  assert.equal(core.state.body.workspace.workspace_label, 'CorpFlowAI Operating Workspace');
  assert.equal(core.state.body.selected.role, 'core_operator');
  assert.equal(core.state.body.workspace.switch_href, '/app');

  const tenant = mockRes();
  await handleAppShell(
    { method: 'GET', url: '/api/app/shell?proof=1&env=tenant&tenant_id=corpflowai', headers: {} },
    tenant,
  );
  assert.equal(tenant.state.statusCode, 200);
  assert.equal(tenant.state.body.workspace.workspace_label, 'Tenant Workspace — CorpFlowAI');
  assert.equal(tenant.state.body.selected.tenant_id, REFERENCE_TENANT_ID);
  assert.equal(tenant.state.body.selected.role, 'tenant_member');
  assert.notEqual(core.state.body.workspace.workspace_id, tenant.state.body.workspace.workspace_id);
}));

test('primary pages keep loading / empty / error / mobile tokens', () => {
  const pages = [
    'pages/app/today.js',
    'pages/app/queue.js',
    'pages/app/workbench.js',
    'pages/app/pipeline.js',
    'pages/app/prospects.js',
    'pages/app/clients.js',
    'pages/app/core.js',
    'pages/app/tenant.js',
    'pages/app/prospects/[id].js',
    'pages/app/clients/[id].js',
  ];
  for (const rel of pages) {
    const src = readFileSync(join(ROOT, rel), 'utf8');
    assert.ok(src.includes('AppLoadState'), `${rel} missing AppLoadState`);
    assert.ok(src.includes('kind="loading"'), `${rel} missing loading`);
    assert.ok(src.includes('authRequired'), `${rel} missing auth empty/sign-in`);
    assert.ok(src.includes('accessDenied'), `${rel} missing access-denied`);
  }
  const list = readFileSync(join(ROOT, 'components/app/ProspectOperationsList.js'), 'utf8');
  assert.ok(list.includes('-empty'));
  const clients = readFileSync(join(ROOT, 'components/app/ClientsSummary.js'), 'utf8');
  assert.ok(clients.includes('clients-empty'));
  const tenantProgress = readFileSync(join(ROOT, 'components/app/TenantRequestsProgress.js'), 'utf8');
  assert.ok(tenantProgress.includes('tenant-requests-empty'));
  const theme = readFileSync(join(ROOT, 'components/app/app-theme.js'), 'utf8');
  assert.ok(theme.includes('@media (max-width: 640px)'));
  assert.ok(theme.includes('overflow-x: auto'));
  assert.ok(theme.includes('flex-wrap: wrap'));
});

test('unknown /app /admin /change URLs offer a workspace escape', () => {
  assert.equal(needsWorkspaceEscape('/app/commercial'), true);
  assert.equal(needsWorkspaceEscape('/admin/lead-rescue'), true);
  assert.equal(needsWorkspaceEscape('/change/revenue'), true);
  assert.equal(needsWorkspaceEscape('/'), false);
  const notFound = readFileSync(join(ROOT, 'pages/404.js'), 'utf8');
  assert.ok(notFound.includes('needsWorkspaceEscape'));
  assert.ok(notFound.includes('/app'));
  const missing = readFileSync(join(ROOT, 'components/app/ProspectDetailPanel.js'), 'utf8');
  assert.ok(missing.includes('prospect-detail-missing-actions'));
  assert.ok(missing.includes('/app/prospects'));
});
