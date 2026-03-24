import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { name, email, intent } = req.body;

  // Clean URL Protocol to prevent "Fetch Failed"
  let cleanUrl = process.env.BASEROW_URL;
  if (!cleanUrl.startsWith('http')) cleanUrl = `https://${cleanUrl}`;

  try {
    // 1. Direct Vault Write (Postgres - Mar 21)
    const lead = await prisma.lead.create({
      data: { name, email, intent }
    });

    // 2. Direct Table Sync (Baserow - Mar 18)
    const response = await fetch(`${cleanUrl}/api/database/rows/table/${process.env.BASEROW_TABLE_ID}/?user_field_names=true`, {
      method: 'POST',
      headers: { 
        'Authorization': `Token ${process.env.BASEROW_TOKEN}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ "Name": name, "Email": email, "Notes": intent })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Baserow Error:", err);
      return res.status(200).json({ success: true, warning: "Saved to Vault only" });
    }

    return res.status(200).json({ success: true, message: "Master Sync Complete" });
  } catch (error) {
    console.error("Sync Error:", error.message);
    return res.status(500).json({ error: "System Reset Required" });
  } finally {
    await prisma.$disconnect();
  }
}
