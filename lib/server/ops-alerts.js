import { cfg } from './runtime-config.js';
import { forwardAutomationEnvelope } from '../automation/forward.js';
import { emitLogicFailure } from '../cmp/_lib/telemetry.js';

function str(v) {
  return v != null ? String(v).trim() : '';
}

/**
 * Send an ops alert to Telegram (best-effort).
 *
 * Env:
 * - TELEGRAM_BOT_TOKEN
 * - TELEGRAM_ALERT_CHAT_ID
 *
 * @param {{ text: string }} input
 * @returns {Promise<void>}
 */
export async function sendTelegramOpsAlert(input) {
  const token = str(cfg('TELEGRAM_BOT_TOKEN', '') || process.env.TELEGRAM_BOT_TOKEN || '');
  const chatId = str(cfg('TELEGRAM_ALERT_CHAT_ID', '') || process.env.TELEGRAM_ALERT_CHAT_ID || '');
  const text = str(input && input.text);
  if (!token || !chatId || !text) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 3500) }),
    });
  } catch (e) {
    emitLogicFailure({
      source: 'lib/server/ops-alerts.js:telegram',
      severity: 'warning',
      error: e,
      cmp: { ticket_id: 'n/a', action: 'ops-alert' },
      recommended_action: 'Verify TELEGRAM_BOT_TOKEN and TELEGRAM_ALERT_CHAT_ID.',
    });
  }
}

/**
 * Forward an ops alert to n8n via the automation forward URL (best-effort).
 * n8n is responsible for email delivery (e.g. antonvdberg@corpflowai.com) and any other channels.
 *
 * @param {{ tenant_id?: string|null, ticket_id?: string|null, kind: string, title: string, message: string, meta?: Record<string, unknown> }} input
 * @returns {Promise<void>}
 */
export async function forwardOpsAlert(input) {
  const kind = str(input && input.kind);
  const title = str(input && input.title);
  const message = str(input && input.message);
  if (!kind || !title || !message) return;
  await forwardAutomationEnvelope({
    envelope: 'corpflow.ops_alert.v1',
    at: new Date().toISOString(),
    kind,
    title,
    message,
    tenant_id: input && input.tenant_id != null ? str(input.tenant_id) : null,
    ticket_id: input && input.ticket_id != null ? str(input.ticket_id) : null,
    meta: input && input.meta && typeof input.meta === 'object' ? input.meta : {},
  });
}

