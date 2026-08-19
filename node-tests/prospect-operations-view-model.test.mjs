import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AI_LEAD_RESCUE_PRODUCT } from '../lib/cmp/_lib/ai-lead-rescue-operator.js';
import { RAPID_DELIVERY_PRODUCT } from '../lib/cmp/_lib/rapid-delivery-operator.js';
import {
  PROSPECT_CANONICAL_STAGES,
  PROSPECT_EXCEPTION_SIGNALS,
  PROSPECT_PROTECTED_ACTIONS,
  PROSPECT_SAFE_INTERVENTIONS,
  assertSafeProspectIntervention,
  classifyDueDate,
  computeProspectExceptionSignals,
  detectProspectProduct,
  isCanonicalStageTransitionAllowed,
  leadRowToProspectViewModel,
  mapCanonicalStageToNativeStatus,
  mapNativeStatusToCanonicalStage,
  matchesMyWorkTodayFilter,
  resolveNextActionDue,
  sortProspectsForActionQueue,
} from '../lib/cmp/_lib/prospect-operations-view-model.js';

const NOW = new Date('2026-08-03T12:00:00.000Z');

describe('prospect-operations-view-model — contract constants', () => {
  it('exposes canonical stages and shared signal vocabulary', () => {
    assert.ok(PROSPECT_CANONICAL_STAGES.includes('new'));
    assert.ok(PROSPECT_CANONICAL_STAGES.includes('proposal_sent'));
    assert.ok(PROSPECT_EXCEPTION_SIGNALS.includes('overdue_action'));
    assert.ok(PROSPECT_EXCEPTION_SIGNALS.includes('awaiting_protected_approval'));
    assert.ok(PROSPECT_SAFE_INTERVENTIONS.includes('change_stage'));
    assert.ok(PROSPECT_PROTECTED_ACTIONS.includes('external_send'));
  });

  it('blocks protected interventions and accepts safe ones', () => {
    assert.equal(assertSafeProspectIntervention('prepare_draft').ok, true);
    assert.equal(assertSafeProspectIntervention('external_send').ok, false);
    assert.equal(assertSafeProspectIntervention('external_send').error, 'PROTECTED_ACTION_BLOCKED');
    assert.equal(assertSafeProspectIntervention('launch_missiles').ok, false);
  });
});

describe('prospect-operations-view-model — status mapping', () => {
  it('maps Lead Rescue and Rapid Delivery native statuses to canonical stages', () => {
    assert.equal(mapNativeStatusToCanonicalStage(AI_LEAD_RESCUE_PRODUCT, 'NEW_INTAKE'), 'new');
    assert.equal(mapNativeStatusToCanonicalStage(AI_LEAD_RESCUE_PRODUCT, 'QUOTE_SENT'), 'proposal_sent');
    assert.equal(mapNativeStatusToCanonicalStage(AI_LEAD_RESCUE_PRODUCT, 'PAID_SETUP'), 'won');
    assert.equal(mapNativeStatusToCanonicalStage(AI_LEAD_RESCUE_PRODUCT, 'LOST'), 'lost');
    assert.equal(mapNativeStatusToCanonicalStage(AI_LEAD_RESCUE_PRODUCT, 'PAUSED'), 'stalled');

    assert.equal(mapNativeStatusToCanonicalStage(RAPID_DELIVERY_PRODUCT, 'new_intake'), 'new');
    assert.equal(mapNativeStatusToCanonicalStage(RAPID_DELIVERY_PRODUCT, 'quote_ready'), 'proposal_ready');
    assert.equal(mapNativeStatusToCanonicalStage(RAPID_DELIVERY_PRODUCT, 'closed'), 'won');
    assert.equal(mapNativeStatusToCanonicalStage(RAPID_DELIVERY_PRODUCT, 'not_fit'), 'not_fit');
    assert.equal(mapCanonicalStageToNativeStatus(AI_LEAD_RESCUE_PRODUCT, 'discovery_booked'), 'DEMO_BOOKED');
    assert.equal(mapCanonicalStageToNativeStatus(RAPID_DELIVERY_PRODUCT, 'qualifying'), 'reviewing');
  });

  it('enforces canonical transition guards', () => {
    assert.equal(isCanonicalStageTransitionAllowed('new', 'qualifying'), true);
    assert.equal(isCanonicalStageTransitionAllowed('proposal_sent', 'won'), true);
    assert.equal(isCanonicalStageTransitionAllowed('won', 'new'), false);
    assert.equal(isCanonicalStageTransitionAllowed('lost', 'qualifying'), true);
    assert.equal(isCanonicalStageTransitionAllowed('bogus', 'new'), false);
  });
});

describe('prospect-operations-view-model — due dates and exceptions', () => {
  it('classifies due dates', () => {
    assert.equal(classifyDueDate(null, NOW), 'none');
    assert.equal(classifyDueDate('2026-08-02T23:00:00.000Z', NOW), 'past');
    assert.equal(classifyDueDate('2026-08-03T18:00:00.000Z', NOW), 'today');
    assert.equal(classifyDueDate('2026-08-10T12:00:00.000Z', NOW), 'future');
  });

  it('resolves next_action_due from activity when top-level missing', () => {
    const due = resolveNextActionDue({
      activity: [
        { next_action_date: '2026-08-01T00:00:00.000Z' },
        { next_action_date: '2026-08-05T00:00:00.000Z' },
      ],
    });
    assert.equal(due, '2026-08-05T00:00:00.000Z');
  });

  it('computes overdue / due today / no next action / high urgency / stale', () => {
    const overdue = computeProspectExceptionSignals(
      {
        canonical_stage: 'qualifying',
        next_action: 'Call prospect',
        next_action_due: '2026-08-01T00:00:00.000Z',
        urgency: 'high',
        last_meaningful_activity_at: '2026-07-01T00:00:00.000Z',
        qualification_complete: false,
        waiting_on: 'operator',
      },
      NOW,
    );
    assert.ok(overdue.includes('overdue_action'));
    assert.ok(overdue.includes('high_urgency'));
    assert.ok(overdue.includes('stalled_no_activity'));
    assert.ok(overdue.includes('missing_qualification'));
    assert.ok(overdue.includes('awaiting_operator'));
    assert.ok(!overdue.includes('no_next_action'));

    const bare = computeProspectExceptionSignals(
      { canonical_stage: 'new', native_status: 'NEW_INTAKE', next_action: null },
      NOW,
    );
    assert.ok(bare.includes('no_next_action'));
    assert.ok(bare.includes('new_unreviewed'));
  });

  it('sorts Action Queue with overdue first, then due today, then no next action', () => {
    const rows = [
      {
        id: 'future',
        next_action: 'Wait',
        next_action_due: '2026-08-20T00:00:00.000Z',
        created_at: '2026-08-01T00:00:00.000Z',
      },
      {
        id: 'none',
        next_action: null,
        created_at: '2026-08-02T00:00:00.000Z',
      },
      {
        id: 'overdue',
        next_action: 'Call',
        next_action_due: '2026-08-01T00:00:00.000Z',
        created_at: '2026-08-01T00:00:00.000Z',
      },
      {
        id: 'today',
        next_action: 'Email',
        next_action_due: '2026-08-03T15:00:00.000Z',
        created_at: '2026-08-01T00:00:00.000Z',
      },
    ];
    const sorted = sortProspectsForActionQueue(rows, NOW);
    assert.deepEqual(
      sorted.map((r) => r.id),
      ['overdue', 'today', 'none', 'future'],
    );
  });

  it('matches My Work / Today filter', () => {
    assert.equal(
      matchesMyWorkTodayFilter(
        { next_action: 'x', next_action_due: '2026-08-01T00:00:00.000Z' },
        NOW,
      ),
      true,
    );
    assert.equal(
      matchesMyWorkTodayFilter(
        {
          next_action: 'x',
          next_action_due: '2026-08-20T00:00:00.000Z',
          last_meaningful_activity_at: NOW.toISOString(),
          waiting_on: null,
        },
        NOW,
      ),
      false,
    );
  });
});

describe('prospect-operations-view-model — lead adapters', () => {
  it('detects product from intake_meta', () => {
    assert.equal(
      detectProspectProduct({ intake_meta: { product: AI_LEAD_RESCUE_PRODUCT } }),
      AI_LEAD_RESCUE_PRODUCT,
    );
    assert.equal(
      detectProspectProduct({ intake_meta: { product: RAPID_DELIVERY_PRODUCT } }),
      RAPID_DELIVERY_PRODUCT,
    );
    assert.equal(detectProspectProduct({}), 'unknown');
  });

  it('projects Lead Rescue row into shared view model', () => {
    const row = {
      id: 'lr-abc123def',
      tenantId: 'tenant-a',
      name: 'Ada Prospect',
      email: 'ada@example.com',
      phone: '+2305000000',
      status: 'QUALIFYING',
      createdAt: new Date('2026-08-01T10:00:00.000Z'),
      updatedAt: new Date('2026-08-02T10:00:00.000Z'),
      qualificationJson: {
        intake_meta: {
          product: AI_LEAD_RESCUE_PRODUCT,
          business_name: 'Ada Spa',
          region_path: 'mauritius',
          lead_sources: 'whatsapp',
          page: '/lead-rescue',
          host: 'corpflowai.com',
        },
        ai_lead_rescue_operator: {
          status: 'QUALIFYING',
          owner: 'anton',
          next_action: 'Book discovery',
          notes: 'Warm intro',
          activity: [
            {
              at: '2026-08-02T09:00:00.000Z',
              actor_label: 'anton',
              channel: 'whatsapp',
              type: 'outbound_opener',
              note: 'Opened',
              next_action: 'Book discovery',
              next_action_date: '2026-08-01T00:00:00.000Z',
              status_after: 'QUALIFYING',
            },
          ],
        },
      },
    };
    const vm = leadRowToProspectViewModel(row, NOW);
    assert.equal(vm.product, AI_LEAD_RESCUE_PRODUCT);
    assert.equal(vm.canonical_stage, 'qualifying');
    assert.equal(vm.owner, 'anton');
    assert.equal(vm.next_action, 'Book discovery');
    assert.equal(vm.next_action_due, '2026-08-01T00:00:00.000Z');
    assert.ok(vm.exception_signals.includes('overdue_action'));
    assert.equal(vm.detail_path, '/app/prospects?id=lr-abc123def');
    assert.equal(vm.source_surfaces.product_detail, '/admin/lead-rescue/lr-abc123def');
    assert.equal(vm.source_surfaces.operating_workspace, '/app/prospects');
  });

  it('projects Rapid Delivery / Website Rescue path row into shared view model', () => {
    const row = {
      id: 'rd-xyz987654',
      tenantId: 'factory',
      name: 'Bea Buyer',
      email: 'bea@example.com',
      phone: '+2305111111',
      status: 'NEW',
      createdAt: new Date('2026-08-03T08:00:00.000Z'),
      updatedAt: new Date('2026-08-03T08:00:00.000Z'),
      qualificationJson: {
        intake_meta: {
          product: RAPID_DELIVERY_PRODUCT,
          business_name: 'Bea Boutique',
          offer_slug: 'premium-landing-page-rescue',
          service_path: 'website_rescue',
          urgency: 'high',
          consent_contact: true,
          host: 'corpflowai.com',
          page: '/offers/premium-landing-page-rescue',
          source: 'offer_page',
        },
        rapid_delivery_operator: {
          status: 'new_intake',
          notes: '',
          activity: [],
          updated_at: '2026-08-03T08:00:00.000Z',
        },
      },
    };
    const vm = leadRowToProspectViewModel(row, NOW);
    assert.equal(vm.product, RAPID_DELIVERY_PRODUCT);
    assert.equal(vm.canonical_stage, 'new');
    assert.ok(vm.exception_signals.includes('new_unreviewed'));
    assert.ok(vm.exception_signals.includes('high_urgency'));
    // Rapid Delivery surfaces a computed recommended_next_action when operator
    // next_action is empty — so no_next_action is intentionally absent.
    assert.ok(vm.next_action);
    assert.ok(!vm.exception_signals.includes('no_next_action'));
    assert.equal(vm.consent_contact, true);
    assert.ok(String(vm.reference).startsWith('CF-'));
  });

  it('cross-view identity: same lead id and stage from one record', () => {
    const row = {
      id: 'shared-1',
      tenantId: 't1',
      name: 'Chris',
      email: 'chris@example.com',
      status: 'DEMO_BOOKED',
      createdAt: new Date('2026-07-20T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
      qualificationJson: {
        intake_meta: {
          product: AI_LEAD_RESCUE_PRODUCT,
          business_name: 'Chris Co',
          region_path: 'mauritius',
          lead_sources: 'email',
        },
        ai_lead_rescue_operator: {
          status: 'DEMO_BOOKED',
          owner: 'ops',
          next_action: 'Send quote pack',
          activity: [],
        },
      },
    };
    const a = leadRowToProspectViewModel(row, NOW);
    const b = leadRowToProspectViewModel(row, NOW);
    assert.equal(a.id, b.id);
    assert.equal(a.canonical_stage, b.canonical_stage);
    assert.equal(a.canonical_stage, 'discovery_booked');
    assert.equal(a.source_surfaces.workbench, '/admin/lead-rescue');
    assert.equal(a.source_surfaces.kanban, '/app/prospects');
    assert.equal(a.source_surfaces.operating_workspace, '/app/prospects');
    assert.match(String(a.detail_path), /^\/app\/prospects\?id=/);
  });
});
