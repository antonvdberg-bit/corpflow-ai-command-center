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
 * Neon commonly provides a `-pooler` hostname for pooled connections. If build-time DDL is running
 * with only that pooled URL available, derive a best-effort non-pooling hostname by removing
 * `-pooler` from the host (same credentials/SSL params).
 *
 * Returns '' when no safe derivation can be made.
 *
 * @param {string} pooledUrl
 * @returns {string}
 */
export function deriveNonPoolingUrlFromNeonPooler(pooledUrl) {
  const raw = String(pooledUrl || '').trim();
  if (!raw) return '';

  let u;
  try {
    u = new URL(raw);
  } catch {
    return '';
  }

  if (typeof u.hostname !== 'string' || !u.hostname.includes('-pooler.')) return '';

  // Example:
  // ep-xxx-pooler.c-6.us-east-1.aws.neon.tech -> ep-xxx.c-6.us-east-1.aws.neon.tech
  u.hostname = u.hostname.replace('-pooler.', '.');
  return u.toString();
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
