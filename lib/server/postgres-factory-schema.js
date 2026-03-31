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
  `create table if not exists tenant_personas (
  id text primary key,
  tenant_id text not null unique,
  token_credit_balance_usd double precision not null default 0,
  autonomy_level integer null,
  current_rank text null,
  persona_json jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)`,
  `create index if not exists tenant_personas_tenant_id_idx on tenant_personas (tenant_id)`,
  `create table if not exists token_debits (
  id text primary key,
  occurred_at timestamptz not null default now(),
  tenant_id text not null,
  debit_usd double precision not null,
  invoice_usd double precision null,
  prev_balance_usd double precision null,
  next_balance_usd double precision null,
  context_json jsonb null
)`,
  `create index if not exists token_debits_tenant_id_idx on token_debits (tenant_id)`,
  `create index if not exists token_debits_occurred_at_idx on token_debits (occurred_at)`,
  `create table if not exists telemetry_events (
  id text primary key,
  occurred_at timestamptz not null default now(),
  tenant_id text null,
  factory_id text null,
  event_type text not null,
  cmp_ticket_id text null,
  cmp_action text null,
  payload_json jsonb null
)`,
  `create index if not exists telemetry_events_tenant_id_idx on telemetry_events (tenant_id)`,
  `create index if not exists telemetry_events_event_type_idx on telemetry_events (event_type)`,
  `create index if not exists telemetry_events_occurred_at_idx on telemetry_events (occurred_at)`,
  `create table if not exists recovery_vault_entries (
  id text primary key,
  occurred_at timestamptz not null default now(),
  category text null,
  payload_json jsonb null,
  status text null default 'PENDING_SYNC'
)`,
  `create index if not exists recovery_vault_entries_occurred_at_idx on recovery_vault_entries (occurred_at)`,
  `create index if not exists recovery_vault_entries_status_idx on recovery_vault_entries (status)`,
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
      tables: [
        'tenants',
        'auth_users',
        'cmp_tickets',
        'tenant_personas',
        'token_debits',
        'telemetry_events',
        'recovery_vault_entries',
      ],
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
