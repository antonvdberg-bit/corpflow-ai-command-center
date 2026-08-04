/**
 * OpenHands package policy constants.
 *
 * These constants describe the resource envelope, pinned images, network
 * posture, and forbidden-secret/mount lists that `ops/openhands/compose.yaml`
 * and `ops/openhands/.env.example` are REQUIRED to match. This module is
 * pure data + small pure helper functions — it never reads a file, starts a
 * container, or reaches a network endpoint.
 *
 * `node-tests/openhands-package-config.test.mjs` cross-checks these constants
 * against the on-disk compose file so drift between "policy" and "package"
 * fails CI instead of being noticed at install time.
 *
 * Controlling issue: #743 — package/validation only, no live activation.
 */

/** Control-plane (app) container resource envelope — matches `ops/openhands/compose.yaml`. */
export const CONTROL_MEM_LIMIT = '2g';
export const CONTROL_CPUS = '1.0';

/** Sandbox container guidance — documented policy, not upstream-enforced as of the 1.8 pin. */
export const SANDBOX_MEM_GUIDANCE_GIB = 4;
export const SANDBOX_MEM_HARD_MAX_GIB = 6;

/** Concurrency ceiling — one sandbox task at a time. */
export const MAX_CONCURRENT_TASKS = 1;

/** Monthly model-spend ceiling and soft/hard thresholds (see controlling issue #743). */
export const MONTHLY_COST_CEILING_USD = 25;
export const COST_STOP_PCT = 80;
export const COST_FAIL_CLOSED_PCT = 100;

/** Pinned images — never `latest`. See `ops/openhands/VERSIONS.md`. */
export const APP_IMAGE = 'docker.openhands.dev/openhands/openhands:1.8';
export const AGENT_SERVER_IMAGE = 'ghcr.io/openhands/agent-server:1.26.0-python';

/** Loopback-only bind for the control-plane UI/API. */
export const BIND_HOST = '127.0.0.1';
export const BIND_PORT = 3000;

/** Named Compose project — never the default/anonymous project name. */
export const COMPOSE_PROJECT = 'corpflowai-openhands';

/**
 * Env var names that must never appear in the OpenHands compose file,
 * `.env.example`, or any real `.env` derived from it. This package is not
 * authorized to hold, forward, or reference CorpFlowAI production secrets.
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
 * Bind-mount path prefixes that must never be mounted into any OpenHands
 * service. Note: the Docker socket (`/var/run/docker.sock`) is a deliberate
 * exception — it is allowed ONLY on the named control service
 * (`DOCKER_SOCKET_ALLOWED_SERVICE`) and only with the documented risk note in
 * `ops/openhands/compose.yaml` / `ops/openhands/VERSIONS.md`. It is
 * intentionally NOT included in this list because it is a required upstream
 * dependency for sandbox-container spawn, not an accidental broad mount.
 */
export const FORBIDDEN_MOUNT_PREFIXES = /** @type {const} */ ([
  '/',
  '/home',
  '/root',
  '/etc',
  '/boot',
  '/var/lib/postgresql',
  '/var/run/secrets',
]);

/** Docker-socket carve-out — see `FORBIDDEN_MOUNT_PREFIXES` doc comment above. */
export const DOCKER_SOCKET_PATH = '/var/run/docker.sock';
export const DOCKER_SOCKET_ALLOWED_SERVICE = 'corpflowai-openhands-app';

/**
 * Whether a Compose `ports:` publish spec is bound to loopback only.
 * Accepts forms like `"127.0.0.1:3000:3000"`, `"0.0.0.0:3000:3000"`, or a
 * bare `"3000:3000"` / `"3000"` (bare forms bind all interfaces and are
 * therefore NOT loopback-only).
 *
 * @param {string | null | undefined} publishedPortSpec
 * @returns {boolean}
 */
export function isLoopbackBind(publishedPortSpec) {
  const s = String(publishedPortSpec ?? '').trim();
  if (!s) return false;
  const parts = s.split(':');
  if (parts.length < 2) return false; // bare container-only form — not loopback
  const hostIp = parts[0].trim();
  return hostIp === '127.0.0.1' || hostIp === 'localhost' || hostIp === '::1';
}

/**
 * Whether an image reference is unpinned ("latest", a floating tag, or no
 * tag at all — which Docker resolves to `latest`). Fails closed: a blank
 * image is treated as forbidden.
 *
 * @param {string | null | undefined} image
 * @returns {boolean}
 */
export function isForbiddenLatestTag(image) {
  const s = String(image ?? '').trim();
  if (!s) return true;
  const lastSegment = s.split('/').pop() || s;
  const colonIndex = lastSegment.lastIndexOf(':');
  if (colonIndex === -1) return true; // no tag => implicit "latest"
  const tag = lastSegment.slice(colonIndex + 1).trim().toLowerCase();
  return tag === '' || tag === 'latest' || tag === 'main' || tag === 'nightly' || tag === 'edge';
}
