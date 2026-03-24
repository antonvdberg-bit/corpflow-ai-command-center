import { config } from './config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { name, email, intent } = req.body;

  const token = process.env.BASEROW_TOKEN || "6nwWBzUldde74Hww59wC0gKCFdZyxHy9";

  try {
    const targetUrl = `${config.baserowDomain}/api/database/rows/table/${config.baserowTableId}/?user_field_names=true`;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 
        'Authorization': `Token ${token}`, 
        'Content-Type': 'application/json' 
      },
      // Using the exact field names from your documentation
      body: JSON.stringify({ 
        "Name": name, 
        "Email": email, 
        "Notes": intent,
        "Active": true 
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Baserow Error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return res.status(200).json({ 
      status: "SUCCESS", 
      message: "Lead Created in Leads Table (754)",
      row_id: result.id 
    });
  } catch (error) {
    return res.status(500).json({ status: "FAILED", detail: error.message });
  }
}
