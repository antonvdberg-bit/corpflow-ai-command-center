import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildChatWidgetLeadFollowupIdempotencyKey,
  CHAT_WIDGET_LEAD_SUBMITTED_EVENT,
  LWM_CHATBOT_LEAD_WORKFLOW_KEY,
  LWM_TENANT_ID,
} from '../lib/server/tenant-workflow/constants.js';
import { buildLivingWordChatbotLeadDefinitionSeedRow } from '../lib/server/tenant-workflow/definitions.js';
import {
  buildLivingWordChatbotLeadContext,
  buildLivingWordChatbotLeadStepData,
  mapPreferredContactToRecommendedChannel,
} from '../lib/server/tenant-workflow/living-word-chatbot-lead.js';
import {
  createLivingWordChatbotLeadRunFromEvent,
  processAutomationEventForWorkflows,
} from '../lib/server/tenant-workflow/process-event.js';

test('mapPreferredContactToRecommendedChannel maps known methods', () => {
  assert.equal(mapPreferredContactToRecommendedChannel('email'), 'email');
  assert.equal(mapPreferredContactToRecommendedChannel('whatsapp'), 'whatsapp');
  assert.equal(mapPreferredContactToRecommendedChannel('phone_call'), 'phone');
  assert.equal(mapPreferredContactToRecommendedChannel('sms'), 'sms');
});

test('mapPreferredContactToRecommendedChannel falls back to general', () => {
  assert.equal(mapPreferredContactToRecommendedChannel(null), 'general');
  assert.equal(mapPreferredContactToRecommendedChannel('facebook'), 'general');
  assert.equal(mapPreferredContactToRecommendedChannel(''), 'general');
});

test('buildLivingWordChatbotLeadStepData includes routing fields', () => {
  const data = buildLivingWordChatbotLeadStepData(
    {
      first_name: 'CorpFlow',
      surname: 'Audit',
      name: 'CorpFlow Audit',
      email: 'sandbox.data.audit@corpflow-test.invalid',
      whatsapp_or_mobile: '+230 5000 0202',
      preferred_contact_method: 'whatsapp',
      message_excerpt: 'Data recording audit test',
    },
    { source_host: 'living-word-mauritius.corpflowai.com', source_path: '/site-preview' },
    { tenantId: LWM_TENANT_ID, threadId: 'thread_1', eventId: 'event_1' },
  );
  assert.equal(data.first_name, 'CorpFlow');
  assert.equal(data.recommended_channel, 'whatsapp');
  assert.equal(data.thread_id, 'thread_1');
  assert.equal(data.event_id, 'event_1');
});

test('definition seed row targets chat_widget.lead.submitted for LWM', () => {
  const row = buildLivingWordChatbotLeadDefinitionSeedRow();
  assert.equal(row.tenantId, LWM_TENANT_ID);
  assert.equal(row.workflowKey, LWM_CHATBOT_LEAD_WORKFLOW_KEY);
  assert.equal(row.version, 1);
  assert.equal(row.triggerEventType, CHAT_WIDGET_LEAD_SUBMITTED_EVENT);
  assert.equal(row.status, 'active');
});

test('idempotency key is scoped to source event id', () => {
  assert.equal(
    buildChatWidgetLeadFollowupIdempotencyKey('evt_abc'),
    'chat-widget-lead-followup:evt_abc',
  );
});

function sampleEvent() {
  return {
    id: 'evt_sample_1',
    tenantId: LWM_TENANT_ID,
    eventType: CHAT_WIDGET_LEAD_SUBMITTED_EVENT,
    payload: {
      schema: 'corpflow.chat_widget.lead.submitted.v1',
      thread_id: 'thread_sample_1',
      tenant_id: LWM_TENANT_ID,
      lead: {
        name: 'Sandbox ContactUX',
        first_name: 'Sandbox',
        surname: 'ContactUX',
        email: 'contact.ux.v01@corpflow-test.invalid',
        phone: '+230 5000 0101',
        whatsapp_or_mobile: '+230 5000 0101',
        preferred_contact_method: 'whatsapp',
        request_type: 'contact',
        message_excerpt: 'Safe test lead',
      },
      origin: {
        source_host: 'living-word-mauritius.corpflowai.com',
        source_path: '/site-preview',
      },
    },
  };
}

function sampleDefinition() {
  return buildLivingWordChatbotLeadDefinitionSeedRow();
}

/**
 * @returns {import('@prisma/client').PrismaClient}
 */
function createFakePrisma() {
  /** @type {Map<string, Record<string, unknown>>} */
  const runs = new Map();
  /** @type {Map<string, Record<string, unknown>>} */
  const steps = new Map();
  let runSeq = 0;
  let stepSeq = 0;

  return /** @type {import('@prisma/client').PrismaClient} */ ({
    automationEvent: {
      findUnique: async ({ where }) => {
        if (where.id === 'missing') return null;
        return sampleEvent();
      },
    },
    workflowDefinition: {
      findMany: async ({ where }) => {
        if (where.tenantId !== LWM_TENANT_ID) return [];
        if (where.triggerEventType !== CHAT_WIDGET_LEAD_SUBMITTED_EVENT) return [];
        return [sampleDefinition()];
      },
    },
    workflowRun: {
      findUnique: async ({ where }) => {
        const tenantId = where.workflow_runs_tenant_idem.tenantId;
        const idempotencyKey = where.workflow_runs_tenant_idem.idempotencyKey;
        for (const row of runs.values()) {
          if (row.tenantId === tenantId && row.idempotencyKey === idempotencyKey) return row;
        }
        return null;
      },
      create: async ({ data }) => {
        const id = `run_${++runSeq}`;
        const idempotencyKey = data.idempotencyKey;
        for (const row of runs.values()) {
          if (row.tenantId === data.tenantId && row.idempotencyKey === idempotencyKey) {
            const err = new Error('Unique constraint failed');
            throw err;
          }
        }
        const runRow = {
          id,
          tenantId: data.tenantId,
          sourceEventId: data.sourceEventId,
          sourceThreadId: data.sourceThreadId,
          idempotencyKey,
          status: data.status,
          currentStepKey: data.currentStepKey,
          contextJson: data.contextJson,
        };
        runs.set(id, runRow);

        const stepCreate = data.steps?.create;
        let stepId;
        if (stepCreate) {
          stepId = `step_${++stepSeq}`;
          steps.set(stepId, {
            id: stepId,
            workflowRunId: id,
            tenantId: stepCreate.tenantId,
            stepKey: stepCreate.stepKey,
            stepType: stepCreate.stepType,
            title: stepCreate.title,
            status: stepCreate.status,
            dataJson: stepCreate.dataJson,
          });
        }
        return { id, steps: stepId ? [{ id: stepId }] : [] };
      },
      count: async ({ where }) => {
        let n = 0;
        for (const row of runs.values()) {
          if (where?.tenantId && row.tenantId !== where.tenantId) continue;
          if (where?.NOT?.tenantId && row.tenantId === where.NOT.tenantId) continue;
          n += 1;
        }
        return n;
      },
    },
    workflowStep: {
      count: async ({ where }) => {
        let n = 0;
        for (const row of steps.values()) {
          if (where?.tenantId && row.tenantId !== where.tenantId) continue;
          n += 1;
        }
        return n;
      },
    },
  });
}

test('processAutomationEventForWorkflows creates run and operator step', async () => {
  const prisma = createFakePrisma();
  const out = await processAutomationEventForWorkflows(prisma, 'evt_sample_1');
  assert.equal(out.processed, true);
  assert.equal(out.runs.length, 1);
  assert.equal(out.runs[0].deduped, false);
  assert.ok(out.runs[0].runId);
  assert.ok(out.runs[0].stepId);
});

test('processAutomationEventForWorkflows is idempotent on same event', async () => {
  const prisma = createFakePrisma();
  const first = await processAutomationEventForWorkflows(prisma, 'evt_sample_1');
  const second = await processAutomationEventForWorkflows(prisma, 'evt_sample_1');
  assert.equal(first.runs[0].deduped, false);
  assert.equal(second.runs[0].deduped, true);
  assert.equal(first.runs[0].runId, second.runs[0].runId);
});

test('createLivingWordChatbotLeadRunFromEvent links source_event_id and source_thread_id', async () => {
  const prisma = createFakePrisma();
  const def = sampleDefinition();
  const event = sampleEvent();
  const out = await createLivingWordChatbotLeadRunFromEvent(prisma, event, def);
  assert.equal(out.deduped, false);
  const run = await prisma.workflowRun.findUnique({
    where: {
      workflow_runs_tenant_idem: {
        tenantId: LWM_TENANT_ID,
        idempotencyKey: buildChatWidgetLeadFollowupIdempotencyKey(event.id),
      },
    },
  });
  assert.equal(run?.sourceEventId, event.id);
  assert.equal(run?.sourceThreadId, 'thread_sample_1');
});

test('tenant isolation: no definitions for other tenants yields no runs', async () => {
  const prisma = createFakePrisma();
  prisma.workflowDefinition.findMany = async () => [];
  const out = await processAutomationEventForWorkflows(prisma, 'evt_sample_1');
  assert.equal(out.processed, false);
  assert.equal(out.reason, 'no_active_definitions');
});

test('buildLivingWordChatbotLeadContext includes lead summary', () => {
  const ctx = buildLivingWordChatbotLeadContext(
    { name: 'A B', preferred_contact_method: 'email', message_excerpt: 'Hi' },
    { source_host: 'host.example', source_path: '/p' },
    't1',
  );
  assert.equal(ctx.lead_summary.full_name, 'A B');
  assert.equal(ctx.recommended_channel, 'email');
  assert.equal(ctx.thread_id, 't1');
});
