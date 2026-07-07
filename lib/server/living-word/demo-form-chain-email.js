/**
 * Living Word TEST DEMO — Form 2 link email via existing n8n transactional path only.
 *
 * No new providers. No WhatsApp/SMS. Test/demo recipients only.
 */

import {
  resolveEmailFromAddress,
  resolveN8nEmailWebhookUrl,
  sendN8nTransactionalEmail,
} from '../email-delivery.js';
import {
  DEMO_LABEL,
  isAllowedDemoRecipient,
  LIVING_WORD_TENANT_ID,
  setLastBlockedEmailPreview,
} from './demo-form-chain.js';

const EMAIL_SUBJECT = `${DEMO_LABEL} Your second form is ready`;

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build n8n webhook payload for Form 2 link email. Pure — safe to unit test.
 *
 * @param {{
 *   email: string,
 *   firstName: string,
 *   form2Url: string,
 *   fromAddress: string,
 *   tenantId?: string,
 * }} args
 * @returns {Record<string, unknown>}
 */
export function buildDemoForm2EmailPayload(args) {
  const {
    email,
    firstName,
    form2Url,
    fromAddress,
    tenantId = LIVING_WORD_TENANT_ID,
  } = args;

  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  const text = [
    DEMO_LABEL,
    '',
    greeting,
    '',
    'Thank you for starting the Living Word Mauritius member update TEST DEMO.',
    'Your second form is ready — open the link below to continue:',
    '',
    form2Url,
    '',
    'This is a controlled TEST DEMO only. No real member records are updated.',
    'WhatsApp can replace this email step later once approved and unblocked.',
    '',
    '— Living Word Mauritius TEST DEMO (CorpFlow sandbox)',
  ].join('\n');

  const html = [
    `<p><strong>${escapeHtml(DEMO_LABEL)}</strong></p>`,
    `<p>${escapeHtml(greeting)}</p>`,
    `<p>Thank you for starting the Living Word Mauritius member update <strong>TEST DEMO</strong>.</p>`,
    `<p>Your second form is ready — <a href="${escapeHtml(form2Url)}">open Form 2 here</a>.</p>`,
    `<p style="font-size:13px;color:#555">This is a controlled TEST DEMO only. No real member records are updated.</p>`,
    `<p style="font-size:13px;color:#555">WhatsApp can replace this email step later once approved and unblocked.</p>`,
  ].join('');

  return {
    schema: 'corpflow.email.living_word_demo_form2.v1',
    purpose: 'living_word_demo_form2_link',
    event: 'living_word_demo_form2_ready',
    tenant_id: tenantId,
    to: email,
    email,
    from: fromAddress,
    subject: EMAIL_SUBJECT,
    text,
    html,
    form2_url: form2Url,
    test_demo: true,
    test_demo_label: DEMO_LABEL,
    no_whatsapp: true,
    no_sms: true,
    no_ghl: true,
    canonical_write: false,
  };
}

/**
 * Attempt delivery via existing n8n email path. Never throws.
 *
 * @param {{
 *   email: string,
 *   firstName: string,
 *   form2Url: string,
 *   fetchImpl?: typeof fetch,
 * }} args
 * @returns {Promise<{
 *   status: 'sent' | 'BLOCKED_PENDING_EXISTING_EMAIL_PATH' | 'demo_recipient_rejected',
 *   configured: boolean,
 *   attempted: boolean,
 *   ok: boolean,
 *   preview?: Record<string, unknown>,
 * }>}
 */
export async function deliverDemoForm2Email(args) {
  const { email, firstName, form2Url, fetchImpl } = args;

  if (!isAllowedDemoRecipient(email)) {
    return {
      status: 'demo_recipient_rejected',
      configured: Boolean(resolveN8nEmailWebhookUrl()),
      attempted: false,
      ok: false,
    };
  }

  const fromAddress = resolveEmailFromAddress();
  const payload = buildDemoForm2EmailPayload({
    email,
    firstName,
    form2Url,
    fromAddress,
  });

  const configured = Boolean(resolveN8nEmailWebhookUrl());
  if (!configured) {
    const preview = {
      status: 'BLOCKED_PENDING_EXISTING_EMAIL_PATH',
      subject: payload.subject,
      to: email,
      form2_url: form2Url,
      test_demo_label: DEMO_LABEL,
      text_preview: String(payload.text || '').slice(0, 500),
    };
    setLastBlockedEmailPreview(preview);
    return {
      status: 'BLOCKED_PENDING_EXISTING_EMAIL_PATH',
      configured: false,
      attempted: false,
      ok: false,
      preview,
    };
  }

  const result = await sendN8nTransactionalEmail(payload, { fetchImpl });
  if (!result.ok) {
    const preview = {
      status: 'BLOCKED_PENDING_EXISTING_EMAIL_PATH',
      subject: payload.subject,
      to: email,
      form2_url: form2Url,
      test_demo_label: DEMO_LABEL,
      delivery_error_kind: result.error_kind,
      http_status: result.status,
    };
    setLastBlockedEmailPreview(preview);
    return {
      status: 'BLOCKED_PENDING_EXISTING_EMAIL_PATH',
      configured: true,
      attempted: result.attempted,
      ok: false,
      preview,
    };
  }

  setLastBlockedEmailPreview(null);
  return {
    status: 'sent',
    configured: true,
    attempted: result.attempted,
    ok: true,
  };
}
