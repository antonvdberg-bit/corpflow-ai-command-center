/**
 * Tenant public intake: capture leads with host-derived tenant scope.
 *
 * Route: POST /api/tenant/intake
 *
 * Security model:
 * - No master key required (public).
 * - Derive tenant_id from host mapping (req.corpflowContext set by factory_router).
 * - Write to Postgres `leads` with tenant_id to prevent contamination.
 * - Emit automation event `tenant.lead.captured` (tenant-scoped) which can forward to n8n.
 */

import { PrismaClient } from '@prisma/client';

import { emitLogicFailure } from '../cmp/_lib/telemetry.js';
import { recordTrustedAutomationEvent } from '../automation/internal.js';

function str(v) {
  return v != null ? String(v).trim() : '';
}

function resolveTenantIdFromReq(req) {
  try {
    const ctx = req?.corpflowContext;
    if (!ctx || ctx.surface !== 'tenant') return null;
    const tid = str(ctx.tenant_id);
    return tid || null;
  } catch {
    return null;
  }
}

export default async function tenantIntakeHandler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tenantId = resolveTenantIdFromReq(req);
  if (!tenantId) {
    return res.status(400).json({
      error: 'TENANT_CONTEXT_MISSING',
      hint: 'This endpoint must be called on a tenant hostname that maps to tenant_hostnames.',
    });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : null;
  if (!body) return res.status(400).json({ error: 'Missing JSON body' });

  const name = str(body.name);
  const email = str(body.email).toLowerCase();
  const intent = str(body.intent || body.message || 'Lead');
  if (!email) return res.status(400).json({ error: 'email is required' });

  const meta = body.meta && typeof body.meta === 'object' ? body.meta : {};

  const prisma = new PrismaClient();
  try {
    const lead = await prisma.lead.create({
      data: {
        tenantId,
        name: name || email,
        email,
        intent,
        status: 'NEW',
      },
      select: { id: true, createdAt: true },
    });

    await recordTrustedAutomationEvent(prisma, {
      tenantId,
      eventType: 'tenant.lead.captured',
      payload: {
        tenant_id: tenantId,
        lead_id: lead.id,
        name: name || null,
        email,
        intent,
        meta,
      },
      idempotencyKey: `tenant:lead:${tenantId}:${lead.id}`,
      source: 'tenant_intake',
    });

    return res.status(200).json({ ok: true, tenant_id: tenantId, lead_id: lead.id });
  } catch (e) {
    emitLogicFailure({
      source: 'api/tenant/intake',
      severity: 'error',
      error: e,
      cmp: { ticket_id: 'n/a', action: 'tenant-intake' },
      recommended_action: 'Verify Postgres connectivity and leads table schema.',
      meta: { tenant_id: tenantId },
    });
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: 'TENANT_INTAKE_FAILED', detail: msg });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

