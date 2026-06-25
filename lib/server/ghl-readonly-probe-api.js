/**
 * Factory API — Living Word GHL read-only probe (Production env only).
 *
 * GET /api/factory/ghl/living-word/probe?tenant_id=living-word-mauritius
 */

import { verifyFactoryMasterAuth } from './factory-master-auth.js';
import { GHL_LWM_TENANT_ID } from './ghl/constants.js';
import { getGhlLivingWordEnvReadiness } from './ghl/ghl-config.js';
import { runGhlLivingWordReadonlyProbe } from './ghl/ghl-readonly-probe.js';

/**
 * @param {Record<string, unknown>} query
 * @param {string} key
 * @returns {string}
 */
function pickQuery(query, key) {
  const v = query?.[key];
  if (Array.isArray(v)) return v[0] != null ? String(v[0]).trim() : '';
  return v != null ? String(v).trim() : '';
}

/**
 * Probe runs only on Vercel Production where GHL env vars are configured.
 * @returns {boolean}
 */
function isProductionRuntime() {
  const vercelEnv = String(process.env.VERCEL_ENV || '').trim().toLowerCase();
  if (vercelEnv) return vercelEnv === 'production';
  return String(process.env.NODE_ENV || '').toLowerCase() === 'production';
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
export async function handleGhlLivingWordProbe(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  if (!verifyFactoryMasterAuth(req)) {
    return res.status(403).json({ ok: false, error: 'factory_master_required' });
  }

  const tenantId = pickQuery(req.query || {}, 'tenant_id');
  if (tenantId !== GHL_LWM_TENANT_ID) {
    return res.status(400).json({ ok: false, error: 'tenant_id_not_allowed' });
  }

  if (!isProductionRuntime()) {
    return res.status(503).json({
      ok: false,
      error: 'production_env_required',
      hint: 'GHL probe runs on Vercel Production factory env only',
    });
  }

  const env = getGhlLivingWordEnvReadiness();
  if (!env.ok) {
    return res.status(503).json({
      ok: false,
      error: 'ghl_env_missing',
      missing: env.missing,
    });
  }

  try {
    const report = await runGhlLivingWordReadonlyProbe();
    const status = report.ok === false && report.error ? 503 : 200;
    return res.status(status).json(report);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'secret_leak_detected') {
      return res.status(500).json({ ok: false, error: 'internal_redaction_failure' });
    }
    return res.status(500).json({ ok: false, error: 'probe_failed' });
  }
}

/**
 * Env readiness check without calling GHL — factory master only.
 *
 * GET /api/factory/ghl/living-word/env-readiness
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {void}
 */
export function handleGhlLivingWordEnvReadiness(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  if (!verifyFactoryMasterAuth(req)) {
    return res.status(403).json({ ok: false, error: 'factory_master_required' });
  }

  const env = getGhlLivingWordEnvReadiness();
  const production = isProductionRuntime();

  return res.status(200).json({
    ok: env.ok && production,
    tenantId: GHL_LWM_TENANT_ID,
    environmentTarget: production ? 'vercel_production' : String(process.env.VERCEL_ENV || 'local'),
    locationIdPresent: env.ok ? true : !env.missing.includes('CORPFLOW_GHL_LIVING_WORD_MAURITIUS_LOCATION_ID'),
    pitPresent: env.ok ? true : !env.missing.includes('CORPFLOW_GHL_LIVING_WORD_MAURITIUS_PIT'),
    pitLength: env.ok ? env.pitLength : undefined,
    missing: env.ok ? [] : env.missing,
    productionEnv: production,
  });
}
