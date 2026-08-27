/**
 * #1177 desktop + mobile screenshots.
 *
 * Live unauthenticated corpflow_test pages (no intercept).
 * Deployed Commercial JS + in-process proof APIs (intercept) for the Ada/Bea drilldown.
 *
 *   node scripts/commercial-quotation-evidence-capture-screenshots.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

import { tryHandleAppApi } from '../lib/app/handlers.js';
import { resetProspectFixtureStore } from '../lib/app/prospect-operations-workspace.js';

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
delete process.env.VERCEL_ENV;
resetProspectFixtureStore();

const LIVE = process.env.LIVE_BASE_URL || 'https://core.corpflowai.com';
const OUT = path.resolve('artifacts/commercial-quotation-evidence-1177');
fs.mkdirSync(OUT, { recursive: true });

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

function mockRes() {
  /** @type {{ statusCode: number, body: any, headers: Record<string, string> }} */
  const state = { statusCode: 200, body: null, headers: {} };
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
    setHeader(name, value) {
      state.headers[String(name).toLowerCase()] = String(value);
      return this;
    },
    end(buf) {
      state.body = buf;
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
  };
  const res = mockRes();
  const pathSeg = url.pathname.replace(/^\/api\//, '').replace(/\/+$/, '') || '';
  const handled = await tryHandleAppApi(fakeReq, res, pathSeg);
  if (!handled) return { status: 404, json: { ok: false, error: 'not_intercepted' }, bytes: null, headers: {} };
  const isPdf =
    Buffer.isBuffer(res.state.body) &&
    String(res.state.headers['content-type'] || '').includes('pdf');
  return {
    status: res.state.statusCode || 200,
    json: isPdf ? null : res.state.body,
    bytes: isPdf ? res.state.body : null,
    headers: res.state.headers,
  };
}

/**
 * @param {import('playwright').Page} page
 */
async function installAppApi(page) {
  await page.route('**/api/app/**', async (route) => {
    try {
      const result = await dispatchAppApi(route.request());
      if (result.bytes) {
        await route.fulfill({
          status: result.status,
          contentType: result.headers['content-type'] || 'application/pdf',
          body: result.bytes,
          headers: {
            'content-disposition': result.headers['content-disposition'] || 'inline; filename="quotation.pdf"',
          },
        });
        return;
      }
      await route.fulfill({
        status: result.status,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify(result.json || {}),
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

async function overflowPx(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const width = Math.max(root.scrollWidth, body ? body.scrollWidth : 0);
    return Math.max(0, width - root.clientWidth);
  });
}

/**
 * @param {import('playwright').Browser} browser
 * @param {string} name
 * @param {string} url
 * @param {{ width: number, height: number }} viewport
 * @param {(page: import('playwright').Page) => Promise<void>} [after]
 * @param {{ intercept?: boolean }} [opts]
 */
async function shot(browser, name, url, viewport, after, opts = {}) {
  const page = await browser.newPage({ viewport });
  if (opts.intercept) await installAppApi(page);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  if (after) await after(page);
  const overflow = await overflowPx(page);
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  await page.close();
  console.log('wrote', file, 'overflow_px', overflow);
  return overflow;
}

/** @type {Record<string, number>} */
const overflow = {};
const browser = await chromium.launch({ headless: true });
try {
  overflow.live_commercial_unauth_desktop = await shot(
    browser,
    'live-commercial-unauth-desktop.png',
    `${LIVE}/app/commercial`,
    DESKTOP,
    async (page) => {
      await page.getByTestId('app-auth-required').waitFor({ timeout: 20000 });
    },
  );
  overflow.live_commercial_unauth_mobile = await shot(
    browser,
    'live-commercial-unauth-mobile.png',
    `${LIVE}/app/commercial`,
    MOBILE,
    async (page) => {
      await page.getByTestId('app-auth-required').waitFor({ timeout: 20000 });
    },
  );
  overflow.live_quotation_unauth_desktop = await shot(
    browser,
    'live-quotation-unauth-desktop.png',
    `${LIVE}/app/commercial/syn-772-lr-ada`,
    DESKTOP,
    async (page) => {
      await page.getByTestId('app-auth-required').waitFor({ timeout: 20000 });
    },
  );
  overflow.live_quotation_unauth_mobile = await shot(
    browser,
    'live-quotation-unauth-mobile.png',
    `${LIVE}/app/commercial/syn-772-lr-ada`,
    MOBILE,
    async (page) => {
      await page.getByTestId('app-auth-required').waitFor({ timeout: 20000 });
    },
  );
  overflow.live_proof_rejected_desktop = await shot(
    browser,
    'live-proof-rejected-desktop.png',
    `${LIVE}/app/commercial?proof=1&filter=all`,
    DESKTOP,
    async (page) => {
      await page.getByTestId('app-auth-required').waitFor({ timeout: 20000 });
    },
  );

  overflow.proof_commercial_desktop = await shot(
    browser,
    'proof-commercial-desktop.png',
    `${LIVE}/app/commercial?proof=1&filter=all`,
    DESKTOP,
    async (page) => {
      await page.getByTestId('commercial-quotation-syn-772-lr-ada').waitFor({ timeout: 20000 });
    },
    { intercept: true },
  );
  overflow.proof_commercial_mobile = await shot(
    browser,
    'proof-commercial-mobile.png',
    `${LIVE}/app/commercial?proof=1&filter=all`,
    MOBILE,
    async (page) => {
      await page.getByTestId('commercial-quotation-syn-772-lr-ada').waitFor({ timeout: 20000 });
    },
    { intercept: true },
  );
  overflow.proof_ada_desktop = await shot(
    browser,
    'proof-ada-quotation-desktop.png',
    `${LIVE}/app/commercial/syn-772-lr-ada?proof=1`,
    DESKTOP,
    async (page) => {
      await page.getByTestId('commercial-quotation-evidence').waitFor({ timeout: 20000 });
      await page.getByTestId('commercial-quotation-id').waitFor({ timeout: 20000 });
    },
    { intercept: true },
  );
  overflow.proof_ada_mobile = await shot(
    browser,
    'proof-ada-quotation-mobile.png',
    `${LIVE}/app/commercial/syn-772-lr-ada?proof=1`,
    MOBILE,
    async (page) => {
      await page.getByTestId('commercial-quotation-evidence').waitFor({ timeout: 20000 });
    },
    { intercept: true },
  );
  overflow.proof_bea_desktop = await shot(
    browser,
    'proof-bea-missing-desktop.png',
    `${LIVE}/app/commercial/syn-772-rd-bea?proof=1`,
    DESKTOP,
    async (page) => {
      await page.getByTestId('commercial-quotation-blocker').waitFor({ timeout: 20000 });
    },
    { intercept: true },
  );
  overflow.proof_bea_mobile = await shot(
    browser,
    'proof-bea-missing-mobile.png',
    `${LIVE}/app/commercial/syn-772-rd-bea?proof=1`,
    MOBILE,
    async (page) => {
      await page.getByTestId('commercial-quotation-blocker').waitFor({ timeout: 20000 });
    },
    { intercept: true },
  );
} finally {
  await browser.close();
  resetProspectFixtureStore();
}

fs.writeFileSync(path.join(OUT, 'viewport-overflow.json'), `${JSON.stringify({ overflow, unit: 'px' }, null, 2)}\n`);
console.log(JSON.stringify({ overflow }, null, 2));
