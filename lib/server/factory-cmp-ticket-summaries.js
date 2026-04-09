import { PrismaClient } from '@prisma/client';

import { verifyFactoryMasterOrCronBearer } from './factory-master-auth.js';
import { cfg } from './runtime-config.js';

const prisma = new PrismaClient();

function str(v) {
  return v != null ? String(v).trim() : '';
}

function safeTitle(row) {
  const t = str(row?.title);
  if (t) return t;
  const id = str(row?.id);
  return id ? `Ticket ${id}` : 'Ticket';
}

function snippet(raw, maxLen) {
  const s = str(raw || '');
  if (!s) return '';
  const one = s.replace(/\s+/g, ' ').trim();
  if (one.length <= maxLen) return one;
  return one.slice(0, Math.max(0, maxLen - 1)) + '…';
}

function parseTicketIds(req) {
  const q = req.query || {};
  const raw =
    str(q.ticket_ids || q.ticketIds || '') ||
    str(q.ticket_id || q.ticketId || '') ||
    '';
  const out = raw
    .split(',')
    .map((x) => str(x))
    .filter(Boolean);
  // Allow repeating ?ticket_id=... multiple times (Next parses as array).
  const t = q.ticket_id || q.ticketId;
  if (Array.isArray(t)) {
    for (const v of t) {
      const id = str(v);
      if (id) out.push(id);
    }
  }
  return Array.from(new Set(out)).slice(0, 25);
}

/**
 * Factory-only: return plain-English summaries for CMP tickets.
 *
 * Route: GET /api/factory/cmp/ticket-summaries?ticket_ids=a,b,c
 * Auth: factory master (admin session or MASTER_ADMIN_KEY), **or** `Authorization: Bearer` same value as `CORPFLOW_CRON_SECRET` / `CRON_SECRET` (GitHub Actions / Vercel cron).
 */
export default async function factoryCmpTicketSummariesHandler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!verifyFactoryMasterOrCronBearer(req)) {
    return res.status(403).json({
      error: 'Factory master or cron Bearer authentication required.',
      hint: 'Use admin session, Bearer MASTER_ADMIN_KEY, or Bearer CORPFLOW_CRON_SECRET (trusted automation only).',
    });
  }

  const pgUrl = str(cfg('POSTGRES_URL', ''));
  if (!pgUrl) return res.status(503).json({ error: 'POSTGRES_URL_MISSING' });

  const ids = parseTicketIds(req);
  if (!ids.length) {
    return res.status(400).json({
      error: 'ticket_ids is required',
      hint: 'Pass ?ticket_ids=comma,separated,ids (or repeated ?ticket_id=...).',
    });
  }

  try {
    const rows = await prisma.cmpTicket.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        tenantId: true,
        title: true,
        status: true,
        stage: true,
        description: true,
        updatedAt: true,
        createdAt: true,
      },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));

    const summaries = ids.map((id) => {
      const row = byId.get(id) || null;
      if (!row) {
        return { ticket_id: id, ok: false, error: 'not_found' };
      }
      return {
        ticket_id: row.id,
        ok: true,
        title: safeTitle(row),
        tenant_id: row.tenantId || null,
        status: row.status || null,
        stage: row.stage || null,
        created_at: row.createdAt ? row.createdAt.toISOString() : null,
        updated_at: row.updatedAt ? row.updatedAt.toISOString() : null,
        description_snippet: snippet(row.description, 360) || null,
      };
    });

    return res.status(200).json({
      ok: true,
      count: summaries.length,
      summaries,
    });
  } catch (e) {
    return res.status(500).json({
      error: 'FACTORY_CMP_TICKET_SUMMARIES_FAILED',
      detail: String(e?.message || e).slice(0, 500),
    });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

