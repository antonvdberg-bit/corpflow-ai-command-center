/**
 * #1178 desktop + mobile screenshots of the real Next.js Delivery Workspace.
 * Next on NEXT_PORT (default 3050) does not apply Vercel /api rewrites, so this
 * script intercepts /api/app/* with the same handlers used in production.
 *
 *   NEXT_PORT=3050 node scripts/delivery-workspace-1178-capture-screenshots.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

import { handleAppDelivery, handleAppShell } from '../lib/app/handlers.js';
import { resetProspectFixtureStore } from '../lib/app/prospect-operations-workspace.js';
import { resetRequestStore } from '../lib/app/request-store.js';

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
resetRequestStore();
resetProspectFixtureStore();

const PORT = Number(process.env.NEXT_PORT || 3050);
const OUT = path.resolve('artifacts/delivery-workspace-1178');
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
  else if (p === '/api/app/delivery') await handleAppDelivery(fakeReq, res);
  else {
    return { status: 404, body: { ok: false, error: 'not_intercepted' } };
  }
  return { status: res.state.statusCode || 200, body: res.state.body };
}

/**
 * @param {import('playwright').Page} page
 * @param {{ forceTenantDeny?: boolean }} [opts]
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

const unauth = `${base}/app/delivery`;
const proof = `${base}/app/delivery?proof=1`;
const inputs = `${base}/app/delivery?proof=1&filter=inputs_pending`;
const review = `${base}/app/delivery?proof=1&filter=client_review_pending`;
const blocked = `${base}/app/delivery?proof=1&filter=blocked`;
const protectedFilter = `${base}/app/delivery?proof=1&filter=protected_deploy_approval_required`;
const previewEmpty = `${base}/app/delivery?proof=1&filter=preview_ready`;

const browser = await chromium.launch({ headless: true });
/** @type {Record<string, unknown>} */
const overflows = {};
try {
  overflows.unauth_desktop = await shot(
    browser,
    'delivery-unauth-desktop.png',
    unauth,
    { width: 1440, height: 900 },
    async (page) => {
      await page.getByTestId('app-auth-required').waitFor({ timeout: 20000 });
    },
  );
  overflows.unauth_mobile = await shot(
    browser,
    'delivery-unauth-mobile.png',
    unauth,
    { width: 390, height: 844 },
    async (page) => {
      await page.getByTestId('app-auth-required').waitFor({ timeout: 20000 });
    },
  );
  overflows.proof_desktop = await shot(
    browser,
    'delivery-proof-desktop.png',
    proof,
    { width: 1440, height: 900 },
    async (page) => {
      await page.getByTestId('delivery-summary-list').waitFor({ timeout: 20000 });
      await page.getByTestId('delivery-row-lead:syn-995-lr-prot').waitFor({ timeout: 20000 });
      await page.getByRole('link', { name: 'Commercial' }).first().waitFor({ timeout: 20000 });
    },
  );
  overflows.proof_mobile = await shot(
    browser,
    'delivery-proof-mobile.png',
    proof,
    { width: 390, height: 844 },
    async (page) => {
      await page.getByTestId('delivery-summary-list').waitFor({ timeout: 20000 });
    },
  );
  overflows.inputs_desktop = await shot(
    browser,
    'delivery-inputs-pending-desktop.png',
    inputs,
    { width: 1440, height: 900 },
    async (page) => {
      await page.getByTestId('delivery-filter-inputs_pending').waitFor({ timeout: 20000 });
      await page.getByTestId('delivery-summary-list').waitFor({ timeout: 20000 });
    },
  );
  overflows.review_desktop = await shot(
    browser,
    'delivery-client-review-desktop.png',
    review,
    { width: 1440, height: 900 },
    async (page) => {
      await page.getByTestId('delivery-summary-list').waitFor({ timeout: 20000 });
    },
  );
  overflows.blocked_desktop = await shot(
    browser,
    'delivery-blocked-desktop.png',
    blocked,
    { width: 1440, height: 900 },
    async (page) => {
      await page.getByTestId('delivery-summary-list').waitFor({ timeout: 20000 });
    },
  );
  overflows.protected_desktop = await shot(
    browser,
    'delivery-protected-desktop.png',
    protectedFilter,
    { width: 1440, height: 900 },
    async (page) => {
      await page.getByTestId('delivery-protected-badge').waitFor({ timeout: 20000 });
    },
  );
  overflows.protected_mobile = await shot(
    browser,
    'delivery-protected-mobile.png',
    protectedFilter,
    { width: 390, height: 844 },
    async (page) => {
      await page.getByTestId('delivery-protected-badge').waitFor({ timeout: 20000 });
    },
  );
  overflows.preview_empty_desktop = await shot(
    browser,
    'delivery-preview-ready-empty-desktop.png',
    previewEmpty,
    { width: 1440, height: 900 },
    async (page) => {
      await page.getByTestId('delivery-summary-empty').waitFor({ timeout: 20000 });
    },
  );
  overflows.tenant_denied_desktop = await shot(
    browser,
    'delivery-tenant-denied-desktop.png',
    proof,
    { width: 1440, height: 900 },
    async (page) => {
      await page.getByTestId('app-core-denied').waitFor({ timeout: 20000 });
    },
    { forceTenantDeny: true },
  );
  overflows.tenant_denied_mobile = await shot(
    browser,
    'delivery-tenant-denied-mobile.png',
    proof,
    { width: 390, height: 844 },
    async (page) => {
      await page.getByTestId('app-core-denied').waitFor({ timeout: 20000 });
    },
    { forceTenantDeny: true },
  );
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(OUT, 'screenshot-overflow.json'), `${JSON.stringify({ captured_at: new Date().toISOString(), overflows }, null, 2)}\n`);
console.log('wrote', path.join(OUT, 'screenshot-overflow.json'));
