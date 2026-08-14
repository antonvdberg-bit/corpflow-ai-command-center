/**
 * CorpFlowAI CRM operating baseline — unit tests (#701).
 *
 * Confirms the operator pack maps onto existing leads / maturation
 * structures and does not introduce a second CRM, schema, or send path.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { PROSPECT_CANONICAL_STAGES } from '../lib/cmp/_lib/prospect-operations-view-model.js';
import {
  CRM_BASELINE_CONFIG,
  CRM_BUSINESS_STAGES,
  assertCrmBaselineSafetyFlags,
  getBusinessStageConfig,
  getHandoff,
  getMinimumLeadField,
  getQualificationGuide,
  getReportingMetric,
  listCodeWithoutSchema,
  listConfigurationOnlyOpportunities,
  listMinimumLeadFieldIds,
  listQualificationGuideKeys,
  listReportingMetricIds,
  listSchemaBlockers,
  mapBusinessStageToCanonical,
  mapCanonicalStageToBusiness,
  reportingMetricsForbidFabrication,
  validateBusinessStageCanonicalTargets,
  validateCadenceAlignedWithMaturation,
  validateMinimumRecordNoSchema,
  validateProductGatesExist,
} from '../lib/prospects/crm-operating-baseline.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULE_PATH = path.join(__dirname, '..', 'lib', 'prospects', 'crm-operating-baseline.js');

describe('#701 CRM operating baseline — safety', () => {
  it('declares no schema, no send, protected drafts only', () => {
    const flags = assertCrmBaselineSafetyFlags();
    assert.equal(flags.schema_change, false);
    assert.equal(flags.send, false);
    assert.equal(flags.protected, true);
  });

  it('does not import messaging senders', () => {
    const src = readFileSync(MODULE_PATH, 'utf8');
    assert.equal(src.includes('nodemailer'), false);
    assert.equal(src.includes('whatsapp'), false);
    assert.equal(src.includes('twilio'), false);
    assert.equal(/from ['"].*email/.test(src), false);
  });

  it('lists schema blockers and forbids a second CRM', () => {
    const blockers = listSchemaBlockers().join(' ').toLowerCase();
    assert.match(blockers, /second database|new crm tables/);
    const nonActions = (CRM_BASELINE_CONFIG.explicit_non_actions || []).join(' ').toLowerCase();
    assert.match(nonActions, /no second crm/);
    assert.match(nonActions, /no automated external/);
  });
});

describe('#701 CRM operating baseline — stage map', () => {
  it('covers every business stage requested by the issue', () => {
    const required = [
      'new',
      'contacted',
      'qualified',
      'proposal_prepared',
      'awaiting_decision',
      'won',
      'lost',
      'nurture',
      'closed',
    ];
    for (const stage of required) {
      assert.ok(CRM_BUSINESS_STAGES.includes(stage), `missing business stage ${stage}`);
      const cfg = getBusinessStageConfig(stage);
      assert.ok(cfg, stage);
      assert.ok(Array.isArray(cfg.entry_criteria) && cfg.entry_criteria.length > 0, stage);
      assert.ok(Array.isArray(cfg.exit_criteria) && cfg.exit_criteria.length > 0, stage);
      assert.ok(String(cfg.required_next_action || '').length > 0, stage);
    }
  });

  it('maps every business stage onto existing canonical stages', () => {
    const result = validateBusinessStageCanonicalTargets();
    assert.deepEqual(result, { ok: true });
    for (const canonical of mapBusinessStageToCanonical('contacted')) {
      assert.ok(PROSPECT_CANONICAL_STAGES.includes(canonical));
    }
    assert.deepEqual(mapBusinessStageToCanonical('new'), ['new']);
    assert.deepEqual(mapBusinessStageToCanonical('contacted'), ['qualifying']);
    assert.ok(mapBusinessStageToCanonical('awaiting_decision').includes('proposal_sent'));
  });

  it('reverse-maps canonical qualifying to contacted', () => {
    assert.ok(mapCanonicalStageToBusiness('qualifying').includes('contacted'));
    assert.ok(mapCanonicalStageToBusiness('stalled').includes('nurture'));
  });
});

describe('#701 CRM operating baseline — minimum record', () => {
  it('covers the required field groups without schema', () => {
    const required = [
      'contact_and_business_identity',
      'source',
      'product_service_interest',
      'problem_outcome_sought',
      'urgency_timing',
      'qualification_summary',
      'current_stage',
      'next_action_and_due',
      'owner',
      'notes_history',
      'consent_contact_preference',
      'related_quotation_delivery_refs',
    ];
    const ids = listMinimumLeadFieldIds();
    for (const id of required) {
      assert.ok(ids.includes(id), `missing field ${id}`);
      const field = getMinimumLeadField(id);
      assert.equal(field.schema_required, false, id);
      assert.ok(Array.isArray(field.paths) && field.paths.length > 0, id);
    }
    assert.deepEqual(validateMinimumRecordNoSchema(), { ok: true });
  });
});

describe('#701 CRM operating baseline — qualification and cadence', () => {
  it('includes Lead Rescue, Website Rescue, managed workflow, and future-product guides', () => {
    const keys = listQualificationGuideKeys();
    for (const key of ['ai_lead_rescue', 'website_rescue', 'managed_workflow', 'future_product']) {
      assert.ok(keys.includes(key), key);
      const guide = getQualificationGuide(key);
      assert.ok(Array.isArray(guide.qualifying_questions) && guide.qualifying_questions.length >= 3, key);
      assert.ok(Array.isArray(guide.disqualifiers) && guide.disqualifiers.length >= 2, key);
      assert.ok(Array.isArray(guide.required_evidence) && guide.required_evidence.length >= 2, key);
      assert.ok(String(guide.recommended_next_action || '').length > 0, key);
    }
  });

  it('points Lead Rescue and Website Rescue at existing maturation gates', () => {
    assert.deepEqual(validateProductGatesExist(), { ok: true });
  });

  it('reuses the maturation follow-up cadence (no parallel SLA clock)', () => {
    assert.deepEqual(validateCadenceAlignedWithMaturation(), { ok: true });
    const rule = CRM_BASELINE_CONFIG.owner_next_action_rule;
    assert.deepEqual(rule.active_stages_require, ['owner', 'next_action', 'next_action_due']);
    assert.equal(rule.first_response_sla_hours, 24);
  });
});

describe('#701 CRM operating baseline — handoffs and reporting', () => {
  it('hands proposal/close to #551 and won-client to #550/#654', () => {
    const quote = getHandoff('qualification_to_quotation');
    assert.ok(Array.isArray(quote.issue_refs) && quote.issue_refs.includes('#551'));
    const delivery = getHandoff('accepted_quotation_to_delivery');
    assert.ok(delivery.issue_refs.includes('#550'));
    assert.ok(delivery.issue_refs.includes('#654'));
  });

  it('defines reporting metrics without fabricated values', () => {
    const required = [
      'new_enquiries',
      'qualified_opportunities',
      'quotations_issued',
      'wins',
      'losses',
      'value_by_stage',
      'overdue_next_actions',
      'source_product_conversion',
    ];
    for (const id of required) {
      assert.ok(listReportingMetricIds().includes(id), id);
      assert.equal(getReportingMetric(id).fabricate, false, id);
      assert.ok(String(getReportingMetric(id).source || '').length > 0, id);
    }
    assert.equal(reportingMetricsForbidFabrication(), true);
  });

  it('records configuration-only opportunities and true schema blockers', () => {
    assert.ok(listConfigurationOnlyOpportunities().length >= 3);
    assert.ok(listCodeWithoutSchema().some((row) => /localStorage/i.test(row)));
    assert.ok(listSchemaBlockers().length >= 3);
  });
});
