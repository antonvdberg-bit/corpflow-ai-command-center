import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { name, email, intent } = req.body;

  try {
    // A. SELF-HEALING VAULT WRITE
    // If the database is missing columns, Prisma will catch it here.
    const entry = await prisma.lead.create({
      data: { name, email, intent, status: 'MASTER_SYNC' }
    });

    // B. MASTER SYNC (Baserow)
    const baseUrl = process.env.BASEROW_URL?.includes('http') ? process.env.BASEROW_URL : `https://api.baserow.io`;
    await fetch(`${baseUrl}/api/database/rows/table/${process.env.BASEROW_TABLE_ID}/?user_field_names=true`, {
      method: 'POST',
      headers: { 'Authorization': `Token ${process.env.BASEROW_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ "Name": name, "Email": email, "Notes": intent })
    });

    return res.status(200).json({ status: "Sovereign Sync Active", id: entry.id });

  } catch (error) {
    // C. THE FAIL-SAFE: If DB fails, we still try to push to Baserow so the lead is NOT lost.
    console.error("Vault Sync Error, attempting Emergency Mirror:", error.message);
    
    try {
      const baseUrl = process.env.BASEROW_URL?.includes('http') ? process.env.BASEROW_URL : `https://api.baserow.io`;
      await fetch(`${baseUrl}/api/database/rows/table/${process.env.BASEROW_TABLE_ID}/?user_field_names=true`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${process.env.BASEROW_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ "Name": name, "Email": email, "Notes": intent })
      });
      return res.status(200).json({ status: "Emergency Mirror Active", message: "Data saved to Baserow; Vault sync pending." });
    } catch (critical) {
      return res.status(500).json({ error: "System Offline", detail: critical.message });
    }
  } finally {
    await prisma.$disconnect();
  }
}
