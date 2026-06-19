/**
 * Usage logging for chat widget retrieval AI.
 */

import { ESTIMATED_USD_PER_CALL } from './constants.js';

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{
 *   tenantId: string;
 *   threadId: string;
 *   question: string;
 *   answer?: string | null;
 *   mode: string;
 *   provider?: string | null;
 *   model?: string | null;
 *   contextAtomIds?: string[];
 *   scheduleEntryIds?: string[];
 *   safetyRoute?: string | null;
 *   refusalReason?: string | null;
 *   tokenPrompt?: number | null;
 *   tokenCompletion?: number | null;
 *   tokenTotal?: number | null;
 * }} row
 */
export async function logChatWidgetAiUsage(prisma, row) {
  await prisma.chatWidgetAiUsageLog.create({
    data: {
      tenantId: row.tenantId,
      threadId: row.threadId,
      question: String(row.question || '').slice(0, 2000),
      answer: row.answer != null ? String(row.answer).slice(0, 4000) : null,
      mode: row.mode,
      provider: row.provider || null,
      model: row.model || null,
      contextAtomIds: row.contextAtomIds?.length ? row.contextAtomIds : undefined,
      scheduleEntryIds: row.scheduleEntryIds?.length ? row.scheduleEntryIds : undefined,
      safetyRoute: row.safetyRoute || null,
      refusalReason: row.refusalReason || null,
      tokenPrompt: row.tokenPrompt ?? null,
      tokenCompletion: row.tokenCompletion ?? null,
      tokenTotal: row.tokenTotal ?? null,
    },
  });
}

/**
 * Increment tenant monthly AI budget spent (placeholder tracking).
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} tenantId
 * @param {number} [usdDelta]
 */
export async function bumpAiBudgetSpent(prisma, tenantId, usdDelta = ESTIMATED_USD_PER_CALL) {
  const now = new Date();
  const yyyymm = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const cur = await prisma.chatWidgetConfig.findUnique({
    where: { tenantId },
    select: { aiBudgetMonthYyyymm: true, aiBudgetSpentUsd: true, aiBudgetMonthlyUsd: true },
  });
  if (!cur || !(Number(cur.aiBudgetMonthlyUsd) > 0)) return;

  if (cur.aiBudgetMonthYyyymm !== yyyymm) {
    await prisma.chatWidgetConfig.update({
      where: { tenantId },
      data: { aiBudgetMonthYyyymm: yyyymm, aiBudgetSpentUsd: usdDelta },
    });
  } else {
    await prisma.chatWidgetConfig.update({
      where: { tenantId },
      data: { aiBudgetSpentUsd: { increment: usdDelta } },
    });
  }
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} tenantId
 * @param {string} threadId
 * @returns {Promise<number>}
 */
export async function countSessionAiMessages(prisma, tenantId, threadId) {
  return prisma.chatWidgetAiUsageLog.count({
    where: { tenantId, threadId },
  });
}

/**
 * @param {Awaited<ReturnType<import('../config.js').loadConfigForRequest>>} cfg
 * @returns {boolean}
 */
export function isTenantAiBudgetExhausted(cfg) {
  if (!cfg) return true;
  const cap = Number(cfg.aiBudgetMonthlyUsd || 0);
  if (!(cap > 0)) return false;
  return Number(cfg.aiBudgetSpentUsd || 0) >= cap;
}
