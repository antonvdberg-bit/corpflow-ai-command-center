/**
 * Factory-only: upsert tenant website draft into Postgres (tenant_personas.persona_json.website_draft).
 *
 * Route: POST /api/factory/tenant-site/upsert
 */

import { verifyFactoryMasterAuth } from './factory-master-auth.js';
import { upsertTenantWebsiteDraftPg } from './tenant-site-store.js';

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
export default async function tenantSiteHandler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!verifyFactoryMasterAuth(req)) {
    return res.status(403).json({ error: 'Factory master authentication required.' });
  }
  const body = req.body && typeof req.body === 'object' ? req.body : null;
  if (!body) return res.status(400).json({ error: 'Missing JSON body' });

  const tenantId = body?.tenant_id != null ? String(body.tenant_id).trim() : '';
  const websiteDraft = body?.website_draft;
  if (!tenantId) return res.status(400).json({ error: 'tenant_id is required' });
  if (!websiteDraft || typeof websiteDraft !== 'object') {
    return res.status(400).json({ error: 'website_draft object is required' });
  }

  const ok = await upsertTenantWebsiteDraftPg(tenantId, /** @type {Record<string, unknown>} */ (websiteDraft));
  if (!ok) return res.status(500).json({ error: 'TENANT_SITE_UPSERT_FAILED' });
  return res.status(200).json({ ok: true, tenant_id: tenantId });
}

