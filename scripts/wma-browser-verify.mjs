#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const targetRaw = String(process.env.WMA_TARGET_URL || '').trim();
const outDir = String(process.env.WMA_BROWSER_OUT_DIR || 'artifacts/wma-browser').trim();

if (!targetRaw) {
  console.error('WMA browser verify FAIL: WMA_TARGET_URL is required');
  process.exit(1);
}

let target;
try {
  target = new URL(targetRaw);
} catch {
  console.error('WMA browser verify FAIL: invalid target URL');
  process.exit(1);
}

if (!['http:', 'https:'].includes(target.protocol)) {
  console.error('WMA browser verify FAIL: target must use http/https');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const profiles = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
];

const browser = await chromium.launch({ headless: true });
const evidence = {
  target: target.toString(),
  audited_at: new Date().toISOString(),
  form_submission_performed: false,
  profiles: {},
  overall: 'PASS',
};

async function inspectProfile(profile) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    isMobile: Boolean(profile.isMobile),
    hasTouch: Boolean(profile.hasTouch),
  });
  const page = await context.newPage();
  const result = {
    viewport: profile.viewport,
    status: 'PASS',
    final_url: null,
    title: null,
    screenshot: `${profile.name}.png`,
    nav_links: [],
    ctas: [],
    forms: [],
    internal_navigation_checks: [],
    errors: [],
  };

  try {
    const response = await page.goto(target.toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1500);
    result.http_status = response?.status() ?? null;
    result.final_url = page.url();
    result.title = await page.title();

    const discovered = await page.evaluate(() => {
      const text = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();
      const links = [...document.querySelectorAll('a[href]')].map((a) => ({ text: text(a), href: a.href }));
      const navLinks = [...document.querySelectorAll('nav a[href], header a[href]')].map((a) => ({ text: text(a), href: a.href }));
      const buttons = [...document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]')]
        .map((b) => ({ text: text(b) || b.value || b.getAttribute('aria-label') || '', type: b.getAttribute('type') || b.getAttribute('role') || b.tagName.toLowerCase() }));
      const forms = [...document.querySelectorAll('form')].map((form, index) => ({
        index,
        action: form.action || null,
        method: (form.method || 'get').toLowerCase(),
        fields: [...form.querySelectorAll('input, textarea, select')].map((field) => ({
          name: field.getAttribute('name'),
          type: field.getAttribute('type') || field.tagName.toLowerCase(),
          required: Boolean(field.required),
        })),
      }));
      return { links, navLinks, buttons, forms };
    });

    result.nav_links = discovered.navLinks.slice(0, 20);
    result.ctas = [
      ...discovered.links.filter((item) => /book|contact|enquir|quote|start|buy|call|whatsapp|learn more|request/i.test(item.text)),
      ...discovered.buttons.filter((item) => /book|contact|enquir|quote|start|buy|call|whatsapp|request|submit/i.test(item.text)),
    ].slice(0, 30);
    result.forms = discovered.forms;

    const sameOrigin = discovered.navLinks
      .filter((item) => {
        try { return new URL(item.href).origin === target.origin; } catch { return false; }
      })
      .filter((item, index, arr) => arr.findIndex((other) => other.href === item.href) === index)
      .slice(0, 5);

    for (const item of sameOrigin) {
      const checkPage = await context.newPage();
      try {
        const navResponse = await checkPage.goto(item.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
        result.internal_navigation_checks.push({
          text: item.text,
          url: item.href,
          status: navResponse?.status() ?? null,
          final_url: checkPage.url(),
          ok: Boolean(navResponse && navResponse.status() < 400),
        });
      } catch (error) {
        result.internal_navigation_checks.push({ text: item.text, url: item.href, ok: false, error: String(error?.message || error) });
        result.status = 'PARTIAL';
      } finally {
        await checkPage.close();
      }
    }

    await page.screenshot({ path: path.join(outDir, result.screenshot), fullPage: true });

    if (!result.title || (result.http_status && result.http_status >= 400)) {
      result.status = 'PARTIAL';
    }
    if (result.internal_navigation_checks.some((check) => !check.ok)) {
      result.status = 'PARTIAL';
    }
  } catch (error) {
    result.status = 'BLOCKED';
    result.errors.push(String(error?.stack || error));
  } finally {
    await page.close();
    await context.close();
  }

  return result;
}

for (const profile of profiles) {
  const result = await inspectProfile(profile);
  evidence.profiles[profile.name] = result;
  if (result.status === 'BLOCKED') evidence.overall = 'BLOCKED';
  else if (result.status === 'PARTIAL' && evidence.overall !== 'BLOCKED') evidence.overall = 'PARTIAL';
}

await browser.close();
fs.writeFileSync(path.join(outDir, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ overall: evidence.overall, target: evidence.target, out_dir: outDir }));

if (evidence.overall === 'BLOCKED') process.exit(1);
