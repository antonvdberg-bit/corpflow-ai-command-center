/**
 * Chat Widget v0 — notification stub.
 *
 * Wraps `recordTrustedAutomationEvent` with the chat-widget event vocabulary.
 * Writes a single `automation_events` row scoped to the tenant on `submit`,
 * with a payload sufficient for the operator workflow to act on the lead.
 *
 * v0 does NOT create a `cmp_tickets` row. v1 will, behind a feature flag.
 *
 * PII discipline: payload includes the lead fields necessary to follow up.
 * No raw IP. Lead message capped to 280 chars in payload (full message stays
 * on the thread row). Idempotency keyed on the thread id so retries dedupe.
 */

import { recordTrustedAutomationEvent } from '../../automation/internal.js';

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{
 *   tenantId: string;
 *   threadId: string;
 *   leadName?: string | null;
 *   leadEmail?: string | null;
 *   leadPhone?: string | null;
 *   requestType?: string | null;
 *   leadMessage?: string | null;
 *   sourceHost?: string | null;
 *   sourcePath?: string | null;
 * }} ctx
 * @returns {Promise<{ ok: boolean; eventId: string | null; error?: string }>}
 */
export async function emitChatWidgetSubmitted(prisma, ctx) {
  if (!ctx || !ctx.tenantId || !ctx.threadId) {
    return { ok: false, eventId: null, error: 'missing_required_fields' };
  }
  const excerptSrc = ctx.leadMessage != null ? String(ctx.leadMessage) : '';
  const excerpt = excerptSrc.length > 280 ? `${excerptSrc.slice(0, 280)}…` : excerptSrc;

  const payload = {
    schema: 'corpflow.chat_widget.lead.submitted.v1',
    thread_id: ctx.threadId,
    tenant_id: ctx.tenantId,
    lead: {
      name: ctx.leadName || null,
      email: ctx.leadEmail || null,
      phone: ctx.leadPhone || null,
      request_type: ctx.requestType || null,
      message_excerpt: excerpt,
    },
    origin: {
      source_host: ctx.sourceHost || null,
      source_path: ctx.sourcePath || null,
    },
    occurred_at: new Date().toISOString(),
  };

  try {
    const out = await recordTrustedAutomationEvent(prisma, {
      tenantId: ctx.tenantId,
      eventType: 'chat_widget.lead.submitted',
      payload,
      idempotencyKey: `chat-widget-thread:${ctx.threadId}`,
      source: 'chat-widget',
    });
    if (!out) return { ok: false, eventId: null, error: 'mirror_disabled_or_failed' };
    return { ok: true, eventId: out.id || null };
  } catch (e) {
    return { ok: false, eventId: null, error: String(e && e.message ? e.message : e) };
  }
}
