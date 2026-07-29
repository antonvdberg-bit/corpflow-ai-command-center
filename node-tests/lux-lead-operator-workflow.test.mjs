import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  LUX_LEAD_CRM_STAGES,
  computeLuxLeadCrmSignals,
  defaultLuxOperatorWorkflow,
  luxLeadCrmNextActionHint,
  luxLeadCrmStageLabel,
  luxOperatorActorLabelFromPayload,
  mergeLuxOperatorWorkflowPatch,
  normalizeLuxLeadCrmStage,
  parseLuxConciergeContactFields,
  parseLuxOperatorWorkflow,
  luxOperatorWorkflowForApiList,
} from '../lib/cmp/_lib/lux-lead-operator-workflow.js';

test('normalizeLuxLeadCrmStage accepts enquiry progression + legacy aliases', () => {
  assert.equal(normalizeLuxLeadCrmStage('Contacted'), 'contacted');
  assert.equal(normalizeLuxLeadCrmStage('Invited'), 'invited');
  assert.equal(normalizeLuxLeadCrmStage('NEW'), 'new');
  assert.equal(normalizeLuxLeadCrmStage('Follow-up'), 'contacted');
  assert.equal(normalizeLuxLeadCrmStage('Viewing Requested'), 'invited');
  assert.equal(normalizeLuxLeadCrmStage('lost'), 'closed');
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
    { stage: 'contacted', note: 'Called — interested in private access.' },
    'ops@lux.example',
    t0,
  );
  const o = parseLuxOperatorWorkflow(qj);
  assert.equal(o.stage, 'contacted');
  assert.equal(o.internal_notes.length, 1);
  assert.equal(o.internal_notes[0].text, 'Called — interested in private access.');
  assert.equal(o.stage_audit.length, 1);
  assert.equal(o.stage_audit[0].action, 'stage_changed');
  assert.equal(o.stage_audit[0].previous_stage, 'new');
  assert.equal(o.stage_audit[0].new_stage, 'contacted');
  assert.equal(o.stage_audit[0].operator_label, 'ops@lux.example');
  assert.ok(o.activity.some((e) => e.kind === 'stage_changed'));
  assert.ok(o.activity.some((e) => e.kind === 'note_added'));
});

test('enquiry status progression new → contacted → qualified → invited → closed', () => {
  let qj = {};
  const actor = 'ops@lux.example';
  const steps = ['contacted', 'qualified', 'invited', 'closed'];
  for (let i = 0; i < steps.length; i += 1) {
    qj = mergeLuxOperatorWorkflowPatch(qj, { stage: steps[i] }, actor, `2026-05-07T1${i}:00:00.000Z`);
  }
  const o = parseLuxOperatorWorkflow(qj);
  assert.equal(o.stage, 'closed');
  assert.equal(o.stage_audit.length, 4);
  assert.deepEqual(
    o.stage_audit.map((e) => e.new_stage),
    steps,
  );
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
  assert.match(String(api.next_action_hint || ''), /Contact the enquirer/i);
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

test('LUX_LEAD_CRM_STAGES is enquiry progression (5 stages)', () => {
  assert.deepEqual([...LUX_LEAD_CRM_STAGES], ['new', 'contacted', 'qualified', 'invited', 'closed']);
  assert.equal(luxLeadCrmStageLabel('invited'), 'Invited');
  assert.equal(luxLeadCrmStageLabel('contacted'), 'Contacted');
});

test('luxLeadCrmNextActionHint prefers schedule then stage default', () => {
  assert.match(luxLeadCrmNextActionHint('new'), /Contact the enquirer/i);
  assert.match(luxLeadCrmNextActionHint('qualified'), /invitation/i);
  const scheduled = luxLeadCrmNextActionHint('contacted', {
    next_action_at: '2026-05-08T10:00:00.000Z',
    next_action_note: 'Call back',
  });
  assert.match(scheduled, /Call back/);
});

test('parseLuxConciergeContactFields splits email | phone', () => {
  const a = parseLuxConciergeContactFields({
    contact: 'visitor@example.test | +230 5000 0000',
    message: 'Phone: +230 5000 0000\n\nLooking for a villa.',
  });
  assert.equal(a.email, 'visitor@example.test');
  assert.equal(a.phone, '+230 5000 0000');
  assert.match(a.contact_display, /visitor@example\.test/);
  assert.match(a.contact_display, /\+230/);

  const b = parseLuxConciergeContactFields({
    contact: 'only@example.test',
    phone: '+230 5111 2222',
  });
  assert.equal(b.email, 'only@example.test');
  assert.equal(b.phone, '+230 5111 2222');
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
  assert.match(String(api.next_action_hint || ''), /overdue|Scheduled/i);
});
