export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { name, email, intent } = req.body;

  try {
    // 1. URL SANITIZER: Force HTTPS and clean the endpoint
    let rawUrl = process.env.BASEROW_URL || 'api.baserow.io';
    if (!rawUrl.startsWith('http')) rawUrl = `https://${rawUrl}`;
    const cleanUrl = rawUrl.replace(/\/$/, ""); // Remove trailing slash if exists

    // 2. THE HANDSHAKE
    const response = await fetch(`${cleanUrl}/api/database/rows/table/${process.env.BASEROW_TABLE_ID}/?user_field_names=true`, {
      method: 'POST',
      headers: { 
        'Authorization': `Token ${process.env.BASEROW_TOKEN}`, 
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
      throw new Error(`Baserow Rejected: ${response.status} - ${errorText}`);
    }

    return res.status(200).json({ status: "Sovereign Sync Active", message: "Lead Recorded" });

  } catch (error) {
    return res.status(500).json({ error: "Sync Failed", detail: error.message });
  }
}
