#!/usr/bin/env node
/**
 * Seed Living Word chatbot lead follow-up workflow definition v1.
 *
 * Usage:
 *   node scripts/seed-workflow-lwm-chatbot-lead-v1.mjs
 *   node scripts/seed-workflow-lwm-chatbot-lead-v1.mjs --dry-run
 */

import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';

import { buildLivingWordChatbotLeadDefinitionSeedRow } from '../lib/server/tenant-workflow/definitions.js';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

async function main() {
  const row = buildLivingWordChatbotLeadDefinitionSeedRow();
  console.log('[seed-workflow-lwm] upserting definition', {
    id: row.id,
    tenant_id: row.tenantId,
    workflow_key: row.workflowKey,
    version: row.version,
    trigger: row.triggerEventType,
  });

  if (dryRun) {
    console.log('[seed-workflow-lwm] dry-run — no DB write');
    return;
  }

  await prisma.workflowDefinition.upsert({
    where: {
      workflow_definitions_tenant_key_version: {
        tenantId: row.tenantId,
        workflowKey: row.workflowKey,
        version: row.version,
      },
    },
    create: row,
    update: {
      name: row.name,
      triggerEventType: row.triggerEventType,
      status: row.status,
      definitionJson: row.definitionJson,
    },
  });

  console.log('[seed-workflow-lwm] done');
}

main()
  .catch((e) => {
    console.error('[seed-workflow-lwm] failed', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
