export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { name, email, intent } = req.body;

  try {
    // HARD-CODED SOVEREIGN ENDPOINT
    const targetUrl = `https://api.baserow.io/api/database/rows/table/${process.env.BASEROW_TABLE_ID}/?user_field_names=true`;

    const response = await fetch(targetUrl, {
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
      throw new Error(`Baserow Error: ${response.status} - ${errorText}`);
    }

    return res.status(200).json({ status: "Sovereign Sync Active", message: "Success: Lead in Baserow" });

  } catch (error) {
    return res.status(500).json({ error: "Master Sync Failed", detail: error.message });
  }
}
