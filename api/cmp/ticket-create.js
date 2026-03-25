import { createBaserowClient, BaserowError } from './lib/baserow.js';
import { initialTicketPayload } from './lib/cmp-fields.js';

/**
 * POST /api/cmp/ticket-create
 * Body: { description: string, client_id?: string, site_id?: string }
 * Creates a Change Request row in Baserow (authoritative workflow index).
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  if (!description) {
    return res.status(400).json({ error: 'description is required' });
  }

  try {
    const client = createBaserowClient({});
    const fields = initialTicketPayload(description);
    // Optional: map client/site into named Baserow fields when env is set (avoids unknown-column errors).
    const clientField = process.env.BASEROW_CMP_CLIENT_ID_FIELD;
    if (clientField && body.client_id) fields[clientField] = String(body.client_id);
    const siteField = process.env.BASEROW_CMP_SITE_ID_FIELD;
    if (siteField && body.site_id) fields[siteField] = String(body.site_id);

    const row = await client.createRow(undefined, fields);
    const ticketId = row?.id != null ? String(row.id) : null;
    if (!ticketId) {
      return res.status(502).json({ error: 'Baserow did not return a row id' });
    }

    return res.status(200).json({
      ticket_id: ticketId,
      baserow_row: row,
    });
  } catch (e) {
    if (e instanceof BaserowError) {
      return res.status(e.status >= 400 && e.status < 600 ? e.status : 502).json({
        error: e.message,
        detail: e.body,
      });
    }
    console.error('ticket-create', e);
    return res.status(500).json({ error: 'Ticket create failed', detail: String(e?.message || e) });
  }
}
