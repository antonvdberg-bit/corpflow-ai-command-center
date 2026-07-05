/**
 * LuxeMaurice tenant — operator email when tickets are created or withdrawn on /change.
 * Uses the shared n8n email webhook (same path as password_reset).
 */

import { cfg } from './runtime-config.js';
import { inferPublicBaseUrl } from './password-reset-delivery.js';
import { resolveEmailFromAddress, sendN8nTransactionalEmail } from './email-delivery.js';

export const LUX_TENANT_ID = 'luxe-maurice';

/** Default Lux programme operator inbox (override via env). */
export const LUX_TICKET_NOTIFY_EMAIL_DEFAULT = 'jan@luxemaurice.com';

/**
 * @returns {string}
 */
export function resolveLuxTicketNotifyEmail() {
  const raw = String(cfg('CORPFLOW_LUX_TICKET_NOTIFY_EMAIL', '') || '').trim();
  return raw || LUX_TICKET_NOTIFY_EMAIL_DEFAULT;
}

/**
 * @param {{
 *   action: 'created' | 'withdrawn',
 *   ticketId: string,
 *   descriptionPreview?: string | null,
 *   publicBaseUrl?: string | null,
 *   fromAddress?: string | null,
 *   toEmail?: string | null,
 * }} args
 * @returns {Record<string, unknown>}
 */
export function buildLuxTicketUpdateEmailPayload(args) {
  const action = args.action === 'withdrawn' ? 'withdrawn' : 'created';
  const ticketId = String(args.ticketId || '').trim();
  const base = String(args.publicBaseUrl || '').trim().replace(/\/+$/, '');
  const changeUrl = base ? `${base}/change` : null;
  const preview = String(args.descriptionPreview || '').trim().slice(0, 500);
  const verb = action === 'withdrawn' ? 'withdrawn' : 'created';
  const subject =
    action === 'withdrawn'
      ? `LuxeMaurice change ticket withdrawn (${ticketId})`
      : `LuxeMaurice change ticket created (${ticketId})`;

  const textLines = [
    `A change ticket was ${verb} on the LuxeMaurice Change Console.`,
    '',
    `Ticket: ${ticketId}`,
    preview ? `Request preview: ${preview}` : null,
    changeUrl ? `Open console: ${changeUrl}` : null,
    '',
    'This is an operator notification from CorpFlowAI — not a client marketing message.',
  ].filter(Boolean);

  return {
    schema: 'corpflow.email.lux_ticket_update.v1',
    purpose: 'lux_ticket_update',
    event: action === 'withdrawn' ? 'lux_ticket_withdrawn' : 'lux_ticket_created',
    tenant_id: LUX_TENANT_ID,
    ticket_id: ticketId,
    to: String(args.toEmail || resolveLuxTicketNotifyEmail()).trim(),
    from: String(args.fromAddress || resolveEmailFromAddress()).trim(),
    subject,
    text: textLines.join('\n'),
    change_url: changeUrl,
    description_preview: preview || null,
  };
}

/**
 * Best-effort notify Jan (or configured inbox). Never throws.
 *
 * @param {import('http').IncomingMessage} req
 * @param {{
 *   action: 'created' | 'withdrawn',
 *   ticketId: string,
 *   descriptionPreview?: string | null,
 *   tenantId?: string | null,
 * }} args
 */
export async function notifyLuxTicketOperatorEmail(req, args) {
  const tenantId = args.tenantId != null ? String(args.tenantId).trim() : '';
  if (tenantId !== LUX_TENANT_ID) return { skipped: true, reason: 'not_lux_tenant' };

  const ticketId = String(args.ticketId || '').trim();
  if (!ticketId) return { skipped: true, reason: 'missing_ticket_id' };

  const payload = buildLuxTicketUpdateEmailPayload({
    action: args.action,
    ticketId,
    descriptionPreview: args.descriptionPreview,
    publicBaseUrl: inferPublicBaseUrl(req),
  });

  const result = await sendN8nTransactionalEmail(payload);
  return { skipped: false, ...result };
}
