/**
 * #1151 desktop + mobile screenshots of Website Rescue progress in Tenant Workspace.
 *
 *   NEXT_PORT=3050 node scripts/website-rescue-tenant-progress-capture-screenshots.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

import {
  handleAppRequestDetail,
  handleAppRequestsList,
  handleAppShell,
} from '../lib/app/handlers.js';
import { resetRequestStore } from '../lib/app/request-store.js';
import { resetProspectFixtureStore } from '../lib/app/prospect-operations-workspace.js';
import { WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID } from '../lib/app/constants.js';
import { tenantChangeHandoffHref } from '../lib/app/tenant-journey.js';

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
resetRequestStore();
resetProspectFixtureStore();

const PORT = Number(process.env.NEXT_PORT || 3050);
const OUT = path.resolve('artifacts/website-rescue-tenant-progress-1151');
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
  else if (p === '/api/app/requests') await handleAppRequestsList(fakeReq, res);
  else if (p === '/api/app/request') await handleAppRequestDetail(fakeReq, res);
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

const wrUrl = `${base}/app/tenant?proof=1&id=${WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID}`;
const changeUrl = `${base}${tenantChangeHandoffHref({ tenantId: 'corpflowai' })}`;

const browser = await chromium.launch({ headless: true });
try {
  await shot(browser, 'wr-progress-desktop.png', wrUrl, { width: 1440, height: 900 }, async (page) => {
    await page.getByTestId('tenant-delivery-stage').waitFor({ timeout: 20000 });
    await page.getByTestId('tenant-exposed-evidence-website_rescue_preview').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'wr-progress-mobile.png', wrUrl, { width: 390, height: 844 }, async (page) => {
    await page.getByTestId('tenant-delivery-stage').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'wr-change-desktop.png', changeUrl, { width: 1440, height: 900 }, async (page) => {
    await page.getByTestId('tenant-change-continuity').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'wr-change-mobile.png', changeUrl, { width: 390, height: 844 }, async (page) => {
    await page.getByTestId('tenant-change-continuity').waitFor({ timeout: 20000 });
  });
} finally {
  await browser.close();
}
