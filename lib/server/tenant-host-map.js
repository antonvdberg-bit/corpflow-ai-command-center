import { PrismaClient } from '@prisma/client';
import { verifyFactoryMasterAuth } from './factory-master-auth.js';
import { cfg } from './runtime-config.js';
import { evaluateOnboardingHostnamePolicy } from './tenant-hostname-policy.js';

function json(res, status, body) {
  res.status(status).json(body);
}

function normalizeHost(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
}

/**
 * Factory-only: upsert host→tenant mapping.
 *
 * Route: POST /api/factory/host-map/upsert
 * Body: { host, tenant_id, mode?, enabled? }
 */
export default async function tenantHostMapUpsertHandler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }
  if (!verifyFactoryMasterAuth(req)) {
    return json(res, 403, { error: 'Factory master authentication required.' });
  }

  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) {
    return json(res, 503, { error: 'POSTGRES_URL_MISSING' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const host = normalizeHost(body.host);
  const tenantId = String(body.tenant_id || body.tenantId || '').trim();
  const mode = body.mode != null && String(body.mode).trim() !== '' ? String(body.mode).trim().toLowerCase() : null;
  const enabled = body.enabled == null ? true : Boolean(body.enabled);

  if (!host) return json(res, 400, { error: 'host is required' });
  if (!tenantId) return json(res, 400, { error: 'tenant_id is required' });

  const bypassHostnamePolicy = body.bypass_client_hostname_policy === true;
  const hostnamePolicy = evaluateOnboardingHostnamePolicy(host, {
    bypass: bypassHostnamePolicy,
    tenantId,
  });
  if (!hostnamePolicy.allowed) {
    return json(res, 400, {
      error: hostnamePolicy.code || 'ONBOARDING_HOSTNAME_POLICY',
      hint: hostnamePolicy.hint,
    });
  }

  const prisma = new PrismaClient();
  try {
    const row = await prisma.tenantHostname.upsert({
      where: { host },
      update: { tenantId, mode, enabled },
      create: { host, tenantId, mode, enabled },
      select: { host: true, tenantId: true, mode: true, enabled: true, updatedAt: true },
    });
    return json(res, 200, {
      ok: true,
      mapping: row,
      ...(hostnamePolicy.notice ? { policy_notice: hostnamePolicy.notice } : {}),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(res, 500, { ok: false, error: 'HOST_MAP_UPSERT_FAILED', detail: msg });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

