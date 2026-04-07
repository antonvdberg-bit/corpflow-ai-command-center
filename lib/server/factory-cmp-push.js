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

async function pushOneTicket(ticketId) {
  const row = await prisma.cmpTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, tenantId: true, description: true, status: true, stage: true, consoleJson: true, updatedAt: true },
  });
  if (!row) return { ok: false, ticket_id: ticketId, error: 'not_found' };

  const desc = str(row.description || '');
  const outcomes = extractOutcomesFromDescription(desc);

  if (!outcomes.length) {
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

  const actions = [];
  // Keep "push" safe: unblock the pipeline, don’t merge code.
  if (isStuckSandboxDispatch(row) || isStuckSandboxEvidenceMissing(row)) {
    const baseRef = str(cfg('CMP_SANDBOX_BASE_REF', 'main') || 'main') || 'main';
    const repair = await repairSandboxDispatchForTicket(prisma, row, { baseRef, source: 'factory-cmp-push' });
    actions.push({ kind: 'repair_dispatch', ok: Boolean(repair.ok), error: repair.ok ? null : repair.error || 'dispatch_failed' });
  }

  const ov = await refreshOverseerForTicket(prisma, ticketId);
  actions.push({ kind: 'refresh_overseer', ok: Boolean(ov.ok), skipped: ov.skipped || false, error: ov.ok ? null : ov.error || null });

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

