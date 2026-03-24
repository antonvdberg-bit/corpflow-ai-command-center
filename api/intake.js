import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send();
  const { name, email, intent } = req.body;
  const baseUrl = process.env.BASEROW_URL?.startsWith('http') ? process.env.BASEROW_URL : `https://${process.env.BASEROW_URL}`;

  try {
    // A. SOVEREIGN STORAGE (Postgres)
    const lead = await prisma.lead.create({ data: { name, email, intent } });

    // B. MASTER SYNC (Baserow)
    await fetch(`${baseUrl}/api/database/rows/table/${process.env.BASEROW_TABLE_ID}/?user_field_names=true`, {
      method: 'POST',
      headers: { 'Authorization': `Token ${process.env.BASEROW_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ "Name": name, "Email": email, "Notes": intent, "Vault_ID": lead.id })
    });

    return res.status(200).json({ status: "Master Synchronization Active", id: lead.id });
  } catch (e) {
    return res.status(500).json({ error: "Sync Delayed: Saved to Vault", detail: e.message });
  } finally { await prisma.$disconnect(); }
}
