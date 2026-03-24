export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { name, email, intent } = req.body;

  const token = process.env.BASEROW_TOKEN;
  const tableId = process.env.BASEROW_TABLE_ID;

  if (!token || !tableId) {
    return res.status(500).json({ error: "Missing Environment Keys", detail: "Check Vercel Variables" });
  }

  try {
    const targetUrl = `https://api.baserow.io/api/database/rows/table/${tableId}/?user_field_names=true`;

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

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Baserow: ${response.status} - ${data.detail || JSON.stringify(data)}`);
    }

    return res.status(200).json({ status: "Sovereign Sync Active", message: "Success: Lead in Baserow" });

  } catch (error) {
    return res.status(500).json({ error: "Master Sync Failed", detail: error.message });
  }
}
