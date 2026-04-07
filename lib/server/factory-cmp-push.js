import { PrismaClient } from '@prisma/client';

import { emitLogicFailure, emitTelemetry } from '../cmp/_lib/telemetry.js';
import { recordTrustedAutomationEvent } from '../automation/internal.js';
import { verifyFactoryMasterAuth } from './factory-master-auth.js';
import { cfg } from './runtime-config.js';
import {
  isStuckSandboxDispatch,
  isStuckSandboxEvidenceMissing,
  refreshOverseerForTicket,
  repairSandboxDispatchForTicket,
} from '../cmp/_lib/cmp-stuck-self-repair.js';
import { fetchCmpTicketActivity } from '../cmp/_lib/github-dispatch.js';

const prisma = new PrismaClient();

function str(v) {
  return v != null ? String(v).trim() : '';
}

function safeLines(s) {
  return String(s || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+$/g, ''));
}

function isHeaderLine(line) {
  const s = str(line).toLowerCase();
  if (!s) return false;
  // Basic markdown-ish headers.
  if (s.startsWith('#')) return true;
  // Common section markers.
  return (
    s.includes('intended business outcomes') ||
    s === 'business outcomes' ||
    s === 'outcomes' ||
    s.startsWith('outcomes:') ||
    s.startsWith('intended outcomes') ||
    s.startsWith('acceptance criteria') ||
    s.startsWith('done when') ||
    s.startsWith('definition of done')
  );
}

/**
 * Heuristic extraction of intended outcomes from a ticket description.
 * Returns an empty array when no explicit outcomes section is detected.
 *
 * @param {string} description
 * @returns {string[]}
 */
export function extractOutcomesFromDescription(description) {
  const lines = safeLines(description);
  // Find an outcomes section start.
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = str(lines[i]).toLowerCase();
    if (!l) continue;
    if (
      l.includes('intended business outcomes') ||
      l === 'business outcomes' ||
      l === 'outcomes' ||
      l.startsWith('outcomes:') ||
      l.startsWith('intended outcomes') ||
      l.startsWith('acceptance criteria') ||
      l.startsWith('done when') ||
      l.startsWith('definition of done')
    ) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return [];

  const out = [];
  for (let i = start; i < lines.length; i++) {
    const raw = lines[i];
    const s = str(raw);
    if (!s) {
      // Stop on first blank line after we already captured something.
      if (out.length) break;
      continue;
    }
    // Stop at next section header.
    if (out.length && isHeaderLine(s)) break;

    // Accept bullet / checkbox lines preferentially.
    const m = s.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (m && str(m[2])) {
      out.push(str(m[2]));
      continue;
    }
    const b = s.match(/^[-*]\s+(.*)$/);
    if (b && str(b[1])) {
      out.push(str(b[1]));
      continue;
    }
    // Fallback: accept short non-bullet lines (avoid swallowing paragraphs).
    if (s.length <= 180) out.push(s);
  }

  return out
    .map((x) => x.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 12);
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function takeOutcomeLinesFromText(raw) {
  const lines = safeLines(raw);
  const out = [];
  for (const line of lines) {
    const s = str(line);
    if (!s) continue;
    const b = s.match(/^[-*]\s+(.*)$/);
    if (b && str(b[1])) {
      out.push(str(b[1]));
      continue;
    }
    const cb = s.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (cb && str(cb[2])) {
      out.push(str(cb[2]));
      continue;
    }
  }
  return out
    .map((x) => x.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 12);
}

/**
 * Fallback: if ticket description is missing explicit outcomes, pull them from console_json.brief.
 * This keeps the "don’t guess" policy: it only accepts explicit bullets/arrays (not freeform paragraphs).
 *
 * @param {any} consoleJson
 * @returns {string[]}
 */
export function extractOutcomesFromConsoleJsonBrief(consoleJson) {
  const cj = consoleJson && typeof consoleJson === 'object' ? consoleJson : {};
  const brief = cj?.brief && typeof cj.brief === 'object' ? cj.brief : {};

  const ac = brief?.acceptance_criteria;
  if (Array.isArray(ac)) {
    return ac
      .map((x) => str(x))
      .map((x) => x.replace(/^\s*[-*]\s+/, ''))
      .map((x) => x.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  if (typeof ac === 'string' && str(ac)) {
    const fromText = takeOutcomeLinesFromText(ac);
    if (fromText.length) return fromText;
  }

  const summary = brief?.summary;
  if (typeof summary === 'string' && str(summary)) {
    const fromText = takeOutcomeLinesFromText(summary);
    if (fromText.length) return fromText;
  }

  // Last-chance: some briefs store as "outcomes" or similar.
  for (const key of ['outcomes', 'intended_outcomes', 'acceptanceCriteria']) {
    const v = brief?.[key];
    if (Array.isArray(v) && safeArray(v).length) {
      return safeArray(v)
        .map((x) => str(x))
        .filter(Boolean)
        .slice(0, 12);
    }
  }

  return [];
}

function normalizeTicketIds(body, req) {
  const fromQuery = str(req.query?.ticket_id || req.query?.id || '');
  const list = [];
  if (fromQuery) list.push(fromQuery);
  const t1 = str(body?.ticket_id || body?.id || '');
  if (t1) list.push(t1);
  const arr = Array.isArray(body?.ticket_ids) ? body.ticket_ids : [];
  for (const v of arr) {
    const id = str(v);
    if (id) list.push(id);
  }
  return Array.from(new Set(list)).slice(0, 25);
}

function buildNeedsBrainChecklist(ticketId) {
  const base = str(cfg('CORPFLOW_PUBLIC_BASE_URL', '') || cfg('CORPFLOW_FACTORY_HEALTH_URL', '') || '');
  const hintUrl = base ? `${base.replace(/\/+$/, '')}/api/cmp/router?action=ticket-get&id=${encodeURIComponent(ticketId)}` : null;
  return [
    {
      step: 1,
      title: 'Load the ticket description (source of truth)',
      detail: hintUrl
        ? `Call: ${hintUrl}`
        : 'Call: GET /api/cmp/router?action=ticket-get&id=<ticket_id> (must include the ticket description).',
    },
    {
      step: 2,
      title: 'Confirm intended business outcomes',
      detail:
        'Ensure the ticket description contains an explicit “Intended business outcomes / Outcomes / Acceptance criteria” section with bullet points.',
    },
    {
      step: 3,
      title: 'Persist as playbook once clarified',
      detail:
        'After answering, store a durable playbook via automation.playbook.upsert so future tickets can be executed from the library without guessing.',
    },
  ];
}

async function diagnoseOverseerCompareFailure(ticketId) {
  try {
    const baseRef = str(cfg('CMP_SANDBOX_BASE_REF', 'main') || 'main') || 'main';
    const a = await fetchCmpTicketActivity({ ticketId, baseRef });
    if (!a || a.ok !== true) return null;
    return {
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
    };
  } catch {
    return null;
  }
}

async function pushOneTicket(ticketId) {
  const row = await prisma.cmpTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, tenantId: true, description: true, status: true, stage: true, consoleJson: true, updatedAt: true },
  });
  if (!row) return { ok: false, ticket_id: ticketId, error: 'not_found' };

  const desc = str(row.description || '');
  const outcomes = extractOutcomesFromDescription(desc);

  if (!outcomes.length) {
    const fallback = extractOutcomesFromConsoleJsonBrief(row.consoleJson);
    if (fallback.length) {
      await recordTrustedAutomationEvent(prisma, {
        tenantId: row.tenantId,
        eventType: 'cmp.ticket.outcomes_fallback_from_brief',
        payload: { ticket_id: ticketId, count: fallback.length, status: row.status || null, stage: row.stage || null },
        idempotencyKey: `cmp:outcomes_fallback_from_brief:${ticketId}:${fallback.join('|').slice(0, 120)}`,
        source: 'factory_cmp_push',
      });
      // eslint-disable-next-line no-use-before-define
      return await pushOneTicketWithOutcomes(row, fallback);
    }

    const idem = `cmp:needs_brain:${ticketId}`;
    await recordTrustedAutomationEvent(prisma, {
      tenantId: row.tenantId,
      eventType: 'cmp.ticket.needs_brain',
      payload: {
        ticket_id: ticketId,
        reason: 'OUTCOMES_MISSING_FROM_DESCRIPTION',
        status: row.status || null,
        stage: row.stage || null,
      },
      idempotencyKey: idem,
      source: 'factory_cmp_push',
    });
    return {
      ok: false,
      ticket_id: ticketId,
      status: row.status || '',
      stage: row.stage || '',
      response_kind: 'needs_brain',
      reason: 'OUTCOMES_MISSING_FROM_DESCRIPTION',
      next_actions: buildNeedsBrainChecklist(ticketId),
    };
  }

  return await pushOneTicketWithOutcomes(row, outcomes);
}

async function pushOneTicketWithOutcomes(row, outcomes) {
  const ticketId = row.id;
  const actions = [];
  const baseRef = str(cfg('CMP_SANDBOX_BASE_REF', 'main') || 'main') || 'main';
  let repaired = false;

  // Keep "push" safe: unblock the pipeline, don’t merge code.
  if (isStuckSandboxDispatch(row) || isStuckSandboxEvidenceMissing(row)) {
    const repair = await repairSandboxDispatchForTicket(prisma, row, { baseRef, source: 'factory-cmp-push' });
    actions.push({ kind: 'repair_dispatch', ok: Boolean(repair.ok), error: repair.ok ? null : repair.error || 'dispatch_failed' });
    repaired = Boolean(repair.ok);
  }

  let ov = await refreshOverseerForTicket(prisma, ticketId);
  actions.push({ kind: 'refresh_overseer', ok: Boolean(ov.ok), skipped: ov.skipped || false, error: ov.ok ? null : ov.error || null });

  // If overseer compare 404s (usually missing cmp/<ticket> branch), attempt a safe repair dispatch once and re-try overseer.
  const ovErr = typeof ov.error === 'string' ? ov.error : '';
  if (!ov.ok && !repaired && /\bGitHub API 404\b/.test(ovErr)) {
    const repair = await repairSandboxDispatchForTicket(prisma, row, { baseRef, source: 'factory-cmp-push:overseer-404-repair' });
    actions.push({ kind: 'repair_dispatch', ok: Boolean(repair.ok), error: repair.ok ? null : repair.error || 'dispatch_failed' });
    ov = await refreshOverseerForTicket(prisma, ticketId);
    actions.push({
      kind: 'refresh_overseer',
      ok: Boolean(ov.ok),
      skipped: ov.skipped || false,
      error: ov.ok ? null : ov.error || null,
      note: 'after_repair_dispatch',
    });
  }

  // If still failing, attach a deterministic diagnostic to reduce back-and-forth.
  if (!ov.ok && /\b404\b/.test(String(ov.error || ''))) {
    const diag = await diagnoseOverseerCompareFailure(ticketId);
    if (diag) {
      actions.push({ kind: 'overseer_diagnostic', ok: true, error: null, diagnostic: diag });
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
    source: 'factory_cmp_push',
  });

  emitTelemetry({
    event_type: 'factory.cmp.push',
    payload: { ticket_id: ticketId, actions },
    cmp: { ticket_id: ticketId, action: 'factory-cmp-push' },
  });

  return {
    ok: true,
    ticket_id: ticketId,
    status: row.status || '',
    stage: row.stage || '',
    intended_outcomes: outcomes,
    actions,
  };
}

export default async function factoryCmpPushHandler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!verifyFactoryMasterAuth(req)) {
    return res.status(403).json({ error: 'Factory master authentication required.' });
  }

  const pgUrl = str(cfg('POSTGRES_URL', ''));
  if (!pgUrl) return res.status(503).json({ error: 'POSTGRES_URL_MISSING' });

  const body = req.body && typeof req.body === 'object' ? req.body : null;
  if (!body) return res.status(400).json({ error: 'Missing JSON body' });

  const ticketIds = normalizeTicketIds(body, req);
  if (!ticketIds.length) return res.status(400).json({ error: 'ticket_id or ticket_ids is required' });

  try {
    const results = [];
    for (const tid of ticketIds) {
      // eslint-disable-next-line no-await-in-loop
      const r = await pushOneTicket(tid);
      results.push(r);
    }
    const ok = results.every((r) => r && r.ok === true);
    return res.status(200).json({ ok, count: results.length, results });
  } catch (e) {
    emitLogicFailure({
      source: 'api/factory/cmp/push',
      severity: 'fatal',
      error: e,
      cmp: { ticket_id: ticketIds[0] || 'n/a', action: 'factory-cmp-push' },
    });
    return res.status(500).json({ error: 'FACTORY_CMP_PUSH_FAILED', detail: String(e?.message || e).slice(0, 500) });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

