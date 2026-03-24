import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { name, email, intent } = req.body;

  try {
    // 1. INTELLIGENCE VETTING (GROQ - Mar 18 Hardware)
    let aiAnalysis = "Pending Analysis";
    try {
      const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama3-70b-8192",
          messages: [
            { role: "system", content: "You are the Elite Concierge for Luxe Maurice. Analyze lead intent for HNW real estate investment. Categorize as: HIGH_VALUE, WARM, or UNQUALIFIED. Provide 1 sentence justification." },
            { role: "user", content: `Lead Name: ${name}. Intent: ${intent}` }
          ]
        })
      });
      const groqData = await groqResponse.json();
      aiAnalysis = groqData.choices[0]?.message?.content || "Analysis Failed";
    } catch (aiErr) {
      console.error("AI Vetting Offline:", aiErr.message);
    }

    // 2. SOVEREIGN STORAGE (Postgres - Mar 21 Hardware)
    const lead = await prisma.lead.create({
      data: { name, email, intent, status: 'VETTED' }
    });

    // 3. MASTER SYNC (Baserow - Mar 18 Hardware)
    const baseUrl = process.env.BASEROW_URL.startsWith('http') ? process.env.BASEROW_URL : `https://${process.env.BASEROW_URL}`;
    await fetch(`${baseUrl}/api/database/rows/table/${process.env.BASEROW_TABLE_ID}/?user_field_names=true`, {
      method: 'POST',
      headers: { 
        'Authorization': `Token ${process.env.BASEROW_TOKEN}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        "Name": name, 
        "Email": email, 
        "Notes": intent,
        "AI_Analysis": aiAnalysis // Now pushing the AI Intelligence into your CRM
      })
    });

    return res.status(200).json({ success: true, classification: aiAnalysis });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    await prisma.$disconnect();
  }
}
