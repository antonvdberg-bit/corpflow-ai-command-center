import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  canonicalRedirectForLegacyAdminPath,
  everyRequiredLegacyCapabilityHasCanonicalHome,
  LEGACY_ROUTE_CAPABILITY_MATRIX,
  LEGACY_ROUTE_WAVE1_STATUS,
  noTemporaryLegacyRouteRemainsInWave1,
  wave1StatusForLegacyPath,
} from '../lib/app/legacy-route-retirement.js';
import { ACTION_QUEUE_PATH, classifyWorkspaceSurface } from '../lib/app/workspace-context.js';

function read(rel) {
  return readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), 'utf8');
}

describe('#1074 legacy route capability parity', () => {
  it('covers all three in-scope legacy surfaces with UNIQUE / REPLACED / OBSOLETE only', () => {
    const paths = new Set(LEGACY_ROUTE_CAPABILITY_MATRIX.map((row) => row.legacy_path));
    assert.equal(paths.has('/admin/rapid-delivery'), true);
    assert.equal(paths.has('/admin/lead-rescue'), true);
    assert.equal(paths.has('/admin/lead-rescue/[id]'), true);
    assert.equal(paths.has('/change/revenue'), true);
    for (const row of LEGACY_ROUTE_CAPABILITY_MATRIX) {
      assert.ok(['UNIQUE', 'REPLACED', 'OBSOLETE'].includes(row.parity), row.capability);
    }
    assert.equal(everyRequiredLegacyCapabilityHasCanonicalHome(), true);
  });

  it('wave-1 outcomes are REDIRECTED or RETIRED with exact reasons — no TEMPORARY leftover', () => {
    assert.equal(noTemporaryLegacyRouteRemainsInWave1(), true);
    const byPath = Object.fromEntries(LEGACY_ROUTE_WAVE1_STATUS.map((row) => [row.path, row]));
    assert.equal(byPath['/admin/rapid-delivery'].status, 'REDIRECTED');
    assert.equal(byPath['/admin/rapid-delivery'].canonical_path, ACTION_QUEUE_PATH);
    assert.equal(byPath['/admin/lead-rescue'].status, 'REDIRECTED');
    assert.match(byPath['/admin/lead-rescue'].canonical_path, /\/app\/workbench/);
    assert.equal(byPath['/admin/lead-rescue/[id]'].status, 'REDIRECTED');
    assert.equal(byPath['/change/revenue'].status, 'RETIRED');
    assert.match(byPath['/change/revenue'].reason, /localStorage/);
    assert.match(byPath['/change/revenue'].reason, /Tenant/);
  });

  it('admin redirects preserve canonical destinations and do not open-redirect', () => {
    assert.equal(canonicalRedirectForLegacyAdminPath('/admin/rapid-delivery'), '/app/queue');
    assert.equal(
      canonicalRedirectForLegacyAdminPath('/admin/lead-rescue'),
      '/app/workbench?filter=lead_rescue',
    );
    assert.equal(
      canonicalRedirectForLegacyAdminPath('/admin/lead-rescue/syn-772-lr-ada', { id: 'syn-772-lr-ada' }),
      '/app/prospects/syn-772-lr-ada',
    );
    assert.equal(wave1StatusForLegacyPath('/admin/lead-rescue/abc')?.status, 'REDIRECTED');
    assert.equal(classifyWorkspaceSurface('/change')?.disposition, 'CANONICAL');
  });

  it('admin pages keep the session gate and 302 after auth', () => {
    const rapid = read('pages/admin/rapid-delivery/index.js');
    const list = read('pages/admin/lead-rescue/index.js');
    const detail = read('pages/admin/lead-rescue/[id].js');
    for (const src of [rapid, list, detail]) {
      assert.match(src, /requireAdminPageSession/);
      assert.match(src, /canonicalRedirectForLegacyAdminPath/);
      assert.match(src, /permanent:\s*false/);
    }
  });

  it('retired /change/revenue has no localStorage pipeline and shows the notice', () => {
    const revenue = read('pages/change/revenue.js');
    assert.doesNotMatch(revenue, /localStorage\s*\./);
    assert.doesNotMatch(revenue, /corpflow\.revenue\.cockpit/);
    assert.match(revenue, /data-testid="legacy-route-retirement-notice"/);
    assert.match(revenue, /data-legacy-status="RETIRED"/);
    assert.match(revenue, /data-market-enquiry-handoff/);
    assert.match(revenue, /\/app\/pipeline/);
    assert.match(revenue, /\/app\/prospects/);
    assert.match(revenue, /Tenant Workspace stays on/);
    assert.match(revenue, /\/change remains/);
    assert.match(revenue, /overflowWrap:\s*'anywhere'/);
  });

  it('shared detail hosts the extracted unique contracts', () => {
    const panel = read('components/app/ProspectDetailPanel.js');
    assert.match(panel, /LeadRescueSetupChecklistPanel/);
    assert.match(panel, /LeadRescueActivityPanel/);
    assert.match(panel, /RapidDeliveryProposalPanel/);
    assert.doesNotMatch(panel, /Temporary product desk/);
    const checklist = read('components/app/LeadRescueSetupChecklistPanel.js');
    assert.match(checklist, /setup_checklist_item/);
    assert.doesNotMatch(checklist, /WhatsApp, email, WhatsApp/);
    const activity = read('components/app/LeadRescueActivityPanel.js');
    assert.match(activity, /activity_append/);
    assert.match(activity, /does not send/);
    const proposal = read('components/app/RapidDeliveryProposalPanel.js');
    assert.match(proposal, /Copy proposal summary/);
    assert.match(proposal, /does not email/);
  });

  it('staff Operating Workspace copy no longer treats product desks as live destinations', () => {
    const list = read('components/app/ProspectOperationsList.js');
    const workbench = read('components/app/ProspectWorkbench.js');
    const pipeline = read('components/app/ProspectPipelineBoard.js');
    assert.doesNotMatch(list, /href="\/admin\/rapid-delivery"/);
    assert.doesNotMatch(list, /href="\/admin\/lead-rescue"/);
    assert.doesNotMatch(list, /Temporary product desk/);
    assert.match(workbench, /redirects here/);
    assert.match(pipeline, /notice only/);
  });
});
