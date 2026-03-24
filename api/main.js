import { config } from './config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { name, email, intent } = req.body;

  // We are using the Cloud Token here. 
  // Ensure you have added the BASEROW_TOKEN to Vercel for this new Workspace!
  const token = process.env.BASEROW_TOKEN;

  try {
    const targetUrl = `${config.baserowDomain}/api/database/rows/table/${config.baserowTableId}/?user_field_names=true`;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 
        'Authorization': `Token ${token}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        "Name": name, 
        "Email": email, 
        "Notes": intent 
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ 
        status: "SCHEMA_MISMATCH", 
        detail: "Connected to Cloud, but fields might differ.",
        available_fields: result
      });
    }

    return res.status(200).json({ status: "SUCCESS", message: "LEAD CAPTURED IN CLOUD" });
  } catch (error) {
    return res.status(500).json({ status: "FAILED", detail: error.message });
  }
}
