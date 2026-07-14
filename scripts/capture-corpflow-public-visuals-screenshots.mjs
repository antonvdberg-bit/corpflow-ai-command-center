/**
 * Capture CorpFlowAI governed public hero visual evidence.
 * Usage: node scripts/capture-corpflow-public-visuals-screenshots.mjs [baseUrl]
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const base = (process.argv[2] || 'http://localhost:3099').replace(/\/$/, '');
const outDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'artifacts',
  'corpflow-public-visuals-screenshots',
);
mkdirSync(outDir, { recursive: true });

const shots = [
  { file: '01-home-desktop.png', path: '/', width: 1440, height: 900 },
  { file: '02-home-mobile.png', path: '/', width: 390, height: 844 },
  { file: '03-contact-desktop.png', path: '/contact', width: 1440, height: 900 },
  { file: '04-contact-mobile.png', path: '/contact', width: 390, height: 844 },
  { file: '05-about-desktop.png', path: '/about', width: 1440, height: 900 },
  { file: '06-about-mobile.png', path: '/about', width: 390, height: 844 },
  { file: '07-process-desktop.png', path: '/process', width: 1440, height: 900 },
  { file: '08-process-mobile.png', path: '/process', width: 390, height: 844 },
  { file: '09-trust-band.png', path: '/', width: 1440, height: 900, scrollTo: '[aria-label="Operating posture"]' },
  { file: '10-services-desktop.png', path: '/services', width: 1440, height: 900 },
  { file: '11-services-mobile.png', path: '/services', width: 390, height: 844 },
  { file: '12-standards-desktop.png', path: '/standards', width: 1440, height: 900 },
  { file: '13-standards-mobile.png', path: '/standards', width: 390, height: 844 },
  { file: '14-onboarding-desktop.png', path: '/onboarding', width: 1440, height: 900 },
  { file: '15-onboarding-mobile.png', path: '/onboarding', width: 390, height: 844 },
];

const browser = await chromium.launch();
const results = [];
for (const shot of shots) {
  const page = await browser.newPage({ viewport: { width: shot.width, height: shot.height } });
  const res = await page.goto(`${base}${shot.path}`, { waitUntil: 'networkidle', timeout: 90000 });
  const status = res?.status() ?? 0;
  if (shot.scrollTo) {
    await page.locator(shot.scrollTo).first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
  }
  await page.screenshot({
    path: path.join(outDir, shot.file),
    fullPage: shot.file !== '09-trust-band.png',
  });
  results.push({ file: shot.file, path: shot.path, status, viewport: `${shot.width}x${shot.height}` });
  console.log(`OK ${shot.file} HTTP ${status}`);
  await page.close();
}
await browser.close();
console.log(JSON.stringify({ base, results }, null, 2));
