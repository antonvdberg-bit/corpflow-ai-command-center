import { PrismaClient } from '@prisma/client'

// Use a global variable to prevent multiple Prisma instances in development
const prisma = global.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') global.prisma = prisma

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  const { email, hours, revenue } = req.body;

  try {
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
    return res.status(500).json({ 
      error: 'HANDSHAKE_FAILED', 
      msg: error.message,
      code: error.code 
    });
  }
}
