import { emitLogicFailure } from './cmp/_lib/telemetry.js';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { message } = req.body;
    if (message && message.text === '.') {
      const responseText = "🛡️ **SENTRY STATUS:** Online\n📍 **LOCATION:** Mauritius\n💎 **CLASS:** Sovereign\n\n*Infrastructure Sync Complete.*";
      
      try {
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: message.chat.id, text: responseText, parse_mode: 'Markdown' })
        });
      } catch (e) {
        console.error('Telegram Fetch Error:', e);
        emitLogicFailure({
          source: 'api/webhook.js:telegram-send',
          severity: 'warning',
          error: e,
          cmp: { ticket_id: 'n/a', action: 'webhook' },
          recommended_action: 'Verify TELEGRAM_BOT_TOKEN and webhook payload format.',
        });
      }
    }
    return res.status(200).send('OK');
  }
  return res.status(405).send('Method Not Allowed');
}
