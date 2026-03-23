import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  // We extract 'tenant_slug' to keep things future-proof for multi-tenancy,
  // but we default to the BASEROW_TABLE_ID you already have for Luxe Maurice.
  const { tenant_slug = 'luxe-maurice', name, email, intent } = req.body;

  try {
    // 1. MIRROR TO LOCAL VAULT (SQLite/Postgres)
    // This anchors the lead in your sovereign territory first.
    const localLead = await prisma.lead.create({
      data: {
        name,
        email,
        intent,
        status: 'MIRRORED'
      }
    });

    // 2. EXTERNAL SYNC (Using your March 18th Hardware)
    // We use the exact Table ID from your Vercel environment.
    await fetch(`${process.env.BASEROW_URL}/api/database/rows/table/${process.env.BASEROW_TABLE_ID}/?user_field_names=true`, {
      method: 'POST',
      headers: { 
        'Authorization': `Token ${process.env.BASEROW_TOKEN}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        "Name": name,
        "Email": email,
        "Notes": intent,
        "Source": "Luxe Maurice Hub"
      })
    });

    return res.status(200).json({ success: true, message: "Lead Synchronized" });
  } catch (error) {
    console.error("System Error:", error);
    return res.status(500).json({ error: "Mirroring Failed" });
  } finally {
    await prisma.$disconnect();
  }
}
