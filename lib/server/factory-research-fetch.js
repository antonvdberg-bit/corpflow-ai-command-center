/**
 * Factory-only: fetch allowlisted HTTPS doc pages (SSRF-safe).
 *
 * Policy:
 * - Off by default (`CORPFLOW_RESEARCH_FETCH_ENABLED` must be true)
 * - HTTPS only
 * - Host must be allowlisted (repo config or env override)
 * - Block localhost/.local/IP literals/private ranges
 */

import { verifyFactoryMasterAuth } from './factory-master-auth.js';
import { validateAllowlistedResearchUrl } from './url-allowlist.js';

function jsonError(res, status, code, extra = {}) {
  return res.status(status).json({ ok: false, error: code, ...extra });
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(Buffer.from(c));
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function pickQuery(req, key) {
  const q = req?.query || {};
  const v = q[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function factoryResearchFetchHandler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonError(res, 405, 'METHOD_NOT_ALLOWED');
  }

  if (!verifyFactoryMasterAuth(req)) {
    return jsonError(res, 401, 'UNAUTHENTICATED');
  }

  const urlFromQuery = pickQuery(req, 'url');
  const body = (await readJsonBody(req)) ?? null;
  if (body == null) return jsonError(res, 400, 'INVALID_JSON');

  const rawUrl = String(body.url || urlFromQuery || '').trim();
  if (!rawUrl) return jsonError(res, 400, 'MISSING_URL');

  const v = validateAllowlistedResearchUrl(rawUrl);
  if (!v.ok) return jsonError(res, 403, 'URL_BLOCKED', { reason: v.reason });

  const controller = new AbortController();
  const timeoutMs = 15_000;
  const t = setTimeout(() => controller.abort(), timeoutMs);

  let r;
  try {
    r = await fetch(v.url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'CorpFlowFactoryResearchFetch/1.0',
        accept: 'text/html,text/plain,application/json;q=0.9,*/*;q=0.5',
      },
    });
  } catch (e) {
    clearTimeout(t);
    return jsonError(res, 502, 'FETCH_FAILED', { detail: String(e?.message || e) });
  } finally {
    clearTimeout(t);
  }

  const contentType = String(r.headers.get('content-type') || '').toLowerCase();
  const text = await r.text();

  const maxChars = 200_000;
  const clipped = text.length > maxChars ? `${text.slice(0, maxChars)}\n\n[clipped]` : text;

  return res.status(200).json({
    ok: true,
    url: v.url,
    status: r.status,
    content_type: contentType || null,
    chars: clipped.length,
    body: clipped,
  });
}

