/**
 * #1175 desktop + mobile screenshots of Lead Rescue and Website Rescue
 * progress plus /change handoff in Tenant Workspace.
 *
 * Starts local Next unless NEXT_SKIP_SPAWN=1 (then NEXT_PORT must already be up).
 *
 *   NEXT_PORT=3057 node scripts/tenant-delivery-progress-review-change-capture-screenshots.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright';

import {
  handleAppComponentReview,
  handleAppRequestDetail,
  handleAppRequestsList,
  handleAppShell,
} from '../lib/app/handlers.js';
import { resetProspectFixtureStore } from '../lib/app/prospect-operations-workspace.js';
import { resetRequestStore } from '../lib/app/request-store.js';
import {
  LEAD_RESCUE_TENANT_REQUEST_ID,
  WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID,
} from '../lib/app/constants.js';
import { tenantChangeHandoffHref, tenantWorkspaceReturnHref } from '../lib/app/tenant-journey.js';
import { LEAD_RESCUE_PREVIEW_COMPONENT_KEY } from '../lib/lead-rescue/tenant-delivery-progress.js';

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
resetRequestStore();
resetProspectFixtureStore();

const PORT = Number(process.env.NEXT_PORT || 3057);
const OUT = path.resolve('artifacts/tenant-delivery-progress-review-change-1175');
fs.mkdirSync(OUT, { recursive: true });
const base = `http://127.0.0.1:${PORT}`;
const FORBIDDEN = ['Choose workspace', 'Prospect Operations', 'financially_approved', 'operator_note'];

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
  const bodyText = await page.locator('body').innerText();
  for (const phrase of FORBIDDEN) {
    if (bodyText.toLowerCase().includes(phrase.toLowerCase())) {
      throw new Error(`${name} leaked forbidden phrase: ${phrase}`);
    }
  }
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  await page.close();
  console.log('wrote', file);
}

function portOpen(port) {
  return new Promise((resolve) => {
    const sock = net.connect(port, '127.0.0.1', () => {
      sock.end();
      resolve(true);
    });
    sock.on('error', () => resolve(false));
  });
}

async function waitForPort(port, timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await portOpen(port)) return;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Next did not listen on ${port}`);
}

const skipSpawn = process.env.NEXT_SKIP_SPAWN === '1';
/** @type {import('node:child_process').ChildProcess | null} */
let nextProc = null;
if (!skipSpawn) {
  if (await portOpen(PORT)) {
    console.log(`reusing existing Next on ${PORT}`);
  } else {
    nextProc = spawn(
      process.execPath,
      [path.resolve('node_modules/next/dist/bin/next'), 'dev', '--webpack', '-p', String(PORT)],
      {
        env: { ...process.env, NODE_ENV: 'development', PORT: String(PORT) },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    nextProc.stdout.on('data', (buf) => process.stdout.write(buf));
    nextProc.stderr.on('data', (buf) => process.stderr.write(buf));
    await waitForPort(PORT);
  }
} else {
  await waitForPort(PORT, 5000);
}

const tenantProof = `${base}/app/tenant?proof=1`;
const wrUrl = `${base}/app/tenant?proof=1&id=${WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID}`;
const lrUrl = `${base}/app/tenant?proof=1&id=${LEAD_RESCUE_TENANT_REQUEST_ID}`;
const changeUrl = `${base}${tenantChangeHandoffHref({ tenantId: 'corpflowai' })}`;
const returnUrl = `${base}${tenantWorkspaceReturnHref({ tenantId: 'corpflowai' })}&proof=1`;

const browser = await chromium.launch({ headless: true });
try {
  await shot(browser, 'list-desktop.png', tenantProof, { width: 1440, height: 900 }, async (page) => {
    await page.getByTestId(`tenant-list-${LEAD_RESCUE_TENANT_REQUEST_ID}`).waitFor({ timeout: 20000 });
    await page.getByTestId(`tenant-list-${WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID}`).waitFor({ timeout: 20000 });
  });
  await shot(browser, 'list-mobile.png', tenantProof, { width: 390, height: 844 }, async (page) => {
    await page.getByTestId(`tenant-list-${LEAD_RESCUE_TENANT_REQUEST_ID}`).waitFor({ timeout: 20000 });
    await page.getByTestId(`tenant-list-${WEBSITE_RESCUE_TENANT_PROGRESS_REQUEST_ID}`).waitFor({ timeout: 20000 });
  });
  await shot(browser, 'lead-rescue-detail-desktop.png', lrUrl, { width: 1440, height: 900 }, async (page) => {
    await page.getByTestId('tenant-high-level-stage').waitFor({ timeout: 20000 });
    await page.getByTestId(`tenant-review-controls-${LEAD_RESCUE_PREVIEW_COMPONENT_KEY}`).waitFor({
      timeout: 20000,
    });
    await page.getByTestId(`tenant-viewonly-${'lead_rescue_verification'}`).waitFor({ timeout: 20000 });
  });
  await shot(browser, 'lead-rescue-detail-mobile.png', lrUrl, { width: 390, height: 844 }, async (page) => {
    await page.getByTestId('tenant-high-level-stage').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'lead-rescue-review-desktop.png', lrUrl, { width: 1440, height: 900 }, async (page) => {
    await page.getByTestId(`tenant-comment-${LEAD_RESCUE_PREVIEW_COMPONENT_KEY}`).waitFor({ timeout: 20000 });
    await page.getByTestId(`tenant-comment-${LEAD_RESCUE_PREVIEW_COMPONENT_KEY}`).fill('Preview looks right.');
    await page.getByTestId(`tenant-approve-${LEAD_RESCUE_PREVIEW_COMPONENT_KEY}`).click();
    await page.getByTestId('app-notice').waitFor({ timeout: 15000 });
  });
  await shot(browser, 'website-rescue-detail-desktop.png', wrUrl, { width: 1440, height: 900 }, async (page) => {
    await page.getByTestId('tenant-delivery-stage').waitFor({ timeout: 20000 });
    await page.getByTestId('tenant-exposed-evidence-website_rescue_preview').waitFor({ timeout: 20000 });
    await page.getByTestId('tenant-viewonly-website_rescue_preview').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'website-rescue-detail-mobile.png', wrUrl, { width: 390, height: 844 }, async (page) => {
    await page.getByTestId('tenant-delivery-stage').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'change-desktop.png', changeUrl, { width: 1440, height: 900 }, async (page) => {
    await page.getByTestId('tenant-change-continuity').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'change-mobile.png', changeUrl, { width: 390, height: 844 }, async (page) => {
    await page.getByTestId('tenant-change-continuity').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'return-desktop.png', returnUrl, { width: 1440, height: 900 }, async (page) => {
    await page.getByTestId('tenant-return-from-change').waitFor({ timeout: 20000 });
  });
  await shot(browser, 'return-mobile.png', returnUrl, { width: 390, height: 844 }, async (page) => {
    await page.getByTestId('tenant-return-from-change').waitFor({ timeout: 20000 });
  });
} finally {
  await browser.close();
  if (nextProc && nextProc.pid) {
    nextProc.kill('SIGTERM');
  }
}
