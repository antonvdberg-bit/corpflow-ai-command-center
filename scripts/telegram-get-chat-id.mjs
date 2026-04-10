#!/usr/bin/env node
/**
 * Prints chat_ids seen by your bot (from Telegram getUpdates).
 *
 * Usage (PowerShell):
 *   $env:TELEGRAM_BOT_TOKEN="123:abc"
 *   node scripts/telegram-get-chat-id.mjs
 *
 * Tip:
 * - Send any message to the bot (e.g. "hello") first so it appears in getUpdates.
 */

import './bootstrap-repo-env.mjs';

function str(v) {
  return v != null ? String(v).trim() : '';
}

const token = str(process.env.TELEGRAM_BOT_TOKEN);
if (!token) {
  console.error('Missing TELEGRAM_BOT_TOKEN.');
  process.exit(1);
}

try {
  const r = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j) {
    console.error(`Telegram API error (${r.status}).`);
    process.exit(1);
  }
  const res = Array.isArray(j.result) ? j.result : [];
  const chats = new Map();
  for (const u of res) {
    const m = u && typeof u === 'object' ? u.message || u.edited_message : null;
    const chat = m && typeof m === 'object' ? m.chat : null;
    const cid = chat && typeof chat === 'object' ? chat.id : null;
    const title =
      chat && typeof chat === 'object'
        ? str(chat.title) || str(chat.username) || str(chat.first_name) || str(chat.type)
        : '';
    if (cid != null) chats.set(String(cid), title || 'unknown');
  }
  const out = Array.from(chats.entries()).map(([chat_id, label]) => ({ chat_id, label }));
  console.log(JSON.stringify({ ok: true, chat_ids: out }, null, 2));
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
}

