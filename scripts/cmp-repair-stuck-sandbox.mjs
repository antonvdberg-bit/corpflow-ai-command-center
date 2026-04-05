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
 *
 * Production: prefer scheduled `/api/cmp/stuck-self-repair-cron` (Bearer CORPFLOW_CRON_SECRET)
 * so repair runs without a developer machine or Cursor.
 */

import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';
import {
  isStuckSandboxDispatch,
  repairSandboxDispatchForTicket,
} from '../lib/cmp/_lib/cmp-stuck-self-repair.js';

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

    const stuck = candidates.filter(isStuckSandboxDispatch);

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
        const d = await repairSandboxDispatchForTicket(prisma, row, {
          baseRef,
          source: 'cmp-repair-script',
        });
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
