/**
 * #1006 — Tenant Workspace simplification.
 * Tenant users see only client-relevant request / review / /change surfaces.
 * Operating Workspace stays staff-only and fail-closed.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { actorFromSessionPayload, buildProofTenantActor } from '../lib/app/access.js';
import { APP_SHELL_CSS } from '../components/app/app-theme.js';
import { REFERENCE_TENANT_ID, TENANT_NAV_ITEMS } from '../lib/app/constants.js';
import {
  handleAppComponentReview,
  handleAppRequestDetail,
  handleAppShell,
  handleAppToday,
  tryHandleAppApi,
} from '../lib/app/handlers.js';
import { getAppRequest } from '../lib/app/request-store.js';
import { projectTenantRequest } from '../lib/app/project.js';
import {
  OPERATING_WORKSPACE_STAFF_PATHS,
  TENANT_SERVICE_CHANGE_PATH,
  TENANT_WORKSPACE_ROUTE_MATRIX,
  TENANT_WORKSPACE_SLICE_VERSION,
  isOperatingWorkspaceStaffPath,
  staffMayUseChooserToEnterTenant,
  tenantChooserRedirectPath,
  tenantChromeHidesWorkspaceChooser,
  tenantNavIsClientServiceOnly,
} from '../lib/app/tenant-workspace.js';
import { TENANT_WORKSPACE_PATH } from '../lib/app/tenant-journey.js';
import { workspaceChromeForEnvironment } from '../lib/app/workspace-context.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

describe('tenant-workspace #1006 — nav / route matrix', () => {
  it('keeps Requests & Progress and /change; records retired placeholders and chooser redirect', () => {
    assert.equal(TENANT_WORKSPACE_SLICE_VERSION, 'tenant-workspace-1006-v1');
    assert.equal(tenantNavIsClientServiceOnly(), true);
    assert.deepEqual(
      TENANT_NAV_ITEMS.map((item) => item.id),
      ['requests_progress', 'service_change'],
    );
    const service = TENANT_NAV_ITEMS.find((item) => item.id === 'service_change');
    assert.equal(String(service?.href || '').startsWith(TENANT_SERVICE_CHANGE_PATH), true);

    const byPath = Object.fromEntries(
      TENANT_WORKSPACE_ROUTE_MATRIX.map((row) => [row.path_or_nav, row.disposition]),
    );
    assert.equal(byPath['/app/tenant'], 'RETAINED');
    assert.equal(byPath['/change'], 'RETAINED');
    assert.equal(byPath['nav:requests_progress'], 'RETAINED');
    assert.equal(byPath['nav:service_change'], 'RETAINED');
    assert.equal(byPath['nav:home'], 'RETIRED');
    assert.equal(byPath['nav:my_work'], 'RETIRED');
    assert.equal(byPath['nav:documents'], 'RETIRED');
    assert.equal(byPath['nav:reports'], 'RETIRED');
    assert.equal(byPath['nav:support'], 'RETIRED');
    assert.equal(byPath['chrome:choose_workspace'], 'RETIRED');
    assert.equal(byPath['/app'], 'REDIRECT');
    assert.equal(byPath['/app/core'], 'STAFF_ONLY_FAIL_CLOSED');
    assert.equal(byPath['/app/clients'], 'STAFF_ONLY_FAIL_CLOSED');
    assert.equal(byPath['/app/commercial'], 'STAFF_ONLY_FAIL_CLOSED');
    assert.equal(byPath['/app/delivery'], 'STAFF_ONLY_FAIL_CLOSED');
  });

  it('hides the workspace chooser on Tenant chrome and keeps it for Operating Workspace', () => {
    const tenant = workspaceChromeForEnvironment('tenant', { tenantLabel: 'CorpFlowAI' });
    assert.equal(tenantChromeHidesWorkspaceChooser(tenant), true);
    assert.equal(tenant.show_switch, false);
    assert.equal(tenant.switch_href, '');
    const operating = workspaceChromeForEnvironment('core');
    assert.equal(operating.show_switch, true);
    assert.equal(operating.switch_href, '/app');
    assert.equal(tenantChromeHidesWorkspaceChooser(operating), false);
  });

  it('redirects a successful Tenant shell session away from the chooser', () => {
    assert.equal(tenantChooserRedirectPath(200), TENANT_WORKSPACE_PATH);
    assert.equal(tenantChooserRedirectPath(401), null);
    assert.equal(tenantChooserRedirectPath(403), null);
    assert.equal(tenantChooserRedirectPath(500), null);
  });

  it('lets staff use the chooser to enter Tenant without granting a tenant bypass', () => {
    assert.equal(
      staffMayUseChooserToEnterTenant({ actorEnvironment: 'core', canCore: true }),
      true,
    );
    assert.equal(
      staffMayUseChooserToEnterTenant({ actorEnvironment: 'tenant', canCore: false }),
      false,
    );
  });
});

describe('tenant-workspace #1006 — fail-closed staff routes', () => {
  it('classifies Operating Workspace page and API paths as staff-only', () => {
    for (const p of OPERATING_WORKSPACE_STAFF_PATHS) {
      assert.equal(isOperatingWorkspaceStaffPath(p), true, p);
    }
    assert.equal(isOperatingWorkspaceStaffPath('/app/tenant'), false);
    assert.equal(isOperatingWorkspaceStaffPath('/change'), false);
    assert.equal(isOperatingWorkspaceStaffPath('/app'), false);
    assert.equal(isOperatingWorkspaceStaffPath('/app/prospects/syn-detail'), true);
    assert.equal(isOperatingWorkspaceStaffPath('/app/clients/syn-client'), true);
    assert.equal(isOperatingWorkspaceStaffPath('/app/commercial'), true);
    assert.equal(isOperatingWorkspaceStaffPath('/api/app/commercial'), true);
    assert.equal(isOperatingWorkspaceStaffPath('/app/delivery'), true);
    assert.equal(isOperatingWorkspaceStaffPath('/api/app/delivery'), true);
    assert.equal(isOperatingWorkspaceStaffPath('/api/app/overview'), true);
  });

  it('denies a Tenant session on Today / My Work and other staff APIs', async () => {
    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
      const tenantActor = actorFromSessionPayload({
        typ: 'tenant',
        tenant_id: REFERENCE_TENANT_ID,
        username: 'tenant-user',
      });
      const routes = [
        ['/api/app/today?env=core', 'app/today'],
        ['/api/app/queue?env=core', 'app/queue'],
        ['/api/app/workbench?env=core', 'app/workbench'],
        ['/api/app/pipeline?env=core', 'app/pipeline'],
        ['/api/app/prospects?env=core', 'app/prospects'],
        ['/api/app/clients?env=core', 'app/clients'],
        ['/api/app/commercial?env=core', 'app/commercial'],
        ['/api/app/delivery?env=core', 'app/delivery'],
        ['/api/app/overview?env=core', 'app/overview'],
      ];
      for (const [url, pathSeg] of routes) {
        const res = mockRes();
        const handled = await tryHandleAppApi(
          { method: 'GET', url, headers: {}, __testAppActor: tenantActor },
          res,
          pathSeg,
        );
        assert.equal(handled, true, url);
        assert.equal(res.state.statusCode, 403, url);
        assert.equal(res.state.body.error, 'core_access_denied', url);
      }
    } finally {
      process.env.NODE_ENV = prevNode;
    }
  });

  it('denies Tenant proof against Core Today even when proof is requested', async () => {
    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
      const res = mockRes();
      await handleAppToday(
        {
          method: 'GET',
          url: '/api/app/today?env=core',
          headers: {},
          __testAppActor: buildProofTenantActor(),
        },
        res,
      );
      assert.equal(res.state.statusCode, 403);
      assert.equal(res.state.body.error, 'core_access_denied');
    } finally {
      process.env.NODE_ENV = prevNode;
    }
  });
});

describe('tenant-workspace #1006 — #884 expose-for-review preserved', () => {
  it('projects unexposed components as view-only and blocks tenant review', async () => {
    const req = getAppRequest('syn_slice1_req_corpflowai_001');
    assert.ok(req);
    const projected = projectTenantRequest(req);
    const exposed = (projected.components || []).filter((c) => c.exposed_for_client_review === true);
    const hidden = (projected.components || []).filter((c) => c.exposed_for_client_review !== true);
    assert.ok(exposed.length >= 1);
    assert.ok(hidden.length >= 1);
    for (const c of hidden) {
      assert.equal(c.view_only, true);
      assert.equal(c.review_enabled, false);
    }

    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
      const hiddenKey = hidden[0].key;
      const res = mockRes();
      await handleAppComponentReview(
        {
          method: 'POST',
          url: '/api/app/component-review',
          headers: {},
          __testAppActor: buildProofTenantActor(),
          body: {
            env: 'tenant',
            tenant_id: REFERENCE_TENANT_ID,
            request_id: 'syn_slice1_req_corpflowai_001',
            component_key: hiddenKey,
            decision: 'approve',
          },
        },
        res,
      );
      assert.equal(res.state.statusCode, 403);
      assert.equal(res.state.body.error, 'component_not_exposed');
    } finally {
      process.env.NODE_ENV = prevNode;
    }
  });

  it('still returns tenant request detail without staff-only nav concepts', async () => {
    const prevNode = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      const shell = mockRes();
      await handleAppShell(
        {
          method: 'GET',
          url: '/api/app/shell?proof=1&env=tenant&tenant_id=corpflowai',
          headers: {},
        },
        shell,
      );
      assert.equal(shell.state.statusCode, 200);
      const menuIds = shell.state.body.menus.map((m) => m.id);
      assert.deepEqual(menuIds, ['requests_progress', 'service_change']);
      assert.equal(shell.state.body.workspace.show_switch, false);

      const detail = mockRes();
      await handleAppRequestDetail(
        {
          method: 'GET',
          url: '/api/app/request?proof=1&env=tenant&tenant_id=corpflowai&id=syn_slice1_req_corpflowai_001',
          headers: {},
        },
        detail,
      );
      assert.equal(detail.state.statusCode, 200);
      assert.ok(detail.state.body.request);
      assert.equal(detail.state.body.request.scope, 'tenant');
    } finally {
      process.env.NODE_ENV = prevNode;
    }
  });
});

describe('tenant-workspace #1006 — desktop / mobile layout contract', () => {
  it('keeps chrome and tenant nav wrapping on narrow viewports', () => {
    assert.match(APP_SHELL_CSS, /\.cf-app-chrome[\s\S]*flex-wrap:\s*wrap/);
    assert.match(APP_SHELL_CSS, /\.cf-app-scope-row[\s\S]*flex-wrap:\s*wrap/);
    assert.match(APP_SHELL_CSS, /@media \(max-width: 640px\)/);
    assert.ok(TENANT_NAV_ITEMS.length <= 3);
    for (const item of TENANT_NAV_ITEMS) {
      assert.ok(String(item.label).length <= 28, item.label);
    }
  });

  it('Tenant chrome and chooser no longer leak Operating Workspace into tenant context', () => {
    const shellSrc = readFileSync(path.join(REPO_ROOT, 'components/app/AppShell.js'), 'utf8');
    const chooserSrc = readFileSync(path.join(REPO_ROOT, 'pages/app/index.js'), 'utf8');
    const tenantSrc = readFileSync(path.join(REPO_ROOT, 'pages/app/tenant.js'), 'utf8');
    const menuSrc = readFileSync(path.join(REPO_ROOT, 'components/app/TenantMenu.js'), 'utf8');
    assert.match(shellSrc, /show_switch/);
    assert.match(chooserSrc, /tenantChooserRedirectPath/);
    assert.match(chooserSrc, /chooser-tenant-check/);
    assert.doesNotMatch(tenantSrc, />Open Core</);
    assert.doesNotMatch(tenantSrc, /Back to chooser/);
    assert.doesNotMatch(tenantSrc, /no Core menu/);
    assert.doesNotMatch(tenantSrc, /Staff workspace chooser/);
    assert.doesNotMatch(tenantSrc, /proof-harness-hint/);
    assert.doesNotMatch(tenantSrc, /tenant-data-source/);
    assert.doesNotMatch(tenantSrc, /Choose workspace/);
    assert.doesNotMatch(menuSrc, /Home \/ Overview/);
    assert.doesNotMatch(menuSrc, /My Work/);
  });
});
