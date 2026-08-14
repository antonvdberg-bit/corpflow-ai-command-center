/**
 * CorpFlowAI business CRM operating baseline — #701.
 *
 * Read-only mapping over existing prospect maturation + leads JSON.
 * No Prisma schema changes. No external send. No second CRM store.
 * No imports of any messaging sender (email, WhatsApp, SMS).
 *
 * @see docs/operations/CRM_OPERATING_BASELINE_V1.md
 * @see config/crm-operating-baseline.v1.json
 */

import { createRequire } from 'node:module';

import { PROSPECT_CANONICAL_STAGES } from '../cmp/_lib/prospect-operations-view-model.js';
import { MATURATION_CONFIG } from './maturation.js';

const _require = createRequire(import.meta.url);

/** @type {import('../../config/crm-operating-baseline.v1.json')} */
const CRM_BASELINE_CONFIG = _require('../../config/crm-operating-baseline.v1.json');

export { CRM_BASELINE_CONFIG };

/**
 * Business-facing CRM stages from issue #701.
 * @type {readonly string[]}
 */
export const CRM_BUSINESS_STAGES = Object.freeze(Object.keys(CRM_BASELINE_CONFIG.business_stages));

/**
 * @returns {Record<string, unknown>}
 */
export function getCrmPurpose() {
  return CRM_BASELINE_CONFIG.purpose;
}

/**
 * @param {string} businessStage
 * @returns {Record<string, unknown> | null}
 */
export function getBusinessStageConfig(businessStage) {
  const key = String(businessStage || '');
  return CRM_BASELINE_CONFIG.business_stages[key] || null;
}

/**
 * Map a #701 business stage onto existing canonical prospect stages.
 *
 * @param {string} businessStage
 * @returns {string[]}
 */
export function mapBusinessStageToCanonical(businessStage) {
  const cfg = getBusinessStageConfig(businessStage);
  if (!cfg || !Array.isArray(cfg.canonical_stages)) return [];
  return cfg.canonical_stages.map((s) => String(s));
}

/**
 * Reverse map: which business labels overlay a canonical stage.
 *
 * @param {string} canonicalStage
 * @returns {string[]}
 */
export function mapCanonicalStageToBusiness(canonicalStage) {
  const wanted = String(canonicalStage || '');
  /** @type {string[]} */
  const out = [];
  for (const [key, cfg] of Object.entries(CRM_BASELINE_CONFIG.business_stages)) {
    const stages = Array.isArray(cfg?.canonical_stages) ? cfg.canonical_stages : [];
    if (stages.includes(wanted)) out.push(key);
  }
  return out;
}

/**
 * @param {string} fieldId
 * @returns {Record<string, unknown> | null}
 */
export function getMinimumLeadField(fieldId) {
  const spec = CRM_BASELINE_CONFIG.minimum_lead_record;
  return spec?.[String(fieldId || '')] || null;
}

/**
 * @returns {string[]}
 */
export function listMinimumLeadFieldIds() {
  return Object.keys(CRM_BASELINE_CONFIG.minimum_lead_record || {});
}

/**
 * @param {string} productKey
 * @returns {Record<string, unknown> | null}
 */
export function getQualificationGuide(productKey) {
  return CRM_BASELINE_CONFIG.qualification_guides?.[String(productKey || '')] || null;
}

/**
 * @returns {string[]}
 */
export function listQualificationGuideKeys() {
  return Object.keys(CRM_BASELINE_CONFIG.qualification_guides || {});
}

/**
 * @param {string} metricId
 * @returns {Record<string, unknown> | null}
 */
export function getReportingMetric(metricId) {
  return CRM_BASELINE_CONFIG.reporting_metrics?.[String(metricId || '')] || null;
}

/**
 * @returns {string[]}
 */
export function listReportingMetricIds() {
  return Object.keys(CRM_BASELINE_CONFIG.reporting_metrics || {});
}

/**
 * @param {string} handoffId
 * @returns {Record<string, unknown> | null}
 */
export function getHandoff(handoffId) {
  return CRM_BASELINE_CONFIG.handoffs?.[String(handoffId || '')] || null;
}

/**
 * True when every reporting metric is explicitly marked as non-fabricated.
 *
 * @returns {boolean}
 */
export function reportingMetricsForbidFabrication() {
  return listReportingMetricIds().every((id) => {
    const metric = getReportingMetric(id);
    return metric && metric.fabricate === false;
  });
}

/**
 * Config flags that must stay false for this baseline.
 *
 * @returns {{ schema_change: false, send: false, protected: true }}
 */
export function assertCrmBaselineSafetyFlags() {
  if (CRM_BASELINE_CONFIG.$schema_change !== false) {
    throw new Error('CRM baseline must set $schema_change=false');
  }
  if (CRM_BASELINE_CONFIG.$send !== false) {
    throw new Error('CRM baseline must set $send=false');
  }
  if (CRM_BASELINE_CONFIG.$protected !== true) {
    throw new Error('CRM baseline must set $protected=true');
  }
  return { schema_change: false, send: false, protected: true };
}

/**
 * Every business stage's canonical targets must exist on the prospect view-model.
 *
 * @returns {{ ok: true } | { ok: false, unknown: string[] }}
 */
export function validateBusinessStageCanonicalTargets() {
  /** @type {string[]} */
  const unknown = [];
  for (const businessStage of CRM_BUSINESS_STAGES) {
    for (const canonical of mapBusinessStageToCanonical(businessStage)) {
      if (!PROSPECT_CANONICAL_STAGES.includes(canonical)) {
        unknown.push(`${businessStage}:${canonical}`);
      }
    }
  }
  if (unknown.length > 0) return { ok: false, unknown };
  return { ok: true };
}

/**
 * Minimum lead fields must declare schema_required=false (JSON/column reuse only).
 *
 * @returns {{ ok: true } | { ok: false, fields: string[] }}
 */
export function validateMinimumRecordNoSchema() {
  const bad = listMinimumLeadFieldIds().filter((id) => {
    const field = getMinimumLeadField(id);
    return !field || field.schema_required !== false;
  });
  if (bad.length > 0) return { ok: false, fields: bad };
  return { ok: true };
}

/**
 * Lead Rescue and Website Rescue guides must point at existing maturation gates.
 *
 * @returns {{ ok: true } | { ok: false, missing: string[] }}
 */
export function validateProductGatesExist() {
  const gates = MATURATION_CONFIG.qualification_gates || {};
  /** @type {string[]} */
  const missing = [];
  for (const key of ['ai_lead_rescue', 'website_rescue']) {
    const guide = getQualificationGuide(key);
    const gateName = guide?.maturation_gate;
    if (!gateName || !gates[String(gateName)]) missing.push(String(gateName || key));
  }
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true };
}

/**
 * Owner / next-action rule must match the maturation nurture config (single cadence).
 *
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function validateCadenceAlignedWithMaturation() {
  const rule = CRM_BASELINE_CONFIG.owner_next_action_rule;
  const nurture = MATURATION_CONFIG.nurture_config;
  if (rule.stale_days_threshold !== nurture.stale_days_threshold) {
    return { ok: false, reason: 'stale_days_threshold mismatch' };
  }
  if (rule.reactivation_window_days !== nurture.reactivation_window_days) {
    return { ok: false, reason: 'reactivation_window_days mismatch' };
  }
  if (rule.max_follow_ups_before_lost !== nurture.max_follow_ups_before_lost) {
    return { ok: false, reason: 'max_follow_ups_before_lost mismatch' };
  }
  const a = JSON.stringify(rule.follow_up_cadence_days);
  const b = JSON.stringify(nurture.follow_up_cadence_days);
  if (a !== b) return { ok: false, reason: 'follow_up_cadence_days mismatch' };
  return { ok: true };
}

export function listConfigurationOnlyOpportunities() {
  return [...(CRM_BASELINE_CONFIG.configuration_only_opportunities || [])];
}

export function listSchemaBlockers() {
  return [...(CRM_BASELINE_CONFIG.schema_blockers || [])];
}

export function listCodeWithoutSchema() {
  return [...(CRM_BASELINE_CONFIG.code_without_schema || [])];
}
