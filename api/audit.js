import { PrismaClient } from '@prisma/client'
import { Resend } from 'resend'

const prisma = new PrismaClient()
const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, hours } = req.body;
  const leakAmount = hours * 52 * 150; 

  try {
    // 1. Persist to Postgres
    await prisma.lead.create({
      data: { 
        email, 
        hours: parseInt(hours), 
        gapScore: leakAmount 
      }
    });

    // 2. Dispatch Formal Diagnostic Email via Resend
    await resend.emails.send({
      from: 'Intelligence <analysis@corpflowai.com>',
      to: email,
      subject: `[DIAGNOSTIC]: $${leakAmount.toLocaleString()} Revenue Leak Identified`,
      html: `
        <div style="font-family: sans-serif; background: #050505; color: #fff; padding: 40px; border: 1px solid #333;">
          <h2 style="text-transform: uppercase; letter-spacing: 2px; color: #FF5733;">Audit Complete</h2>
          <p style="color: #888;">System analysis for <strong>${email}</strong></p>
          <div style="font-size: 48px; font-weight: bold; margin: 20px 0;">
            $${leakAmount.toLocaleString()}
          </div>
          <p>This figure represents your estimated annual operational friction due to resource gaps.</p>
          <hr style="border-color: #222;" />
          <p style="font-size: 12px; color: #555;">To recover these funds via Autonomous Systems, reply to this email or join the Secure Enclave on Telegram.</p>
        </div>
      `
    });

    return res.status(200).json({ success: true, leak: leakAmount });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'ROUTING_FAILED', details: error.message });
  } finally {
    await prisma.$disconnect();
  }
}
