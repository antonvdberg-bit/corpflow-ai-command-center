#!/usr/bin/env node
/**
 * Invoke Living Word GHL read-only probe on Vercel Production (factory auth).
 *
 * SECURITY POLICY — no master key in any process:
 *   This script MUST NOT use MASTER_ADMIN_KEY / ADMIN_PIN. That secret is
 *   deliberately NOT provisioned in Vercel or Infisical and must never be
 *   embedded in an operator process. Factory routes are reached here via the
 *   admin **session** channel only (`corpflow_session` cookie, signed JWT,
 *   `typ: 'admin'`) — see `verifyFactoryMasterAuth()` in
 *   lib/server/factory-master-auth.js.
 *
 * How to authenticate (operator):
 *   1. Log in as the factory admin in a browser at
 *      https://core.corpflowai.com/login (uses CORPFLOW_ADMIN_USERNAME /
 *      CORPFLOW_ADMIN_PASSWORD — those are the approved secrets, not the master key).
 *   2. Copy the `corpflow_session` cookie value (DevTools → Application → Cookies).
 *   3. Provide it to this script via repo-root .env.local (gitignored) or a
 *      shell variable, as either:
 *        CORPFLOW_SESSION=<corpflow_session JWT>            (preferred)
 *        GHL_PROBE_COOKIE=corpflow_session=<JWT>; other=... (full Cookie header)
 *   The session is short-lived and is the designed auth channel; never paste it
 *   into chat, commits, PRs, or logs.
 *
 * Usage:
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

// Admin session only. Accept a full Cookie header, or just the corpflow_session token.
const rawCookieHeader = String(process.env.GHL_PROBE_COOKIE || '').trim();
const sessionToken = String(process.env.CORPFLOW_SESSION || process.env.CORPFLOW_SESSION_TOKEN || '').trim();

let cookieHeader = '';
if (rawCookieHeader) {
  cookieHeader = rawCookieHeader;
} else if (sessionToken) {
  cookieHeader = `corpflow_session=${sessionToken}`;
}

if (!cookieHeader) {
  console.error(
    [
      'No admin session found. This script does NOT use MASTER_ADMIN_KEY.',
      'Log in as the factory admin at /login, copy the corpflow_session cookie, and set',
      'CORPFLOW_SESSION=<corpflow_session value> (or GHL_PROBE_COOKIE=<full Cookie header>)',
      'in repo-root .env.local. Never paste it into chat, commits, or logs.',
    ].join(' '),
  );
  process.exit(1);
}

const url = `${baseUrl}/api/factory/ghl/living-word/probe?tenant_id=living-word-mauritius`;

const res = await fetch(url, {
  method: 'GET',
  headers: {
    Cookie: cookieHeader,
    Accept: 'application/json',
  },
});

if (res.status === 403) {
  console.error(
    [
      'Factory auth rejected (403 factory_master_required).',
      'The corpflow_session is missing/expired or is not an admin (typ=admin) session.',
      'Re-log in at /login as the factory admin and refresh CORPFLOW_SESSION in .env.local.',
    ].join(' '),
  );
}

const report = await res.json();
const safeOut = { httpStatus: res.status, ...report };
const text = JSON.stringify(safeOut, null, 2);
// Defense-in-depth: never echo the session token even if it appeared in output.
const leakProbe = sessionToken && sessionToken.length >= 12 ? sessionToken : null;
if (leakProbe && text.includes(leakProbe)) {
  console.error('Refusing to print response: session token leak detected');
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
