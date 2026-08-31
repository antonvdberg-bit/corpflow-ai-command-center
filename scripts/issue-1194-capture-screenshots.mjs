/**
 * Desktop + mobile screenshots for #1194 launch-enquiry Action Queue triage.
 * Expects the local proof server on ISSUE_1194_PROOF_PORT (default 4794).
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const PORT = Number(process.env.ISSUE_1194_PROOF_PORT || 4794);
const OUT = path.resolve('artifacts/issue-1194');
fs.mkdirSync(OUT, { recursive: true });
const base = `http://127.0.0.1:${PORT}`;

const LR_ID = 'syn-1171-lr-enquiry';
const WR_ID = 'syn-1171-wr-enquiry';

async function shot(browser, name, url, viewport, waitFor) {
  const page = await browser.newPage({ viewport });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  if (waitFor) await page.waitForSelector(waitFor, { timeout: 20000 });
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  await page.close();
  console.log('wrote', file);
}

const browser = await chromium.launch({ headless: true });
try {
  await shot(
    browser,
    'queue-desktop.png',
    `${base}/app/queue?proof=1&filter=needs_action`,
    { width: 1440, height: 900 },
    '[data-testid="action-queue-list"]',
  );
  await shot(
    browser,
    'queue-mobile.png',
    `${base}/app/queue?proof=1&filter=needs_action`,
    { width: 390, height: 844 },
    '[data-testid="action-queue-list"]',
  );
  await shot(
    browser,
    'lr-detail-desktop.png',
    `${base}/app/prospects/${LR_ID}?proof=1`,
    { width: 1440, height: 900 },
    '[data-testid="prospect-detail-owner"]',
  );
  await shot(
    browser,
    'lr-detail-mobile.png',
    `${base}/app/prospects/${LR_ID}?proof=1`,
    { width: 390, height: 844 },
    '[data-testid="prospect-detail-owner"]',
  );
  await shot(
    browser,
    'wr-detail-desktop.png',
    `${base}/app/prospects/${WR_ID}?proof=1`,
    { width: 1440, height: 900 },
    '[data-testid="prospect-detail-owner"]',
  );
  await shot(
    browser,
    'wr-detail-mobile.png',
    `${base}/app/prospects/${WR_ID}?proof=1`,
    { width: 390, height: 844 },
    '[data-testid="prospect-detail-owner"]',
  );
  await shot(
    browser,
    'tenant-desktop.png',
    `${base}/app/tenant?proof=1`,
    { width: 1440, height: 900 },
    '[data-testid="app-chrome"]',
  );
  await shot(
    browser,
    'tenant-mobile.png',
    `${base}/app/tenant?proof=1`,
    { width: 390, height: 844 },
    '[data-testid="app-chrome"]',
  );
} finally {
  await browser.close();
}

console.log('#1194 screenshots complete:', OUT);
