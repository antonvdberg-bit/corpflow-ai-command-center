/**
 * Issue #704 — Lux operator control orientation vs public client site.
 * Source-level + helper guards. No DB/schema/env; no public site edits.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LUX_LEAD_CRM_STAGES,
} from '../lib/cmp/_lib/lux-lead-operator-workflow.js';
import {
  LUX_OPERATOR_CONTROL_NOT_PUBLIC_NOTICE,
  LUX_OPERATOR_CONTROL_PURPOSE,
  LUX_OPERATOR_CONTROL_SPACE_TITLE,
  LUX_OPERATOR_CONTROL_TENANT_ID,
  LUX_OPERATOR_CRM_WORKSPACE_HASH,
  LUX_OPERATOR_JAN_TEST_CHECKLIST,
  LUX_OPERATOR_CONCIERGE_PATH,
  buildLuxOperatorOrientationTokens,
  shouldShowLuxOperatorControlOrientation,
} from '../lib/client/lux-operator-control-orientation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function readRepo(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}

test('#704 orientation copy names operator space and rejects public-site confusion', () => {
  assert.equal(LUX_OPERATOR_CONTROL_TENANT_ID, 'luxe-maurice');
  assert.match(LUX_OPERATOR_CONTROL_SPACE_TITLE, /Rare & Exclusive operator control space/);
  assert.equal(LUX_OPERATOR_CONTROL_NOT_PUBLIC_NOTICE, 'This is not the public client site');
  assert.match(LUX_OPERATOR_CONTROL_PURPOSE, /review enquiries/);
  assert.match(LUX_OPERATOR_CONTROL_PURPOSE, /private-client workflow/);
});

test('#704 Jan checklist steers functional workflow (not visual polish)', () => {
  assert.equal(LUX_OPERATOR_JAN_TEST_CHECKLIST.length, 6);
  const labels = LUX_OPERATOR_JAN_TEST_CHECKLIST.map((s) => s.label).join(' | ');
  assert.match(labels, /\/concierge/);
  assert.match(labels, /\/change/);
  assert.match(labels, /email and telephone/i);
  assert.match(labels, /new → contacted → qualified → invited → closed/);
  assert.match(labels, /did not match expectation/);
  assert.match(labels, /function first, not visuals/);
  assert.equal(LUX_OPERATOR_JAN_TEST_CHECKLIST[0].href, LUX_OPERATOR_CONCIERGE_PATH);
  assert.equal(LUX_OPERATOR_CRM_WORKSPACE_HASH, '#lux-crm-leads-workspace');
  assert.deepEqual([...LUX_LEAD_CRM_STAGES], ['new', 'contacted', 'qualified', 'invited', 'closed']);
});

test('#704 orientation gate is Lux-only (tenant or admin acting on Lux host)', () => {
  assert.equal(shouldShowLuxOperatorControlOrientation({}), false);
  assert.equal(
    shouldShowLuxOperatorControlOrientation({
      logged_in: true,
      level: 'tenant',
      tenant_id: 'luxe-maurice',
    }),
    true,
  );
  assert.equal(
    shouldShowLuxOperatorControlOrientation({
      logged_in: true,
      level: 'tenant',
      tenant_id: 'other-tenant',
    }),
    false,
  );
  assert.equal(
    shouldShowLuxOperatorControlOrientation({
      logged_in: true,
      level: 'admin',
      surface: 'tenant',
      acting_tenant_id: 'luxe-maurice',
      host_tenant_id: 'luxe-maurice',
    }),
    true,
  );
  assert.equal(
    shouldShowLuxOperatorControlOrientation({
      logged_in: true,
      level: 'admin',
      surface: 'core',
      acting_tenant_id: 'luxe-maurice',
      host_tenant_id: 'luxe-maurice',
    }),
    false,
  );
});

test('#704 orientation tokens are cool operator strip (not ivory/sand public)', () => {
  const t = buildLuxOperatorOrientationTokens();
  assert.match(t.accentBar, /#38bdf8/i);
  assert.match(t.panelBg, /rgba\(8,\s*20,\s*36/);
  // Must not reuse public Rare & Exclusive ivory page fill.
  assert.notEqual(String(t.panelBg).toLowerCase(), '#f4efe8');
  assert.notEqual(String(t.panelBg).toLowerCase(), '#faf6ef');
});

test('#704 /change mounts Lux orientation only under luxChangeChrome', () => {
  const change = readRepo('pages/change.js');
  assert.match(change, /import LuxOperatorControlOrientation from '\.\.\/components\/LuxOperatorControlOrientation\.js'/);
  assert.match(change, /\{luxChangeChrome \? \(/);
  assert.match(change, /<LuxOperatorControlOrientation\s*\/>/);
  assert.match(change, /Rare & Exclusive · operator desk/);
  assert.match(change, /not the public buyer site/);
  // Non-Lux fallback title remains unchanged.
  assert.match(change, /Change Console/);
});

test('#704 orientation component exposes checklist + CRM workspace link', () => {
  const comp = readRepo('components/LuxOperatorControlOrientation.js');
  assert.match(comp, /data-testid="lux-operator-control-orientation"/);
  assert.match(comp, /data-testid="lux-operator-control-not-public"/);
  assert.match(comp, /data-testid="lux-operator-jan-test-checklist"/);
  assert.match(comp, /LUX_OPERATOR_CRM_WORKSPACE_HASH/);
  assert.match(comp, /#673 \/ #675/);
});

test('#704 does not alter public Rare & Exclusive / concierge surfaces', () => {
  // Orientation module must not be imported by public marketing shells.
  const publicFiles = [
    'components/RareExclusiveIvoryShell.js',
    'components/RareExclusiveTenantPresentation.js',
    'components/RareExclusiveContentPage.js',
    'pages/concierge.js',
    'pages/index.js',
  ];
  for (const f of publicFiles) {
    const src = readRepo(f);
    assert.equal(
      src.includes('lux-operator-control-orientation'),
      false,
      `${f} must not import operator orientation`,
    );
    assert.equal(
      src.includes('LuxOperatorControlOrientation'),
      false,
      `${f} must not render operator orientation`,
    );
  }
  // Concierge email+telephone requirement from #673/#685 remains.
  const concierge = readRepo('pages/concierge.js');
  assert.match(concierge, /emailLooksValid/);
  assert.match(concierge, /phoneLooksValid/);
  assert.match(concierge, /Please provide both a valid email address and a telephone number/);
});

test('#704 existing #673 CRM visibility on /change remains intact', () => {
  const change = readRepo('pages/change.js');
  assert.match(change, /luxLeadCrmEnabled \|\| \(!showIntakeSurface && !isEstimateMode\)/);
  assert.match(change, /data-testid="lux-crm-leads-panel"/);
  assert.match(change, /#lux-crm-leads-workspace/);
  assert.match(change, /Telephone:/);
});
