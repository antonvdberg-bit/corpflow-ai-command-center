import { config } from './config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { name, email, intent } = req.body;

  // Using the key we pulled from your Codespace earlier
  const token = process.env.BASEROW_TOKEN || "6nwWBzUldde74Hww59wC0gKCFdZyxHy9";

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

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ 
        status: "FAILED", 
        detail: `Baserow Rejected: ${response.status}`,
        message: errorText
      });
    }

    return res.status(200).json({ status: "SUCCESS", message: "LEAD RECORDED" });
  } catch (error) {
    return res.status(500).json({ status: "FAILED", detail: error.message });
  }
}
