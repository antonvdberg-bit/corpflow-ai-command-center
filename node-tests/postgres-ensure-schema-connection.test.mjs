import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveNonPoolingUrlFromNeonPooler,
  detectPostgresUrlDrift,
  formatEnsureSchemaStatementLabel,
  resolvePostgresUrlForEnsureSchemaDdl,
  scanPostgresEnvForDrift,
} from '../lib/server/postgres-ensure-schema-connection.js';

test('resolvePostgresUrlForEnsureSchemaDdl prefers non-pooling env keys', () => {
  const env = {
    POSTGRES_URL: 'pooled://x',
    POSTGRES_URL_NON_POOLING: 'direct://y',
  };
  assert.equal(resolvePostgresUrlForEnsureSchemaDdl(env), 'direct://y');
});

test('resolvePostgresUrlForEnsureSchemaDdl falls back when no direct URL', () => {
  const env = { POSTGRES_URL: 'pooled://x' };
  assert.equal(resolvePostgresUrlForEnsureSchemaDdl(env), '');
});

test('formatEnsureSchemaStatementLabel prefixes 1-based index', () => {
  assert.equal(formatEnsureSchemaStatementLabel(0, 'create table foo'), '1:create table foo');
  assert.ok(formatEnsureSchemaStatementLabel(41, 'select\n  1').startsWith('42:select 1'));
});

test('deriveNonPoolingUrlFromNeonPooler strips -pooler from hostname', () => {
  const pooled =
    'postgresql://user:pass@ep-mute-tooth-an0pclzd-pooler.c-6.us-east-1.aws.neon.tech:5432/db?sslmode=require';
  const derived = deriveNonPoolingUrlFromNeonPooler(pooled);
  assert.ok(derived.includes('ep-mute-tooth-an0pclzd.c-6.us-east-1.aws.neon.tech'));
  assert.ok(!derived.includes('-pooler.'));
  assert.ok(derived.includes('sslmode=require'));
});

test('detectPostgresUrlDrift flags db.prisma.io hostnames', () => {
  const drift = detectPostgresUrlDrift('postgresql://user:secret@db.prisma.io:5432/database');
  assert.ok(drift);
  assert.equal(drift.code, 'prisma_postgres_host');
});

test('detectPostgresUrlDrift accepts neon.tech hosts', () => {
  assert.equal(
    detectPostgresUrlDrift(
      'postgresql://user:secret@ep-mute-tooth-an0pclzd-pooler.c-6.us-east-1.aws.neon.tech:5432/neondb',
    ),
    null,
  );
});

test('scanPostgresEnvForDrift reports the offending env key', () => {
  const drift = scanPostgresEnvForDrift({
    POSTGRES_URL: 'postgresql://user:secret@db.prisma.io:5432/database',
    DIRECT_URL: 'postgresql://user:secret@ep-abc.c-6.us-east-1.aws.neon.tech:5432/neondb',
  });
  assert.ok(drift);
  assert.equal(drift.env_key, 'POSTGRES_URL');
});
