import net from 'node:net';
import { cfg } from './runtime-config.js';

/**
 * Very small SSRF-safe allowlist validator for outbound research fetches.
 * Policy: block by default; allow only https:// to explicit allowlisted hostnames.
 */

function parseAllowlistJson(raw) {
  try {
    const j = JSON.parse(String(raw || '') || '{}');
    return j && typeof j === 'object' ? j : {};
  } catch {
    return {};
  }
}

function loadAllowlist() {
  // Prefer env override for emergency hotfixes; otherwise use repo config file path.
  const raw = String(cfg('CORPFLOW_RESEARCH_DOMAIN_ALLOWLIST_JSON', '') || '').trim();
  if (raw) return parseAllowlistJson(raw);
  // Repo default.
  try {
    // eslint-disable-next-line no-sync
    const fs = require('node:fs');
    // eslint-disable-next-line no-sync
    const text = fs.readFileSync('config/research-domain-allowlist.v1.json', 'utf8');
    return parseAllowlistJson(text);
  } catch {
    return {};
  }
}

function isPrivateHostname(hostname) {
  const h = String(hostname || '').trim().toLowerCase();
  if (!h) return true;
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h.endsWith('.local')) return true;
  if (h === '0.0.0.0') return true;
  if (h === '::1') return true;
  return false;
}

function isIpLiteral(hostname) {
  const h = String(hostname || '').trim();
  return net.isIP(h) !== 0;
}

export function isPrivateIpLiteral(hostname) {
  const h = String(hostname || '').trim();
  const v = net.isIP(h);
  if (v === 0) return false;
  if (h === '::1') return true;
  if (v === 6) return false;
  const parts = h.split('.').map((x) => parseInt(x, 10));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function normalizeHost(hostname) {
  return String(hostname || '')
    .trim()
    .toLowerCase()
    .replace(/\.$/, '');
}

export function isAllowlistedHostname(host, allow) {
  const h = normalizeHost(host);
  const exact = Array.isArray(allow?.exact_hosts) ? allow.exact_hosts.map(normalizeHost) : [];
  if (exact.includes(h)) return true;
  const suffixes = Array.isArray(allow?.suffix_hosts) ? allow.suffix_hosts.map(normalizeHost) : [];
  for (const s of suffixes) {
    if (!s) continue;
    if (h === s) return true;
    if (h.endsWith(`.${s}`)) return true;
  }
  return false;
}

export function validateAllowlistedHttpsUrl(rawUrl, allow) {
  let u;
  try {
    u = new URL(String(rawUrl || '').trim());
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }
  if (u.protocol !== 'https:') return { ok: false, reason: 'https_required' };
  if (u.username || u.password) return { ok: false, reason: 'userinfo_not_allowed' };
  const host = u.hostname;
  if (isPrivateHostname(host)) return { ok: false, reason: 'private_hostname_blocked' };
  if (isPrivateIpLiteral(host)) return { ok: false, reason: 'private_ip_blocked' };
  if (isIpLiteral(host)) return { ok: false, reason: 'ip_literal_blocked' };
  if (!isAllowlistedHostname(host, allow)) return { ok: false, reason: 'host_not_allowlisted' };
  u.hash = '';
  return { ok: true, url: u.toString() };
}

/**
 * Validate an outbound URL is allowed for research fetch.
 *
 * @param {string} rawUrl
 * @returns {{ ok: boolean, url?: string, reason?: string }}
 */
export function validateAllowlistedResearchUrl(rawUrl) {
  const enabled = String(cfg('CORPFLOW_RESEARCH_FETCH_ENABLED', 'false') || 'false').toLowerCase() === 'true';
  if (!enabled) return { ok: false, reason: 'research_fetch_disabled' };

  const allow = loadAllowlist();
  return validateAllowlistedHttpsUrl(rawUrl, allow);
}

