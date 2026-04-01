/**
 * Request attribution scaffold (headers / internal heuristics only).
 * Optional external analytics can be added later via Postgres telemetry — no third-party CRM HTTP here.
 */

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Record<string, unknown>}
 */
function internalAttribution(req) {
  const h = req.headers || {};
  return {
    source: 'internal',
    user_agent: h['user-agent'] || null,
    referer: h.referer || h.referrer || null,
    forwarded_for: h['x-forwarded-for'] || null,
  };
}

/**
 * @param {string} tenantClientId
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<{ ok: boolean, attribution: Record<string, unknown> }>}
 */
export async function resolveAttribution(tenantClientId, req) {
  void tenantClientId;
  const attribution = internalAttribution(req);
  return { ok: true, attribution };
}
