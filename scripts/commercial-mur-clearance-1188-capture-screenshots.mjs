/**
 * #1188 desktop + mobile screenshots of the CF1018 MUR quotation → clearance journey.
 *
 *   NEXT_PORT=3051 node scripts/commercial-mur-clearance-1188-capture-screenshots.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

import {
  handleAppCommercial,
  handleAppCommercialQuotation,
  handleAppProspectDetail,
  handleAppShell,
} from '../lib/app/handlers.js';
import { resetProspectFixtureStore } from '../lib/app/prospect-operations-workspace.js';

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
resetProspectFixtureStore();

const PORT = Number(process.env.NEXT_PORT || 3051);
const OUT = path.resolve('artifacts/commercial-mur-clearance-1188');
fs.mkdirSync(OUT, { recursive: true });
const base = `http://127.0.0.1:${PORT}`;
const CF1018_ID = 'cf1018-synthetic-sales-lifecycle';

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
    body: request.method() === 'POST' ? JSON.parse(request.postData() || '{}') : undefined,
  };
  const res = mockRes();
  const p = url.pathname.replace(/\/+$/, '') || '/';
  if (p === '/api/app/shell') await handleAppShell(fakeReq, res);
  else if (p === '/api/app/commercial') await handleAppCommercial(fakeReq, res);
  else if (p === '/api/app/commercial-quotation') await handleAppCommercialQuotation(fakeReq, res);
  else if (p === '/api/app/prospect') await handleAppProspectDetail(fakeReq, res);
  else {
    return { status: 404, body: { ok: false, error: 'not_intercepted' } };
  }
  return { status: res.state.statusCode || 200, body: res.state.body };
}

/**
 * @param {import('playwright').Page} page
 */
async function installAppApi(page) {
  await page.route('**/api/app/**', async (route) => {
    try {
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

async function shot(browser, name, url, viewport, after) {
  const page = await browser.newPage({ viewport });
  await installAppApi(page);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  if (after) await after(page);
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  await page.close();
  console.log('wrote', file);
}

const commercialUrl = `${base}/app/commercial?proof=1&filter=all`;
const quotationUrl = `${base}/app/commercial/${CF1018_ID}?proof=1`;
const prospectUrl = `${base}/app/prospects/${CF1018_ID}?proof=1`;

const browser = await chromium.launch({ headless: true });
try {
  await shot(browser, 'commercial-desktop.png', commercialUrl, { width: 1440, height: 900 }, async (page) => {
    await page.getByTestId(`commercial-row-${CF1018_ID}`).waitFor({ timeout: 20000 });
  });
  await shot(browser, 'commercial-mobile.png', commercialUrl, { width: 390, height: 844 }, async (page) => {
    await page.getByTestId(`commercial-row-${CF1018_ID}`).waitFor({ timeout: 20000 });
  });
  await shot(browser, 'quotation-desktop.png', quotationUrl, { width: 1440, height: 900 }, async (page) => {
    await page.getByTestId('commercial-quotation-id').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'quotation-mobile.png', quotationUrl, { width: 390, height: 844 }, async (page) => {
    await page.getByTestId('commercial-quotation-id').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'clearance-desktop.png', prospectUrl, { width: 1440, height: 900 }, async (page) => {
    await page.getByTestId('commercial-clearance-status').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'clearance-mobile.png', prospectUrl, { width: 390, height: 844 }, async (page) => {
    await page.getByTestId('commercial-clearance-status').waitFor({ timeout: 20000 });
  });
} finally {
  await browser.close();
}
