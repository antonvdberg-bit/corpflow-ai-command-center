import { config } from './config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { name, email, intent } = req.body;

  const token = process.env.BASEROW_TOKEN || "6nwWBzUldde74Hww59wC0gKCFdZyxHy9";
  const tableId = "756";
  
  // PRIMARY: Your Private CRM | SECONDARY: Baserow Cloud
  const endpoints = [
    `https://crm.corpflowai.com/api/database/rows/table/${tableId}/?user_field_names=true`,
    `https://api.baserow.io/api/database/rows/table/${tableId}/?user_field_names=true`
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Authorization': `Token ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ "Name": name, "Email": email, "Notes": intent })
      });

      if (response.ok) {
        return res.status(200).json({ 
          status: "SUCCESS", 
          message: `Lead Locked via ${new URL(url).hostname}` 
        });
      }
    } catch (e) {
      // Continue to next endpoint if one fails
      continue;
    }
  }

  return res.status(401).json({ 
    status: "FAILED", 
    detail: "Authentication Denied: Please check if Token 6nwW... is active in your Baserow Settings." 
  });
}
