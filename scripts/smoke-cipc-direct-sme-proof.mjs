#!/usr/bin/env node
/**
 * Local proof smoke for the CIPC Desk direct-SME buyer journey (#1183).
 *
 * Exercises /company?proof=1 on desktop 1440 and mobile 390:
 * empty submit → "Company name is required"; fixture confirm → CD-PROOF01
 * with no record/send/file/payment. Also checks /partners stays distinct
 * and /annual-returns stays specialist-review (no SME enquiry form).
 *
 * Usage (local Next already running, host mapped to cipc-desk):
 *   CIPC_SMOKE_BASE_URL=http://cipc.corpflowai.com:3000 node scripts/smoke-cipc-direct-sme-proof.mjs
 *
 * Does not post a live enquiry. Does not mutate business records.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.CIPC_SMOKE_BASE_URL || 'http://cipc.corpflowai.com:3000';
const OUT = process.env.CIPC_SMOKE_OUT_DIR || '/opt/cursor/artifacts/screenshots';
mkdirSync(OUT, { recursive: true });

async function runViewport(browser, name, size) {
  const context = await browser.newContext({ viewport: size });
  const page = await context.newPage();
  const url = `${BASE}/company?proof=1`;
  const res = await page.goto(url, { waitUntil: 'domcontentloaded' });
  const status = res?.status() || 0;
  if (status !== 200) throw new Error(`${name} GET ${url} -> ${status}`);

  await page.getByText('Company-secretarial help for your CIPC filings').first().waitFor();
  await page.getByRole('link', { name: 'Request company-secretarial help' }).first().waitFor();
  await page.getByText(/Independent support/i).first().waitFor();
  await page.screenshot({ path: path.join(OUT, `cipc_company_${name}_hero.png`), fullPage: false });

  await page.locator('#sme-enquiry').scrollIntoViewIfNeeded();
  await page.getByText('Proof mode is on').waitFor();
  await page.getByRole('button', { name: 'Confirm proof enquiry' }).click();
  await page.getByText('Company name is required').waitFor();
  await page.screenshot({
    path: path.join(OUT, `cipc_company_${name}_validation.png`),
    fullPage: false,
  });

  await page.getByRole('button', { name: 'Use proof fixture' }).click();
  await page.waitForFunction(() => {
    const el = document.getElementById('sme-company');
    return el && el.value === 'Example Trading Pty Ltd';
  });
  await page.getByRole('button', { name: 'Confirm proof enquiry' }).click();
  await page.getByText('CD-PROOF01').waitFor();
  await page.getByText('Proof confirmation only').waitFor();
  const confirm = await page.locator('#sme-enquiry').innerText();
  if (!/CD-PROOF01/.test(confirm)) throw new Error(`${name} confirmation missing CD-PROOF01`);
  if (!/not recorded/i.test(confirm)) throw new Error(`${name} confirmation missing not-recorded`);
  const box = await page.locator('#sme-enquiry').boundingBox();
  if (!box || box.y > size.height - 80) {
    throw new Error(`${name} confirmation not in viewport: y=${box && box.y}`);
  }
  await page.screenshot({
    path: path.join(OUT, `cipc_company_${name}_proof_confirm.png`),
    fullPage: false,
  });

  const partners = await page.goto(`${BASE}/partners`, { waitUntil: 'domcontentloaded' });
  if ((partners?.status() || 0) !== 200) throw new Error(`${name} /partners ${partners?.status()}`);
  await page.getByText(/accounting, tax and advisory firms/i).first().waitFor();
  const partnersText = await page.locator('body').innerText();
  if (/Confirm proof enquiry|Use proof fixture/.test(partnersText)) {
    throw new Error(`${name} /partners leaked SME enquiry form`);
  }
  if (name === 'desktop') {
    await page.screenshot({ path: path.join(OUT, 'cipc_partners_distinct.png'), fullPage: false });
  }

  const ar = await page.goto(`${BASE}/annual-returns`, { waitUntil: 'domcontentloaded' });
  if ((ar?.status() || 0) !== 200) throw new Error(`${name} /annual-returns ${ar?.status()}`);
  await page.getByText(/SPECIALIST REVIEW/i).first().waitFor();
  const arText = await page.locator('body').innerText();
  if (/Confirm proof enquiry|Use proof fixture/.test(arText)) {
    throw new Error(`${name} /annual-returns leaked SME enquiry form`);
  }
  if (name === 'desktop') {
    await page.screenshot({
      path: path.join(OUT, 'cipc_annual_returns_specialist.png'),
      fullPage: false,
    });
  }

  await context.close();
  return { name, viewport: size, url, status, confirmation: 'CD-PROOF01' };
}

const browser = await chromium.launch({ headless: true });
try {
  const results = [];
  results.push(await runViewport(browser, 'desktop', { width: 1440, height: 900 }));
  results.push(await runViewport(browser, 'mobile', { width: 390, height: 844 }));
  writeFileSync(path.join(OUT, 'cipc_company_proof.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ ok: true, results }, null, 2));
} finally {
  await browser.close();
}
