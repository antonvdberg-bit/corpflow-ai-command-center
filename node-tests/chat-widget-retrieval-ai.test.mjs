import test from 'node:test';
import assert from 'node:assert/strict';

import { LIVING_WORD_FLOW_V3 } from '../lib/server/chat-widget/living-word-flow-v3.js';
import { validateFlow } from '../lib/server/chat-widget/flow.js';
import { evaluateQuestionSafety, sanitiseModelAnswer } from '../lib/server/chat-widget/retrieval/safety.js';
import { buildRetrievalContext } from '../lib/server/chat-widget/retrieval/context-builder.js';
import { answerChatWidgetQuestion, sanitiseVisitorQuestion } from '../lib/server/chat-widget/retrieval/answer.js';
import { AI_USAGE_MODES, LWM_TENANT_ID } from '../lib/server/chat-widget/retrieval/constants.js';
import { isGroqConfigured } from '../lib/server/chat-widget/retrieval/providers/groq.js';

const NOW = new Date('2026-06-19T12:00:00.000Z');

function sampleAtom(overrides = {}) {
  return {
    id: 'atom_service',
    tenantId: LWM_TENANT_ID,
    atomKey: 'service_times.sunday',
    title: 'Sunday service time',
    category: 'service_times',
    body: 'Sunday worship at 9:30 am in Grand Baie.',
    summary: 'Sundays 9:30 am',
    sourceType: 'public_homepage',
    sourceLabel: 'test',
    sourceUrl: null,
    approved: true,
    visibility: 'public',
    chatbotAnswerEligible: true,
    aiAnswerEligible: true,
    sensitivity: 'public',
    tagsJson: ['sunday'],
    metadataJson: {},
    expiresAt: new Date('2027-01-01'),
    ...overrides,
  };
}

function sampleSchedule(overrides = {}) {
  return {
    id: 'sched_sunday',
    tenantId: LWM_TENANT_ID,
    category: 'service',
    title: 'Sunday Service',
    description: 'Weekly worship',
    recurrence: 'weekly',
    weeklyDayOfWeek: 0,
    weeklyTime: '09:30',
    locationName: 'Living Word Church, Grand Baie',
    approved: true,
    visibility: 'public',
    chatbotAnswerEligible: true,
    expiresAt: null,
    startsAt: null,
    ...overrides,
  };
}

/**
 * @param {Array<Record<string, unknown>>} atoms
 * @param {Array<Record<string, unknown>>} schedules
 * @param {number} [sessionLogCount]
 */
function makeFakePrisma(atoms, schedules, sessionLogCount = 0) {
  const logs = [];
  return {
    logs,
    tenantKnowledgeAtom: {
      findMany: async ({ where }) =>
        atoms.filter(
          (a) =>
            a.tenantId === where.tenantId &&
            a.approved === true &&
            a.aiAnswerEligible === true &&
            (!a.expiresAt || new Date(a.expiresAt) > NOW),
        ),
    },
    tenantScheduleEntry: {
      findMany: async ({ where }) =>
        schedules.filter(
          (s) =>
            s.tenantId === where.tenantId &&
            s.approved === true &&
            s.chatbotAnswerEligible === true &&
            (!s.expiresAt || new Date(s.expiresAt) > NOW),
        ),
    },
    chatWidgetAiUsageLog: {
      create: async ({ data }) => {
        logs.push(data);
        return { id: `log_${logs.length}`, ...data };
      },
      count: async () => sessionLogCount,
    },
    chatWidgetConfig: {
      findUnique: async () => null,
      update: async () => ({}),
    },
  };
}

function baseCfg(overrides = {}) {
  return {
    tenantId: LWM_TENANT_ID,
    enabled: true,
    aiEnabled: true,
    aiSessionMessageCap: 5,
    aiBudgetMonthlyUsd: 5,
    aiBudgetSpentUsd: 0,
    aiBudgetMonthYyyymm: null,
    rateLimitPerWindow: 30,
    rateLimitWindowSeconds: 300,
    allowedOrigins: [],
    ...overrides,
  };
}

test('flow v4 validates with Ask a question option', () => {
  const flow = validateFlow(LIVING_WORD_FLOW_V3);
  assert.equal(flow.nodes.welcome.options.length, 9);
  const ask = flow.nodes.welcome.options.find((o) => o.widget_action === 'ai_ask');
  assert.ok(ask);
  assert.equal(ask.label, 'Ask a question');
});

test('eight guided paths remain besides Ask a question', () => {
  const guided = LIVING_WORD_FLOW_V3.nodes.welcome.options.filter((o) => !o.widget_action);
  assert.equal(guided.length, 8);
});

test('emergency question triggers safety refusal', () => {
  const r = evaluateQuestionSafety('I want to kill myself right now');
  assert.equal(r.allowed, false);
  assert.equal(r.route, 'emergency');
});

test('business endorsement question stays neutral via safety route', () => {
  const r = evaluateQuestionSafety('Can you recommend a trusted business from the network?');
  assert.equal(r.allowed, false);
  assert.equal(r.route, 'business_endorsement');
  assert.match(r.answer || '', /cannot recommend|neutral/i);
});

test('youth child PII question refused', () => {
  const r = evaluateQuestionSafety("What is my child's name and school?");
  assert.equal(r.allowed, false);
  assert.equal(r.route, 'youth_child_pii');
});

test('tenant isolation in retrieval context', async () => {
  const prisma = makeFakePrisma([sampleAtom()], [sampleSchedule()]);
  const lwm = await buildRetrievalContext(prisma, LWM_TENANT_ID, 'Sunday service time', { now: NOW });
  assert.ok(lwm.atoms.length >= 1);
  const luxe = await buildRetrievalContext(prisma, 'luxe-maurice', 'Sunday service', { now: NOW });
  assert.equal(luxe.atoms.length, 0);
  assert.equal(luxe.schedules.length, 0);
});

test('schedule context included for service time question', async () => {
  const prisma = makeFakePrisma([sampleAtom()], [sampleSchedule()]);
  const ctx = await buildRetrievalContext(prisma, LWM_TENANT_ID, 'What time is Sunday service?', { now: NOW });
  assert.ok(ctx.scheduleEntryIds.includes('sched_sunday'));
  assert.match(ctx.contextText, /Sunday Service/);
});

test('unknown question with empty context returns fallback mode', async () => {
  const prisma = makeFakePrisma([], []);
  const result = await answerChatWidgetQuestion(prisma, {
    cfg: baseCfg(),
    threadId: 'thread_1',
    question: 'Who is the secret internal pastor?',
    now: NOW,
  });
  assert.equal(result.mode, AI_USAGE_MODES.EMPTY_CONTEXT);
  assert.match(result.answer, /do not have an approved answer/i);
});

test('session cap enforced', async () => {
  const prisma = makeFakePrisma([sampleAtom()], [sampleSchedule()], 5);
  const result = await answerChatWidgetQuestion(prisma, {
    cfg: baseCfg({ aiSessionMessageCap: 5 }),
    threadId: 'thread_cap',
    question: 'Where is the church?',
    now: NOW,
  });
  assert.equal(result.mode, AI_USAGE_MODES.SESSION_CAP);
});

test('ai disabled returns ai_disabled mode', async () => {
  const prisma = makeFakePrisma([sampleAtom()], [sampleSchedule()]);
  const result = await answerChatWidgetQuestion(prisma, {
    cfg: baseCfg({ aiEnabled: false }),
    threadId: 'thread_off',
    question: 'Where is the church?',
    now: NOW,
  });
  assert.equal(result.mode, AI_USAGE_MODES.AI_DISABLED);
});

test('retrieval preview or groq path returns answer for location question', async () => {
  const prisma = makeFakePrisma(
    [
      sampleAtom({
        id: 'atom_loc',
        category: 'location',
        title: 'Church location',
        summary: 'Grand Baie',
        body: 'Richmond Hill Building, Grand Baie.',
      }),
    ],
    [],
  );
  const result = await answerChatWidgetQuestion(prisma, {
    cfg: baseCfg(),
    threadId: 'thread_loc',
    question: 'Where is Living Word church located?',
    now: NOW,
  });
  assert.ok(
    result.mode === AI_USAGE_MODES.RETRIEVAL_PREVIEW || result.mode === AI_USAGE_MODES.GROQ_LLM,
    `expected preview or groq, got ${result.mode}`,
  );
  assert.ok(result.contextAtomIds.includes('atom_loc'));
  if (!isGroqConfigured()) {
    assert.equal(result.mode, AI_USAGE_MODES.RETRIEVAL_PREVIEW);
    assert.match(result.answer, /Grand Baie|approved church records/i);
  }
});

test('sanitiseVisitorQuestion caps length', () => {
  const long = 'a'.repeat(600);
  assert.equal(sanitiseVisitorQuestion(long).length, 500);
});

test('sanitiseModelAnswer caps answer length', () => {
  assert.equal(sanitiseModelAnswer('x'.repeat(800), 600).length, 600);
});

test('usage log records atom and schedule ids', async () => {
  const prisma = makeFakePrisma([sampleAtom()], [sampleSchedule()]);
  await answerChatWidgetQuestion(prisma, {
    cfg: baseCfg(),
    threadId: 'thread_log',
    question: 'Sunday service time?',
    now: NOW,
  });
  assert.equal(prisma.logs.length, 1);
  assert.ok(Array.isArray(prisma.logs[0].contextAtomIds));
  assert.ok(Array.isArray(prisma.logs[0].scheduleEntryIds));
});
