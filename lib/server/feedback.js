export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { item, note } = req.body;
        // This is where the AI 'logs' your request internally
        return res.status(200).json({ 
            status: 'Processing', 
            id: Math.floor(Math.random() * 9000) + 1000,
            received: true 
        });
    }
    res.status(405).json({ message: 'Method not allowed' });
}
