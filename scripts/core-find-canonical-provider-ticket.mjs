#!/usr/bin/env node
/**
 * Read-only: find the newest Core/provider ticket created from
 * public/core-provider-canonical-ticket.html (description body match).
 *
 *   node scripts/core-find-canonical-provider-ticket.mjs
 *
 * Env: POSTGRES_URL (via shell or .env from bootstrap-repo-env)
 */

import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NEEDLE = 'CorpFlowAI Core — end-to-end provider operating process';

if (!String(process.env.POSTGRES_URL || '').trim()) {
  console.error('POSTGRES_URL is required.');
  process.exit(1);
}

const rows = await prisma.cmpTicket.findMany({
  where: {
    tenantId: null,
    description: { contains: NEEDLE, mode: 'insensitive' },
  },
  orderBy: { createdAt: 'desc' },
  take: 8,
  select: {
    id: true,
    tenantId: true,
    status: true,
    stage: true,
    createdAt: true,
    updatedAt: true,
    description: true,
  },
});

console.log(
  JSON.stringify(
    {
      ok: true,
      count: rows.length,
      tickets: rows.map((r) => ({
        id: r.id,
        tenantId: r.tenantId,
        status: r.status,
        stage: r.stage,
        createdAt: r.createdAt.toISOString(),
        description_prefix: (r.description || '').slice(0, 120).replace(/\s+/g, ' '),
      })),
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
