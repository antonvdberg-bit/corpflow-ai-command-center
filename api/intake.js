import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { name, email, intent } = req.body;

  try {
    // 1. ATTEMPT LOCAL MIRROR (SQLite)
    await prisma.lead.create({
      data: { name, email, intent, status: 'MIRRORED' }
    }).catch(e => { throw new Error(`SQLite Mirror Failure: ${e.message}`) });

    // 2. ATTEMPT BASEROW SYNC (Using Mar 18th/21st Hardware)
    const response = await fetch(`${process.env.BASEROW_URL}/api/database/rows/table/${process.env.BASEROW_TABLE_ID}/?user_field_names=true`, {
      method: 'POST',
      headers: { 
        'Authorization': `Token ${process.env.BASEROW_TOKEN}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ "Name": name, "Email": email, "Notes": intent })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Baserow Rejected: ${JSON.stringify(errorData)}`);
    }

    return res.status(200).json({ success: true, message: "Handshake Verified" });
  } catch (error) {
    // We return the EXACT error message to the terminal now
    return res.status(500).json({ error: error.message });
  } finally {
    await prisma.$disconnect();
  }
}
