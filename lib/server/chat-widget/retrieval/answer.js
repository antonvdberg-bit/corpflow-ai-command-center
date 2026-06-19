/**
 * Chat widget retrieval AI v1 — answer orchestrator.
 *
 * Retrieval-first; Groq when GROQ_API_KEY is configured; retrieval-preview otherwise.
 */

import { buildRetrievalContext, formatRetrievalPreviewAnswer } from './context-builder.js';
import { buildRetrievalSystemPrompt } from './prompts.js';
import { evaluateQuestionSafety, sanitiseModelAnswer } from './safety.js';
import { completeWithGroq, isGroqConfigured } from './providers/groq.js';
import {
  AI_USAGE_MODES,
  DEFAULT_SESSION_MESSAGE_CAP,
  MAX_ANSWER_CHARS,
  MAX_QUESTION_CHARS,
  UNKNOWN_ANSWER_FALLBACK,
} from './constants.js';
import {
  bumpAiBudgetSpent,
  countSessionAiMessages,
  isTenantAiBudgetExhausted,
  logChatWidgetAiUsage,
} from './usage-log.js';

/**
 * @param {string} raw
 * @returns {string}
 */
export function sanitiseVisitorQuestion(raw) {
  return String(raw || '')
    .replace(/[\u0000-\u001F\u007F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_QUESTION_CHARS);
}

/**
 * @typedef {object} AiAnswerResult
 * @property {boolean} ok
 * @property {string} answer
 * @property {string} mode
 * @property {string|null} provider
 * @property {string|null} model
 * @property {string[]} contextAtomIds
 * @property {string[]} scheduleEntryIds
 * @property {string|null} safetyRoute
 * @property {string|null} refusalReason
 */

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{
 *   cfg: NonNullable<Awaited<ReturnType<import('../config.js').loadConfigForRequest>>>;
 *   threadId: string;
 *   question: string;
 *   now?: Date;
 * }} args
 * @returns {Promise<AiAnswerResult>}
 */
export async function answerChatWidgetQuestion(prisma, args) {
  const { cfg, threadId } = args;
  const question = sanitiseVisitorQuestion(args.question);
  const now = args.now instanceof Date ? args.now : new Date();
  const emptyIds = { contextAtomIds: [], scheduleEntryIds: [] };

  if (!cfg.aiEnabled) {
    const answer =
      'Ask a question is not available right now. Please use the menu options or **Contact the church**.';
    await logChatWidgetAiUsage(prisma, {
      tenantId: cfg.tenantId,
      threadId,
      question,
      answer,
      mode: AI_USAGE_MODES.AI_DISABLED,
      ...emptyIds,
    });
    return {
      ok: false,
      answer,
      mode: AI_USAGE_MODES.AI_DISABLED,
      provider: null,
      model: null,
      ...emptyIds,
      safetyRoute: null,
      refusalReason: 'ai_disabled',
    };
  }

  const sessionCap = cfg.aiSessionMessageCap > 0 ? cfg.aiSessionMessageCap : DEFAULT_SESSION_MESSAGE_CAP;
  const sessionCount = await countSessionAiMessages(prisma, cfg.tenantId, threadId);
  if (sessionCount >= sessionCap) {
    const answer =
      'You have reached the question limit for this chat session. Please use **Contact the church** from the menu for further help.';
    await logChatWidgetAiUsage(prisma, {
      tenantId: cfg.tenantId,
      threadId,
      question,
      answer,
      mode: AI_USAGE_MODES.SESSION_CAP,
      ...emptyIds,
      refusalReason: 'session_cap',
    });
    return {
      ok: false,
      answer,
      mode: AI_USAGE_MODES.SESSION_CAP,
      provider: null,
      model: null,
      ...emptyIds,
      safetyRoute: null,
      refusalReason: 'session_cap',
    };
  }

  if (isTenantAiBudgetExhausted(cfg)) {
    const answer =
      'AI answers are temporarily unavailable. Please use the menu or **Contact the church**.';
    await logChatWidgetAiUsage(prisma, {
      tenantId: cfg.tenantId,
      threadId,
      question,
      answer,
      mode: AI_USAGE_MODES.BUDGET_EXHAUSTED,
      ...emptyIds,
      refusalReason: 'budget_exhausted',
    });
    return {
      ok: false,
      answer,
      mode: AI_USAGE_MODES.BUDGET_EXHAUSTED,
      provider: null,
      model: null,
      ...emptyIds,
      safetyRoute: null,
      refusalReason: 'budget_exhausted',
    };
  }

  const safety = evaluateQuestionSafety(question);
  if (!safety.allowed) {
    const answer = safety.answer || UNKNOWN_ANSWER_FALLBACK;
    await logChatWidgetAiUsage(prisma, {
      tenantId: cfg.tenantId,
      threadId,
      question,
      answer,
      mode: AI_USAGE_MODES.SAFETY_REFUSAL,
      safetyRoute: safety.route || null,
      refusalReason: safety.refusalReason || null,
      ...emptyIds,
    });
    return {
      ok: true,
      answer,
      mode: AI_USAGE_MODES.SAFETY_REFUSAL,
      provider: null,
      model: null,
      ...emptyIds,
      safetyRoute: safety.route || null,
      refusalReason: safety.refusalReason || null,
    };
  }

  const ctx = await buildRetrievalContext(prisma, cfg.tenantId, question, { now });
  const meta = {
    contextAtomIds: ctx.atomIds,
    scheduleEntryIds: ctx.scheduleEntryIds,
  };

  if (!ctx.contextText.trim()) {
    const answer = UNKNOWN_ANSWER_FALLBACK;
    await logChatWidgetAiUsage(prisma, {
      tenantId: cfg.tenantId,
      threadId,
      question,
      answer,
      mode: AI_USAGE_MODES.EMPTY_CONTEXT,
      ...meta,
      refusalReason: 'empty_context',
    });
    return {
      ok: true,
      answer,
      mode: AI_USAGE_MODES.EMPTY_CONTEXT,
      provider: null,
      model: null,
      ...meta,
      safetyRoute: null,
      refusalReason: 'empty_context',
    };
  }

  if (!isGroqConfigured()) {
    const preview = formatRetrievalPreviewAnswer(ctx);
    const answer = sanitiseModelAnswer(preview || UNKNOWN_ANSWER_FALLBACK, MAX_ANSWER_CHARS);
    await logChatWidgetAiUsage(prisma, {
      tenantId: cfg.tenantId,
      threadId,
      question,
      answer,
      mode: AI_USAGE_MODES.RETRIEVAL_PREVIEW,
      provider: null,
      model: null,
      ...meta,
    });
    return {
      ok: true,
      answer,
      mode: AI_USAGE_MODES.RETRIEVAL_PREVIEW,
      provider: null,
      model: null,
      ...meta,
      safetyRoute: null,
      refusalReason: null,
    };
  }

  const systemPrompt = buildRetrievalSystemPrompt(ctx.contextText);
  const llm = await completeWithGroq({
    systemPrompt,
    question,
    maxTokens: 220,
    temperature: 0.2,
  });

  if (!llm.ok || !llm.text) {
    const answer =
      'I am unable to answer right now. Please check livingwordmauritius.com or use **Contact the church** from the menu.';
    await logChatWidgetAiUsage(prisma, {
      tenantId: cfg.tenantId,
      threadId,
      question,
      answer,
      mode: AI_USAGE_MODES.PROVIDER_UNAVAILABLE,
      provider: llm.provider || null,
      model: llm.model || null,
      ...meta,
      refusalReason: llm.error || 'provider_unavailable',
    });
    return {
      ok: false,
      answer,
      mode: AI_USAGE_MODES.PROVIDER_UNAVAILABLE,
      provider: llm.provider || null,
      model: llm.model || null,
      ...meta,
      safetyRoute: null,
      refusalReason: llm.error || 'provider_unavailable',
    };
  }

  let answer = sanitiseModelAnswer(llm.text, MAX_ANSWER_CHARS);
  const lower = answer.toLowerCase();
  if (
    lower.includes('i do not know') ||
    lower.includes("i don't know") ||
    lower.includes('not in the approved') ||
    lower.includes('cannot find')
  ) {
    // Model signalled uncertainty — keep answer but mode stays groq_llm
  }

  await logChatWidgetAiUsage(prisma, {
    tenantId: cfg.tenantId,
    threadId,
    question,
    answer,
    mode: AI_USAGE_MODES.GROQ_LLM,
    provider: llm.provider || null,
    model: llm.model || null,
    ...meta,
    tokenPrompt: llm.promptTokens ?? null,
    tokenCompletion: llm.completionTokens ?? null,
    tokenTotal: llm.totalTokens ?? null,
  });
  await bumpAiBudgetSpent(prisma, cfg.tenantId).catch(() => {});

  return {
    ok: true,
    answer,
    mode: AI_USAGE_MODES.GROQ_LLM,
    provider: llm.provider || null,
    model: llm.model || null,
    ...meta,
    safetyRoute: null,
    refusalReason: null,
  };
}
