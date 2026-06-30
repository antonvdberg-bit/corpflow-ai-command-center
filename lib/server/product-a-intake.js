/**
 * Product A — US clinic audit intake (public).
 *
 * Route: POST /api/product-a/intake
 *
 * - Validates intake fields per docs/product/PRODUCT_A_INTAKE_WEBHOOK.md
 * - Records `intake.product_a.us_clinic.v1` in automation_events (optional n8n forward via CORPFLOW_AUTOMATION_FORWARD_URL)
 * - Optionally POSTs flat JSON to N8N_PRODUCT_A_INTAKE_WEBHOOK_URL when configured
 * - No Postgres leads row, no outbound email, no CRM dependency
 */

import { PrismaClient } from '@prisma/client';

import { recordTrustedAutomationEvent } from '../automation/internal.js';
import { emitLogicFailure } from '../cmp/_lib/telemetry.js';
import { getN8nProductAIntakeWebhookUrl } from './config.js';
import {
  buildProductAIntakeIdempotencyKey,
  buildProductAIntakePayload,
  PRODUCT_A_INTAKE_EVENT_TYPE,
  PRODUCT_A_MAURITIUS_INTAKE_EVENT_TYPE,
  validateProductAIntakeBodyForRequest,
} from './product-a-intake-payload.js';

function resolveHostFromReq(req) {
  try {
    const raw =
      (req?.headers?.['x-forwarded-host'] || req?.headers?.host || '').toString().split(',')[0] || '';
    return raw.trim().toLowerCase().replace(/:\d+$/, '');
  } catch {
    return '';
  }
}

function resolveTenantIdFromReq(req) {
  try {
    const ctx = req?.corpflowContext;
    if (ctx?.tenant_id) return String(ctx.tenant_id).trim();
  } catch {
    /* ignore */
  }
  return 'root';
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {Promise<{ ok: boolean, status?: number }>}
 */
async function postProductAIntakeToN8n(payload) {
  const url = getN8nProductAIntakeWebhookUrl();
  if (!url) return { ok: false, status: 0 };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { ok: response.ok, status: response.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

export default async function productAIntakeHandler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const validated = validateProductAIntakeBodyForRequest(req.body);
  if (!validated.ok) {
    return res.status(400).json({ error: validated.error, field: validated.field || null });
  }

  const variant = validated.variant;
  const eventType =
    variant === 'mauritius_property' ? PRODUCT_A_MAURITIUS_INTAKE_EVENT_TYPE : PRODUCT_A_INTAKE_EVENT_TYPE;
  const businessName =
    variant === 'mauritius_property' ? validated.data.agency_name : validated.data.clinic_name;

  const host = resolveHostFromReq(req);
  const tenantId = resolveTenantIdFromReq(req);
  const nowIso = new Date().toISOString();
  const intakePayload = buildProductAIntakePayload(validated.data, {
    received_at: nowIso,
    host,
    variant,
  });
  const idempotencyKey = buildProductAIntakeIdempotencyKey(
    validated.data.email,
    businessName,
    nowIso,
    variant,
  );

  const prisma = new PrismaClient();
  let automationRecorded = false;
  let automationDeduped = false;

  try {
    const automationResult = await recordTrustedAutomationEvent(prisma, {
      tenantId,
      eventType: eventType,
      payload: intakePayload,
      idempotencyKey,
      correlationId: idempotencyKey,
      source: 'api/product-a/intake',
    });

    if (automationResult) {
      automationRecorded = true;
      automationDeduped = Boolean(automationResult.deduped);
    }
  } catch (e) {
    emitLogicFailure({
      source: 'api/product-a/intake',
      severity: 'error',
      error: e,
      cmp: { ticket_id: 'n/a', action: 'product-a-intake' },
      recommended_action: 'Verify Postgres connectivity and automation_events schema.',
      meta: { tenant_id: tenantId },
    });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }

  const n8nDirect = await postProductAIntakeToN8n(intakePayload);
  const n8nWebhookConfigured = Boolean(getN8nProductAIntakeWebhookUrl());

  if (!automationRecorded && n8nWebhookConfigured && !n8nDirect.ok) {
    return res.status(503).json({
      error: 'INTAKE_DELIVERY_FAILED',
      detail: 'Could not record your request. Please try again or email support@corpflowai.com.',
    });
  }

  if (!automationRecorded && !n8nWebhookConfigured) {
    try {
      console.warn('[product-a-intake] stub mode — no automation row and N8N_PRODUCT_A_INTAKE_WEBHOOK_URL unset', {
        email: validated.data.email,
        business_name: businessName,
      });
    } catch {
      /* ignore */
    }
  }

  return res.status(200).json({
    ok: true,
    message: 'Audit request received. We will review within 2 business days.',
    delivery: {
      automation_event: automationRecorded,
      automation_deduped: automationDeduped,
      n8n_direct: n8nDirect.ok,
      n8n_direct_configured: n8nWebhookConfigured,
    },
  });
}
