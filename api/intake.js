import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { name, email, intent } = req.body;
  const domain = email.split('@')[1];

  try {
    // 1. PHASE ONE: LOCAL MIRROR (Sovereign Database)
    // We record the lead in your local Postgres immediately.
    const localLead = await prisma.lead.create({
      data: {
        name,
        email,
        intent,
        source: 'Luxe Maurice Hub',
        status: 'MIRRORED_LOCAL'
      }
    });

    // 2. PHASE TWO: INTELLIGENCE (Groq Analysis)
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: "You are the Sovereign Intelligence Auditor. Analyze the prospect's intent and provide a strategic Dossier for the Mauritius Luxury market."
          },
          {
            role: "user",
            content: `Name: ${name} | Email: ${email} | Intent: ${intent}`
          }
        ]
      })
    });

    const groqData = await groqResponse.json();
    const dossier = groqData.choices[0].message.content;

    // 3. PHASE THREE: EXTERNAL SYNC (Baserow CRM)
    const baserowResponse = await fetch(`${process.env.BASEROW_URL}/api/database/rows/table/${process.env.BASEROW_TABLE_ID}/?user_field_names=true`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.BASEROW_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "Name": name,
        "Email": email,
        "Notes": intent,
        "Prospect_Dossier": dossier,
        "Status": "Vetted & Mirrored",
        "Source": "Luxe Maurice"
      })
    });

    // 4. PHASE FOUR: UPDATE LOCAL AUDIT
    await prisma.lead.update({
      where: { id: localLead.id },
      data: { status: 'SYNCED_TO_CRM' }
    });

    return res.status(200).json({ success: true, status: "Double-Entry Complete" });

  } catch (error) {
    console.error('Sovereign Protocol Failure:', error);
    return res.status(500).json({ error: 'Data Mirroring Interrupted' });
  } finally {
    await prisma.$disconnect();
  }
}
