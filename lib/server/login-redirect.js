/**
 * IM-5 (2026-06-15) — login redirect resolver.
 *
 * Canonical spec: docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §10 IM-5.
 *
 * Pure helper that decides WHERE a successfully-authenticated DB-backed user
 * should land. Dependency-injected (no top-level Prisma / no I/O) so it can
 * be unit-tested in isolation and so the login handler can wire it in
 * minimally without IM-5 having to touch credential validation.
 *
 * Per Anton's IM-5 approval correction #3:
 *
 *   - Do NOT change credential validation.
 *   - Do NOT change password/PIN/session authentication semantics.
 *   - Do NOT change legacy env-master/PIN session shape.
 *   - Single-membership DB-backed users may resolve to their tenant host.
 *   - Multi-membership DB-backed users may resolve to Core.
 *   - Admin / factory_master users may resolve to Core unless a validated safe
 *     `next` is supplied.
 *   - Unsafe `next` values must never redirect off-platform.
 *
 * Decision tree (in order; first match wins):
 *
 *   1. If `requestedNext` is non-empty AND passes redirect-policy validation
 *      AGAINST the union of (Core hosts ∪ user's effective tenant hosts) →
 *      use it. Reason: `requested_next`.
 *
 *   2. Else if the user is anonymous / has no DB-backed session → fall back
 *      to the safe default (Core `/change`). Reason: `anonymous_default`.
 *      (Note: this is a defensive branch — IM-5's wiring only calls the
 *      resolver after credential validation succeeds, so this branch should
 *      not fire in production. It exists so the function NEVER throws and
 *      always returns a safe URL.)
 *
 *   3. Else if the user has exactly 1 effective membership → tenant host +
 *      `/change`. Reason: `single_membership`.
 *
 *   4. Else (≥ 2 effective memberships, OR 0 effective memberships for admin)
 *      → Core `/change`. Reason: `multi_membership` or `admin_default`.
 *
 * The resolver NEVER:
 *   - Mints or modifies cookies (the login handler does that).
 *   - Issues a 302 (the login handler does that).
 *   - Hits the database (Prisma is injected via opts.getEffectiveMembershipsFn).
 *   - Reads `acting_tenant_id` from the session (the session was JUST minted
 *     by the login handler; this resolver sees the bound `tenant_id`).
 */
import { validateRedirectTarget, safeDefaultRedirect } from './redirect-policy.js';

/**
 * @typedef {{
 *   typ?: 'admin' | 'tenant' | string,
 *   user_id?: string | null,
 *   tenant_id?: string | null,
 *   factory_master?: boolean,
 * }} ResolverSessionPayload
 *
 * @typedef {{
 *   tenant_id: string,
 *   primary_hostname?: string | null,
 * }} ResolverMembership
 *
 * @typedef {{
 *   redirect_to: string,
 *   reason: 'requested_next' | 'single_membership' | 'multi_membership' | 'admin_default' | 'anonymous_default',
 *   hostname: string | null,
 * }} ResolverResult
 *
 * @typedef {{
 *   coreHostsEnv: string | null | undefined,
 *   getEffectiveMembershipsFn: (userId: string) => Promise<{ memberships: ResolverMembership[] }>,
 *   tenantHostnameLookupFn?: (tenantId: string) => Promise<string | null>,
 * }} ResolverOpts
 */

/**
 * Compute the safe landing URL after a successful DB-backed login.
 *
 * @param {ResolverSessionPayload | null | undefined} sessionPayload
 *   The payload that was just minted (or `null` for the defensive anonymous branch).
 * @param {string | null | undefined} requestedNext
 *   The raw `?next=` query value or form input — untrusted user input.
 * @param {ResolverOpts} opts
 *   Dependency-injected lookups.
 * @returns {Promise<ResolverResult>}
 */
export async function resolveLoginRedirect(sessionPayload, requestedNext, opts) {
  const safeDefault = safeDefaultRedirect(opts?.coreHostsEnv);
  const safeFallback = /** @type {ResolverResult} */ ({
    redirect_to: safeDefault,
    reason: 'admin_default',
    hostname: extractHostname(safeDefault),
  });

  // Defensive: missing opts or fn ⇒ return safe default. The wiring should
  // always pass both; if a future caller forgets, we never throw or leak.
  if (!opts || typeof opts.getEffectiveMembershipsFn !== 'function') {
    return safeFallback;
  }

  const payload = sessionPayload && typeof sessionPayload === 'object' ? sessionPayload : null;
  const userId = payload && payload.user_id != null ? String(payload.user_id).trim() : '';

  // Branch 2 (defensive): no DB-backed user → safe default with explicit reason.
  if (!userId) {
    return { ...safeFallback, reason: 'anonymous_default' };
  }

  // Compute the user's effective tenant set. On any error from the helper we
  // degrade to the safe default (never 5xx, never throw).
  /** @type {ResolverMembership[]} */
  let memberships = [];
  try {
    const eff = await opts.getEffectiveMembershipsFn(userId);
    if (eff && Array.isArray(eff.memberships)) memberships = eff.memberships;
  } catch (_) {
    /* fall through with empty memberships; safe default applies */
  }

  // Build the allow-list of hostnames the user may be redirected to:
  //   - Every entry in CORPFLOW_CORE_HOSTS (so requested_next to Core is allowed).
  //   - Every tenant hostname the user has effective membership for.
  const allowedHostnames = await buildAllowedHostnames(memberships, opts);

  // Branch 1: validated `requested_next` wins, regardless of membership count.
  if (requestedNext != null && String(requestedNext).length > 0) {
    const v = validateRedirectTarget(requestedNext, allowedHostnames);
    if (v.ok === true) {
      return {
        redirect_to: v.shape === 'same_origin_path'
          ? joinSameOriginToSafeDefault(v.redirect_to, opts?.coreHostsEnv)
          : v.redirect_to,
        reason: 'requested_next',
        hostname: v.hostname,
      };
    }
    // Unsafe `next` is silently dropped — we never 4xx login on a bad `next`.
    // Fall through to the membership-count branches.
  }

  // Branches 3 + 4: membership-count routing.
  if (memberships.length === 1) {
    const m = memberships[0];
    const tenantHost = await resolveTenantHostname(m, opts);
    if (tenantHost) {
      return {
        redirect_to: `https://${tenantHost}/change`,
        reason: 'single_membership',
        hostname: tenantHost,
      };
    }
    // Tenant has no hostname registered → fall back to Core (admin can still
    // navigate via the IM-4 Switch workspace link once IM-3 picker exists).
    return safeFallback;
  }

  if (memberships.length >= 2) {
    return { ...safeFallback, reason: 'multi_membership' };
  }

  // 0 effective memberships (admin-only, or a tenant user whose membership
  // was revoked just before login somehow): safe default with admin_default
  // reason. The login handler still mints the cookie — IM-5 does not change
  // login admission rules.
  return safeFallback;
}

/**
 * Build the lookup of hostnames the user is allowed to be redirected to.
 *
 * Two sources:
 *   - CORPFLOW_CORE_HOSTS (parsed from opts.coreHostsEnv).
 *   - Effective tenant hostnames (looked up via opts.tenantHostnameLookupFn
 *     when provided; otherwise we honor `membership.primary_hostname` if the
 *     caller pre-attached it, else the tenant is omitted from the allow-list).
 *
 * Returns lowercased, port-stripped, deduplicated entries.
 *
 * @param {ResolverMembership[]} memberships
 * @param {ResolverOpts} opts
 * @returns {Promise<string[]>}
 */
async function buildAllowedHostnames(memberships, opts) {
  const out = new Set();
  const coreRaw = opts && opts.coreHostsEnv != null ? String(opts.coreHostsEnv) : '';
  coreRaw
    .split(',')
    .map((s) => s.trim().toLowerCase().replace(/:\d+$/, ''))
    .filter(Boolean)
    .forEach((h) => out.add(h));

  for (const m of memberships) {
    const tenantHost = await resolveTenantHostname(m, opts);
    if (tenantHost) out.add(tenantHost);
  }
  return Array.from(out);
}

/**
 * Look up a tenant's primary hostname using the lookup fn injected by the
 * caller. Honors `membership.primary_hostname` when pre-attached so tests can
 * skip the injected fn entirely.
 *
 * @param {ResolverMembership} m
 * @param {ResolverOpts} opts
 * @returns {Promise<string | null>}
 */
async function resolveTenantHostname(m, opts) {
  if (m && typeof m.primary_hostname === 'string' && m.primary_hostname.trim()) {
    return m.primary_hostname.trim().toLowerCase();
  }
  if (opts && typeof opts.tenantHostnameLookupFn === 'function' && m && m.tenant_id) {
    try {
      const h = await opts.tenantHostnameLookupFn(String(m.tenant_id));
      if (typeof h === 'string' && h.trim()) return h.trim().toLowerCase();
    } catch (_) {
      /* fall through to null */
    }
  }
  return null;
}

/**
 * When `validateRedirectTarget` returned a same-origin path, prefix it with
 * the safe-default Core host so the login handler always returns an absolute
 * URL (callers can `Location:` redirect, embed in JSON, or hand off to JS).
 *
 * @param {string} samePath
 * @param {string | null | undefined} coreHostsEnv
 * @returns {string}
 */
function joinSameOriginToSafeDefault(samePath, coreHostsEnv) {
  const safe = safeDefaultRedirect(coreHostsEnv);
  // safe is `https://<host>/change`; we replace the path portion with samePath.
  const m = /^(https:\/\/[a-z0-9.-]+)/.exec(safe);
  const origin = m ? m[1] : 'https://core.corpflowai.com';
  return `${origin}${samePath}`;
}

/**
 * Extract the hostname from a known-shape `https://host/path` URL. Returns
 * null if the input is malformed (defensive — should never happen for
 * outputs of `safeDefaultRedirect` / `validateRedirectTarget`).
 *
 * @param {string} absUrl
 * @returns {string | null}
 */
function extractHostname(absUrl) {
  const m = /^https:\/\/([a-z0-9.-]+)/.exec(String(absUrl || ''));
  return m ? m[1] : null;
}
