export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { name, email, intent } = req.body;

  try {
    const response = await fetch(`${process.env.BASEROW_URL}/api/database/rows/table/${process.env.BASEROW_TABLE_ID}/?user_field_names=true`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.BASEROW_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "Name": name,
        "Email": email,
        "Notes": intent,
        "Status": "New Inquiry",
        "Source": "Luxe Maurice"
      })
    });

    const result = await response.json();

    if (response.ok) {
      return res.status(200).json({ success: true, id: result.id });
    } else {
      console.error('Baserow Error:', result);
      return res.status(500).json({ error: 'Baserow rejection', details: result });
    }
  } catch (error) {
    console.error('System Error:', error);
    return res.status(500).json({ error: 'Internal Connection Failure' });
  }
}
