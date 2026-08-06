/**
 * #778 Slice 1 — capture desktop + mobile demo screenshots.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium, devices } from 'playwright';

const base = process.env.APP_SLICE1_BASE_URL || 'http://127.0.0.1:3010';
const outDir = path.resolve('artifacts/app-slice1');
fs.mkdirSync(outDir, { recursive: true });

const pages = [
  { name: 'scope', path: '/app?demo=slice1', wait: '[data-cf-app-scope-option]' },
  { name: 'tenant-requests', path: '/app/requests?demo=slice1', wait: '[data-cf-app-tenant-request]' },
  {
    name: 'core-request',
    path: '/app/core/requests/req_slice1_corpflowai_progress_001?demo=slice1',
    wait: '[data-cf-app-core-request]',
  },
];

async function shot(browser, { name, path: p, wait }, viewport, prefix) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const url = `${base}${p}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector(wait, { timeout: 20000 });
  // Give fonts a moment.
  await page.waitForTimeout(400);
  const file = path.join(outDir, `${prefix}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  await context.close();
  console.log('wrote', file);
}

const browser = await chromium.launch({ headless: true });
try {
  for (const p of pages) {
    await shot(browser, p, { width: 1440, height: 900 }, 'desktop');
  }
  for (const p of pages.filter((x) => x.name !== 'scope')) {
    await shot(browser, p, { width: 390, height: 844 }, 'mobile');
  }
  // Also capture scope on mobile.
  await shot(browser, pages[0], { width: 390, height: 844 }, 'mobile');
} finally {
  await browser.close();
}

console.log('done');
