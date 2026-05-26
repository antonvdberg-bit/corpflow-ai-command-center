/**
 * Analytics policy — single source of truth for which hosts and paths
 * are allowed to load the Plausible snippet.
 *
 * Canonical reference:
 * - docs/analytics/CORPFLOW_ANALYTICS_V1.md (§2 stakeholder grouping, §5 deny lists)
 * - docs/decisions/20260526-plausible-internal-vs-client-facing-boundary.md
 *
 * Policy summary:
 *   ALLOW (load script):
 *     - corpflowai.com  (apex marketing)              → marketing_surface = "apex"
 *     - aileadrescue.corpflowai.com (Lead Rescue)     → marketing_surface = "lead_rescue"
 *
 *   DENY (never load script):
 *     - core.corpflowai.com (factory)
 *     - lux.corpflowai.com, all <tenant>.corpflowai.com (tenant working/staging surfaces)
 *     - localhost, *.vercel.app (dev / preview)
 *     - any path under /change, /admin, /login, /master, /lux-editor,
 *       /lux-guide, /sovereign-intake, /core-lux-migration-repair,
 *       /api/, /_next/
 *     - on the apex specifically: /lead-rescue, /concierge, /properties, /property
 *       (these are either internal product working space or tenant-context routes)
 *     - any URL with a token-bearing query param (?token=, ?reset=, ?ticket=)
 *     - any path containing "reset-password" or "forgot-password"
 */

export const ALLOW_HOSTS = Object.freeze([
  'corpflowai.com',
  'aileadrescue.corpflowai.com',
]);

export const DENY_HOST_EXACT = Object.freeze([
  'core.corpflowai.com',
  'localhost',
]);

export const DENY_HOST_SUFFIX = Object.freeze([
  '.vercel.app',
]);

/**
 * DENY_PATH_PREFIXES use a word-boundary match: the path matches if it
 * equals the prefix, starts with `<prefix>/`, or starts with `<prefix>-`
 * (so operator route variants like `/change-v2` are denied alongside
 * `/change` and `/change/queue`, but a future public `/changelog` would
 * NOT be denied — operators name variants with `-`, not as solid words).
 *
 * Prefixes that already end with `/` (e.g. `/api/`, `/client/`) match by
 * plain string-startsWith, since the trailing slash already encodes the
 * boundary.
 */
export const DENY_PATH_PREFIXES = Object.freeze([
  '/change',
  '/admin',
  '/login',
  '/master',
  '/lux-editor',
  '/lux-guide',
  '/sovereign-intake',
  '/core-lux-migration-repair',
  '/api/',
  '/_next/',
  '/client/',
]);

export const APEX_DENY_PATH_PREFIXES = Object.freeze([
  '/lead-rescue',
  '/concierge',
  '/properties',
  '/property',
]);

export const DENY_PATH_SUBSTRINGS = Object.freeze([
  'reset-password',
  'forgot-password',
]);

export const DENY_QUERY_KEYS = Object.freeze([
  'token',
  'reset',
  'ticket',
]);

export const MARKETING_SURFACE_BY_HOST = Object.freeze({
  'corpflowai.com': 'apex',
  'aileadrescue.corpflowai.com': 'lead_rescue',
});

export const APEX_HOST = 'corpflowai.com';
