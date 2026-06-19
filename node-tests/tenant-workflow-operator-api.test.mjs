import test from 'node:test';
import assert from 'node:assert/strict';

import { LWM_TENANT_ID } from '../lib/server/tenant-workflow/constants.js';
import {
  deriveRunStatusFromStepTerminal,
  loadTenantWorkflowStepsForOperator,
  patchTenantWorkflowStepStatus,
  serializeWorkflowStepForOperator,
} from '../lib/server/tenant-workflow/operator.js';
import { handleTenantWorkflowStepUpdate } from '../lib/server/tenant-workflow-api.js';

function sampleStepRow(overrides = {}) {
  return {
    id: 'step_lwm_1',
    tenantId: LWM_TENANT_ID,
    workflowRunId: 'run_lwm_1',
    stepKey: 'follow_up_contact_request',
    stepType: 'operator_follow_up',
    title: 'Follow up Living Word chatbot request',
    status: 'open',
    dataJson: {
      first_name: 'CorpFlow',
      surname: 'Audit',
      full_name: 'CorpFlow Audit',
      email: 'sandbox.data.audit@corpflow-test.invalid',
      whatsapp_or_mobile: '+230 5000 0202',
      preferred_contact_method: 'whatsapp',
      recommended_channel: 'whatsapp',
      message_excerpt: 'Safe test',
      source_host: 'living-word-mauritius.corpflowai.com',
      source_path: '/site-preview',
      thread_id: 'thread_1',
      event_id: 'event_1',
    },
    createdAt: new Date('2026-06-19T02:00:00.000Z'),
    updatedAt: new Date('2026-06-19T02:00:00.000Z'),
    run: {
      workflowKey: 'living_word_chatbot_lead_followup',
      workflowVersion: 1,
      sourceEventId: 'event_1',
      sourceThreadId: 'thread_1',
      status: 'open',
    },
    ...overrides,
  };
}

/**
 * @param {Array<Record<string, unknown>>} initialSteps
 * @param {Array<Record<string, unknown>>} initialRuns
 */
function makeFakePrisma(initialSteps, initialRuns) {
  const steps = new Map(initialSteps.map((s) => [s.id, JSON.parse(JSON.stringify(s))]));
  const runs = new Map(initialRuns.map((r) => [r.id, JSON.parse(JSON.stringify(r))]));

  return {
    workflowStep: {
      findMany: async ({ where, include }) => {
        let rows = [...steps.values()].filter((s) => s.tenantId === where.tenantId);
        if (where.status) rows = rows.filter((s) => s.status === where.status);
        if (where.run?.workflowKey) {
          rows = rows.filter((s) => {
            const run = runs.get(s.workflowRunId);
            return run && run.workflowKey === where.run.workflowKey;
          });
        }
        return rows.map((s) => {
          const out = { ...s };
          if (include?.run) {
            out.run = runs.get(s.workflowRunId) || null;
          }
          return out;
        });
      },
      findFirst: async ({ where, include }) => {
        const row = [...steps.values()].find((s) => s.id === where.id && s.tenantId === where.tenantId);
        if (!row) return null;
        const out = { ...row };
        if (include?.run) out.run = runs.get(row.workflowRunId) || null;
        return out;
      },
      updateMany: async ({ where, data }) => {
        const row = steps.get(where.id);
        if (!row || row.tenantId !== where.tenantId) return { count: 0 };
        Object.assign(row, data);
        row.updatedAt = new Date();
        return { count: 1 };
      },
    },
    workflowRun: {
      findFirst: async ({ where, select }) => {
        const row = runs.get(where.id);
        if (!row || row.tenantId !== where.tenantId) return null;
        if (!select) return { ...row };
        const out = {};
        for (const k of Object.keys(select)) {
          if (select[k] === true) out[k] = row[k];
        }
        return out;
      },
      updateMany: async ({ where, data }) => {
        const row = runs.get(where.id);
        if (!row || row.tenantId !== where.tenantId) return { count: 0 };
        Object.assign(row, data);
        row.updatedAt = new Date();
        return { count: 1 };
      },
    },
    $transaction: async (ops) => Promise.all(ops.map((op) => op)),
    _steps: steps,
    _runs: runs,
  };
}

test('serializeWorkflowStepForOperator exposes lead and reference fields', () => {
  const out = serializeWorkflowStepForOperator(sampleStepRow());
  assert.equal(out.tenant_id, LWM_TENANT_ID);
  assert.equal(out.workflow_key, 'living_word_chatbot_lead_followup');
  assert.equal(out.lead.full_name, 'CorpFlow Audit');
  assert.equal(out.lead.recommended_channel, 'whatsapp');
  assert.equal(out.source_event_id, 'event_1');
  assert.equal(out.source_thread_id, 'thread_1');
});

test('loadTenantWorkflowStepsForOperator lists open LWM steps', async () => {
  const prisma = makeFakePrisma(
    [sampleStepRow()],
    [{ id: 'run_lwm_1', tenantId: LWM_TENANT_ID, workflowKey: 'living_word_chatbot_lead_followup', status: 'open' }],
  );
  const out = await loadTenantWorkflowStepsForOperator(prisma, {
    tenantId: LWM_TENANT_ID,
    status: 'open',
    workflowKey: 'living_word_chatbot_lead_followup',
  });
  assert.equal(out.ok, true);
  assert.equal(out.count, 1);
});

test('loadTenantWorkflowStepsForOperator filters completed', async () => {
  const prisma = makeFakePrisma(
    [sampleStepRow({ status: 'completed' })],
    [{ id: 'run_lwm_1', tenantId: LWM_TENANT_ID, workflowKey: 'living_word_chatbot_lead_followup', status: 'completed' }],
  );
  const out = await loadTenantWorkflowStepsForOperator(prisma, {
    tenantId: LWM_TENANT_ID,
    status: 'completed',
  });
  assert.equal(out.ok, true);
  assert.equal(out.count, 1);
  assert.equal(out.steps[0].status, 'completed');
});

test('patchTenantWorkflowStepStatus marks step and run completed', async () => {
  const prisma = makeFakePrisma(
    [sampleStepRow()],
    [{ id: 'run_lwm_1', tenantId: LWM_TENANT_ID, workflowKey: 'living_word_chatbot_lead_followup', status: 'open' }],
  );
  const out = await patchTenantWorkflowStepStatus(prisma, {
    tenantId: LWM_TENANT_ID,
    stepId: 'step_lwm_1',
    status: 'completed',
  });
  assert.equal(out.ok, true);
  assert.equal(out.step.status, 'completed');
  assert.equal(out.run.status, 'completed');
  assert.equal(prisma._steps.get('step_lwm_1').status, 'completed');
  assert.equal(prisma._runs.get('run_lwm_1').status, 'completed');
});

test('patchTenantWorkflowStepStatus marks cancelled', async () => {
  const prisma = makeFakePrisma(
    [sampleStepRow()],
    [{ id: 'run_lwm_1', tenantId: LWM_TENANT_ID, workflowKey: 'living_word_chatbot_lead_followup', status: 'open' }],
  );
  const out = await patchTenantWorkflowStepStatus(prisma, {
    tenantId: LWM_TENANT_ID,
    stepId: 'step_lwm_1',
    status: 'cancelled',
  });
  assert.equal(out.ok, true);
  assert.equal(out.run.status, 'cancelled');
});

test('tenant isolation: cannot patch another tenant step', async () => {
  const prisma = makeFakePrisma(
    [sampleStepRow()],
    [{ id: 'run_lwm_1', tenantId: LWM_TENANT_ID, workflowKey: 'living_word_chatbot_lead_followup', status: 'open' }],
  );
  const out = await patchTenantWorkflowStepStatus(prisma, {
    tenantId: 'luxe-maurice',
    stepId: 'step_lwm_1',
    status: 'completed',
  });
  assert.equal(out.ok, false);
  assert.equal(out.error, 'step_not_found');
});

test('deriveRunStatusFromStepTerminal maps cancelled', () => {
  assert.equal(deriveRunStatusFromStepTerminal('cancelled'), 'cancelled');
  assert.equal(deriveRunStatusFromStepTerminal('completed'), 'completed');
});

function createMockRes() {
  /** @type {{ statusCode: number; body: unknown; status: (n: number) => any; json: (b: unknown) => void }} */
  const res = {
    statusCode: 200,
    body: null,
    status(n) {
      this.statusCode = n;
      return this;
    },
    json(b) {
      this.body = b;
    },
    setHeader() {},
  };
  return res;
}

test('handleTenantWorkflowStepUpdate denies unauthenticated requests', async () => {
  const prisma = makeFakePrisma([], []);
  const res = createMockRes();
  await handleTenantWorkflowStepUpdate(
    { method: 'PATCH', headers: {}, body: { tenant_id: LWM_TENANT_ID, step_id: 'x', status: 'completed' } },
    res,
    prisma,
  );
  assert.equal(res.statusCode, 403);
  assert.equal(/** @type {{ error?: string }} */ (res.body).error, 'factory_master_required');
});
