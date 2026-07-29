/**
 * Issue #673 — Lux concierge operator enquiry workflow (throughput slice).
 * Source-level guards: stages, contact fields, CRM visibility, next-action hint.
 * No DB/schema/env changes; synthetic fixtures only.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LUX_LEAD_CRM_STAGES,
  mergeLuxOperatorWorkflowPatch,
  parseLuxConciergeContactFields,
  parseLuxOperatorWorkflow,
} from '../lib/cmp/_lib/lux-lead-operator-workflow.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function readRepo(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}

test('#673 stages are new → contacted → qualified → invited → closed', () => {
  assert.deepEqual([...LUX_LEAD_CRM_STAGES], ['new', 'contacted', 'qualified', 'invited', 'closed']);
});

test('#673 synthetic enquiry lifecycle advances without schema', () => {
  // Synthetic-only fixture — not real client data.
  const contact = parseLuxConciergeContactFields({
    contact: 'synthetic.visitor@example.test | +230 5000 9999',
    message: 'Phone: +230 5000 9999\n\nSynthetic private-access enquiry for operator queue QA.',
  });
  assert.equal(contact.email, 'synthetic.visitor@example.test');
  assert.equal(contact.phone, '+230 5000 9999');

  let qj = { lux_operator_workflow: { stage: 'new', internal_notes: [], activity: [] } };
  for (const stage of ['contacted', 'qualified', 'invited', 'closed']) {
    qj = mergeLuxOperatorWorkflowPatch(qj, { stage }, 'synthetic-operator', new Date().toISOString());
  }
  assert.equal(parseLuxOperatorWorkflow(qj).stage, 'closed');
});

test('#673 /change keeps Lux CRM visible on intake + shows email/telephone/next action', () => {
  const change = readRepo('pages/change.js');
  assert.match(change, /luxLeadCrmEnabled \|\| \(!showIntakeSurface && !isEstimateMode\)/);
  assert.match(change, /Telephone:/);
  assert.match(change, /data-testid="lux-crm-next-action-hint"/);
  assert.match(change, /data-testid="lux-crm-selected-next-action"/);
  assert.match(change, /#lux-crm-leads-workspace/);
  assert.match(change, /luxLeadCrmNextActionHint/);
});

test('#673 concierge create stores phone; list exposes email + phone', () => {
  const router = readRepo('lib/cmp/router.js');
  assert.match(router, /parseLuxConciergeContactFields/);
  assert.match(router, /phone,/);
  assert.match(router, /email: contactFields\.email/);
  assert.match(router, /phone: contactFields\.phone/);
  assert.match(router, /contact_display: contactFields\.contact_display/);
});

test('#673 public /concierge still requires email + telephone', () => {
  const concierge = readRepo('pages/concierge.js');
  assert.match(concierge, /emailLooksValid/);
  assert.match(concierge, /phoneLooksValid/);
  assert.match(concierge, /Please provide both a valid email address and a telephone number/);
  assert.match(concierge, /contact: `\$\{emailTrim\} \| \$\{phoneTrim\}`/);
  assert.match(concierge, /action=concierge-lead-create/);
});
