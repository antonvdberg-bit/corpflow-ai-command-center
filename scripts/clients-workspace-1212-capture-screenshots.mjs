/**
 * #1212 desktop + mobile screenshots of the real Next.js Clients Workspace.
 * Next on NEXT_PORT (default 3051) does not apply Vercel /api rewrites, so this
 * script intercepts /api/app/* with the same handlers used in production.
 *
 *   NEXT_PORT=3051 node scripts/clients-workspace-1212-capture-screenshots.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

import {
  handleAppClientDetail,
  handleAppClients,
  handleAppCommercial,
  handleAppDelivery,
  handleAppProspectDetail,
  handleAppShell,
} from '../lib/app/handlers.js';
import { resetProspectFixtureStore } from '../lib/app/prospect-operations-workspace.js';

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
resetProspectFixtureStore();

const PORT = Number(process.env.NEXT_PORT || 3051);
const OUT = path.resolve('artifacts/clients-workspace-1212');
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

/**
 * @param {import('playwright').Request} request
 */
async function dispatchAppApi(request) {
  const url = new URL(request.url());
  const fakeReq = {
    method: request.method(),
    url: `${url.pathname}${url.search}`,
    headers: request.headers(),
    body: request.method() === 'POST' ? JSON.parse(request.postData() || '{}') : undefined,
  };
  const res = mockRes();
  const p = url.pathname.replace(/\/+$/, '') || '/';
  if (p === '/api/app/shell') await handleAppShell(fakeReq, res);
  else if (p === '/api/app/clients') await handleAppClients(fakeReq, res);
  else if (p === '/api/app/client') await handleAppClientDetail(fakeReq, res);
  else if (p === '/api/app/commercial') await handleAppCommercial(fakeReq, res);
  else if (p === '/api/app/delivery') await handleAppDelivery(fakeReq, res);
  else if (p === '/api/app/prospect') await handleAppProspectDetail(fakeReq, res);
  else {
    return { status: 404, body: { ok: false, error: 'not_intercepted' } };
  }
  return { status: res.state.statusCode || 200, body: res.state.body };
}

/**
 * @param {import('playwright').Page} page
 * @param {{ forceTenantDeny?: boolean, forceListError?: boolean }} [opts]
 */
async function installAppApi(page, opts = {}) {
  await page.route('**/api/app/**', async (route) => {
    try {
      if (opts.forceTenantDeny) {
        await route.fulfill({
          status: 403,
          contentType: 'application/json; charset=utf-8',
          body: JSON.stringify({ ok: false, error: 'core_access_denied' }),
        });
        return;
      }
      if (opts.forceListError) {
        const url = new URL(route.request().url());
        const p = url.pathname.replace(/\/+$/, '') || '/';
        if (p === '/api/app/clients' || p === '/api/app/client') {
          await route.fulfill({
            status: 503,
            contentType: 'application/json; charset=utf-8',
            body: JSON.stringify({
              ok: false,
              error: 'company_master_unavailable',
              data_source: 'company_master_read',
              workspace: 'operating',
            }),
          });
          return;
        }
      }
      const result = await dispatchAppApi(route.request());
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

async function shot(browser, name, url, viewport, after, routeOpts) {
  const page = await browser.newPage({ viewport });
  await installAppApi(page, routeOpts);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  if (after) await after(page);
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflowPx: Math.max(0, doc.scrollWidth - doc.clientWidth),
    };
  });
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  await page.close();
  console.log('wrote', file, overflow);
  return overflow;
}

const unauth = `${base}/app/clients`;
const proofList = `${base}/app/clients?proof=1`;
const proofDetail = `${base}/app/clients/cmp_ada_spa_synthetic?proof=1`;
const proofMissing = `${base}/app/clients/does-not-exist?proof=1`;
const hopProspect = `${base}/app/prospects/syn-772-lr-ada?proof=1`;
const hopCommercial = `${base}/app/commercial?proof=1`;
const hopDelivery = `${base}/app/delivery?proof=1`;

const browser = await chromium.launch();
/** @type {Record<string, { scrollWidth: number, clientWidth: number, overflowPx: number }>} */
const overflows = {};
const hops = {};

try {
  overflows.unauth_desktop = await shot(
    browser,
    'clients-unauth-desktop.png',
    unauth,
    { width: 1440, height: 900 },
    async (page) => {
      await page.getByTestId('app-auth-required').waitFor({ timeout: 20000 });
    },
  );
  overflows.unauth_mobile = await shot(
    browser,
    'clients-unauth-mobile.png',
    unauth,
    { width: 390, height: 844 },
    async (page) => {
      await page.getByTestId('app-auth-required').waitFor({ timeout: 20000 });
    },
  );
  overflows.list_desktop = await shot(
    browser,
    'clients-list-desktop.png',
    proofList,
    { width: 1440, height: 900 },
    async (page) => {
      await page.getByTestId('clients-list').waitFor({ timeout: 20000 });
    },
  );
  overflows.list_mobile = await shot(
    browser,
    'clients-list-mobile.png',
    proofList,
    { width: 390, height: 844 },
    async (page) => {
      await page.getByTestId('clients-list').waitFor({ timeout: 20000 });
    },
  );
  overflows.detail_desktop = await shot(
    browser,
    'clients-detail-desktop.png',
    proofDetail,
    { width: 1440, height: 900 },
    async (page) => {
      await page.getByTestId('clients-summary').waitFor({ timeout: 20000 });
    },
  );
  overflows.detail_mobile = await shot(
    browser,
    'clients-detail-mobile.png',
    proofDetail,
    { width: 390, height: 844 },
    async (page) => {
      await page.getByTestId('clients-summary').waitFor({ timeout: 20000 });
    },
  );
  overflows.missing_desktop = await shot(
    browser,
    'clients-missing-desktop.png',
    proofMissing,
    { width: 1440, height: 900 },
    async (page) => {
      await page.getByTestId('app-client-detail-missing').waitFor({ timeout: 20000 });
    },
  );
  overflows.list_error_desktop = await shot(
    browser,
    'clients-list-error-desktop.png',
    proofList,
    { width: 1440, height: 900 },
    async (page) => {
      await page.getByTestId('app-clients-list-error').waitFor({ timeout: 20000 });
    },
    { forceListError: true },
  );
  overflows.tenant_denied_desktop = await shot(
    browser,
    'clients-tenant-denied-desktop.png',
    proofList,
    { width: 1440, height: 900 },
    async (page) => {
      await page.getByTestId('app-core-denied').waitFor({ timeout: 20000 });
    },
    { forceTenantDeny: true },
  );
  overflows.tenant_denied_mobile = await shot(
    browser,
    'clients-tenant-denied-mobile.png',
    proofList,
    { width: 390, height: 844 },
    async (page) => {
      await page.getByTestId('app-core-denied').waitFor({ timeout: 20000 });
    },
    { forceTenantDeny: true },
  );

  const hopPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await installAppApi(hopPage);
  await hopPage.goto(proofDetail, { waitUntil: 'networkidle', timeout: 45000 });
  await hopPage.getByTestId('clients-hop-prospect').waitFor({ timeout: 20000 });
  hops.prospect = await hopPage.getByTestId('clients-hop-prospect').getAttribute('href');
  hops.commercial = await hopPage.getByTestId('clients-hop-commercial').getAttribute('href');
  hops.delivery = await hopPage.getByTestId('clients-hop-delivery').getAttribute('href');
  hops.pipeline = await hopPage.getByTestId('clients-hop-pipeline').getAttribute('href');
  hops.company_master = await hopPage.getByTestId('clients-hop-company-master').getAttribute('href');
  hops.change = await hopPage.getByTestId('clients-hop-change').getAttribute('href');
  await hopPage.close();

  overflows.hop_prospect_desktop = await shot(
    browser,
    'hop-prospect.png',
    hopProspect,
    { width: 1440, height: 900 },
    async (page) => {
      await page.getByTestId('prospect-detail').waitFor({ timeout: 20000 });
    },
  );
  overflows.hop_commercial_desktop = await shot(
    browser,
    'hop-commercial.png',
    hopCommercial,
    { width: 1440, height: 900 },
    async (page) => {
      await page.getByTestId('commercial-summary').waitFor({ timeout: 20000 }).catch(() => {});
    },
  );
  overflows.hop_delivery_desktop = await shot(
    browser,
    'hop-delivery.png',
    hopDelivery,
    { width: 1440, height: 900 },
    async (page) => {
      await page.getByTestId('delivery-summary').waitFor({ timeout: 20000 }).catch(() => {});
    },
  );
} finally {
  await browser.close();
}

const livePage = await chromium.launch();
try {
  const liveDesktop = await livePage.newPage({ viewport: { width: 1440, height: 900 } });
  await liveDesktop.goto('https://core.corpflowai.com/app/clients', {
    waitUntil: 'domcontentloaded',
    timeout: 45000,
  });
  overflows.live_unauth_desktop = await liveDesktop.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflowPx: Math.max(0, doc.scrollWidth - doc.clientWidth),
    };
  });
  await liveDesktop.screenshot({ path: path.join(OUT, 'live-unauth-desktop.png'), fullPage: true });
  await liveDesktop.close();

  const liveMobile = await livePage.newPage({ viewport: { width: 390, height: 844 } });
  await liveMobile.goto('https://core.corpflowai.com/app/clients', {
    waitUntil: 'domcontentloaded',
    timeout: 45000,
  });
  overflows.live_unauth_mobile = await liveMobile.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflowPx: Math.max(0, doc.scrollWidth - doc.clientWidth),
    };
  });
  await liveMobile.screenshot({ path: path.join(OUT, 'live-unauth-mobile.png'), fullPage: true });
  await liveMobile.close();
} finally {
  await livePage.close();
}

fs.writeFileSync(
  path.join(OUT, 'screenshot-overflow.json'),
  `${JSON.stringify({ captured_at: new Date().toISOString(), overflows }, null, 2)}\n`,
);
fs.writeFileSync(
  path.join(OUT, 'hops.json'),
  `${JSON.stringify(
    {
      captured_at: new Date().toISOString(),
      issue: 1212,
      proof_start: proofDetail,
      client: 'cmp_ada_spa_synthetic',
      prospect: 'syn-772-lr-ada',
      hops,
    },
    null,
    2,
  )}\n`,
);
console.log('wrote', path.join(OUT, 'screenshot-overflow.json'));
console.log('wrote', path.join(OUT, 'hops.json'));
