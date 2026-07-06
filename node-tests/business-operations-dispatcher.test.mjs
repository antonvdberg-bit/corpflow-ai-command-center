import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildBusinessOperationsDispatcherReport,
  BUSINESS_OPS_DISPATCHER_SCHEMA,
  classifyBusinessOpsFinding,
  shouldPageAntonForRouting,
  summarizeDispatcherRoutings,
} from '../lib/server/business-operations-dispatcher.js';
import { buildBusinessOperationsDispatcherFixtures } from '../scripts/business-operations-dispatcher.mjs';

/** @param {Partial<import('../lib/server/business-operations-monitor.js').BusinessOpsFinding>} patch */
function finding(patch) {
  return {
    severity: 'warning',
    source: 'corpflowai',
    objectType: 'lead',
    objectRef: 'lead:fixture',
    status: 'NEW_INTAKE',
    ageHours: 3,
    actionRequired: 'Test action',
    antonNeeded: false,
    recommendedNextAction: 'Test next',
    safeToIgnore: false,
    link: '/admin/lead-rescue/fixture',
    ...patch,
  };
}

describe('business-operations-dispatcher', () => {
  it('routes payment findings to Anton gated', () => {
    const r = classifyBusinessOpsFinding(
      finding({ objectType: 'payment', severity: 'warning', antonNeeded: true }),
    );
    assert.equal(r.owner, 'anton');
    assert.equal(r.gated, true);
    assert.equal(shouldPageAntonForRouting(r), true);
  });

  it('routes invoice findings to Anton gated', () => {
    const r = classifyBusinessOpsFinding(finding({ objectType: 'invoice' }));
    assert.equal(r.owner, 'anton');
    assert.equal(r.gated, true);
  });

  it('routes CMP delivery stale to Cursor without Anton page', () => {
    const r = classifyBusinessOpsFinding(
      finding({
        objectType: 'delivery',
        objectRef: 'ticket:fixture_1',
        antonNeeded: false,
      }),
    );
    assert.equal(r.owner, 'cursor');
    assert.equal(r.gated, false);
    assert.equal(shouldPageAntonForRouting(r), false);
  });

  it('routes ERPNext skipped monitor to Codex', () => {
    const r = classifyBusinessOpsFinding(
      finding({
        objectType: 'monitor',
        source: 'erpnext',
        objectRef: 'source:erpnext',
        status: 'skipped',
        severity: 'info',
        safeToIgnore: true,
      }),
    );
    assert.equal(r.owner, 'codex');
    assert.equal(shouldPageAntonForRouting(r), false);
  });

  it('routes critical DB source failure to n8n with Anton gate', () => {
    const r = classifyBusinessOpsFinding(
      finding({
        objectType: 'monitor',
        objectRef: 'source:corpflowai_db',
        status: 'unreachable',
        severity: 'urgent',
        safeToIgnore: false,
        antonNeeded: true,
      }),
    );
    assert.equal(r.owner, 'n8n');
    assert.equal(r.gated, true);
    assert.equal(shouldPageAntonForRouting(r), true);
  });

  it('routes non-critical source failure to n8n without Anton page', () => {
    const r = classifyBusinessOpsFinding(
      finding({
        objectType: 'monitor',
        objectRef: 'source:factory_health',
        status: 'unreachable',
        severity: 'urgent',
        safeToIgnore: false,
      }),
    );
    assert.equal(r.owner, 'n8n');
    assert.equal(r.gated, false);
    assert.equal(shouldPageAntonForRouting(r), false);
  });

  it('routes safe informational findings to no_action', () => {
    const r = classifyBusinessOpsFinding(
      finding({
        objectType: 'monitor',
        severity: 'info',
        safeToIgnore: true,
        status: 'skipped',
      }),
    );
    assert.equal(r.owner, 'no_action');
    assert.equal(shouldPageAntonForRouting(r), false);
  });

  it('routes lead intake warning to n8n digest not Anton', () => {
    const r = classifyBusinessOpsFinding(
      finding({ objectType: 'lead', severity: 'warning', antonNeeded: false }),
    );
    assert.equal(r.owner, 'n8n');
    assert.equal(shouldPageAntonForRouting(r), false);
  });

  it('routes urgent lead intake to Anton', () => {
    const r = classifyBusinessOpsFinding(
      finding({ objectType: 'lead', severity: 'urgent', antonNeeded: true }),
    );
    assert.equal(r.owner, 'anton');
    assert.equal(r.gated, true);
  });

  it('routes non-urgent client review to Cursor', () => {
    const r = classifyBusinessOpsFinding(
      finding({
        objectType: 'review',
        objectRef: 'ticket:fixture',
        severity: 'warning',
        safeToIgnore: true,
      }),
    );
    assert.equal(r.owner, 'cursor');
    assert.equal(shouldPageAntonForRouting(r), false);
  });

  it('summarizeDispatcherRoutings counts page_anton correctly', () => {
    const routings = [
      classifyBusinessOpsFinding(finding({ objectType: 'invoice' })),
      classifyBusinessOpsFinding(finding({ objectType: 'delivery', objectRef: 'ticket:x' })),
    ];
    const s = summarizeDispatcherRoutings(routings);
    assert.equal(s.routes.anton, 1);
    assert.equal(s.routes.cursor, 1);
    assert.equal(s.page_anton, 1);
  });

  it('fixtures produce dispatcher schema with mixed owners', () => {
    const report = buildBusinessOperationsDispatcherFixtures();
    assert.equal(report.schema, BUSINESS_OPS_DISPATCHER_SCHEMA);
    assert.ok(report.routings.length >= 3);
    assert.ok(report.summary.routes.anton >= 1);
    assert.ok(report.summary.routes.cursor >= 1);
    assert.ok(report.summary.routes.n8n >= 1);
    assert.ok(report.routings.every((r) => r.executorPrompt.length > 0 || r.owner === 'no_action'));
  });

  it('buildBusinessOperationsDispatcherReport preserves evaluated_at', () => {
    const report = buildBusinessOperationsDispatcherReport(
      { findings: [finding({ objectType: 'payment' })] },
      { evaluated_at: '2026-07-06T00:00:00.000Z' },
    );
    assert.equal(report.evaluated_at, '2026-07-06T00:00:00.000Z');
  });
});
