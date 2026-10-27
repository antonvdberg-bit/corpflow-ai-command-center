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
 *   TENANT_SMOKE_USERNAME / TENANT_SMOKE_PASSWORD
 *   BAD_TEST_BUYER_USERNAME / BAD_TEST_BUYER_PASSWORD
 *   Optional: CURSOR_TEST_ADMIN_LOGIN_BASE_URL (default https://core.corpflowai.com)
 *             LUX_SMOKE_BASE_URL (default https://lux.corpflowai.com)
 */

import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';
import {
  CURSOR_TEST_IDENTITIES,
  CURSOR_TEST_RUNTIME_ENV,
  formatCursorTestAccessIdentityLines,
  membershipNotesMarkCursorTest,
  validateCursorTestUserRow,
} from './lib/cursor-test-users-spec.mjs';

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  const out = { help: false, dbShape: false, live: false, packet: false, only: 'all' };
  for (const a of argv) {
    if (a === '-h' || a === '--help') out.help = true;
    else if (a === '--db-shape') out.dbShape = true;
    else if (a === '--live') out.live = true;
    else if (a === '--packet') out.packet = true;
    else if (a.startsWith('--only=')) {
      const v = a.slice('--only='.length).trim().toLowerCase();
      if (v === 'admin' || v === 'lux' || v === 'bad' || v === 'all') out.only = v;
      else {
        console.error(`ERROR: --only must be admin|lux|bad|all (got ${v})`);
        process.exit(1);
      }
    }
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

async function verifyDbShape(only = 'all') {
  const pgUrl = normalizePostgresUrl(process.env.POSTGRES_URL);
  if (!pgUrl || !(pgUrl.startsWith('postgresql://') || pgUrl.startsWith('postgres://'))) {
    console.log('[db-shape] SKIP — POSTGRES_URL not set (protected operator step).');
    return {
      skipped: true,
      admin: null,
      lux: null,
      bad: null,
      luxMembershipNotes: null,
      badMembershipNotes: null,
      results: /** @type {Array<{ label: string, pass: boolean, detail: string }>} */ ([]),
    };
  }
  process.env.POSTGRES_URL = pgUrl;
  const prisma = new PrismaClient();
  /** @type {Array<{ label: string, pass: boolean, detail: string }>} */
  const results = [];
  try {
    const admin = only === 'lux' || only === 'bad'
      ? null
      : await prisma.authUser.findUnique({
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
    const lux = only === 'admin' || only === 'bad'
      ? null
      : await prisma.authUser.findUnique({
      where: { username: CURSOR_TEST_IDENTITIES.lux.username },
      select: {
        id: true,
        username: true,
        level: true,
        tenantId: true,
        factoryMaster: true,
        enabled: true,
      },
      });
    const bad = only !== 'bad'
      ? null
      : await prisma.authUser.findUnique({
        where: { username: CURSOR_TEST_IDENTITIES.bad.username },
        select: {
          id: true,
          username: true,
          level: true,
          tenantId: true,
          factoryMaster: true,
          enabled: true,
        },
      });

    if (only === 'all' || only === 'admin') {
      if (!admin) {
        record('db.admin.exists', false, 'auth_users row missing', results);
      } else {
      const v = validateCursorTestUserRow(admin, 'admin');
      record('db.admin.shape', v.ok, v.ok ? `id=${admin.id}` : v.errors.join(';'), results);
      }
    }

    let luxMembershipNotes = null;
    if (only === 'all' || only === 'lux') {
      if (!lux) {
        record('db.lux.exists', false, 'auth_users row missing', results);
      } else {
      const v = validateCursorTestUserRow(lux, 'lux');
      record('db.lux.shape', v.ok, v.ok ? `id=${lux.id}` : v.errors.join(';'), results);
      const mem = await prisma.userTenantMembership.findFirst({
        where: { userId: lux.id, tenantId: 'luxe-maurice', revokedAt: null },
        select: { notes: true, role: true, enabled: true },
      });
      luxMembershipNotes = mem?.notes || null;
      record(
        'db.lux.membership',
        Boolean(mem && mem.enabled !== false && membershipNotesMarkCursorTest(mem.notes || '')),
        mem
          ? `role=${mem.role} notes_marked=${membershipNotesMarkCursorTest(mem.notes || '')}`
          : 'membership row missing',
        results,
      );
      }
    }

    let badMembershipNotes = null;
    if (only === 'bad') {
      if (!bad) {
        record('db.bad.exists', false, 'auth_users row missing', results);
      } else {
        const v = validateCursorTestUserRow(bad, 'bad');
        record('db.bad.shape', v.ok, v.ok ? `id=${bad.id}` : v.errors.join(';'), results);
        const mem = await prisma.userTenantMembership.findFirst({
          where: { userId: bad.id, tenantId: 'cipc-desk', revokedAt: null },
          select: { notes: true, role: true, enabled: true },
        });
        badMembershipNotes = mem?.notes || null;
        record(
          'db.bad.membership',
          Boolean(mem && mem.enabled !== false && mem.role === 'member' && membershipNotesMarkCursorTest(mem.notes || '')),
          mem
            ? `role=${mem.role} notes_marked=${membershipNotesMarkCursorTest(mem.notes || '')}`
            : 'membership row missing',
          results,
        );
      }
    }

    return { skipped: false, admin, lux, bad, luxMembershipNotes, badMembershipNotes, results };
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

async function verifyLive(only = 'all') {
  /** @type {Array<{ label: string, pass: boolean, detail: string }>} */
  const results = [];
  const adminUser =
    envTrim(CURSOR_TEST_RUNTIME_ENV.adminUsername) || CURSOR_TEST_IDENTITIES.admin.username;
  const adminPass = envTrim(CURSOR_TEST_RUNTIME_ENV.adminPassword);
  const luxUser = envTrim(CURSOR_TEST_RUNTIME_ENV.luxUsername) || CURSOR_TEST_IDENTITIES.lux.username;
  const luxPass = envTrim(CURSOR_TEST_RUNTIME_ENV.luxPassword);
  const badUser =
    envTrim(CURSOR_TEST_RUNTIME_ENV.badUsername) || CURSOR_TEST_IDENTITIES.bad.username;
  const badPass = envTrim(CURSOR_TEST_RUNTIME_ENV.badPassword);
  const adminBase = (
    envTrim(CURSOR_TEST_RUNTIME_ENV.adminLoginBaseUrl) || 'https://core.corpflowai.com'
  ).replace(/\/+$/, '');
  const luxBase = (envTrim(CURSOR_TEST_RUNTIME_ENV.luxBaseUrl) || 'https://lux.corpflowai.com').replace(
    /\/+$/,
    '',
  );
  const badBase = (envTrim(CURSOR_TEST_RUNTIME_ENV.badBaseUrl) || 'https://businessadmindesk.co.za').replace(
    /\/+$/,
    '',
  );

  if (only === 'bad' && badUser !== CURSOR_TEST_IDENTITIES.bad.username) {
    console.log(
      `[live] SKIP — ${CURSOR_TEST_RUNTIME_ENV.badUsername} must equal the approved BAD username; refusing to authenticate another identity.`,
    );
    return { skipped: true, results };
  }
  if (only === 'bad' && badBase !== 'https://businessadmindesk.co.za') {
    console.log(
      `[live] SKIP — ${CURSOR_TEST_RUNTIME_ENV.badBaseUrl} must resolve to https://businessadmindesk.co.za; refusing to probe another host.`,
    );
    return { skipped: true, results };
  }

  if (
    (only === 'bad' && !badPass) ||
    (only !== 'bad' && !adminPass && !luxPass)
  ) {
    console.log(
      only === 'bad'
        ? `[live] SKIP — set ${CURSOR_TEST_RUNTIME_ENV.badPassword} in the protected runtime (never commit).`
        : '[live] SKIP — set CURSOR_TEST_ADMIN_PASSWORD and/or TENANT_SMOKE_PASSWORD in protected runtime (never commit).',
    );
    return { skipped: true, results };
  }

  if (only !== 'bad' && adminPass) {
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
  } else if (only !== 'bad') {
    record('live.admin.login', false, 'CURSOR_TEST_ADMIN_PASSWORD not set', results);
  }

  if (only !== 'bad' && luxPass) {
    const loginRes = await login(luxBase, 'tenant', luxUser, luxPass, 'luxe-maurice');
    record(
      'live.lux.login',
      loginRes.status === 200 && loginRes.json?.ok === true && loginRes.json?.level === 'tenant',
      `status=${loginRes.status} level=${loginRes.json?.level || 'n/a'} has_cookie=${loginRes.hasSessionCookie}`,
      results,
    );
    if (loginRes.hasSessionCookie && loginRes._cookie) {
      const me = await httpJson(luxBase, '/api/auth/me', { cookie: loginRes._cookie });
      const meTenant =
        me.json?.tenant_id || me.json?.tenantId || me.json?.payload?.tenant_id || 'n/a';
      record(
        'live.lux.me_tenant_scoped',
        me.status === 200 && String(meTenant) === 'luxe-maurice',
        `status=${me.status} tenant_id=${meTenant}`,
        results,
      );

      const leads = await httpJson(luxBase, '/api/cmp/router?action=concierge-leads-list&limit=5', {
        cookie: loginRes._cookie,
      });
      record(
        'live.lux.leads_list',
        leads.status === 200 && (leads.json?.ok === true || Array.isArray(leads.json?.leads) || Array.isArray(leads.json?.items)),
        `status=${leads.status} error=${leads.json?.error || 'n/a'}`,
        results,
      );

      const factoryProbe = await httpJson(luxBase, '/api/factory/operator-activity?limit=1', {
        cookie: loginRes._cookie,
      });
      record(
        'live.lux.core_admin_denied',
        factoryProbe.status === 401 || factoryProbe.status === 403,
        `status=${factoryProbe.status}`,
        results,
      );

      // Cross-tenant ticket probe: a non-Lux id should 404 (not leak).
      const cross = await httpJson(
        luxBase,
        '/api/cmp/router?action=ticket-get&ticket_id=cross-tenant-probe-does-not-exist',
        { cookie: loginRes._cookie },
      );
      record(
        'live.lux.cross_tenant_ticket_denied',
        cross.status === 404 || cross.status === 403 || cross.status === 400,
        `status=${cross.status} error=${cross.json?.error || 'n/a'}`,
        results,
      );

      record(
        'live.lux.no_live_send_exercised',
        true,
        'verify script does not call outbound email/WhatsApp/SMS/payment endpoints',
        results,
      );

      await httpJson(luxBase, '/api/auth/logout', {
        method: 'POST',
        cookie: loginRes._cookie,
        body: {},
      }).catch(() => {});
    }
  } else if (only !== 'bad') {
    record('live.lux.login', false, 'LUX_SMOKE_PASSWORD not set', results);
  }

  if (only === 'bad' && badPass) {
    const loginRes = await login(badBase, 'tenant', badUser, badPass, 'cipc-desk');
    record(
      'live.bad.login',
      loginRes.status === 200 &&
        loginRes.json?.ok === true &&
        loginRes.json?.level === 'tenant',
      `status=${loginRes.status} level=${loginRes.json?.level || 'n/a'} has_cookie=${loginRes.hasSessionCookie}`,
      results,
    );
    if (loginRes.hasSessionCookie && loginRes._cookie) {
      const me = await httpJson(badBase, '/api/auth/me', { cookie: loginRes._cookie });
      const meTenant =
        me.json?.tenant_id || me.json?.tenantId || me.json?.payload?.tenant_id || 'n/a';
      record(
        'live.bad.me_home_tenant',
        me.status === 200 && String(meTenant) === 'cipc-desk',
        `status=${me.status} tenant_id=${meTenant}`,
        results,
      );
      const factoryProbe = await httpJson(badBase, '/api/factory/operator-activity?limit=1', {
        cookie: loginRes._cookie,
      });
      record(
        'live.bad.factory_denied',
        factoryProbe.status === 401 || factoryProbe.status === 403,
        `status=${factoryProbe.status}`,
        results,
      );
      record(
        'live.bad.no_live_send_exercised',
        true,
        'verify script does not call payment, ERPNext, or outbound messaging endpoints',
        results,
      );
      await httpJson(badBase, '/api/auth/logout', {
        method: 'POST',
        cookie: loginRes._cookie,
        body: {},
      }).catch(() => {});
    }
  }

  return { skipped: false, results };
}

/**
 * @param {string} only
 * @param {{
 *   db: Awaited<ReturnType<typeof verifyDbShape>>,
 *   live: Awaited<ReturnType<typeof verifyLive>> | null,
 * }} parts
 */
function printPacket(only, parts) {
  const all = [...(parts.db.results || []), ...((parts.live && parts.live.results) || [])];
  const failed = all.filter((r) => !r.pass);
  const pendingHandoff = [];
  if (parts.db.skipped) {
    pendingHandoff.push(
      only === 'bad'
        ? 'Operator: set POSTGRES_URL and BAD_TEST_BUYER_PASSWORD only through the approved secure channels, then run the explicit BAD provision and verification commands.'
        : 'Operator: set POSTGRES_URL (Production Neon) and run `npm run provision:cursor-test-users -- --gen-password` on a secure machine; store wallet cards in the approved secret store / Cursor protected runtime.',
    );
  } else if (
    (only === 'bad' && (!parts.db.bad || !parts.db.badMembershipNotes)) ||
    (only !== 'bad' && (!parts.db.admin || !parts.db.lux))
  ) {
    pendingHandoff.push(
      only === 'bad'
        ? 'BAD row or membership missing — on a secure operator runtime set BAD_TEST_BUYER_PASSWORD and run `npm run provision:cursor-test-users -- --only=bad`, then re-verify with `--only=bad --db-shape`.'
        : 'Rows missing — run `npm run provision:cursor-test-users -- --gen-password` then re-verify with `--db-shape`.',
    );
  }
  if (!parts.live || parts.live.skipped) {
    pendingHandoff.push(
      only === 'bad'
        ? 'Secure handoff: place BAD_TEST_BUYER_PASSWORD (and optional BAD_TEST_BUYER_USERNAME/BAD_TEST_BUYER_BASE_URL) in the protected runtime only, then run `npm run verify:cursor-test-users -- --only=bad --live`.'
        : 'Secure handoff: place passwords into CURSOR_TEST_ADMIN_PASSWORD and TENANT_SMOKE_PASSWORD (and matching USERNAME vars) in Cursor protected runtime / operator .env.local — never in git — then run `npm run verify:cursor-test-users -- --live`.',
    );
  }

  const ready =
    pendingHandoff.length === 0 &&
    failed.length === 0 &&
    (only === 'bad' ? parts.db.bad && parts.db.badMembershipNotes : parts.db.admin && parts.db.lux) &&
    parts.live &&
    !parts.live.skipped;

  console.log('');
  console.log('CURSOR TEST ACCESS READY');
  console.log('');
  console.log('Identities (non-secret):');
  for (const line of formatCursorTestAccessIdentityLines({
    admin: parts.db.admin,
    lux: parts.db.lux,
    bad: parts.db.bad,
    luxMembershipNotes: parts.db.luxMembershipNotes,
    badMembershipNotes: parts.db.badMembershipNotes,
  })) {
    console.log(`  ${line}`);
  }
  console.log('');
  console.log('Assigned roles / memberships:');
  console.log(`  admin: level=admin, factory_master=false (no membership matrix grant)`);
  console.log(`  lux: level=tenant, tenant_id=luxe-maurice, membership.role=member`);
  if (only === 'bad') {
    console.log(`  bad: level=tenant, tenant_id=cipc-desk, membership.role=member`);
  }
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
    '  - After live Lux CRM / ticket writes, inspect factory operator-activity (factory_master session) filtered by actor_user_id of cursor-test-lux.',
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

  --only=admin|lux|bad|all  Select one identity; default all (BAD is explicit-only)
  --db-shape   Check auth_users + membership (needs POSTGRES_URL)
  --live       Login + authorization boundary probes (needs password env vars)
  --packet     Print CURSOR TEST ACCESS READY packet (default with --db-shape)

Default: --db-shape --packet
`);
    process.exit(0);
  }

  /** @type {Awaited<ReturnType<typeof verifyDbShape>>} */
  let db = {
    skipped: true,
    admin: null,
    lux: null,
    bad: null,
    luxMembershipNotes: null,
    badMembershipNotes: null,
    results: [],
  };
  /** @type {Awaited<ReturnType<typeof verifyLive>> | null} */
  let live = null;

  if (args.dbShape) {
    console.log('[verify] db-shape…');
    db = await verifyDbShape(args.only);
  }
  if (args.live) {
    console.log('[verify] live…');
    live = await verifyLive(args.only);
  }

  const ready = args.packet || args.dbShape || args.live ? printPacket(args.only, { db, live }) : false;
  if (!ready) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
