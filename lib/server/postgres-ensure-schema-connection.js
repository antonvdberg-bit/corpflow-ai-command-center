/**
 * Connection URL selection for idempotent Postgres DDL (ensure-schema).
 *
 * Pooled drivers (PgBouncer transaction mode, typical serverless `POSTGRES_URL`) can reject or
 * mis-handle some DDL / session behavior. Vercel Postgres / Neon integrations often expose a
 * separate **non-pooling** URL; use it when present.
 *
 * Never logs URLs or secrets.
 */

/** Canonical DB env keys scanned for Prisma Postgres / Accelerate drift. */
export const POSTGRES_DRIFT_ENV_KEYS = [
  'POSTGRES_URL',
  'DATABASE_URL',
  'PRISMA_DATABASE_URL',
  'POSTGRES_PRISMA_URL',
  'DIRECT_URL',
  'POSTGRES_URL_NON_POOLING',
  'DATABASE_URL_UNPOOLED',
  'POSTGRES_URL_UNPOOLED',
  'PRISMA_DATABASE_URL_UNPOOLED',
  'POSTGRES_PRISMA_URL_NON_POOLING',
];

/**
 * Detect deprecated Prisma Postgres / Accelerate configuration without logging secrets.
 *
 * @param {string} value
 * @returns {{ code: string, reason: string } | null}
 */
export function detectPostgresUrlDrift(value) {
  const v = String(value || '').trim();
  if (!v) return null;

  if (/^prisma:\/\//i.test(v)) {
    return {
      code: 'prisma_accelerate_protocol',
      reason:
        'Postgres URL uses prisma:// (Prisma Accelerate). Neon is required — see docs/operations/POSTGRES_PROVIDER.md',
    };
  }

  const schemeMatch = /^([A-Za-z][A-Za-z0-9+.\-]*):/.exec(v);
  const scheme = schemeMatch ? schemeMatch[1].toLowerCase() : null;
  if (scheme && (scheme.startsWith('prisma+') || scheme.endsWith('+prisma'))) {
    return {
      code: 'prisma_proxy_scheme',
      reason:
        'Postgres URL scheme indicates a Prisma proxy. Use postgresql:// to Neon — see docs/operations/POSTGRES_PROVIDER.md',
    };
  }

  let host = '';
  try {
    const m = /^[A-Za-z][A-Za-z0-9+.\-]*:\/\/[^@]*@?([^:/?#]*)/i.exec(v);
    if (m) host = m[1] || '';
  } catch {
    host = '';
  }

  if (/\bprisma\.io\b/i.test(host) || /\bdb\.prisma\.io\b/i.test(v) || /\bprisma\.io\b/i.test(v)) {
    return {
      code: 'prisma_postgres_host',
      reason:
        'Postgres URL references db.prisma.io / Prisma Postgres (deprecated). Repoint all six DB env keys to Neon (*.neon.tech) via Infisical → Vercel sync — see docs/operations/POSTGRES_PROVIDER.md §5b',
    };
  }

  if (/\bprisma-data\b/i.test(v)) {
    return {
      code: 'prisma_data_host',
      reason:
        'Postgres URL references prisma-data (deprecated Prisma provider drift) — see docs/operations/POSTGRES_PROVIDER.md',
    };
  }

  return null;
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {readonly string[]} [keys]
 * @returns {{ env_key: string, code: string, reason: string } | null}
 */
export function scanPostgresEnvForDrift(env, keys = POSTGRES_DRIFT_ENV_KEYS) {
  for (const key of keys) {
    const drift = detectPostgresUrlDrift(env[key]);
    if (drift) return { env_key: key, ...drift };
  }
  return null;
}

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
