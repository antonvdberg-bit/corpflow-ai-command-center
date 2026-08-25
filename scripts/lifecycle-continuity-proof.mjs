#!/usr/bin/env node
/**
 * #1072 lifecycle continuity proof.
 * Writes JSON + HTML and optional desktop/mobile screenshots.
 *
 * Usage: node scripts/lifecycle-continuity-proof.mjs
 */

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { handleAppLifecycle } from '../lib/app/handlers.js';
import { renderLifecycleContinuityHtml } from '../lib/app/lifecycle-continuity.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'artifacts', 'lifecycle-continuity-1072');

function mockRes() {
  /** @type {{ statusCode: number, body: any }} */
  const state = { statusCode: 0, body: null };
  return {
    state,
    status(code) {
      state.statusCode = code;
      return this;
    },
    json(payload) {
      state.body = payload;
      return this;
    },
  };
}

async function loadProofPayload() {
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;
  process.env.NODE_ENV = 'development';
  delete process.env.VERCEL_ENV;
  try {
    const res = mockRes();
    await handleAppLifecycle(
      { method: 'GET', url: '/api/app/lifecycle?proof=1&env=core', headers: {} },
      res,
    );
    return res.state.body;
  } finally {
    process.env.NODE_ENV = prevNode;
    if (prevVercel == null) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  }
}

async function captureScreenshots(htmlPath) {
  try {
    const browser = await chromium.launch({ headless: true });
    try {
      for (const shot of [
        { name: 'desktop.png', width: 1440, height: 900 },
        { name: 'mobile.png', width: 390, height: 844 },
      ]) {
        const page = await browser.newPage({ viewport: { width: shot.width, height: shot.height } });
        await page.goto(`file://${htmlPath}`, { waitUntil: 'load', timeout: 15000 });
        await page.waitForSelector('[data-testid="lifecycle-rail"]', { timeout: 10000 });
        const file = path.join(OUT_DIR, shot.name);
        await page.screenshot({ path: file, fullPage: true });
        await page.close();
      }
      return { ok: true };
    } finally {
      await browser.close();
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

const payload = await loadProofPayload();
mkdirSync(OUT_DIR, { recursive: true });
const jsonPath = path.join(OUT_DIR, 'latest-run.json');
const htmlPath = path.join(OUT_DIR, 'navigation.html');
writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
writeFileSync(htmlPath, renderLifecycleContinuityHtml(payload));
const shots = await captureScreenshots(htmlPath);

const summary = {
  ok: payload?.verdict === 'LIFECYCLE CONTINUITY PASS',
  verdict: payload?.verdict || 'NOT READY — missing payload',
  artifact_json: path.relative(ROOT, jsonPath),
  artifact_html: path.relative(ROOT, htmlPath),
  screenshots: shots.ok ? ['artifacts/lifecycle-continuity-1072/desktop.png', 'artifacts/lifecycle-continuity-1072/mobile.png'] : [],
  screenshot_error: shots.ok ? null : shots.error,
  prospect_id: payload?.lifecycle?.prospect_id || null,
  company_id: payload?.lifecycle?.company_id || null,
  tenant_accessible: payload?.tenant_accessible === true,
  second_ledger: payload?.second_ledger === true,
};

console.log(JSON.stringify(summary, null, 2));
process.exit(summary.ok ? 0 : 1);
