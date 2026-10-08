import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CIPC_PILOT_STATUS,
  CIPC_PRICING_OUTCOMES,
  calculateMeasuredPilotScenario,
} from '../lib/cipc-desk/pricing-model.js';

const base = {
  mode: 'pilot',
  audience: 'direct_small_business',
  service_id: 'new_company_registration_bundle',
  candidate_net_service_fee_zar: 400,
  human_hourly_rate_zar: 600,
  ai_tool_cost_zar: 10,
  ordinary_human_minutes: 20,
  exception_frequency: 0.1,
  exception_extra_human_minutes: 30,
  payment_charge_zar: 8,
  allocated_overhead_zar: 5,
  contribution_threshold: 0.2,
  stress_ordinary_human_minutes: 35,
  stress_exception_frequency: 0.2,
  stress_exception_extra_human_minutes: 45,
};

describe('measured CIPC pricing pilot', () => {
  it('computes ordinary and separately entered stress scenarios', () => {
    const result = calculateMeasuredPilotScenario(base);
    assert.equal(result.status, CIPC_PILOT_STATUS);
    assert.equal(result.expected_human_minutes, 23);
    assert.equal(result.stress_human_minutes, 44);
    assert.equal(result.expected_variable_cost_zar, 248);
    assert.equal(result.statutory_counted_as_revenue, false);
    assert.equal(result.action, 'RETAIN_CANDIDATE');
  });

  it('distinguishes absent inputs from confirmed zero inputs', () => {
    const missing = calculateMeasuredPilotScenario({ ...base, payment_charge_zar: undefined });
    assert.equal(missing.outcome, CIPC_PRICING_OUTCOMES.MISSING_INPUT);
    const zero = calculateMeasuredPilotScenario({ ...base, payment_charge_zar: 0, ai_tool_cost_zar: 0 });
    assert.equal(zero.ok, true);
    assert.equal(zero.expected_variable_cost_zar, 230);
  });

  it('keeps statutory pass-through out of revenue while including payment charge', () => {
    const result = calculateMeasuredPilotScenario({ ...base, statutory_fee_passthrough_zar: 100 });
    assert.equal(result.statutory_fee_passthrough_zar, 100);
    assert.equal(result.statutory_counted_as_revenue, false);
    assert.equal(result.expected_variable_cost_zar, 248);
  });

  it('requires separate scoped work for complex specialist matters', () => {
    const result = calculateMeasuredPilotScenario({ ...base, service_id: 'complex_specialist' });
    assert.equal(result.outcome, CIPC_PRICING_OUTCOMES.SCOPED_QUOTE_REQUIRED);
    assert.equal(result.fixed_price_eligible, false);
  });

  it('marks a candidate REVISE without silently raising it', () => {
    const result = calculateMeasuredPilotScenario({ ...base, candidate_net_service_fee_zar: 1 });
    assert.equal(result.outcome, CIPC_PRICING_OUTCOMES.REVISE);
    assert.equal(result.candidate_net_service_fee_zar, 1);
    assert.equal(result.action, 'REVISE');
  });

  it('rejects unsafe numeric inputs and protected intent remains absent', () => {
    const result = calculateMeasuredPilotScenario({ ...base, exception_frequency: 2, human_hourly_rate_zar: -1 });
    assert.equal(result.outcome, CIPC_PRICING_OUTCOMES.INVALID_INPUT);
    assert.ok(result.errors.includes('INVALID_INPUT:exception_frequency'));
    assert.ok(result.errors.includes('INVALID_INPUT:human_hourly_rate_zar'));
    assert.equal(result.protected_actions, undefined);
  });
});
