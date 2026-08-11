/**
 * Capture desktop + mobile screenshots for Slice 3 review UI.
 * Expects slice2 auth server on SLICE2_AUTH_PORT (default 4790).
 * Exercises expose → tenant review controls → (optional) after-amend state.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

import { CANONICAL_REQUEST_ID, REFERENCE_TENANT_ID } from '../lib/app/constants.js';

const PORT = Number(process.env.SLICE2_AUTH_PORT || 4790);
const OUT = path.resolve('artifacts/slice3-screenshots');
fs.mkdirSync(OUT, { recursive: true });
const base = `http://127.0.0.1:${PORT}`;

async function postJson(urlPath, payload) {
  const res = await fetch(base + urlPath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json().catch(() => ({}));
}

// Ensure landing_copy is exposed before screenshots so Tenant shows review controls.
await postJson('/api/app/component-expose', {
  request_id: CANONICAL_REQUEST_ID,
  component_key: 'landing_copy',
  exposed: true,
  env: 'core',
});

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
  await shot(
    browser,
    'core-desktop-expose.png',
    `${base}/app/core?request_id=${CANONICAL_REQUEST_ID}`,
    { width: 1440, height: 900 },
  );
  await shot(
    browser,
    'core-mobile-expose.png',
    `${base}/app/core?request_id=${CANONICAL_REQUEST_ID}`,
    { width: 390, height: 844 },
  );
  await shot(
    browser,
    'tenant-desktop-review.png',
    `${base}/app/tenant?tenant_id=${REFERENCE_TENANT_ID}&request_id=${CANONICAL_REQUEST_ID}`,
    { width: 1440, height: 900 },
  );
  await shot(
    browser,
    'tenant-mobile-review.png',
    `${base}/app/tenant?tenant_id=${REFERENCE_TENANT_ID}&request_id=${CANONICAL_REQUEST_ID}`,
    { width: 390, height: 844 },
  );

  // After amend — Core shows client decision
  await postJson('/api/app/component-review', {
    request_id: CANONICAL_REQUEST_ID,
    component_key: 'landing_copy',
    decision: 'amend',
    comment: 'Screenshot evidence — tighten headline.',
    tenant_id: REFERENCE_TENANT_ID,
    env: 'tenant',
  });

  await shot(
    browser,
    'core-desktop-after-client-decision.png',
    `${base}/app/core?request_id=${CANONICAL_REQUEST_ID}`,
    { width: 1440, height: 900 },
  );
  await shot(
    browser,
    'tenant-desktop-after-decision.png',
    `${base}/app/tenant?tenant_id=${REFERENCE_TENANT_ID}&request_id=${CANONICAL_REQUEST_ID}`,
    { width: 390, height: 844 },
  );
} finally {
  await browser.close();
}

console.log('Slice 3 screenshots complete:', OUT);
