import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { name, email, intent } = req.body;

  try {
    // 1. SYNC TO BASEROW (The Primary Mission)
    const response = await fetch(`${process.env.BASEROW_URL}/api/database/rows/table/${process.env.BASEROW_TABLE_ID}/?user_field_names=true`, {
      method: 'POST',
      headers: { 
        'Authorization': `Token ${process.env.BASEROW_TOKEN}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ "Name": name, "Email": email, "Notes": intent })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Baserow Rejected: ${errorText}`);
    }

    // 2. BACKGROUND MIRROR TO POSTGRES
    // We don't 'await' this so that local connection issues don't stop the lead.
    prisma.lead.create({
      data: { name, email, intent, status: 'CLOUD_MIRROR' }
    }).catch(err => console.error("Postgres Mirroring Bypass:", err.message));

    return res.status(200).json({ success: true, message: "Lead Captured" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    await prisma.$disconnect();
  }
}
