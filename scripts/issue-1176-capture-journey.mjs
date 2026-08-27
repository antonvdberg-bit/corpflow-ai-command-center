/**
 * Capture desktop + mobile screenshots for the #1176 Operating Workspace journey.
 * Expects Next.js on JOURNEY_BASE_URL (default http://127.0.0.1:3000).
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = String(process.env.JOURNEY_BASE_URL || 'http://127.0.0.1:3011').replace(/\/$/, '');
const OUT = path.resolve('artifacts/issue-1176-operating-workspace-journey');
fs.mkdirSync(OUT, { recursive: true });

const ADA = 'syn-772-lr-ada';
const CLIENT = 'cmp_ada_spa_synthetic';

const STEPS = Object.freeze([
  {
    name: '01-overview',
    url: '/app/core?proof=1',
    wait: '[data-testid="operating-overview"]',
  },
  {
    name: '02-prospect',
    url: `/app/prospects/${ADA}?proof=1`,
    wait: '[data-testid="prospect-detail"]',
  },
  {
    name: '03-client',
    url: `/app/clients/${CLIENT}?proof=1`,
    wait: '[data-testid="clients-summary"]',
  },
  {
    name: '04-commercial',
    url: '/app/commercial?proof=1&filter=all',
    wait: '[data-testid="commercial-summary"]',
  },
  {
    name: '05-quotation',
    url: `/app/commercial/${ADA}?proof=1`,
    wait: '[data-testid="commercial-quotation-evidence"]',
  },
  {
    name: '06-delivery',
    url: '/app/delivery?proof=1&filter=all',
    wait: '[data-testid="delivery-summary"]',
  },
  {
    name: '07-tenant-fail-closed',
    url: '/app/tenant?proof=1',
    wait: '[data-testid="app-chrome"]',
  },
]);

const VIEWPORTS = Object.freeze([
  { suffix: 'desktop', width: 1440, height: 900 },
  { suffix: 'mobile', width: 390, height: 844 },
]);

async function shot(browser, step, viewport) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
  });
  const url = `${BASE}${step.url}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector(step.wait, { timeout: 60000 });
  const file = path.join(OUT, `${step.name}-${viewport.suffix}.png`);
  await page.screenshot({ path: file, fullPage: true });
  await page.close();
  console.log('wrote', file);
}

const browser = await chromium.launch({ headless: true });
try {
  for (const step of STEPS) {
    for (const viewport of VIEWPORTS) {
      await shot(browser, step, viewport);
    }
  }
} finally {
  await browser.close();
}

const manifest = {
  issue: 1176,
  base: BASE,
  current_main_sha: process.env.JOURNEY_SHA || '',
  route_sequence: STEPS.map((step) => step.url),
  captured_at: new Date().toISOString(),
};
fs.writeFileSync(path.join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log('Journey screenshots complete:', OUT);
