import { config } from './config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { name, email, intent } = req.body;

  try {
    const targetUrl = `${config.baserowDomain}/api/database/rows/table/${config.baserowTableId}/?user_field_names=true`;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 
        'Authorization': `Token ${config.baserowToken}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ "Name": name, "Email": email, "Notes": intent })
    });

    if (!response.ok) throw new Error(`CRM rejected request: ${response.status}`);

    return res.status(200).json({ status: "SUCCESS", message: "Infrastructure Synchronized" });
  } catch (error) {
    return res.status(500).json({ status: "FAILED", detail: error.message });
  }
}
