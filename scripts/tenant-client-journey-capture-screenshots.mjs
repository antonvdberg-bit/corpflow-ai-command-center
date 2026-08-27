/**
 * #1120 desktop + mobile screenshots of the real Next.js Tenant Workspace.
 * Next on NEXT_PORT (default 3050) does not apply Vercel /api rewrites, so this
 * script intercepts /api/app/* with the same handlers used in production.
 *
 *   NEXT_PORT=3050 node scripts/tenant-client-journey-capture-screenshots.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

import {
  handleAppComponentReview,
  handleAppRequestDetail,
  handleAppRequestsList,
  handleAppShell,
} from '../lib/app/handlers.js';
import { resetRequestStore } from '../lib/app/request-store.js';
import { CANONICAL_REQUEST_ID } from '../lib/app/constants.js';
import { tenantChangeHandoffHref, tenantWorkspaceReturnHref } from '../lib/app/tenant-journey.js';

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
resetRequestStore();

const PORT = Number(process.env.NEXT_PORT || 3050);
const OUT = path.resolve('artifacts/tenant-client-journey-1120');
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
  else if (p === '/api/app/component-review') await handleAppComponentReview(fakeReq, res);
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

const tenantUnauth = `${base}/app/tenant`;
const tenantProof = `${base}/app/tenant?proof=1`;
const chooser = `${base}/app`;
const changeUrl = `${base}${tenantChangeHandoffHref({ tenantId: 'corpflowai' })}`;
const returnUrl = `${base}${tenantWorkspaceReturnHref({ tenantId: 'corpflowai' })}&proof=1`;
const coreProof = `${base}/app/core?proof=1`;

const browser = await chromium.launch({ headless: true });
try {
  await shot(browser, 'tenant-unauth-desktop.png', tenantUnauth, { width: 1440, height: 900 }, async (page) => {
    await page.getByTestId('app-auth-required').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'tenant-unauth-mobile.png', tenantUnauth, { width: 390, height: 844 }, async (page) => {
    await page.getByTestId('app-auth-required').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'chooser-staff-desktop.png', chooser, { width: 1440, height: 900 }, async (page) => {
    await page.getByTestId('app-entry-chooser').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'tenant-session-desktop.png', tenantProof, { width: 1440, height: 900 }, async (page) => {
    await page.getByTestId('tenant-requests-progress-root').waitFor({ timeout: 20000 });
    await page.getByTestId(`tenant-comp-landing_copy`).waitFor({ timeout: 20000 }).catch(() => {});
  });
  await shot(browser, 'tenant-session-mobile.png', tenantProof, { width: 390, height: 844 }, async (page) => {
    await page.getByTestId('tenant-requests-progress-root').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'tenant-review-desktop.png', tenantProof, { width: 1440, height: 900 }, async (page) => {
    await page.getByTestId('tenant-comment-landing_copy').waitFor({ timeout: 20000 });
    await page.getByTestId('tenant-comment-landing_copy').fill('Please publish this copy.');
    await page.getByTestId('tenant-approve-landing_copy').click();
    await page.getByTestId('app-notice').waitFor({ timeout: 15000 });
  });
  await shot(browser, 'core-decision-desktop.png', coreProof, { width: 1440, height: 900 }, async (page) => {
    await page.getByTestId(`core-open-${CANONICAL_REQUEST_ID}`).waitFor({ timeout: 20000 });
    await page.getByTestId(`core-open-${CANONICAL_REQUEST_ID}`).click();
    await page.getByTestId('core-client-decision-landing_copy').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'change-desktop-handoff.png', changeUrl, { width: 1440, height: 900 }, async (page) => {
    await page.getByTestId('tenant-change-continuity').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'change-mobile-handoff.png', changeUrl, { width: 390, height: 844 }, async (page) => {
    await page.getByTestId('tenant-change-continuity').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'tenant-return-desktop.png', returnUrl, { width: 1440, height: 900 }, async (page) => {
    await page.getByTestId('tenant-return-from-change').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'tenant-return-mobile.png', returnUrl, { width: 390, height: 844 }, async (page) => {
    await page.getByTestId('tenant-return-from-change').waitFor({ timeout: 20000 });
  });
} finally {
  await browser.close();
}
