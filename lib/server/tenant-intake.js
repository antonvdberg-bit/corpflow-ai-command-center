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
 * - For AI Lead Rescue intakes (meta.product = 'ai-lead-rescue') also emit
 *   `corpflow.lead_rescue.intake_received` with a pre-formatted operator
 *   notification payload so n8n / Telegram / email branches can alert immediately.
 *   No new external service or env var: reuses CORPFLOW_AUTOMATION_FORWARD_URL.
 */

import { PrismaClient } from '@prisma/client';

import {
  AI_LEAD_RESCUE_INTAKE_NOTIFICATION_EVENT,
  AI_LEAD_RESCUE_PRODUCT,
  buildAiLeadRescueIntakeNotification,
  defaultAiLeadRescueOperator,
} from '../cmp/_lib/ai-lead-rescue-operator.js';
import { emitLogicFailure } from '../cmp/_lib/telemetry.js';
import { recordTrustedAutomationEvent } from '../automation/internal.js';
import { cfg } from './runtime-config.js';

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

function resolveHostFromReq(req) {
  try {
    const raw =
      (req?.headers?.['x-forwarded-host'] || req?.headers?.host || '').toString().split(',')[0] || '';
    return raw.trim().toLowerCase().replace(/:\d+$/, '');
  } catch {
    return '';
  }
}

function resolvePublicBaseUrl(req) {
  const cfgUrl = str(cfg('CORPFLOW_PUBLIC_BASE_URL', ''));
  if (cfgUrl) return cfgUrl.replace(/\/+$/, '');
  const host = resolveHostFromReq(req);
  if (!host) return '';
  return `https://${host}`;
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
  const phone = str(body.phone);
  const message = str(body.message || body.intent);
  const product = str(meta.product);
  const isAiLeadRescue = product === AI_LEAD_RESCUE_PRODUCT;
  const nowIso = new Date().toISOString();

  /** @type {Record<string, unknown> | null} */
  let qualificationJson = null;
  if (isAiLeadRescue || Object.keys(meta).length > 0) {
    qualificationJson = {
      intake_meta: {
        ...meta,
        message: intent || message,
      },
    };
    if (isAiLeadRescue) {
      qualificationJson.ai_lead_rescue_operator = {
        ...defaultAiLeadRescueOperator(nowIso),
        payment_route: str(meta.preferred_payment_path) || null,
      };
    }
  }

  const prisma = new PrismaClient();
  try {
    const lead = await prisma.lead.create({
      data: {
        tenantId,
        name: name || email,
        email,
        phone: phone || null,
        message: message || intent,
        intent,
        status: isAiLeadRescue ? 'NEW_INTAKE' : 'NEW',
        qualificationJson,
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

    if (isAiLeadRescue) {
      const notification = buildAiLeadRescueIntakeNotification({
        leadId: lead.id,
        tenantId,
        submittedAt: lead.createdAt,
        prospect: {
          business_name: str(meta.business_name),
          contact_name: name,
          email,
          phone,
          region_path: str(meta.region_path),
          lead_sources: str(meta.lead_sources),
          preferred_payment_path: str(meta.preferred_payment_path),
          source_host: str(meta.host) || resolveHostFromReq(req),
        },
        publicBaseUrl: resolvePublicBaseUrl(req),
      });

      await recordTrustedAutomationEvent(prisma, {
        tenantId,
        eventType: AI_LEAD_RESCUE_INTAKE_NOTIFICATION_EVENT,
        payload: notification,
        idempotencyKey: `lead-rescue:intake:${lead.id}`,
        correlationId: lead.id,
        source: 'tenant_intake',
      });
    }

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
