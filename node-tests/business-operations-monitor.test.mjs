import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ageHours,
  buildBusinessOperationsMonitorReport,
  BUSINESS_OPS_MONITOR_SCHEMA,
  DEFAULT_THRESHOLDS,
  evaluateLeadRescueRow,
  evaluateCmpTicketRow,
  evaluateSourceHealthFindings,
  findSetupWindowStartIso,
  isPaymentConfirmed,
  severityForAge,
  summarizeFindings,
} from '../lib/server/business-operations-monitor.js';
import { AI_LEAD_RESCUE_PRODUCT } from '../lib/cmp/_lib/ai-lead-rescue-operator.js';
import { buildBusinessOperationsMonitorFixtures } from '../scripts/business-operations-monitor.mjs';

describe('business-operations-monitor', () => {
  const now = new Date('2026-07-04T12:00:00.000Z');

  it('severityForAge maps thresholds', () => {
    assert.equal(severityForAge(1, 2, 4), null);
    assert.equal(severityForAge(2, 2, 4), 'warning');
    assert.equal(severityForAge(4, 2, 4), 'urgent');
  });

  it('isPaymentConfirmed accepts paid aliases', () => {
    assert.equal(isPaymentConfirmed('paid'), true);
    assert.equal(isPaymentConfirmed('confirmed'), true);
    assert.equal(isPaymentConfirmed('pending'), false);
  });

  it('findSetupWindowStartIso picks earliest payment_confirmed_manual', () => {
    const activity = [
      { at: '2026-07-02T10:00:00.000Z', type: 'note', channel: 'internal' },
      { at: '2026-07-01T08:00:00.000Z', type: 'payment_confirmed_manual', channel: 'manual' },
    ];
    assert.equal(findSetupWindowStartIso(activity), '2026-07-01T08:00:00.000Z');
  });

  it('flags new intake without review after SLA', () => {
    const row = {
      id: 'lead_test_1',
      tenantId: 'corpflowai',
      name: 'Test',
      email: 'test@example.test',
      contact: null,
      message: 'hi',
      phone: null,
      intent: 'lead-rescue',
      market: null,
      listing: null,
      status: 'NEW_INTAKE',
      qualificationJson: {
        intake_meta: { product: AI_LEAD_RESCUE_PRODUCT },
        ai_lead_rescue_operator: { activity: [] },
      },
      score: null,
      createdAt: new Date('2026-07-04T09:00:00.000Z'),
      updatedAt: new Date('2026-07-04T09:00:00.000Z'),
    };
    const findings = evaluateLeadRescueRow(row, now, DEFAULT_THRESHOLDS, {});
    assert.ok(findings.some((f) => f.objectType === 'lead' && f.severity === 'warning'));
  });

  it('flags quote sent without invoice reference', () => {
    const row = {
      id: 'lead_test_2',
      tenantId: 'corpflowai',
      name: 'Quote',
      email: 'quote@example.test',
      contact: null,
      message: 'hi',
      phone: null,
      intent: 'lead-rescue',
      market: null,
      listing: null,
      status: 'QUOTE_SENT',
      qualificationJson: {
        intake_meta: { product: AI_LEAD_RESCUE_PRODUCT },
        ai_lead_rescue_operator: {
          invoice_reference: null,
          owner: 'anton',
          activity: [{ at: '2026-07-01T08:00:00.000Z', type: 'intake_reviewed', channel: 'manual' }],
        },
      },
      score: null,
      createdAt: new Date('2026-07-01T08:00:00.000Z'),
      updatedAt: new Date('2026-07-01T08:00:00.000Z'),
    };
    const findings = evaluateLeadRescueRow(row, now, DEFAULT_THRESHOLDS, {});
    assert.ok(findings.some((f) => f.objectType === 'invoice'));
  });

  it('flags CMP ticket in client review', () => {
    const row = {
      id: 'ticket_test_1',
      tenantId: 'luxe-maurice',
      description: 'test',
      status: 'Approved',
      stage: 'Build',
      title: 'Test',
      brief: null,
      locale: null,
      consoleJson: { client_view: { workflow_state: 'in_review' } },
      createdAt: new Date('2026-07-01T08:00:00.000Z'),
      updatedAt: new Date('2026-07-01T08:00:00.000Z'),
    };
    const findings = evaluateCmpTicketRow(row, now, DEFAULT_THRESHOLDS, {});
    assert.ok(findings.some((f) => f.objectType === 'review'));
  });

  it('evaluateSourceHealthFindings surfaces unreachable source', () => {
    const findings = evaluateSourceHealthFindings([{ name: 'corpflowai_db', ok: false }]);
    assert.equal(findings[0].severity, 'urgent');
    assert.equal(findings[0].objectType, 'monitor');
  });

  it('buildBusinessOperationsMonitorReport returns stable schema', () => {
    const report = buildBusinessOperationsMonitorReport({ leads: [], cmpTickets: [], sources: [], now });
    assert.equal(report.schema, BUSINESS_OPS_MONITOR_SCHEMA);
    assert.equal(report.version, 1);
    assert.deepEqual(report.summary, summarizeFindings([]));
  });

  it('fixtures produce sample findings without DB', () => {
    const report = buildBusinessOperationsMonitorFixtures(now);
    assert.equal(report.schema, BUSINESS_OPS_MONITOR_SCHEMA);
    assert.ok(report.findings.length >= 3);
    assert.ok(report.summary.actionRequired >= 3);
    assert.ok(report.findings.every((f) => !String(f.objectRef).includes('@')));
    assert.equal(ageHours(new Date('2026-07-04T10:00:00.000Z'), now), 2);
  });
});
