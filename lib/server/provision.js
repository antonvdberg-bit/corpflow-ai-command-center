import { PrismaClient } from '@prisma/client';
import { emitLogicFailure } from '../cmp/_lib/telemetry.js';
import { verifyFactoryMasterAuth } from './factory-master-auth.js';

const prisma = new PrismaClient();

/**
 * Factory-only: create a tenant row in Postgres (`tenants` table).
 *
 * Body: `{ tenant_slug, tenant_name?, tenant_id? }` — `tenant_id` defaults to `tenant_slug`.
 */
export default async function handler(req, res) {
  const enabled = String(process.env.PROVISIONING_ENABLED || 'false').toLowerCase() === 'true';
  if (!enabled) {
    return res.status(501).json({
      error: 'PROVISIONING_DISABLED',
      hint: 'Set PROVISIONING_ENABLED=true to allow POST /api/provision (factory master auth required).',
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  if (!verifyFactoryMasterAuth(req)) {
    return res.status(403).json({ error: 'Factory master authentication required.' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const tenant_slug = String(body.tenant_slug || body.slug || '').trim();
  const tenant_name = String(body.tenant_name || body.name || tenant_slug).trim();
  const tenant_id = String(body.tenant_id || body.tenantId || tenant_slug).trim();

  if (!tenant_slug || !tenant_id) {
    return res.status(400).json({ error: 'tenant_slug (and optional tenant_id) required' });
  }

  try {
    const existing = await prisma.tenant.findFirst({
      where: { OR: [{ tenantId: tenant_id }, { slug: tenant_slug }] },
    });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Tenant already exists.',
        tenant: {
          id: existing.id,
          tenant_id: existing.tenantId,
          slug: existing.slug,
          name: existing.name,
        },
      });
    }

    const tenant = await prisma.tenant.create({
      data: {
        tenantId: tenant_id,
        slug: tenant_slug,
        name: tenant_name || tenant_slug,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Tenant ${tenant.name} registered in Postgres.`,
      tenant: { id: tenant.id, tenant_id: tenant.tenantId, slug: tenant.slug, name: tenant.name },
    });
  } catch (error) {
    emitLogicFailure({
      source: 'api/provision.js',
      severity: 'fatal',
      error,
      cmp: { ticket_id: 'n/a', action: 'provision' },
      recommended_action: 'Verify POSTGRES_URL and Prisma schema (tenants table).',
    });
    console.error('PROVISIONING ERROR:', error);
    return res.status(500).json({ error: 'Provisioning failed', detail: String(error?.message || error) });
  } finally {
    await prisma.$disconnect();
  }
}
