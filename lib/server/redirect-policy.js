/**
 * IM-5 (2026-06-15) — open-redirect protection for login redirect resolver
 * and the /switch + /leave endpoint contracts.
 *
 * Canonical spec: docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §10 IM-5.
 *
 * Pure helper — no DOM, no Prisma, no I/O. Single decision: given a redirect
 * target string and a set of allowed hostnames, is it safe to redirect a user
 * there, and if so, what is the canonical absolute URL?
 *
 * The threat model this defends against (per Anton's IM-5 approval correction #3:
 * "Unsafe `next` values must never redirect off-platform"):
 *
 *   - Off-platform redirect: `https://evil.com/login` posing as a legitimate
 *     `?next=` value, used to phish credentials after login.
 *   - Protocol-relative redirect: `//evil.com/x` which inherits the current
 *     scheme and bypasses naive host checks that look for `https://`.
 *   - Scheme injection: `javascript:`, `data:`, `vbscript:`, `file:`, `blob:`,
 *     `about:` — anything that is not `https://`.
 *   - Header injection: CR/LF/NUL characters in the URL that could split the
 *     Location header in a downstream response.
 *   - Path traversal that smuggles a hostname: `\\evil.com\x` (Windows UNC),
 *     `/\\evil.com`, etc.
 *   - Excessively long URLs designed to exhaust downstream parsers.
 *
 * What this helper does NOT validate:
 *
 *   - Whether the user has permission to access the destination (that is the
 *     caller's job — e.g. /switch validates the target tenant is in the user's
 *     effective set via `getEffectiveMemberships` BEFORE asking this helper to
 *     compute the redirect URL).
 *   - Whether the destination route exists (404 is the destination's problem).
 *   - Tenant-scoped CMP authorization (IM-6 owns that).
 */

/**
 * Maximum redirect URL length we accept. Set well above any legitimate use
 * case (typical Lux URL is ~50 chars; even with deep paths + query strings
 * 2048 is comfortable) but small enough to make abuse attempts visible.
 */
const MAX_REDIRECT_LENGTH = 2048;

/**
 * Allowed scheme for absolute URL targets. Hard-coded — we intentionally do
 * NOT accept `http://` in production. If a future packet needs to support a
 * non-https core host for local dev, that change lives here, not in any
 * caller.
 */
const ALLOWED_SCHEME = 'https://';

/**
 * Characters allowed in the path portion of a same-origin redirect.
 * Conservative — limits to alphanumeric + a small set of URL-safe punctuation.
 * Notably EXCLUDES `?`, `#`, `=`, `&` unless `opts.allowQuery` is true (most
 * IM-5 callers don't need query strings; if a future caller does, they opt in).
 */
const SAFE_PATH_CHARS_RE = /^\/[a-zA-Z0-9/_.~-]*$/;

/**
 * Same as above PLUS `?`, `=`, `&`, `;`, `%`, `,` for queries. Hash fragments
 * are still excluded (they have no server-side meaning anyway).
 */
const SAFE_PATH_AND_QUERY_RE = /^\/[a-zA-Z0-9/_.~?=&;%,-]*$/;

/**
 * Characters never allowed anywhere in a redirect target (header injection,
 * null-byte attacks). If present, the entire target is rejected.
 */
const FORBIDDEN_CHARS_RE = /[\r\n\0\t\f\v]/;

/**
 * Characters never allowed inside a hostname (defense-in-depth on top of the
 * URL parser). Hostnames may only contain `[a-z0-9.-]` (after lower-casing).
 */
const SAFE_HOSTNAME_RE = /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/;

/**
 * Validate a redirect target string.
 *
 * Accepts:
 *   - A same-origin path like `/change` or `/admin/lead-rescue`.
 *   - An absolute https:// URL whose hostname is in `allowedHostnames`.
 *
 * Rejects everything else with a structured `{ ok: false, reason }` result.
 * The `reason` codes are stable and tested — callers can log them for
 * observability without coupling to internal regex details.
 *
 * @param {unknown} target
 *   The candidate redirect URL (any type — defensively coerced).
 * @param {string[]} allowedHostnames
 *   Lower-cased hostnames that absolute URLs may target. Typically built as
 *   `[...CORPFLOW_CORE_HOSTS, ...user's effective tenant hostnames]`.
 * @param {{ allowQuery?: boolean }} [opts]
 *   Per-call options. `allowQuery=true` permits `?key=value` in same-origin
 *   paths. Default false (most IM-5 callers don't need query strings).
 * @returns {
 *   { ok: true, redirect_to: string, shape: 'same_origin_path' | 'absolute_url', hostname: string | null }
 *   | { ok: false, reason: string }
 * }
 */
export function validateRedirectTarget(target, allowedHostnames, opts = {}) {
  if (target == null) return { ok: false, reason: 'empty' };
  const raw = String(target);
  if (!raw) return { ok: false, reason: 'empty' };
  if (raw.length > MAX_REDIRECT_LENGTH) return { ok: false, reason: 'too_long' };
  if (FORBIDDEN_CHARS_RE.test(raw)) return { ok: false, reason: 'forbidden_chars' };

  // Reject protocol-relative URLs and Windows UNC-style paths up front. These
  // would otherwise pass the same-origin regex if it were too permissive, and
  // they are the most common open-redirect vectors.
  if (raw.startsWith('//')) return { ok: false, reason: 'protocol_relative' };
  if (raw.startsWith('\\\\')) return { ok: false, reason: 'unc_path' };
  if (raw.includes('\\')) return { ok: false, reason: 'backslash' };

  // Same-origin path? (must start with single `/` and contain only safe chars)
  if (raw.startsWith('/')) {
    // Traversal checks BEFORE the regex so that an encoded traversal like
    // `/x/%2e%2e/y` yields the specific `path_traversal_encoded` reason
    // (otherwise SAFE_PATH_CHARS_RE rejects `%` first as unsafe_path_chars
    // and the more informative reason is masked).
    if (raw.includes('..')) return { ok: false, reason: 'path_traversal' };
    if (raw.toLowerCase().includes('%2e%2e')) return { ok: false, reason: 'path_traversal_encoded' };
    const pathRe = opts.allowQuery === true ? SAFE_PATH_AND_QUERY_RE : SAFE_PATH_CHARS_RE;
    if (!pathRe.test(raw)) return { ok: false, reason: 'unsafe_path_chars' };
    return { ok: true, redirect_to: raw, shape: 'same_origin_path', hostname: null };
  }

  // Absolute URL? Must be exactly the allowed scheme.
  if (!raw.startsWith(ALLOWED_SCHEME)) return { ok: false, reason: 'bad_scheme' };

  // Parse the rest. We avoid `new URL(...)` because its parser is permissive
  // (e.g. accepts `https://evil.com\@core.corpflowai.com/` in some Node
  // versions). Hand-parsing keeps the surface area small and exact.
  const afterScheme = raw.slice(ALLOWED_SCHEME.length);
  if (!afterScheme) return { ok: false, reason: 'empty_host' };

  // Hostname runs up to the first `/`, `?`, `#`, or end-of-string. A `:port`
  // or `user@host` form is rejected outright — neither is needed by Core or
  // any tenant host we own.
  const hostEndIdx = findHostEnd(afterScheme);
  const hostPart = afterScheme.slice(0, hostEndIdx);
  const pathPart = afterScheme.slice(hostEndIdx);

  if (!hostPart) return { ok: false, reason: 'empty_host' };
  if (hostPart.includes(':')) return { ok: false, reason: 'port_in_host' };
  if (hostPart.includes('@')) return { ok: false, reason: 'userinfo_in_host' };

  const host = hostPart.toLowerCase();
  if (!SAFE_HOSTNAME_RE.test(host)) return { ok: false, reason: 'malformed_hostname' };

  const allowSet = new Set(
    (Array.isArray(allowedHostnames) ? allowedHostnames : [])
      .map((h) => (typeof h === 'string' ? h.trim().toLowerCase() : ''))
      .filter(Boolean),
  );
  if (!allowSet.has(host)) return { ok: false, reason: 'host_not_allowed' };

  // Validate the path portion using the same rule as same-origin (with the
  // same allowQuery opt-in). Empty path is fine — treated as `/`.
  let path = pathPart || '/';
  if (path === '?' || path === '#') return { ok: false, reason: 'unsafe_path_chars' };
  // Same ordering as the same-origin branch above — traversal checks first
  // so encoded variants surface the precise reason code.
  if (path.includes('..')) return { ok: false, reason: 'path_traversal' };
  if (path.toLowerCase().includes('%2e%2e')) return { ok: false, reason: 'path_traversal_encoded' };
  const pathRe = opts.allowQuery === true ? SAFE_PATH_AND_QUERY_RE : SAFE_PATH_CHARS_RE;
  if (!pathRe.test(path)) return { ok: false, reason: 'unsafe_path_chars' };

  return {
    ok: true,
    redirect_to: `${ALLOWED_SCHEME}${host}${path}`,
    shape: 'absolute_url',
    hostname: host,
  };
}

/**
 * Find the index of the first character that terminates the hostname portion
 * of a URL: `/`, `?`, or `#`. Returns the input length if none of those
 * appear (e.g. `https://core.corpflowai.com` with no path).
 *
 * @param {string} afterScheme
 * @returns {number}
 */
function findHostEnd(afterScheme) {
  for (let i = 0; i < afterScheme.length; i += 1) {
    const c = afterScheme[i];
    if (c === '/' || c === '?' || c === '#') return i;
  }
  return afterScheme.length;
}

/**
 * Convenience: build the canonical "safe default" redirect when validation
 * fails or no `next` was supplied. Always `https://<first-core-host>/change`.
 * Falls back to `core.corpflowai.com` if the env value is empty/malformed.
 *
 * Mirrors the IM-4 `coreSwitchUrl` fallback logic — kept here separately to
 * avoid creating a cross-file dependency between server-only `redirect-policy`
 * and the browser-safe `lib/ui/tenant-host-switch-link.js`.
 *
 * @param {string | null | undefined} coreHostsEnv
 *   Raw value of CORPFLOW_CORE_HOSTS (caller reads cfg() and passes it in).
 * @returns {string}
 */
export function safeDefaultRedirect(coreHostsEnv) {
  const raw = coreHostsEnv != null ? String(coreHostsEnv) : '';
  const first = raw
    .split(',')
    .map((s) => s.trim().toLowerCase().replace(/:\d+$/, ''))
    .filter(Boolean)[0];
  const match = first ? /^([a-z0-9][a-z0-9.-]*[a-z0-9]|[a-z0-9])$/.exec(first) : null;
  const host = match ? match[1] : 'core.corpflowai.com';
  return `${ALLOWED_SCHEME}${host}/change`;
}
