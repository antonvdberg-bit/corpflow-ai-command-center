/**
 * Signed query token so Vercel preview hosts (*.vercel.app) can render a tenant marketing site
 * without a tenant_hostnames row for that host. Hostname mapping still wins when present.
 */

import crypto from 'crypto';

import { cfg } from './runtime-config.js';
import { timingSafeStringEquals } from './factory-master-auth.js';

const DEFAULT_TTL_SEC = 14 * 24 * 60 * 60; // 14 days

function base64url(buf) {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64urlToBuffer(s) {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const norm = String(s).replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(norm, 'base64');
}

/**
 * @param {string} tenantId
 * @returns {boolean}
 */
export function isSafeTenantIdForPreviewToken(tenantId) {
  const t = String(tenantId || '').trim();
  if (t.length < 2 || t.length > 96) return false;
  return /^[a-z0-9][a-z0-9._-]*$/i.test(t);
}

/**
 * @returns {string}
 */
function previewSecret() {
  return String(cfg('CORPFLOW_TENANT_PREVIEW_SECRET', '') || '').trim();
}

/**
 * @param {string} tenantId
 * @param {number} [ttlSec]
 * @returns {string | null}
 */
export function signTenantPreviewToken(tenantId, ttlSec = DEFAULT_TTL_SEC) {
  const secret = previewSecret();
  if (!secret || !isSafeTenantIdForPreviewToken(tenantId)) return null;
  const exp = Math.floor(Date.now() / 1000) + Math.max(300, Math.min(Number(ttlSec) || DEFAULT_TTL_SEC, 90 * 24 * 60 * 60));
  const payload = JSON.stringify({ t: String(tenantId).trim(), exp });
  const payloadB64 = base64url(Buffer.from(payload, 'utf8'));
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest();
  return `${payloadB64}.${base64url(sig)}`;
}

/**
 * @param {string} token
 * @returns {{ ok: true, tenantId: string } | { ok: false }}
 */
export function verifyTenantPreviewToken(token) {
  const secret = previewSecret();
  if (!secret || typeof token !== 'string') return { ok: false };
  const raw = token.trim();
  const dot = raw.indexOf('.');
  if (dot <= 0 || dot === raw.length - 1) return { ok: false };
  const payloadB64 = raw.slice(0, dot);
  const sigB64 = raw.slice(dot + 1);
  let expected;
  try {
    expected = base64url(crypto.createHmac('sha256', secret).update(payloadB64).digest());
  } catch {
    return { ok: false };
  }
  if (!timingSafeStringEquals(sigB64, expected)) return { ok: false };
  let payload;
  try {
    const json = base64urlToBuffer(payloadB64).toString('utf8');
    payload = JSON.parse(json);
  } catch {
    return { ok: false };
  }
  if (!payload || typeof payload !== 'object') return { ok: false };
  const tenantId = typeof payload.t === 'string' ? payload.t.trim() : '';
  const exp = Number(payload.exp);
  if (!isSafeTenantIdForPreviewToken(tenantId)) return { ok: false };
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return { ok: false };
  return { ok: true, tenantId };
}

/**
 * @param {string} previewUrl
 * @param {string} tenantId
 * @returns {string | null}
 */
export function buildClientSitePreviewUrl(previewUrl, tenantId) {
  const base = String(previewUrl || '').trim();
  const token = signTenantPreviewToken(tenantId);
  if (!base || !token) return null;
  try {
    const u = new URL(base.startsWith('http') ? base : `https://${base}`);
    u.searchParams.set('cf_preview', token);
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, unknown>} automation
 * @param {string | null | undefined} previewUrl
 * @param {string | null | undefined} tenantId
 * @returns {Record<string, unknown>}
 */
export function withClientSitePreviewFields(automation, previewUrl, tenantId) {
  const auto = automation && typeof automation === 'object' ? { ...automation } : {};
  const tid = tenantId != null ? String(tenantId).trim() : '';
  const pu = previewUrl != null ? String(previewUrl).trim() : '';
  const clientUrl = tid && pu ? buildClientSitePreviewUrl(pu, tid) : null;
  if (clientUrl) {
    auto.client_site_preview_url = clientUrl;
    auto.client_site_preview_updated_at = new Date().toISOString();
  } else {
    delete auto.client_site_preview_url;
    delete auto.client_site_preview_updated_at;
  }
  return auto;
}
