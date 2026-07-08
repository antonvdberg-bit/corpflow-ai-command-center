/**
 * GET /api/lux/ai-sandbox/health — LuxeMaurice AI Supabase sandbox status (no secrets).
 */

import { buildLuxAiSandboxHealthReport } from './lux-ai-sandbox/health.js';

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
export async function handleLuxAiSandboxHealth(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  try {
    const report = await buildLuxAiSandboxHealthReport();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(report.ok ? 200 : 503).json(report);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ ok: false, error: 'health_failed', detail: msg.slice(0, 200) });
  }
}
