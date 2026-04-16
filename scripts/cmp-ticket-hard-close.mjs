#!/usr/bin/env node
/**
 * Hard-close a CMP ticket in Postgres (status/stage Closed + console_json closure).
 * Operator use: set POSTGRES_URL, then run with ticket id.
 *
 *   node scripts/cmp-ticket-hard-close.mjs <ticket_id> [--reason "text"] [--context-note "longer text"]
 *
 * Prefer the HTTP action `ticket-hard-close` when the app is deployed (same semantics).
 */

import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';
import { buildHardCloseConsoleJsonPatch } from '../lib/cmp/_lib/ticket-hard-close-core.js';

const prisma = new PrismaClient();

function argAfter(flag) {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1]) return String(process.argv[i + 1]).trim();
  return '';
}

const ticketId = process.argv[2] && !String(process.argv[2]).startsWith('-') ? String(process.argv[2]).trim() : '';
const reason = argAfter('--reason') || '';
const contextNote = argAfter('--context-note') || '';

if (!ticketId) {
  console.error('Usage: node scripts/cmp-ticket-hard-close.mjs <ticket_id> [--reason "optional note"]');
  process.exit(1);
}

const pg = String(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || '').trim();
if (!pg) {
  console.error('POSTGRES_URL (or POSTGRES_PRISMA_URL) must be set.');
  process.exit(1);
}

const row = await prisma.cmpTicket.findUnique({
  where: { id: ticketId },
  select: { id: true, tenantId: true, status: true, consoleJson: true },
});

if (!row) {
  console.error('Ticket not found:', ticketId);
  process.exit(1);
}

if (String(row.status || '').toLowerCase() === 'closed') {
  console.log(JSON.stringify({ ok: true, ticket_id: ticketId, already_closed: true }, null, 2));
  await prisma.$disconnect();
  process.exit(0);
}

const nextCj = buildHardCloseConsoleJsonPatch(row.consoleJson, {
  reason: reason || undefined,
  contextNote: contextNote || undefined,
});

await prisma.cmpTicket.update({
  where: { id: ticketId },
  data: {
    status: 'Closed',
    stage: 'Closed',
    consoleJson: nextCj,
  },
});

console.log(JSON.stringify({ ok: true, ticket_id: ticketId, status: 'Closed' }, null, 2));
await prisma.$disconnect();
