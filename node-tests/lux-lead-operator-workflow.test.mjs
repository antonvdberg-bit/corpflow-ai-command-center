import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  LUX_LEAD_CRM_STAGES,
  computeLuxLeadCrmSignals,
  defaultLuxOperatorWorkflow,
  luxLeadCrmStageLabel,
  luxOperatorActorLabelFromPayload,
  mergeLuxOperatorWorkflowPatch,
  normalizeLuxLeadCrmStage,
  parseLuxOperatorWorkflow,
  luxOperatorWorkflowForApiList,
} from '../lib/cmp/_lib/lux-lead-operator-workflow.js';

test('normalizeLuxLeadCrmStage accepts aliases', () => {
  assert.equal(normalizeLuxLeadCrmStage('Follow-up'), 'follow_up');
  assert.equal(normalizeLuxLeadCrmStage('Viewing Requested'), 'viewing_requested');
  assert.equal(normalizeLuxLeadCrmStage('NEW'), 'new');
});

test('parseLuxOperatorWorkflow defaults', () => {
  const o = parseLuxOperatorWorkflow({});
  assert.equal(o.stage, 'new');
  assert.equal(o.internal_notes.length, 0);
  assert.equal(o.follow_up_status, null);
  assert.equal(o.next_action_at, null);
  assert.equal(o.next_action_note, null);
  assert.equal(o.owner, null);
  assert.equal(o.stage_audit.length, 0);
  assert.equal(o.activity.length, 0);
});

test('mergeLuxOperatorWorkflowPatch appends note, moves stage, audit + activity', () => {
  const t0 = '2026-05-07T12:00:00.000Z';
  const qj = mergeLuxOperatorWorkflowPatch(
    {},
    { stage: 'qualified', note: 'Called — interested in viewing.' },
    'ops@lux.example',
    t0,
  );
  const o = parseLuxOperatorWorkflow(qj);
  assert.equal(o.stage, 'qualified');
  assert.equal(o.internal_notes.length, 1);
  assert.equal(o.internal_notes[0].text, 'Called — interested in viewing.');
  assert.equal(o.stage_audit.length, 1);
  assert.equal(o.stage_audit[0].action, 'stage_changed');
  assert.equal(o.stage_audit[0].previous_stage, 'new');
  assert.equal(o.stage_audit[0].new_stage, 'qualified');
  assert.equal(o.stage_audit[0].operator_label, 'ops@lux.example');
  assert.ok(o.activity.some((e) => e.kind === 'stage_changed'));
  assert.ok(o.activity.some((e) => e.kind === 'note_added'));
});

test('defaultLuxOperatorWorkflow seeds lead_created activity', () => {
  const t = '2026-05-07T10:00:00.000Z';
  const d = defaultLuxOperatorWorkflow(t);
  assert.equal(d.activity.length, 1);
  assert.equal(d.activity[0].kind, 'lead_created');
});

test('luxOperatorWorkflowForApiList injects created when missing', () => {
  const ow = parseLuxOperatorWorkflow({});
  const api = luxOperatorWorkflowForApiList(ow, { lead_created_at: '2026-05-01T08:00:00.000Z' });
  assert.ok(api.activity.length >= 1);
  assert.equal(api.activity[0].kind, 'lead_created');
});

test('luxOperatorActorLabelFromPayload prefers username', () => {
  assert.equal(
    luxOperatorActorLabelFromPayload({ typ: 'tenant', tenant_id: 'luxe-maurice', username: 'alice@ex.com' }),
    'alice@ex.com',
  );
  assert.ok(
    luxOperatorActorLabelFromPayload({ typ: 'tenant', tenant_id: 'luxe-maurice', user_id: 'uid1' }).includes('operator_id'),
  );
});

test('assign_owner persists and logs activity', () => {
  const t0 = '2026-05-07T14:00:00.000Z';
  const qj = mergeLuxOperatorWorkflowPatch({}, { assign_owner: 'alice' }, 'bob@ex.com', t0);
  const o = parseLuxOperatorWorkflow(qj);
  assert.equal(o.owner?.username, 'alice');
  assert.ok(o.activity.some((e) => e.kind === 'owner_assigned'));
});

test('LUX_LEAD_CRM_STAGES has six stages', () => {
  assert.equal(LUX_LEAD_CRM_STAGES.length, 6);
  assert.equal(luxLeadCrmStageLabel('lost'), 'Lost');
});

test('computeLuxLeadCrmSignals overdue stale untouched', () => {
  const now = new Date('2026-05-10T12:00:00.000Z');
  const owPastDue = parseLuxOperatorWorkflow({
    lux_operator_workflow: {
      stage: 'follow_up',
      internal_notes: [{ at: '2026-05-01T12:00:00.000Z', text: 'x' }],
      next_action_at: '2026-05-09T12:00:00.000Z',
      activity: [],
    },
  });
  const s1 = computeLuxLeadCrmSignals(owPastDue, {
    lead_updated_at: '2026-05-09T12:00:00.000Z',
    now,
  });
  assert.equal(s1.overdue_follow_up, true);
  assert.equal(s1.stale_lead, false);
  assert.equal(s1.untouched_new, false);

  const owNewBare = parseLuxOperatorWorkflow({
    lux_operator_workflow: { stage: 'new', internal_notes: [], activity: [] },
  });
  const s2 = computeLuxLeadCrmSignals(owNewBare, {
    lead_updated_at: '2026-05-01T08:00:00.000Z',
    now,
  });
  assert.equal(s2.untouched_new, true);
  assert.equal(s2.stale_lead, true);

  const owClosed = parseLuxOperatorWorkflow({
    lux_operator_workflow: { stage: 'closed', internal_notes: [], activity: [] },
  });
  const s3 = computeLuxLeadCrmSignals(owClosed, {
    lead_updated_at: '2026-05-01T08:00:00.000Z',
    now,
  });
  assert.equal(s3.stale_lead, false);
});

test('mergeLuxOperatorWorkflowPatch next_action scheduling activity', () => {
  const t0 = '2026-05-07T15:00:00.000Z';
  const qj = mergeLuxOperatorWorkflowPatch(
    {},
    { next_action_at: '2026-05-08T10:00:00.000Z', next_action_note: 'Call back' },
    'ops@lux.example',
    t0,
  );
  const o = parseLuxOperatorWorkflow(qj);
  assert.ok(o.next_action_at);
  assert.equal(o.next_action_note, 'Call back');
  assert.ok(o.activity.some((e) => e.kind === 'next_action_updated'));
});

test('luxOperatorWorkflowForApiList exposes CRM signals', () => {
  const ow = parseLuxOperatorWorkflow({
    lux_operator_workflow: {
      stage: 'new',
      internal_notes: [],
      next_action_at: '2020-01-01T00:00:00.000Z',
      activity: [],
    },
  });
  const api = luxOperatorWorkflowForApiList(ow, {
    lead_created_at: '2026-05-01T08:00:00.000Z',
    lead_updated_at: '2026-05-01T08:00:00.000Z',
  });
  assert.equal(api.overdue_follow_up, true);
});
