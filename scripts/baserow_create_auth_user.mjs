/**
 * Create a row in the Baserow AuthUsers table.
 *
 * Why: lets you manage usernames/passwords/levels in Baserow instead of Vercel env vars.
 *
 * Usage (PowerShell):
 *   $env:BASEROW_URL="https://YOUR_BASEROW_HOST"
 *   $env:BASEROW_TOKEN="..."
 *   $env:BASEROW_AUTH_USERS_TABLE_ID="123"
 *   $env:AUTH_USERNAME="anton"
 *   $env:AUTH_PASSWORD="choose-a-long-password"
 *   $env:AUTH_LEVEL="admin"   # admin | tenant | ops
 *   $env:AUTH_TENANT_ID=""    # required when AUTH_LEVEL=tenant
 *   node scripts/baserow_create_auth_user.mjs
 */

import crypto from 'crypto';

const baseUrl = (process.env.BASEROW_URL || 'https://api.baserow.io').replace(/\/$/, '');
const token = String(process.env.BASEROW_TOKEN || '').trim();
const tableId = String(process.env.BASEROW_AUTH_USERS_TABLE_ID || '').trim();

const username = String(process.env.AUTH_USERNAME || '').trim();
const password = String(process.env.AUTH_PASSWORD || '').trim();
const level = String(process.env.AUTH_LEVEL || '').trim().toLowerCase();
const tenantId = String(process.env.AUTH_TENANT_ID || '').trim();

if (!token) {
  console.error('Missing BASEROW_TOKEN');
  process.exit(1);
}
if (!tableId) {
  console.error('Missing BASEROW_AUTH_USERS_TABLE_ID');
  process.exit(1);
}
if (!username || !password) {
  console.error('Missing AUTH_USERNAME or AUTH_PASSWORD');
  process.exit(1);
}
if (!['admin', 'tenant', 'ops'].includes(level)) {
  console.error('AUTH_LEVEL must be admin | tenant | ops');
  process.exit(1);
}
if (level === 'tenant' && !tenantId) {
  console.error('AUTH_TENANT_ID is required when AUTH_LEVEL=tenant');
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString('hex');
const password_hash = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');

async function request(path, init) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg = typeof body === 'object' && body && body.error ? String(body.error) : `HTTP_${res.status}`;
    throw new Error(`${msg} ${url} :: ${text.slice(0, 800)}`);
  }
  return body;
}

async function main() {
  const now = new Date().toISOString();
  const row = await request(`/api/database/rows/table/${encodeURIComponent(tableId)}/`, {
    method: 'POST',
    body: JSON.stringify({
      username,
      password_hash,
      password_salt: salt,
      level,
      tenant_id: level === 'tenant' ? tenantId : '',
      enabled: true,
      created_at: now,
      last_login_at: '',
    }),
  });
  console.log(JSON.stringify({ ok: true, created_row_id: row?.id || null, username, level }, null, 2));
}

main().catch((e) => {
  console.error(String(e?.message || e));
  process.exit(2);
});

