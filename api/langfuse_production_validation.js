/**
 * One-purpose production Langfuse validation runner.
 *
 * Purpose: prove that a real production Groq call traverses the centralized
 * observability path and lands in Langfuse with environment=production.
 *
 * Boundaries:
 * - POST only
 * - core.corpflowai.com only in production
 * - factory-admin session OR existing cron Bearer
 * - exact confirmation phrase required
 * - one Groq request only, no retries
 * - fixed synthetic prompt, no DB/client data
 * - no env/secret mutation
 */

import { verifyFactoryMasterOrCronBearer } from '../lib/server/factory-master-auth.js';
import {
  getGroqApiKey,
  groqChatCompletionsFetch,
  resolveGroqModel,
} from '../lib/server/groq-client.js';
import { langfuseProductionReadiness } from '../lib/server/langfuse-production-observability.js';

const CONFIRMATION = 'RUN_LANGFUSE_PRODUCTION_VALIDATION';
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

export function productionValidationReadiness(env = process.env) {
  const lf = langfuseProductionReadiness(env);
  return {
    langfuse_ready: lf.ready === true,
    groq_key_configured: Boolean(String(env.GROQ_API_KEY || '').trim()),
    environment_allowed: lf.environment_allowed === true,
    base_url_allowed: lf.base_url_allowed === true,
    public_key_configured: lf.public_key_configured === true,
    secret_key_configured: lf.secret_key_configured === true,
  };
}

export async function handleLangfuseProductionValidation(req, res, deps = {}) {
  const auth = deps.verifyAuthImpl || verifyFactoryMasterOrCronBearer;
  const env = deps.env || process.env;
  const groqFetch = deps.groqFetchImpl || groqChatCompletionsFetch;
  const getKey = deps.getGroqApiKeyImpl || getGroqApiKey;
  const resolveModel = deps.resolveGroqModelImpl || resolveGroqModel;

  if (req.method !== 'POST') {
    res.setHeader?.('Allow', 'POST');
    return send(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  if (!auth(req)) {
    return send(res, 401, { ok: false, error: 'UNAUTHORIZED' });
  }

  if (String(env.VERCEL_ENV || '').toLowerCase() !== 'production') {
    return send(res, 403, { ok: false, error: 'PRODUCTION_RUNTIME_REQUIRED' });
  }

  if (hostOf(req) !== CORE_HOST) {
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

  const readiness = productionValidationReadiness(env);
  if (!readiness.langfuse_ready || !getKey()) {
    return send(res, 503, {
      ok: false,
      error: 'PRODUCTION_VALIDATION_NOT_READY',
      readiness,
    });
  }

  const model = resolveModel('primary');

  try {
    const providerResponse = await groqFetch({
      model,
      temperature: 0,
      max_tokens: 24,
      observability: {
        workflow: 'langfuse.production_validation',
        product: 'corpflowai-core',
        workstream_id: 'ai-cost-outcome-control',
        work_packet_id: 'langfuse-production-validation',
      },
      messages: [
        {
          role: 'system',
          content:
            'This is a bounded observability validation. Reply with exactly: LANGFUSE_PRODUCTION_TRACE_OK',
        },
        {
          role: 'user',
          content: 'Run the production tracing validation.',
        },
      ],
    });

    const data = await providerResponse.json().catch(() => ({}));
    const output =
      typeof data?.choices?.[0]?.message?.content === 'string'
        ? data.choices[0].message.content.trim().slice(0, 80)
        : '';

    return send(res, providerResponse.ok ? 200 : 502, {
      ok: providerResponse.ok,
      validation: 'langfuse-production-groq-trace',
      provider_http_status: providerResponse.status,
      model: String(data?.model || model || 'unknown'),
      usage: {
        prompt_tokens: Number(data?.usage?.prompt_tokens || 0),
        completion_tokens: Number(data?.usage?.completion_tokens || 0),
        total_tokens: Number(data?.usage?.total_tokens || 0),
      },
      output_matches_expected: output === 'LANGFUSE_PRODUCTION_TRACE_OK',
      expected_langfuse_trace: 'corpflowai.langfuse.production_validation',
      expected_environment: 'production',
      client_data_used: false,
      production_data_changed: false,
      retries: 0,
    });
  } catch (error) {
    return send(res, 502, {
      ok: false,
      error: 'PRODUCTION_VALIDATION_CALL_FAILED',
      message: error instanceof Error ? error.message.slice(0, 180) : 'unknown',
      client_data_used: false,
      production_data_changed: false,
      retries: 0,
    });
  }
}

export default async function handler(req, res) {
  return handleLangfuseProductionValidation(req, res);
}
