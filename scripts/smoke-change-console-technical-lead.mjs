#!/usr/bin/env node
/**
 * Product smoke: Change Console "Factory oversight" API (technical-lead-latest).
 *
 * Same endpoint as public/change.html → GET /api/cmp/router?action=technical-lead-latest&id=<ticket>
 *
 * Auth (pick one):
 *   1) Factory master — header x-session-token = MASTER_ADMIN_KEY or ADMIN_PIN (from .env.local via bootstrap, or env).
 *   2) Tenant login — Cookie corpflow_session=... (copy from browser DevTools after PIN/password login).
 *
 * Usage:
 *   npm run smoke:change-technical-lead -- --ticket=cmn...
 *
 * Env:
 *   SMOKE_BASE_URL        default https://core.corpflowai.com
 *   SMOKE_TICKET_ID       ticket id (if not passed as --ticket=)
 *   SMOKE_FACTORY_TOKEN   optional; overrides MASTER_ADMIN_KEY / ADMIN_PIN for this request only
 *   SMOKE_COOKIE          optional; full Cookie header value (e.g. corpflow_session=...)
 *
 * Do not paste secrets into git or chat; use .env.local (gitignored) or shell exports.
 */

import './bootstrap-repo-env.mjs';

function parseArgs(argv) {
  const out = { ticket: '', base: '' };
  for (const a of argv) {
    if (a.startsWith('--ticket=')) out.ticket = a.slice('--ticket='.length).trim();
    else if (a.startsWith('--base=')) out.base = a.slice('--base='.length).trim().replace(/\/$/, '');
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = String(
    args.base ||
      process.env.SMOKE_BASE_URL ||
      'https://core.corpflowai.com',
  ).replace(/\/$/, '');
  const ticket = String(args.ticket || process.env.SMOKE_TICKET_ID || '').trim();
  if (!ticket) {
    console.error('Missing ticket id. Pass --ticket=... or set SMOKE_TICKET_ID.');
    process.exit(1);
  }

  const cookie = String(process.env.SMOKE_COOKIE || '').trim();
  const factoryToken = String(
    process.env.SMOKE_FACTORY_TOKEN ||
      process.env.MASTER_ADMIN_KEY ||
      process.env.ADMIN_PIN ||
      '',
  ).trim();

  if (!cookie && !factoryToken) {
    console.error(
      'No auth: set SMOKE_COOKIE (browser corpflow_session) or SMOKE_FACTORY_TOKEN / MASTER_ADMIN_KEY / ADMIN_PIN in .env.local.',
    );
    process.exit(1);
  }

  const url = `${base}/api/cmp/router?action=technical-lead-latest&id=${encodeURIComponent(ticket)}`;
  const headers = { Accept: 'application/json' };
  if (cookie) headers.Cookie = cookie;
  else headers['x-session-token'] = factoryToken;

  const r = await fetch(url, { method: 'GET', headers });
  const text = await r.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { _raw: text.slice(0, 500) };
  }

  console.log(`GET ${url}`);
  console.log(`HTTP ${r.status}`);
  console.log(JSON.stringify(body, null, 2));

  if (!r.ok) {
    process.exit(1);
  }
  if (body && body.error) {
    process.exit(1);
  }
  if (body && body.ok !== true) {
    process.exit(1);
  }

  if (body.latest === null) {
    console.log('\nOK: endpoint works; no audit row yet (cron or manual observer run).');
  } else {
    console.log('\nOK: latest audit present (Factory oversight would show text).');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
