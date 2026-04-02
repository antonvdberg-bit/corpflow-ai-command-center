/**
 * Factory-only: read tenant website draft from Postgres (persona_json.website_draft).
 *
 * Route: GET /api/factory/tenant-site/read?tenant_id=...
 */

import { verifyFactoryMasterAuth } from './factory-master-auth.js';
import { readTenantWebsiteDraftPg } from './tenant-site-store.js';

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
export default async function tenantSiteReadHandler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!verifyFactoryMasterAuth(req)) {
    return res.status(403).json({ error: 'Factory master authentication required.' });
  }
  const q = req.query && typeof req.query === 'object' ? req.query : {};
  const raw = q.tenant_id;
  const tenantId = raw != null ? String(Array.isArray(raw) ? raw[0] : raw).trim() : '';
  if (!tenantId) {
    return res.status(400).json({ error: 'tenant_id query parameter is required' });
  }

  const website_draft = await readTenantWebsiteDraftPg(tenantId);
  return res.status(200).json({ ok: true, tenant_id: tenantId, website_draft });
}
