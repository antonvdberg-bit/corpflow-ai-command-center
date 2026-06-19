#!/usr/bin/env node
/**
 * Enable retrieval AI for Living Word sandbox chatbot (ai_enabled flag only).
 * Does not change chatbot enabled kill-switch. Requires GROQ_API_KEY in Vercel for LLM mode.
 *
 * Usage:
 *   node scripts/enable-chat-widget-ai-living-word.mjs
 */

import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TENANT_ID = 'living-word-mauritius';
const dryRun = process.argv.includes('--dry-run');

async function main() {
  const existing = await prisma.chatWidgetConfig.findUnique({
    where: { tenantId: TENANT_ID },
    select: { tenantId: true, enabled: true, aiEnabled: true, aiSessionMessageCap: true, aiBudgetMonthlyUsd: true },
  });
  if (!existing) {
    console.error(JSON.stringify({ ok: false, error: 'config_not_found' }, null, 2));
    process.exit(1);
  }

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          dry_run: true,
          before: existing,
          will_set: { aiEnabled: true, aiSessionMessageCap: 5, aiBudgetMonthlyUsd: 5 },
        },
        null,
        2,
      ),
    );
    return;
  }

  const row = await prisma.chatWidgetConfig.update({
    where: { tenantId: TENANT_ID },
    data: {
      aiEnabled: true,
      aiSessionMessageCap: 5,
      aiBudgetMonthlyUsd: 5,
    },
    select: {
      tenantId: true,
      enabled: true,
      aiEnabled: true,
      aiSessionMessageCap: true,
      aiBudgetMonthlyUsd: true,
      updatedAt: true,
    },
  });
  console.log(JSON.stringify({ ok: true, row }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
