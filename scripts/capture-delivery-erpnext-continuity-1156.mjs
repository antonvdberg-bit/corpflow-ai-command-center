/**
 * #1156 desktop + mobile operator evidence for Delivery Workspace ERPNext continuity.
 * Next does not apply vercel.json /api rewrites locally, so this script intercepts
 * /api/app/* with the same handlers Vercel serves via factory_router.
 *
 *   NEXT_PORT=3000 node scripts/capture-delivery-erpnext-continuity-1156.mjs
 *
 * Proof mode only. GET/read-only. Does not mutate ERPNext, schema, or secrets.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

import { handleAppDelivery, handleAppShell } from '../lib/app/handlers.js';

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const PORT = Number(process.env.NEXT_PORT || 3000);
const OUT = path.resolve('artifacts/erpnext/delivery-workspace-continuity-1156');
fs.mkdirSync(OUT, { recursive: true });
const base = `http://127.0.0.1:${PORT}`;
const SYNTHETIC_ID = 'erpnext:cf1097-synthetic-delivery';

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
 * @param {string} pathAndQuery
 * @param {{ width: number, height: number }} viewport
 * @param {(page: import('playwright').Page) => Promise<void>} after
 */
async function shot(browser, name, pathAndQuery, viewport, after) {
  const page = await browser.newPage({ viewport });
  await installAppApi(page);
  const url = `${base}${pathAndQuery}`;
  const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  if (after) await after(page);
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  const payload = {
    name,
    status: res ? res.status() : 0,
    url,
    file,
    title: await page.title(),
    projectText: await page
      .getByTestId('delivery-erpnext-project')
      .textContent()
      .catch(() => null),
    issueText: await page
      .getByTestId('delivery-erpnext-issue')
      .textContent()
      .catch(() => null),
    linkedRow: await page
      .locator(`[data-testid="delivery-row-${SYNTHETIC_ID}"]`)
      .getAttribute('data-erpnext-linked')
      .catch(() => null),
  };
  await page.close();
  return payload;
}

const listUrl = '/app/delivery?proof=1';
const drillUrl = `/app/delivery?proof=1&item=${encodeURIComponent(SYNTHETIC_ID)}`;

const browser = await chromium.launch({ headless: true });
let report;
try {
  const desktop = await shot(
    browser,
    'operator-desktop-1440.png',
    listUrl,
    { width: 1440, height: 900 },
    async (page) => {
      await page.getByTestId('delivery-summary').waitFor({ timeout: 30000 });
      await page.locator(`[data-testid="delivery-row-${SYNTHETIC_ID}"]`).waitFor({ timeout: 15000 });
    },
  );
  const desktopDrill = await shot(
    browser,
    'operator-desktop-1440-drilldown.png',
    drillUrl,
    { width: 1440, height: 900 },
    async (page) => {
      await page.getByTestId('delivery-erpnext-reference').waitFor({ timeout: 30000 });
    },
  );
  const mobile = await shot(
    browser,
    'operator-mobile-390.png',
    listUrl,
    { width: 390, height: 844 },
    async (page) => {
      await page.getByTestId('delivery-summary').waitFor({ timeout: 30000 });
      await page.locator(`[data-testid="delivery-row-${SYNTHETIC_ID}"]`).waitFor({ timeout: 15000 });
    },
  );
  const mobileDrill = await shot(
    browser,
    'operator-mobile-390-drilldown.png',
    drillUrl,
    { width: 390, height: 844 },
    async (page) => {
      await page.getByTestId('delivery-erpnext-reference').waitFor({ timeout: 30000 });
    },
  );
  report = {
    packet: 'issue-1156',
    captured_at: new Date().toISOString(),
    expected: {
      route: '/app/delivery?proof=1',
      drilldown: '/app/delivery?proof=1&item=erpnext:cf1097-synthetic-delivery',
      synthetic_item: SYNTHETIC_ID,
      project: 'PROJ-0001',
      issue: 'ISS-2026-00001',
      ada_unlinked: true,
    },
    actual: { desktop, desktopDrill, mobile, mobileDrill },
  };
  const projectOk = String(desktopDrill.projectText || '').includes('PROJ-0001');
  const issueOk = String(desktopDrill.issueText || '').includes('ISS-2026-00001');
  report.expected_vs_actual = {
    project_shown: projectOk,
    issue_shown: issueOk,
    linked_row: desktop.linkedRow === 'true',
    verdict:
      projectOk && issueOk && desktop.linkedRow === 'true'
        ? 'DELIVERY -> ERPNEXT PROJECT/SUPPORT CONTINUITY USABLE'
        : 'NOT READY — operator evidence mismatch',
  };
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(OUT, 'operator-evidence.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report?.expected_vs_actual?.project_shown) process.exit(1);
