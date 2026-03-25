import { createBaserowClient, BaserowError } from './lib/baserow.js';
import { getCmpFieldMap } from './lib/cmp-fields.js';

/**
 * GET /api/cmp/ticket-get?id={rowId}
 * Returns a safe subset of the Baserow row for bubble hydration.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = req.query?.id;
  if (!id || String(id).trim() === '') {
    return res.status(400).json({ error: 'id query parameter is required' });
  }

  try {
    const client = createBaserowClient({});
    const row = await client.getRow(undefined, id);
    const f = getCmpFieldMap();
    const description = row[f.description] ?? row.Description ?? '';
    const status = row[f.status] ?? row.Status ?? '';
    const stage = row[f.stage] ?? row.Stage ?? '';

    return res.status(200).json({
      ticket_id: String(row.id),
      description: typeof description === 'object' ? JSON.stringify(description) : String(description),
      status: typeof status === 'object' ? JSON.stringify(status) : String(status),
      stage: typeof stage === 'object' ? JSON.stringify(stage) : String(stage),
    });
  } catch (e) {
    if (e instanceof BaserowError) {
      const code = e.status === 404 ? 404 : e.status >= 400 && e.status < 600 ? e.status : 502;
      return res.status(code).json({ error: e.message, detail: e.body });
    }
    console.error('ticket-get', e);
    return res.status(500).json({ error: 'Ticket get failed', detail: String(e?.message || e) });
  }
}
