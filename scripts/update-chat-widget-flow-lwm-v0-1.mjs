#!/usr/bin/env node
/**
 * Living Word — deploy chat widget flow v3 (contact UX v0.1) to production config.
 *
 * Usage:
 *   node scripts/update-chat-widget-flow-lwm-v0-1.mjs
 *   node scripts/update-chat-widget-flow-lwm-v0-1.mjs --dry-run
 */

import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';
import { LIVING_WORD_FLOW_V3 } from '../lib/server/chat-widget/living-word-flow-v3.js';
import { validateFlow } from '../lib/server/chat-widget/flow.js';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');
const TENANT_ID = 'living-word-mauritius';
const FLOW_VERSION = 3;

async function main() {
  validateFlow(LIVING_WORD_FLOW_V3);
  const summary = { ok: true, dry_run: dryRun, tenant_id: TENANT_ID, flow_version: FLOW_VERSION };

  const existing = await prisma.chatWidgetConfig.findUnique({
    where: { tenantId: TENANT_ID },
    select: { tenantId: true, enabled: true, flowVersion: true },
  });
  if (!existing) {
    summary.ok = false;
    summary.error = 'config_not_found';
    console.error(JSON.stringify(summary, null, 2));
    process.exit(1);
  }
  summary.enabled_before = existing.enabled;
  summary.flow_version_before = existing.flowVersion;

  if (dryRun) {
    summary.node_count = Object.keys(LIVING_WORD_FLOW_V3.nodes).length;
    console.log(JSON.stringify(summary, null, 2));
    await prisma.$disconnect();
    return;
  }

  const row = await prisma.chatWidgetConfig.update({
    where: { tenantId: TENANT_ID },
    data: {
      flowJson: LIVING_WORD_FLOW_V3,
      flowVersion: FLOW_VERSION,
    },
    select: { tenantId: true, enabled: true, flowVersion: true, updatedAt: true },
  });
  summary.row = row;
  console.log(JSON.stringify(summary, null, 2));
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
