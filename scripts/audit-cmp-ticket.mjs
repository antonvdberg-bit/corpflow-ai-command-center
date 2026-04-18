#!/usr/bin/env node
/**
 * Operator audit: print cmp_tickets row + derived Change Console workflow for one ticket id.
 *
 *   node scripts/audit-cmp-ticket.mjs cmns65g9f0001ld043vox5ctn
 *
 * Env: POSTGRES_URL
 */
import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';
import { deriveWorkflowState } from '../lib/cmp/_lib/change-workflow-state.js';

const prisma = new PrismaClient();
const ticketId = process.argv[2] && !String(process.argv[2]).startsWith('-') ? String(process.argv[2]).trim() : '';

if (!ticketId) {
  console.error('Usage: node scripts/audit-cmp-ticket.mjs <ticket_id>');
  process.exit(1);
}

const pg = String(process.env.POSTGRES_URL || '').trim();
if (!pg) {
  console.error('POSTGRES_URL is required.');
  process.exit(1);
}

const row = await prisma.cmpTicket.findUnique({
  where: { id: ticketId },
  select: { id: true, tenantId: true, status: true, stage: true, title: true, consoleJson: true, createdAt: true, updatedAt: true },
});

if (!row) {
  console.log(JSON.stringify({ ok: false, error: 'ticket_not_found', ticket_id: ticketId }, null, 2));
  await prisma.$disconnect();
  process.exit(2);
}

const cj = row.consoleJson && typeof row.consoleJson === 'object' ? row.consoleJson : {};
const cv = cj.client_view && typeof cj.client_view === 'object' ? cj.client_view : {};
const prom = cj.promotion && typeof cj.promotion === 'object' ? cj.promotion : {};
const closure = cv.closure && typeof cv.closure === 'object' ? cv.closure : {};

const derived = deriveWorkflowState({
  status: row.status || '',
  stage: row.stage || '',
  consoleJson: cj,
});

const persistedWf = cv.workflow_state != null ? String(cv.workflow_state) : null;

console.log(
  JSON.stringify(
    {
      ok: true,
      ticket_id: row.id,
      tenant_id: row.tenantId,
      status: row.status,
      stage: row.stage,
      title: row.title,
      created_at: row.createdAt?.toISOString?.() || row.createdAt,
      updated_at: row.updatedAt?.toISOString?.() || row.updatedAt,
      persisted_client_view_workflow_state: persistedWf,
      derived_workflow_state_for_change_console: derived,
      promotion_merged: prom.merged === true,
      closure_kind: closure.kind != null ? String(closure.kind) : null,
      preview_review_decision:
        cv.preview_review && typeof cv.preview_review === 'object' && cv.preview_review.decision != null
          ? String(cv.preview_review.decision)
          : null,
      mismatch_persisted_vs_derived: persistedWf != null && String(persistedWf).toLowerCase() !== String(derived).toLowerCase(),
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
