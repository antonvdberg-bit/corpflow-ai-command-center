import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CORE_NAV_ITEMS, TENANT_NAV_ITEMS } from '../lib/app/constants.js';
import {
  OPERATING_WORKSPACE_LABEL,
  PROSPECT_OPERATIONS_PATH,
  TENANT_WORKSPACE_LABEL,
  TODAY_MY_WORK_PATH,
  WORKSPACE_SURFACE_MATRIX,
  canAccessOperatingWorkspace,
  classifyWorkspaceSurface,
  isProspectOperationsPath,
  isProspectSharedDetailPath,
  isTodayMyWorkPath,
  navIncludesProspectOperations,
  navIncludesTodayMyWork,
  operatingNavIncludesProspectOperations,
  operatingNavIncludesTodayMyWork,
  tenantNavOmitsProspectOperations,
  tenantNavOmitsTodayMyWork,
  workspaceChromeForEnvironment,
  workspaceIdForEnvironment,
} from '../lib/app/workspace-context.js';

describe('workspace-context — identity', () => {
  it('maps Core environment to Operating Workspace product names', () => {
    assert.equal(workspaceIdForEnvironment('core'), 'operating');
    const chrome = workspaceChromeForEnvironment('core');
    assert.equal(chrome.workspace_label, OPERATING_WORKSPACE_LABEL);
    assert.equal(chrome.tenant_chip_label, '—');
    assert.equal(chrome.switch_href, '/app');
  });

  it('maps Tenant environment to Tenant Workspace product names', () => {
    assert.equal(workspaceIdForEnvironment('tenant'), 'tenant');
    const chrome = workspaceChromeForEnvironment('tenant', { tenantLabel: 'CorpFlowAI' });
    assert.equal(chrome.workspace_label, TENANT_WORKSPACE_LABEL);
    assert.equal(chrome.tenant_chip_label, 'CorpFlowAI');
  });

  it('treats Operating Workspace access as Core-only', () => {
    assert.equal(
      canAccessOperatingWorkspace({
        can_core: true,
        environment: 'core',
      }),
      true,
    );
    assert.equal(
      canAccessOperatingWorkspace({
        can_core: false,
        environment: 'tenant',
        can_tenant_ids: ['corpflowai'],
      }),
      false,
    );
  });
});

describe('workspace-context — prospect ops boundary', () => {
  it('recognises the first Prospect Operations route', () => {
    assert.equal(isProspectOperationsPath('/app/prospects'), true);
    assert.equal(isProspectOperationsPath('/app/prospects/syn-772-lr-ada'), true);
    assert.equal(isProspectSharedDetailPath('/app/prospects/syn-772-lr-ada'), true);
    assert.equal(isProspectSharedDetailPath('/api/app/prospect'), true);
    assert.equal(isProspectSharedDetailPath('/app/prospects'), false);
    assert.equal(isProspectOperationsPath('/api/app/prospects'), true);
    assert.equal(isProspectOperationsPath('/app/tenant'), false);
    assert.equal(PROSPECT_OPERATIONS_PATH, '/app/prospects');
  });

  it('includes Prospects on Operating Workspace nav and omits it from Tenant nav', () => {
    assert.equal(operatingNavIncludesProspectOperations(), true);
    assert.equal(tenantNavOmitsProspectOperations(), true);
    assert.equal(navIncludesProspectOperations(CORE_NAV_ITEMS), true);
    assert.equal(navIncludesProspectOperations(TENANT_NAV_ITEMS), false);
  });
});

describe('workspace-context — Today / My Work boundary', () => {
  it('recognises the Today / My Work landing', () => {
    assert.equal(isTodayMyWorkPath('/app/today'), true);
    assert.equal(isTodayMyWorkPath('/api/app/today'), true);
    assert.equal(isTodayMyWorkPath('/app/prospects'), false);
    assert.equal(TODAY_MY_WORK_PATH, '/app/today');
  });

  it('points Operating Workspace My Work at /app/today and keeps Tenant My Work as a placeholder', () => {
    assert.equal(operatingNavIncludesTodayMyWork(), true);
    assert.equal(tenantNavOmitsTodayMyWork(), true);
    assert.equal(navIncludesTodayMyWork(CORE_NAV_ITEMS), true);
    assert.equal(navIncludesTodayMyWork(TENANT_NAV_ITEMS), false);
    const tenantMyWork = TENANT_NAV_ITEMS.find((item) => item.id === 'my_work');
    assert.equal(tenantMyWork?.href, null);
  });
});

describe('workspace-context — surface matrix', () => {
  it('classifies required #772 surfaces', () => {
    assert.equal(classifyWorkspaceSurface('/app/core')?.disposition, 'CANONICAL');
    assert.equal(classifyWorkspaceSurface('/app/tenant')?.disposition, 'CANONICAL');
    assert.equal(classifyWorkspaceSurface('/app/prospects')?.disposition, 'CANONICAL');
    assert.equal(classifyWorkspaceSurface('/app/today')?.disposition, 'CANONICAL');
    assert.equal(classifyWorkspaceSurface('/app/prospects/syn-772-lr-ada')?.path, '/app/prospects/[id]');
    assert.equal(classifyWorkspaceSurface('/admin/rapid-delivery')?.disposition, 'MIGRATE');
    assert.equal(classifyWorkspaceSurface('/admin/lead-rescue')?.disposition, 'MIGRATE');
    assert.equal(classifyWorkspaceSurface('/admin/lead-rescue/abc')?.disposition, 'MIGRATE');
    assert.equal(classifyWorkspaceSurface('/change/revenue')?.disposition, 'MIGRATE');
    assert.equal(classifyWorkspaceSurface('/change')?.disposition, 'CANONICAL');
    assert.equal(classifyWorkspaceSurface('/change/lux-feedback')?.disposition, 'TEMPORARY');
    assert.equal(classifyWorkspaceSurface('/admin/company-master')?.disposition, 'REUSE');
  });

  it('keeps /change canonical and does not retire product desks in this slice', () => {
    const retired = WORKSPACE_SURFACE_MATRIX.filter((row) => row.disposition === 'RETIRE');
    assert.equal(retired.length, 0);
    assert.ok(WORKSPACE_SURFACE_MATRIX.some((row) => row.path === '/change/revenue'));
  });
});
