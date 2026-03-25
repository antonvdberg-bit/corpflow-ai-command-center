import { config } from './config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { name, email, intent } = req.body;

  try {
    // We send the data to n8n. No Baserow tokens needed here!
    const response = await fetch(config.n8nWebhookUrl, {
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
