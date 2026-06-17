/**
 * IM-5 (2026-06-15) — POST /api/membership/switch + POST /api/membership/leave.
 *
 * Canonical spec: docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §10 IM-5.
 *
 * Two state-changing Core-host-only endpoints that re-issue the session cookie
 * with a new `acting_tenant_id` (switch) or `null` (leave) value, and rotate
 * the CSRF token. Switch/leave success paths emit IM-7 audit rows
 * (`cmp.operator.switched_tenant` / `cmp.operator.left_tenant`); failures are
 * best-effort and never block the primary response.
 *
 * Gate order (matters for both diagnostics + log clarity; same order as IM-2):
 *
 *   1. Method check                       → 405 METHOD_NOT_ALLOWED, Allow: POST
 *   2. Core-host check                    → 403 SWITCH_NOT_ALLOWED_FROM_HOST
 *   3. Session check (must be DB-backed)  → 401 UNAUTHENTICATED
 *                                          → 400 NO_USER_ID_IN_SESSION
 *   4. CSRF check                         → 403 CSRF_TOKEN_INVALID
 *   5. Body shape check (switch only)     → 400 MISSING_TENANT_ID
 *                                          → 400 INVALID_TENANT_ID
 *   6. Effective-membership check         → 403 MEMBERSHIP_NOT_FOUND
 *   7. (Switch only) redirect target compute
 *   8. Cookie re-issue + JSON response
 *   9. (Any step 6-8 Prisma/mint error)   → 503 SWITCH_TEMPORARILY_UNAVAILABLE
 *
 * Authentication failures (steps 2-4) do NOT clear the existing session cookie
 * (per Anton's IM-5 approval correction #2). A user who triggers a CSRF
 * failure can immediately retry with a refreshed token; their session is intact.
 *
 * No production writes. No backfill. No tenant data mutation.
 */
import { cfg } from './runtime-config.js';
import {
  CORPFLOW_SESSION_COOKIE,
  getSessionFromRequest,
  setCookie,
  signSession,
} from './session.js';
import { requireCoreHost } from './host-policy.js';
import { validateCsrfToken, issueCsrfCookie } from './csrf.js';
import { getEffectiveMemberships } from './effective-memberships.js';
import { validateRedirectTarget } from './redirect-policy.js';
import {
  normalizeAuditSourceHost,
  recordOperatorSwitchLeaveAudit,
} from './audit-actor-context.js';

/**
 * Maximum length we accept for a tenant_id in the body. Real tenant IDs in
 * this repo are short slugs (`luxe-maurice`, `living-word-mauritius`); 200
 * chars is comfortably above any legitimate value while making abuse visible.
 */
const MAX_TENANT_ID_LEN = 200;

/**
 * Strict character class for tenant IDs — lowercase alphanumerics + `-`.
 * Matches the existing convention used everywhere in this repo (see
 * `lib/server/host-tenant-context.js` and tenant slug normalization).
 */
const TENANT_ID_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

/**
 * Parse the request body as JSON. Returns `{ ok: true, body }` or
 * `{ ok: false, error }`. Defensive — handles missing body, empty body, and
 * malformed JSON without throwing.
 *
 * @param {import('http').IncomingMessage & { body?: any }} req
 * @returns {Promise<{ ok: true, body: any } | { ok: false }>}
 */
async function readJsonBody(req) {
  // Vercel / Next.js often pre-parses JSON into req.body. Honor that first.
  if (req && req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return { ok: true, body: req.body };
  }
  if (req && typeof req.body === 'string') {
    try {
      return { ok: true, body: req.body ? JSON.parse(req.body) : {} };
    } catch {
      return { ok: false };
    }
  }
  // Fallback: read the stream ourselves.
  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
      if (chunks.reduce((a, c) => a + c.length, 0) > 8192) {
        // Bodies for these endpoints are tiny — anything > 8KB is suspect.
        return { ok: false };
      }
    }
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (!raw) return { ok: true, body: {} };
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

/**
 * Common gate: method, Core-host, session presence, DB-backed session, CSRF.
 * Returns `{ ok: true, sess }` when all gates pass; otherwise writes the
 * error response itself and returns `{ ok: false }`.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {{ ok: true, sess: any } | { ok: false }}
 */
function runCommonGates(req, res) {
  // 1. Method
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
    return { ok: false };
  }
  // 2. Core-host (reuses IM-2 helper — single source of truth)
  const hostCheck = requireCoreHost(req);
  if (!hostCheck.ok) {
    res.status(403).json({
      ok: false,
      error: 'SWITCH_NOT_ALLOWED_FROM_HOST',
      message:
        'This endpoint is only available on a Core host. Switch to the Core host (e.g. core.corpflowai.com) and retry.',
      host: hostCheck.host,
    });
    return { ok: false };
  }
  // 3. Session present + DB-backed
  const sess = getSessionFromRequest(req);
  if (!sess || sess.ok !== true) {
    res.status(401).json({ ok: false, error: 'UNAUTHENTICATED', reason: sess?.error || 'missing' });
    return { ok: false };
  }
  if (!sess.payload || !sess.payload.user_id) {
    // Legacy env-master or PIN session — they cannot switch. Existing cookie
    // is preserved (this is NOT a CSRF failure; it is a capability gate).
    res.status(400).json({
      ok: false,
      error: 'NO_USER_ID_IN_SESSION',
      message:
        'This action requires a database-backed session. Legacy env-master and PIN sessions cannot switch tenants.',
    });
    return { ok: false };
  }
  // 4. CSRF (DOUBLE-SUBMIT, reusing the dedicated helper). Critical: no
  // clearCookie call on failure — the existing session is preserved.
  const csrfCheck = validateCsrfToken(req);
  if (!csrfCheck.ok) {
    res.status(403).json({
      ok: false,
      error: 'CSRF_TOKEN_INVALID',
      message:
        'CSRF token missing or mismatched. The corpflow_csrf cookie and the X-CorpFlow-CSRF header must be present and equal.',
    });
    return { ok: false };
  }
  return { ok: true, sess };
}

/**
 * Re-issue the session + CSRF cookies with a new payload (same user_id,
 * possibly different acting_tenant_id, incremented session_version). Honors
 * the existing session TTL if discoverable from the current payload's exp,
 * otherwise falls back to the configured CORPFLOW_SESSION_TTL_SEC.
 *
 * Returns the new session payload object so the handler can include the
 * relevant fields in the JSON response.
 *
 * @param {import('http').ServerResponse} res
 * @param {{ typ: string, user_id: string, tenant_id?: string | null, username?: string | null, session_version?: number, exp?: number }} prevPayload
 * @param {string | null} newActingTenantId
 * @returns {{ ok: true, payload: any, csrfToken: string } | { ok: false, error: string }}
 */
function reissueSessionCookie(res, prevPayload, newActingTenantId) {
  const configuredTtl = Math.min(
    86400,
    Math.max(600, parseInt(cfg('CORPFLOW_SESSION_TTL_SEC', '43200'), 10) || 43200),
  );
  // Try to keep the remaining lifetime of the existing cookie (rather than
  // resetting the clock on every switch). Fall back to configured TTL if exp
  // is missing or already past.
  let ttlSec = configuredTtl;
  if (typeof prevPayload?.exp === 'number') {
    const now = Math.floor(Date.now() / 1000);
    const remaining = Number(prevPayload.exp) - now;
    if (remaining > 60) ttlSec = remaining;
  }

  const prevVersion = Number.isInteger(prevPayload?.session_version) ? prevPayload.session_version : 1;
  /** @type {Record<string, any>} */
  const newPayload = {
    typ: prevPayload.typ,
    user_id: prevPayload.user_id,
    tenant_id: prevPayload.tenant_id != null ? prevPayload.tenant_id : null,
    acting_tenant_id: newActingTenantId,
    session_version: prevVersion + 1,
  };
  if (prevPayload.username != null) newPayload.username = prevPayload.username;

  const signed = signSession(newPayload, { ttlSec });
  if (!signed.ok) {
    return { ok: false, error: signed.error || 'sign_failed' };
  }
  setCookie(res, CORPFLOW_SESSION_COOKIE, signed.token, { maxAgeSec: ttlSec });
  const csrfToken = issueCsrfCookie(res, { maxAgeSec: ttlSec });
  return { ok: true, payload: newPayload, csrfToken };
}

/**
 * POST /api/membership/switch
 *
 * Body: { tenant_id: string, next?: string }
 *
 * Dependency-injected for testability. Production call sites omit `deps`; the
 * handler then uses the canonical IM-2 helper (`getEffectiveMemberships`) and
 * the live Prisma tenant_hostnames lookup. Unit tests pass fake versions of
 * both via `deps` to exercise the post-DB paths (success, MEMBERSHIP_NOT_FOUND,
 * 503 on Prisma error) without a real database.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {{
 *   getEffectiveMembershipsFn?: (userId: string) => Promise<{ memberships?: any[] }>,
 *   tenantHostnameLookupFn?: (tenantId: string) => Promise<string | null>,
 * }} [deps]
 */
export async function handleMembershipSwitch(req, res, deps = {}) {
  const gate = runCommonGates(req, res);
  if (!gate.ok) return;
  const sess = gate.sess;

  const bodyRead = await readJsonBody(req);
  if (!bodyRead.ok) {
    res.status(400).json({ ok: false, error: 'INVALID_BODY', message: 'Request body must be valid JSON.' });
    return;
  }
  const body = bodyRead.body || {};

  // tenant_id presence + shape
  const rawTid = body && body.tenant_id != null ? body.tenant_id : '';
  if (typeof rawTid !== 'string' || rawTid.trim() === '') {
    res.status(400).json({ ok: false, error: 'MISSING_TENANT_ID' });
    return;
  }
  const targetTid = rawTid.trim().toLowerCase();
  if (targetTid.length > MAX_TENANT_ID_LEN || !TENANT_ID_RE.test(targetTid)) {
    res.status(400).json({ ok: false, error: 'INVALID_TENANT_ID' });
    return;
  }

  // Effective-membership check (single canonical helper from IM-2 — never
  // re-implement the rules here). Defensive try/catch downstream.
  const effFn = typeof deps.getEffectiveMembershipsFn === 'function'
    ? deps.getEffectiveMembershipsFn
    : getEffectiveMemberships;
  let memberships = [];
  try {
    const eff = await effFn(String(sess.payload.user_id));
    memberships = Array.isArray(eff?.memberships) ? eff.memberships : [];
  } catch (err) {
    try {
      console.warn('[membership/switch] getEffectiveMemberships failed:', err?.message || err);
    } catch (_) { /* logging best-effort */ }
    res.status(503).json({
      ok: false,
      error: 'SWITCH_TEMPORARILY_UNAVAILABLE',
      message: 'Membership lookup failed. Please retry.',
    });
    return;
  }
  const inSet = memberships.find((m) => String(m?.tenant_id || '').toLowerCase() === targetTid);
  if (!inSet) {
    // Uniform 403 — does NOT distinguish "never granted" from "revoked" from
    // "soft-deleted" to avoid leaking which tenants exist.
    res.status(403).json({ ok: false, error: 'MEMBERSHIP_NOT_FOUND' });
    return;
  }

  // Re-issue cookie (session + CSRF rotation).
  let reissue;
  try {
    reissue = reissueSessionCookie(res, sess.payload, targetTid);
  } catch (err) {
    try {
      console.warn('[membership/switch] reissue failed:', err?.message || err);
    } catch (_) { /* logging best-effort */ }
    res.status(503).json({ ok: false, error: 'SWITCH_TEMPORARILY_UNAVAILABLE' });
    return;
  }
  if (!reissue.ok) {
    res.status(503).json({ ok: false, error: 'SWITCH_TEMPORARILY_UNAVAILABLE', reason: reissue.error });
    return;
  }

  const fromTenantId =
    sess.payload.acting_tenant_id != null
      ? String(sess.payload.acting_tenant_id).trim() || null
      : null;
  try {
    const { PrismaClient } = await import('@prisma/client');
    const auditPrisma = new PrismaClient();
    try {
      await recordOperatorSwitchLeaveAudit({
        prisma: auditPrisma,
        eventType: 'cmp.operator.switched_tenant',
        actorUserId: String(sess.payload.user_id),
        fromTenantId,
        toTenantId: targetTid,
        sourceHost: normalizeAuditSourceHost(req),
        sessionVersion: reissue.payload.session_version,
        req,
      });
    } finally {
      try {
        await auditPrisma.$disconnect();
      } catch (_) {
        /* best-effort */
      }
    }
  } catch (err) {
    try {
      console.warn('[membership/switch] audit_write_failed', {
        event_type: 'cmp.operator.switched_tenant',
        actor_user_id_set: true,
        error: err?.message || String(err),
      });
    } catch (_) {
      /* logging best-effort */
    }
  }

  // Compute redirect target: validated `next` wins; else the tenant's primary
  // hostname + `/change` (looked up via TenantHostname); else safe Core default.
  const allowedHostnames = buildAllowedHostnamesForSwitch(memberships, inSet);
  let redirectTo = null;
  if (body && typeof body.next === 'string' && body.next.length > 0) {
    const v = validateRedirectTarget(body.next, allowedHostnames);
    if (v.ok === true) redirectTo = v.shape === 'absolute_url' ? v.redirect_to : null;
  }
  if (!redirectTo) {
    const hostnameFn = typeof deps.tenantHostnameLookupFn === 'function'
      ? deps.tenantHostnameLookupFn
      : lookupPrimaryTenantHostname;
    const tenantHost = inSet.primary_hostname || (await hostnameFn(inSet.tenant_id));
    redirectTo = tenantHost ? `https://${tenantHost}/change` : safeCoreChangeUrl();
  }

  res.status(200).json({
    ok: true,
    acting_tenant_id: targetTid,
    session_version: reissue.payload.session_version,
    redirect_to: redirectTo,
    tenant_name: inSet.tenant_name || null,
    csrf_token: reissue.csrfToken,
  });
}

/**
 * POST /api/membership/leave
 *
 * Body: { next?: string }
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export async function handleMembershipLeave(req, res) {
  const gate = runCommonGates(req, res);
  if (!gate.ok) return;
  const sess = gate.sess;

  const bodyRead = await readJsonBody(req);
  if (!bodyRead.ok) {
    res.status(400).json({ ok: false, error: 'INVALID_BODY', message: 'Request body must be valid JSON.' });
    return;
  }
  const body = bodyRead.body || {};

  let reissue;
  try {
    reissue = reissueSessionCookie(res, sess.payload, null);
  } catch (err) {
    try {
      console.warn('[membership/leave] reissue failed:', err?.message || err);
    } catch (_) { /* logging best-effort */ }
    res.status(503).json({ ok: false, error: 'SWITCH_TEMPORARILY_UNAVAILABLE' });
    return;
  }
  if (!reissue.ok) {
    res.status(503).json({ ok: false, error: 'SWITCH_TEMPORARILY_UNAVAILABLE', reason: reissue.error });
    return;
  }

  const fromTenantId =
    sess.payload.acting_tenant_id != null
      ? String(sess.payload.acting_tenant_id).trim() || null
      : null;
  try {
    const { PrismaClient } = await import('@prisma/client');
    const auditPrisma = new PrismaClient();
    try {
      await recordOperatorSwitchLeaveAudit({
        prisma: auditPrisma,
        eventType: 'cmp.operator.left_tenant',
        actorUserId: String(sess.payload.user_id),
        fromTenantId,
        toTenantId: null,
        sourceHost: normalizeAuditSourceHost(req),
        sessionVersion: reissue.payload.session_version,
        req,
      });
    } finally {
      try {
        await auditPrisma.$disconnect();
      } catch (_) {
        /* best-effort */
      }
    }
  } catch (err) {
    try {
      console.warn('[membership/leave] audit_write_failed', {
        event_type: 'cmp.operator.left_tenant',
        actor_user_id_set: true,
        error: err?.message || String(err),
      });
    } catch (_) {
      /* logging best-effort */
    }
  }

  // For /leave, the allow-list is Core hosts only (the user just left every
  // tenant context). We do NOT consume membership rows here — leave should
  // succeed even if the user has zero effective memberships at this moment.
  const coreHostsEnv = String(cfg('CORPFLOW_CORE_HOSTS', '')).trim();
  const allowedHostnames = coreHostsEnv
    ? coreHostsEnv.split(',').map((s) => s.trim().toLowerCase().replace(/:\d+$/, '')).filter(Boolean)
    : ['core.corpflowai.com'];

  let redirectTo = safeCoreChangeUrl();
  if (body && typeof body.next === 'string' && body.next.length > 0) {
    const v = validateRedirectTarget(body.next, allowedHostnames);
    if (v.ok === true && v.shape === 'absolute_url') redirectTo = v.redirect_to;
  }

  res.status(200).json({
    ok: true,
    acting_tenant_id: null,
    session_version: reissue.payload.session_version,
    redirect_to: redirectTo,
    csrf_token: reissue.csrfToken,
  });
}

/**
 * Build the hostname allow-list for a /switch request. Includes the target
 * tenant's primary hostname (if discoverable) PLUS the Core hosts. We
 * deliberately do NOT include other-tenant hostnames here — a switch to
 * tenant X should land on X or on Core, never on tenant Y.
 *
 * @param {any[]} _allMemberships
 * @param {any} targetMembership
 * @returns {string[]}
 */
function buildAllowedHostnamesForSwitch(_allMemberships, targetMembership) {
  const coreHostsEnv = String(cfg('CORPFLOW_CORE_HOSTS', '')).trim();
  const out = new Set();
  coreHostsEnv
    .split(',')
    .map((s) => s.trim().toLowerCase().replace(/:\d+$/, ''))
    .filter(Boolean)
    .forEach((h) => out.add(h));
  if (targetMembership && targetMembership.primary_hostname) {
    out.add(String(targetMembership.primary_hostname).trim().toLowerCase());
  }
  if (out.size === 0) out.add('core.corpflowai.com');
  return Array.from(out);
}

/**
 * Resolve a tenant's primary hostname from the tenant_hostnames table.
 * Returns null on miss or error — caller falls back to the safe Core URL.
 *
 * Uses a lazy `import('../server/effective-memberships.js')`-style read of
 * the shared Prisma client via getEffectiveMemberships's module would create
 * a circular dependency; instead we open a fresh client only here, scoped to
 * this one call. Acceptable cost for a one-shot lookup that only fires when
 * the caller didn't pre-attach `primary_hostname`.
 *
 * @param {string} tenantId
 * @returns {Promise<string | null>}
 */
async function lookupPrimaryTenantHostname(tenantId) {
  if (!tenantId) return null;
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    try {
      const row = await prisma.tenantHostname.findFirst({
        where: { tenantId: String(tenantId), enabled: true },
        select: { host: true },
        orderBy: { createdAt: 'asc' },
      });
      return row && row.host ? String(row.host).trim().toLowerCase() : null;
    } finally {
      try { await prisma.$disconnect(); } catch (_) { /* best-effort */ }
    }
  } catch (_) {
    return null;
  }
}

/**
 * Canonical safe Core `/change` URL. Reused by both handlers so a future
 * change lives in one place.
 *
 * @returns {string}
 */
function safeCoreChangeUrl() {
  const coreHostsEnv = String(cfg('CORPFLOW_CORE_HOSTS', '')).trim();
  const first = coreHostsEnv
    .split(',')
    .map((s) => s.trim().toLowerCase().replace(/:\d+$/, ''))
    .filter(Boolean)[0];
  const host = first || 'core.corpflowai.com';
  return `https://${host}/change`;
}

