/**
 * One-shot diagnostics for the tenant Change Console (Postgres tables + GitHub dispatch).
 * Returned on GET /api/ui/context for logged-in tenant sessions — no extra round trips.
 */

import { PrismaClient } from '@prisma/client';

import { cfg } from './runtime-config.js';

const prisma = new PrismaClient();

/**
 * @param {string | null | undefined} tenantId
 * @returns {Promise<{
 *   postgres_configured: boolean,
 *   cmp_tickets_ok: boolean,
 *   tenant_personas_ok: boolean,
 *   token_debits_table_ok: boolean,
 *   attachments_table_ok: boolean,
 *   github_dispatch_ready: boolean,
 *   warnings: string[],
 * }>}
 */
export async function getChangeConsoleReadinessForTenant(tenantId) {
  const tid = tenantId != null ? String(tenantId).trim() : '';
  /** @type {string[]} */
  const warnings = [];
  const postgresConfigured = Boolean(String(cfg('POSTGRES_URL', '')).trim());

  const out = {
    postgres_configured: postgresConfigured,
    cmp_tickets_ok: false,
    tenant_personas_ok: false,
    token_debits_table_ok: false,
    attachments_table_ok: false,
    github_dispatch_ready: false,
    warnings,
  };

  if (!postgresConfigured) {
    warnings.push('POSTGRES_URL is not set — tickets and wallet cannot persist.');
    return out;
  }

  try {
    await prisma.cmpTicket.findFirst({ take: 1, select: { id: true } });
    out.cmp_tickets_ok = true;
  } catch {
    warnings.push('Database: cmp_tickets is not usable — run factory POST /api/factory/postgres/ensure-schema and Prisma migrate/db push.');
  }

  try {
    await prisma.tenantPersona.findFirst({ take: 1, select: { tenantId: true } });
    out.tenant_personas_ok = true;
  } catch {
    warnings.push('Database: tenant_personas is not usable — wallet and approve-build debits will fail.');
  }

  if (tid && out.tenant_personas_ok) {
    try {
      await prisma.tenantPersona.findUnique({ where: { tenantId: tid }, select: { tenantId: true } });
    } catch {
      warnings.push('Could not read your tenant wallet row — check tenant_personas and tenant id.');
    }
  }

  try {
    await prisma.tokenDebit.findFirst({ take: 1, select: { id: true } });
    out.token_debits_table_ok = true;
  } catch {
    warnings.push(
      'Database: token_debits table missing or unreachable — Approve build uses a fallback debit (wallet still updates). Run ensure-schema when you can for audit rows.',
    );
  }

  try {
    await prisma.cmpTicketAttachment.findFirst({ take: 1, select: { id: true } });
    out.attachments_table_ok = true;
  } catch {
    warnings.push('Database: cmp_ticket_attachments missing — uploads will fail until ensure-schema + Prisma.');
  }

  const repo = String(cfg('CMP_GITHUB_REPOSITORY', cfg('GITHUB_REPO', ''))).trim();
  const tok = String(cfg('CMP_GITHUB_TOKEN', cfg('GH_WORKFLOW_TOKEN', ''))).trim();
  out.github_dispatch_ready = Boolean(repo && tok);
  if (!out.github_dispatch_ready) {
    warnings.push(
      'GitHub: set CMP_GITHUB_REPOSITORY (or GITHUB_REPO) and CMP_GITHUB_TOKEN — without both, Approve build still saves the ticket but the sandbox workflow will not dispatch.',
    );
  }

  return out;
}
