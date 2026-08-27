/**
 * #1149 desktop + mobile screenshots: live corpflow_test unauthenticated
 * surfaces, plus optional local Next proof journey (NEXT_PORT).
 *
 * Live:
 *   node scripts/current-main-application-journey-capture-screenshots.mjs
 *
 * Local proof (Next does not apply Vercel /api rewrites, so /api/app/* is intercepted):
 *   NEXT_PORT=3050 node scripts/current-main-application-journey-capture-screenshots.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

import { tryHandleAppApi } from '../lib/app/handlers.js';
import { resetRequestStore } from '../lib/app/request-store.js';
import { tenantChangeHandoffHref, tenantWorkspaceReturnHref } from '../lib/app/tenant-journey.js';

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
delete process.env.VERCEL_ENV;
resetRequestStore();

const LIVE = process.env.LIVE_BASE_URL || 'https://core.corpflowai.com';
const LUX = process.env.LUX_BASE_URL || 'https://lux.corpflowai.com';
const PORT = Number(process.env.NEXT_PORT || 0);
const OUT = path.resolve('artifacts/current-main-application-journey-1149');
fs.mkdirSync(OUT, { recursive: true });

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

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
  const pathSeg = url.pathname.replace(/^\/api\//, '').replace(/\/+$/, '') || '';
  const handled = await tryHandleAppApi(fakeReq, res, pathSeg);
  if (!handled) return { status: 404, body: { ok: false, error: 'not_intercepted' } };
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
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  await page.close();
  console.log('wrote', file);
}

const browser = await chromium.launch({ headless: true });
try {
  await shot(browser, 'live-tenant-unauth-desktop.png', `${LIVE}/app/tenant`, DESKTOP, async (page) => {
    await page.getByTestId('app-auth-required').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'live-tenant-unauth-mobile.png', `${LIVE}/app/tenant`, MOBILE, async (page) => {
    await page.getByTestId('app-auth-required').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'live-commercial-unauth-desktop.png', `${LIVE}/app/commercial`, DESKTOP, async (page) => {
    await page.getByTestId('app-auth-required').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'live-commercial-unauth-mobile.png', `${LIVE}/app/commercial`, MOBILE, async (page) => {
    await page.getByTestId('app-auth-required').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'live-delivery-unauth-desktop.png', `${LIVE}/app/delivery`, DESKTOP, async (page) => {
    await page.getByTestId('app-auth-required').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'live-delivery-unauth-mobile.png', `${LIVE}/app/delivery`, MOBILE, async (page) => {
    await page.getByTestId('app-auth-required').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'live-chooser-desktop.png', `${LIVE}/app`, DESKTOP, async (page) => {
    await page.getByTestId('app-entry-chooser').waitFor({ timeout: 25000 });
  });
  await shot(browser, 'live-chooser-mobile.png', `${LIVE}/app`, MOBILE, async (page) => {
    await page.getByTestId('app-entry-chooser').waitFor({ timeout: 25000 });
  });
  await shot(
    browser,
    'live-change-handoff-desktop.png',
    `${LIVE}/change?from=tenant-workspace`,
    DESKTOP,
    async (page) => {
      await page.getByTestId('tenant-change-continuity').waitFor({ timeout: 20000 });
    },
  );
  await shot(
    browser,
    'live-change-handoff-mobile.png',
    `${LIVE}/change?from=tenant-workspace`,
    MOBILE,
    async (page) => {
      await page.getByTestId('tenant-change-continuity').waitFor({ timeout: 20000 });
    },
  );
  await shot(browser, 'live-lux-change-desktop.png', `${LUX}/change`, DESKTOP, async (page) => {
    await page.waitForTimeout(1500);
  });
  await shot(
    browser,
    'live-proof-rejected-desktop.png',
    `${LIVE}/app/tenant?proof=1`,
    DESKTOP,
    async (page) => {
      await page.getByTestId('app-auth-required').waitFor({ timeout: 20000 });
    },
  );

  if (PORT) {
    const base = `http://127.0.0.1:${PORT}`;
    const changeUrl = `${base}${tenantChangeHandoffHref({ tenantId: 'corpflowai' })}`;
    const returnUrl = `${base}${tenantWorkspaceReturnHref({ tenantId: 'corpflowai' })}&proof=1`;
    await shot(
      browser,
      'local-tenant-session-desktop.png',
      `${base}/app/tenant?proof=1`,
      DESKTOP,
      async (page) => {
        await page.getByTestId('tenant-requests-progress-root').waitFor({ timeout: 20000 });
      },
      { intercept: true },
    );
    await shot(
      browser,
      'local-tenant-session-mobile.png',
      `${base}/app/tenant?proof=1`,
      MOBILE,
      async (page) => {
        await page.getByTestId('tenant-requests-progress-root').waitFor({ timeout: 20000 });
      },
      { intercept: true },
    );
    await shot(
      browser,
      'local-commercial-session-desktop.png',
      `${base}/app/commercial?proof=1&filter=all`,
      DESKTOP,
      async (page) => {
        await page.getByTestId('commercial-summary').waitFor({ timeout: 20000 });
      },
      { intercept: true },
    );
    await shot(
      browser,
      'local-commercial-session-mobile.png',
      `${base}/app/commercial?proof=1&filter=all`,
      MOBILE,
      async (page) => {
        await page.getByTestId('commercial-summary').waitFor({ timeout: 20000 });
      },
      { intercept: true },
    );
    await shot(
      browser,
      'local-delivery-session-desktop.png',
      `${base}/app/delivery?proof=1&filter=all`,
      DESKTOP,
      async (page) => {
        await page.getByTestId('delivery-summary').waitFor({ timeout: 20000 });
      },
      { intercept: true },
    );
    await shot(
      browser,
      'local-delivery-session-mobile.png',
      `${base}/app/delivery?proof=1&filter=all`,
      MOBILE,
      async (page) => {
        await page.getByTestId('delivery-summary').waitFor({ timeout: 20000 });
      },
      { intercept: true },
    );
    await shot(browser, 'local-change-handoff-desktop.png', changeUrl, DESKTOP, async (page) => {
      await page.getByTestId('tenant-change-continuity').waitFor({ timeout: 20000 });
    });
    await shot(browser, 'local-change-handoff-mobile.png', changeUrl, MOBILE, async (page) => {
      await page.getByTestId('tenant-change-continuity').waitFor({ timeout: 20000 });
    });
    await shot(browser, 'local-tenant-return-desktop.png', returnUrl, DESKTOP, async (page) => {
      await page.getByTestId('tenant-return-from-change').waitFor({ timeout: 20000 });
    }, { intercept: true });
    await shot(
      browser,
      'local-clients-session-desktop.png',
      `${base}/app/clients?proof=1`,
      DESKTOP,
      async (page) => {
        await page.getByTestId('clients-list').waitFor({ timeout: 20000 }).catch(async () => {
          await page.waitForTimeout(2000);
        });
      },
      { intercept: true },
    );
  }
} finally {
  await browser.close();
}

console.log('screenshots complete:', OUT);
