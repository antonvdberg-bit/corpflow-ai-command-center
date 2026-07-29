import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  LUX_LEAD_CRM_STAGES,
  computeLuxLeadCrmSignals,
  defaultLuxOperatorWorkflow,
  luxLeadCrmStageLabel,
  luxLeadCrmSuggestedNextStage,
  luxLeadCrmNextActionHint,
  luxOperatorActorLabelFromPayload,
  mergeLuxOperatorWorkflowPatch,
  normalizeLuxLeadCrmStage,
  parseConciergeContactFields,
  parseLuxOperatorWorkflow,
  luxOperatorWorkflowForApiList,
} from '../lib/cmp/_lib/lux-lead-operator-workflow.js';

test('normalizeLuxLeadCrmStage accepts current + legacy aliases', () => {
  assert.equal(normalizeLuxLeadCrmStage('Contacted'), 'contacted');
  assert.equal(normalizeLuxLeadCrmStage('Invited'), 'invited');
  assert.equal(normalizeLuxLeadCrmStage('Follow-up'), 'contacted');
  assert.equal(normalizeLuxLeadCrmStage('Viewing Requested'), 'invited');
  assert.equal(normalizeLuxLeadCrmStage('lost'), 'closed');
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

test('LUX_LEAD_CRM_STAGES is enquiry lifecycle new→closed (#673)', () => {
  assert.deepEqual([...LUX_LEAD_CRM_STAGES], ['new', 'contacted', 'qualified', 'invited', 'closed']);
  assert.equal(luxLeadCrmStageLabel('invited'), 'Invited');
  assert.equal(luxLeadCrmSuggestedNextStage('new'), 'contacted');
  assert.equal(luxLeadCrmSuggestedNextStage('invited'), 'closed');
  assert.equal(luxLeadCrmSuggestedNextStage('closed'), null);
  assert.match(luxLeadCrmNextActionHint('new'), /Contact/i);
});

test('computeLuxLeadCrmSignals overdue stale untouched', () => {
  const now = new Date('2026-05-10T12:00:00.000Z');
  const owPastDue = parseLuxOperatorWorkflow({
    lux_operator_workflow: {
      stage: 'contacted',
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

test('luxOperatorWorkflowForApiList exposes CRM signals + next-action hint', () => {
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
  assert.equal(api.suggested_next_stage, 'contacted');
  assert.equal(api.suggested_next_stage_label, 'Contacted');
  assert.match(String(api.next_action_hint || ''), /Contact/i);
});

test('parseConciergeContactFields splits email | phone', () => {
  const a = parseConciergeContactFields('ops@example.test | +23051234567', null);
  assert.equal(a.email, 'ops@example.test');
  assert.equal(a.phone, '+23051234567');
  assert.equal(a.contact_display, 'ops@example.test');

  const b = parseConciergeContactFields('ops@example.test', '+23059998877');
  assert.equal(b.email, 'ops@example.test');
  assert.equal(b.phone, '+23059998877');

  const c = parseConciergeContactFields('ops@example.test | +23051112222', '+23053334444');
  assert.equal(c.phone, '+23053334444');
});

test('enquiry lifecycle progression new→contacted→qualified→invited→closed', () => {
  let qj = {};
  const t = '2026-07-29T08:00:00.000Z';
  for (const stage of ['contacted', 'qualified', 'invited', 'closed']) {
    qj = mergeLuxOperatorWorkflowPatch(qj, { stage }, 'synthetic_operator', t);
  }
  const o = parseLuxOperatorWorkflow(qj);
  assert.equal(o.stage, 'closed');
  assert.equal(o.stage_audit.length, 4);
  assert.equal(o.stage_audit[0].new_stage, 'contacted');
  assert.equal(o.stage_audit[3].new_stage, 'closed');
});
