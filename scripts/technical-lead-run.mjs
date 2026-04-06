#!/usr/bin/env node
/**
 * Run Technical Lead Phase A observer locally (writes technical_lead_audits rows).
 *
 *   npm run technical-lead:run
 *   npm run technical-lead:run -- --ticket=cmnju526m0000jm04j34qd5qw
 *   npm run technical-lead:run -- --dry-run
 *   npm run technical-lead:run -- --limit=25
 *
 * Env: POSTGRES_URL, CMP_GITHUB_TOKEN (or GITHUB_TOKEN), GITHUB_REPO (or CMP_GITHUB_REPOSITORY),
 * optional CORPFLOW_FACTORY_HEALTH_URL for factory health probe,
 * optional VERCEL_TOKEN + VERCEL_PROJECT_ID (+ VERCEL_TEAM_ID / VERCEL_ORG_ID) for preview deployment evidence,
 * optional config/technical-lead-checklist.v1.json and CORPFLOW_TECHNICAL_LEAD_LLM_SUMMARY + GROQ_API_KEY.
 */

import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';
import { runTechnicalLeadObserver } from '../lib/cmp/_lib/technical-lead-observer.js';

function parseArgs(argv) {
  const out = { ticket: '', dryRun: false, limit: 15, json: false };
  for (const a of argv) {
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--json') out.json = true;
    else if (a.startsWith('--ticket=')) out.ticket = a.slice('--ticket='.length).trim();
    else if (a.startsWith('--limit=')) {
      const n = Number.parseInt(a.slice('--limit='.length), 10);
      if (Number.isFinite(n) && n > 0) out.limit = Math.min(50, n);
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const pgUrl = String(process.env.POSTGRES_URL || '').trim();
  if (!pgUrl) {
    console.error('POSTGRES_URL is required.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const out = await runTechnicalLeadObserver(prisma, {
      limit: args.limit,
      ticketIds: args.ticket ? [args.ticket] : undefined,
      dryRun: args.dryRun,
    });
    if (args.json) {
      console.log(JSON.stringify(out, null, 2));
    } else {
      console.log(out.ok ? 'ok' : 'failed', `processed=${out.processed}`, args.dryRun ? '(dry-run)' : '');
      for (const r of out.results || []) {
        console.log('-', r.ticket_id, r.skipped ? `skipped:${r.reason}` : `gaps=${r.gap_count} audit=${r.audit_id || '—'}`);
        if (!args.json && r.summary) console.log(' ', r.summary);
      }
    }
    process.exit(0);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
