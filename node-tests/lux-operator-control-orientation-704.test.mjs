/**
 * Issue #704 — Lux operator control space orientation (distinct from public site).
 * Source-level + content guards. No DB/schema/env changes; no public site edits.
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
  LUX_OPERATOR_CONTROL_NOT_PUBLIC,
  LUX_OPERATOR_CONTROL_PURPOSE,
  LUX_OPERATOR_CONTROL_TENANT_ID,
  LUX_OPERATOR_CONTROL_TITLE,
  LUX_OPERATOR_FUNCTIONAL_TEST_CHECKLIST,
  isLuxOperatorControlTenant,
} from '../lib/client/lux-operator-control-orientation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function readRepo(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}

test('#704 orientation content is Lux-tenant scoped and plainly labelled', () => {
  assert.equal(LUX_OPERATOR_CONTROL_TENANT_ID, 'luxe-maurice');
  assert.equal(isLuxOperatorControlTenant('luxe-maurice'), true);
  assert.equal(isLuxOperatorControlTenant('core'), false);
  assert.equal(isLuxOperatorControlTenant(''), false);
  assert.match(LUX_OPERATOR_CONTROL_TITLE, /operator control space/i);
  assert.match(LUX_OPERATOR_CONTROL_NOT_PUBLIC, /not the public client site/i);
  assert.match(LUX_OPERATOR_CONTROL_PURPOSE, /review enquiries/i);
});

test('#704 functional checklist steers workflow testing (not visual polish)', () => {
  assert.equal(LUX_OPERATOR_FUNCTIONAL_TEST_CHECKLIST.length, 8);
  const labels = LUX_OPERATOR_FUNCTIONAL_TEST_CHECKLIST.map((s) => s.label).join('\n');
  assert.match(labels, /\/concierge/);
  assert.match(labels, /\/change/);
  assert.match(labels, /email and telephone/i);
  assert.match(labels, /new → contacted → qualified → invited → closed/);
  assert.match(labels, /Confidential Presentation/i);
  assert.match(labels, /Viewing by Invitation/i);
  assert.match(labels, /proposed date-time|access notes/i);
  assert.match(labels, /did not match expectation/i);
  assert.match(labels, /not visual polish/i);
  const viewingStep = LUX_OPERATOR_FUNCTIONAL_TEST_CHECKLIST.find((s) => s.id === 'viewing_by_invitation');
  assert.equal(viewingStep?.href, '#lux-crm-viewing-panel');

  // Stages match existing #673 workflow (do not invent a parallel status model).
  assert.deepEqual([...LUX_LEAD_CRM_STAGES], [
    'new',
    'contacted',
    'qualified',
    'invited',
    'closed',
  ]);
});

test('#704 /change mounts Lux orientation panel only under luxChangeChrome', () => {
  const change = readRepo('pages/change.js');
  assert.match(
    change,
    /import LuxOperatorControlOrientationPanel from '\.\.\/components\/LuxOperatorControlOrientationPanel\.js'/,
  );
  assert.match(change, /<LuxOperatorControlOrientationPanel chrome=\{luxChangeChrome\}/);
  assert.match(change, /Rare & Exclusive · operator control space/);
  assert.match(change, /not the public ivory\/sand client site/);
  // Confusing "same editorial programme" framing must be gone.
  assert.equal(change.includes('same editorial programme'), false);
  // Non-Lux header path remains for other tenants.
  assert.match(change, /Operator workspace: open, select a ticket/);
});

test('#704 orientation panel component exposes required markers + CRM surface link', () => {
  const panel = readRepo('components/LuxOperatorControlOrientationPanel.js');
  assert.match(panel, /data-testid="lux-operator-control-orientation"/);
  assert.match(panel, /data-testid="lux-operator-control-not-public"/);
  assert.match(panel, /data-testid="lux-operator-functional-test-checklist"/);
  assert.match(panel, /data-testid="lux-operator-workflow-surface-note"/);
  assert.match(panel, /#lux-crm-leads-workspace/);
  assert.match(panel, /#673\/#675/);
  // Steel/teal control accent — distinct from public ivory/sand marketing.
  assert.match(panel, /#5eead4/);
});

test('#704 public Lux marketing / concierge surfaces are not rewritten by this slice', () => {
  // Guard: orientation strings must not leak into public presentation files.
  const publicFiles = [
    'components/RareExclusiveTenantPresentation.js',
    'components/RareExclusiveIvoryShell.js',
    'components/LuxeMauriceTenantPresentation.js',
    'pages/concierge.js',
  ];
  for (const rel of publicFiles) {
    const src = readRepo(rel);
    assert.equal(
      src.includes('lux-operator-control-orientation'),
      false,
      `${rel} must not import orientation module`,
    );
    assert.equal(
      src.includes('operator control space'),
      false,
      `${rel} must not carry operator-control orientation copy`,
    );
  }
  // Concierge email + telephone requirement remains (issue #673 contract).
  const concierge = readRepo('pages/concierge.js');
  assert.match(concierge, /emailLooksValid/);
  assert.match(concierge, /phoneLooksValid/);
  assert.match(concierge, /Please provide both a valid email address and a telephone number/);
});

test('#704 existing #673 CRM workflow wiring on /change remains intact', () => {
  const change = readRepo('pages/change.js');
  assert.match(change, /Telephone:/);
  assert.match(change, /data-testid="lux-crm-next-action-hint"/);
  assert.match(change, /#lux-crm-leads-workspace/);
  assert.match(change, /LUX_LEAD_CRM_STAGES/);
  assert.match(change, /concierge-lead-operator-patch/);
});
