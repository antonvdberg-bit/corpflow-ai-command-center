/**
 * Preview-only helper: mint a signed `cf_preview` URL for tenant `cipc-desk`
 * using the secret already configured on the Preview deployment.
 *
 * Does not print or return the secret. Live email/WhatsApp are not activated.
 */
import { buildClientSitePreviewUrl, isTenantPreviewSecretConfigured } from './tenant-preview-token.js';

const CIPCDESK_TENANT_ID = 'cipc-desk';

function isPreviewEnv() {
  return String(process.env.VERCEL_ENV || '').trim().toLowerCase() === 'preview';
}

function inferPublicBaseUrl(req) {
  try {
    const proto =
      String(req.headers['x-forwarded-proto'] || 'https')
        .split(',')[0]
        .trim() || 'https';
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '')
      .split(',')[0]
      .trim()
      .replace(/:\d+$/, '');
    if (host) return `${proto}://${host}`;
  } catch {
    /* ignore */
  }
  return '';
}

/**
 * GET|POST /api/cipc-desk/preview-link
 * Returns `{ ok, preview_url, tenant_id }` for fictional-data CIPC Desk preview verification.
 */
export default async function cipcDeskPreviewLinkHandler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isPreviewEnv()) {
    return res.status(403).json({ error: 'PREVIEW_ONLY' });
  }

  if (!isTenantPreviewSecretConfigured()) {
    return res.status(503).json({
      error: 'TENANT_PREVIEW_SECRET_NOT_CONFIGURED_ON_DEPLOYMENT',
      hint: 'CORPFLOW_TENANT_PREVIEW_SECRET must exist on this Preview deployment (same value as Production).',
    });
  }

  const base = inferPublicBaseUrl(req);
  if (!base) {
    return res.status(503).json({ error: 'PUBLIC_BASE_URL_UNAVAILABLE' });
  }

  const preview_url = buildClientSitePreviewUrl(base, CIPCDESK_TENANT_ID);
  if (!preview_url) {
    return res.status(503).json({ error: 'PREVIEW_URL_SIGN_FAILED' });
  }

  return res.status(200).json({
    ok: true,
    tenant_id: CIPCDESK_TENANT_ID,
    preview_url,
    fictional_data_only: true,
    source: 'cipc-desk-preview-link',
  });
}
