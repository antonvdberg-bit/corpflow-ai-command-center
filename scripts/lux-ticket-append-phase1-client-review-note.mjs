#!/usr/bin/env node
/**
 * Append Phase 1 client-review / Phase 2 gate note to CMP ticket description (idempotent).
 *
 * Usage:
 *   node scripts/lux-ticket-append-phase1-client-review-note.mjs --ticket=cmo8mjijk0000jl04l1jz0v6d --execute
 *
 * Dry-run (prints block only):
 *   node scripts/lux-ticket-append-phase1-client-review-note.mjs --ticket=cmo8mjijk0000jl04l1jz0v6d
 *
 * Env: POSTGRES_URL
 */
import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function argValue(prefix) {
  const a = process.argv.find((s) => String(s).startsWith(prefix));
  if (!a) return '';
  const i = a.indexOf('=');
  if (i < 0) return '';
  return String(a.slice(i + 1)).trim();
}

const ticketId = argValue('--ticket') || '';
const execute = process.argv.includes('--execute');

const MARKER = '<!-- lux-phase1-client-review-note:2026-05-04 -->';

const BLOCK = [
  '',
  '---',
  '',
  MARKER,
  '',
  '**Operator note — Phase 1 vs Phase 2**',
  '',
  'Phase 1 is ready for client review (presentation + concierge on lux.corpflowai.com). Phase 2 (IDX / property discovery) is **blocked** until the client submits the Phase 1 review form and explicitly allows Phase 2 to start.',
  '',
].join('\n');

if (!ticketId) {
  console.error('Usage: node scripts/lux-ticket-append-phase1-client-review-note.mjs --ticket=<id> [--execute]');
  process.exit(1);
}

const pg = String(process.env.POSTGRES_URL || '').trim();
if (!pg) {
  console.error('POSTGRES_URL is required.');
  process.exit(1);
}

async function main() {
  const row = await prisma.cmpTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, description: true, tenantId: true },
  });
  if (!row) {
    console.error('Ticket not found:', ticketId);
    process.exit(1);
  }
  const prev = row.description != null ? String(row.description) : '';
  if (prev.includes(MARKER)) {
    console.log('Already present (marker found). No change.');
    return;
  }
  const next = prev + BLOCK;
  console.log(execute ? 'Writing…' : 'Dry-run (omit --execute to skip write).');
  console.log(BLOCK);
  if (!execute) return;
  await prisma.cmpTicket.update({
    where: { id: ticketId },
    data: { description: next },
  });
  console.log('Updated description for', ticketId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
