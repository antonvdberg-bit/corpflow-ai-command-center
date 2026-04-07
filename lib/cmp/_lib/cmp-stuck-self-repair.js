/**
 * Shared CMP "stuck sandbox" detection, overseer refresh, and safe re-dispatch
 * (no second credit debit — same paths as approve-build repair script).
 */

import { dispatchCmpSandboxStart, fetchCmpOverseerSummary, notifyCmpAutomationWebhook } from './github-dispatch.js';
import { recordTrustedAutomationEvent } from '../../automation/internal.js';
import { cfg } from '../../server/runtime-config.js';

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * @param {unknown} v
 * @returns {{ messages: unknown[]; brief: Record<string, unknown>; locale: string } & Record<string, unknown>}
 */
export function normalizeConsoleJson(v) {
  if (!v) return { messages: [], brief: {}, locale: 'en' };
  if (typeof v === 'string') {
    const parsed = safeJsonParse(v, null);
    if (parsed) return normalizeConsoleJson(parsed);
    return { messages: [], brief: {}, locale: 'en' };
  }
  if (typeof v === 'object' && v !== null) {
    const o = /** @type {Record<string, unknown>} */ (v);
    const messages = Array.isArray(o.messages) ? o.messages.slice(0, 200) : [];
    const brief = o.brief && typeof o.brief === 'object' ? /** @type {Record<string, unknown>} */ (o.brief) : {};
    const locale = typeof o.locale === 'string' ? o.locale : 'en';
    return { ...o, messages, brief, locale };
  }
  return { messages: [], brief: {}, locale: 'en' };
}

/**
 * Approved + Build but sandbox dispatch never succeeded.
 *
 * @param {{ status?: string | null; stage?: string | null; consoleJson?: unknown }} row
 * @returns {boolean}
 */
export function isStuckSandboxDispatch(row) {
  const st = String(row.status || '').trim();
  const sg = String(row.stage || '').trim();
  if (st !== 'Approved' || sg !== 'Build') return false;
  const cj = row.consoleJson && typeof row.consoleJson === 'object' ? /** @type {Record<string, unknown>} */ (row.consoleJson) : {};
  const cv = cj.client_view && typeof cj.client_view === 'object' ? /** @type {Record<string, unknown>} */ (cj.client_view) : {};
  const auto = cv.automation && typeof cv.automation === 'object' ? /** @type {Record<string, unknown>} */ (cv.automation) : {};
  if (auto.dispatch_ok === true) return false;
  return true;
}

/**
 * Approved + Build but dispatch was marked ok and the sandbox branch/PR evidence is missing.
 *
 * This happens when a sandbox branch/PR was closed/deleted, or when dispatch succeeded but the
 * branch was never created. In both cases, the correct repair is to re-dispatch.
 *
 * @param {{ status?: string | null; stage?: string | null; consoleJson?: unknown }} row
 * @returns {boolean}
 */
export function isStuckSandboxEvidenceMissing(row) {
  const st = String(row.status || '').trim();
  const sg = String(row.stage || '').trim();
  if (st !== 'Approved' || sg !== 'Build') return false;
  const cj = row.consoleJson && typeof row.consoleJson === 'object' ? /** @type {Record<string, unknown>} */ (row.consoleJson) : {};
  const cv = cj.client_view && typeof cj.client_view === 'object' ? /** @type {Record<string, unknown>} */ (cj.client_view) : {};
  const auto = cv.automation && typeof cv.automation === 'object' ? /** @type {Record<string, unknown>} */ (cv.automation) : {};
  if (auto.dispatch_ok !== true) return false;
  const branch = typeof auto.branch_name === 'string' ? auto.branch_name.trim() : '';
  const prNum = Number.parseInt(String(cv?.promotion?.pr_number || ''), 10);
  // If neither a branch name nor a PR number is present, we can't observe progress, so re-dispatch.
  if (!branch && !(Number.isFinite(prNum) && prNum > 0)) return true;
  return false;
}

/**
 * @param {Record<string, unknown>} automation
 * @returns {{ attempts: number; last_dispatch_attempt_at: string | null; last_dispatch_error: string | null }}
 */
function readAutoRepair(automation) {
  const ar = automation.auto_repair && typeof automation.auto_repair === 'object' ? /** @type {Record<string, unknown>} */ (automation.auto_repair) : {};
  const attempts = Number(ar.attempts);
  return {
    attempts: Number.isFinite(attempts) && attempts >= 0 ? attempts : 0,
    last_dispatch_attempt_at: typeof ar.last_dispatch_attempt_at === 'string' ? ar.last_dispatch_attempt_at : null,
    last_dispatch_error: typeof ar.last_dispatch_error === 'string' ? ar.last_dispatch_error : null,
  };
}

/**
 * Refresh `console_json.overseer` for one ticket (same semantics as overseer sweep).
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} ticketId
 * @returns {Promise<{ ok: boolean; skipped?: boolean; reason?: string; error?: string }>}
 */
export async function refreshOverseerForTicket(prisma, ticketId) {
  const row = await prisma.cmpTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, consoleJson: true },
  });
  if (!row) return { ok: false, error: 'not_found' };

  const prev = row.consoleJson && typeof row.consoleJson === 'object' ? /** @type {Record<string, unknown>} */ (row.consoleJson) : {};
  const prevOverseer = prev?.overseer && typeof prev.overseer === 'object' ? /** @type {Record<string, unknown>} */ (prev.overseer) : null;
  const prevAt = prevOverseer?.updated_at ? Date.parse(String(prevOverseer.updated_at)) : 0;
  if (prevAt && Date.now() - prevAt < 60_000) {
    return { ok: true, skipped: true, reason: 'fresh' };
  }

  const summary = await fetchCmpOverseerSummary({ ticketId });
  if (!summary.ok) {
    const next = {
      ...prev,
      overseer: {
        ok: false,
        updated_at: new Date().toISOString(),
        ticket_id: ticketId,
        branch_name: summary.branch_name || `cmp/${ticketId}`,
        error: summary.error || 'overseer_failed',
      },
    };
    await prisma.cmpTicket.update({ where: { id: ticketId }, data: { consoleJson: next } });
    return { ok: false, error: summary.error || 'overseer_failed' };
  }

  const next = {
    ...prev,
    overseer: {
      ok: true,
      updated_at: new Date().toISOString(),
      ticket_id: ticketId,
      branch_name: summary.branch_name || `cmp/${ticketId}`,
      compare_url: summary.compare_url || null,
      commits: summary.commits || [],
      files: summary.files || [],
    },
  };
  await prisma.cmpTicket.update({ where: { id: ticketId }, data: { consoleJson: next } });
  return { ok: true };
}

/**
 * Persist failed dispatch attempt for rate-limiting and UI visibility (no credit movement).
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} ticketId
 * @param {unknown} consoleJson
 * @param {string} dispatchError
 */
async function mergeAutoRepairDispatchFailure(prisma, ticketId, consoleJson, dispatchError) {
  const norm = normalizeConsoleJson(consoleJson);
  const prevCv = norm.client_view && typeof norm.client_view === 'object' ? /** @type {Record<string, unknown>} */ (norm.client_view) : {};
  const prevAuto = prevCv.automation && typeof prevCv.automation === 'object' ? /** @type {Record<string, unknown>} */ (prevCv.automation) : {};
  const ar = readAutoRepair(prevAuto);
  const automation = {
    ...prevAuto,
    auto_repair: {
      attempts: ar.attempts + 1,
      last_dispatch_attempt_at: new Date().toISOString(),
      last_dispatch_error: dispatchError || 'unknown',
    },
    updated_at: new Date().toISOString(),
  };
  const client_view = {
    ...prevCv,
    automation,
    progress_message:
      typeof prevCv.progress_message === 'string' && prevCv.progress_message.trim()
        ? prevCv.progress_message
        : 'Automated sandbox repair attempted; dispatch failed — will retry within limits.',
  };
  const nextConsole = { ...norm, client_view };
  await prisma.cmpTicket.update({
    where: { id: ticketId },
    data: { consoleJson: nextConsole },
  });
}

/**
 * Re-run repository_dispatch and merge console_json (matches approve-build / repair script).
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ id: string; tenantId: string | null; consoleJson: unknown }} row
 * @param {{ baseRef: string; source?: string }} opts
 */
export async function repairSandboxDispatchForTicket(prisma, row, opts) {
  const ticketId = row.id;
  const source = opts.source || 'cmp-auto-repair';

  const sandboxDispatch = await dispatchCmpSandboxStart({
    ticketId,
    baseRef: opts.baseRef || undefined,
  });

  await notifyCmpAutomationWebhook({
    ticket_id: ticketId,
    source,
    dispatch_ok: sandboxDispatch.ok,
    dispatch_error: sandboxDispatch.error || null,
  });

  if (!sandboxDispatch.ok) {
    await mergeAutoRepairDispatchFailure(prisma, ticketId, row.consoleJson, sandboxDispatch.error || 'dispatch_failed');
    return sandboxDispatch;
  }

  const norm = normalizeConsoleJson(row.consoleJson);
  const prevCv = norm.client_view && typeof norm.client_view === 'object' ? /** @type {Record<string, unknown>} */ (norm.client_view) : {};
  const prevAuto = prevCv.automation && typeof prevCv.automation === 'object' ? /** @type {Record<string, unknown>} */ (prevCv.automation) : {};
  const prevAr = prevAuto.auto_repair && typeof prevAuto.auto_repair === 'object' ? /** @type {Record<string, unknown>} */ (prevAuto.auto_repair) : {};
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
    auto_repair: {
      ...prevAr,
      attempts: 0,
      last_dispatch_attempt_at: new Date().toISOString(),
      last_success_at: new Date().toISOString(),
      last_dispatch_error: null,
    },
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
      source,
    },
    idempotencyKey: null,
    source,
  });

  return sandboxDispatch;
}

/**
 * @param {string} raw
 * @returns {string[]}
 */
function parseCommaIds(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ limit?: number; priorityTicketIds?: string[] }} [options]
 * @returns {Promise<Record<string, unknown>>}
 */
export async function runStuckSelfRepair(prisma, options = {}) {
  const enabled = String(cfg('CMP_AUTO_REPAIR_ENABLED', 'true') || 'true').toLowerCase() !== 'false';
  if (!enabled) {
    return { ok: true, skipped: true, reason: 'CMP_AUTO_REPAIR_DISABLED' };
  }

  const baseRef = String(cfg('CMP_SANDBOX_BASE_REF', 'main') || 'main').trim() || 'main';
  const maxAttempts = Math.min(50, Math.max(1, parseInt(String(cfg('CMP_AUTO_REPAIR_MAX_ATTEMPTS', '5') || '5'), 10) || 5));
  const minMinutes = Math.min(24 * 60, Math.max(1, parseInt(String(cfg('CMP_AUTO_REPAIR_MIN_MINUTES_BETWEEN', '20') || '20'), 10) || 20));
  const cfgSweepLimit = parseInt(String(cfg('CMP_AUTO_REPAIR_SWEEP_LIMIT', '12') || '12'), 10) || 12;
  const sweepLimit = Math.min(50, Math.max(1, options.limit != null ? options.limit : cfgSweepLimit));

  const envPriority = parseCommaIds(cfg('CMP_AUTO_REPAIR_PRIORITY_TICKET_IDS', ''));
  const priorityTicketIds = Array.from(
    new Set([...(options.priorityTicketIds || []), ...envPriority].map((id) => String(id).trim()).filter(Boolean)),
  );

  const select = {
    id: true,
    tenantId: true,
    title: true,
    consoleJson: true,
    status: true,
    stage: true,
    updatedAt: true,
  };

  /** @type {Map<string, { id: string; tenantId: string | null; title: string | null; consoleJson: unknown; status: string; stage: string; updatedAt: Date }>} */
  const byId = new Map();

  if (priorityTicketIds.length > 0) {
    const priorityRows = await prisma.cmpTicket.findMany({
      where: {
        id: { in: priorityTicketIds },
        status: 'Approved',
        stage: 'Build',
      },
      select,
    });
    for (const r of priorityRows) {
      byId.set(r.id, r);
    }
  }

  const sweepRows = await prisma.cmpTicket.findMany({
    where: { status: 'Approved', stage: 'Build' },
    orderBy: { updatedAt: 'desc' },
    take: sweepLimit,
    select,
  });
  for (const r of sweepRows) {
    if (!byId.has(r.id)) byId.set(r.id, r);
  }

  /** @type {{ id: string; tenantId: string | null; title: string | null; consoleJson: unknown; status: string; stage: string; updatedAt: Date }[]} */
  const ordered = [];
  const seen = new Set();
  for (const id of priorityTicketIds) {
    const r = byId.get(id);
    if (r && !seen.has(r.id)) {
      ordered.push(r);
      seen.add(r.id);
    }
  }
  for (const r of sweepRows) {
    if (!seen.has(r.id)) {
      ordered.push(r);
      seen.add(r.id);
    }
  }
  for (const r of byId.values()) {
    if (!seen.has(r.id)) {
      ordered.push(r);
      seen.add(r.id);
    }
  }

  const results = [];
  for (const row of ordered) {
    const ticketId = row.id;
    try {
      const stuckDispatch = isStuckSandboxDispatch(row);
      const stuckEvidence = isStuckSandboxEvidenceMissing(row);
      if (!stuckDispatch && !stuckEvidence) {
        results.push({ ticket_id: ticketId, skipped: true, reason: 'not_stuck' });
        continue;
      }

      const overseerOut = await refreshOverseerForTicket(prisma, ticketId);

      const fresh = await prisma.cmpTicket.findUnique({
        where: { id: ticketId },
        select,
      });
      if (!fresh) {
        results.push({ ticket_id: ticketId, ok: false, error: 'ticket_missing_after_refresh' });
        continue;
      }
      const stuckDispatchFresh = isStuckSandboxDispatch(fresh);
      const stuckEvidenceFresh = isStuckSandboxEvidenceMissing(fresh);
      if (!stuckDispatchFresh && !stuckEvidenceFresh) {
        results.push({
          ticket_id: ticketId,
          skipped: true,
          reason: 'not_stuck_after_overseer',
          overseer: overseerOut,
        });
        continue;
      }

      const norm = normalizeConsoleJson(fresh.consoleJson);
      const prevCv = norm.client_view && typeof norm.client_view === 'object' ? /** @type {Record<string, unknown>} */ (norm.client_view) : {};
      const prevAuto = prevCv.automation && typeof prevCv.automation === 'object' ? /** @type {Record<string, unknown>} */ (prevCv.automation) : {};
      const ar = readAutoRepair(prevAuto);

      if (ar.attempts >= maxAttempts) {
        results.push({
          ticket_id: ticketId,
          skipped: true,
          reason: 'max_repair_attempts',
          attempts: ar.attempts,
          overseer: overseerOut,
        });
        continue;
      }

      const lastAt = ar.last_dispatch_attempt_at ? Date.parse(ar.last_dispatch_attempt_at) : 0;
      if (lastAt && Date.now() - lastAt < minMinutes * 60_000) {
        results.push({
          ticket_id: ticketId,
          skipped: true,
          reason: 'dispatch_cooldown',
          overseer: overseerOut,
        });
        continue;
      }

      const dispatchOut = await repairSandboxDispatchForTicket(prisma, fresh, {
        baseRef,
        source: 'cmp-stuck-self-repair-cron',
      });
      results.push({
        ticket_id: ticketId,
        ok: dispatchOut.ok,
        error: dispatchOut.ok ? null : dispatchOut.error || null,
        overseer: overseerOut,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ ticket_id: ticketId, ok: false, error: msg });
    }
  }

  return {
    ok: true,
    scanned: ordered.length,
    priority_ids: priorityTicketIds,
    max_attempts: maxAttempts,
    min_minutes_between: minMinutes,
    base_ref: baseRef,
    results,
  };
}
