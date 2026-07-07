/**
 * Living Word — TEST DEMO form chain HTTP handlers.
 *
 * Public TEST DEMO routes (no factory admin). In-memory only; no GHL/WhatsApp/SMS/DB writes.
 *
 *   GET  tenant/living-word/demo-form-chain/status
 *   POST tenant/living-word/demo-form-chain/form-1
 *   GET  tenant/living-word/demo-form-chain/form-2-session?token=
 *   POST tenant/living-word/demo-form-chain/form-2
 */

import { inferPublicBaseUrl } from '../password-reset-delivery.js';
import { resolveN8nEmailWebhookUrl } from '../email-delivery.js';
import { deliverDemoForm2Email } from './demo-form-chain-email.js';
import {
  attachForm2ToSession,
  buildForm2Path,
  buildForm2Url,
  computeDemoChainVerdict,
  createForm1Session,
  DEMO_HUB_ROUTE,
  DEMO_LABEL,
  FORM1_ROUTE,
  FORM2_ROUTE,
  FORM_CHAIN_SOURCE,
  getActiveSessionCount,
  getLastBlockedEmailPreview,
  getSessionByToken,
  LOGO_PATH,
  LIVING_WORD_TENANT_ID,
  markSessionEmailStatus,
  validateForm1Body,
  validateForm2Body,
} from './demo-form-chain.js';

const SAFETY = Object.freeze({
  test_demo: true,
  canonical_write: false,
  ghl_write: false,
  whatsapp: false,
  sms: false,
  public_launch: false,
  db_persistence: false,
});

function demoNotice() {
  return {
    label: DEMO_LABEL,
    tenant_id: LIVING_WORD_TENANT_ID,
    source: FORM_CHAIN_SOURCE,
    ...SAFETY,
  };
}

/** GET — demo status panel data. */
export function demoFormChainStatusHandler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const emailConfigured = Boolean(resolveN8nEmailWebhookUrl());
  const blockedPreview = getLastBlockedEmailPreview();
  const emailBlocked = Boolean(blockedPreview);
  const base = inferPublicBaseUrl(req);

  const verdict = computeDemoChainVerdict({
    emailConfigured,
    emailOk: emailConfigured && !emailBlocked,
    emailBlocked: !emailConfigured || emailBlocked,
    sessionCount: getActiveSessionCount(),
  });

  return res.status(200).json({
    ok: true,
    ...demoNotice(),
    demo_chain_verdict: verdict,
    routes: {
      demo_hub: DEMO_HUB_ROUTE,
      form_1: FORM1_ROUTE,
      form_2: FORM2_ROUTE,
      form_2_behavior: 'Tokenized link from Form 1 submit or TEST DEMO email',
    },
    email_behavior: {
      path: 'existing_n8n_transactional',
      configured: emailConfigured,
      subject: `${DEMO_LABEL} Your second form is ready`,
      blocked_preview: blockedPreview,
      whatsapp_excluded: true,
      sms_excluded: true,
    },
    branding: {
      logo_path: LOGO_PATH,
      logo_present: true,
      test_demo_ribbon: true,
    },
    fields: {
      form_1_complete: true,
      form_2_complete: true,
    },
    chatbot: {
      visible_on_demo_hub: true,
      loader: '/api/chat-widget/loader.js',
    },
    live_url_checks: [
      `${base || 'https://living-word-mauritius.corpflowai.com'}${DEMO_HUB_ROUTE}`,
      `${base || 'https://living-word-mauritius.corpflowai.com'}${FORM1_ROUTE}`,
      `${base || 'https://living-word-mauritius.corpflowai.com'}${FORM2_ROUTE}?token=<from-form-1>`,
    ],
    active_sessions: getActiveSessionCount(),
    need_anton_approval: verdict === 'BLOCKED' ? ['Configure N8N_EMAIL_WEBHOOK_URL for live email send'] : [],
  });
}

/** POST — Form 1 submit → unlock Form 2 + send TEST DEMO email. */
export async function demoFormChainForm1Handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const validated = validateForm1Body(req.body);
  if (!validated.ok) {
    return res.status(400).json({ ok: false, ...validated, ...demoNotice() });
  }

  const { token, session } = createForm1Session(validated.data);
  const base = inferPublicBaseUrl(req);
  const form2_path = buildForm2Path(token);
  const form2_url = buildForm2Url(base, token);

  const emailResult = await deliverDemoForm2Email({
    email: validated.data.email,
    firstName: validated.data.first_name,
    form2Url: form2_url,
  });

  markSessionEmailStatus(token, emailResult.status);

  return res.status(200).json({
    ok: true,
    ...demoNotice(),
    token,
    form2_path,
    form2_url,
    form2_unlocked: true,
    email: {
      status: emailResult.status,
      configured: emailResult.configured,
      attempted: emailResult.attempted,
      ok: emailResult.ok,
      preview: emailResult.preview || null,
    },
    review_required: true,
    session_created_at: session.createdAt,
  });
}

/** GET — load Form 2 session prefill by token. */
export function demoFormChainForm2SessionHandler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const token = String(req.query?.token || '').trim();
  const session = getSessionByToken(token);
  if (!session) {
    return res.status(404).json({ ok: false, error: 'invalid_or_expired_token', ...demoNotice() });
  }

  const form1 = session.form1 || {};
  return res.status(200).json({
    ok: true,
    ...demoNotice(),
    token,
    prefill: {
      email_confirm: form1.email || '',
      first_name: form1.first_name || '',
      last_name: form1.last_name || '',
      phone: form1.phone || '',
      member_type: form1.member_type || '',
      whatsapp_number: form1.phone || '',
    },
    form2_completed: Boolean(session.form2),
    email_status: session.emailStatus,
  });
}

/** POST — Form 2 submit (review payload only). */
export function demoFormChainForm2Handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const token = String(body.token || '').trim();
  const session = getSessionByToken(token);
  if (!session) {
    return res.status(404).json({ ok: false, error: 'invalid_or_expired_token', ...demoNotice() });
  }

  const validated = validateForm2Body(body);
  if (!validated.ok) {
    return res.status(400).json({ ok: false, ...validated, ...demoNotice() });
  }

  const form1Email = String(session.form1?.email || '').toLowerCase();
  if (validated.data.email_confirm !== form1Email) {
    return res.status(400).json({
      ok: false,
      error: 'email_mismatch',
      field: 'email_confirm',
      ...demoNotice(),
    });
  }

  attachForm2ToSession(token, validated.data, session.emailStatus);

  return res.status(200).json({
    ok: true,
    ...demoNotice(),
    review_required: true,
    form1: session.form1,
    form2: validated.data,
    email_status: session.emailStatus,
    message: `${DEMO_LABEL} Form 2 received — operator review only; no canonical write.`,
  });
}
