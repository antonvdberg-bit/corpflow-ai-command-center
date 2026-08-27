/**
 * #1201 desktop + mobile screenshots of Lead Rescue and Website Rescue
 * delivery progress in Tenant Workspace, plus /change round-trip, empty,
 * list-error, and staff-denied surfaces.
 *
 *   NEXT_PORT=3050 node scripts/tenant-delivery-progress-journey-capture-screenshots.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

import { actorFromSessionPayload } from '../lib/app/access.js';
import {
  LEAD_RESCUE_TENANT_REQUEST_ID,
  REFERENCE_TENANT_ID,
  WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID,
} from '../lib/app/constants.js';
import {
  handleAppCommercial,
  handleAppComponentReview,
  handleAppDelivery,
  handleAppProspects,
  handleAppRequestDetail,
  handleAppRequestsList,
  handleAppShell,
} from '../lib/app/handlers.js';
import { resetProspectFixtureStore } from '../lib/app/prospect-operations-workspace.js';
import { resetRequestStore } from '../lib/app/request-store.js';
import { tenantChangeHandoffHref, tenantWorkspaceReturnHref } from '../lib/app/tenant-journey.js';
import { LEAD_RESCUE_PREVIEW_COMPONENT_KEY } from '../lib/lead-rescue/tenant-delivery-progress.js';

process.env.NODE_ENV = 'test';
resetRequestStore();
resetProspectFixtureStore();

const PORT = Number(process.env.NEXT_PORT || 3050);
const OUT = path.resolve('artifacts/tenant-delivery-progress-1201');
fs.mkdirSync(OUT, { recursive: true });
const base = `http://127.0.0.1:${PORT}`;

const tenantActor = actorFromSessionPayload({
  typ: 'tenant',
  username: 'syn-1201-tenant',
  user_id: 'syn_user_1201_tenant',
  tenant_id: REFERENCE_TENANT_ID,
});

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
 * @param {'normal'|'empty'|'error'} mode
 */
async function dispatchAppApi(request, mode) {
  const url = new URL(request.url());
  const p = url.pathname.replace(/\/+$/, '') || '/';
  if (mode === 'empty' && p === '/api/app/requests') {
    return {
      status: 200,
      body: {
        ok: true,
        environment: 'tenant',
        requests: [],
        tenant_id: REFERENCE_TENANT_ID,
      },
    };
  }
  if (mode === 'error' && p === '/api/app/requests') {
    return { status: 503, body: { ok: false, error: 'requests_503' } };
  }
  const fakeReq = {
    method: request.method(),
    url: `${url.pathname}${url.search}`,
    headers: request.headers(),
    body: request.method() === 'POST' ? JSON.parse(request.postData() || '{}') : undefined,
    __testAppActor: tenantActor,
  };
  const res = mockRes();
  if (p === '/api/app/shell') await handleAppShell(fakeReq, res);
  else if (p === '/api/app/requests') await handleAppRequestsList(fakeReq, res);
  else if (p === '/api/app/request') await handleAppRequestDetail(fakeReq, res);
  else if (p === '/api/app/component-review') await handleAppComponentReview(fakeReq, res);
  else if (p === '/api/app/commercial') await handleAppCommercial(fakeReq, res);
  else if (p === '/api/app/delivery') await handleAppDelivery(fakeReq, res);
  else if (p === '/api/app/prospects') await handleAppProspects(fakeReq, res);
  else {
    return { status: 404, body: { ok: false, error: 'not_intercepted' } };
  }
  return { status: res.state.statusCode || 200, body: res.state.body };
}

/**
 * @param {import('playwright').Page} page
 * @param {'normal'|'empty'|'error'} mode
 */
async function installAppApi(page, mode = 'normal') {
  await page.route('**/api/app/**', async (route) => {
    try {
      const result = await dispatchAppApi(route.request(), mode);
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

async function shot(browser, name, url, viewport, after, mode = 'normal') {
  const page = await browser.newPage({ viewport });
  await installAppApi(page, mode);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  if (after) await after(page);
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  await page.close();
  console.log('wrote', file);
}

const tenantUrl = `${base}/app/tenant`;
const lrUrl = `${base}/app/tenant?id=${LEAD_RESCUE_TENANT_REQUEST_ID}`;
const wrUrl = `${base}/app/tenant?id=${WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID}`;
const changeUrl = `${base}${tenantChangeHandoffHref({ tenantId: REFERENCE_TENANT_ID })}`;
const returnUrl = `${base}${tenantWorkspaceReturnHref({ tenantId: REFERENCE_TENANT_ID })}`;
const commercialUrl = `${base}/app/commercial`;
const deliveryUrl = `${base}/app/delivery`;
const prospectsUrl = `${base}/app/prospects`;

const desktop = { width: 1440, height: 900 };
const mobile = { width: 390, height: 844 };

const browser = await chromium.launch({ headless: true });
try {
  await shot(browser, 'lr-list-desktop.png', tenantUrl, desktop, async (page) => {
    await page.getByTestId(`tenant-list-${LEAD_RESCUE_TENANT_REQUEST_ID}`).waitFor({ timeout: 20000 });
    await page.getByTestId(`tenant-list-${WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID}`).waitFor({
      timeout: 20000,
    });
  });
  await shot(browser, 'lr-list-mobile.png', tenantUrl, mobile, async (page) => {
    await page.getByTestId(`tenant-list-${LEAD_RESCUE_TENANT_REQUEST_ID}`).waitFor({ timeout: 20000 });
  });
  await shot(browser, 'lr-detail-desktop.png', lrUrl, desktop, async (page) => {
    await page.getByTestId(`tenant-open-${LEAD_RESCUE_TENANT_REQUEST_ID}`).click();
    await page.getByTestId('tenant-high-level-stage').waitFor({ timeout: 20000 });
    await page.getByTestId(`tenant-comp-${LEAD_RESCUE_PREVIEW_COMPONENT_KEY}`).waitFor({ timeout: 20000 });
  });
  await shot(browser, 'lr-detail-mobile.png', lrUrl, mobile, async (page) => {
    await page.getByTestId(`tenant-open-${LEAD_RESCUE_TENANT_REQUEST_ID}`).click();
    await page.getByTestId('tenant-high-level-stage').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'wr-detail-desktop.png', wrUrl, desktop, async (page) => {
    await page.getByTestId('tenant-delivery-stage').waitFor({ timeout: 20000 });
    await page.getByTestId('tenant-exposed-evidence-website_rescue_preview').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'wr-detail-mobile.png', wrUrl, mobile, async (page) => {
    await page.getByTestId('tenant-delivery-stage').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'change-desktop.png', changeUrl, desktop, async (page) => {
    await page.getByTestId('tenant-change-continuity').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'change-mobile.png', changeUrl, mobile, async (page) => {
    await page.getByTestId('tenant-change-continuity').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'return-desktop.png', returnUrl, desktop, async (page) => {
    await page.getByTestId('tenant-return-from-change').waitFor({ timeout: 20000 });
    await page.getByTestId('chip-tenant').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'return-mobile.png', returnUrl, mobile, async (page) => {
    await page.getByTestId('tenant-return-from-change').waitFor({ timeout: 20000 });
  });
  await shot(
    browser,
    'empty-desktop.png',
    tenantUrl,
    desktop,
    async (page) => {
      await page.getByTestId('tenant-requests-empty').waitFor({ timeout: 20000 });
    },
    'empty',
  );
  await shot(
    browser,
    'list-error-desktop.png',
    tenantUrl,
    desktop,
    async (page) => {
      await page.getByTestId('app-tenant-list-error').waitFor({ timeout: 20000 });
    },
    'error',
  );
  await shot(
    browser,
    'list-error-mobile.png',
    tenantUrl,
    mobile,
    async (page) => {
      await page.getByTestId('app-tenant-list-error').waitFor({ timeout: 20000 });
    },
    'error',
  );
  await shot(browser, 'commercial-denied-desktop.png', commercialUrl, desktop, async (page) => {
    await page.getByTestId('app-core-denied').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'delivery-denied-desktop.png', deliveryUrl, desktop, async (page) => {
    await page.getByTestId('app-core-denied').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'prospects-denied-desktop.png', prospectsUrl, desktop, async (page) => {
    await page.getByTestId('app-core-denied').waitFor({ timeout: 20000 });
  });
} finally {
  await browser.close();
}
