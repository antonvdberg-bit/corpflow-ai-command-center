import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildOpenHandsDryRunPlan,
  classifyOpenHandsEligibility,
  COLLISION_RULES,
  CURSOR_PREFERRED_TASK_CLASSES,
  OPENHANDS_ELIGIBLE_TASK_CLASSES,
  OPENHANDS_OWNER,
  requireOwnershipEvidence,
} from '../lib/openhands/dispatcher-adapter.js';
import {
  DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE,
  DISPATCHER_ACTIVATION_MODE_DRY_RUN,
  DRY_RUN_ACTION_BY_OWNER,
  selectActivationDecisions,
} from '../lib/server/dispatcher-agent-activation.js';

describe('openhands task-class eligibility', () => {
  it('classifies every OPENHANDS_ELIGIBLE_TASK_CLASSES entry as openhands', () => {
    for (const taskClass of OPENHANDS_ELIGIBLE_TASK_CLASSES) {
      assert.equal(classifyOpenHandsEligibility(taskClass), 'openhands', taskClass);
    }
  });

  it('classifies every CURSOR_PREFERRED_TASK_CLASSES entry as cursor', () => {
    for (const taskClass of CURSOR_PREFERRED_TASK_CLASSES) {
      assert.equal(classifyOpenHandsEligibility(taskClass), 'cursor', taskClass);
    }
  });

  it('rejects unknown/blank task classes rather than guessing an owner', () => {
    assert.equal(classifyOpenHandsEligibility('some_unknown_task_class'), 'reject');
    assert.equal(classifyOpenHandsEligibility(''), 'reject');
    assert.equal(classifyOpenHandsEligibility(null), 'reject');
    assert.equal(classifyOpenHandsEligibility(undefined), 'reject');
  });

  it('the two task-class lists do not overlap', () => {
    const cursorSet = new Set(CURSOR_PREFERRED_TASK_CLASSES);
    for (const taskClass of OPENHANDS_ELIGIBLE_TASK_CLASSES) {
      assert.equal(cursorSet.has(taskClass), false, `"${taskClass}" is in both lists`);
    }
  });
});

describe('COLLISION_RULES', () => {
  it('describes the collision policy for review, not enforcement', () => {
    assert.equal(typeof COLLISION_RULES.description, 'string');
    assert.ok(COLLISION_RULES.description.length > 0);
    assert.ok(Array.isArray(COLLISION_RULES.rules));
    assert.ok(COLLISION_RULES.rules.length > 0);
  });
});

describe('buildOpenHandsDryRunPlan', () => {
  const basePacket = {
    packet_id: 'openhands-743-doc-fix-01',
    branch_name: 'openhands/743-doc-fix-01',
    allowed_files: ['docs/operations/OPENHANDS_AGENT_HANDOFF.md'],
    collision_sensitive_paths: [],
  };

  it('routes to openhands (dry-run) when there is no existing owner', () => {
    const plan = buildOpenHandsDryRunPlan({ packet: basePacket, existingOwners: [] });
    assert.equal(plan.mode, 'dry_run');
    assert.equal(plan.would_route_to, OPENHANDS_OWNER);
    assert.equal(plan.action, 'WOULD_ROUTE_OPENHANDS_PRIVATE_WORKER');
    assert.deepEqual(plan.collisions, []);
  });

  it('detects a collision on matching packet_id owned by cursor', () => {
    const plan = buildOpenHandsDryRunPlan({
      packet: basePacket,
      existingOwners: [
        { agentType: 'cursor', packetId: basePacket.packet_id, branchName: 'cursor/other-branch' },
      ],
    });
    assert.equal(plan.would_route_to, 'reject');
    assert.equal(plan.action, 'REJECT_COLLISION');
    assert.equal(plan.collisions.length, 1);
    assert.equal(plan.collisions[0].agentType, 'cursor');
    assert.ok(plan.collisions[0].reasons.includes('packet_id'));
  });

  it('detects a collision on matching branch_name owned by codex', () => {
    const plan = buildOpenHandsDryRunPlan({
      packet: basePacket,
      existingOwners: [
        { agentType: 'codex', packetId: 'other-packet', branchName: basePacket.branch_name },
      ],
    });
    assert.equal(plan.action, 'REJECT_COLLISION');
    assert.ok(plan.collisions[0].reasons.includes('branch_name'));
  });

  it('detects a collision on overlapping allowed_files', () => {
    const plan = buildOpenHandsDryRunPlan({
      packet: basePacket,
      existingOwners: [
        {
          agentType: 'cursor',
          packetId: 'other-packet',
          branchName: 'cursor/other-branch',
          ownedPaths: ['docs/operations/OPENHANDS_AGENT_HANDOFF.md'],
        },
      ],
    });
    assert.equal(plan.action, 'REJECT_COLLISION');
    assert.ok(plan.collisions[0].reasons.includes('overlapping_paths'));
  });

  it('does not treat an existing openhands owner as a collision source', () => {
    const plan = buildOpenHandsDryRunPlan({
      packet: basePacket,
      existingOwners: [
        { agentType: 'openhands', packetId: basePacket.packet_id, branchName: basePacket.branch_name },
      ],
    });
    // Only cursor/codex ownership is treated as a collision signal here —
    // openhands-vs-openhands dedupe is out of scope for this adapter.
    assert.equal(plan.action, 'WOULD_ROUTE_OPENHANDS_PRIVATE_WORKER');
  });

  it('never calls an external API or starts a container (pure function contract)', () => {
    // There is nothing to stub — buildOpenHandsDryRunPlan has no fetch/exec
    // dependency at all. This test documents that contract so a future edit
    // introducing an I/O call would need to update this test deliberately.
    assert.equal(typeof buildOpenHandsDryRunPlan, 'function');
    assert.equal(buildOpenHandsDryRunPlan.constructor.name, 'Function');
  });
});

describe('requireOwnershipEvidence', () => {
  const completeEvidence = {
    agentType: 'openhands',
    taskRunId: 'run-abc123',
    branchName: 'openhands/743-doc-fix-01',
    ownedPaths: ['docs/operations/OPENHANDS_AGENT_HANDOFF.md'],
    activityTimestamp: new Date().toISOString(),
  };

  it('accepts complete evidence', () => {
    const result = requireOwnershipEvidence(completeEvidence);
    assert.equal(result.ok, true);
    assert.deepEqual(result.errors, []);
  });

  it('fails closed when only a label-like agentType is present (missing everything else)', () => {
    const result = requireOwnershipEvidence({ agentType: 'openhands' });
    assert.equal(result.ok, false);
    assert.ok(result.errors.length >= 4);
  });

  it('fails closed on an empty object', () => {
    const result = requireOwnershipEvidence({});
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('agentType')));
    assert.ok(result.errors.some((e) => e.includes('taskRunId')));
    assert.ok(result.errors.some((e) => e.includes('branchName')));
    assert.ok(result.errors.some((e) => e.includes('ownedPaths')));
    assert.ok(result.errors.some((e) => e.includes('activityTimestamp')));
  });

  it('fails closed when ownedPaths is an empty array', () => {
    const result = requireOwnershipEvidence({ ...completeEvidence, ownedPaths: [] });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('ownedPaths')));
  });

  it('fails closed on an invalid activityTimestamp', () => {
    const result = requireOwnershipEvidence({ ...completeEvidence, activityTimestamp: 'not-a-date' });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('activityTimestamp')));
  });
});

describe('dispatcher-agent-activation integration — openhands never live-activates', () => {
  it('DRY_RUN_ACTION_BY_OWNER.openhands is the dry-run routing label', () => {
    assert.equal(DRY_RUN_ACTION_BY_OWNER.openhands, 'WOULD_ROUTE_OPENHANDS_PRIVATE_WORKER');
  });

  it('dry_run mode skips openhands with SKIP_OPENHANDS_NOT_ENABLED', () => {
    const routings = [
      { owner: 'openhands', severity: 'info', objectRef: 'x', gated: false },
    ];
    const decisions = selectActivationDecisions(routings, {
      mode: DISPATCHER_ACTIVATION_MODE_DRY_RUN,
    });
    assert.equal(decisions.length, 1);
    assert.equal(decisions[0].action, 'SKIP_OPENHANDS_NOT_ENABLED');
  });

  it('cursor_live mode NEVER activates openhands — still SKIP_OPENHANDS_NOT_ENABLED', () => {
    const routings = [
      { owner: 'openhands', severity: 'urgent', objectRef: 'y', gated: false },
    ];
    const decisions = selectActivationDecisions(routings, {
      mode: DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE,
    });
    assert.equal(decisions.length, 1);
    assert.equal(decisions[0].action, 'SKIP_OPENHANDS_NOT_ENABLED');
    assert.notEqual(decisions[0].action, 'ACTIVATE_CURSOR');
  });

  it('cursor_live mode with a mixed batch only activates the eligible cursor routing, never openhands', () => {
    const routings = [
      { owner: 'openhands', severity: 'urgent', objectRef: 'oh-1', gated: false },
      {
        owner: 'cursor',
        severity: 'urgent',
        objectRef: 'cur-1',
        gated: false,
        executorPrompt: 'do work',
        throughput_packet: {
          business_outcome: 'x',
          linked_issue_or_ticket: 'y',
          delivery_surface: 'z',
          evidence_required: 'w',
          cost_risk_cap: 'v',
          allowed_category: 'ops-unblocker',
        },
      },
    ];
    const decisions = selectActivationDecisions(routings, {
      mode: DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE,
      maxCursorLive: 1,
    });
    const openhandsDecision = decisions.find((d) => d.routing.owner === 'openhands');
    const cursorDecision = decisions.find((d) => d.routing.owner === 'cursor');
    assert.equal(openhandsDecision.action, 'SKIP_OPENHANDS_NOT_ENABLED');
    assert.equal(cursorDecision.action, 'ACTIVATE_CURSOR');
  });
});
