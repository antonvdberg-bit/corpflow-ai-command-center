import { PrismaClient } from '@prisma/client';

import { emitLogicFailure, emitTelemetry } from '../cmp/_lib/telemetry.js';
import { verifyFactoryMasterAuth } from './factory-master-auth.js';
import { cfg } from './runtime-config.js';
import { extractOutcomesFromDescription } from './factory-cmp-push.js';

const prisma = new PrismaClient();

function str(v) {
  return v != null ? String(v).trim() : '';
}

/**
 * Factory-only: update a CMP ticket's stored description.
 *
 * Route: POST /api/factory/cmp/ticket-set-description
 * Auth: factory master
 *
 * This exists so operators can persist clarified outcomes/spec into `cmp_tickets.description`
 * without creating a new ticket or re-running estimate/approve flows.
 */
export default async function factoryCmpTicketSetDescriptionHandler(req, res) {
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

  const ticketId = str(body.ticket_id || body.id || '');
  const description = str(body.description || '');
  if (!ticketId) return res.status(400).json({ error: 'ticket_id is required' });
  if (!description) return res.status(400).json({ error: 'description is required' });

  try {
    const existing = await prisma.cmpTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, tenantId: true, description: true },
    });
    if (!existing) return res.status(404).json({ error: 'Ticket not found' });

    const outcomes = extractOutcomesFromDescription(description);
    const updated = await prisma.cmpTicket.update({
      where: { id: ticketId },
      data: { description },
      select: { id: true, tenantId: true, status: true, stage: true, updatedAt: true },
    });

    emitTelemetry({
      event_type: 'factory.cmp.ticket_set_description',
      payload: {
        ticket_id: ticketId,
        tenant_id: updated.tenantId || null,
        outcomes_count: outcomes.length,
      },
      cmp: { ticket_id: ticketId, action: 'factory-cmp-ticket-set-description' },
    });

    return res.status(200).json({
      ok: true,
      ticket_id: ticketId,
      tenant_id: updated.tenantId || null,
      status: updated.status || '',
      stage: updated.stage || '',
      updated_at: updated.updatedAt?.toISOString?.() || new Date().toISOString(),
      intended_outcomes: outcomes,
    });
  } catch (e) {
    emitLogicFailure({
      source: 'api/factory/cmp/ticket-set-description',
      severity: 'fatal',
      error: e,
      cmp: { ticket_id: ticketId || 'n/a', action: 'factory-cmp-ticket-set-description' },
    });
    return res
      .status(500)
      .json({ error: 'FACTORY_CMP_TICKET_SET_DESCRIPTION_FAILED', detail: String(e?.message || e).slice(0, 500) });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

