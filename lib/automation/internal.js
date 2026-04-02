/**
 * Internal writers: CMP and other first-party code mirror into automation_events
 * without HTTP self-calls (no extra Vercel invocations).
 */

import { emitTelemetry } from '../cmp/_lib/telemetry.js';
import { cfg } from '../server/runtime-config.js';
import { classifyEventRisk } from './risk.js';
import { forwardAutomationEnvelope } from './forward.js';
import { resolveTenantScope } from './scope.js';

/**
 * Whether CMP lifecycle events are mirrored into automation_events.
 *
 * @returns {boolean}
 */
export function isCmpAutomationMirrorEnabled() {
  return String(cfg('CORPFLOW_AUTOMATION_CMP_MIRROR', 'true')).toLowerCase() !== 'false';
}

/**
 * Records a low/medium-risk automation row from trusted server code and optionally forwards to n8n.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{
 *   tenantId?: string | null;
 *   eventType: string;
 *   payload?: Record<string, unknown>;
 *   idempotencyKey?: string | null;
 *   correlationId?: string | null;
 *   source?: string;
 * }} opts
 * @returns {Promise<{ id: string } | { deduped: true; id: string } | null>}
 */
export async function recordTrustedAutomationEvent(prisma, opts) {
  if (!isCmpAutomationMirrorEnabled()) return null;

  const eventType = String(opts.eventType || '').trim();
  if (!eventType) return null;

  const tenantRaw = opts.tenantId != null ? String(opts.tenantId).trim() : '';
  const tenantId = tenantRaw || null;
  const tenantScope = resolveTenantScope(tenantRaw);
  const payload = opts.payload && typeof opts.payload === 'object' ? opts.payload : {};
  const idem = opts.idempotencyKey != null && String(opts.idempotencyKey).trim()
    ? String(opts.idempotencyKey).trim()
    : null;
  const correlationId = opts.correlationId != null && String(opts.correlationId).trim()
    ? String(opts.correlationId).trim()
    : null;
  const source = opts.source != null && String(opts.source).trim() ? String(opts.source).trim() : 'internal';

  const riskTier = classifyEventRisk(eventType);

  try {
    if (idem) {
      const existing = await prisma.automationEvent.findUnique({
        where: {
          automation_events_scope_idem: {
            tenantScope,
            idempotencyKey: idem,
          },
        },
        select: { id: true },
      });
      if (existing) {
        return { deduped: true, id: existing.id };
      }
    }

    const row = await prisma.automationEvent.create({
      data: {
        tenantId,
        tenantScope,
        source,
        eventType,
        correlationId,
        idempotencyKey: idem,
        riskTier,
        status: 'accepted',
        payload,
      },
      select: {
        id: true,
        occurredAt: true,
        tenantScope: true,
        eventType: true,
        riskTier: true,
      },
    });

    emitTelemetry({
      event_type: 'automation.internal',
      payload: {
        automation_event_id: row.id,
        tenant_scope: row.tenantScope,
        event_type: row.eventType,
        risk_tier: row.riskTier,
        source,
      },
      cmp: { ticket_id: String(payload.ticket_id || payload.ticketId || 'n/a'), action: 'automation_internal' },
    });

    await forwardAutomationEnvelope({
      schema: 'corpflow.automation.envelope.v1',
      id: row.id,
      occurred_at: row.occurredAt?.toISOString?.() || new Date().toISOString(),
      tenant_id: tenantId,
      tenant_scope: tenantScope,
      event_type: eventType,
      correlation_id: correlationId,
      risk_tier: riskTier,
      source,
      payload,
    });

    return { id: row.id };
  } catch (e) {
    console.error('recordTrustedAutomationEvent', e);
    return null;
  }
}
