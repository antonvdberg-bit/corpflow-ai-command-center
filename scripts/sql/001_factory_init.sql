-- CorpFlow Factory DB (Postgres) - initial schema
-- Target: Elestio Managed PostgreSQL
--
-- Safe to run once on a new database. If re-running, drop tables first.

create table if not exists tenants (
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
);

create index if not exists tenants_tenant_status_idx on tenants (tenant_status);
create index if not exists tenants_lifecycle_idx on tenants (lifecycle);

create table if not exists auth_users (
  id text primary key,
  username text not null unique,
  password_hash text not null,
  password_salt text not null,
  level text not null,
  tenant_id text null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  last_login_at timestamptz null
);

create index if not exists auth_users_level_idx on auth_users (level);
create index if not exists auth_users_tenant_id_idx on auth_users (tenant_id);

create table if not exists cmp_tickets (
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
);

create index if not exists cmp_tickets_tenant_id_idx on cmp_tickets (tenant_id);
create index if not exists cmp_tickets_status_idx on cmp_tickets (status);
create index if not exists cmp_tickets_stage_idx on cmp_tickets (stage);

