/**
 * Serverless-friendly Vanguard gate (budget + heuristic ethical score).
 *
 * Mirrors `vanguard/verify-rigor.py` enough for Vercel (no Python on PATH).
 * Full Python verifier adds Gemini, rigor reports, WhatsApp — use `CORPFLOW_VANGUARD_MODE=python` locally/CI.
 */

import { cfg } from '../../server/runtime-config.js';

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Same keyword + length heuristics as `verify-rigor.py` `_heuristic_ethical_score`.
 *
 * @param {string} description
 * @returns {number} 1..10
 */
export function heuristicEthicalScore(description) {
  const d = String(description || '').toLowerCase();
  const keywords = [
    'fraud',
    'illegal',
    'scam',
    'coerce',
    'extort',
    'privacy',
    'pii',
    'blackmail',
    'steal',
    'bypass',
    'evade',
    'exploit',
    'manipulate',
    'unethical',
    'deceptive',
  ];
  let hits = 0;
  for (const k of keywords) {
    if (d.includes(k)) hits += 1;
  }
  let lengthScore = 0;
  if (d.length > 180) lengthScore = 2;
  if (d.length > 600) lengthScore = 3;
  const base = 2;
  return clamp(base + hits + lengthScore, 1, 10);
}

/**
 * @param {object} opts
 * @param {string} [opts.description]
 * @param {number|string} [opts.costUsd]
 * @param {string} [opts.clientId]
 * @param {string} [opts.action]
 * @param {string} [opts.ticketId]
 * @returns {Record<string, unknown>} Same shape as `verify-rigor.py` JSON line.
 */
export function verifyRigorNode(opts) {
  const description = String(opts.description || '');
  const hardCap = parseFloat(String(cfg('HARD_BUDGET_CAP_USD', '25000'))) || 25000;
  const costUsd = Number(opts.costUsd ?? 0);
  const ethicalScore = heuristicEthicalScore(description);

  const budgetReject = costUsd > hardCap;
  const ethicalReject = ethicalScore > 7;

  if (budgetReject) {
    return {
      ok: false,
      budget_cap_usd: hardCap,
      cost_estimate_usd: costUsd,
      ethical_score: ethicalScore,
      reject_reason: 'High-Cost Alert: cost_estimate exceeded HARD_BUDGET_CAP_USD.',
      requires_client_ack: false,
      rigor_report_id: null,
      executive_escalated: false,
      rejected_by: ['budget_cap'],
      sentinel_engine: 'node',
    };
  }

  if (ethicalReject) {
    return {
      ok: false,
      budget_cap_usd: hardCap,
      cost_estimate_usd: costUsd,
      ethical_score: ethicalScore,
      reject_reason:
        `Ethical Sentinel (serverless heuristic): score ${ethicalScore}/10 is above the allowed threshold. ` +
        'Shorten or clarify the request, or remove sensitive-sounding terms — or run the full Python verifier where Python is installed.',
      requires_client_ack: false,
      rigor_report_id: null,
      executive_escalated: false,
      rejected_by: ['ethical_ambiguity'],
      sentinel_engine: 'node',
    };
  }

  return {
    ok: true,
    budget_cap_usd: hardCap,
    cost_estimate_usd: costUsd,
    ethical_score: ethicalScore,
    reject_reason: '',
    requires_client_ack: false,
    rigor_report_id: null,
    executive_escalated: false,
    rejected_by: [],
    sentinel_engine: 'node',
  };
}

/**
 * Bypass ethical heuristic; still enforces hard budget cap (dangerous — use only when intended).
 *
 * @param {object} opts
 * @param {number|string} [opts.costUsd]
 * @returns {Record<string, unknown>}
 */
export function verifyRigorBypassEthics(opts) {
  const hardCap = parseFloat(String(cfg('HARD_BUDGET_CAP_USD', '25000'))) || 25000;
  const costUsd = Number(opts.costUsd ?? 0);
  if (costUsd > hardCap) {
    return {
      ok: false,
      budget_cap_usd: hardCap,
      cost_estimate_usd: costUsd,
      ethical_score: null,
      reject_reason: 'High-Cost Alert: cost_estimate exceeded HARD_BUDGET_CAP_USD.',
      requires_client_ack: false,
      rigor_report_id: null,
      executive_escalated: false,
      rejected_by: ['budget_cap'],
      sentinel_engine: 'bypass',
    };
  }
  return {
    ok: true,
    budget_cap_usd: hardCap,
    cost_estimate_usd: costUsd,
    ethical_score: 1,
    reject_reason: '',
    requires_client_ack: false,
    rigor_report_id: null,
    executive_escalated: false,
    rejected_by: [],
    sentinel_engine: 'bypass',
    sentinel_bypassed: true,
  };
}
