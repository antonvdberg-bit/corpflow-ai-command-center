/**
 * #1006 Tenant Workspace simplification — nav, chrome, fail-closed staff routes,
 * #884 expose-for-review boundary, and chooser redirect.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it, beforeEach } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { actorFromSessionPayload, buildProofTenantActor } from '../lib/app/access.js';
import { TENANT_NAV_ITEMS, REFERENCE_TENANT_ID } from '../lib/app/constants.js';
import {
  handleAppComponentReview,
  handleAppRequestDetail,
  handleAppShell,
  handleAppToday,
  tryHandleAppApi,
} from '../lib/app/handlers.js';
import { projectTenantRequest } from '../lib/app/project.js';
import { getAppRequest, resetRequestStore } from '../lib/app/request-store.js';
import {
  OPERATING_WORKSPACE_STAFF_PATHS,
  TENANT_NAV_RETIRED,
  TENANT_SERVICE_CHANGE_PATH,
  TENANT_WORKSPACE_PATH,
  TENANT_WORKSPACE_ROUTE_MATRIX,
  isOperatingWorkspaceStaffPath,
  staffMayUseChooserToEnterTenant,
  tenantChooserRedirectPath,
  tenantNavIsClientServiceOnly,
  tenantNavOmitsRetiredInternalItems,
} from '../lib/app/tenant-workspace.js';
import {
  APP_SHELL_CSS,
} from '../components/app/app-theme.js';
import { workspaceChromeForEnvironment } from '../lib/app/workspace-context.js';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

beforeEach(() => {
  resetRequestStore();
});

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

describe('tenant-workspace #1006 — nav matrix', () => {
  it('keeps only Requests & Progress and the existing /change service link', () => {
    assert.equal(tenantNavIsClientServiceOnly(), true);
    assert.equal(tenantNavOmitsRetiredInternalItems(), true);
    assert.deepEqual(
      TENANT_NAV_ITEMS.map((item) => item.id),
      ['requests_progress', 'service_change'],
    );
    const change = TENANT_NAV_ITEMS.find((item) => item.id === 'service_change');
    assert.equal(change?.href, TENANT_SERVICE_CHANGE_PATH);
  });

  it('documents retired tenant nav items without rendering them', () => {
    const retiredIds = TENANT_NAV_RETIRED.map((row) => row.id);
    assert.deepEqual(retiredIds, ['home', 'my_work', 'documents', 'reports', 'support']);
    for (const id of retiredIds) {
      assert.equal(
        TENANT_NAV_ITEMS.some((item) => item.id === id),
        false,
        `retired nav ${id} must not remain in TENANT_NAV_ITEMS`,
      );
    }
  });

  it('records retain / retire / redirect / fail-closed rows', () => {
    const byPath = Object.fromEntries(
      TENANT_WORKSPACE_ROUTE_MATRIX.map((row) => [row.path_or_nav, row.disposition]),
    );
    assert.equal(byPath['/app/tenant'], 'RETAINED');
    assert.equal(byPath['/change'], 'RETAINED');
    assert.equal(byPath['nav:requests_progress'], 'RETAINED');
    assert.equal(byPath['nav:service_change'], 'RETAINED');
    assert.equal(byPath['nav:home'], 'RETIRED');
    assert.equal(byPath['nav:my_work'], 'RETIRED');
    assert.equal(byPath['/app'], 'REDIRECT');
    assert.equal(byPath['/app/core'], 'STAFF_ONLY_FAIL_CLOSED');
    assert.equal(byPath['/app/today'], 'STAFF_ONLY_FAIL_CLOSED');
    assert.equal(byPath['/app/queue'], 'STAFF_ONLY_FAIL_CLOSED');
  });
});

describe('tenant-workspace #1006 — chrome and chooser', () => {
  it('hides the staff workspace switcher in Tenant chrome', () => {
    const chrome = workspaceChromeForEnvironment('tenant', { tenantLabel: 'CorpFlowAI' });
    assert.equal(chrome.show_switch, false);
    assert.equal(chrome.switch_href, '');
    const operating = workspaceChromeForEnvironment('core');
    assert.equal(operating.show_switch, true);
    assert.equal(operating.switch_href, '/app');
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
    assert.equal(isOperatingWorkspaceStaffPath('/app/prospects/syn-detail'), true);
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

  it('TenantMenu and tenant page no longer render retired placeholders', () => {
    const menuSrc = readFileSync(path.join(REPO_ROOT, 'components/app/TenantMenu.js'), 'utf8');
    const pageSrc = readFileSync(path.join(REPO_ROOT, 'pages/app/tenant.js'), 'utf8');
    assert.match(menuSrc, /TENANT_NAV_ITEMS/);
    assert.doesNotMatch(pageSrc, /tenant-placeholder-/);
    assert.doesNotMatch(pageSrc, /tenant-menu-documents|tenant-menu-reports|tenant-menu-support/);
    assert.doesNotMatch(menuSrc, /Home \/ Overview/);
    assert.doesNotMatch(menuSrc, /My Work/);
  });
});
