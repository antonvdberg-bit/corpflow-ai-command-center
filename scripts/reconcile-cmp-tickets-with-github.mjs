#!/usr/bin/env node
/**
 * For each non-closed CMP ticket (per tenant or all), check GitHub for cmp/<ticket_id> → main PR.
 * If a merged PR exists but Postgres promotion is stale, update console_json + close the row.
 *
 * Usage:
 *   node scripts/reconcile-cmp-tickets-with-github.mjs
 *   node scripts/reconcile-cmp-tickets-with-github.mjs --tenant-id=luxe-maurice
 *   node scripts/reconcile-cmp-tickets-with-github.mjs --all-tenants
 *   node scripts/reconcile-cmp-tickets-with-github.mjs --dry-run
 */
import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const dryRun = process.argv.includes('--dry-run');
const allTenants = process.argv.includes('--all-tenants');
let tenantId = '';
const tArg = process.argv.find((a) => a.startsWith('--tenant-id='));
if (tArg) tenantId = tArg.split('=')[1]?.trim() || '';

function parseGithubRepo() {
  const raw = String(
    process.env.CMP_GITHUB_REPOSITORY || process.env.GITHUB_REPO || process.env.GITHUB_REPOSITORY || '',
  ).trim();
  const s = raw.replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '');
  const parts = s.split('/').filter(Boolean);
  if (parts.length >= 2) return { owner: parts[0], repo: parts[1] };
  return { owner: 'antonvdberg-bit', repo: 'corpflow-ai-command-center' };
}

const { owner, repo } = parseGithubRepo();

/**
 * @param {string} ticketId
 * @returns {Promise<{ state: string, merged: boolean, merged_at: string | null, number: number | null, html_url: string | null } | null>}
 */
async function fetchPrForTicket(ticketId) {
  const head = `${owner}:cmp/${encodeURIComponent(ticketId)}`;
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&head=${head}&base=main&per_page=5`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(process.env.GH_TOKEN || process.env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${process.env.GH_TOKEN || process.env.GITHUB_TOKEN}` }
        : {}),
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GitHub ${res.status}: ${t.slice(0, 200)}`);
  }
  /** @type {unknown} */
  const arr = await res.json();
  if (!Array.isArray(arr) || !arr[0]) return null;
  const pr = arr[0];
  return {
    state: String(pr.state || ''),
    merged: Boolean(pr.merged_at),
    merged_at: pr.merged_at != null ? String(pr.merged_at) : null,
    number: typeof pr.number === 'number' ? pr.number : null,
    html_url: pr.html_url != null ? String(pr.html_url) : null,
  };
}

function promotionAlreadyMerged(cj) {
  const p = cj?.promotion && typeof cj.promotion === 'object' ? cj.promotion : {};
  return p.merged === true && p.pr_number != null;
}

/**
 * @param {unknown} consoleJson
 * @param {string} ticketId
 * @param {{ number: number, html_url: string | null, merged_at: string }} pr
 */
function buildReconciledConsoleJson(consoleJson, ticketId, pr) {
  const cj = consoleJson && typeof consoleJson === 'object' && !Array.isArray(consoleJson) ? { ...consoleJson } : {};
  const cv = cj.client_view && typeof cj.client_view === 'object' ? { ...cj.client_view } : {};
  const nowIso = new Date().toISOString();
  return {
    ...cj,
    promotion: {
      ...(cj.promotion && typeof cj.promotion === 'object' ? cj.promotion : {}),
      ticket_id: ticketId,
      pr_number: pr.number,
      pr_url: pr.html_url,
      merged: true,
      merged_at: pr.merged_at,
      updated_at: nowIso,
      last_error: null,
    },
    client_view: {
      ...cv,
      workflow_state: 'published',
      workflow_next_action: 'Published.',
      progress_message: `Merged via PR #${pr.number} (${pr.merged_at?.slice(0, 10) || '—'}). Ticket closed — DB reconciled with GitHub.`,
      closure: {
        kind: 'reconciled_merged',
        pr_number: pr.number,
        pr_url: pr.html_url,
        merged_at: pr.merged_at,
        decided_at: nowIso,
        note: 'PR was already merged on GitHub; cmp_tickets row was updated by reconcile-cmp-tickets-with-github.mjs.',
        context_note: `PR #${pr.number} was merged to main. This ticket is closed; production follows your Vercel deployment.`,
      },
    },
  };
}

const where = allTenants
  ? { NOT: { status: { equals: 'Closed', mode: 'insensitive' } } }
  : {
      tenantId: tenantId || 'luxe-maurice',
      NOT: { status: { equals: 'Closed', mode: 'insensitive' } },
    };

const rows = await prisma.cmpTicket.findMany({
  where,
  orderBy: { updatedAt: 'desc' },
  select: { id: true, tenantId: true, status: true, stage: true, consoleJson: true },
});

/** @type {Array<Record<string, unknown>>} */
const report = [];

for (const row of rows) {
  const ticketId = row.id;
  let pr;
  try {
    pr = await fetchPrForTicket(ticketId);
  } catch (e) {
    report.push({
      ticket_id: ticketId,
      tenant_id: row.tenantId,
      action: 'error',
      detail: e instanceof Error ? e.message : String(e),
    });
    continue;
  }

  if (!pr) {
    report.push({
      ticket_id: ticketId,
      tenant_id: row.tenantId,
      action: 'no_pr',
      detail: 'No cmp/<ticket> PR found vs main (branch may never have been opened or different repo).',
    });
    continue;
  }

  if (!pr.merged) {
    report.push({
      ticket_id: ticketId,
      tenant_id: row.tenantId,
      action: pr.state === 'open' ? 'open_pr' : 'closed_not_merged',
      pr_number: pr.number,
      pr_url: pr.html_url,
      detail:
        pr.state === 'open'
          ? 'PR still open — merge via GitHub or promote-merge when ready.'
          : 'PR closed without merge — manual review.',
    });
    continue;
  }

  const cj = row.consoleJson && typeof row.consoleJson === 'object' ? row.consoleJson : {};
  if (promotionAlreadyMerged(cj)) {
    const p = cj.promotion;
    report.push({
      ticket_id: ticketId,
      tenant_id: row.tenantId,
      action: 'already_synced',
      pr_number: pr.number,
      detail: `Postgres already has merged promotion (pr #${p?.pr_number}).`,
    });
    continue;
  }

  const next = buildReconciledConsoleJson(row.consoleJson, ticketId, {
    number: pr.number,
    html_url: pr.html_url,
    merged_at: pr.merged_at || new Date().toISOString(),
  });

  if (!dryRun) {
    await prisma.cmpTicket.update({
      where: { id: ticketId },
      data: {
        status: 'Closed',
        stage: 'Closed',
        consoleJson: next,
      },
    });
  }

  report.push({
    ticket_id: ticketId,
    tenant_id: row.tenantId,
    action: dryRun ? 'would_reconcile' : 'reconciled',
    pr_number: pr.number,
    pr_url: pr.html_url,
    merged_at: pr.merged_at,
  });
}

console.log(JSON.stringify({ owner, repo, dry_run: dryRun, scope: allTenants ? 'all_tenants' : tenantId || 'luxe-maurice', count: rows.length, results: report }, null, 2));

await prisma.$disconnect();
