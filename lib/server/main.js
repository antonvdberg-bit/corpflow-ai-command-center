import { getN8nWebhookUrl } from './config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { name, email, intent } = req.body;

  const n8nWebhookUrl = getN8nWebhookUrl();
  if (!n8nWebhookUrl) {
    return res.status(503).json({
      status: 'FAILED',
      detail: 'N8N_WEBHOOK_URL is not configured. Set it in Vercel or .env.',
    });
  }

  try {
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, intent, source: "Command Center API" })
    });

    if (!response.ok) throw new Error(`n8n rejected: ${response.status}`);

    return res.status(200).json({ 
      status: "SUCCESS", 
      message: "Lead handed off to n8n for Processing & AI Vetting" 
    });
  } catch (error) {
    return res.status(500).json({ status: "FAILED", detail: error.message });
  }
}
