export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { message } = req.body;
    if (message && message.text === '.') {
      const responseText = "🛡️ **SENTRY STATUS:** Online\n📍 **LOCATION:** Mauritius\n💎 **CLASS:** Sovereign\n\n*Infrastructure Sync Complete.*";
      
      // Sending the reply back to you
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: message.chat.id, text: responseText, parse_mode: 'Markdown' })
      });
    }
    return res.status(200).send('OK');
  }
  return res.status(405).send('Method Not Allowed');
}
