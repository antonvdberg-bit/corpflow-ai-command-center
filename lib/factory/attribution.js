import { createBaserowClient } from '../cmp/_lib/baserow.js';

/**
 * Hybrid Attribution Engine (Scaffold)
 *
 * Logic:
 * - If `GOOGLE_ANALYTICS_API_KEY` is present, fetch external attribution signals.
 * - Otherwise, fall back to Internal Lightweight Attribution:
 *   - parse CMP bubble interactions + referral headers
 *   - write redacted attribution rows into Baserow
 *
 * Notes:
 * - This file is intentionally scaffold-safe. It does not require GA
 *   libraries and will not block requests if attribution fails.
 */

function getClientIdFromRequest(req) {
  return (
    req?.headers?.get?.('x-client-id') ||
    req?.headers?.['x-client-id'] ||
    req?.body?.client_id ||
    req?.query?.client_id ||
    'root'
  );
}

function internalAttribution(req) {
  const referer = req?.headers?.get?.('referer') || req?.headers?.['referer'] || '';
  const userAgent = req?.headers?.get?.('user-agent') || req?.headers?.['user-agent'] || '';

  // CMP bubble writes ticket ids into cookie/localStorage client-side; on the server
  // we can only see what the page sends back (scaffold: look for query/header).
  const ticketId = req?.headers?.get?.('x-cmp-ticket-id') || req?.headers?.['x-cmp-ticket-id'] || '';

  // Avoid storing raw PII; keep low-signal metadata only.
  return {
    referral_domain: String(referer).split('/')[2] || '',
    user_agent_sig: String(userAgent).slice(0, 80),
    cmp_ticket_id: ticketId ? String(ticketId) : null,
    occurred_at: new Date().toISOString(),
  };
}

async function writeAttributionToBaserow({ tenantClientId, attribution }) {
  const baserowToken = process.env.BASEROW_TOKEN;
  const baserowUrl = process.env.BASEROW_URL || 'https://crm.corpflowai.com';
  const tableId =
    process.env.BASEROW_ATTRIBUTION_TABLE_ID ||
    process.env.BASEROW_TABLE_ID ||
    null;

  if (!baserowToken || !tableId) return { ok: false, reason: 'missing baserow config' };

  const client = createBaserowClient({ baseUrl: baserowUrl, token: baserowToken, defaultTableId: tableId });

  const row = await client.createRow(undefined, {
    client_id: tenantClientId,
    ...attribution,
  });

  return { ok: true, row_id: row?.id ?? null };
}

export async function attribute(req) {
  const tenantClientId = getClientIdFromRequest(req);
  const googleKey = (process.env.GOOGLE_ANALYTICS_API_KEY || '').trim();

  try {
    if (googleKey) {
      // Placeholder: GA Data API call would go here.
      // Return deterministic scaffold output for now.
      const attribution = {
        source: 'ga_external',
        occurred_at: new Date().toISOString(),
        client_id: tenantClientId,
      };

      return writeAttributionToBaserow({ tenantClientId, attribution });
    }
  } catch (_) {
    // Fall through to internal attribution.
  }

  const attribution = internalAttribution(req);
  return writeAttributionToBaserow({ tenantClientId, attribution });
}

