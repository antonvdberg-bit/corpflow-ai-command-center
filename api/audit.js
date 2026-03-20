import { PrismaClient } from '@prisma/client'

// Fallback logic to find the connection string regardless of naming
const connectionString = process.env.POSTGRES_PRISMA_URL || 
                         process.env.PRISMA_DATABASE_URL || 
                         process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionString,
    },
  },
})

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { email, hours, revenue } = req.body;

  try {
    const newLead = await prisma.lead.create({
      data: {
        email: email,
        revenueRange: revenue,
        manualHours: parseInt(hours) || 0,
        gapScore: (parseInt(hours) || 0) * 52 * 150
      }
    });
    return res.status(200).json({ success: true, lead: newLead });
  } catch (error) {
    return res.status(500).json({ 
      error: 'HANDSHAKE_FAILED', 
      details: error.message,
      has_url: !!connectionString 
    });
  } finally {
    await prisma.$disconnect();
  }
}
