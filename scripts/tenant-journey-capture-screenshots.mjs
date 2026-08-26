/**
 * Desktop + mobile screenshots for #1073 tenant journey continuity.
 * Expects slice2 auth server on SLICE2_AUTH_PORT (default 4790).
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

import { CANONICAL_REQUEST_ID, REFERENCE_TENANT_ID } from '../lib/app/constants.js';
import { tenantChangeHandoffHref, tenantWorkspaceReturnHref } from '../lib/app/tenant-journey.js';

const PORT = Number(process.env.SLICE2_AUTH_PORT || 4790);
const OUT = path.resolve('artifacts/tenant-journey-1073');
fs.mkdirSync(OUT, { recursive: true });
const base = `http://127.0.0.1:${PORT}`;

async function shot(browser, name, url, viewport) {
  const page = await browser.newPage({ viewport });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  await page.close();
  console.log('wrote', file);
}

const tenantUrl = `${base}/app/tenant?tenant_id=${REFERENCE_TENANT_ID}&request_id=${CANONICAL_REQUEST_ID}`;
const changeUrl = `${base}${tenantChangeHandoffHref({ tenantId: REFERENCE_TENANT_ID })}`;
const returnUrl = `${base}${tenantWorkspaceReturnHref({ tenantId: REFERENCE_TENANT_ID })}`;

const browser = await chromium.launch({ headless: true });
try {
  await shot(browser, 'tenant-desktop-requests.png', tenantUrl, { width: 1440, height: 900 });
  await shot(browser, 'tenant-mobile-requests.png', tenantUrl, { width: 390, height: 844 });
  await shot(browser, 'change-desktop-handoff.png', changeUrl, { width: 1440, height: 900 });
  await shot(browser, 'change-mobile-handoff.png', changeUrl, { width: 390, height: 844 });
  await shot(browser, 'tenant-desktop-return.png', returnUrl, { width: 1440, height: 900 });
  await shot(browser, 'tenant-mobile-return.png', returnUrl, { width: 390, height: 844 });
} finally {
  await browser.close();
}
