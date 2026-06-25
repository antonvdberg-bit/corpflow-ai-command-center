#!/usr/bin/env node
/**
 * Invoke Living Word GHL read-only probe on Vercel Production (factory auth).
 *
 * Usage (operator machine — never paste GHL PIT into chat):
 *   MASTER_ADMIN_KEY=... node scripts/invoke-ghl-living-word-probe.mjs
 *
 * Optional:
 *   CORPFLOW_FACTORY_BASE_URL=https://core.corpflowai.com
 *   GHL_PROBE_WRITE_ARTIFACT=1  — write verification markdown (redacted) to artifacts/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  formatGhlProbeVerificationMarkdown,
} from '../lib/server/ghl/ghl-readonly-probe.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const baseUrl = String(process.env.CORPFLOW_FACTORY_BASE_URL || 'https://core.corpflowai.com').replace(
  /\/$/,
  '',
);
const masterKey = String(process.env.MASTER_ADMIN_KEY || '').trim();

if (!masterKey) {
  console.error('MASTER_ADMIN_KEY is required to call the factory probe endpoint.');
  process.exit(1);
}

const url = `${baseUrl}/api/factory/ghl/living-word/probe?tenant_id=living-word-mauritius`;

const res = await fetch(url, {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${masterKey}`,
    Accept: 'application/json',
  },
});

const report = await res.json();
const safeOut = { httpStatus: res.status, ...report };
const text = JSON.stringify(safeOut, null, 2);
if (text.includes(masterKey)) {
  console.error('Refusing to print response: master key leak detected');
  process.exit(1);
}
console.log(text);

if (process.env.GHL_PROBE_WRITE_ARTIFACT === '1' && report && typeof report === 'object') {
  const md = formatGhlProbeVerificationMarkdown(report);
  const outPath = path.join(
    ROOT,
    'artifacts/quality-audits/2026-06-11-living-word-mauritius/ghl-read-only-sync-probe-v1-live-verification.md',
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${md}\n`, 'utf8');
  console.error(`Wrote verification artifact: ${outPath}`);
}

process.exit(res.ok && report.ok !== false ? 0 : 1);
