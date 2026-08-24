/**
 * CIPC internal pricing decision model — #989.
 *
 * Deterministic tests for the INTERNAL-ONLY calculator. No schema. No send.
 * No payment. No public price publication.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
  CIPC_PRICING_INTERNAL_BANNER,
  CIPC_PRICING_MODEL_VERSION,
  CIPC_PRICING_OUTCOMES,
  applyCipcPricingProtectedIntent,
  assertCipcPricingSafetyFlags,
  calculateInternalDeliveryCost,
  calculateServiceFeeFloor,
  compareDirectFeeToBand,
  derivePartnerPaygCandidate,
  evaluateCipcPricingModel,
  getCipcPricingPurpose,
  getCipcPricingService,
  listCipcPricingServiceIds,
  outputContainsTurnaroundGuarantee,
} from '../lib/cipc-desk/pricing-model.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = JSON.parse(readFileSync(join(root, 'config', 'cipc-pricing-model.v1.json'), 'utf8'));
const ENGINE_SRC = readFileSync(join(root, 'lib', 'cipc-desk', 'pricing-model.js'), 'utf8');
const PANEL_SRC = readFileSync(join(root, 'components', 'CipcPricingOperatorPanel.js'), 'utf8');
const CHANGE_SRC = readFileSync(join(root, 'pages', 'change.js'), 'utf8');
const PARTNERS_SRC = readFileSync(join(root, 'components', 'CipcDeskPartnerFunnel.js'), 'utf8');

function cloneConfig() {
  return JSON.parse(JSON.stringify(CONFIG));
}

describe('#989 CIPC internal pricing model — safety', () => {
  it('declares internal-only publication state and forbids send/payment/schema', () => {
    const flags = assertCipcPricingSafetyFlags(CONFIG);
    assert.equal(flags.schema_change, false);
    assert.equal(CONFIG.$schema_change, false);
    assert.equal(flags.send, false);
    assert.equal(flags.payment, false);
    assert.equal(flags.quotation, false);
    assert.equal(flags.cipc_submission, false);
    assert.equal(flags.public_publication, false);
    assert.equal(flags.protected, true);
    assert.equal(flags.statutory_fee_is_revenue, false);
    assert.equal(flags.turnaround_guarantee, false);
    assert.equal(flags.rush_outcome_guarantee, false);
    assert.equal(flags.serah_assumptions_approved, false);
    assert.equal(flags.publication_state, 'internal_model_only_not_approved');
    assert.equal(flags.banner, CIPC_PRICING_INTERNAL_BANNER);
    const purpose = getCipcPricingPurpose(CONFIG);
    assert.equal(purpose.version, CIPC_PRICING_MODEL_VERSION);
    assert.equal(purpose.issue, '#989');
    assert.equal(purpose.tenant_id, 'cipc-desk');
    assert.equal(purpose.operator_surface, '/change');
    assert.equal(purpose.cost_assumption_status, 'synthetic_tbc');
    assert.equal(CONFIG.guardrails.serah_assumptions_approved, false);
    assert.equal(CONFIG.global_cost_assumptions.payment_processing_allowance_zar.activated, false);
    assert.equal(CONFIG.global_cost_assumptions.payment_processing_allowance_zar.value, 0);
    assert.equal(CONFIG.global_cost_assumptions.minimum_viable_monthly_partner_value_zar.value, null);
  });

  it('does not add send, quotation, or payment actions and is not mounted on /partners', () => {
    assert.equal(ENGINE_SRC.includes('nodemailer'), false);
    assert.equal(ENGINE_SRC.includes('twilio'), false);
    assert.equal(PANEL_SRC.includes('nodemailer'), false);
    assert.equal(PANEL_SRC.includes('/api/cmp/router?action='), false);
    assert.match(PANEL_SRC, /does not publish prices, create a client quotation, send a message, or take payment/);
    assert.match(CHANGE_SRC, /CipcPricingOperatorPanel/);
    assert.equal(PARTNERS_SRC.includes('CipcPricingOperatorPanel'), false);
    assert.equal(PARTNERS_SRC.includes(CIPC_PRICING_INTERNAL_BANNER), false);
    for (const intent of ['publish_public_price', 'client_quotation', 'send_quote', 'payment', 'live_email', 'cipc_submit']) {
      const blocked = applyCipcPricingProtectedIntent(intent);
      assert.equal(blocked.applied, false);
      assert.equal(blocked.protected_gate_encountered, true);
    }
  });
});

describe('#989 CIPC internal pricing model — clean-case direct SME', () => {
  it('models Annual Return direct SME against the #989 test band', () => {
    const result = evaluateCipcPricingModel(
      { service_id: 'annual_returns', route: 'direct_sme' },
      CONFIG,
    );
    assert.equal(result.ok, true);
    assert.equal(result.outcome, CIPC_PRICING_OUTCOMES.MODELLED);
    assert.equal(result.banner, CIPC_PRICING_INTERNAL_BANNER);
    assert.equal(result.service_id, 'annual_returns');
    assert.equal(result.fixed_price_eligible, true);
    assert.equal(result.cost.ok, true);
    assert.equal(result.proposed_direct_fee_zar, 500);
    assert.equal(result.recommended_internal_test_range_zar.floor, 350);
    assert.equal(result.recommended_internal_test_range_zar.ceiling, 650);
    assert.equal(result.recommended_internal_test_range_zar.evidence_backed, true);
    assert.equal(result.proposed_direct_vs_band.vs_band, 'within_band');
    assert.equal(result.service_fee, 500);
    assert.equal(result.statutory_counted_as_revenue, false);
    assert.equal(result.corpflowai_revenue_zar, 500);
    assert.equal(result.turnaround_guarantee, false);
    assert.ok(result.cost.internal_cost_zar > 0);
    assert.ok(result.required_service_fee_floor_zar > result.cost.internal_cost_zar);
    assert.equal(result.proposed_direct_below_margin_floor, false);
    assert.match(JSON.stringify(result.cost.assumption_status), /synthetic_tbc/);
  });

  it('models Beneficial Ownership direct SME against the #989 test band', () => {
    const result = evaluateCipcPricingModel(
      { service_id: 'beneficial_ownership', route: 'direct_sme' },
      CONFIG,
    );
    assert.equal(result.ok, true);
    assert.equal(result.outcome, CIPC_PRICING_OUTCOMES.MODELLED);
    assert.equal(result.proposed_direct_fee_zar, 650);
    assert.equal(result.recommended_internal_test_range_zar.floor, 450);
    assert.equal(result.recommended_internal_test_range_zar.ceiling, 850);
    assert.equal(result.service_fee, 650);
    assert.equal(result.corpflowai_revenue_zar, 650);
    assert.equal(result.statutory_counted_as_revenue, false);
  });

  it('models Director change direct SME against the #989 test band', () => {
    const result = evaluateCipcPricingModel(
      { service_id: 'director_changes', route: 'direct_sme' },
      CONFIG,
    );
    assert.equal(result.ok, true);
    assert.equal(result.outcome, CIPC_PRICING_OUTCOMES.MODELLED);
    assert.equal(result.proposed_direct_fee_zar, 600);
    assert.equal(result.recommended_internal_test_range_zar.floor, 450);
    assert.equal(result.recommended_internal_test_range_zar.ceiling, 750);
    assert.equal(result.service_fee, 600);
    assert.equal(result.fixed_price_eligible, true);
  });
});

describe('#989 CIPC internal pricing model — partner PAYG floors', () => {
  it('keeps a 20% partner PAYG discount above the required margin floor', () => {
    const result = evaluateCipcPricingModel(
      { service_id: 'annual_returns', route: 'partner_payg', partner_discount_pct: 20 },
      CONFIG,
    );
    assert.equal(result.ok, true);
    assert.equal(result.outcome, CIPC_PRICING_OUTCOMES.MODELLED);
    assert.equal(result.partner.viable, true);
    assert.equal(result.partner.action, 'discount_applied');
    assert.equal(result.partner.raw_discounted_fee_zar, 400);
    assert.equal(result.service_fee, 400);
    assert.ok(result.service_fee + 1e-9 >= result.required_service_fee_floor_zar);
    assert.equal(result.statutory_counted_as_revenue, false);
    assert.equal(result.corpflowai_revenue_zar, 400);
  });

  it('rejects/raises a 35% partner PAYG discount when it breaches the margin floor', () => {
    const result = evaluateCipcPricingModel(
      { service_id: 'annual_returns', route: 'partner_payg', partner_discount_pct: 35 },
      CONFIG,
    );
    assert.equal(result.ok, true);
    assert.equal(result.outcome, CIPC_PRICING_OUTCOMES.PARTNER_DISCOUNT_BREACHES_FLOOR);
    assert.equal(result.partner.viable, false);
    assert.equal(result.partner.action, 'raised_to_floor');
    assert.equal(result.partner.raw_discounted_fee_zar, 325);
    assert.ok(result.partner.raw_discounted_fee_zar + 1e-9 < result.required_service_fee_floor_zar);
    assert.equal(result.service_fee, result.required_service_fee_floor_zar);
    assert.equal(result.partner.partner_service_fee_zar, result.required_service_fee_floor_zar);
  });
});

describe('#989 CIPC internal pricing model — statutory fees and fail-closed', () => {
  it('never counts a statutory CIPC fee as CorpFlowAI revenue', () => {
    const result = evaluateCipcPricingModel(
      {
        service_id: 'annual_returns',
        route: 'direct_sme',
        statutory_fee_passthrough_zar: 100,
      },
      CONFIG,
    );
    assert.equal(result.ok, true);
    assert.equal(result.service_fee, 500);
    assert.equal(result.statutory_fee_passthrough.amount_zar, 100);
    assert.equal(result.statutory_fee_passthrough.counted_as_corpflowai_revenue, false);
    assert.equal(result.statutory_counted_as_revenue, false);
    assert.equal(result.corpflowai_revenue_zar, 500);
    assert.equal(result.customer_total_zar, 600);
    assert.notEqual(result.corpflowai_revenue_zar, 600);
    const cost = calculateInternalDeliveryCost(getCipcPricingService(CONFIG, 'annual_returns'), CONFIG);
    assert.equal(cost.ok, true);
    assert.equal(cost.internal_cost_zar + 100 === result.corpflowai_revenue_zar, false);
  });

  it('fails closed when specialist cost or time is missing rather than inventing a figure', () => {
    const missingRate = cloneConfig();
    missingRate.global_cost_assumptions.specialist_hourly_zar.value = null;
    const rateResult = evaluateCipcPricingModel(
      { service_id: 'annual_returns', route: 'direct_sme' },
      missingRate,
    );
    assert.equal(rateResult.ok, false);
    assert.equal(rateResult.outcome, CIPC_PRICING_OUTCOMES.MISSING_ASSUMPTION);
    assert.equal(rateResult.invented, false);
    assert.ok(rateResult.errors.includes('MISSING_ASSUMPTION:specialist_hourly_zar'));
    assert.equal(rateResult.service_fee, null);
    assert.equal(rateResult.corpflowai_revenue_zar, 0);

    const missingMinutes = cloneConfig();
    missingMinutes.services.annual_returns.specialist_minutes = { value: 'TBC', status: 'tbc' };
    const minutesResult = evaluateCipcPricingModel(
      { service_id: 'annual_returns', route: 'direct_sme' },
      missingMinutes,
    );
    assert.equal(minutesResult.ok, false);
    assert.equal(minutesResult.outcome, CIPC_PRICING_OUTCOMES.MISSING_ASSUMPTION);
    assert.equal(minutesResult.invented, false);
    assert.ok(minutesResult.errors.includes('MISSING_ASSUMPTION:specialist_minutes'));
  });
});

describe('#989 CIPC internal pricing model — scoped quote and guarantees', () => {
  it('returns SCOPED_QUOTE_REQUIRED for complex beneficial ownership', () => {
    const result = evaluateCipcPricingModel(
      { service_id: 'beneficial_ownership', route: 'direct_sme', complexity: 'complex' },
      CONFIG,
    );
    assert.equal(result.ok, true);
    assert.equal(result.outcome, CIPC_PRICING_OUTCOMES.SCOPED_QUOTE_REQUIRED);
    assert.equal(result.service_fee, null);
    assert.equal(result.fixed_price_eligible, false);
    assert.equal(result.specialist_review_required, true);
    assert.equal(result.corpflowai_revenue_zar, 0);
    assert.match(JSON.stringify(result.warnings), /Complex beneficial ownership/i);
  });

  it('cannot assign a fixed automated price to a complex/historical specialist matter', () => {
    const result = evaluateCipcPricingModel(
      { service_id: 'complex_specialist', route: 'direct_sme' },
      CONFIG,
    );
    assert.equal(result.ok, true);
    assert.equal(result.outcome, CIPC_PRICING_OUTCOMES.SCOPED_QUOTE_REQUIRED);
    assert.equal(result.service_fee, null);
    assert.equal(result.fixed_price_eligible, false);
    assert.equal(getCipcPricingService(CONFIG, 'complex_specialist').always_scoped_quote, true);
    assert.deepEqual(listCipcPricingServiceIds(CONFIG), [
      'annual_returns',
      'beneficial_ownership',
      'director_changes',
      'address_fye_amendment',
      'complex_specialist',
    ]);
  });

  it('never emits turnaround-guarantee text and treats rush as scoped, not a paid CIPC outcome', () => {
    const modelled = evaluateCipcPricingModel(
      { service_id: 'director_changes', route: 'direct_sme' },
      CONFIG,
    );
    const rush = evaluateCipcPricingModel(
      { service_id: 'director_changes', route: 'direct_sme', rush: true },
      CONFIG,
    );
    assert.equal(outputContainsTurnaroundGuarantee(JSON.stringify(modelled)), false);
    assert.equal(outputContainsTurnaroundGuarantee(JSON.stringify(rush)), false);
    assert.equal(outputContainsTurnaroundGuarantee(JSON.stringify(CONFIG)), false);
    assert.equal(rush.outcome, CIPC_PRICING_OUTCOMES.SCOPED_QUOTE_REQUIRED);
    assert.equal(rush.turnaround_guarantee, false);
    assert.equal(rush.rush_outcome_guarantee, false);
    assert.match(JSON.stringify(rush.warnings), /never purchases a CIPC outcome/i);
    assert.equal(CONFIG.exception_rush_policy.cipc_turnaround_promise, false);
    assert.equal(CONFIG.exception_rush_policy.rush_outcome_guarantee, false);
  });

  it('keeps partner capacity as operator-set modelling only', () => {
    const result = evaluateCipcPricingModel(
      { service_id: 'annual_returns', route: 'partner_capacity' },
      CONFIG,
    );
    assert.equal(result.outcome, CIPC_PRICING_OUTCOMES.PARTNER_CAPACITY_MODELLING_ONLY);
    assert.equal(result.service_fee, null);
    assert.equal(result.partner.operator_set_retainer, true);
    assert.equal(result.partner.monthly_retainer_zar, null);
    assert.equal(result.corpflowai_revenue_zar, 0);
  });
});

describe('#989 CIPC internal pricing model — formula helpers', () => {
  it('computes cost and margin floor without treating statutory fees as revenue', () => {
    const service = getCipcPricingService(CONFIG, 'annual_returns');
    const cost = calculateInternalDeliveryCost(service, CONFIG);
    const floor = calculateServiceFeeFloor(cost.internal_cost_zar, 0.45);
    const vsBand = compareDirectFeeToBand(500, service.direct_sme_band_zar);
    const partnerOk = derivePartnerPaygCandidate(500, 20, floor.required_service_fee_floor_zar, {
      min: 20,
      max: 35,
    });
    const partnerBreach = derivePartnerPaygCandidate(500, 35, floor.required_service_fee_floor_zar, {
      min: 20,
      max: 35,
    });
    assert.equal(cost.ok, true);
    assert.equal(cost.payment_processing_activated, false);
    assert.equal(floor.ok, true);
    assert.equal(vsBand.vs_band, 'within_band');
    assert.equal(partnerOk.viable, true);
    assert.equal(partnerBreach.viable, false);
    assert.equal(partnerBreach.outcome, CIPC_PRICING_OUTCOMES.PARTNER_DISCOUNT_BREACHES_FLOOR);
  });
});
