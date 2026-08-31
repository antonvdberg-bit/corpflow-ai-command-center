/**
 * #1201 live unauthenticated Tenant sign-in and /change continuity screenshots.
 * Does not mutate data. Proof harness is off on the live Production spine.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT = path.resolve('artifacts/tenant-delivery-progress-1201');
fs.mkdirSync(OUT, { recursive: true });

const pages = [
  {
    file: 'live-core-tenant-unauth-desktop.png',
    url: 'https://core.corpflowai.com/app/tenant',
    viewport: { width: 1440, height: 900 },
    waitTestId: 'app-auth-required',
  },
  {
    file: 'live-lux-tenant-unauth-mobile.png',
    url: 'https://lux.corpflowai.com/app/tenant',
    viewport: { width: 390, height: 844 },
    waitTestId: 'app-auth-required',
  },
  {
    file: 'live-change-from-tenant-desktop.png',
    url: 'https://core.corpflowai.com/change?from=tenant-workspace&tenant_id=corpflowai',
    viewport: { width: 1440, height: 900 },
    waitTestId: 'tenant-change-continuity',
  },
];

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const item of pages) {
    const page = await browser.newPage({ viewport: item.viewport });
    const response = await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.getByTestId(item.waitTestId).waitFor({ timeout: 20000 });
    const html = await page.content();
    const file = path.join(OUT, item.file);
    await page.screenshot({ path: file, fullPage: true });
    results.push({
      file: item.file,
      url: item.url,
      status: response ? response.status() : 0,
      has_choose_workspace: /choose workspace/i.test(html),
      has_sign_in: /sign in/i.test(html),
      has_continuity: html.includes('tenant-change-continuity') || /still in the/i.test(html),
    });
    await page.close();
    console.log('wrote', file);
  }
} finally {
  await browser.close();
}

const payload = {
  captured_at: new Date().toISOString(),
  pages: results,
};
fs.writeFileSync(path.join(OUT, 'live-unauth.json'), `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify(payload, null, 2));
if (results.some((r) => r.status !== 200)) process.exit(1);
if (results[0].has_choose_workspace || results[1].has_choose_workspace) process.exit(1);
if (!results[0].has_sign_in || !results[1].has_sign_in) process.exit(1);
if (!results[2].has_continuity) process.exit(1);
