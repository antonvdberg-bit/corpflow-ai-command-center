/**
 * Server-side integration endpoints (secrets via env only — no factory hostnames in repo).
 */

import { cfg } from './runtime-config.js';

/**
 * n8n (or compatible) webhook for lead intake from `/api/main`.
 * Resolved via `cfg()` so `N8N_WEBHOOK_URL` may come from `CORPFLOW_RUNTIME_CONFIG_JSON` or `process.env`.
 *
 * @returns {string}
 */
export function getN8nWebhookUrl() {
  return String(cfg('N8N_WEBHOOK_URL', '')).trim();
}

/** @deprecated Use getN8nWebhookUrl(); kept for older imports. */
export const config = {
  get n8nWebhookUrl() {
    return getN8nWebhookUrl();
  },
};
