/**
 * Factory-only: create CorpFlow tables in Postgres if missing (idempotent).
 *
 * Use when you do not want to run SQL manually in Prisma/Vercel consoles.
 * Requires the same auth as other factory repair endpoints (admin session or master key).
 *
 * Route: POST /api/factory/postgres/ensure-schema
 */

import { PrismaClient } from '@prisma/client';

import { verifyFactoryMasterAuth } from './factory-master-auth.js';
import { cfg } from './runtime-config.js';

function json(res, status, body) {
  res.status(status).json(body);
}

/** One statement per entry; order matters (tables before indexes). */
const ENSURE_SCHEMA_STATEMENTS = [
  `create table if not exists tenants (
  id text primary key,
  tenant_id text not null unique,
  slug text not null unique,
  name text not null,
  fqdn text null,
  lifecycle text null default 'Build',
  tenant_status text null default 'Active',
  execution_only boolean not null default false,
  sovereign_pin_hash text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)`,
  `create index if not exists tenants_tenant_status_idx on tenants (tenant_status)`,
  `create index if not exists tenants_lifecycle_idx on tenants (lifecycle)`,
  `create table if not exists auth_users (
  id text primary key,
  username text not null unique,
  password_hash text not null,
  password_salt text not null,
  level text not null,
  tenant_id text null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  last_login_at timestamptz null
)`,
  `create index if not exists auth_users_level_idx on auth_users (level)`,
  `create index if not exists auth_users_tenant_id_idx on auth_users (tenant_id)`,
  `create table if not exists cmp_tickets (
  id text primary key,
  tenant_id text null,
  description text null,
  status text null default 'Open',
  stage text null default 'Intake',
  title text null,
  brief text null,
  locale text null,
  console_json jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)`,
  `create index if not exists cmp_tickets_tenant_id_idx on cmp_tickets (tenant_id)`,
  `create index if not exists cmp_tickets_status_idx on cmp_tickets (status)`,
  `create index if not exists cmp_tickets_stage_idx on cmp_tickets (stage)`,
];

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
export default async function postgresFactorySchemaHandler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  if (!verifyFactoryMasterAuth(req)) {
    return json(res, 403, { error: 'Factory master authentication required.' });
  }

  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) {
    return json(res, 503, {
      error: 'POSTGRES_URL_MISSING',
      hint: 'Set POSTGRES_URL in Vercel (pooled Prisma URL is fine).',
    });
  }

  const prisma = new PrismaClient();
  let lastIndex = -1;
  try {
    for (let i = 0; i < ENSURE_SCHEMA_STATEMENTS.length; i++) {
      lastIndex = i;
      await prisma.$executeRawUnsafe(ENSURE_SCHEMA_STATEMENTS[i]);
    }
    return json(res, 200, {
      ok: true,
      statements_executed: ENSURE_SCHEMA_STATEMENTS.length,
      tables: ['tenants', 'auth_users', 'cmp_tickets'],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(res, 500, {
      ok: false,
      error: 'ENSURE_SCHEMA_FAILED',
      detail: msg,
      failed_statement_index: lastIndex,
      hint:
        lastIndex >= 0
          ? 'Check Postgres logs and permissions. Safe to retry after fixing the underlying error.'
          : 'Prisma could not connect or execute. Verify POSTGRES_URL and network access from Vercel.',
    });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}
