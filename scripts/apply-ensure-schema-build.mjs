/**
 * Vercel `vercel-build`: apply the same idempotent DDL as POST /api/factory/postgres/ensure-schema
 * using POSTGRES_URL only (no master key). Runs after `prisma generate`, before `next build`.
 *
 * Skip when no usable Postgres URL is available (local `next build`, some CI).
 * Fails the build on production Vercel when Postgres URL is missing (misconfiguration).
 */
import { PrismaClient } from '@prisma/client';

import {
  deriveNonPoolingUrlFromNeonPooler,
  formatEnsureSchemaStatementLabel,
  resolvePostgresUrlForEnsureSchemaDdl,
} from '../lib/server/postgres-ensure-schema-connection.js';
import { ENSURE_SCHEMA_STATEMENTS } from '../lib/server/postgres-ensure-schema-statements.js';

function snippet(sql) {
  return String(sql || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
}

/** @param {unknown} e */
function prismaErrorFields(e) {
  if (!e || typeof e !== 'object') return { message: String(e) };
  const err = /** @type {Record<string, unknown>} */ (e);
  const out = { message: e instanceof Error ? e.message : String(e) };
  if (typeof err.code === 'string') out.code = err.code;
  if (err.meta != null && typeof err.meta === 'object') out.meta = err.meta;
  return out;
}

function resolveBuildPostgresUrl() {
  const nonPool = resolvePostgresUrlForEnsureSchemaDdl(process.env);
  const pooled = String(
    process.env.POSTGRES_URL ||
      process.env.DATABASE_URL ||
      process.env.PRISMA_DATABASE_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      '',
  ).trim();
  const derived = !nonPool && pooled ? deriveNonPoolingUrlFromNeonPooler(pooled) : '';
  const url = nonPool || derived || pooled;
  return {
    url,
    urlMode: nonPool ? 'non_pooling' : derived ? 'derived_non_pooling' : pooled ? 'pooled' : 'none',
  };
}

async function main() {
  if (String(process.env.CORPFLOW_SKIP_ENSURE_SCHEMA_BUILD || '').toLowerCase() === 'true') {
    console.log('[ensure_schema_build] SKIP: CORPFLOW_SKIP_ENSURE_SCHEMA_BUILD=true');
    return;
  }

  const { url: pgUrl, urlMode } = resolveBuildPostgresUrl();
  const onVercelProd = Boolean(process.env.VERCEL) && String(process.env.VERCEL_ENV || '') === 'production';

  if (!pgUrl) {
    if (onVercelProd) {
      console.error('[ensure_schema_build] FATAL: VERCEL production build without Postgres URL');
      process.exit(1);
    }
    console.log('[ensure_schema_build] SKIP: Postgres URL not set');
    return;
  }

  const prisma = new PrismaClient({
    datasources: {
      db: { url: pgUrl },
    },
  });
  const n = ENSURE_SCHEMA_STATEMENTS.length;
  let lastIndex = -1;
  try {
    console.warn(
      `[ensure_schema_build] start ${JSON.stringify({
        statements: n,
        url_mode: urlMode,
        vercel_env: process.env.VERCEL_ENV || null,
      })}`,
    );
    for (let i = 0; i < n; i++) {
      lastIndex = i;
      const sql = ENSURE_SCHEMA_STATEMENTS[i];
      const label = formatEnsureSchemaStatementLabel(i, sql);
      await prisma.$executeRawUnsafe(sql);
      console.log(`[ensure_schema_build] statement_ok index=${i + 1}/${n} label=${label} sql=${snippet(sql)}`);
    }
    console.warn(
      `[ensure_schema_build] complete ${JSON.stringify({
        statements_executed: n,
        url_mode: urlMode,
        vercel_env: process.env.VERCEL_ENV || null,
      })}`,
    );
  } catch (e) {
    const label =
      lastIndex >= 0 ? formatEnsureSchemaStatementLabel(lastIndex, ENSURE_SCHEMA_STATEMENTS[lastIndex]) : '';
    const fields = prismaErrorFields(e);
    console.error(
      '[ensure_schema_build] FATAL',
      JSON.stringify({
        failed_statement_index: lastIndex,
        failed_statement_label: label || null,
        ...fields,
      }),
    );
    process.exit(1);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
