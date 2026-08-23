/**
 * #997 — Postgres-backed Prospect Pipeline / Kanban for Operating Workspace.
 *
 * Same `leads` view-model as Prospect Operations, Today / My Work, and shared detail.
 * Stage moves reuse #994 PATCH (`applySharedProspectOperatorPatch`).
 * No schema. No localStorage as source of truth. No external send.
 */

import {
  getAllowedCanonicalStages,
  PROSPECT_CANONICAL_STAGES,
  PROSPECT_STALE_DAYS_DEFAULT,
  sharedProspectDetailPath,
} from '../cmp/_lib/prospect-operations-view-model.js';
import { ACTION_QUEUE_PATH, PROSPECT_PIPELINE_PATH, PROSPECT_WORKBENCH_PATH } from './workspace-context.js';

export const PIPELINE_STAGE_LABELS = Object.freeze({
  new: 'New',
  qualifying: 'Qualifying',
  discovery_booked: 'Discovery booked',
  proposal_ready: 'Proposal ready',
  proposal_sent: 'Proposal sent',
  awaiting_payment: 'Awaiting payment',
  won: 'Won',
  delivery: 'Delivery',
  stalled: 'Stalled',
  lost: 'Lost',
  not_fit: 'Not fit',
});

/**
 * @param {string} stage
 * @returns {string}
 */
export function pipelineStageLabel(stage) {
  const key = String(stage || '').trim();
  return PIPELINE_STAGE_LABELS[key] || key || '—';
}

/**
 * @param {Record<string, unknown>} prospect
 * @param {Date} [now]
 * @returns {number | null}
 */
export function pipelineStageAgeDays(prospect, now = new Date()) {
  const ts =
    prospect?.last_meaningful_activity_at || prospect?.updated_at || prospect?.created_at || null;
  if (ts == null || ts === '') return null;
  const then = new Date(/** @type {string | Date} */ (ts)).getTime();
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (!Number.isFinite(then) || !Number.isFinite(nowMs)) return null;
  return Math.max(0, Math.floor((nowMs - then) / 86400000));
}

/**
 * @param {Record<string, unknown>} prospect
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isPipelineCardStale(prospect, now = new Date()) {
  const signals = Array.isArray(prospect?.exception_signals) ? prospect.exception_signals : [];
  if (signals.includes('stalled_no_activity')) return true;
  const days = pipelineStageAgeDays(prospect, now);
  return days != null && days >= PROSPECT_STALE_DAYS_DEFAULT;
}

/**
 * @param {Record<string, unknown>} prospect
 * @param {Date} [now]
 * @returns {Record<string, unknown>}
 */
export function enrichPipelineCard(prospect, now = new Date()) {
  const row = prospect && typeof prospect === 'object' ? prospect : {};
  const stage = String(row.canonical_stage || 'qualifying');
  const allowed = getAllowedCanonicalStages(stage).filter((item) => item !== stage);
  const id = String(row.id || '').trim();
  return {
    ...row,
    allowed_canonical_stages: allowed,
    stage_age_days: pipelineStageAgeDays(row, now),
    stale: isPipelineCardStale(row, now),
    shared_detail_path: row.shared_detail_path || sharedProspectDetailPath(id),
  };
}

/**
 * @param {unknown} value
 * @param {string} needle
 * @returns {boolean}
 */
function includesFold(value, needle) {
  if (!needle) return true;
  return String(value || '')
    .trim()
    .toLowerCase()
    .includes(needle);
}

/**
 * @param {Array<Record<string, unknown>>} prospects
 * @param {{
 *   owner?: string,
 *   product?: string,
 *   source?: string,
 *   urgency?: string,
 * }} [filters]
 * @returns {Array<Record<string, unknown>>}
 */
export function filterPipelineProspects(prospects, filters = {}) {
  const list = Array.isArray(prospects) ? prospects : [];
  const owner = String(filters.owner || '')
    .trim()
    .toLowerCase();
  const product = String(filters.product || '')
    .trim()
    .toLowerCase();
  const source = String(filters.source || '')
    .trim()
    .toLowerCase();
  const urgency = String(filters.urgency || '')
    .trim()
    .toLowerCase();
  return list.filter((row) => {
    if (owner && String(row.owner || '').trim().toLowerCase() !== owner) return false;
    if (product) {
      const hay = [
        row.product,
        row.product_service_path,
        row.offer_slug,
        row.offer_title,
        row.source,
      ]
        .map((part) => String(part || '').toLowerCase())
        .join(' ');
      if (!hay.includes(product)) return false;
    }
    if (source && !includesFold(row.source, source)) return false;
    if (urgency && String(row.urgency || '').trim().toLowerCase() !== urgency) return false;
    return true;
  });
}

/**
 * @param {Array<Record<string, unknown>>} prospects
 * @returns {Array<{
 *   stage: string,
 *   label: string,
 *   count: number,
 *   prospects: Array<Record<string, unknown>>,
 * }>}
 */
export function groupProspectsByCanonicalStage(prospects) {
  const list = Array.isArray(prospects) ? prospects : [];
  return PROSPECT_CANONICAL_STAGES.map((stage) => {
    const cards = list.filter((row) => String(row.canonical_stage || '') === stage);
    return {
      stage,
      label: pipelineStageLabel(stage),
      count: cards.length,
      prospects: cards,
    };
  });
}

/**
 * Distinct filter values from the unfiltered shared list (so empty filters still show options).
 *
 * @param {Array<Record<string, unknown>>} prospects
 */
export function pipelineFilterOptions(prospects) {
  const list = Array.isArray(prospects) ? prospects : [];
  /** @param {string} key */
  const unique = (key) => {
    const seen = new Set();
    const out = [];
    for (const row of list) {
      const value = String(row[key] || '').trim();
      if (!value) continue;
      const fold = value.toLowerCase();
      if (seen.has(fold)) continue;
      seen.add(fold);
      out.push(value);
    }
    return out.sort((a, b) => a.localeCompare(b));
  };
  return {
    owners: unique('owner'),
    products: unique('product'),
    sources: unique('source'),
    urgencies: unique('urgency'),
  };
}

/**
 * @param {{
 *   prospects: Array<Record<string, unknown>>,
 *   data_source: string,
 *   proof_mode?: boolean,
 *   filters?: {
 *     owner?: string,
 *     product?: string,
 *     source?: string,
 *     urgency?: string,
 *   },
 * }} args
 */
export function buildProspectPipelinePayload(args) {
  const all = Array.isArray(args.prospects) ? args.prospects : [];
  const filters = args.filters && typeof args.filters === 'object' ? args.filters : {};
  const filtered = filterPipelineProspects(all, filters).map((row) => enrichPipelineCard(row));
  return {
    ok: true,
    workspace: 'operating',
    path: PROSPECT_PIPELINE_PATH,
    view: 'pipeline',
    canonical: true,
    data_source: args.data_source,
    proof_mode: args.proof_mode === true,
    count: filtered.length,
    unfiltered_count: all.length,
    prospects: filtered,
    lanes: groupProspectsByCanonicalStage(filtered),
    filter_options: pipelineFilterOptions(all),
    filters: {
      owner: String(filters.owner || '').trim(),
      product: String(filters.product || '').trim(),
      source: String(filters.source || '').trim(),
      urgency: String(filters.urgency || '').trim(),
    },
    persistence: 'postgres_leads_json',
    localStorage_canonical: false,
    legacy_checklist: '/change/revenue',
    shared_detail_prefix: '/app/prospects/',
    temporary_source_surfaces: {
      action_queue: ACTION_QUEUE_PATH,
      workbench: PROSPECT_WORKBENCH_PATH,
      product_workbench: '/admin/lead-rescue',
      kanban: PROSPECT_PIPELINE_PATH,
      prospect_operations: '/app/prospects',
      today: '/app/today',
    },
    external_send: false,
    email_sent: false,
    whatsapp_sent: false,
    sms_sent: false,
    payment_processed: false,
  };
}
