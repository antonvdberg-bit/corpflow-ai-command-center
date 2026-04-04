#!/usr/bin/env node
/**
 * Find CMP tickets that are Approved + Build but sandbox dispatch never succeeded
 * (`client_view.automation.dispatch_ok !== true`), then optionally re-run GitHub
 * `repository_dispatch` and merge console_json the same way as approve-build.
 *
 * Does NOT debit credits again (approve-build already ran).
 *
 * Usage (PowerShell, from repo root; same env as Vercel for GitHub dispatch):
 *
 *   $env:POSTGRES_URL="postgresql://..."
 *   $env:CMP_GITHUB_TOKEN="ghp_..."   # or GH_WORKFLOW_TOKEN / GITHUB_TOKEN
 *   $env:GITHUB_REPO="owner/repo"     # or CMP_GITHUB_REPOSITORY
 *   node scripts/cmp-repair-stuck-sandbox.mjs              # dry-run, list only
 *   node scripts/cmp-repair-stuck-sandbox.mjs --execute    # dispatch + DB update
 *
 * Options:
 *   --execute           Actually call GitHub and update cmp_tickets
 *   --base-ref=main     Passed to dispatch (default: env CMP_SANDBOX_BASE_REF or main)
 *   --tenant=id         Only tickets for this tenant_id
 *   --limit=200         Max rows scanned (Approved+Build), default 500
 *   --json              Print machine-readable JSON only
 */

import { PrismaClient } from '@prisma/client';
import {
  dispatchCmpSandboxStart,
  notifyCmpAutomationWebhook,
} from '../lib/cmp/_lib/github-dispatch.js';
import { recordTrustedAutomationEvent } from '../lib/automation/internal.js';

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function normalizeConsoleJson(v) {
  if (!v) return { messages: [], brief: {}, locale: 'en' };
  if (typeof v === 'string') {
    const parsed = safeJsonParse(v, null);
    if (parsed) return normalizeConsoleJson(parsed);
    return { messages: [], brief: {}, locale: 'en' };
  }
  if (typeof v === 'object' && v !== null) {
    const messages = Array.isArray(v.messages) ? v.messages.slice(0, 200) : [];
    const brief = v.brief && typeof v.brief === 'object' ? v.brief : {};
    const locale = typeof v.locale === 'string' ? v.locale : 'en';
    return { ...v, messages, brief, locale };
  }
  return { messages: [], brief: {}, locale: 'en' };
}

/**
 * @param {{ status?: string | null; stage?: string | null; consoleJson?: unknown }} row
 */
function isStuckSandbox(row) {
  const st = String(row.status || '').trim();
  const sg = String(row.stage || '').trim();
  if (st !== 'Approved' || sg !== 'Build') return false;
  const cj = row.consoleJson && typeof row.consoleJson === 'object' ? row.consoleJson : {};
  const cv = cj.client_view && typeof cj.client_view === 'object' ? cj.client_view : {};
  const auto = cv.automation && typeof cv.automation === 'object' ? cv.automation : {};
  if (auto.dispatch_ok === true) return false;
  return true;
}

function parseArgs(argv) {
  const out = {
    execute: false,
    baseRef: '',
    tenant: '',
    limit: 500,
    json: false,
  };
  for (const a of argv) {
    if (a === '--execute') out.execute = true;
    else if (a === '--json') out.json = true;
    else if (a.startsWith('--base-ref=')) out.baseRef = a.slice('--base-ref='.length).trim();
    else if (a.startsWith('--tenant=')) out.tenant = a.slice('--tenant='.length).trim();
    else if (a.startsWith('--limit=')) {
      const n = Number.parseInt(a.slice('--limit='.length), 10);
      if (Number.isFinite(n) && n > 0) out.limit = Math.min(n, 5000);
    }
  }
  return out;
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ id: string; tenantId: string | null; consoleJson: unknown }} row
 * @param {{ baseRef: string }} opts
 */
async function repairOne(prisma, row, opts) {
  const ticketId = row.id;
  const sandboxDispatch = await dispatchCmpSandboxStart({
    ticketId,
    baseRef: opts.baseRef || undefined,
  });

  await notifyCmpAutomationWebhook({
    ticket_id: ticketId,
    source: 'repair-stuck-sandbox',
    dispatch_ok: sandboxDispatch.ok,
    dispatch_error: sandboxDispatch.error || null,
  });

  if (!sandboxDispatch.ok) {
    return sandboxDispatch;
  }

  const norm = normalizeConsoleJson(row.consoleJson);
  const prevCv = norm.client_view && typeof norm.client_view === 'object' ? norm.client_view : {};
  const prevAuto = prevCv.automation && typeof prevCv.automation === 'object' ? prevCv.automation : {};
  const automation = {
    ...prevAuto,
    dispatch_ok: true,
    github_repo: sandboxDispatch.repo_full_name || prevAuto.github_repo || null,
    branch_name: sandboxDispatch.branch_name || prevAuto.branch_name || null,
    branch_url: sandboxDispatch.branch_url || prevAuto.branch_url || null,
    compare_url: sandboxDispatch.compare_url || prevAuto.compare_url || null,
    workflow_url: sandboxDispatch.workflow_url || prevAuto.workflow_url || null,
    actions_url: sandboxDispatch.actions_url || prevAuto.actions_url || null,
    last_error: null,
    repair_dispatched_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const client_view = {
    ...prevCv,
    status: 'Approved',
    stage: 'Build',
    automation,
    progress_message: 'Sandbox dispatch repaired; automation started.',
  };
  const nextConsole = { ...norm, client_view };

  await prisma.cmpTicket.update({
    where: { id: ticketId },
    data: { stage: 'Build', status: 'Approved', consoleJson: nextConsole },
  });

  await recordTrustedAutomationEvent(prisma, {
    tenantId: row.tenantId,
    eventType: 'cmp.sandbox.repair_dispatch',
    payload: {
      ticket_id: ticketId,
      dispatch_ok: true,
      branch_name: sandboxDispatch.branch_name || null,
      branch_url: sandboxDispatch.branch_url || null,
      workflow_url: sandboxDispatch.workflow_url || null,
      actions_url: sandboxDispatch.actions_url || null,
      error: null,
    },
    idempotencyKey: null,
    source: 'cmp-repair-script',
  });

  return sandboxDispatch;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const pgUrl = String(process.env.POSTGRES_URL || '').trim();
  if (!pgUrl) {
    console.error('POSTGRES_URL is required (same pooled URL as Vercel).');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const where = {
      status: 'Approved',
      stage: 'Build',
      ...(args.tenant ? { tenantId: args.tenant } : {}),
    };

    const candidates = await prisma.cmpTicket.findMany({
      where,
      select: { id: true, tenantId: true, title: true, consoleJson: true, status: true, stage: true },
      take: args.limit,
      orderBy: { updatedAt: 'desc' },
    });

    const stuck = candidates.filter(isStuckSandbox);

    if (!args.json) {
      console.log(
        `Scanned ${candidates.length} Approved/Build ticket(s); ${stuck.length} stuck (dispatch_ok !== true).`,
      );
      for (const r of stuck) {
        console.log(`  - ${r.id}  tenant=${r.tenantId || '(null)'}  ${r.title || ''}`.trimEnd());
      }
    }

    if (!args.execute) {
      if (args.json) {
        console.log(
          JSON.stringify(
            {
              scanned: candidates.length,
              stuck_count: stuck.length,
              stuck: stuck.map((r) => ({
                id: r.id,
                tenant_id: r.tenantId,
                title: r.title,
              })),
              execute: false,
            },
            null,
            2,
          ),
        );
      } else {
        console.log('\nDry-run only. Re-run with --execute to dispatch GitHub and update console_json.');
      }
      return;
    }

    const baseRef = args.baseRef || String(process.env.CMP_SANDBOX_BASE_REF || '').trim() || 'main';
    const results = [];
    for (const row of stuck) {
      try {
        const d = await repairOne(prisma, row, { baseRef });
        results.push({ id: row.id, ok: d.ok, error: d.error || null });
        if (!args.json) {
          console.log(d.ok ? `  OK ${row.id}` : `  FAIL ${row.id}: ${d.error || 'unknown'}`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({ id: row.id, ok: false, error: msg });
        if (!args.json) {
          console.error(`  ERROR ${row.id}: ${msg}`);
        }
      }
    }

    if (args.json) {
      console.log(
        JSON.stringify(
          {
            scanned: candidates.length,
            stuck_count: stuck.length,
            stuck: stuck.map((r) => ({
              id: r.id,
              tenant_id: r.tenantId,
              title: r.title,
            })),
            execute: true,
            base_ref: baseRef,
            results,
          },
          null,
          2,
        ),
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
