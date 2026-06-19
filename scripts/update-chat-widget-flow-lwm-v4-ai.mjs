#!/usr/bin/env node
/**
 * Living Word — deploy chat widget flow v4 (Ask a question / retrieval AI menu).
 *
 * Usage:
 *   node scripts/update-chat-widget-flow-lwm-v4-ai.mjs
 *   node scripts/update-chat-widget-flow-lwm-v4-ai.mjs --dry-run
 */

import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';
import { LIVING_WORD_FLOW_V3 } from '../lib/server/chat-widget/living-word-flow-v3.js';
import { validateFlow } from '../lib/server/chat-widget/flow.js';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');
const TENANT_ID = 'living-word-mauritius';
const FLOW_VERSION = 4;

async function main() {
  validateFlow(LIVING_WORD_FLOW_V3);
  const askOpt = LIVING_WORD_FLOW_V3.nodes.welcome.options.find((o) => o.widget_action === 'ai_ask');
  if (!askOpt) throw new Error('flow_missing_ai_ask_option');

  const existing = await prisma.chatWidgetConfig.findUnique({
    where: { tenantId: TENANT_ID },
    select: { tenantId: true, enabled: true, flowVersion: true, aiEnabled: true },
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
          tenant_id: TENANT_ID,
          flow_version: FLOW_VERSION,
          node_count: Object.keys(LIVING_WORD_FLOW_V3.nodes).length,
          welcome_options: LIVING_WORD_FLOW_V3.nodes.welcome.options.length,
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
      flowJson: LIVING_WORD_FLOW_V3,
      flowVersion: FLOW_VERSION,
    },
    select: { tenantId: true, enabled: true, flowVersion: true, aiEnabled: true, updatedAt: true },
  });
  console.log(JSON.stringify({ ok: true, row }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
