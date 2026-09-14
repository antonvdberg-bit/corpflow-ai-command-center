/**
 * One-purpose internal runner for the synthetic Langfuse Lead Rescue pilot.
 *
 * This is deliberately NOT a general-purpose execution endpoint.
 * - POST only
 * - factory-admin session / existing master auth only
 * - core.corpflowai.com host only in production
 * - exact confirmation phrase required
 * - uses only existing LANGFUSE_* runtime environment values
 * - never returns or logs secret values
 * - no DB / ERPNext / ElevenLabs / client-data access
 */

import { verifyFactoryMasterAuth } from '../lib/server/factory-master-auth.js';

const CONFIRMATION = 'RUN_SYNTHETIC_LANGFUSE_PILOT';
const CORE_HOST = 'core.corpflowai.com';

function hostOf(req) {
  return String(req?.headers?.host || '')
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '');
}

function send(res, status, body) {
  res.setHeader?.('Cache-Control', 'no-store');
  res.setHeader?.('X-Robots-Tag', 'noindex');
  return res.status(status).json(body);
}

export function runtimeReadiness(env = process.env) {
  return {
    langfuse_base_url_configured: Boolean(String(env.LANGFUSE_BASE_URL || '').trim()),
    langfuse_public_key_configured: Boolean(String(env.LANGFUSE_PUBLIC_KEY || '').trim()),
    langfuse_secret_key_configured: Boolean(String(env.LANGFUSE_SECRET_KEY || '').trim()),
  };
}

export async function handleLangfuseSyntheticPilot(req, res, deps = {}) {
  const auth = deps.verifyFactoryMasterAuthImpl || verifyFactoryMasterAuth;
  const env = deps.env || process.env;
  const loadSender =
    deps.loadSender ||
    (async () => {
      const mod = await import('../scripts/langfuse-lead-rescue-pilot.mjs');
      return mod.sendSyntheticLeadRescuePilot;
    });

  if (req.method !== 'POST') {
    res.setHeader?.('Allow', 'POST');
    return send(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  if (!auth(req)) {
    return send(res, 401, { ok: false, error: 'UNAUTHORIZED' });
  }

  const host = hostOf(req);
  if (String(env.VERCEL_ENV || '').toLowerCase() === 'production' && host !== CORE_HOST) {
    return send(res, 403, { ok: false, error: 'CORE_HOST_REQUIRED' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  if (String(body.confirm || '') !== CONFIRMATION) {
    return send(res, 400, {
      ok: false,
      error: 'CONFIRMATION_REQUIRED',
      confirmation_required: CONFIRMATION,
    });
  }

  const readiness = runtimeReadiness(env);
  if (!Object.values(readiness).every(Boolean)) {
    return send(res, 503, {
      ok: false,
      error: 'LANGFUSE_RUNTIME_NOT_READY',
      readiness,
    });
  }

  try {
    const sendSyntheticLeadRescuePilot = await loadSender();
    const result = await sendSyntheticLeadRescuePilot({
      env: {
        LANGFUSE_BASE_URL: env.LANGFUSE_BASE_URL,
        LANGFUSE_PUBLIC_KEY: env.LANGFUSE_PUBLIC_KEY,
        LANGFUSE_SECRET_KEY: env.LANGFUSE_SECRET_KEY,
        CONFIRM_LANGFUSE_SYNTHETIC_PILOT: 'YES',
      },
    });

    return send(res, 200, {
      ok: true,
      pilot: 'langfuse-lead-rescue-synthetic',
      trace_id: result.traceId,
      generation_span_id: result.generationSpanId,
      trace_accepted: result.traceAccepted === true,
      automated_score_accepted: result.automatedScoreAccepted === true,
      human_review_required: result.humanReviewRequired === true,
      credentials_exposed: false,
      client_data_used: false,
      production_data_changed: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return send(res, 502, {
      ok: false,
      error: 'LANGFUSE_SYNTHETIC_PILOT_FAILED',
      message,
      credentials_exposed: false,
    });
  }
}

export default async function handler(req, res) {
  return handleLangfuseSyntheticPilot(req, res);
}
