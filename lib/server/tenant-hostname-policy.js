/**
 * Client onboarding hostname policy: work stays on {tenant_id}.corpflowai.com (same label as workspace id) until cutover.
 * Custom / customer-owned domains are handled via Change tickets, not provisioning.
 *
 * Env:
 * - CORPFLOW_ROOT_DOMAIN — default corpflowai.com (apex + subdomains count as “on stack”).
 * - CORPFLOW_ENFORCE_CORPFLOW_SUBDOMAIN_ONBOARDING=true — reject hostnames not on stack (unless exempt).
 * - CORPFLOW_ENFORCE_HOSTNAME_MATCHES_TENANT_ID=true — for on-stack hosts, require host to be `{tenant_id}.CORPFLOW_ROOT_DOMAIN` (prefix match; tenant_id may contain dots).
 * - CORPFLOW_TENANT_HOSTNAME_ONBOARDING_EXEMPT — comma-separated extra hosts (e.g. legacy client.com).
 */

import { cfg } from './runtime-config.js';

function rootDomain() {
  return String(cfg('CORPFLOW_ROOT_DOMAIN', 'corpflowai.com'))
    .trim()
    .toLowerCase()
    .replace(/^\.+/, '')
    .replace(/\.+$/, '') || 'corpflowai.com';
}

/**
 * @param {string} host
 * @returns {string}
 */
export function normalizeHostnameForPolicy(host) {
  return String(host || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
}

/**
 * Hostnames that are part of the public CorpFlow stack (apex + subdomains of CORPFLOW_ROOT_DOMAIN).
 *
 * @param {string} host
 * @returns {boolean}
 */
export function isPublicCorpflowStackHostname(host) {
  const h = normalizeHostnameForPolicy(host);
  if (!h) return false;
  const root = rootDomain();
  if (h === root) return true;
  return h.endsWith(`.${root}`);
}

/**
 * Dev / preview / explicit operator allowlist — not subject to “must be *.corpflowai.com” when enforcing.
 *
 * @param {string} host
 * @returns {boolean}
 */
export function isOnboardingHostnameExempt(host) {
  const h = normalizeHostnameForPolicy(host);
  if (!h) return false;
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h.startsWith('127.')) return true;
  if (h.endsWith('.vercel.app')) return true;
  if (h.endsWith('.local')) return true;
  const raw = String(cfg('CORPFLOW_TENANT_HOSTNAME_ONBOARDING_EXEMPT', '')).trim();
  if (raw) {
    const allow = raw
      .split(',')
      .map((s) => normalizeHostnameForPolicy(s))
      .filter(Boolean);
    if (allow.includes(h)) return true;
  }
  return false;
}

export function enforceCorpflowSubdomainOnboarding() {
  return String(cfg('CORPFLOW_ENFORCE_CORPFLOW_SUBDOMAIN_ONBOARDING', '')).toLowerCase() === 'true';
}

export function enforceHostnameMatchesTenantId() {
  return String(cfg('CORPFLOW_ENFORCE_HOSTNAME_MATCHES_TENANT_ID', '')).toLowerCase() === 'true';
}

/**
 * For `prefix.corpflowai.com`, returns `prefix` (may contain dots). Apex returns ''.
 *
 * @param {string} host
 * @returns {string}
 */
export function stackHostnameTenantPrefix(host) {
  const h = normalizeHostnameForPolicy(host);
  const root = rootDomain();
  if (!h || h === root) return '';
  if (!h.endsWith(`.${root}`)) return '';
  return h.slice(0, h.length - root.length - 1);
}

const POLICY_HINT =
  'New clients should use their workspace id as the subdomain: {tenant_id}.' +
  rootDomain() +
  ' (e.g. acme-corp.' +
  rootDomain() +
  ' if workspace id is acme-corp). ' +
  'Activating or moving to a customer-owned domain is a separate step: open a ticket in the Change Console, not the onboarding wizard.';

/**
 * @param {string} host
 * @param {{ bypass?: boolean; tenantId?: string }} [opts]
 * @returns {{ allowed: boolean; code?: string; hint?: string; notice?: string }}
 */
export function evaluateOnboardingHostnamePolicy(host, opts = {}) {
  if (opts.bypass) {
    return { allowed: true, notice: 'Hostname policy bypassed (operator flag).' };
  }
  const h = normalizeHostnameForPolicy(host);
  const root = rootDomain();
  const onStack = isPublicCorpflowStackHostname(h);
  const exempt = isOnboardingHostnameExempt(h);

  if (!(onStack || exempt)) {
    if (enforceCorpflowSubdomainOnboarding()) {
      return {
        allowed: false,
        code: 'ONBOARDING_USE_CORPFLOW_SUBDOMAIN',
        hint: POLICY_HINT,
      };
    }
    return {
      allowed: true,
      notice: `Hostname "${h}" is not under ${root}. ${POLICY_HINT}`,
    };
  }

  if (exempt && !onStack) {
    return {
      allowed: true,
      notice:
        'Exempt / dev hostname: not under *.' +
        root +
        '. Production client onboarding should still use <workspace_id>.' +
        root +
        ' (same label as workspace id) until DNS cutover is ticketed.',
    };
  }

  const tenantIdNorm = opts.tenantId != null ? String(opts.tenantId).trim().toLowerCase() : '';
  if (enforceHostnameMatchesTenantId() && tenantIdNorm && !exempt && h !== root) {
    const pref = stackHostnameTenantPrefix(h);
    if (pref && pref !== tenantIdNorm) {
      return {
        allowed: false,
        code: 'ONBOARDING_HOSTNAME_TENANT_ID_MISMATCH',
        hint: `Expected ${tenantIdNorm}.${root} for workspace id "${tenantIdNorm}". Legacy aliases: add the host to CORPFLOW_TENANT_HOSTNAME_ONBOARDING_EXEMPT or use bypass_client_hostname_policy (factory master).`,
      };
    }
  }

  /** @type {{ allowed: true; notice?: string }} */
  const out = { allowed: true };
  if (tenantIdNorm && h !== root && onStack && !exempt) {
    const pref = stackHostnameTenantPrefix(h);
    if (pref && pref !== tenantIdNorm && !enforceHostnameMatchesTenantId()) {
      out.notice = `Hostname is ${h}; canonical for this workspace is ${tenantIdNorm}.${root}.`;
    }
  }
  return out;
}

/**
 * Validate all bootstrap hostnames (empty list → ok).
 *
 * @param {string[]} hostnames
 * @param {{ bypass?: boolean; tenantId?: string }} [opts]
 * @returns {{ ok: true; notices: { host: string; notice: string }[] } | { ok: false; error: string; code?: string; hint?: string }}
 */
export function validateBootstrapHostnamesPolicy(hostnames, opts = {}) {
  /** @type {{ host: string; notice: string }[]} */
  const notices = [];
  const hosts = Array.isArray(hostnames) ? hostnames : [];
  for (const host of hosts) {
    const ev = evaluateOnboardingHostnamePolicy(host, {
      bypass: opts.bypass === true,
      tenantId: opts.tenantId,
    });
    if (!ev.allowed) {
      return {
        ok: false,
        error: `Hostname not allowed for onboarding: ${host}`,
        code: ev.code || 'ONBOARDING_HOSTNAME_POLICY',
        hint: ev.hint,
      };
    }
    if (ev.notice) notices.push({ host, notice: ev.notice });
  }
  return { ok: true, notices };
}
