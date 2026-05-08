/**
 * Connection URL selection for idempotent Postgres DDL (ensure-schema).
 *
 * Pooled drivers (PgBouncer transaction mode, typical serverless `POSTGRES_URL`) can reject or
 * mis-handle some DDL / session behavior. Vercel Postgres / Neon integrations often expose a
 * separate **non-pooling** URL; use it when present.
 *
 * Never logs URLs or secrets.
 */

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string} trimmed URL or ''
 */
export function resolvePostgresUrlForEnsureSchemaDdl(env = process.env) {
  const pick = (/** @type {string} */ key) => {
    const v = env[key];
    return typeof v === 'string' && v.trim() !== '' ? v.trim() : '';
  };

  return (
    pick('POSTGRES_URL_NON_POOLING') ||
    pick('DATABASE_URL_UNPOOLED') ||
    pick('POSTGRES_URL_UNPOOLED') ||
    pick('PRISMA_DATABASE_URL_UNPOOLED') ||
    pick('POSTGRES_PRISMA_URL_NON_POOLING') ||
    ''
  );
}

/**
 * @param {number} zeroBasedIndex
 * @param {string} sql
 * @returns {string}
 */
export function formatEnsureSchemaStatementLabel(zeroBasedIndex, sql) {
  const head = String(sql || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
  return `${zeroBasedIndex + 1}:${head}`;
}
