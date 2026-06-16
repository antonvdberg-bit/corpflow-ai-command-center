/**
 * IM-3 (2026-06-16) — pure, browser-safe helpers backing the Core-host
 * workspace picker UX (`components/CoreTenantPicker.js`).
 *
 * Canonical spec: docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §10 IM-3.
 *
 * Scope (per Anton's IM-3 approval + guardrails 1, 2, 5, 6, 7):
 *
 *   - UI-only consumer of IM-2 (`GET /api/membership/effective`,
 *     `GET /api/ui/context`) and IM-5 (`POST /api/membership/switch`,
 *     `POST /api/membership/leave`, `corpflow_csrf` cookie).
 *   - NO server changes. NO new endpoints. NO new env vars. NO schema. NO writes.
 *   - Picker renders ONLY on Core hosts, ONLY for DB-backed logged-in sessions,
 *     ONLY when the user has ≥ 1 effective membership.
 *   - Every error mode visible to the operator. No silent failure.
 *   - No auto-redirect; server-supplied `redirect_to` is rendered as an
 *     explicit link the user clicks.
 *
 * This module contains ONLY pure functions — no React, no JSX, no DOM access
 * beyond a single `document.cookie` read (guarded for SSR). Every export is
 * unit-tested in `node-tests/im-3-picker-helpers.test.mjs`. The component
 * (`components/CoreTenantPicker.js`) calls these helpers and contains all
 * JSX so Next.js webpack transpiles the JSX and Node tests can exercise the
 * pure logic without a JSX runtime.
 */

/**
 * CSRF cookie + header names — INLINED here, NOT imported from
 * `lib/server/csrf.js`. The server module pulls in `node:crypto`, which
 * would break the browser bundle. Guardrail #1 also forbids modifying
 * server files, so we can't refactor csrf.js to expose a browser-safe
 * export. Drift is detected by `node-tests/im-3-picker-helpers.test.mjs`
 * which reads `lib/server/csrf.js` as text and asserts these two strings
 * match it case-insensitively.
 *
 * Why the header constant is mixed-case here but lowercase server-side:
 *   - HTTP header names are case-insensitive on the wire (RFC 9110 §5.1).
 *   - The browser preserves the case the JS code provides when building
 *     the request; we use the canonical mixed-case spelling
 *     `X-CorpFlow-CSRF` for readability + alignment with conventional
 *     X-… header style.
 *   - Node lowercases every incoming header name before exposing it via
 *     `req.headers`, so `lib/server/csrf.js` looks it up as
 *     `'x-corpflow-csrf'`. Both spellings describe the same header.
 */
export const CORPFLOW_CSRF_COOKIE = 'corpflow_csrf';
export const CORPFLOW_CSRF_HEADER = 'X-CorpFlow-CSRF';

/**
 * Stable IDs / strings the component renders + the tests assert on.
 * Tenant-host `/change` HTML must never contain any of these IDs (per IM-3
 * guardrail #5: "Tenant-host /change HTML must remain free of `Your
 * workspaces`, picker IDs, other tenant names, other tenant IDs, other
 * tenant hostnames").
 */
export const PICKER_SECTION_ID = 'cf-core-tenant-picker';
export const PICKER_HEADING_ID = 'cf-core-tenant-picker-heading';
export const PICKER_HEADING_TEXT = 'Your workspaces';
export const PICKER_STATUS_ID = 'cf-core-tenant-picker-status';
export const PICKER_LIST_ID = 'cf-core-tenant-picker-list';
export const PICKER_DATA_ATTR = 'data-cf-core-tenant-picker';
export const PICKER_ROW_DATA_ATTR = 'data-cf-core-tenant-picker-row';
export const PICKER_CSRF_UNAVAILABLE_DATA_ATTR = 'data-cf-csrf-unavailable';
export const PICKER_LEAVE_BUTTON_DATA_ATTR = 'data-cf-core-tenant-picker-leave';
export const PICKER_OPEN_REDIRECT_DATA_ATTR = 'data-cf-core-tenant-picker-open-redirect';

/**
 * Stable lifecycle / row states. Exported so component + tests use one
 * source of truth. Switch-statement style; the `unknown` state is a
 * defensive catch-all for tests.
 */
export const PICKER_LIFECYCLE = Object.freeze({
  INITIAL: 'initial',
  LOADING_MEMBERSHIPS: 'loading_memberships',
  READY: 'ready',
  MEMBERSHIPS_ERROR: 'memberships_error',
});

export const PICKER_ROW_STATE = Object.freeze({
  IDLE: 'idle',
  SUBMITTING: 'submitting',
  SUCCESS: 'success',
  ERROR: 'error',
});

/* ------------------------------- Render gate ------------------------------- */

/**
 * Pure decision: should the picker render on this request at all?
 *
 * The component uses this BOTH on initial mount and after `/api/ui/context`
 * resolves. The truth table is intentionally small and conservative so
 * tenant-host HTML stays clean (guardrail #5).
 *
 * Rules (every condition must hold; first false ⇒ false):
 *   1. `surface` must be the string 'core' (lowercased). Tenant hosts and
 *      unknown surfaces never render the picker.
 *   2. `sessionLogged` must be strictly true.
 *   3. `effectiveMembershipsCount` must be an integer ≥ 1 (null / undefined
 *      / 0 / negatives / non-integers all return false). A DB-backed user
 *      with zero memberships sees nothing — no empty "Your workspaces" panel
 *      that leaks the absence.
 *
 * @param {{
 *   surface?: string | null,
 *   sessionLogged?: boolean,
 *   effectiveMembershipsCount?: number | null,
 * } | null | undefined} args
 * @returns {boolean}
 */
export function shouldRenderPicker(args) {
  if (args == null || typeof args !== 'object') return false;
  if (args.surface !== 'core') return false;
  if (args.sessionLogged !== true) return false;
  const n = args.effectiveMembershipsCount;
  if (!Number.isInteger(n)) return false;
  if (n < 1) return false;
  return true;
}

/* ---------------------------- CSRF cookie reader --------------------------- */

/**
 * Read the `corpflow_csrf` cookie from `document.cookie`. SSR-safe — returns
 * null when `document` is undefined (Next.js server render path). Returns
 * null when the cookie is absent, empty, malformed, or only present among
 * other unrelated cookies.
 *
 * Browser `document.cookie` returns a `; `-separated string of
 * `name=value` pairs. Names are case-sensitive; values may be URL-encoded.
 *
 * @param {{ documentRef?: { cookie?: string } }} [opts]
 *   Dependency-injection seam for tests. Defaults to globalThis.document.
 * @returns {string | null}
 */
export function readCorpflowCsrfCookie(opts = {}) {
  const docRef = opts.documentRef !== undefined ? opts.documentRef : (typeof document !== 'undefined' ? document : null);
  if (!docRef || typeof docRef.cookie !== 'string') return null;
  const raw = docRef.cookie;
  if (!raw) return null;

  const parts = raw.split(';');
  // Walk LAST → FIRST so that if some browser path ever produced duplicates
  // we honor the most-recently-set value (matches the "last wins" semantics
  // the server's rotation pattern assumes).
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const part = parts[i];
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const name = part.slice(0, idx).trim();
    if (name !== CORPFLOW_CSRF_COOKIE) continue;
    const rawVal = part.slice(idx + 1).trim();
    if (!rawVal) return null;
    let val;
    try {
      val = decodeURIComponent(rawVal);
    } catch (_) {
      val = rawVal;
    }
    return val || null;
  }
  return null;
}

/* --------------------------- Request payload builders ---------------------- */

/**
 * Build the fetch options for `POST /api/membership/switch`. Returns the
 * complete `fetch` arg pair so the component just spreads it:
 *
 *   const [url, init] = buildSwitchRequest({ tenantId, csrfToken });
 *   const res = await fetch(url, init);
 *
 * Notes:
 *   - `credentials: 'same-origin'` so the session + CSRF cookies ride.
 *   - Body intentionally omits `next` (server computes the canonical
 *     redirect; we don't trust client-side hints for a security-sensitive
 *     redirect target).
 *   - tenant_id is sent as-is (server lowercases + validates).
 *   - Throws TypeError if csrfToken is missing — callers MUST check
 *     `readCorpflowCsrfCookie()` first and surface the no-cookie state
 *     visibly (no silent retry without a token).
 *
 * @param {{ tenantId: string, csrfToken: string }} args
 * @returns {[string, RequestInit]}
 */
export function buildSwitchRequest(args) {
  if (!args || typeof args !== 'object') {
    throw new TypeError('buildSwitchRequest requires { tenantId, csrfToken }');
  }
  const { tenantId, csrfToken } = args;
  if (typeof tenantId !== 'string' || !tenantId.trim()) {
    throw new TypeError('buildSwitchRequest requires non-empty tenantId');
  }
  if (typeof csrfToken !== 'string' || !csrfToken) {
    throw new TypeError('buildSwitchRequest requires non-empty csrfToken');
  }
  /** @type {RequestInit} */
  const init = {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      [CORPFLOW_CSRF_HEADER]: csrfToken,
    },
    body: JSON.stringify({ tenant_id: String(tenantId) }),
  };
  return ['/api/membership/switch', init];
}

/**
 * Build the fetch options for `POST /api/membership/leave`. Same contract
 * as buildSwitchRequest. Body is `{}` (no tenant_id required).
 *
 * @param {{ csrfToken: string }} args
 * @returns {[string, RequestInit]}
 */
export function buildLeaveRequest(args) {
  if (!args || typeof args !== 'object') {
    throw new TypeError('buildLeaveRequest requires { csrfToken }');
  }
  const { csrfToken } = args;
  if (typeof csrfToken !== 'string' || !csrfToken) {
    throw new TypeError('buildLeaveRequest requires non-empty csrfToken');
  }
  /** @type {RequestInit} */
  const init = {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      [CORPFLOW_CSRF_HEADER]: csrfToken,
    },
    body: JSON.stringify({}),
  };
  return ['/api/membership/leave', init];
}

/**
 * Build the fetch options for `GET /api/membership/effective`. Browser
 * default fetch is fine here; we still set `credentials: 'same-origin'`
 * explicitly so the session cookie rides on a CDN/edge configuration that
 * defaults to `omit`.
 *
 * @returns {[string, RequestInit]}
 */
export function buildEffectiveMembershipsRequest() {
  /** @type {RequestInit} */
  const init = {
    method: 'GET',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  };
  return ['/api/membership/effective', init];
}

/* ----------------------------- Response parsers --------------------------- */

/**
 * Map a server response (status + JSON body) into a stable shape the
 * component renders against. We do NOT throw — every input maps to one of
 * the well-defined outcomes below. Tests cover the full matrix; the
 * component just switches on `outcome.kind`.
 *
 * Outcomes:
 *   { kind: 'success', actingTenantId, sessionVersion, redirectTo,
 *     tenantName, csrfToken }
 *   { kind: 'csrf_invalid' }                  (403 CSRF_TOKEN_INVALID)
 *   { kind: 'membership_not_found' }          (403 MEMBERSHIP_NOT_FOUND)
 *   { kind: 'switch_not_allowed_from_host' }  (403 SWITCH_NOT_ALLOWED_FROM_HOST)
 *   { kind: 'unauthenticated' }               (401 UNAUTHENTICATED)
 *   { kind: 'no_user_id' }                    (400 NO_USER_ID_IN_SESSION)
 *   { kind: 'temporarily_unavailable' }       (503 SWITCH_TEMPORARILY_UNAVAILABLE)
 *   { kind: 'invalid_tenant_id', errorCode }  (400 MISSING_TENANT_ID/INVALID_TENANT_ID)
 *   { kind: 'method_not_allowed' }            (405 — defensive, should never happen on POST)
 *   { kind: 'unknown_error', status, errorCode } (everything else)
 *
 * @param {{ status: number, body?: any }} input
 * @returns {{ kind: string, [k: string]: any }}
 */
export function parseSwitchResponse(input) {
  const status = input && Number.isFinite(input.status) ? input.status : 0;
  const body = input && input.body && typeof input.body === 'object' ? input.body : {};
  const errorCode = typeof body.error === 'string' ? body.error : '';

  if (status >= 200 && status < 300 && body.ok === true) {
    return {
      kind: 'success',
      actingTenantId: body.acting_tenant_id != null ? String(body.acting_tenant_id) : null,
      sessionVersion: Number.isInteger(body.session_version) ? body.session_version : null,
      redirectTo: typeof body.redirect_to === 'string' ? body.redirect_to : null,
      tenantName: typeof body.tenant_name === 'string' ? body.tenant_name : null,
      csrfToken: typeof body.csrf_token === 'string' ? body.csrf_token : null,
    };
  }
  if (status === 401) return { kind: 'unauthenticated' };
  if (status === 400 && errorCode === 'NO_USER_ID_IN_SESSION') return { kind: 'no_user_id' };
  if (status === 400 && (errorCode === 'MISSING_TENANT_ID' || errorCode === 'INVALID_TENANT_ID')) {
    return { kind: 'invalid_tenant_id', errorCode };
  }
  if (status === 403 && errorCode === 'CSRF_TOKEN_INVALID') return { kind: 'csrf_invalid' };
  if (status === 403 && errorCode === 'MEMBERSHIP_NOT_FOUND') return { kind: 'membership_not_found' };
  if (status === 403 && errorCode === 'SWITCH_NOT_ALLOWED_FROM_HOST') {
    return { kind: 'switch_not_allowed_from_host' };
  }
  if (status === 405) return { kind: 'method_not_allowed' };
  if (status === 503) return { kind: 'temporarily_unavailable' };
  return { kind: 'unknown_error', status, errorCode };
}

/**
 * The /leave response shape is identical to /switch (same envelope), but
 * MEMBERSHIP_NOT_FOUND cannot occur (no tenant_id submitted) and
 * INVALID_TENANT_ID / MISSING_TENANT_ID likewise cannot occur. We share the
 * parser for consistency; tests assert the unreachable branches are simply
 * inert if a malformed server response ever appeared.
 *
 * @param {{ status: number, body?: any }} input
 * @returns {{ kind: string, [k: string]: any }}
 */
export function parseLeaveResponse(input) {
  return parseSwitchResponse(input);
}

/**
 * Parse the `GET /api/membership/effective` response. Maps to:
 *   { kind: 'ok', memberships: [{tenant_id, tenant_name, role, capability, source, …}] }
 *   { kind: 'unauthenticated' }
 *   { kind: 'switch_not_allowed_from_host' }   (defensive — should never fire on Core)
 *   { kind: 'unknown_error', status, errorCode }
 *
 * @param {{ status: number, body?: any }} input
 * @returns {{ kind: string, [k: string]: any }}
 */
export function parseEffectiveMembershipsResponse(input) {
  const status = input && Number.isFinite(input.status) ? input.status : 0;
  const body = input && input.body && typeof input.body === 'object' ? input.body : {};
  const errorCode = typeof body.error === 'string' ? body.error : '';

  if (status >= 200 && status < 300 && body.ok === true) {
    const memberships = Array.isArray(body.memberships) ? body.memberships.filter(isMembershipShape) : [];
    return { kind: 'ok', memberships };
  }
  if (status === 401) return { kind: 'unauthenticated' };
  if (status === 403 && errorCode === 'SWITCH_NOT_ALLOWED_FROM_HOST') {
    return { kind: 'switch_not_allowed_from_host' };
  }
  return { kind: 'unknown_error', status, errorCode };
}

function isMembershipShape(m) {
  return m
    && typeof m === 'object'
    && typeof m.tenant_id === 'string'
    && m.tenant_id.trim().length > 0;
}

/* ----------------------------- Error formatters --------------------------- */

/**
 * Map a parsed outcome `kind` to a stable, plain-English user-facing
 * message. NEVER returns the raw error code (those are for operators in
 * `console.debug`, not for users). NEVER returns null — every kind has a
 * fallback message.
 *
 * Tests assert string stability + that every PARSE outcome kind has a
 * non-empty message.
 *
 * @param {string} kind
 * @returns {string}
 */
export function formatErrorMessage(kind) {
  switch (kind) {
    case 'csrf_invalid':
      return 'Your workspace switching token expired. Reload this page to refresh.';
    case 'membership_not_found':
      return 'You no longer have access to that workspace.';
    case 'switch_not_allowed_from_host':
      return 'Workspace switching is only available from the Core console.';
    case 'unauthenticated':
      return 'Your session expired. Sign in again to continue.';
    case 'no_user_id':
      return 'Workspace switching requires a database-backed session. Sign out and back in to enable it.';
    case 'temporarily_unavailable':
      return 'We could not complete the action. Please retry in a moment.';
    case 'invalid_tenant_id':
      return 'That workspace identifier is not valid.';
    case 'method_not_allowed':
      return 'Unexpected response from the server. Please retry.';
    case 'csrf_unavailable':
      return 'Workspace switching requires a database-backed session. Sign out and back in to enable it.';
    case 'memberships_load_failed':
      return 'We could not load your workspaces. Please reload this page.';
    case 'network_error':
      return 'A network problem prevented the action. Check your connection and retry.';
    case 'unknown_error':
    default:
      return 'Something went wrong. Please reload this page and try again.';
  }
}

/* ------------------------------ Membership UI ----------------------------- */

/**
 * Decide the per-row visual + interactive state for a membership relative
 * to the current `acting_tenant_id`. Pure — the component renders the
 * output directly.
 *
 * Returns:
 *   {
 *     isCurrentlyActing: boolean,
 *     ariaCurrent: 'true' | undefined,
 *     switchButtonDisabled: boolean,
 *     switchButtonLabel: string,         // localized later if needed
 *     switchButtonAriaLabel: string,
 *   }
 *
 * @param {{ tenant_id: string, tenant_name?: string | null }} membership
 * @param {string | null} actingTenantId
 * @returns {{
 *   isCurrentlyActing: boolean,
 *   ariaCurrent: 'true' | undefined,
 *   switchButtonDisabled: boolean,
 *   switchButtonLabel: string,
 *   switchButtonAriaLabel: string,
 * }}
 */
export function describeMembershipRow(membership, actingTenantId) {
  const tenantId = membership && typeof membership.tenant_id === 'string' ? membership.tenant_id : '';
  const tenantName = membership && typeof membership.tenant_name === 'string' && membership.tenant_name
    ? membership.tenant_name
    : tenantId;
  const acting = typeof actingTenantId === 'string' && actingTenantId.length > 0 ? actingTenantId : null;
  const isCurrentlyActing = acting !== null && tenantId === acting;
  return {
    isCurrentlyActing,
    ariaCurrent: isCurrentlyActing ? 'true' : undefined,
    switchButtonDisabled: isCurrentlyActing,
    switchButtonLabel: isCurrentlyActing ? 'Currently acting' : `Switch to ${tenantName}`,
    switchButtonAriaLabel: isCurrentlyActing
      ? `Currently acting on ${tenantName}`
      : `Switch to ${tenantName}`,
  };
}

/**
 * Should the "Leave acting tenant" button be visible? True iff the user is
 * currently acting on a tenant.
 *
 * @param {string | null | undefined} actingTenantId
 * @returns {boolean}
 */
export function shouldShowLeaveButton(actingTenantId) {
  return typeof actingTenantId === 'string' && actingTenantId.length > 0;
}

/**
 * Build the "Open <tenant> Change Console" link the user clicks after a
 * successful switch / leave. Validates that the URL starts with `https://`
 * (server already validated against the allow-list; this is a belt-and-
 * braces check). Returns null if the URL is missing or unsafe — the
 * component then renders a fallback message instead of a broken link.
 *
 * @param {{ redirectTo?: string | null, tenantName?: string | null, isLeave?: boolean }} args
 * @returns {{ href: string, label: string, ariaLabel: string } | null}
 */
export function describeOpenRedirectLink(args) {
  const url = args && typeof args.redirectTo === 'string' ? args.redirectTo.trim() : '';
  if (!url) return null;
  if (!url.startsWith('https://')) return null;
  const tenantName = args && typeof args.tenantName === 'string' && args.tenantName ? args.tenantName : null;
  if (args && args.isLeave === true) {
    return {
      href: url,
      label: 'Open the Core console',
      ariaLabel: 'Open the Core console at the new location',
    };
  }
  const labelTenant = tenantName || 'the workspace';
  return {
    href: url,
    label: `Open ${labelTenant} Change Console`,
    ariaLabel: `Open the Change Console for ${labelTenant}`,
  };
}
