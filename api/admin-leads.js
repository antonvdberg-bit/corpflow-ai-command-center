import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export default async function handler(req, res) {
  // In production, you'd add a password check here. 
  // For now, it's open for your 'Morning Sprint' testing.
  
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const totalLeak = leads.reduce((acc, lead) => acc + (lead.gapScore || 0), 0);

    return res.status(200).json({ 
      success: true, 
      leads, 
      stats: {
        count: leads.length,
        totalLeak: totalLeak
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'FETCH_FAILED', details: error.message });
  } finally {
    await prisma.$disconnect();
  }
}
