import { PrismaClient } from '@prisma/client'

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { email, hours, revenue } = req.body;

  try {
    // Attempt the write
    const newLead = await prisma.lead.create({
      data: {
        email: email,
        revenueRange: revenue || 'HAA_AUDIT',
        manualHours: parseInt(hours) || 0,
        gapScore: (parseInt(hours) || 0) * 52 * 150
      }
    });

    return res.status(200).json({ success: true, lead: newLead });
  } catch (error) {
    console.error("Prisma Error:", error);
    // If it's a unique constraint error (P2002), they already exist in the DB
    if (error.code === 'P2002') {
      return res.status(200).json({ success: true, note: 'Lead already exists, but that is a win.' });
    }
    return res.status(500).json({ error: 'DATABASE_TIMEOUT', msg: error.message });
  }
  // Note: We REMOVED prisma.() here. 
  // In serverless, it's actually better to let the connection persist for the next warm hit.
}
