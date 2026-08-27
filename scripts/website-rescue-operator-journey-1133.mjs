/**
 * #1133 local operator-journey smoke for Website Rescue on shared Prospect detail.
 * Proof mode only. No secrets, no DNS, no deploy.
 *
 * Usage (dev server already running):
 *   WR_SMOKE_BASE_URL=http://127.0.0.1:3000 node scripts/website-rescue-operator-journey-1133.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

import { tryHandleAppApi } from '../lib/app/handlers.js';
import { resetProspectFixtureStore } from '../lib/app/prospect-operations-workspace.js';

const BASE = String(process.env.WR_SMOKE_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const OUT = 'artifacts/website-rescue-operator-journey-1133';

/**
 * next dev does not apply vercel.json /api → factory_router rewrites.
 * Fulfill Operating Workspace API calls with the same handlers production uses.
 *
 * @param {import('playwright').Page} page
 */
async function installAppApiFulfill(page) {
  await page.route('**/api/app/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathSeg = url.pathname.replace(/^\/api\//, '').replace(/\/+$/, '');
    const headers = request.headers();
    let body = null;
    if (request.method() !== 'GET' && request.method() !== 'HEAD') {
      try {
        body = request.postDataJSON();
      } catch {
        body = null;
      }
    }
    const fakeReq = {
      method: request.method(),
      url: `${url.pathname}${url.search}`,
      headers,
      body,
    };
    /** @type {{ statusCode: number, payload: unknown }} */
    const state = { statusCode: 200, payload: null };
    const fakeRes = {
      status(code) {
        state.statusCode = code;
        return this;
      },
      json(payload) {
        state.payload = payload;
        return this;
      },
    };
    const handled = await tryHandleAppApi(fakeReq, fakeRes, pathSeg);
    if (!handled) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'not_found' }),
      });
      return;
    }
    await route.fulfill({
      status: state.statusCode,
      contentType: 'application/json',
      body: JSON.stringify(state.payload ?? {}),
    });
  });
}

function overflow(page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    overflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
  }));
}

async function fillIntake(page) {
  await page.selectOption('[data-testid="wr-case-type"]', 'one_page');
  await page.selectOption('[data-testid="wr-tier"]', 'T1');
  await page.fill('[data-testid="wr-business"]', 'Wren Workshop');
  await page.fill('[data-testid="wr-contact"]', 'Wren Cleared');
  await page.fill('[data-testid="wr-email"]', 'wren@example.com');
  await page.fill('[data-testid="wr-phone"]', '+2305161616');
  await page.fill('[data-testid="wr-current-site"]', 'https://wren-workshop.example');
  await page.fill('[data-testid="wr-hostname"]', 'wren-workshop.example');
  await page.selectOption('[data-testid="wr-brand"]', 'wordmark_ok');
  await page.fill('[data-testid="wr-approver"]', 'Wren Cleared');
  await page.fill('[data-testid="wr-hosting"]', 'Shared host; operator manages preview. No passwords stored.');
  await page.fill('[data-testid="wr-pages"]', 'home');
  await page.fill('[data-testid="wr-services"]', 'Workshop booking enquiry only.');
  await page.fill('[data-testid="wr-content-owner"]', 'Owner owns offer wording; operator owns layout and CTA.');
  await page.fill('[data-testid="wr-enquiry"]', 'wren@example.com');
  await page.fill('[data-testid="wr-design"]', 'Guided direction A — clear enquiry path.');
  await page.fill('[data-testid="wr-revision-authority"]', 'Wren Cleared');
  await page.fill('[data-testid="wr-cadence"]', 'Preview feedback within 2 business days.');
  await page.check('[data-testid="wr-assets-ready"]');
  await page.check('[data-testid="wr-access-confirmed"]');
  const checks = page.locator('[data-testid="website-rescue-delivery-checklist"] input[type="checkbox"]');
  const count = await checks.count();
  for (let i = 0; i < count; i += 1) {
    await checks.nth(i).check();
  }
  await page.fill('[data-testid="wr-preview-url"]', '/demo/cafe-international');
  await page.selectOption('[data-testid="wr-next-state"]', 'onboarding_in_progress');
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  resetProspectFixtureStore();
  const browser = await chromium.launch({ headless: true });
  /** @type {Record<string, unknown>} */
  const evidence = {
    schema: 'corpflow.website_rescue_operator_journey_1133.v1',
    generated_at: new Date().toISOString(),
    base_url: BASE,
    routes: [
      '/app/prospects/syn-716-wr-cleared?proof=1',
      '/app/prospects/syn-772-rd-bea?proof=1',
      '/app/prospects?proof=1',
      '/app/clients?proof=1',
    ],
    cases: [],
  };

  try {
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const dPage = await desktop.newPage();
    await installAppApiFulfill(dPage);

    await dPage.goto(`${BASE}/app/prospects/syn-716-wr-cleared?proof=1`, { waitUntil: 'networkidle' });
    await dPage.waitForSelector('[data-testid="website-rescue-delivery"]');
    const wrenDesktop = {
      id: 'syn-716-wr-cleared',
      viewport: '1440x1100',
      clearance: await dPage.locator('[data-testid="website-rescue-delivery-clearance"]').innerText(),
      commercial: await dPage.locator('[data-testid="commercial-clearance-status"]').innerText(),
      state: await dPage.locator('[data-testid="website-rescue-delivery-state"]').innerText(),
      blockers: await dPage.locator('[data-testid="website-rescue-delivery-blockers"]').innerText(),
      next: await dPage.locator('[data-testid="website-rescue-delivery-next"]').innerText(),
      overflow: await overflow(dPage),
      password_fields: await dPage.locator('input[name="hosting_password"], input[name="dns_password"]').count(),
      real_dns_checkbox: await dPage.locator('[name="real_dns_cutover_executed"]').count(),
      clients_href: await dPage.locator('a.cf-app-btn', { hasText: 'Open Clients' }).getAttribute('href'),
    };
    await dPage.screenshot({
      path: `${OUT}/wren-desktop-cleared-waiting-intake.png`,
      fullPage: true,
    });
    evidence.cases.push({ name: 'wren_desktop_initial', expected: 'CLEARED TO BUILD + intake blockers', actual: wrenDesktop });

    await fillIntake(dPage);
    await dPage.click('[data-testid="wr-save"]');
    await dPage.waitForSelector('[data-testid="prospect-detail-saved"]');
    const afterSave = {
      state: await dPage.locator('[data-testid="website-rescue-delivery-state"]').innerText(),
      intake: await dPage.locator('[data-testid="website-rescue-delivery-intake-status"]').innerText(),
      preview: await dPage.locator('[data-testid="wr-preview-url"]').inputValue(),
    };
    await dPage.screenshot({
      path: `${OUT}/wren-desktop-after-save.png`,
      fullPage: true,
    });

    await dPage.reload({ waitUntil: 'networkidle' });
    await dPage.waitForSelector('[data-testid="website-rescue-delivery"]');
    const afterReload = {
      state: await dPage.locator('[data-testid="website-rescue-delivery-state"]').innerText(),
      intake: await dPage.locator('[data-testid="website-rescue-delivery-intake-status"]').innerText(),
      preview: await dPage.locator('[data-testid="wr-preview-url"]').inputValue(),
      overflow: await overflow(dPage),
    };
    await dPage.screenshot({
      path: `${OUT}/wren-desktop-after-reload.png`,
      fullPage: true,
    });
    evidence.cases.push({ name: 'wren_desktop_persist', expected: 'onboarding_in_progress + preview retained', actual: { afterSave, afterReload } });

    await dPage.goto(`${BASE}/app/prospects/syn-772-rd-bea?proof=1`, { waitUntil: 'networkidle' });
    await dPage.waitForSelector('[data-testid="website-rescue-delivery"]');
    const beaDesktop = {
      clearance: await dPage.locator('[data-testid="website-rescue-delivery-clearance"]').innerText(),
      blockers: await dPage.locator('[data-testid="website-rescue-delivery-blockers"]').innerText(),
      next: await dPage.locator('[data-testid="website-rescue-delivery-next"]').innerText(),
      overflow: await overflow(dPage),
    };
    await dPage.screenshot({
      path: `${OUT}/bea-desktop-not-cleared.png`,
      fullPage: true,
    });
    evidence.cases.push({ name: 'bea_desktop_fail_closed', expected: 'NOT CLEARED + MISSING_FINANCIAL_APPROVAL', actual: beaDesktop });

    await dPage.goto(`${BASE}/app/prospects?proof=1`, { waitUntil: 'networkidle' });
    const listShared = await dPage.locator('[data-testid="prospect-ops-shared-detail-syn-716-wr-cleared"]').getAttribute('href');
    evidence.cases.push({ name: 'prospect_list_shared_link', expected: '/app/prospects/syn-716-wr-cleared?proof=1', actual: listShared });

    await dPage.goto(`${BASE}/app/clients?proof=1`, { waitUntil: 'networkidle' });
    const clientsOk = await dPage.locator('[data-testid="clients-summary"], [data-testid="app-clients"], .cf-app-h1').first().isVisible();
    evidence.cases.push({ name: 'clients_surface', expected: 'Clients page visible', actual: { visible: clientsOk, url: dPage.url() } });
    await desktop.close();

    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const mPage = await mobile.newPage();
    await installAppApiFulfill(mPage);
    await mPage.goto(`${BASE}/app/prospects/syn-716-wr-cleared?proof=1`, { waitUntil: 'networkidle' });
    await mPage.waitForSelector('[data-testid="website-rescue-delivery"]');
    const wrenMobile = {
      clearance: await mPage.locator('[data-testid="website-rescue-delivery-clearance"]').innerText(),
      state: await mPage.locator('[data-testid="website-rescue-delivery-state"]').innerText(),
      next: await mPage.locator('[data-testid="website-rescue-delivery-next"]').innerText(),
      overflow: await overflow(mPage),
    };
    await mPage.screenshot({
      path: `${OUT}/wren-mobile-after-persist.png`,
      fullPage: true,
    });
    evidence.cases.push({ name: 'wren_mobile', expected: 'same persisted state, overflow 0', actual: wrenMobile });

    await mPage.goto(`${BASE}/app/prospects/syn-772-rd-bea?proof=1`, { waitUntil: 'networkidle' });
    await mPage.waitForSelector('[data-testid="website-rescue-delivery"]');
    const beaMobile = {
      clearance: await mPage.locator('[data-testid="website-rescue-delivery-clearance"]').innerText(),
      blockers: await mPage.locator('[data-testid="website-rescue-delivery-blockers"]').innerText(),
      overflow: await overflow(mPage),
    };
    await mPage.screenshot({
      path: `${OUT}/bea-mobile-not-cleared.png`,
      fullPage: true,
    });
    evidence.cases.push({ name: 'bea_mobile', expected: 'NOT CLEARED, overflow 0', actual: beaMobile });
    await mobile.close();

    const failures = [];
    if (!String(wrenDesktop.clearance).includes('CLEARED TO BUILD')) failures.push('wren not commercially cleared');
    if (!String(wrenDesktop.blockers).includes('MISSING_REQUIRED_CLIENT_INPUTS')) failures.push('wren missing intake blocker');
    if (wrenDesktop.password_fields !== 0) failures.push('password fields present');
    if (wrenDesktop.real_dns_checkbox !== 0) failures.push('real DNS checkbox present');
    if (wrenDesktop.overflow.overflowPx > 0) failures.push(`wren desktop overflow ${wrenDesktop.overflow.overflowPx}`);
    if (!String(afterReload.state).includes('onboarding_in_progress')) failures.push('reload lost delivery state');
    if (afterReload.preview !== '/demo/cafe-international') failures.push('reload lost preview evidence');
    if (afterReload.overflow.overflowPx > 0) failures.push(`reload overflow ${afterReload.overflow.overflowPx}`);
    if (!String(beaDesktop.clearance).includes('NOT CLEARED')) failures.push('bea not fail-closed');
    if (!String(beaDesktop.blockers).includes('MISSING_FINANCIAL_APPROVAL')) failures.push('bea missing financial blocker');
    if (wrenMobile.overflow.overflowPx > 0) failures.push(`wren mobile overflow ${wrenMobile.overflow.overflowPx}`);
    if (beaMobile.overflow.overflowPx > 0) failures.push(`bea mobile overflow ${beaMobile.overflow.overflowPx}`);
    if (!String(listShared).includes('/app/prospects/syn-716-wr-cleared')) failures.push('shared detail link missing');
    if (wrenDesktop.clients_href !== '/app/clients?proof=1') failures.push(`clients href ${wrenDesktop.clients_href}`);

    evidence.failures = failures;
    evidence.verdict = failures.length === 0
      ? 'WEBSITE RESCUE DELIVERY OPERATOR JOURNEY USABLE'
      : `NOT READY — ${failures[0]}`;
    writeFileSync(`${OUT}/latest-run.json`, JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify({ verdict: evidence.verdict, failures, out: OUT }, null, 2));
    if (failures.length) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
