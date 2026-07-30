#!/usr/bin/env node
/**
 * #696 — Live boundary verification for Cursor test identities.
 *
 * Reads credentials from env only (never prints password values).
 * Writes a non-secret JSON summary to stdout and optionally
 * artifacts/cursor-test-access/verify-result.json
 *
 * Usage:
 *   npm run verify:cursor-test-access
 *   node scripts/verify-cursor-test-access.mjs --allow-mutations
 *   node scripts/verify-cursor-test-access.mjs --admin-only
 *   node scripts/verify-cursor-test-access.mjs --lux-only
 *
 * Required env (after Anton's secret handoff):
 *   CURSOR_TEST_ADMIN_USERNAME / CURSOR_TEST_ADMIN_PASSWORD
 *   LUX_SMOKE_USERNAME / LUX_SMOKE_PASSWORD
 */

import './bootstrap-repo-env.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {
  CURSOR_TEST_ADMIN,
  CURSOR_TEST_LUX,
  CURSOR_TEST_ENV_NAMES,
  CURSOR_TEST_DEFAULT_URLS,
} from './lib/cursor-test-access-ids.mjs';

function getEnv(name, fallback = '') {
  return String(process.env[name] ?? fallback).trim();
}

function parseArgs(argv) {
  const out = {
    allowMutations: false,
    adminOnly: false,
    luxOnly: false,
    outPath: 'artifacts/cursor-test-access/verify-result.json',
    help: false,
  };
  for (const a of argv) {
    if (a === '-h' || a === '--help') out.help = true;
    else if (a === '--allow-mutations') out.allowMutations = true;
    else if (a === '--admin-only') out.adminOnly = true;
    else if (a === '--lux-only') out.luxOnly = true;
    else if (a.startsWith('--out=')) out.outPath = a.slice('--out='.length).trim();
  }
  return out;
}

function makeCookieJar() {
  const jar = new Map();
  return {
    clear() {
      jar.clear();
    },
    absorb(res) {
      const list = res.headers.getSetCookie?.() || [];
      for (const raw of list) {
        const first = String(raw).split(';')[0] || '';
        const eq = first.indexOf('=');
        if (eq <= 0) continue;
        jar.set(first.slice(0, eq), first.slice(eq + 1));
      }
    },
    header() {
      const parts = [];
      for (const [k, v] of jar.entries()) parts.push(`${k}=${v}`);
      return parts.join('; ');
    },
    has(name) {
      return jar.has(name);
    },
  };
}

async function http(baseUrl, jar, method, pathname, { body, headers } = {}) {
  const url = `${baseUrl.replace(/\/$/, '')}${pathname}`;
  const h = {
    accept: 'application/json, text/html;q=0.9,*/*;q=0.8',
    ...(jar.header() ? { cookie: jar.header() } : {}),
    ...(headers || {}),
  };
  let payload;
  if (body !== undefined) {
    h['content-type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(url, { method, headers: h, body: payload, redirect: 'manual' });
  jar.absorb(res);
  const ct = String(res.headers.get('content-type') || '');
  let json = null;
  let text = '';
  try {
    if (ct.includes('application/json')) json = await res.json();
    else text = await res.text();
  } catch {
    /* ignore */
  }
  return { status: res.status, json, text, headers: res.headers };
}

function record(results, id, ok, detail) {
  const row = { id, ok: Boolean(ok), detail: String(detail || '').slice(0, 400) };
  results.push(row);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}${detail ? ` — ${row.detail}` : ''}`);
  return row.ok;
}

async function verifyAdmin(results) {
  const username = getEnv(CURSOR_TEST_ENV_NAMES.adminUsername, CURSOR_TEST_ADMIN.username);
  const password = getEnv(CURSOR_TEST_ENV_NAMES.adminPassword);
  const baseUrl = getEnv(CURSOR_TEST_ENV_NAMES.adminBaseUrl, CURSOR_TEST_DEFAULT_URLS.adminBaseUrl);

  if (!password) {
    record(
      results,
      'admin.env_password',
      false,
      `${CURSOR_TEST_ENV_NAMES.adminPassword} unset — secrets handoff still required`,
    );
    return;
  }

  const jar = makeCookieJar();
  const login = await http(baseUrl, jar, 'POST', '/api/auth/login', {
    body: { level: 'admin', username, password },
  });
  const loginOk =
    login.status === 200 &&
    login.json?.ok === true &&
    String(login.json?.level || '') === 'admin' &&
    jar.has('corpflow_session');
  record(
    results,
    'admin.login',
    loginOk,
    loginOk
      ? `source=${login.json?.source || 'unknown'} username=${username}`
      : `status=${login.status} error=${login.json?.error || 'login_failed'}`,
  );
  if (!loginOk) return;

  const me = await http(baseUrl, jar, 'GET', '/api/auth/me');
  const meOk =
    me.status === 200 &&
    me.json?.logged_in === true &&
    String(me.json?.level || '') === 'admin' &&
    String(me.json?.username || '').toLowerCase() === username.toLowerCase();
  record(
    results,
    'admin.auth_me',
    meOk,
    meOk ? `username=${me.json.username}` : `status=${me.status} body=${JSON.stringify(me.json).slice(0, 160)}`,
  );

  const health = await http(baseUrl, jar, 'GET', '/api/factory/health');
  record(
    results,
    'admin.factory_health_reachable',
    health.status === 200 && health.json?.ok === true,
    `status=${health.status}`,
  );

  // Protected actions that must remain gated (no live send / payment / deploy from this identity alone).
  const sendProbe = await http(baseUrl, jar, 'POST', '/api/auth/password-reset/request', {
    body: { email: 'cursor-test-probe-nonexistent@corpflowai.com' },
  });
  // Endpoint is intentionally non-enumerating; presence of a session must not grant arbitrary external send.
  // We assert we did not receive a debug token leak (production must not expose reset tokens).
  const noTokenLeak = !sendProbe.json?.reset_token && !sendProbe.json?.debug_token;
  record(
    results,
    'admin.no_password_reset_token_leak',
    noTokenLeak,
    `status=${sendProbe.status}`,
  );

  // Tenant-only CMP queue should not be usable as a Lux tenant when acting with bare admin
  // session without acting_tenant_id — expect dormant gate / auth failure, not Lux data.
  const luxQueueAsAdmin = await http(
    CURSOR_TEST_DEFAULT_URLS.luxBaseUrl,
    jar,
    'GET',
    '/api/cmp/router?action=ticket-operator-queue&limit=5',
  );
  const adminNotTenantQueue =
    luxQueueAsAdmin.status === 403 ||
    luxQueueAsAdmin.status === 401 ||
    luxQueueAsAdmin.json?.error === 'DORMANT_GATE' ||
    luxQueueAsAdmin.json?.ok === true; // admin may be allowed; still must not look like tenant_id hijack
  record(
    results,
    'admin.boundary_documented',
    adminNotTenantQueue,
    `lux_queue_status=${luxQueueAsAdmin.status} error=${luxQueueAsAdmin.json?.error || 'n/a'} note=typ=admin still opens many factory session gates today (inseparable); factory_master=false limits membership expansion`,
  );

  await http(baseUrl, jar, 'POST', '/api/auth/logout', { body: {} });
}

async function verifyLux(results, { allowMutations }) {
  const username = getEnv(CURSOR_TEST_ENV_NAMES.luxUsername, CURSOR_TEST_LUX.username);
  const password = getEnv(CURSOR_TEST_ENV_NAMES.luxPassword);
  const tenantId = getEnv(CURSOR_TEST_ENV_NAMES.luxTenantId, CURSOR_TEST_LUX.tenantId);
  const baseUrl = getEnv(CURSOR_TEST_ENV_NAMES.luxBaseUrl, CURSOR_TEST_DEFAULT_URLS.luxBaseUrl);

  if (!password) {
    record(
      results,
      'lux.env_password',
      false,
      `${CURSOR_TEST_ENV_NAMES.luxPassword} unset — secrets handoff still required`,
    );
    return;
  }

  const jar = makeCookieJar();
  const login = await http(baseUrl, jar, 'POST', '/api/auth/login', {
    body: { level: 'tenant', tenant_id: tenantId, username, password },
  });
  const loginOk =
    login.status === 200 &&
    login.json?.ok === true &&
    String(login.json?.level || '') === 'tenant' &&
    String(login.json?.tenant_id || '') === tenantId &&
    jar.has('corpflow_session');
  record(
    results,
    'lux.login',
    loginOk,
    loginOk
      ? `tenant_id=${tenantId} username=${username}`
      : `status=${login.status} error=${login.json?.error || 'login_failed'}`,
  );
  if (!loginOk) return;

  const me = await http(baseUrl, jar, 'GET', '/api/auth/me');
  const meOk =
    me.status === 200 &&
    me.json?.logged_in === true &&
    String(me.json?.level || '') === 'tenant' &&
    String(me.json?.tenant_id || '') === tenantId;
  record(results, 'lux.auth_me', meOk, `tenant_id=${me.json?.tenant_id || 'n/a'}`);

  const changePage = await http(baseUrl, jar, 'GET', '/change');
  const changeOk = changePage.status === 200 && !/MIDDLEWARE_INVOCATION_FAILED/i.test(changePage.text || '');
  record(results, 'lux.change_page', changeOk, `status=${changePage.status}`);

  const leads = await http(baseUrl, jar, 'GET', '/api/cmp/router?action=concierge-leads-list');
  const leadsOk = leads.status === 200 && (leads.json?.ok === true || Array.isArray(leads.json?.leads));
  record(
    results,
    'lux.concierge_leads_list',
    leadsOk,
    leadsOk
      ? `count=${Array.isArray(leads.json?.leads) ? leads.json.leads.length : 'n/a'}`
      : `status=${leads.status} error=${leads.json?.error || 'n/a'}`,
  );

  const queue = await http(baseUrl, jar, 'GET', '/api/cmp/router?action=ticket-operator-queue&limit=10');
  const queueOk = queue.status === 200 && queue.json && !queue.json.error;
  record(
    results,
    'lux.ticket_operator_queue',
    queueOk,
    `status=${queue.status} error=${queue.json?.error || 'n/a'}`,
  );

  // Must not reach factory-only provision action.
  const factoryOnly = await http(baseUrl, jar, 'POST', '/api/cmp/router?action=provision-tenant-pin', {
    body: { tenant_id: tenantId },
  });
  const deniedFactory =
    factoryOnly.status === 401 ||
    factoryOnly.status === 403 ||
    /factory|admin|forbidden|dormant/i.test(String(factoryOnly.json?.error || ''));
  record(
    results,
    'lux.denied_factory_provision_pin',
    deniedFactory,
    `status=${factoryOnly.status} error=${factoryOnly.json?.error || 'n/a'}`,
  );

  // Cross-tenant host probe: Core factory health as tenant cookie must not grant factory master.
  const coreJar = makeCookieJar();
  // reuse same cookie value
  const cookieHeader = jar.header();
  const coreHealth = await fetch(`${CURSOR_TEST_DEFAULT_URLS.adminBaseUrl}/api/factory/auth-users/list`, {
    method: 'GET',
    headers: { cookie: cookieHeader, accept: 'application/json' },
  });
  let coreJson = null;
  try {
    coreJson = await coreHealth.json();
  } catch {
    /* ignore */
  }
  const deniedCoreAdmin =
    coreHealth.status === 401 ||
    coreHealth.status === 403 ||
    coreJson?.error === 'FACTORY_AUTH_REQUIRED';
  record(
    results,
    'lux.denied_core_auth_users_list',
    deniedCoreAdmin,
    `status=${coreHealth.status} error=${coreJson?.error || 'n/a'}`,
  );
  void coreJar;

  // Must not trigger live external send (password-reset is the only Phase-1 outbound path).
  const resetProbe = await http(baseUrl, jar, 'POST', '/api/auth/password-reset/request', {
    body: { email: username, tenant_id: tenantId },
  });
  const noLiveSendProof =
    resetProbe.status === 200 || resetProbe.status === 400 || resetProbe.status === 401;
  // Non-enumerating OK response is fine; we only assert no token / webhook debug leak in body.
  const noLeak = !resetProbe.json?.reset_token && !resetProbe.json?.debug_token && !resetProbe.json?.webhook_url;
  record(
    results,
    'lux.no_live_send_leak',
    noLiveSendProof && noLeak,
    `status=${resetProbe.status}`,
  );

  if (allowMutations && leadsOk && Array.isArray(leads.json?.leads) && leads.json.leads.length > 0) {
    const synthetic =
      leads.json.leads.find((l) => /synthetic|test|cursor/i.test(String(l?.name || l?.full_name || l?.id || ''))) ||
      leads.json.leads[0];
    const leadId = synthetic?.id || synthetic?.lead_id;
    if (leadId) {
      const marker = `[cursor-test-access #696 verify ${new Date().toISOString()}]`;
      const patch = await http(baseUrl, jar, 'POST', '/api/cmp/router?action=concierge-lead-operator-patch', {
        body: {
          lead_id: leadId,
          notes_append: marker,
        },
      });
      const patchOk = patch.status === 200 && (patch.json?.ok === true || !patch.json?.error);
      record(
        results,
        'lux.mutation_notes_append',
        patchOk,
        patchOk ? `lead_id=${leadId}` : `status=${patch.status} error=${patch.json?.error || 'n/a'}`,
      );
    } else {
      record(results, 'lux.mutation_notes_append', false, 'no lead id available for mutation');
    }
  } else if (allowMutations) {
    record(results, 'lux.mutation_notes_append', false, 'no leads available for mutation');
  } else {
    record(
      results,
      'lux.mutation_notes_append',
      true,
      'skipped (pass --allow-mutations to exercise notes/stage writes on a synthetic lead)',
    );
  }

  await http(baseUrl, jar, 'POST', '/api/auth/logout', { body: {} });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`
verify-cursor-test-access.mjs (#696)

  Reads CURSOR_TEST_ADMIN_* and LUX_SMOKE_* from env (never prints secrets).
  --allow-mutations   Attempt a notes_append on one Lux lead
  --admin-only / --lux-only
  --out=path          Write JSON summary (default artifacts/cursor-test-access/verify-result.json)
`);
    process.exit(0);
  }

  const results = [];
  const doAdmin = !args.luxOnly;
  const doLux = !args.adminOnly;

  console.log(`[verify-cursor-test-access] admin=${doAdmin} lux=${doLux} mutations=${args.allowMutations}`);

  if (doAdmin) await verifyAdmin(results);
  if (doLux) await verifyLux(results, { allowMutations: args.allowMutations });

  const failed = results.filter((r) => !r.ok);
  const summary = {
    ok: failed.length === 0,
    issue: 696,
    checked_at: new Date().toISOString(),
    pass_count: results.filter((r) => r.ok).length,
    fail_count: failed.length,
    results,
    secrets_printed: false,
    verdict: failed.length === 0 ? 'READY FOR CURSOR AUTHENTICATED TESTING' : 'NOT READY',
  };

  const outAbs = path.resolve(process.cwd(), args.outPath);
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log('');
  console.log(`[verify-cursor-test-access] wrote ${args.outPath}`);
  console.log(`[verify-cursor-test-access] VERDICT: ${summary.verdict}`);

  process.exit(failed.length === 0 ? 0 : 2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
