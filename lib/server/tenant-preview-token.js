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
 * True when preview URLs can be signed and `cf_preview` can be verified on this deployment.
 * @returns {boolean}
 */
export function isTenantPreviewSecretConfigured() {
  return Boolean(previewSecret());
}

/**
 * Vercel "Protection bypass for automation" value — also works as query `x-vercel-protection-bypass`
 * so browsers can open protected Preview deployments without a Vercel login.
 * @see https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation
 * @returns {string}
 */
function vercelProtectionBypassSecret() {
  return String(
    cfg('VERCEL_AUTOMATION_BYPASS_SECRET', '') || cfg('CORPFLOW_VERCEL_PROTECTION_BYPASS_SECRET', '') || '',
  ).trim();
}

/**
 * @param {string} hostname
 * @returns {boolean}
 */
function isVercelAppDeploymentHost(hostname) {
  const h = String(hostname || '').toLowerCase().replace(/:\d+$/, '');
  return h === 'vercel.app' || h.endsWith('.vercel.app');
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
 * @typedef {'NO_SECRET_ON_SERVER' | 'TOKEN_ABSENT' | 'MALFORMED' | 'BAD_SIGNATURE' | 'INVALID_PAYLOAD' | 'INVALID_TENANT_IN_TOKEN' | 'EXPIRED'} TenantPreviewTokenFailReason
 */

/**
 * @param {string} token
 * @returns {{ ok: true, tenantId: string } | { ok: false, reason: TenantPreviewTokenFailReason }}
 */
export function verifyTenantPreviewTokenDetailed(token) {
  const secret = previewSecret();
  if (!secret) return { ok: false, reason: 'NO_SECRET_ON_SERVER' };
  if (typeof token !== 'string') return { ok: false, reason: 'TOKEN_ABSENT' };
  const raw = token.trim();
  if (!raw) return { ok: false, reason: 'TOKEN_ABSENT' };
  const dot = raw.indexOf('.');
  if (dot <= 0 || dot === raw.length - 1) return { ok: false, reason: 'MALFORMED' };
  const payloadB64 = raw.slice(0, dot);
  const sigB64 = raw.slice(dot + 1);
  let expected;
  try {
    expected = base64url(crypto.createHmac('sha256', secret).update(payloadB64).digest());
  } catch {
    return { ok: false, reason: 'MALFORMED' };
  }
  if (!timingSafeStringEquals(sigB64, expected)) return { ok: false, reason: 'BAD_SIGNATURE' };
  let payload;
  try {
    const json = base64urlToBuffer(payloadB64).toString('utf8');
    payload = JSON.parse(json);
  } catch {
    return { ok: false, reason: 'INVALID_PAYLOAD' };
  }
  if (!payload || typeof payload !== 'object') return { ok: false, reason: 'INVALID_PAYLOAD' };
  const tenantId = typeof payload.t === 'string' ? payload.t.trim() : '';
  const exp = Number(payload.exp);
  if (!isSafeTenantIdForPreviewToken(tenantId)) return { ok: false, reason: 'INVALID_TENANT_IN_TOKEN' };
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return { ok: false, reason: 'EXPIRED' };
  return { ok: true, tenantId };
}

/**
 * @param {string} token
 * @returns {{ ok: true, tenantId: string } | { ok: false }}
 */
export function verifyTenantPreviewToken(token) {
  const d = verifyTenantPreviewTokenDetailed(token);
  if (d.ok) return { ok: true, tenantId: d.tenantId };
  return { ok: false };
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
    const bypass = vercelProtectionBypassSecret();
    if (bypass && isVercelAppDeploymentHost(u.hostname)) {
      u.searchParams.set('x-vercel-protection-bypass', bypass);
      u.searchParams.set('x-vercel-set-bypass-cookie', 'true');
    }
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
  delete auto.client_site_preview_signing_issue;
  if (clientUrl) {
    auto.client_site_preview_url = clientUrl;
    auto.client_site_preview_updated_at = new Date().toISOString();
  } else {
    delete auto.client_site_preview_url;
    delete auto.client_site_preview_updated_at;
    if (tid && pu) {
      try {
        const u = new URL(pu.startsWith('http') ? pu : `https://${pu}`);
        if (isVercelAppDeploymentHost(u.hostname) && !previewSecret()) {
          auto.client_site_preview_signing_issue = 'MISSING_CORPFLOW_TENANT_PREVIEW_SECRET';
        }
      } catch {
        /* ignore */
      }
    }
  }
  return auto;
}
