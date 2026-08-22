import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { CORE_NAV_ITEMS, TENANT_NAV_ITEMS } from '../lib/app/constants.js';
import {
  CANONICAL_OPERATOR_PATH,
  classifyProspectOperationsRoute,
  legacyProspectHardRedirect,
  listRedirectedProspectRoutes,
  listRetiredProspectRoutes,
  listTemporaryProspectRoutes,
  PROSPECT_OPERATIONS_ROUTE_MATRIX,
  prospectLegacyDeprecationNotice,
} from '../lib/app/prospect-operations-route-matrix.js';

describe('prospect-operations-route-matrix #1040', () => {
  it('returns the exact canonical-route matrix', () => {
    const byPath = Object.fromEntries(PROSPECT_OPERATIONS_ROUTE_MATRIX.map((row) => [row.path, row]));
    assert.equal(byPath['/app/today'].disposition, 'CANONICAL');
    assert.equal(byPath['/app/queue'].disposition, 'CANONICAL');
    assert.equal(byPath['/app/workbench'].disposition, 'CANONICAL');
    assert.equal(byPath['/app/pipeline'].disposition, 'CANONICAL');
    assert.equal(byPath['/app/prospects/[id]'].disposition, 'CANONICAL');
    assert.equal(byPath['/admin/rapid-delivery'].disposition, 'TEMPORARY');
    assert.equal(byPath['/admin/lead-rescue'].disposition, 'TEMPORARY');
    assert.equal(byPath['/admin/lead-rescue/[id]'].disposition, 'TEMPORARY');
    assert.equal(byPath['/change/revenue'].disposition, 'TEMPORARY');
    assert.equal(byPath['/change'].disposition, 'CANONICAL');
    assert.equal(byPath['/change'].reason.includes('service-request'), true);
  });

  it('lists no hard redirects and no retirements in this slice', () => {
    assert.deepEqual(listRedirectedProspectRoutes(), []);
    assert.deepEqual(listRetiredProspectRoutes(), []);
    assert.equal(legacyProspectHardRedirect('/admin/rapid-delivery'), null);
    assert.equal(legacyProspectHardRedirect('/admin/lead-rescue/syn-772-lr-ada'), null);
    assert.equal(legacyProspectHardRedirect('/change/revenue'), null);
  });

  it('keeps unique capabilities on temporary desks and points to canonical replacements', () => {
    const temporary = listTemporaryProspectRoutes();
    assert.deepEqual(
      temporary.map((row) => row.path),
      ['/admin/rapid-delivery', '/admin/lead-rescue', '/admin/lead-rescue/[id]', '/change/revenue'],
    );
    const rapid = prospectLegacyDeprecationNotice('/admin/rapid-delivery');
    assert.equal(rapid.canonical_href, '/app/queue');
    assert.match(rapid.unique_capability, /proposal/i);
    const lead = prospectLegacyDeprecationNotice('/admin/lead-rescue/abc');
    assert.equal(lead.canonical_href, '/app/prospects/[id]');
    const revenue = prospectLegacyDeprecationNotice('/change/revenue');
    assert.equal(revenue.canonical_href, '/app/pipeline');
    assert.match(revenue.unique_capability, /localStorage/i);
  });

  it('keeps /change as tenant service-request, not staff prospect CRM', () => {
    const change = classifyProspectOperationsRoute('/change');
    assert.equal(change.disposition, 'CANONICAL');
    assert.equal(change.canonical_href, '/change');
    assert.match(change.unique_capability, /service-request/);
  });

  it('Operating Workspace nav contains one coherent path', () => {
    const hrefs = CORE_NAV_ITEMS.map((item) => item.href);
    assert.ok(hrefs.includes('/app/today'));
    assert.ok(hrefs.includes('/app/queue'));
    assert.ok(hrefs.includes('/app/workbench'));
    assert.ok(hrefs.includes('/app/pipeline'));
    assert.ok(hrefs.includes('/app/prospects'));
    assert.deepEqual([...CANONICAL_OPERATOR_PATH], [
      '/app/today',
      '/app/queue',
      '/app/workbench',
      '/app/pipeline',
      '/app/prospects/[id]',
    ]);
    assert.equal(
      TENANT_NAV_ITEMS.some((item) =>
        ['/app/today', '/app/queue', '/app/workbench', '/app/pipeline', '/app/prospects'].includes(
          String(item.href || ''),
        ),
      ),
      false,
    );
  });

  it('legacy desks render the shared deprecation banner', () => {
    const list = readFileSync(
      fileURLToPath(new URL('../components/AiLeadRescueAdminList.js', import.meta.url)),
      'utf8',
    );
    const detail = readFileSync(
      fileURLToPath(new URL('../components/AiLeadRescueAdminDetail.js', import.meta.url)),
      'utf8',
    );
    const rapid = readFileSync(
      fileURLToPath(new URL('../components/RapidDeliveryRevenueDesk.js', import.meta.url)),
      'utf8',
    );
    const revenue = readFileSync(fileURLToPath(new URL('../pages/change/revenue.js', import.meta.url)), 'utf8');
    assert.match(list, /ProspectLegacyDeprecationBanner/);
    assert.match(detail, /ProspectLegacyDeprecationBanner/);
    assert.match(rapid, /ProspectLegacyDeprecationBanner/);
    assert.match(rapid, /\/app\/queue/);
    assert.match(revenue, /ProspectLegacyDeprecationBanner/);
  });
});
