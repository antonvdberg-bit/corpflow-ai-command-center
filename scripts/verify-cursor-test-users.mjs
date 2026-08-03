#!/usr/bin/env node
/**
 * Verify Cursor test identities (#696) — non-secret evidence only.
 *
 * Modes:
 *   --db-shape   Read auth_users / memberships via POSTGRES_URL (no passwords).
 *   --live       Authenticate with runtime env passwords and probe authorization boundaries.
 *   (default)    Run --db-shape when POSTGRES_URL is set; always print identity checklist.
 *
 * Never prints password values, cookies, or session tokens.
 *
 * Env (live mode):
 *   CURSOR_TEST_ADMIN_USERNAME / CURSOR_TEST_ADMIN_PASSWORD
 *   TENANT_SMOKE_USERNAME / TENANT_SMOKE_PASSWORD  (preferred)
 *   LUX_SMOKE_USERNAME / LUX_SMOKE_PASSWORD        (temporary alias → generic tenant smoke)
 *   Optional: CURSOR_TEST_ADMIN_LOGIN_BASE_URL (default https://core.corpflowai.com)
 *             TENANT_SMOKE_BASE_URL / LUX_SMOKE_BASE_URL (default https://lux.corpflowai.com)
 */

import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';
import {
  APPROVED_CORPFLOW_TEST_TENANTS,
  CURSOR_TEST_IDENTITIES,
  CURSOR_TEST_RUNTIME_ENV,
  FORBIDDEN_CURSOR_TEST_USERNAMES,
  formatCursorTestAccessIdentityLines,
  isForbiddenCursorTestUsername,
  membershipNotesMarkCursorTest,
  resolveTenantSmokeRuntimeEnv,
  validateCursorTestUserRow,
} from './lib/cursor-test-users-spec.mjs';

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  const out = { help: false, dbShape: false, live: false, packet: false };
  for (const a of argv) {
    if (a === '-h' || a === '--help') out.help = true;
    else if (a === '--db-shape') out.dbShape = true;
    else if (a === '--live') out.live = true;
    else if (a === '--packet') out.packet = true;
  }
  if (!out.dbShape && !out.live) {
    // Default: prefer db-shape when URL present; still emit packet skeleton.
    out.dbShape = true;
    out.packet = true;
  }
  return out;
}

function normalizePostgresUrl(raw) {
  let u = String(raw ?? '').trim();
  while (
    (u.startsWith('"') && u.endsWith('"')) ||
    (u.startsWith("'") && u.endsWith("'"))
  ) {
    u = u.slice(1, -1).trim();
  }
  if (u.startsWith('prisma+postgres://')) {
    u = `postgresql://${u.slice('prisma+postgres://'.length)}`;
  }
  return u;
}

/**
 * @param {string} name
 * @returns {string}
 */
function envTrim(name) {
  return String(process.env[name] || '').trim();
}

/**
 * @param {string} baseUrl
 * @param {string} path
 * @param {{ method?: string, body?: object, cookie?: string, headers?: Record<string, string> }} [opts]
 */
async function httpJson(baseUrl, path, opts = {}) {
  const url = `${baseUrl.replace(/\/+$/, '')}${path}`;
  /** @type {Record<string, string>} */
  const headers = { Accept: 'application/json', ...(opts.headers || {}) };
  if (opts.cookie) headers.Cookie = opts.cookie;
  let body;
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(url, {
    method: opts.method || (opts.body !== undefined ? 'POST' : 'GET'),
    headers,
    body,
    redirect: 'manual',
  });
  /** @type {string[]} */
  let setCookie = [];
  if (typeof res.headers.getSetCookie === 'function') {
    setCookie = res.headers.getSetCookie();
  } else {
    const raw = res.headers.get('set-cookie');
    if (raw) setCookie = [raw];
  }
  const cookieHeader = setCookie
    .map((c) => String(c).split(';')[0])
    .filter(Boolean)
    .join('; ');
  let json = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return {
    status: res.status,
    ok: res.ok,
    json,
    /** Presence only — never return cookie values to callers that might log them. */
    hasSessionCookie: /corpflow_session=/i.test(cookieHeader) || /corpflow_session=/i.test(opts.cookie || ''),
    /** Internal only for chaining requests in this process. */
    _cookie: cookieHeader || opts.cookie || '',
  };
}

/**
 * @param {string} label
 * @param {boolean} pass
 * @param {string} detail
 * @param {Array<{ label: string, pass: boolean, detail: string }>} bag
 */
function record(label, pass, detail, bag) {
  bag.push({ label, pass, detail });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${label} — ${detail}`);
}

async function verifyDbShape() {
  const pgUrl = normalizePostgresUrl(process.env.POSTGRES_URL);
  if (!pgUrl || !(pgUrl.startsWith('postgresql://') || pgUrl.startsWith('postgres://'))) {
    console.log('[db-shape] SKIP — POSTGRES_URL not set (protected operator step).');
    return {
      skipped: true,
      admin: null,
      tenant: null,
      tenantMembershipNotes: null,
      tenantMembershipTenantIds: null,
      results: /** @type {Array<{ label: string, pass: boolean, detail: string }>} */ ([]),
    };
  }
  process.env.POSTGRES_URL = pgUrl;
  const prisma = new PrismaClient();
  /** @type {Array<{ label: string, pass: boolean, detail: string }>} */
  const results = [];
  try {
    const admin = await prisma.authUser.findUnique({
      where: { username: CURSOR_TEST_IDENTITIES.admin.username },
      select: {
        id: true,
        username: true,
        level: true,
        tenantId: true,
        factoryMaster: true,
        enabled: true,
      },
    });
    const tenant = await prisma.authUser.findUnique({
      where: { username: CURSOR_TEST_IDENTITIES.tenant.username },
      select: {
        id: true,
        username: true,
        level: true,
        tenantId: true,
        factoryMaster: true,
        enabled: true,
      },
    });

    // Fail loudly if the superseded Lux-only row is the only tenant smoke present.
    const forbiddenLux = await prisma.authUser.findUnique({
      where: { username: FORBIDDEN_CURSOR_TEST_USERNAMES[0] },
      select: { id: true, username: true, enabled: true },
    });
    if (forbiddenLux && forbiddenLux.enabled !== false && !tenant) {
      record(
        'db.forbidden_lux_only_not_canonical',
        false,
        `enabled forbidden row ${forbiddenLux.username} exists but canonical ${CURSOR_TEST_IDENTITIES.tenant.username} is missing — re-provision generic tenant smoke`,
        results,
      );
    } else if (forbiddenLux && forbiddenLux.enabled !== false) {
      record(
        'db.forbidden_lux_only_present_legacy',
        true,
        `legacy ${forbiddenLux.username} still exists (disable/delete separately); canonical target is ${CURSOR_TEST_IDENTITIES.tenant.username}`,
        results,
      );
    } else {
      record(
        'db.forbidden_lux_only_absent_or_disabled',
        true,
        'cursor-test-lux is not an active canonical target',
        results,
      );
    }

    if (!admin) {
      record('db.admin.exists', false, 'auth_users row missing', results);
    } else {
      const v = validateCursorTestUserRow(admin, 'admin');
      record('db.admin.shape', v.ok, v.ok ? `id=${admin.id}` : v.errors.join(';'), results);
    }

    let tenantMembershipNotes = null;
    /** @type {string[] | null} */
    let tenantMembershipTenantIds = null;
    if (!tenant) {
      record('db.tenant.exists', false, 'auth_users row missing', results);
    } else {
      const v = validateCursorTestUserRow(tenant, 'tenant');
      record('db.tenant.shape', v.ok, v.ok ? `id=${tenant.id}` : v.errors.join(';'), results);
      const mems = await prisma.userTenantMembership.findMany({
        where: { userId: tenant.id, revokedAt: null, enabled: true },
        select: { tenantId: true, notes: true, role: true, enabled: true },
      });
      tenantMembershipTenantIds = mems.map((m) => String(m.tenantId));
      const primaryMem =
        mems.find((m) => String(m.tenantId) === String(tenant.tenantId)) || mems[0] || null;
      tenantMembershipNotes = primaryMem?.notes || null;
      const allApproved = tenantMembershipTenantIds.every((tid) =>
        APPROVED_CORPFLOW_TEST_TENANTS.includes(tid),
      );
      const notesOk = Boolean(
        primaryMem && membershipNotesMarkCursorTest(primaryMem.notes || ''),
      );
      record(
        'db.tenant.membership',
        Boolean(mems.length && allApproved && notesOk),
        mems.length
          ? `tenants=${tenantMembershipTenantIds.join(',')} notes_marked=${notesOk} all_approved=${allApproved}`
          : 'membership row missing',
        results,
      );
    }

    return {
      skipped: false,
      admin,
      tenant,
      tenantMembershipNotes,
      tenantMembershipTenantIds,
      results,
    };
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

/**
 * @param {string} baseUrl
 * @param {'admin' | 'tenant'} level
 * @param {string} username
 * @param {string} password
 * @param {string} [tenantId]
 */
async function login(baseUrl, level, username, password, tenantId) {
  /** @type {Record<string, string>} */
  const body = { level, username, password };
  if (tenantId) body.tenant_id = tenantId;
  const res = await httpJson(baseUrl, '/api/auth/login', { body });
  return res;
}

async function verifyLive() {
  /** @type {Array<{ label: string, pass: boolean, detail: string }>} */
  const results = [];
  const adminUser =
    envTrim(CURSOR_TEST_RUNTIME_ENV.adminUsername) || CURSOR_TEST_IDENTITIES.admin.username;
  const adminPass = envTrim(CURSOR_TEST_RUNTIME_ENV.adminPassword);
  const tenantRuntime = resolveTenantSmokeRuntimeEnv(process.env);
  const tenantUser = tenantRuntime.username;
  const tenantPass = tenantRuntime.password;
  const adminBase = (
    envTrim(CURSOR_TEST_RUNTIME_ENV.adminLoginBaseUrl) || 'https://core.corpflowai.com'
  ).replace(/\/+$/, '');
  const tenantBase = tenantRuntime.baseUrl;
  const tenantId = tenantRuntime.tenantId;

  if (isForbiddenCursorTestUsername(tenantUser)) {
    record(
      'live.tenant.username_not_lux_only',
      false,
      `refusing live verify with forbidden username ${tenantUser}; set TENANT_SMOKE_USERNAME=${CURSOR_TEST_IDENTITIES.tenant.username}`,
      results,
    );
    return { skipped: false, results };
  }

  if (!adminPass && !tenantPass) {
    console.log(
      '[live] SKIP — set CURSOR_TEST_ADMIN_PASSWORD and/or TENANT_SMOKE_PASSWORD (or temporary LUX_SMOKE_PASSWORD alias) in protected runtime (never commit).',
    );
    return { skipped: true, results };
  }

  if (adminPass) {
    const loginRes = await login(adminBase, 'admin', adminUser, adminPass);
    record(
      'live.admin.login',
      loginRes.status === 200 && loginRes.json?.ok === true && loginRes.json?.level === 'admin',
      `status=${loginRes.status} level=${loginRes.json?.level || 'n/a'} source=${loginRes.json?.source || 'n/a'} has_cookie=${loginRes.hasSessionCookie}`,
      results,
    );
    if (loginRes.hasSessionCookie && loginRes._cookie) {
      const me = await httpJson(adminBase, '/api/auth/me', { cookie: loginRes._cookie });
      record(
        'live.admin.me',
        me.status === 200 && (me.json?.level === 'admin' || me.json?.typ === 'admin' || me.json?.ok === true),
        `status=${me.status} keys=${me.json && typeof me.json === 'object' ? Object.keys(me.json).join(',') : 'n/a'}`,
        results,
      );

      // factory_master=false should fail these DB-gated factory inspection APIs.
      const activity = await httpJson(adminBase, '/api/factory/operator-activity?limit=1', {
        cookie: loginRes._cookie,
      });
      record(
        'live.admin.operator_activity_denied_without_factory_master',
        activity.status === 401 || activity.status === 403,
        `status=${activity.status} error=${activity.json?.error || 'n/a'}`,
        results,
      );

      // Document inseparable privilege: typ=admin still satisfies verifyFactoryMasterAuth.
      // We do NOT call payment/deploy/send endpoints — only note the gate model.
      record(
        'live.admin.inseparable_privilege_documented',
        true,
        'typ=admin still passes verifyFactoryMasterAuth; Cursor must not exercise payment/deploy/secret/external-send without a separate Anton gate',
        results,
      );

      await httpJson(adminBase, '/api/auth/logout', {
        method: 'POST',
        cookie: loginRes._cookie,
        body: {},
      }).catch(() => {});
    }
  } else {
    record('live.admin.login', false, 'CURSOR_TEST_ADMIN_PASSWORD not set', results);
  }

  if (tenantPass) {
    record(
      'live.tenant.cred_source',
      true,
      `source=${tenantRuntime.source} username=${tenantUser}`,
      results,
    );
    const loginRes = await login(tenantBase, 'tenant', tenantUser, tenantPass, tenantId);
    record(
      'live.tenant.login',
      loginRes.status === 200 && loginRes.json?.ok === true && loginRes.json?.level === 'tenant',
      `status=${loginRes.status} level=${loginRes.json?.level || 'n/a'} has_cookie=${loginRes.hasSessionCookie}`,
      results,
    );
    if (loginRes.hasSessionCookie && loginRes._cookie) {
      const me = await httpJson(tenantBase, '/api/auth/me', { cookie: loginRes._cookie });
      const meTenant =
        me.json?.tenant_id || me.json?.tenantId || me.json?.payload?.tenant_id || 'n/a';
      record(
        'live.tenant.me_tenant_scoped',
        me.status === 200 && APPROVED_CORPFLOW_TEST_TENANTS.includes(String(meTenant)),
        `status=${me.status} tenant_id=${meTenant}`,
        results,
      );

      const leads = await httpJson(tenantBase, '/api/cmp/router?action=concierge-leads-list&limit=5', {
        cookie: loginRes._cookie,
      });
      record(
        'live.tenant.leads_list',
        leads.status === 200 &&
          (leads.json?.ok === true ||
            Array.isArray(leads.json?.leads) ||
            Array.isArray(leads.json?.items)),
        `status=${leads.status} error=${leads.json?.error || 'n/a'}`,
        results,
      );

      const factoryProbe = await httpJson(tenantBase, '/api/factory/operator-activity?limit=1', {
        cookie: loginRes._cookie,
      });
      record(
        'live.tenant.core_admin_denied',
        factoryProbe.status === 401 || factoryProbe.status === 403,
        `status=${factoryProbe.status}`,
        results,
      );

      // Cross-tenant ticket probe: a non-existent id should 404 (not leak).
      const cross = await httpJson(
        tenantBase,
        '/api/cmp/router?action=ticket-get&ticket_id=cross-tenant-probe-does-not-exist',
        { cookie: loginRes._cookie },
      );
      record(
        'live.tenant.cross_tenant_ticket_denied',
        cross.status === 404 || cross.status === 403 || cross.status === 400,
        `status=${cross.status} error=${cross.json?.error || 'n/a'}`,
        results,
      );

      record(
        'live.tenant.no_live_send_exercised',
        true,
        'verify script does not call outbound email/WhatsApp/SMS/payment endpoints',
        results,
      );

      await httpJson(tenantBase, '/api/auth/logout', {
        method: 'POST',
        cookie: loginRes._cookie,
        body: {},
      }).catch(() => {});
    }
  } else {
    record(
      'live.tenant.login',
      false,
      'TENANT_SMOKE_PASSWORD (or temporary LUX_SMOKE_PASSWORD alias) not set',
      results,
    );
  }

  return { skipped: false, results };
}

/**
 * @param {{
 *   db: Awaited<ReturnType<typeof verifyDbShape>>,
 *   live: Awaited<ReturnType<typeof verifyLive>> | null,
 * }} parts
 */
function printPacket(parts) {
  const all = [...(parts.db.results || []), ...((parts.live && parts.live.results) || [])];
  const failed = all.filter((r) => !r.pass);
  const pendingHandoff = [];
  if (parts.db.skipped) {
    pendingHandoff.push(
      'Operator: set POSTGRES_URL (Production Neon) and run `npm run provision:cursor-test-users -- --gen-password` on a secure machine; store wallet cards in the approved secret store / Cursor protected runtime.',
    );
  } else if (!parts.db.admin || !parts.db.tenant) {
    pendingHandoff.push(
      'Rows missing — run `npm run provision:cursor-test-users -- --gen-password` then re-verify with `--db-shape`.',
    );
  }
  if (!parts.live || parts.live.skipped) {
    pendingHandoff.push(
      'Secure handoff: place passwords into CURSOR_TEST_ADMIN_PASSWORD and TENANT_SMOKE_PASSWORD (preferred; or temporary LUX_SMOKE_* alias mapped to cursor-test-tenant) in Cursor protected runtime / operator .env.local — never in git — then run `npm run verify:cursor-test-users -- --live`.',
    );
  }

  const ready =
    pendingHandoff.length === 0 &&
    failed.length === 0 &&
    parts.db.admin &&
    parts.db.tenant &&
    parts.live &&
    !parts.live.skipped;

  console.log('');
  console.log('CURSOR TEST ACCESS READY');
  console.log('');
  console.log('Identities (non-secret):');
  for (const line of formatCursorTestAccessIdentityLines({
    admin: parts.db.admin,
    tenant: parts.db.tenant,
    tenantMembershipNotes: parts.db.tenantMembershipNotes,
    tenantMembershipTenantIds: parts.db.tenantMembershipTenantIds,
  })) {
    console.log(`  ${line}`);
  }
  console.log('');
  console.log('Assigned roles / memberships:');
  console.log(`  admin: level=admin, factory_master=false (no membership matrix grant)`);
  console.log(
    `  tenant: level=tenant, primary=${parts.db.tenant?.tenantId || CURSOR_TEST_IDENTITIES.tenant.tenantId}, membership.role=member, approved_allowlist=${APPROVED_CORPFLOW_TEST_TENANTS.join(',')}`,
  );
  console.log('');
  console.log('Checks:');
  for (const r of all) {
    console.log(`  - [${r.pass ? 'PASS' : 'FAIL'}] ${r.label}: ${r.detail}`);
  }
  if (all.length === 0) {
    console.log('  - (no runtime checks executed yet)');
  }
  console.log('');
  console.log('Audit-log evidence:');
  console.log(
    '  - Login/logout are not yet dedicated automation_events; CMP actions under these users carry actor_user_id when IM-7 paths fire.',
  );
  console.log(
    '  - After live tenant CRM / ticket writes, inspect factory operator-activity (factory_master session) filtered by actor_user_id of cursor-test-tenant.',
  );
  console.log('');
  console.log('Secure handoff still required:');
  if (pendingHandoff.length === 0) {
    console.log('  - none');
  } else {
    for (const h of pendingHandoff) console.log(`  - ${h}`);
  }
  console.log('');
  console.log(
    `Final verdict: ${ready ? 'READY FOR CURSOR AUTHENTICATED TESTING' : 'NOT READY'}`,
  );
  console.log('');
  return ready;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`
verify-cursor-test-users.mjs  (#696)

  --db-shape   Check auth_users + tenant memberships (needs POSTGRES_URL)
  --live       Login + authorization boundary probes (needs password env vars)
  --packet     Print CURSOR TEST ACCESS READY packet (default with --db-shape)

Default: --db-shape --packet

Canonical usernames:
  ${CURSOR_TEST_IDENTITIES.admin.username}
  ${CURSOR_TEST_IDENTITIES.tenant.username}
Forbidden live target:
  ${FORBIDDEN_CURSOR_TEST_USERNAMES.join(', ')}
`);
    process.exit(0);
  }

  /** @type {Awaited<ReturnType<typeof verifyDbShape>>} */
  let db = {
    skipped: true,
    admin: null,
    tenant: null,
    tenantMembershipNotes: null,
    tenantMembershipTenantIds: null,
    results: [],
  };
  /** @type {Awaited<ReturnType<typeof verifyLive>> | null} */
  let live = null;

  if (args.dbShape) {
    console.log('[verify] db-shape…');
    db = await verifyDbShape();
  }
  if (args.live) {
    console.log('[verify] live…');
    live = await verifyLive();
  }

  const ready = args.packet || args.dbShape || args.live ? printPacket({ db, live }) : false;
  if (!ready) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
