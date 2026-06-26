#!/usr/bin/env node
/**
 * Invoke Living Word GHL read-only probe on Vercel Production (factory auth).
 *
 * Factory auth source (no per-run export needed):
 *   This script auto-loads repo-root `.env.local` then `.env` via
 *   `bootstrap-repo-env.mjs`. Put the factory master credential in `.env.local`
 *   (gitignored) once — the value MUST match Vercel Production's
 *   `MASTER_ADMIN_KEY` (resolved there from `CORPFLOW_RUNTIME_CONFIG_JSON`,
 *   source of truth: Infisical). A shell `$env:MASTER_ADMIN_KEY` still wins if set.
 *   See docs/operations/SECRETS_SYNC.md and `.env.template` § MASTER_ADMIN_KEY.
 *
 * Usage (operator machine — never paste the key or GHL PIT into chat):
 *   node scripts/invoke-ghl-living-word-probe.mjs
 *
 * Optional:
 *   CORPFLOW_FACTORY_BASE_URL=https://core.corpflowai.com
 *   GHL_PROBE_WRITE_ARTIFACT=1  — write verification markdown (redacted) to artifacts/
 */
import './bootstrap-repo-env.mjs';
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
// Server accepts MASTER_ADMIN_KEY or its ADMIN_PIN alias (lib/server/factory-master-auth.js).
const masterKey = String(process.env.MASTER_ADMIN_KEY || process.env.ADMIN_PIN || '').trim();

if (!masterKey) {
  console.error(
    [
      'No factory master credential found.',
      'Set MASTER_ADMIN_KEY (or ADMIN_PIN) in repo-root .env.local — the value must match',
      "Vercel Production (source of truth: Infisical). This script auto-loads .env.local/.env;",
      'no per-run shell export is required. See docs/operations/SECRETS_SYNC.md.',
    ].join(' '),
  );
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

if (res.status === 403) {
  console.error(
    [
      'Factory auth rejected (403 factory_master_required).',
      'The MASTER_ADMIN_KEY/ADMIN_PIN in .env.local does not match Vercel Production.',
      'Sync the current Production value (from Infisical / runtime config) into .env.local;',
      'do not paste it into chat, commits, or logs.',
    ].join(' '),
  );
}

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
