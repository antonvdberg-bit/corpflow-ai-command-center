/**
 * #1189 — Operating Workspace action overview acceptance.
 * Next on NEXT_PORT (default 3050) does not apply Vercel /api rewrites, so this
 * script intercepts /api/app/* with the same handlers used in production.
 *
 *   NEXT_PORT=3050 node scripts/operating-overview-acceptance-1189.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

import { actorFromSessionPayload, buildProofTenantActor } from '../lib/app/access.js';
import { REFERENCE_TENANT_ID } from '../lib/app/constants.js';
import { tryHandleAppApi } from '../lib/app/handlers.js';
import { resetProspectFixtureStore } from '../lib/app/prospect-operations-workspace.js';
import { resetRequestStore } from '../lib/app/request-store.js';

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
delete process.env.VERCEL_ENV;
resetRequestStore();
resetProspectFixtureStore();

const PORT = Number(process.env.NEXT_PORT || 3050);
const OUT = path.resolve('artifacts/issue-1189-operating-overview-acceptance');
fs.mkdirSync(OUT, { recursive: true });
const base = `http://127.0.0.1:${PORT}`;

function mockRes() {
  /** @type {{ statusCode: number, body: any }} */
  const state = { statusCode: 200, body: null };
  return {
    state,
    status(code) {
      state.statusCode = code;
      return this;
    },
    json(payload) {
      state.body = payload;
      return this;
    },
  };
}

function pathSegFromUrl(url) {
  const p = new URL(url).pathname.replace(/\/+$/, '') || '/';
  if (!p.startsWith('/api/')) return '';
  return p.slice('/api/'.length);
}

/**
 * @param {import('playwright').Request} request
 * @param {{ tenantDenied?: boolean, emptyOverview?: boolean, overviewError?: boolean, delayMs?: number }} [opts]
 */
async function dispatchAppApi(request, opts = {}) {
  if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
  const url = new URL(request.url());
  const pathSeg = pathSegFromUrl(request.url());
  if (opts.tenantDenied) {
    return { status: 403, body: { ok: false, error: 'core_access_denied' } };
  }
  if (opts.emptyOverview && pathSeg === 'app/overview') {
    return {
      status: 200,
      body: {
        ok: true,
        workspace: 'operating',
        path: '/app/core',
        view: 'overview',
        data_source: 'fixture',
        proof_mode: true,
        counts: {
          prospects_overdue: 0,
          prospects_stalled: 0,
          clients_exceptions: 0,
          commercial_blockers: 0,
          delivery_blocked: 0,
          delivery_review: 0,
          delivery_protected: 0,
        },
        exception_count: 0,
        next_destination: {
          href: '/app/today',
          label: 'Today / My Work',
          reason: 'No exceptions recorded — continue today’s work',
          count: 0,
        },
        sections: {},
        fabricated: false,
        kpi_store: false,
      },
    };
  }
  if (opts.overviewError && pathSeg === 'app/overview') {
    return { status: 503, body: { ok: false, error: 'repository_unavailable', data_source: 'fixture' } };
  }
  const fakeReq = {
    method: request.method(),
    url: `${url.pathname}${url.search}`,
    headers: request.headers(),
    body: request.method() === 'POST' ? JSON.parse(request.postData() || '{}') : undefined,
  };
  const res = mockRes();
  const handled = await tryHandleAppApi(fakeReq, res, pathSeg);
  if (!handled) return { status: 404, body: { ok: false, error: 'not_intercepted' } };
  return { status: res.state.statusCode || 200, body: res.state.body };
}

/**
 * @param {import('playwright').Page} page
 * @param {Parameters<typeof dispatchAppApi>[1]} [opts]
 */
async function installAppApi(page, opts = {}) {
  await page.route('**/api/app/**', async (route) => {
    try {
      const result = await dispatchAppApi(route.request(), opts);
      await route.fulfill({
        status: result.status,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify(result.body || {}),
      });
    } catch (err) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({ ok: false, error: String(err?.message || err) }),
      });
    }
  });
}

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  console.log('wrote', file);
  return file;
}

function pathOnly(url) {
  const u = new URL(url);
  return `${u.pathname}${u.search}`;
}

async function overflowPx(page) {
  return page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
}

const findings = {
  started_from_main: 'b731411734edb01b7dbb8d7e20247c5a7805983a',
  source_issue: 1189,
  route_sequence: [],
  clicks: [],
  blockers: [],
  screenshots: [],
};

const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await installAppApi(desktop);
  await desktop.goto(`${base}/app/core?proof=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await desktop.getByTestId('operating-overview').waitFor({ timeout: 30000 });
  findings.route_sequence.push(pathOnly(desktop.url()));
  findings.screenshots.push(await shot(desktop, 'core-overview-desktop.png'));
  const overflowDesktop = await overflowPx(desktop);
  if (overflowDesktop > 0) findings.blockers.push(`desktop overview horizontal overflow ${overflowDesktop}px`);

  const dataSource = (await desktop.getByTestId('overview-data-source').textContent()) || '';
  const nextHref = await desktop.getByTestId('overview-next-link').getAttribute('href');
  const nextLabel = ((await desktop.getByTestId('overview-next-link').textContent()) || '').trim();
  const countCards = await desktop.locator('[data-testid^="overview-count-"]').evaluateAll((els) =>
    els.map((el) => ({
      testId: el.getAttribute('data-testid'),
      href: el.getAttribute('href'),
      count: Number(el.getAttribute('data-count') || 0),
      label: el.querySelector('.cf-app-overview-count-label')?.textContent || '',
    })),
  );
  const sectionItems = await desktop.locator('[data-testid^="overview-item-link-"]').evaluateAll((els) =>
    els.slice(0, 20).map((el) => ({
      testId: el.getAttribute('data-testid'),
      href: el.getAttribute('href'),
      label: (el.textContent || '').trim(),
    })),
  );

  findings.overview = {
    data_source: dataSource.trim(),
    next_href: nextHref,
    next_label: nextLabel,
    count_cards: countCards,
    section_items: sectionItems,
    overflow_px: overflowDesktop,
  };

  if (dataSource.trim() !== 'fixture') {
    findings.blockers.push(`unexpected data_source ${dataSource}`);
  }
  const allowedPrefixes = [
    '/app/queue',
    '/app/workbench',
    '/app/prospects',
    '/app/clients',
    '/app/commercial',
    '/app/delivery',
    '/app/today',
    '/change',
  ];
  for (const card of countCards) {
    const href = String(card.href || '').split('?')[0];
    if (!allowedPrefixes.some((p) => href === p || href.startsWith(`${p}/`))) {
      findings.blockers.push(`count card ${card.testId} unexpected href ${card.href}`);
    }
  }

  const journeys = [
    {
      name: 'next_destination_delivery_protected',
      click: () => desktop.getByTestId('overview-next-link').click(),
      wait: 'delivery-summary',
      expectPath: '/app/delivery',
      expectQuery: 'filter=protected_deploy_approval_required',
    },
  ];

  for (const card of countCards.filter((c) => c.count > 0)) {
    const dest =
      card.testId === 'overview-count-prospects-overdue'
        ? { wait: 'action-queue', expectPath: '/app/queue' }
        : card.testId === 'overview-count-prospects-stalled'
          ? { wait: 'prospect-workbench', expectPath: '/app/workbench' }
          : card.testId === 'overview-count-clients'
            ? { wait: 'clients-list', expectPath: '/app/clients' }
            : card.testId === 'overview-count-commercial'
              ? { wait: 'commercial-summary', expectPath: '/app/commercial' }
              : { wait: 'delivery-summary', expectPath: '/app/delivery' };
    journeys.push({
      name: `count_card_${card.testId}`,
      click: async () => {
        await desktop.goto(`${base}/app/core?proof=1`, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await desktop.getByTestId('operating-overview').waitFor({ timeout: 20000 });
        await desktop.getByTestId(card.testId).click();
      },
      wait: dest.wait,
      expectPath: dest.expectPath,
      href: card.href,
    });
  }

  const itemSamples = [
    {
      name: 'item_prospect_ada',
      section: 'overview-section-prospects_overdue',
      testId: 'overview-item-link-prospect-overdue:syn-772-lr-ada',
      wait: 'prospect-detail',
      expectPath: '/app/prospects/syn-772-lr-ada',
    },
    {
      name: 'item_client_pilot',
      section: 'overview-section-clients',
      testId: 'overview-item-link-client:cmp_pilot_client_synthetic',
      wait: 'clients-summary',
      expectPath: '/app/clients/cmp_pilot_client_synthetic',
    },
    {
      name: 'item_commercial_ada',
      section: 'overview-section-commercial',
      testId: 'overview-item-link-commercial:syn-772-lr-ada',
      wait: 'prospect-detail',
      expectPath: '/app/prospects/syn-772-lr-ada',
    },
    {
      name: 'item_delivery_pat',
      section: 'overview-section-delivery_protected',
      testId: 'overview-item-link-delivery:lead:syn-995-lr-prot',
      wait: 'prospect-detail',
      expectPath: '/app/prospects/syn-995-lr-prot',
    },
    {
      name: 'item_delivery_change',
      section: 'overview-section-delivery_blocked',
      testId: 'overview-item-link-delivery:ticket:syn_slice1_req_corpflowai_002',
      wait: null,
      expectPath: '/change',
    },
  ];

  for (const j of journeys) {
    if (j.name === 'next_destination_delivery_protected') {
      await j.click();
    } else {
      await j.click();
    }
    const marker = desktop.getByTestId(j.wait);
    await marker.waitFor({ timeout: 25000 });
    const landed = pathOnly(desktop.url());
    const ok = landed.startsWith(j.expectPath) || landed.includes(j.expectPath);
    if (!ok) findings.blockers.push(`${j.name} landed on ${landed}, expected ${j.expectPath}`);
    const denied = await desktop.getByTestId('app-core-denied').count();
    const auth = await desktop.getByTestId('app-auth-required').count();
    if (denied || auth) findings.blockers.push(`${j.name} hit ${denied ? 'denied' : 'auth-required'}`);
    findings.clicks.push({ name: j.name, landed, ok, wait: j.wait });
    findings.route_sequence.push(landed);
    findings.screenshots.push(await shot(desktop, `${j.name}.png`));
  }

  for (const sample of itemSamples) {
    await desktop.goto(`${base}/app/core?proof=1`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await desktop.getByTestId('operating-overview').waitFor({ timeout: 20000 });
    const scope = sample.section ? desktop.getByTestId(sample.section) : desktop;
    const link = scope.getByTestId(sample.testId);
    if ((await link.count()) === 0) {
      findings.blockers.push(`missing item link ${sample.testId}`);
      continue;
    }
    await link.first().click();
    if (sample.wait) {
      await desktop.getByTestId(sample.wait).waitFor({ timeout: 25000 });
    } else {
      await desktop.waitForURL(/\/change/, { timeout: 25000 });
    }
    const landed = pathOnly(desktop.url());
    const ok = landed.includes(sample.expectPath);
    if (!ok) findings.blockers.push(`${sample.name} landed on ${landed}, expected ${sample.expectPath}`);
    findings.clicks.push({ name: sample.name, landed, ok, wait: sample.wait });
    findings.route_sequence.push(landed);
    findings.screenshots.push(await shot(desktop, `${sample.name}.png`));
  }

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await installAppApi(mobile);
  await mobile.goto(`${base}/app/core?proof=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await mobile.getByTestId('operating-overview').waitFor({ timeout: 30000 });
  const overflowMobile = await overflowPx(mobile);
  findings.mobile = { overflow_px: overflowMobile, url: pathOnly(mobile.url()) };
  if (overflowMobile > 8) findings.blockers.push(`mobile overview horizontal overflow ${overflowMobile}px`);
  findings.screenshots.push(await shot(mobile, 'core-overview-mobile.png'));
  await mobile.getByTestId('overview-count-commercial').click();
  await mobile.getByTestId('commercial-summary').waitFor({ timeout: 25000 });
  findings.clicks.push({ name: 'mobile_commercial_card', landed: pathOnly(mobile.url()), ok: true });
  findings.screenshots.push(await shot(mobile, 'mobile-commercial-destination.png'));
  await mobile.goto(`${base}/app/core?proof=1`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await mobile.getByTestId('operating-overview').waitFor({ timeout: 20000 });
  await mobile.getByTestId('overview-count-clients').click();
  await mobile.getByTestId('clients-list').waitFor({ timeout: 25000 });
  findings.clicks.push({ name: 'mobile_clients_card', landed: pathOnly(mobile.url()), ok: true });
  findings.screenshots.push(await shot(mobile, 'mobile-clients-destination.png'));

  const unauth = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await installAppApi(unauth);
  await unauth.goto(`${base}/app/core`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await unauth.getByTestId('app-auth-required').waitFor({ timeout: 20000 });
  findings.screenshots.push(await shot(unauth, 'core-unauth-desktop.png'));
  findings.clicks.push({ name: 'unauthenticated_core', landed: pathOnly(unauth.url()), ok: true });

  const tenantPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await installAppApi(tenantPage, { tenantDenied: true });
  await tenantPage.goto(`${base}/app/core`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await tenantPage.getByTestId('app-core-denied').waitFor({ timeout: 20000 });
  const deniedCopy = ((await tenantPage.locator('.cf-app-lead').first().textContent()) || '').trim();
  findings.tenant_boundary = {
    ui: 'app-core-denied',
    copy: deniedCopy,
    handler_tenant_403: true,
  };
  findings.screenshots.push(await shot(tenantPage, 'core-tenant-denied-desktop.png'));

  const emptyPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await installAppApi(emptyPage, { emptyOverview: true });
  await emptyPage.goto(`${base}/app/core?proof=1`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await emptyPage.getByTestId('operating-overview-empty').waitFor({ timeout: 20000 });
  findings.screenshots.push(await shot(emptyPage, 'core-overview-empty.png'));

  const errorPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await installAppApi(errorPage, { overviewError: true });
  await errorPage.goto(`${base}/app/core?proof=1`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await errorPage.getByTestId('app-core-overview-error').waitFor({ timeout: 20000 });
  const emptyOnError = await errorPage.getByTestId('operating-overview-empty').count();
  if (emptyOnError) findings.blockers.push('overview error state still showed empty “nothing needs attention”');
  findings.screenshots.push(await shot(errorPage, 'core-overview-error.png'));

  const loadingPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await installAppApi(loadingPage, { delayMs: 2500 });
  const loadingNav = loadingPage.goto(`${base}/app/core?proof=1`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await loadingPage.getByTestId('app-loading').waitFor({ timeout: 8000 });
  findings.screenshots.push(await shot(loadingPage, 'core-overview-loading.png'));
  await loadingNav;
  await loadingPage.getByTestId('operating-overview').waitFor({ timeout: 20000 });

  const handlerTenant = mockRes();
  process.env.NODE_ENV = 'test';
  await tryHandleAppApi(
    {
      method: 'GET',
      url: '/api/app/overview?env=core',
      headers: {},
      __testAppActor: actorFromSessionPayload({
        typ: 'tenant',
        tenant_id: REFERENCE_TENANT_ID,
        username: 'tenant-user',
      }),
    },
    handlerTenant,
    'app/overview',
  );
  const handlerTenantProof = mockRes();
  await tryHandleAppApi(
    {
      method: 'GET',
      url: '/api/app/overview?proof=1&env=core',
      headers: {},
      __testAppActor: buildProofTenantActor(),
    },
    handlerTenantProof,
    'app/overview',
  );
  findings.tenant_boundary.handler_session = {
    status: handlerTenant.state.statusCode,
    error: handlerTenant.state.body?.error,
  };
  findings.tenant_boundary.handler_proof_tenant = {
    status: handlerTenantProof.state.statusCode,
    error: handlerTenantProof.state.body?.error,
  };
  if (handlerTenant.state.statusCode !== 403 || handlerTenantProof.state.statusCode !== 403) {
    findings.blockers.push('tenant overview API did not fail closed');
  }
} catch (err) {
  findings.blockers.push(String(err?.stack || err));
  console.error(err);
} finally {
  await browser.close();
}

const uniqueRoutes = [...new Set(findings.route_sequence)];
findings.exact_route_sequence = uniqueRoutes;
findings.verdict = findings.blockers.length
  ? `NOT READY — ${findings.blockers[0]}`
  : 'OPERATING WORKSPACE ACTION OVERVIEW USABLE';

const jsonPath = path.join(OUT, 'acceptance-evidence.json');
fs.writeFileSync(jsonPath, `${JSON.stringify(findings, null, 2)}\n`);
console.log('wrote', jsonPath);
console.log('verdict', findings.verdict);
if (findings.blockers.length) process.exitCode = 1;
