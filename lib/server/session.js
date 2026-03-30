import crypto from 'crypto';
import { cfg } from './runtime-config.js';

function base64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlJson(obj) {
  return base64url(Buffer.from(JSON.stringify(obj), 'utf8'));
}

function fromBase64url(s) {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(b64, 'base64');
}

export function parseCookies(req) {
  const raw = String(req?.headers?.cookie || '').trim();
  if (!raw) return {};
  const out = {};
  raw.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx < 0) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (!k) return;
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  });
  return out;
}

export function setCookie(res, name, value, opts = {}) {
  const parts = [];
  parts.push(`${name}=${encodeURIComponent(String(value || ''))}`);
  parts.push(`Path=${opts.path || '/'}`);
  if (opts.maxAgeSec != null) parts.push(`Max-Age=${Number(opts.maxAgeSec)}`);
  if (opts.httpOnly !== false) parts.push('HttpOnly');
  parts.push(`SameSite=${opts.sameSite || 'Lax'}`);
  if (opts.secure !== false) parts.push('Secure');
  const headerVal = parts.join('; ');
  // Multiple Set-Cookie headers must be an array.
  const existing = res.getHeader('Set-Cookie');
  if (!existing) res.setHeader('Set-Cookie', headerVal);
  else if (Array.isArray(existing)) res.setHeader('Set-Cookie', [...existing, headerVal]);
  else res.setHeader('Set-Cookie', [existing, headerVal]);
}

export function clearCookie(res, name) {
  setCookie(res, name, '', { maxAgeSec: 0 });
}

export function getSessionSecret() {
  return String(cfg('SOVEREIGN_SESSION_SECRET', '')).trim();
}

export function signSession(payload, { ttlSec }) {
  const secret = getSessionSecret();
  if (!secret) return { ok: false, token: '', error: 'SOVEREIGN_SESSION_SECRET missing' };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.max(60, Number(ttlSec || 3600));
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = { ...payload, iat: now, exp };
  const h = base64urlJson(header);
  const b = base64urlJson(body);
  const msg = `${h}.${b}`;
  const sig = crypto.createHmac('sha256', secret).update(msg).digest();
  const token = `${msg}.${base64url(sig)}`;
  return { ok: true, token, error: null };
}

export function verifySession(token) {
  const secret = getSessionSecret();
  if (!secret) return { ok: false, error: 'SOVEREIGN_SESSION_SECRET missing', payload: null };
  const t = String(token || '').trim();
  const parts = t.split('.');
  if (parts.length !== 3) return { ok: false, error: 'invalid_token', payload: null };
  const msg = `${parts[0]}.${parts[1]}`;
  const sig = parts[2];
  const expected = base64url(crypto.createHmac('sha256', secret).update(msg).digest());
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return { ok: false, error: 'bad_signature', payload: null };
  }
  try {
    const payload = JSON.parse(fromBase64url(parts[1]).toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload?.exp && now > Number(payload.exp)) return { ok: false, error: 'expired', payload: null };
    return { ok: true, error: null, payload };
  } catch {
    return { ok: false, error: 'bad_payload', payload: null };
  }
}

export const CORPFLOW_SESSION_COOKIE = 'corpflow_session';

export function getSessionFromRequest(req) {
  const cookies = parseCookies(req);
  const token = cookies[CORPFLOW_SESSION_COOKIE] || '';
  if (!token) return { ok: false, payload: null, error: 'missing' };
  return verifySession(token);
}

