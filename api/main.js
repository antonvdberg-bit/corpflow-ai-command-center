import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { name, email, intent } = req.body;
  try {
    const entry = await prisma.lead.create({
      data: { name, email, intent, status: 'MASTER_SYNC' }
    });
    const baseUrl = process.env.BASEROW_URL?.includes('http') ? process.env.BASEROW_URL : `https://api.baserow.io`;
    await fetch(`${baseUrl}/api/database/rows/table/${process.env.BASEROW_TABLE_ID}/?user_field_names=true`, {
      method: 'POST',
      headers: { 'Authorization': `Token ${process.env.BASEROW_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ "Name": name, "Email": email, "Notes": intent })
    });
    return res.status(200).json({ status: "Sovereign Sync Active", id: entry.id });
  } catch (error) {
    return res.status(200).json({ status: "Emergency Sync", message: "Data received" });
  } finally {
    await prisma.$disconnect();
  }
}
