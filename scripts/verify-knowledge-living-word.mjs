#!/usr/bin/env node
/**
 * Read-only verification for Living Word knowledge atoms v1.
 *
 * Usage: node scripts/verify-knowledge-living-word.mjs
 */

import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';
import { getKnowledgeAtomsForTenant } from '../lib/server/tenant-knowledge/atoms.js';

const prisma = new PrismaClient();
const TENANT_ID = 'living-word-mauritius';

async function main() {
  const all = await prisma.tenantKnowledgeAtom.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: [{ category: 'asc' }, { atomKey: 'asc' }],
  });

  /** @type {Record<string, number>} */
  const byCategory = {};
  let approvedCount = 0;
  let unapprovedCount = 0;
  for (const row of all) {
    byCategory[row.category] = (byCategory[row.category] || 0) + 1;
    if (row.approved) approvedCount += 1;
    else unapprovedCount += 1;
  }

  const approvedAnswerable = await getKnowledgeAtomsForTenant(prisma, TENANT_ID, {
    approvedOnly: true,
  });
  const chatbot = await getKnowledgeAtomsForTenant(prisma, TENANT_ID, {
    purpose: 'chatbot',
  });
  const ai = await getKnowledgeAtomsForTenant(prisma, TENANT_ID, { purpose: 'ai' });
  const luxe = await getKnowledgeAtomsForTenant(prisma, 'luxe-maurice', {
    approvedOnly: true,
  });
  const unapprovedIncluded = await getKnowledgeAtomsForTenant(prisma, TENANT_ID, {
    approvedOnly: false,
  });

  console.log(
    JSON.stringify(
      {
        tenantId: TENANT_ID,
        totalRows: all.length,
        byCategory,
        approvedCount,
        unapprovedCount,
        approvedAnswerableCount: approvedAnswerable.length,
        chatbotEligibleCount: chatbot.length,
        aiEligibleCount: ai.length,
        luxeTenantRows: luxe.length,
        unapprovedIncludedCount: unapprovedIncluded.length,
        approvedAnswerableKeys: approvedAnswerable.map((r) => r.atomKey),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
