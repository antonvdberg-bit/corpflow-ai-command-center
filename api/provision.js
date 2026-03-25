import { PrismaClient } from '@prisma/client';
import { emitLogicFailure } from './cmp/_lib/telemetry.js';
const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  const { tenant_slug, tenant_name } = req.body;

  try {
    // 1. SOVEREIGN CHECK: Does this tenant exist in our Vault?
    let tenant = await prisma.tenant.findUnique({ where: { slug: tenant_slug } });

    if (!tenant) {
      console.log(`PROVISIONING: Creating isolated environment for ${tenant_name}`);
      
      // 2. AUTO-PROVISION: Create the Table in Baserow without manual IDs
      const response = await fetch(`${process.env.BASEROW_URL}/api/database/tables/database/${process.env.BASEROW_DB_ID}/`, {
        method: 'POST',
        headers: { 
          'Authorization': `Token ${process.env.BASEROW_TOKEN}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ name: `${tenant_name} Leads` })
      });
      
      const table = await response.json();
      if (!table.id) throw new Error("Baserow Provisioning Failed");

      // 3. REGISTER: Anchor the new Table ID into our Sovereign Vault
      tenant = await prisma.tenant.create({
        data: {
          slug: tenant_slug,
          name: tenant_name,
          baserowTableId: table.id.toString(),
          aiSystemPrompt: `You are the Elite Concierge for ${tenant_name}. Your mission is high-net-worth vetting and luxury market analysis.`
        }
      });
    }

    return res.status(200).json({ success: true, message: `Space for ${tenant.name} is Live.`, id: tenant.baserowTableId });
  } catch (error) {
    emitLogicFailure({
      source: 'api/provision.js',
      severity: 'fatal',
      error,
      cmp: { ticket_id: 'n/a', action: 'provision' },
      recommended_action: 'Verify BASEROW_URL/BASEROW_TOKEN/BASEROW_DB_ID and ensure tenant slug exists in Prisma.',
    });
    console.error("PROVISIONING ERROR:", error);
    return res.status(500).json({ error: "Autonomous Provisioning Failed" });
  } finally {
    await prisma.$disconnect();
  }
}
