/**
 * Risk classification for automation ingest (approval gates for high-impact events).
 */

import { cfg } from '../server/runtime-config.js';

const DEFAULT_HIGH_PREFIXES = [
  'billing.',
  'payment.',
  'money.',
  'delete.',
  'destroy.',
  'publish.public.',
  'external.deploy.prod',
  'invoice.pay',
  'refund.',
];

const DEFAULT_MEDIUM_PREFIXES = ['automation.forward', 'n8n.dispatch', 'webhook.forward'];

/**
 * Parses a comma-separated override list from env (optional).
 *
 * @param {string} key
 * @param {string[]} fallback
 * @returns {string[]}
 */
function parsePrefixList(key, fallback) {
  const raw = String(cfg(key, '')).trim();
  if (!raw) return [...fallback];
  const parts = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return parts.length ? parts : [...fallback];
}

/**
 * Returns ordered prefix lists for classification.
 *
 * @returns {{ high: string[]; medium: string[] }}
 */
export function loadRiskPrefixLists() {
  return {
    high: parsePrefixList('CORPFLOW_AUTOMATION_HIGH_RISK_PREFIXES', DEFAULT_HIGH_PREFIXES),
    medium: parsePrefixList('CORPFLOW_AUTOMATION_MEDIUM_RISK_PREFIXES', DEFAULT_MEDIUM_PREFIXES),
  };
}

/**
 * Classifies an event type into low | medium | high tiers.
 *
 * @param {string} eventType
 * @returns {'low' | 'medium' | 'high'}
 */
export function classifyEventRisk(eventType) {
  const t = String(eventType || '').trim().toLowerCase();
  if (!t) return 'low';
  const { high, medium } = loadRiskPrefixLists();
  for (const p of high) {
    if (p && t.startsWith(p)) return 'high';
  }
  for (const p of medium) {
    if (p && t.startsWith(p)) return 'medium';
  }
  return 'low';
}

/**
 * Whether this risk tier requires an explicit approval secret on the request.
 *
 * @param {'low' | 'medium' | 'high'} tier
 * @returns {boolean}
 */
export function tierRequiresApprovalSecret(tier) {
  return tier === 'high';
}
