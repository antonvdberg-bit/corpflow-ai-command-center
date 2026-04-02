import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { classifyEventRisk, loadRiskPrefixLists } from '../lib/automation/risk.js';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

test('classifyEventRisk defaults: billing is high', () => {
  assert.equal(classifyEventRisk('billing.invoice.create'), 'high');
  assert.equal(classifyEventRisk('payment.capture'), 'high');
  assert.equal(classifyEventRisk('delete.tenant.data'), 'high');
});

test('classifyEventRisk defaults: unknown is low', () => {
  assert.equal(classifyEventRisk('intake.form.submitted'), 'low');
  assert.equal(classifyEventRisk('automation.playbook.upsert'), 'low');
});

test('classifyEventRisk respects CORPFLOW_AUTOMATION_HIGH_RISK_PREFIXES', () => {
  process.env.CORPFLOW_AUTOMATION_HIGH_RISK_PREFIXES = 'acme.danger.,other.';
  const lists = loadRiskPrefixLists();
  assert.ok(lists.high.includes('acme.danger.'));
  assert.equal(classifyEventRisk('acme.danger.nuke'), 'high');
});

test('resolveTenantScope', async () => {
  const { resolveTenantScope } = await import('../lib/automation/scope.js');
  assert.equal(resolveTenantScope('legal-demo'), 'legal-demo');
  assert.equal(resolveTenantScope(''), 'global');
  assert.equal(resolveTenantScope(null), 'global');
});

test('cmp.* mirror event types are not high-risk by default', () => {
  assert.equal(classifyEventRisk('cmp.ticket.created'), 'low');
  assert.equal(classifyEventRisk('cmp.build.approved'), 'low');
  assert.equal(classifyEventRisk('cmp.github.callback'), 'low');
});
