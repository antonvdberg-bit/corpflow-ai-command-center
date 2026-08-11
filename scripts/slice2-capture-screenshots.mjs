/**
 * Capture desktop + mobile screenshots for Slice 2 authenticated Core / Tenant workspaces.
 * Expects slice2 auth server on SLICE2_AUTH_PORT (default 4790).
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const PORT = Number(process.env.SLICE2_AUTH_PORT || 4790);
const OUT = path.resolve('artifacts/slice2-screenshots');
fs.mkdirSync(OUT, { recursive: true });

const base = `http://127.0.0.1:${PORT}`;

async function shot(browser, name, url, viewport) {
  const page = await browser.newPage({ viewport });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('[data-testid="app-chrome"]', { timeout: 15000 });
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  await page.close();
  console.log('wrote', file);
}

const browser = await chromium.launch({ headless: true });
try {
  await shot(browser, 'core-desktop-session.png', `${base}/app/core`, {
    width: 1440,
    height: 900,
  });
  await shot(browser, 'core-mobile-session.png', `${base}/app/core`, {
    width: 390,
    height: 844,
  });
  await shot(browser, 'tenant-desktop-session.png', `${base}/app/tenant`, {
    width: 1440,
    height: 900,
  });
  await shot(browser, 'tenant-mobile-session.png', `${base}/app/tenant`, {
    width: 390,
    height: 844,
  });
  await shot(browser, 'core-desktop-proof.png', `${base}/app/core?proof=1`, {
    width: 1440,
    height: 900,
  });
  await shot(browser, 'tenant-desktop-proof.png', `${base}/app/tenant?proof=1`, {
    width: 1440,
    height: 900,
  });
} finally {
  await browser.close();
}

console.log('Slice 2 screenshots complete:', OUT);
