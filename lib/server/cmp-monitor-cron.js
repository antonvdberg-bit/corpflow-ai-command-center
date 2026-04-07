import { PrismaClient } from '@prisma/client';

import { timingSafeStringEquals } from './factory-master-auth.js';
import { cfg } from './runtime-config.js';
import {
  extractOutcomesFromConsoleJsonBrief,
  extractOutcomesFromDescription,
} from './factory-cmp-push.js';
import {
  isStuckSandboxDispatch,
  isStuckSandboxEvidenceMissing,
  refreshOverseerForTicket,
  repairSandboxDispatchForTicket,
} from '../cmp/_lib/cmp-stuck-self-repair.js';
import { recordTrustedAutomationEvent } from '../automation/internal.js';
import { fetchCmpTicketActivity } from '../cmp/_lib/github-dispatch.js';

const prisma = new PrismaClient();

function str(v) {
  return v != null ? String(v).trim() : '';
}

function parseCommaIds(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);
}

const DEFAULT_MONITOR_TICKET_IDS = [
  'cmno3wah60000ju04y6mtfkpy',
  'cmno0q3oo0000jv043u6s1716',
  'cmnju526m0000jm04j34qd5qw',
];

export function resolveMonitorTicketIds() {
  const ids = parseCommaIds(cfg('CMP_MONITOR_TICKET_IDS', ''));
  if (ids.length) return ids;
  return DEFAULT_MONITOR_TICKET_IDS.slice();
}

function verifyCronAuth(req) {
  const secret = String(cfg('CORPFLOW_CRON_SECRET', '') || cfg('CRON_SECRET', '')).trim();
  if (!secret) return { ok: false, error: 'CORPFLOW_CRON_SECRET is not configured.' };
  const authz = String(req.headers?.authorization || '').trim();
  const token = authz.toLowerCase().startsWith('bearer ') ? authz.slice(7).trim() : '';
  if (!token || !timingSafeStringEquals(token, secret)) return { ok: false, error: 'Unauthorized' };
  return { ok: true };
}

async function monitorOneTicket(ticketId) {
  const row = await prisma.cmpTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, tenantId: true, description: true, status: true, stage: true, consoleJson: true },
  });
  if (!row) return { ok: false, ticket_id: ticketId, error: 'not_found' };

  let outcomes = extractOutcomesFromDescription(str(row.description || ''));
  if (!outcomes.length) outcomes = extractOutcomesFromConsoleJsonBrief(row.consoleJson);
  const actions = [];

  // Safe: unblock the pipeline (same semantics as factory/cmp/push).
  if (isStuckSandboxDispatch(row) || isStuckSandboxEvidenceMissing(row)) {
    const baseRef = str(cfg('CMP_SANDBOX_BASE_REF', 'main') || 'main') || 'main';
    const repair = await repairSandboxDispatchForTicket(prisma, row, { baseRef, source: 'cmp-monitor-cron' });
    actions.push({ kind: 'repair_dispatch', ok: Boolean(repair.ok), error: repair.ok ? null : repair.error || 'dispatch_failed' });
  }

  let ov = await refreshOverseerForTicket(prisma, ticketId);
  actions.push({ kind: 'refresh_overseer', ok: Boolean(ov.ok), skipped: ov.skipped || false, error: ov.ok ? null : ov.error || null });

  // If overseer can't compare (often 404 because branch doesn't exist yet), attempt a safe repair and retry.
  if (!ov.ok && /\\b404\\b/.test(String(ov.error || ''))) {
    const baseRef = str(cfg('CMP_SANDBOX_BASE_REF', 'main') || 'main') || 'main';
    const repair = await repairSandboxDispatchForTicket(prisma, row, { baseRef, source: 'cmp-monitor-cron:overseer_404' });
    actions.push({ kind: 'repair_dispatch', ok: Boolean(repair.ok), error: repair.ok ? null : repair.error || 'dispatch_failed' });
    ov = await refreshOverseerForTicket(prisma, ticketId);
    actions.push({ kind: 'refresh_overseer', ok: Boolean(ov.ok), skipped: ov.skipped || false, error: ov.ok ? null : ov.error || null });
  }

  if (!ov.ok && /\\b404\\b/.test(String(ov.error || ''))) {
    try {
      const baseRef = str(cfg('CMP_SANDBOX_BASE_REF', 'main') || 'main') || 'main';
      const a = await fetchCmpTicketActivity({ ticketId, baseRef });
      if (a && a.ok === true) {
        actions.push({
          kind: 'overseer_diagnostic',
          ok: true,
          error: null,
          diagnostic: {
            repo_full_name: a.repo_full_name || null,
            branch_name: a.branch_name || null,
            branch_exists: typeof a.branch_exists === 'boolean' ? a.branch_exists : null,
            base_ref: a.base_ref || baseRef,
            latest_run: a.latest_run || null,
            diagnostic_workflow_runs: a.diagnostic_workflow_runs || [],
            summary_line: a.summary_line || '',
            needs_attention: Boolean(a.needs_attention),
            stuck_hint: a.stuck_hint || null,
            actions_filter_url: a.actions_filter_url || null,
            workflow_filter_url: a.workflow_filter_url || null,
            workflow_all_runs_url: a.workflow_all_runs_url || null,
          },
        });
      }
    } catch {
      // best-effort only
    }
  }

  await recordTrustedAutomationEvent(prisma, {
    tenantId: row.tenantId,
    eventType: 'cmp.ticket.push_checked',
    payload: {
      ticket_id: ticketId,
      status: row.status || null,
      stage: row.stage || null,
      intended_outcomes: outcomes,
      actions,
    },
    idempotencyKey: null,
    source: 'cmp_monitor_cron',
  });

  if (!outcomes.length) {
    return {
      ok: false,
      ticket_id: ticketId,
      status: row.status || '',
      stage: row.stage || '',
      response_kind: 'needs_brain',
      reason: 'OUTCOMES_MISSING_FROM_DESCRIPTION',
      actions,
    };
  }

  return {
    ok: true,
    ticket_id: ticketId,
    status: row.status || '',
    stage: row.stage || '',
    intended_outcomes: outcomes,
    actions,
  };
}

export default async function cmpMonitorCronHandler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = verifyCronAuth(req);
  if (!auth.ok) return res.status(401).json({ error: auth.error || 'Unauthorized' });

  const pgUrl = str(cfg('POSTGRES_URL', ''));
  if (!pgUrl) {
    return res.status(503).json({
      ok: false,
      error: 'POSTGRES_URL_MISSING',
      hint: 'Configure POSTGRES_URL (Prisma pooled URL is fine) so CMP monitor can read tickets.',
    });
  }

  const ids = resolveMonitorTicketIds();

  try {
    const results = [];
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      results.push(await monitorOneTicket(id));
    }
    return res.status(200).json({ ok: results.every((r) => r.ok === true), count: results.length, results });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'CMP_MONITOR_FAILED', detail: String(e?.message || e).slice(0, 500) });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

