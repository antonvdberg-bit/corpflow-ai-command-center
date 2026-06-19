/**
 * Process automation_events into tenant-scoped workflow runs and operator steps.
 *
 * V1: synchronous processor invoked after chat_widget.lead.submitted is recorded.
 * Does not send external messages. Idempotent per source event id.
 */

import {
  buildChatWidgetLeadFollowupIdempotencyKey,
  CHAT_WIDGET_LEAD_PAYLOAD_SCHEMA,
  CHAT_WIDGET_LEAD_SUBMITTED_EVENT,
  LWM_CHATBOT_LEAD_STEP_KEY,
  LWM_CHATBOT_LEAD_WORKFLOW_KEY,
} from './constants.js';
import {
  buildLivingWordChatbotLeadContext,
  buildLivingWordChatbotLeadStepData,
} from './living-word-chatbot-lead.js';

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} eventId
 * @returns {Promise<{
 *   processed: boolean;
 *   runs: Array<{ runId: string; deduped: boolean; stepId?: string }>;
 *   reason?: string;
 * }>}
 */
export async function processAutomationEventForWorkflows(prisma, eventId) {
  const id = String(eventId || '').trim();
  if (!id) return { processed: false, runs: [], reason: 'missing_event_id' };

  const event = await prisma.automationEvent.findUnique({
    where: { id },
    select: {
      id: true,
      tenantId: true,
      eventType: true,
      payload: true,
    },
  });
  if (!event) return { processed: false, runs: [], reason: 'event_not_found' };
  if (!event.tenantId) return { processed: false, runs: [], reason: 'missing_tenant_id' };

  const definitions = await prisma.workflowDefinition.findMany({
    where: {
      tenantId: event.tenantId,
      triggerEventType: event.eventType,
      status: 'active',
    },
    orderBy: [{ workflowKey: 'asc' }, { version: 'desc' }],
  });

  if (!definitions.length) {
    return { processed: false, runs: [], reason: 'no_active_definitions' };
  }

  /** @type {Array<{ runId: string; deduped: boolean; stepId?: string }>} */
  const runs = [];

  for (const def of definitions) {
    if (
      def.workflowKey === LWM_CHATBOT_LEAD_WORKFLOW_KEY &&
      event.eventType === CHAT_WIDGET_LEAD_SUBMITTED_EVENT
    ) {
      const out = await createLivingWordChatbotLeadRunFromEvent(prisma, event, def);
      runs.push(out);
    }
  }

  return { processed: runs.length > 0, runs };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{
 *   id: string;
 *   tenantId: string | null;
 *   eventType: string;
 *   payload: unknown;
 * }} event
 * @param {{
 *   id: string;
 *   tenantId: string;
 *   workflowKey: string;
 *   version: number;
 *   definitionJson: unknown;
 * }} definition
 * @returns {Promise<{ runId: string; deduped: boolean; stepId?: string }>}
 */
export async function createLivingWordChatbotLeadRunFromEvent(prisma, event, definition) {
  const tenantId = String(event.tenantId);
  const idempotencyKey = buildChatWidgetLeadFollowupIdempotencyKey(event.id);

  const existing = await prisma.workflowRun.findUnique({
    where: {
      workflow_runs_tenant_idem: {
        tenantId,
        idempotencyKey,
      },
    },
    select: { id: true },
  });
  if (existing) {
    return { runId: existing.id, deduped: true };
  }

  const payload =
    event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)
      ? /** @type {Record<string, unknown>} */ (event.payload)
      : {};

  const schema = payload.schema != null ? String(payload.schema) : '';
  if (schema && schema !== CHAT_WIDGET_LEAD_PAYLOAD_SCHEMA) {
    throw new Error(`unsupported_payload_schema:${schema}`);
  }

  const threadId = payload.thread_id != null ? String(payload.thread_id) : null;
  const leadPayload =
    payload.lead && typeof payload.lead === 'object' ? /** @type {Record<string, unknown>} */ (payload.lead) : {};
  const originPayload =
    payload.origin && typeof payload.origin === 'object'
      ? /** @type {Record<string, unknown>} */ (payload.origin)
      : {};

  const defJson =
    definition.definitionJson &&
    typeof definition.definitionJson === 'object' &&
    !Array.isArray(definition.definitionJson)
      ? /** @type {Record<string, unknown>} */ (definition.definitionJson)
      : {};

  const initialStepKey =
    defJson.initial_step_key != null
      ? String(defJson.initial_step_key)
      : LWM_CHATBOT_LEAD_STEP_KEY;

  const stepsDef = Array.isArray(defJson.steps) ? defJson.steps : [];
  const initialStepDef =
    stepsDef.find(
      (s) =>
        s &&
        typeof s === 'object' &&
        /** @type {Record<string, unknown>} */ (s).step_key === initialStepKey,
    ) || stepsDef[0];

  const stepMeta =
    initialStepDef && typeof initialStepDef === 'object'
      ? /** @type {Record<string, unknown>} */ (initialStepDef)
      : {};

  const stepTitle =
    stepMeta.title != null
      ? String(stepMeta.title)
      : 'Follow up Living Word chatbot request';
  const stepType =
    stepMeta.step_type != null ? String(stepMeta.step_type) : 'operator_follow_up';

  const contextJson = buildLivingWordChatbotLeadContext(leadPayload, originPayload, threadId || '');
  const stepDataJson = buildLivingWordChatbotLeadStepData(leadPayload, originPayload, {
    tenantId,
    threadId: threadId || '',
    eventId: event.id,
  });

  try {
    const run = await prisma.workflowRun.create({
      data: {
        tenantId,
        workflowDefinitionId: definition.id,
        workflowKey: definition.workflowKey,
        workflowVersion: definition.version,
        sourceEventId: event.id,
        sourceEventType: event.eventType,
        sourceThreadId: threadId,
        idempotencyKey,
        status: 'open',
        currentStepKey: initialStepKey,
        contextJson,
        steps: {
          create: {
            tenantId,
            stepKey: initialStepKey,
            stepType,
            title: stepTitle,
            status: 'open',
            dataJson: stepDataJson,
          },
        },
      },
      select: {
        id: true,
        steps: { select: { id: true }, take: 1 },
      },
    });

    return {
      runId: run.id,
      deduped: false,
      stepId: run.steps[0]?.id,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('Unique constraint') || msg.includes('unique constraint')) {
      const again = await prisma.workflowRun.findUnique({
        where: {
          workflow_runs_tenant_idem: { tenantId, idempotencyKey },
        },
        select: { id: true },
      });
      if (again) return { runId: again.id, deduped: true };
    }
    throw e;
  }
}

/**
 * Best-effort workflow processing — never throws to callers.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} eventId
 * @returns {Promise<void>}
 */
export async function tryProcessAutomationEventForWorkflows(prisma, eventId) {
  try {
    await processAutomationEventForWorkflows(prisma, eventId);
  } catch (e) {
    try {
      console.error('[tenant-workflow] process_failed', {
        event_id: eventId,
        error: e instanceof Error ? e.message : String(e),
      });
    } catch (_) {
      /* ignore */
    }
  }
}
