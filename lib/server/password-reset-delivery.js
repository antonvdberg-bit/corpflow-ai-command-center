/**
 * Tenant password reset delivery: optional webhook (e.g. n8n → SMTP) and/or Resend API.
 *
 * Configure in Vercel — see `.env.template` § password reset and `docs/CORPFLOW_SHARED_TODO.md`.
 */

import { cfg } from './runtime-config.js';

/**
 * @param {import('http').IncomingMessage} req
 * @returns {string}
 */
export function inferPublicBaseUrl(req) {
  const explicit = String(cfg('CORPFLOW_PUBLIC_BASE_URL', '')).trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  try {
    const proto =
      String(req.headers['x-forwarded-proto'] || 'https')
        .split(',')[0]
        .trim() || 'https';
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '')
      .split(',')[0]
      .trim()
      .replace(/:\d+$/, '');
    if (host) return `${proto}://${host}`;
  } catch {
    /* ignore */
  }
  return '';
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {{
 *   req: import('http').IncomingMessage,
 *   tenantId: string,
 *   email: string,
 *   token: string,
 *   expiresAt: string,
 * }} opts
 * @returns {Promise<void>}
 */
export async function deliverPasswordResetNotification(opts) {
  const { req, tenantId, email, token, expiresAt } = opts;
  const base = inferPublicBaseUrl(req);
  const resetPath = `/login?reset_token=${encodeURIComponent(token)}`;
  const reset_url = base ? `${base}${resetPath}` : '';

  const payload = {
    event: 'tenant_password_reset_requested',
    tenant_id: tenantId,
    email,
    token,
    expires_at: expiresAt,
    reset_url: reset_url || null,
    reset_path: resetPath,
    public_base_url: base || null,
  };

  const hook = String(cfg('CORPFLOW_PASSWORD_RESET_WEBHOOK_URL', '')).trim();
  const hookSecret = String(cfg('CORPFLOW_PASSWORD_RESET_WEBHOOK_SECRET', '')).trim();
  if (hook) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (hookSecret) headers['x-corpflow-password-reset-secret'] = hookSecret;
      await fetch(hook, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    } catch {
      /* best-effort — do not block reset record creation */
    }
  }

  const resendKey = String(cfg('CORPFLOW_PASSWORD_RESET_RESEND_API_KEY', '')).trim();
  const fromEmail = String(cfg('CORPFLOW_PASSWORD_RESET_FROM_EMAIL', '')).trim();
  if (resendKey && fromEmail) {
    const ttl = String(cfg('CORPFLOW_PASSWORD_RESET_TTL_MIN', '30')).trim() || '30';
    const subject = `Reset your workspace password (${tenantId})`;
    const text = [
      `We received a request to reset the password for ${email} (workspace: ${tenantId}).`,
      reset_url
        ? `Open this link to choose a new password (link expires in about ${ttl} minutes):\n${reset_url}`
        : `On the login page, open "Forgot password?" and paste this one-time code:\n\n${token}`,
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n');
    const html = `<p>We received a request to reset the password for <strong>${escapeHtml(email)}</strong> (workspace: <strong>${escapeHtml(tenantId)}</strong>).</p>${
      reset_url
        ? `<p><a href="${escapeHtml(reset_url)}">Choose a new password</a></p><p>This link expires in about ${escapeHtml(ttl)} minutes.</p>`
        : `<p>Copy this one-time code into the login page (Forgot password):</p><pre style="word-break:break-all">${escapeHtml(token)}</pre>`
    }<p>If you did not request this, ignore this email.</p>`;

    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [email],
          subject,
          text,
          html,
        }),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        console.warn('[password-reset] Resend HTTP', r.status, String(t).slice(0, 300));
      }
    } catch (e) {
      console.warn('[password-reset] Resend error', e instanceof Error ? e.message : e);
    }
  }
}

/**
 * @returns {{ webhook: boolean, resend: boolean, public_base_configured: boolean }}
 */
export function passwordResetDeliveryDiagnostics() {
  return {
    webhook: Boolean(String(cfg('CORPFLOW_PASSWORD_RESET_WEBHOOK_URL', '')).trim()),
    webhook_secret_configured: Boolean(String(cfg('CORPFLOW_PASSWORD_RESET_WEBHOOK_SECRET', '')).trim()),
    resend: Boolean(
      String(cfg('CORPFLOW_PASSWORD_RESET_RESEND_API_KEY', '')).trim() &&
        String(cfg('CORPFLOW_PASSWORD_RESET_FROM_EMAIL', '')).trim(),
    ),
    public_base_configured: Boolean(
      String(cfg('CORPFLOW_PUBLIC_BASE_URL', '')).trim() ||
        String(cfg('CORPFLOW_ROOT_DOMAIN', '')).trim(),
    ),
    debug_token_return_enabled:
      String(cfg('CORPFLOW_PASSWORD_RESET_DEBUG_RETURN_TOKEN', 'false')).toLowerCase() === 'true',
  };
}
