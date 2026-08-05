/**
 * OpenHands package policy constants.
 *
 * Pure data + small helpers. Cross-checked against `ops/openhands/compose.yaml`
 * by `node-tests/openhands-package-config.test.mjs`.
 *
 * Controlling issue: #743. Isolation follow-up for PR #747:
 * primary host Docker socket is FORBIDDEN; dedicated rootless daemon only.
 */

/** Control-plane (app) container resource envelope — matches `ops/openhands/compose.yaml`. */
export const CONTROL_MEM_LIMIT = '1536m';
export const CONTROL_CPUS = '1.0';
export const CONTROL_PIDS_LIMIT = 512;

/**
 * Sandbox resource targets.
 * Concurrency + timeout are enforceable via OpenHands env/config.
 * Per-sandbox Memory/NanoCpus HostConfig is NOT natively available on the
 * OSS OpenHands 1.8 Docker path (Enterprise k8s MEMORY_LIMIT exists).
 * Total RAM ceiling is enforced by systemd slice MemoryMax=4G (host-safe
 * pilot for corpflow-exec-01 ~7.6 GiB boxes).
 */
export const SANDBOX_MEM_GUIDANCE_GIB = 2;
export const SANDBOX_MEM_HARD_MAX_GIB = 3;
export const SANDBOX_CPU_GUIDANCE = 2;
export const MAX_CONCURRENT_TASKS = 1;
export const TOTAL_RAM_CEILING_GIB = 4;

/** Monthly model-spend ceiling and soft/hard thresholds. */
export const MONTHLY_COST_CEILING_USD = 25;
export const COST_STOP_PCT = 80;
export const COST_FAIL_CLOSED_PCT = 100;

/** Pinned images — never `latest`. See `ops/openhands/VERSIONS.md`. */
export const APP_IMAGE = 'docker.openhands.dev/openhands/openhands:1.8';
export const AGENT_SERVER_IMAGE = 'ghcr.io/openhands/agent-server:1.26.0-python';

/** Loopback-only bind for the control-plane UI/API. */
export const BIND_HOST = '127.0.0.1';
export const BIND_PORT = 3000;

/** Official health endpoint for the pinned app (process liveness). */
export const HEALTH_PATH = '/health';

/** Named Compose project — never the default/anonymous project name. */
export const COMPOSE_PROJECT = 'corpflowai-openhands';

/** Dedicated daemon paths (host). Primary socket is never these. */
export const OPENHANDS_HOME_DEFAULT = '$HOME/corpflowai-openhands';
export const DEDICATED_DOCKER_SOCK_REL = 'docker/docker.sock';
export const DEDICATED_DOCKER_SOCK_IN_CONTAINER = '/run/openhands-docker/docker.sock';
export const DEDICATED_DOCKER_DATA_ROOT_REL = 'docker-data';

/**
 * Primary host Docker socket — FORBIDDEN in active OpenHands install config.
 * Presence of this path as a mount or DOCKER_HOST target fails static audit.
 */
export const PRIMARY_DOCKER_SOCKET_PATH = '/var/run/docker.sock';

/** @deprecated Use PRIMARY_DOCKER_SOCKET_PATH — primary sock is no longer allowed. */
export const DOCKER_SOCKET_PATH = PRIMARY_DOCKER_SOCKET_PATH;

/**
 * Env var names that must never appear as assigned keys in compose / .env.example.
 */
export const FORBIDDEN_ENV_NAMES = /** @type {const} */ ([
  'POSTGRES_URL',
  'DATABASE_URL',
  'MASTER_ADMIN_KEY',
  'CORPFLOW_AUTOMATION_INGEST_SECRET',
  'CORPFLOW_AUTOMATION_FORWARD_SECRET',
  'CORPFLOW_AUTOMATION_FORWARD_URL',
  'CORPFLOW_CRON_SECRET',
  'CRON_SECRET',
  'CURSOR_API_KEY',
  'GITHUB_TOKEN',
  'GROQ_API_KEY',
  'TELEGRAM_BOT_TOKEN',
  'VERCEL_TOKEN',
]);

/**
 * Bind-mount path prefixes that must never be mounted into any OpenHands service.
 * Includes the primary Docker socket — dedicated socket mounts use OPENHANDS_DOCKER_SOCK
 * variable expansion, not a literal `/var/run/docker.sock` path.
 */
export const FORBIDDEN_MOUNT_PREFIXES = /** @type {const} */ ([
  '/',
  '/home',
  '/root',
  '/etc',
  '/boot',
  '/var/lib/postgresql',
  '/var/run/secrets',
  PRIMARY_DOCKER_SOCKET_PATH,
]);

/** Exact rollback/uninstall resource allowlist (dedicated daemon context). */
export const ROLLBACK_ALLOWED_CONTAINERS = /** @type {const} */ (['corpflowai-openhands-app']);
export const ROLLBACK_ALLOWED_NETWORKS = /** @type {const} */ (['corpflowai-openhands-net']);
export const ROLLBACK_ALLOWED_VOLUMES = /** @type {const} */ ([
  'corpflowai-openhands-state',
  'corpflowai-openhands-workspace',
]);

/** Forbidden destructive docker CLI substrings in OpenHands ops scripts. */
export const FORBIDDEN_ROLLBACK_COMMAND_PATTERNS = /** @type {const} */ ([
  'docker system prune',
  'docker volume prune',
  'docker network prune',
  'docker image prune',
  'docker container prune',
  'docker builder prune',
]);

/**
 * @param {string | null | undefined} publishedPortSpec
 * @returns {boolean}
 */
export function isLoopbackBind(publishedPortSpec) {
  const s = String(publishedPortSpec ?? '').trim();
  if (!s) return false;
  const parts = s.split(':');
  if (parts.length < 2) return false;
  const hostIp = parts[0].trim();
  return hostIp === '127.0.0.1' || hostIp === 'localhost' || hostIp === '::1';
}

/**
 * @param {string | null | undefined} image
 * @returns {boolean}
 */
export function isForbiddenLatestTag(image) {
  const s = String(image ?? '').trim();
  if (!s) return true;
  const lastSegment = s.split('/').pop() || s;
  const colonIndex = lastSegment.lastIndexOf(':');
  if (colonIndex === -1) return true;
  const tag = lastSegment.slice(colonIndex + 1).trim().toLowerCase();
  return tag === '' || tag === 'latest' || tag === 'main' || tag === 'nightly' || tag === 'edge';
}

/**
 * True if text (non-comment lines) references the primary Docker socket as a
 * mount or DOCKER_HOST target.
 *
 * @param {string} text
 * @returns {boolean}
 */
export function referencesPrimaryDockerSocket(text) {
  const lines = String(text ?? '').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.includes(PRIMARY_DOCKER_SOCKET_PATH)) return true;
  }
  return false;
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function referencesHostDockerInternal(text) {
  const lines = String(text ?? '').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (/host\.docker\.internal/i.test(line)) return true;
  }
  return false;
}
