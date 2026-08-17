import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

import {
  buildCursorAgentCreatePayload,
  CORPFLOW_CURSOR_REPO_URL,
  CORPFLOW_CURSOR_STARTING_REF,
  createCursorCloudAgent,
} from '../lib/server/cursor-cloud-agent-client.js';
import {
  buildDispatcherActivationPlan,
  buildSmokeInternalCursorRouting,
  dedupeStateAddKey,
  DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE,
  DISPATCHER_ACTIVATION_MODE_DRY_RUN,
  evaluateThroughputPacketGate,
  normalizeDedupeState,
  routingDedupeKey,
  runDispatcherActivation,
  selectActivationDecisions,
  injectSmokeInternalCursorRouting,
} from '../lib/server/dispatcher-agent-activation.js';

const sample = JSON.parse(
  fs.readFileSync('node-tests/fixtures/business-operations-dispatcher-sample.json', 'utf8'),
);

const validThroughputPacket = {
  business_outcome: 'Unblock Lux client delivery visibility',
  linked_issue_or_ticket: 'ticket:fixture_ticket_in_review',
  delivery_surface: '/change client console',
  evidence_required: 'live corpflow_test URL (lux.corpflowai.com/change) and npm test result',
  cost_risk_cap: 'One scoped PR only; max one Cursor activation per run',
  allowed_category: 'client-delivery',
};

/** @type {import('../lib/server/business-operations-dispatcher.js').BusinessOpsRouting} */
function cursorRouting(overrides = {}) {
  return {
    owner: 'cursor',
    severity: 'urgent',
    source: 'corpflowai',
    objectType: 'delivery',
    objectRef: 'ticket:fixture_ticket_in_review',
    gated: false,
    reason: 'CMP delivery stale',
    recommendedNextAction: 'Open PR',
    executorPrompt:
      'Repo/app delivery task (ticket:fixture_ticket_in_review): Open PR on approved branch; post STATUS to Operator Bridge #249 when ready.',
    antonNeeded: false,
    safeToIgnore: false,
    link: '/change?ticket=fixture_ticket_in_review',
    throughput_packet: validThroughputPacket,
    ...overrides,
  };
}

describe('cursor-cloud-agent-client', () => {
  it('cursor routing builds activation payload', () => {
    const routing = cursorRouting();
    const payload = buildCursorAgentCreatePayload(routing);
    assert.equal(payload.prompt.text, routing.executorPrompt);
    assert.equal(payload.repos[0].url, CORPFLOW_CURSOR_REPO_URL);
    assert.equal(payload.repos[0].startingRef, CORPFLOW_CURSOR_STARTING_REF);
    assert.equal(payload.autoCreatePR, true);
    assert.match(payload.name, /^dispatcher-ticket:fixture_ticket_in_review/);
  });
});

describe('dispatcher cursor live activation', () => {
  it('dry-run does not call Cursor', async () => {
    let calls = 0;
    const fetch = async () => {
      calls += 1;
      throw new Error('should not call Cursor API');
    };

    const result = await runDispatcherActivation(sample, {
      mode: DISPATCHER_ACTIVATION_MODE_DRY_RUN,
      dedupeState: normalizeDedupeState(null),
      cursorApiKey: 'test-key',
      cursorDeps: { fetch },
    });

    assert.equal(calls, 0);
    assert.equal(result.mode, DISPATCHER_ACTIVATION_MODE_DRY_RUN);
    assert.equal(result.live.cursor, null);
    assert.ok(result.decisions.some((d) => d.action === 'WOULD_ACTIVATE_CURSOR_CLOUD_API'));
  });

  it('live mode calls Cursor client once', async () => {
    let calls = 0;
    const fetch = async (url, init) => {
      calls += 1;
      assert.equal(url, 'https://api.cursor.com/v1/agents');
      assert.equal(init.method, 'POST');
      assert.match(String(init.headers?.Authorization), /^Bearer sk-test$/);
      const body = JSON.parse(String(init.body));
      assert.equal(body.autoCreatePR, true);
      return new Response(
        JSON.stringify({
          agent: { id: 'bc-test', url: 'https://cursor.com/agents/bc-test' },
          run: { id: 'run-test' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const report = {
      ...sample,
      routings: sample.routings.map((r) =>
        r.owner === 'cursor'
          ? {
              ...r,
              executorPrompt: cursorRouting().executorPrompt,
              throughput_packet: validThroughputPacket,
            }
          : r,
      ),
    };

    const result = await runDispatcherActivation(report, {
      mode: DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE,
      dedupeState: normalizeDedupeState(null),
      cursorApiKey: 'sk-test',
      cursorDeps: { fetch },
    });

    assert.equal(calls, 1);
    assert.equal(result.live.cursor?.agentId, 'bc-test');
    assert.equal(result.live.cursor?.objectRef, 'ticket:fixture_ticket_in_review');
    assert.ok(dedupeStateAddKey(normalizeDedupeState(null), routingDedupeKey(cursorRouting())).keys.length === 1);
  });

  it('owner=anton skipped', () => {
    const decisions = selectActivationDecisions(sample.routings, {
      mode: DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE,
    });
    const anton = decisions.filter((d) => d.routing.owner === 'anton');
    assert.ok(anton.length > 0);
    assert.ok(anton.every((d) => d.action === 'SKIP_OPERATOR_GATE' || d.action === 'SKIP_GATED'));
    assert.ok(anton.some((d) => d.action === 'SKIP_GATED'));
  });

  it('gated=true skipped', () => {
    const routings = [
      cursorRouting({ gated: true, owner: 'cursor' }),
    ];
    const decisions = selectActivationDecisions(routings, {
      mode: DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE,
    });
    assert.equal(decisions[0].action, 'SKIP_GATED');
  });

  it('codex remains dry-run', () => {
    const decisions = selectActivationDecisions(sample.routings, {
      mode: DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE,
    });
    const codex = decisions.filter((d) => d.routing.owner === 'codex');
    assert.ok(codex.length > 0);
    assert.ok(codex.every((d) => d.action === 'DRY_RUN_CODEX'));
  });

  it('duplicate routing skipped', () => {
    const routing = cursorRouting();
    const key = routingDedupeKey(routing);
    const decisions = selectActivationDecisions([routing, routing], {
      mode: DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE,
      dedupeKeys: [key],
    });
    assert.equal(decisions[0].action, 'SKIP_DEDUPE');
    assert.equal(decisions[1].action, 'SKIP_DEDUPE');
  });

  it('missing CURSOR_API_KEY fails closed in live mode with pending activation', async () => {
    await assert.rejects(
      () =>
        runDispatcherActivation(
          { ...sample, routings: [cursorRouting()] },
          {
            mode: DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE,
            dedupeState: normalizeDedupeState(null),
            cursorApiKey: '',
          },
        ),
      /CURSOR_API_KEY missing/,
    );
  });

  it('createCursorCloudAgent fails closed without API key', async () => {
    await assert.rejects(
      () => createCursorCloudAgent('', buildCursorAgentCreatePayload(cursorRouting())),
      /CURSOR_API_KEY missing/,
    );
  });

  it('max 1 live cursor activation per run', () => {
    const routings = [
      cursorRouting({ objectRef: 'ticket:a' }),
      cursorRouting({ objectRef: 'ticket:b' }),
    ];
    const decisions = selectActivationDecisions(routings, {
      mode: DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE,
      maxCursorLive: 1,
    });
    const activate = decisions.filter((d) => d.action === 'ACTIVATE_CURSOR');
    const capped = decisions.filter((d) => d.action === 'SKIP_CURSOR_CAP');
    assert.equal(activate.length, 1);
    assert.equal(capped.length, 1);
  });

  it('dispatcher cursor_live requires a complete throughput packet', async () => {
    let calls = 0;
    const fetch = async () => {
      calls += 1;
      throw new Error('should not call Cursor API without packet');
    };

    const result = await runDispatcherActivation(
      { ...sample, routings: [cursorRouting({ throughput_packet: undefined })] },
      {
        mode: DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE,
        dedupeState: normalizeDedupeState(null),
        cursorApiKey: 'sk-test',
        cursorDeps: { fetch },
      },
    );

    assert.equal(calls, 0);
    assert.equal(result.live.cursor, null);
    assert.equal(result.decisions[0].action, 'SKIP_THROUGHPUT_PACKET');
    assert.equal(result.decisions[0].throughput_packet_eligible, false);
    assert.deepEqual(result.decisions[0].throughput_packet_missing_fields, [
      'business_outcome',
      'linked_issue_or_ticket',
      'delivery_surface',
      'evidence_required',
      'cost_risk_cap',
      'allowed_category',
    ]);
  });

  it('throughput packet rejects invalid allowed_category', () => {
    const gate = evaluateThroughputPacketGate(
      cursorRouting({
        throughput_packet: {
          ...validThroughputPacket,
          allowed_category: 'random-busywork',
        },
      }),
    );

    assert.equal(gate.eligible, false);
    assert.deepEqual(gate.invalid_fields, ['allowed_category']);
    assert.match(gate.reason, /allowed/);
  });

  it('activation decisions include audit fields from throughput packet', () => {
    const decisions = selectActivationDecisions([cursorRouting()], {
      mode: DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE,
      requireThroughputPacket: true,
    });

    assert.equal(decisions[0].action, 'ACTIVATE_CURSOR');
    assert.equal(decisions[0].throughputGate?.eligible, true);
    assert.equal(decisions[0].throughputGate?.packet?.allowed_category, 'client-delivery');
    assert.equal(
      decisions[0].throughputGate?.packet?.business_outcome,
      'Unblock Lux client delivery visibility',
    );
  });

  it('buildDispatcherActivationPlan respects mode label', () => {
    const plan = buildDispatcherActivationPlan(sample, {
      mode: DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE,
    });
    assert.equal(plan.mode, DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE);
  });

  it('smoke internal injects cursor routing when none eligible', async () => {
    const report = injectSmokeInternalCursorRouting(
      { routings: [{ owner: 'anton', gated: true, objectRef: 'x' }] },
      { smokeInternal: true },
    );
    const cursor = report.routings.filter((r) => r.owner === 'cursor');
    assert.equal(cursor.length, 1);
    assert.match(cursor[0].executorPrompt, /smoke/i);
  });

  it('API key is not echoed in fail-closed error', async () => {
    const secret = 'sk-super-secret-test-key';
    await assert.rejects(
      () =>
        runDispatcherActivation(
          { routings: [cursorRouting()] },
          { mode: DISPATCHER_ACTIVATION_MODE_CURSOR_LIVE, cursorApiKey: '' },
        ),
      (err) => {
        assert.match(err.message, /CURSOR_API_KEY missing/);
        assert.equal(String(err.message).includes(secret), false);
        return true;
      },
    );
  });
});
