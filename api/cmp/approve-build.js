import { createBaserowClient, BaserowError } from './lib/baserow.js';
import { approveBuildPayload } from './lib/cmp-fields.js';

/**
 * POST /api/cmp/approve-build
 * Body: { ticket_id: string }
 * Moves workflow to Build stage in Baserow (Preview branch flow hooks in later phases).
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

  const ticketId = body?.ticket_id != null ? String(body.ticket_id).trim() : '';
  if (!ticketId) {
    return res.status(400).json({ error: 'ticket_id is required' });
  }

  try {
    const client = createBaserowClient({});
    const fields = approveBuildPayload();
    const row = await client.updateRow(undefined, ticketId, fields);
    return res.status(200).json({
      ok: true,
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
    console.error('approve-build', e);
    return res.status(500).json({ error: 'Approve build failed', detail: String(e?.message || e) });
  }
}
