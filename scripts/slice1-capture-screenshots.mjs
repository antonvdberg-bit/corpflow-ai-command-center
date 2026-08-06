/**
 * Capture desktop + mobile screenshots for Slice 1 proof UI.
 * Expects proof server on SLICE1_PROOF_PORT (default 4788).
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const PORT = Number(process.env.SLICE1_PROOF_PORT || 4788);
const OUT = path.resolve('artifacts/slice1-screenshots');
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
  await shot(browser, 'tenant-desktop.png', `${base}/app?proof=1&scope=tenant`, {
    width: 1440,
    height: 900,
  });
  await shot(browser, 'tenant-mobile.png', `${base}/app?proof=1&scope=tenant`, {
    width: 390,
    height: 844,
  });
  await shot(browser, 'core-desktop.png', `${base}/app?proof=1&scope=core`, {
    width: 1440,
    height: 900,
  });
  await shot(browser, 'core-mobile.png', `${base}/app?proof=1&scope=core`, {
    width: 390,
    height: 844,
  });
} finally {
  await browser.close();
}

console.log('Slice 1 screenshots complete:', OUT);
