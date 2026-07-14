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
import {
  RAPID_DELIVERY_INTAKE_NOTIFICATION_EVENT,
  RAPID_DELIVERY_PRODUCT,
  defaultRapidDeliveryOperator,
  isRapidDeliveryOfferSlug,
  rapidDeliveryReferenceFromLeadId,
} from '../cmp/_lib/rapid-delivery-operator.js';
import { emitLogicFailure } from '../cmp/_lib/telemetry.js';
import { recordTrustedAutomationEvent } from '../automation/internal.js';
import { cfg } from './runtime-config.js';
import { getRapidDeliveryOffer } from '../public/rapid-delivery-offers.js';

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
  const isRapidDelivery = product === RAPID_DELIVERY_PRODUCT;
  const offerSlug = str(meta.offer_slug);
  const nowIso = new Date().toISOString();

  if (isRapidDelivery) {
    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!str(meta.business_name)) return res.status(400).json({ error: 'business_name is required' });
    if (!str(meta.enquiry_channels)) return res.status(400).json({ error: 'enquiry_channels is required' });
    if (!str(meta.primary_pain)) return res.status(400).json({ error: 'primary_pain is required' });
    if (!isRapidDeliveryOfferSlug(offerSlug)) {
      return res.status(400).json({
        error: 'INVALID_OFFER_SLUG',
        hint: 'meta.offer_slug must be one of the rapid-delivery offer slugs.',
      });
    }
  }

  /** @type {Record<string, unknown> | null} */
  let qualificationJson = null;
  if (isAiLeadRescue || isRapidDelivery || Object.keys(meta).length > 0) {
    qualificationJson = {
      intake_meta: {
        ...meta,
        product: product || meta.product || null,
        message: intent || message,
        host: str(meta.host) || resolveHostFromReq(req),
      },
    };
    if (isAiLeadRescue) {
      qualificationJson.ai_lead_rescue_operator = {
        ...defaultAiLeadRescueOperator(nowIso),
        payment_route: str(meta.preferred_payment_path) || null,
      };
    }
    if (isRapidDelivery) {
      qualificationJson.rapid_delivery_operator = defaultRapidDeliveryOperator(nowIso);
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
        intent: isRapidDelivery
          ? `rapid_delivery:${offerSlug}`
          : intent,
        status: isAiLeadRescue || isRapidDelivery ? 'NEW_INTAKE' : 'NEW',
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
        reference: isRapidDelivery ? rapidDeliveryReferenceFromLeadId(lead.id) : null,
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

    if (isRapidDelivery) {
      const offer = getRapidDeliveryOffer(offerSlug);
      const reference = rapidDeliveryReferenceFromLeadId(lead.id);
      await recordTrustedAutomationEvent(prisma, {
        tenantId,
        eventType: RAPID_DELIVERY_INTAKE_NOTIFICATION_EVENT,
        payload: {
          lead_id: lead.id,
          reference,
          tenant_id: tenantId,
          offer_slug: offerSlug,
          offer_title: offer?.title || null,
          business_name: str(meta.business_name),
          contact_name: name,
          email,
          phone: phone || null,
          enquiry_channels: str(meta.enquiry_channels),
          primary_pain: str(meta.primary_pain),
          operator_path: '/admin/rapid-delivery',
          change_revenue_path: '/change/revenue',
          submitted_at: lead.createdAt instanceof Date ? lead.createdAt.toISOString() : nowIso,
          source_host: str(meta.host) || resolveHostFromReq(req),
        },
        idempotencyKey: `rapid-delivery:intake:${lead.id}`,
        correlationId: lead.id,
        source: 'tenant_intake',
      });

      return res.status(200).json({
        ok: true,
        tenant_id: tenantId,
        lead_id: lead.id,
        reference,
        product: RAPID_DELIVERY_PRODUCT,
        offer_slug: offerSlug,
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
