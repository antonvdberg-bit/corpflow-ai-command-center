export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { name, email, intent } = req.body;

  try {
    // DIRECT HANDSHAKE WITH BASEROW (Eliminating the Prisma dependency for now)
    const baseUrl = process.env.BASEROW_URL?.includes('http') ? process.env.BASEROW_URL : `https://api.baserow.io`;
    
    const response = await fetch(`${baseUrl}/api/database/rows/table/${process.env.BASEROW_TABLE_ID}/?user_field_names=true`, {
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
      const errorData = await response.json();
      throw new Error(`Baserow Error: ${JSON.stringify(errorData)}`);
    }

    return res.status(200).json({ status: "Sovereign Sync Active", message: "Lead captured in Baserow" });

  } catch (error) {
    console.error("Critical Failure:", error.message);
    return res.status(500).json({ error: "Sync Failed", detail: error.message });
  }
}
