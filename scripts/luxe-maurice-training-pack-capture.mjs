/**
 * LuxeMaurice Training Pack v1 — optional public screenshot capture.
 *
 * Captures signed-out / public surfaces only. Authenticated captures (06, 08)
 * require operator session — see GRAPHICS_CAPTURE_CHECKLIST.md.
 *
 * Usage:
 *   node scripts/luxe-maurice-training-pack-capture.mjs
 *   LUX_TRAINING_BASE_URL=https://lux.corpflowai.com node scripts/luxe-maurice-training-pack-capture.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const BASE = String(process.env.LUX_TRAINING_BASE_URL || 'https://lux.corpflowai.com').replace(/\/$/, '');
const OUT = path.resolve(
  process.cwd(),
  'artifacts/luxe-maurice-training-pack-v1/05-graphics/captures',
);
const VIEWPORT = { width: 1440, height: 900 };

async function shot(page, filename) {
  const outPath = path.join(OUT, filename);
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`captured ${filename}`);
  return outPath;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  await page.goto(`${BASE}/client/luxe-maurice-ai`, { waitUntil: 'networkidle', timeout: 60000 });
  await shot(page, '01-landing-page.png');

  await page.goto(`${BASE}/client/luxe-maurice-ai/properties`, { waitUntil: 'networkidle', timeout: 60000 });
  await shot(page, '02-private-opportunities.png');

  await page.goto(`${BASE}/client/luxe-maurice-ai/buyer`, { waitUntil: 'networkidle', timeout: 60000 });
  await shot(page, '03-private-access-request-form.png');

  await page.goto(`${BASE}/client/luxe-maurice-ai/crm`, { waitUntil: 'networkidle', timeout: 60000 });
  await shot(page, '05-advisor-sign-in-prompt.png');
  await shot(page, '07-demonstration-records.png');

  const submitTraining = process.env.LUX_TRAINING_SUBMIT_FORM === '1';
  if (submitTraining) {
    await page.goto(`${BASE}/client/luxe-maurice-ai/buyer`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.fill('#full_name', 'LuxeMaurice Training User');
    await page.fill('#email', 'training@example.invalid');
    await page.selectOption('#access_category', 'residence');
    await page.fill('#desired_location', 'Mauritius');
    await page.selectOption('#access_intent', 'Exploring — advisory introduction');
    await page.fill(
      '#notes',
      'Training demonstration request — safe to use in LuxeMaurice training materials.',
    );
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await shot(page, '04-request-submitted-reference.png');
  } else {
    console.log('skip 04 — set LUX_TRAINING_SUBMIT_FORM=1 to capture submitted reference');
  }

  await browser.close();
  console.log('done — authenticated captures 06 and 08 remain manual');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
