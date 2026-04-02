import { PrismaClient } from '@prisma/client';

import { verifyFactoryMasterAuth } from './factory-master-auth.js';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (!verifyFactoryMasterAuth(req)) {
    return res.status(403).json({ error: 'Factory master authentication required.' });
  }

  try {
    const tenantIdRaw = req.query?.tenant_id || req.query?.tenantId || null;
    const tenantId = tenantIdRaw != null ? String(tenantIdRaw).trim() : '';

    const leads = await prisma.lead.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return res.status(200).json({ 
      success: true, 
      leads, 
      stats: {
        count: leads.length,
        tenant_id: tenantId || null,
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'FETCH_FAILED', details: error.message });
  } finally {
    await prisma.$disconnect();
  }
}
