import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  AI_LEAD_RESCUE_PRODUCT,
  defaultAiLeadRescueOperator,
} from '../lib/cmp/_lib/ai-lead-rescue-operator.js';
import { applyAiLeadRescuePatch } from '../lib/server/admin-lead-rescue-api.js';
import {
  APPROVED_TEST_LEAD_INTAKE_IDS,
  buildCloseTestIntakeActivity,
  closeLeadRescueTestIntakes,
  CLOSE_TEST_INTAKE_TARGET_STATUS,
  describeTestIntakeRow,
} from '../lib/server/close-lead-rescue-test-intakes.js';

function makeFakePrisma(initialRows) {
  const rows = new Map();
  for (const r of initialRows) rows.set(r.id, JSON.parse(JSON.stringify(r)));
  return {
    lead: {
      findUnique: async ({ where }) => {
        const row = rows.get(where.id);
        return row ? JSON.parse(JSON.stringify(row)) : null;
      },
      update: async ({ where, data }) => {
        const row = rows.get(where.id);
        if (!row) throw new Error('not found');
        const next = { ...row, ...data };
        rows.set(where.id, next);
        return JSON.parse(JSON.stringify(next));
      },
    },
  };
}

function makeAiLeadRow(id, status = 'NEW_INTAKE') {
  return {
    id,
    status,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    qualificationJson: {
      intake_meta: { product: AI_LEAD_RESCUE_PRODUCT, region_path: 'us' },
      ai_lead_rescue_operator: defaultAiLeadRescueOperator(),
    },
  };
}

describe('close-lead-rescue-test-intakes', () => {
  it('buildCloseTestIntakeActivity uses intake_closed_test_data', () => {
    const a = buildCloseTestIntakeActivity('anton');
    assert.equal(a.type, 'intake_closed_test_data');
    assert.equal(a.channel, 'internal');
    assert.equal(a.status_after, CLOSE_TEST_INTAKE_TARGET_STATUS);
  });

  it('dry-run plans LOST without DB writes via patch', async () => {
    const db = makeFakePrisma([makeAiLeadRow('lead-a')]);
    let patchCalls = 0;
    const result = await closeLeadRescueTestIntakes({
      dryRun: true,
      leadIds: ['lead-a'],
      prismaClient: /** @type {any} */ (db),
      applyPatch: async () => {
        patchCalls += 1;
        return { ok: true };
      },
    });
    assert.equal(patchCalls, 0);
    assert.equal(result.dry_run, true);
    assert.equal(result.results[0].action, 'would_close');
    assert.equal(result.results[0].to_status, 'LOST');
  });

  it('execute closes NEW_INTAKE with activity and LOST status', async () => {
    const db = makeFakePrisma([makeAiLeadRow('lead-b')]);
    const result = await closeLeadRescueTestIntakes({
      dryRun: false,
      leadIds: ['lead-b'],
      prismaClient: /** @type {any} */ (db),
      applyPatch: (args) =>
        applyAiLeadRescuePatch({
          ...args,
          prismaClient: /** @type {any} */ (db),
          actorLabel: 'test-operator',
        }),
    });
    assert.equal(result.results[0].action, 'closed');
    const saved = await db.lead.findUnique({ where: { id: 'lead-b' } });
    assert.equal(saved.status, 'LOST');
    const activity = saved.qualificationJson.ai_lead_rescue_operator.activity;
    assert.ok(Array.isArray(activity));
    assert.equal(activity.at(-1).type, 'intake_closed_test_data');
  });

  it('skips already terminal LOST rows', () => {
    const desc = describeTestIntakeRow(makeAiLeadRow('x', 'LOST'));
    assert.equal(desc.eligible, false);
    assert.equal(desc.reason, 'ALREADY_TERMINAL');
  });

  it('approved id list matches Anton packet (7 ids)', () => {
    assert.equal(APPROVED_TEST_LEAD_INTAKE_IDS.length, 7);
  });
});
