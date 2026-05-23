#!/usr/bin/env node
/**
 * Inspection smoke for the gated `/change` page on a tenant host (default: lux.corpflowai.com).
 *
 * What it does (read-only, no secrets in logs):
 *   1. (optional) Sets the Vercel "Protection bypass for automation" header so deployment
 *      protection on Preview / *.vercel.app does not block automation.
 *   2. Logs in as a tenant test operator (level=tenant, tenant_id=<LUX_SMOKE_TENANT_ID>) via
 *      POST /api/auth/login. The session cookie is held in the Playwright context; the
 *      browser then visits `/change?layoutDebug=1` exactly like a human operator would.
 *   3. Clicks the master ticket button (default cmo8mjijk0000jl04l1jz0v6d) in the operator
 *      queue, waits for the React `ticket` state to update, then captures the structured
 *      layout-debug snapshot emitted by `pages/change.js` (lib/cmp/_lib/change-layout-debug.js).
 *   4. Repeats for the short ticket (default cmov9fs050000kz04070wi23k or
 *      LUX_SMOKE_TICKET_SHORT).
 *   5. Writes one screenshot per view and one JSON sidecar per view with the overflow report.
 *      Exits non-zero if either view shows horizontal overflow.
 *
 * What it deliberately does NOT do:
 *   - It does not weaken production auth: tenant credentials are required and the session
 *     is enforced server-side (lib/cmp/router.js + ticket-get tenant scoping).
 *   - It does not store, print, or log any secret value.
 *   - It does not require Core/factory privileges. The test account is `level=tenant`,
 *     `tenant_id=<LUX_SMOKE_TENANT_ID>` and is denied by `requireFactoryMasterOnly` gates.
 *
 * Required env (place in `.env.local`, GitHub Actions repo secrets, or shell exports — never commit):
 *   LUX_SMOKE_USERNAME       Tenant test operator email (auth_users.username, level=tenant)
 *   LUX_SMOKE_PASSWORD       Tenant test operator password (matches auth_users hash for that user)
 *
 * Optional env:
 *   LUX_SMOKE_BASE_URL       Default https://lux.corpflowai.com
 *   LUX_SMOKE_TENANT_ID      Default luxe-maurice (must match auth_users.tenant_id of the test op)
 *   LUX_SMOKE_TICKET_MASTER  Default cmo8mjijk0000jl04l1jz0v6d
 *   LUX_SMOKE_TICKET_SHORT   Default cmov9fs050000kz04070wi23k
 *   LUX_SMOKE_OUT_DIR        Output directory for screenshots / JSON (default `.smoke-screenshots/`)
 *   VERCEL_AUTOMATION_BYPASS_SECRET / CORPFLOW_VERCEL_PROTECTION_BYPASS_SECRET
 *                            Vercel deployment-protection bypass; sent as
 *                            `x-vercel-protection-bypass` header.
 *   LUX_SMOKE_HEADLESS       "false" to open a visible browser (default: headless)
 *   LUX_SMOKE_SLOWMO_MS      Slow-mo per Playwright action in ms (default 0)
 *
 * Run: `npm run smoke:change-overflow` (after `npx playwright install chromium` once).
 */

import './bootstrap-repo-env.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

function getEnv(name, fallback) {
  const v = process.env[name];
  if (v == null || String(v).trim() === '') return fallback;
  return String(v).trim();
}

function requireEnv(name) {
  const v = getEnv(name, '');
  if (!v) {
    console.error(
      `ERROR: Missing required env ${name}. Set it in .env.local (gitignored) or the shell.`,
    );
    process.exit(1);
  }
  return v;
}

function isoStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function shortBaseTag(url) {
  try {
    const u = new URL(url);
    return u.host.replace(/[^a-z0-9.-]+/gi, '_');
  } catch {
    return 'site';
  }
}

function buildBypassHeaders() {
  const bypass =
    getEnv('VERCEL_AUTOMATION_BYPASS_SECRET', '') ||
    getEnv('CORPFLOW_VERCEL_PROTECTION_BYPASS_SECRET', '');
  if (!bypass) return { headers: {}, configured: false };
  return {
    headers: {
      'x-vercel-protection-bypass': bypass,
      'x-vercel-set-bypass-cookie': 'true',
    },
    configured: true,
  };
}

async function loginAsTenant(context, baseUrl, tenantId, username, password) {
  const url = `${baseUrl.replace(/\/$/, '')}/api/auth/login`;
  const res = await context.request.post(url, {
    headers: { 'content-type': 'application/json' },
    data: { level: 'tenant', tenant_id: tenantId, username, password },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok() || !body || body.ok !== true) {
    return {
      ok: false,
      code: body?.error || `HTTP_${res.status()}`,
      hint: body?.hint || 'Verify tenant id, username, password.',
    };
  }
  if (String(body.level || '') !== 'tenant') {
    return { ok: false, code: 'UNEXPECTED_LEVEL', hint: `Got level=${body.level}.` };
  }
  if (String(body.tenant_id || '') !== tenantId) {
    return { ok: false, code: 'TENANT_MISMATCH', hint: `Got tenant_id=${body.tenant_id}.` };
  }
  return { ok: true };
}

async function selectTicketByText(page, ticketId, timeoutMs = 30_000) {
  const candidate = page.locator('button').filter({ hasText: ticketId }).first();
  await candidate.waitFor({ state: 'visible', timeout: timeoutMs });
  await candidate.scrollIntoViewIfNeeded();
  await candidate.click();
  await page.waitForFunction(
    (id) => (document.body?.innerText || '').includes('Ticket: ' + id),
    ticketId,
    { timeout: timeoutMs },
  );
}

/**
 * In-page horizontal-overflow scan. Mirrors lib/cmp/_lib/change-layout-debug.js
 * (`scanHorizontalOverflow`) so the smoke works against any deployment, including
 * branches where the page-level `?layoutDebug=1` instrumentation is not present.
 * Runs entirely inside the browser; nothing is mutated; only data is returned.
 */
async function scanOverflowInPage(page) {
  return page.evaluate(() => {
    const OVERFLOW_EPS = 5;
    const root =
      document.querySelector('main') ||
      document.querySelector('#__next') ||
      document.body ||
      document.documentElement;
    const win = window;
    const innerWidth = win.innerWidth || 0;
    const doc = document.documentElement;
    const docScrollWidth = doc.scrollWidth;
    const docClientWidth = doc.clientWidth;

    function buildPath(el) {
      const parts = [];
      let n = el;
      while (n && n !== root && n.nodeType === 1) {
        let seg = n.tagName.toLowerCase();
        const id = n.id && String(n.id).trim();
        if (id) {
          seg += `#${id}`;
        } else if (n.parentElement) {
          const tag = n.tagName;
          const siblings = Array.from(n.parentElement.children).filter(
            (c) => c.tagName === tag,
          );
          const idx = siblings.indexOf(n) + 1;
          seg += `:nth-of-type(${idx})`;
        }
        parts.unshift(seg);
        n = n.parentElement;
      }
      return parts.length ? parts.join(' > ') : '(root)';
    }

    const items = [];
    if (!root) return { innerWidth, docScrollWidth, docClientWidth, items };
    const all = root.querySelectorAll('*');
    for (const el of all) {
      if (!(el instanceof HTMLElement)) continue;
      let computed;
      try {
        computed = win.getComputedStyle(el);
      } catch {
        continue;
      }
      if (computed.display === 'none' || computed.visibility === 'hidden') continue;
      const cw = el.clientWidth;
      const sw = el.scrollWidth;
      const rect = el.getBoundingClientRect();
      const internalOverflow = sw > cw + OVERFLOW_EPS;
      const widerThanViewport = rect.width > innerWidth + 1 || rect.right > innerWidth + 1;
      if (!internalOverflow && !widerThanViewport) continue;
      const textSample = (el.innerText || el.textContent || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120);
      const styleHint = [
        computed.display !== 'block' ? `display:${computed.display}` : '',
        computed.width !== 'auto' ? `width:${computed.width}` : '',
        computed.minWidth && computed.minWidth !== '0px' ? `min-width:${computed.minWidth}` : '',
        computed.maxWidth && computed.maxWidth !== 'none' ? `max-width:${computed.maxWidth}` : '',
        computed.overflowX !== 'visible' ? `overflow-x:${computed.overflowX}` : '',
      ]
        .filter(Boolean)
        .join('; ')
        .slice(0, 200);
      items.push({
        path: buildPath(el),
        tag: el.tagName.toLowerCase(),
        className:
          typeof el.className === 'string' ? String(el.className).slice(0, 160) : '',
        styleHint,
        clientWidth: cw,
        scrollWidth: sw,
        rectWidth: rect.width,
        rectRight: rect.right,
        widerThanViewport,
        internalOverflow,
        textSample,
      });
    }
    items.sort(
      (a, b) =>
        Math.max(b.scrollWidth - b.clientWidth, 0) -
        Math.max(a.scrollWidth - a.clientWidth, 0),
    );
    return { innerWidth, docScrollWidth, docClientWidth, items };
  });
}

function summarizeSnapshot(snap) {
  const items = snap && Array.isArray(snap.items) ? snap.items : [];
  const innerWidth = Number(snap?.innerWidth || 0);
  const docScrollWidth = Number(snap?.docScrollWidth || 0);
  const docOverflowPx = Math.max(docScrollWidth - innerWidth, 0);
  const wider = items.filter((it) => it.widerThanViewport === true);
  const internal = items.filter((it) => it.internalOverflow === true && !it.widerThanViewport);
  const docOverflow = docOverflowPx > 1;
  const ok = !docOverflow && wider.length === 0;
  return {
    ok,
    innerWidth,
    docScrollWidth,
    docOverflowPx,
    widerCount: wider.length,
    internalOnlyCount: internal.length,
    top_offenders: items.slice(0, 5).map((it) => ({
      path: it.path,
      tag: it.tag,
      className: it.className,
      styleHint: it.styleHint,
      clientWidth: it.clientWidth,
      scrollWidth: it.scrollWidth,
      rectWidth: it.rectWidth,
      rectRight: it.rectRight,
      widerThanViewport: it.widerThanViewport,
      internalOverflow: it.internalOverflow,
      textSample: it.textSample,
    })),
  };
}

async function inspectTicket(page, ticketId, label, outDir, stamp, tag) {
  console.log(`[${label}] selecting ticket=${ticketId}`);
  await selectTicketByText(page, ticketId);
  await page.waitForTimeout(1_500);
  const snap = await scanOverflowInPage(page);
  const summary = summarizeSnapshot(snap);
  console.log(
    `[${label}] doc=${summary.docScrollWidth}px viewport=${summary.innerWidth}px overflow=${summary.docOverflowPx}px wider_elements=${summary.widerCount} internal_only=${summary.internalOnlyCount}`,
  );
  for (const off of summary.top_offenders) {
    console.log(
      `[${label}] offender path=${off.path} tag=${off.tag} cw=${off.clientWidth} sw=${off.scrollWidth} rectW=${Math.round(off.rectWidth)} rectR=${Math.round(off.rectRight)} widerVP=${off.widerThanViewport} internal=${off.internalOverflow}`,
    );
    if (off.styleHint) console.log(`[${label}]   styleHint=${off.styleHint}`);
    if (off.textSample) console.log(`[${label}]   text=${off.textSample}`);
  }
  const shotPath = path.join(outDir, `${stamp}_${tag}_${label}_${ticketId}.png`);
  const jsonPath = path.join(outDir, `${stamp}_${tag}_${label}_${ticketId}.json`);
  await page.screenshot({ path: shotPath, fullPage: true });
  writeFileSync(jsonPath, JSON.stringify({ ticketId, label, summary, raw: snap }, null, 2));
  console.log(`[${label}] screenshot=${shotPath}`);
  console.log(`[${label}] report=${jsonPath}`);
  return summary;
}

async function main() {
  const baseUrl = getEnv('LUX_SMOKE_BASE_URL', 'https://lux.corpflowai.com').replace(/\/+$/, '');
  const tenantId = getEnv('LUX_SMOKE_TENANT_ID', 'luxe-maurice');
  const username = requireEnv('LUX_SMOKE_USERNAME');
  const password = requireEnv('LUX_SMOKE_PASSWORD');
  const masterTicket = getEnv('LUX_SMOKE_TICKET_MASTER', 'cmo8mjijk0000jl04l1jz0v6d');
  const shortTicket = getEnv('LUX_SMOKE_TICKET_SHORT', 'cmov9fs050000kz04070wi23k');
  const outDir = path.resolve(process.cwd(), getEnv('LUX_SMOKE_OUT_DIR', '.smoke-screenshots'));
  const headless = getEnv('LUX_SMOKE_HEADLESS', 'true').toLowerCase() !== 'false';
  const slowMo = Number.parseInt(getEnv('LUX_SMOKE_SLOWMO_MS', '0'), 10) || 0;

  mkdirSync(outDir, { recursive: true });

  const bypass = buildBypassHeaders();
  console.log(
    `[smoke] base=${baseUrl} tenant=${tenantId} master=${masterTicket} short=${shortTicket} bypass=${bypass.configured ? 'configured' : 'not_set'} headless=${headless}`,
  );

  const browser = await chromium.launch({ headless, slowMo });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: bypass.headers,
    ignoreHTTPSErrors: false,
    userAgent: 'CorpFlowSmoke/1.0 (+change-overflow)',
  });

  const failures = [];
  const stamp = isoStamp();
  const tag = shortBaseTag(baseUrl);

  try {
    const login = await loginAsTenant(context, baseUrl, tenantId, username, password);
    if (!login.ok) {
      console.error(`[login] FAILED code=${login.code}`);
      console.error(`[login] hint=${login.hint}`);
      failures.push(`login:${login.code}`);
    } else {
      console.log(`[login] OK level=tenant tenant_id=${tenantId}`);
    }

    const page = await context.newPage();
    page.on('console', (msg) => {
      const t = msg.type();
      if (t === 'error' || t === 'warning') {
        console.log(`[browser:${t}] ${msg.text().slice(0, 240)}`);
      }
    });

    if (!login.ok) throw new Error('login_failed');

    await page.goto(`${baseUrl}/change?layoutDebug=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await page.waitForFunction(
      () => /Session:\s*tenant/i.test(document.body?.innerText || ''),
      null,
      { timeout: 30_000 },
    );

    const masterSummary = await inspectTicket(
      page,
      masterTicket,
      'master',
      outDir,
      stamp,
      tag,
    );
    if (!masterSummary.ok) failures.push('overflow:master');

    const shortSummary = await inspectTicket(
      page,
      shortTicket,
      'short',
      outDir,
      stamp,
      tag,
    );
    if (!shortSummary.ok) failures.push('overflow:short');
  } catch (e) {
    console.error('[smoke] error:', String(e && e.message ? e.message : e));
    failures.push(`error:${String(e && e.message ? e.message : e).slice(0, 80)}`);
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }

  if (failures.length) {
    console.error(`[smoke] FAILED: ${failures.join(', ')}`);
    process.exit(1);
  }
  console.log('[smoke] OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
