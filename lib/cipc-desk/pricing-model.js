/**
 * CIPC Desk INTERNAL pricing decision model — #989.
 *
 * Pure helpers over `config/cipc-pricing-model.v1.json`. No Prisma schema,
 * no send, no payment, no quotation runtime, no CIPC submit. Statutory CIPC
 * fees are pass-through and must never be counted as CorpFlowAI revenue.
 *
 * Cost/time numbers in the default config are synthetic TBC unless a later
 * durable approval records otherwise. Missing required numerics fail closed.
 *
 * @see docs/operations/CIPC_PRICING_MODEL_V1.md
 * @see config/cipc-pricing-model.v1.json
 */

export const CIPC_PRICING_MODEL_VERSION = 'cipc-pricing-model-v1';
export const CIPC_PRICING_TENANT_ID = 'cipc-desk';
export const CIPC_PRICING_INTERNAL_BANNER =
  'INTERNAL MODEL — NOT APPROVED FOR PUBLICATION OR CLIENT QUOTATION';

export const CIPC_PRICING_SERVICE_IDS = Object.freeze([
  'annual_returns',
  'beneficial_ownership',
  'director_changes',
  'address_fye_amendment',
  'complex_specialist',
]);

export const CIPC_PRICING_ROUTES = Object.freeze(['direct_sme', 'partner_payg', 'partner_capacity']);

export const CIPC_PRICING_OUTCOMES = Object.freeze({
  MODELLED: 'MODELLED',
  SCOPED_QUOTE_REQUIRED: 'SCOPED_QUOTE_REQUIRED',
  MISSING_ASSUMPTION: 'MISSING_ASSUMPTION',
  PARTNER_DISCOUNT_BREACHES_FLOOR: 'PARTNER_DISCOUNT_BREACHES_FLOOR',
  PARTNER_CAPACITY_MODELLING_ONLY: 'PARTNER_CAPACITY_MODELLING_ONLY',
  INVALID_INPUT: 'INVALID_INPUT',
});

const FORBIDDEN_GUARANTEE_RE =
  /guaranteed turnaround|cipc turnaround guaranteed|paid rush outcome|we guarantee (?:cipc|filing)|same-day cipc (?:result|outcome)/i;

const PROTECTED_INTENTS = Object.freeze([
  'publish_public_price',
  'client_quotation',
  'send_quote',
  'live_email',
  'whatsapp',
  'sms',
  'payment',
  'cipc_submit',
]);

/**
 * @param {unknown} v
 * @returns {Record<string, unknown>}
 */
function asObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? /** @type {Record<string, unknown>} */ (v) : {};
}

/**
 * @param {unknown} v
 * @returns {string}
 */
function str(v) {
  return v == null ? '' : String(v).trim();
}

/**
 * @param {unknown} n
 * @returns {number}
 */
export function roundZar(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return NaN;
  return Math.round(x * 100) / 100;
}

/**
 * @param {unknown} v
 * @returns {number | null}
 */
function finiteOrNull(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Read a numeric assumption. Null / blank / non-numeric fails closed.
 * A present number with status synthetic_tbc / tbc is usable for modelling
 * but must remain labelled — never treated as Serah-approved.
 *
 * @param {unknown} field
 * @param {string} name
 * @returns {{ ok: true, value: number, status: string } | { ok: false, error: string, status: string }}
 */
export function readNumericAssumption(field, name) {
  const obj = asObj(field);
  const raw = Object.prototype.hasOwnProperty.call(obj, 'value') ? obj.value : field;
  const status = str(obj.status || 'unspecified') || 'unspecified';
  if (raw == null || raw === '' || String(raw).toUpperCase() === 'TBC') {
    return {
      ok: false,
      status,
      error: `MISSING_ASSUMPTION:${name}`,
    };
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    return {
      ok: false,
      status,
      error: `MISSING_ASSUMPTION:${name}`,
    };
  }
  return { ok: true, value: n, status };
}

/**
 * @param {Record<string, unknown>} config
 */
export function assertCipcPricingSafetyFlags(config) {
  const cfg = asObj(config);
  const guard = asObj(cfg.guardrails);
  return {
    schema_change: cfg.$schema_change,
    send: cfg.$send,
    payment: cfg.$payment,
    quotation: cfg.$quotation,
    cipc_submission: cfg.$cipc_submission,
    public_publication: cfg.$public_publication,
    protected: cfg.$protected === true,
    statutory_fee_is_revenue: guard.statutory_fee_is_revenue === true,
    turnaround_guarantee: guard.turnaround_guarantee === true,
    rush_outcome_guarantee: guard.rush_outcome_guarantee === true,
    serah_assumptions_approved: guard.serah_assumptions_approved === true,
    publication_state: str(cfg.publication_state) || 'internal_model_only_not_approved',
    banner: str(cfg.banner) || CIPC_PRICING_INTERNAL_BANNER,
  };
}

/**
 * @param {Record<string, unknown>} config
 */
export function getCipcPricingPurpose(config) {
  const cfg = asObj(config);
  const flags = assertCipcPricingSafetyFlags(cfg);
  return {
    version: str(cfg.version) || CIPC_PRICING_MODEL_VERSION,
    issue: cfg.$issue,
    tenant_id: str(cfg.tenant_id) || CIPC_PRICING_TENANT_ID,
    environment: cfg.environment,
    publication_state: flags.publication_state,
    banner: flags.banner,
    schema_change: cfg.$schema_change,
    send: cfg.$send,
    payment: cfg.$payment,
    quotation: cfg.$quotation,
    public_publication: cfg.$public_publication,
    cost_assumption_status: cfg.cost_assumption_status,
    reuse: cfg.$reuse,
    operator_surface: '/change',
  };
}

/**
 * @param {Record<string, unknown>} config
 * @returns {string[]}
 */
export function listCipcPricingServiceIds(config) {
  const services = asObj(asObj(config).services);
  return CIPC_PRICING_SERVICE_IDS.filter((id) => asObj(services[id]).service_id === id);
}

/**
 * @param {Record<string, unknown>} config
 * @param {string} serviceId
 */
export function getCipcPricingService(config, serviceId) {
  const row = asObj(asObj(asObj(config).services)[serviceId]);
  if (str(row.service_id) !== serviceId) return null;
  return row;
}

/**
 * Internal delivery cost on the CorpFlowAI service only.
 * Statutory CIPC fees are excluded.
 *
 * cost = operator_minutes/60 * operator_hourly
 *      + specialist_minutes/60 * specialist_hourly
 *      + overhead_allowance
 *      + payment_processing_allowance (0 unless activated)
 *
 * @param {Record<string, unknown>} service
 * @param {Record<string, unknown>} config
 * @param {Record<string, unknown>} [overrides]
 */
export function calculateInternalDeliveryCost(service, config, overrides = {}) {
  const global = asObj(asObj(config).global_cost_assumptions);
  const ov = asObj(overrides);

  const operatorHourly = readNumericAssumption(
    ov.operator_hourly_zar != null ? { value: ov.operator_hourly_zar, status: 'operator_override' } : global.operator_hourly_zar,
    'operator_hourly_zar',
  );
  const specialistHourly = readNumericAssumption(
    ov.specialist_hourly_zar != null
      ? { value: ov.specialist_hourly_zar, status: 'operator_override' }
      : global.specialist_hourly_zar,
    'specialist_hourly_zar',
  );
  const operatorMinutes = readNumericAssumption(
    ov.operator_minutes != null ? { value: ov.operator_minutes, status: 'operator_override' } : service.operator_minutes,
    'operator_minutes',
  );
  const specialistMinutes = readNumericAssumption(
    ov.specialist_minutes != null ? { value: ov.specialist_minutes, status: 'operator_override' } : service.specialist_minutes,
    'specialist_minutes',
  );
  const overheadField =
    ov.overhead_contribution_allowance_zar != null
      ? { value: ov.overhead_contribution_allowance_zar, status: 'operator_override' }
      : service.overhead_contribution_allowance_zar != null
        ? service.overhead_contribution_allowance_zar
        : global.overhead_contribution_allowance_zar;
  const overhead = readNumericAssumption(overheadField, 'overhead_contribution_allowance_zar');

  const missing = [operatorHourly, specialistHourly, operatorMinutes, specialistMinutes, overhead].filter(
    (row) => !row.ok,
  );
  if (missing.length) {
    return {
      ok: false,
      outcome: CIPC_PRICING_OUTCOMES.MISSING_ASSUMPTION,
      errors: missing.map((row) => ('error' in row ? row.error : 'MISSING_ASSUMPTION')),
      invented: false,
    };
  }

  const payCfg = asObj(global.payment_processing_allowance_zar);
  const payActivated = payCfg.activated === true;
  const payValue = payActivated ? finiteOrNull(payCfg.value) : 0;
  if (payActivated && payValue == null) {
    return {
      ok: false,
      outcome: CIPC_PRICING_OUTCOMES.MISSING_ASSUMPTION,
      errors: ['MISSING_ASSUMPTION:payment_processing_allowance_zar'],
      invented: false,
    };
  }

  const operatorCost = (operatorMinutes.value / 60) * operatorHourly.value;
  const specialistCost = (specialistMinutes.value / 60) * specialistHourly.value;
  const internalCost = roundZar(operatorCost + specialistCost + overhead.value + (payValue || 0));

  return {
    ok: true,
    currency: 'ZAR',
    operator_minutes: operatorMinutes.value,
    specialist_minutes: specialistMinutes.value,
    operator_hourly_zar: operatorHourly.value,
    specialist_hourly_zar: specialistHourly.value,
    operator_cost_zar: roundZar(operatorCost),
    specialist_cost_zar: roundZar(specialistCost),
    overhead_contribution_allowance_zar: overhead.value,
    payment_processing_allowance_zar: payValue || 0,
    payment_processing_activated: payActivated,
    internal_cost_zar: internalCost,
    assumption_status: {
      operator_hourly_zar: operatorHourly.status,
      specialist_hourly_zar: specialistHourly.status,
      operator_minutes: operatorMinutes.status,
      specialist_minutes: specialistMinutes.status,
      overhead_contribution_allowance_zar: overhead.status,
    },
    serah_assumptions_approved: false,
  };
}

/**
 * Service-fee floor needed for the target contribution margin.
 * floor = internal_cost / (1 - target_margin_pct)
 * Statutory fees are not in this formula.
 *
 * @param {number} internalCostZar
 * @param {number} targetMarginPct
 */
export function calculateServiceFeeFloor(internalCostZar, targetMarginPct) {
  const cost = Number(internalCostZar);
  const margin = Number(targetMarginPct);
  if (!Number.isFinite(cost) || cost < 0 || !Number.isFinite(margin) || margin <= 0 || margin >= 1) {
    return { ok: false, error: 'MISSING_ASSUMPTION:target_contribution_margin_pct' };
  }
  return {
    ok: true,
    required_service_fee_floor_zar: roundZar(cost / (1 - margin)),
    target_contribution_margin_pct: margin,
  };
}

/**
 * @param {number} proposedFee
 * @param {{ floor?: unknown, target?: unknown, ceiling?: unknown }} band
 */
export function compareDirectFeeToBand(proposedFee, band) {
  const b = asObj(band);
  const floor = finiteOrNull(b.floor);
  const target = finiteOrNull(b.target);
  const ceiling = finiteOrNull(b.ceiling);
  const fee = Number(proposedFee);
  if (!Number.isFinite(fee)) {
    return { ok: false, error: 'INVALID_INPUT:proposed_direct_fee' };
  }
  /** @type {string} */
  let vs_band = 'unknown';
  if (floor != null && fee + 1e-9 < floor) vs_band = 'below_band_floor';
  else if (ceiling != null && fee - 1e-9 > ceiling) vs_band = 'above_band_ceiling';
  else if (floor != null || ceiling != null) vs_band = 'within_band';
  return {
    ok: true,
    proposed_direct_fee_zar: roundZar(fee),
    band_floor_zar: floor,
    band_target_zar: target,
    band_ceiling_zar: ceiling,
    vs_band,
    evidence_backed: b.evidence_backed === true,
    source: str(b.source),
  };
}

/**
 * Partner PAYG candidate from a direct fee and discount. If the discounted
 * fee falls below the contribution-margin floor it is rejected/raised.
 *
 * @param {number} directFeeZar
 * @param {number} discountPct
 * @param {number} requiredFloorZar
 * @param {{ min: number, max: number }} allowedBand
 */
export function derivePartnerPaygCandidate(directFeeZar, discountPct, requiredFloorZar, allowedBand) {
  const direct = Number(directFeeZar);
  const discount = Number(discountPct);
  const floor = Number(requiredFloorZar);
  const min = Number(allowedBand?.min);
  const max = Number(allowedBand?.max);
  if (![direct, discount, floor, min, max].every((n) => Number.isFinite(n))) {
    return { ok: false, error: 'INVALID_INPUT:partner_payg' };
  }
  if (discount < min || discount > max) {
    return {
      ok: false,
      error: 'INVALID_INPUT:partner_discount_pct_out_of_band',
      allowed_min_pct: min,
      allowed_max_pct: max,
    };
  }
  const raw = roundZar(direct * (1 - discount / 100));
  const rangeLow = roundZar(direct * (1 - max / 100));
  const rangeHigh = roundZar(direct * (1 - min / 100));
  const viableLow = roundZar(Math.max(rangeLow, floor));
  const viableHigh = rangeHigh;
  const rangeViable = viableLow - 1e-9 <= viableHigh;
  if (raw + 1e-9 < floor) {
    return {
      ok: true,
      outcome: CIPC_PRICING_OUTCOMES.PARTNER_DISCOUNT_BREACHES_FLOOR,
      viable: false,
      action: 'raised_to_floor',
      partner_discount_pct: discount,
      raw_discounted_fee_zar: raw,
      partner_service_fee_zar: roundZar(floor),
      required_service_fee_floor_zar: roundZar(floor),
      candidate_range_zar: rangeViable ? { min: viableLow, max: viableHigh } : null,
      note: 'Discounted partner fee would fall below the contribution-margin floor, so it is rejected as a discount and raised to the floor. This is still not a client quotation.',
    };
  }
  return {
    ok: true,
    outcome: CIPC_PRICING_OUTCOMES.MODELLED,
    viable: true,
    action: 'discount_applied',
    partner_discount_pct: discount,
    raw_discounted_fee_zar: raw,
    partner_service_fee_zar: raw,
    required_service_fee_floor_zar: roundZar(floor),
    candidate_range_zar: rangeViable ? { min: viableLow, max: viableHigh } : { min: raw, max: raw },
  };
}

/**
 * @param {unknown} text
 */
export function outputContainsTurnaroundGuarantee(text) {
  return FORBIDDEN_GUARANTEE_RE.test(String(text || ''));
}

/**
 * Protected commercial/runtime intents stay blocked.
 *
 * @param {string} intent
 */
export function applyCipcPricingProtectedIntent(intent) {
  const key = str(intent);
  if (!PROTECTED_INTENTS.includes(key)) {
    return { applied: false, unknown: true, intent: key };
  }
  return {
    applied: false,
    protected_gate_encountered: true,
    intent: key,
    exact_protected_action: key,
    reason: 'PROTECTED_ACTION_BLOCKED',
    note: 'The internal pricing model cannot publish, quote, send, take payment, or submit to CIPC.',
  };
}

/**
 * @param {Record<string, unknown>} input
 * @param {Record<string, unknown>} service
 * @param {Record<string, unknown>} config
 */
function scopedQuoteResult(input, service, config, reason) {
  const statutory = resolveStatutoryFee(input, service);
  return {
    ok: true,
    outcome: CIPC_PRICING_OUTCOMES.SCOPED_QUOTE_REQUIRED,
    banner: CIPC_PRICING_INTERNAL_BANNER,
    publication_state: 'internal_model_only_not_approved',
    service_id: str(service.service_id),
    route: str(input.route),
    fixed_price_eligible: false,
    specialist_review_required: true,
    service_fee: null,
    statutory_fee_passthrough: statutory,
    corpflowai_revenue_zar: 0,
    statutory_counted_as_revenue: false,
    turnaround_guarantee: false,
    rush_outcome_guarantee: false,
    warnings: [
      reason,
      asObj(asObj(config).exception_rush_policy).text ||
        'A rush or exception flag never purchases a CIPC outcome or guaranteed turnaround.',
    ],
    protected_actions: {
      publish: false,
      quote: false,
      send: false,
      payment: false,
      cipc_submit: false,
    },
  };
}

/**
 * @param {Record<string, unknown>} input
 * @param {Record<string, unknown>} service
 */
function resolveStatutoryFee(input, service) {
  const fromInput = finiteOrNull(input.statutory_fee_passthrough_zar);
  const fromService = finiteOrNull(asObj(service.statutory_fee_passthrough).value_zar);
  const amount = fromInput != null ? fromInput : fromService;
  return {
    treatment: 'pass_through_not_revenue',
    amount_zar: amount,
    informational_only: true,
    counted_as_corpflowai_revenue: false,
    note: 'Statutory CIPC fees are a pass-through. They are not CorpFlowAI revenue.',
  };
}

/**
 * Evaluate one internal pricing scenario.
 *
 * @param {Record<string, unknown>} input
 * @param {Record<string, unknown>} config
 */
export function evaluateCipcPricingModel(input = {}, config) {
  const cfg = asObj(config);
  const inp = asObj(input);
  const banner = str(cfg.banner) || CIPC_PRICING_INTERNAL_BANNER;
  const serviceId = str(inp.service_id);
  const route = str(inp.route) || 'direct_sme';

  if (!CIPC_PRICING_SERVICE_IDS.includes(serviceId)) {
    return {
      ok: false,
      outcome: CIPC_PRICING_OUTCOMES.INVALID_INPUT,
      errors: ['INVALID_INPUT:service_id'],
      banner,
      service_fee: null,
      statutory_fee_passthrough: {
        treatment: 'pass_through_not_revenue',
        amount_zar: null,
        counted_as_corpflowai_revenue: false,
      },
      corpflowai_revenue_zar: 0,
      statutory_counted_as_revenue: false,
    };
  }
  if (!CIPC_PRICING_ROUTES.includes(route)) {
    return {
      ok: false,
      outcome: CIPC_PRICING_OUTCOMES.INVALID_INPUT,
      errors: ['INVALID_INPUT:route'],
      banner,
      service_fee: null,
      statutory_fee_passthrough: {
        treatment: 'pass_through_not_revenue',
        amount_zar: null,
        counted_as_corpflowai_revenue: false,
      },
      corpflowai_revenue_zar: 0,
      statutory_counted_as_revenue: false,
    };
  }

  const service = getCipcPricingService(cfg, serviceId);
  if (!service) {
    return {
      ok: false,
      outcome: CIPC_PRICING_OUTCOMES.INVALID_INPUT,
      errors: ['INVALID_INPUT:service_missing_from_config'],
      banner,
    };
  }

  const complexity = str(inp.complexity || inp.complexity_flag || 'standard').toLowerCase() || 'standard';
  const complexish = /complex|historical|trust|restoration|deregistration|moi|share.?restructur|specialist/.test(
    complexity,
  );
  const rush = inp.rush === true || inp.exception_rush === true;
  const rushPolicy = asObj(cfg.exception_rush_policy);

  if (service.always_scoped_quote === true || service.fixed_price_eligible === false) {
    return scopedQuoteResult(inp, service, cfg, 'Complex/historical/specialist matter cannot receive a fixed automated price.');
  }
  if (complexish) {
    return scopedQuoteResult(
      inp,
      service,
      cfg,
      serviceId === 'beneficial_ownership'
        ? 'Complex beneficial ownership requires a specialist-reviewed scoped quote.'
        : 'Complexity flag requires a specialist-reviewed scoped quote. No fixed automated price.',
    );
  }
  if (rush && rushPolicy.fixed_price_when_rush === false) {
    return scopedQuoteResult(
      inp,
      service,
      cfg,
      'Rush/exception work is not fixed-price automation and never buys a CIPC turnaround or outcome guarantee.',
    );
  }

  const cost = calculateInternalDeliveryCost(service, cfg, asObj(inp.assumption_overrides));
  if (!cost.ok) {
    return {
      ok: false,
      outcome: CIPC_PRICING_OUTCOMES.MISSING_ASSUMPTION,
      errors: cost.errors,
      invented: false,
      banner,
      service_id: serviceId,
      route,
      service_fee: null,
      statutory_fee_passthrough: resolveStatutoryFee(inp, service),
      corpflowai_revenue_zar: 0,
      statutory_counted_as_revenue: false,
      turnaround_guarantee: false,
      serah_assumptions_approved: false,
    };
  }

  const marginField = readNumericAssumption(
    asObj(cfg.global_cost_assumptions).target_contribution_margin_pct,
    'target_contribution_margin_pct',
  );
  if (!marginField.ok) {
    return {
      ok: false,
      outcome: CIPC_PRICING_OUTCOMES.MISSING_ASSUMPTION,
      errors: [marginField.error],
      invented: false,
      banner,
      service_id: serviceId,
      service_fee: null,
      statutory_fee_passthrough: resolveStatutoryFee(inp, service),
      corpflowai_revenue_zar: 0,
      statutory_counted_as_revenue: false,
    };
  }

  const floor = calculateServiceFeeFloor(cost.internal_cost_zar, marginField.value);
  if (!floor.ok) {
    return {
      ok: false,
      outcome: CIPC_PRICING_OUTCOMES.MISSING_ASSUMPTION,
      errors: [floor.error],
      invented: false,
      banner,
      service_fee: null,
      statutory_fee_passthrough: resolveStatutoryFee(inp, service),
      corpflowai_revenue_zar: 0,
      statutory_counted_as_revenue: false,
    };
  }

  const band = asObj(service.direct_sme_band_zar);
  const proposedDirect =
    finiteOrNull(inp.proposed_direct_fee_zar) != null
      ? Number(inp.proposed_direct_fee_zar)
      : finiteOrNull(band.target);
  if (proposedDirect == null) {
    return {
      ok: false,
      outcome: CIPC_PRICING_OUTCOMES.MISSING_ASSUMPTION,
      errors: ['MISSING_ASSUMPTION:proposed_direct_fee_zar'],
      invented: false,
      banner,
      service_fee: null,
      statutory_fee_passthrough: resolveStatutoryFee(inp, service),
      corpflowai_revenue_zar: 0,
      statutory_counted_as_revenue: false,
    };
  }

  const vsBand = compareDirectFeeToBand(proposedDirect, band);
  const statutory = resolveStatutoryFee(inp, service);
  const contribution = roundZar(proposedDirect - cost.internal_cost_zar);
  const contributionPct = proposedDirect > 0 ? roundZar(contribution / proposedDirect) : 0;
  const belowMarginFloor = proposedDirect + 1e-9 < floor.required_service_fee_floor_zar;

  const discountBand = asObj(asObj(cfg.global_cost_assumptions).partner_discount_band_pct);
  const allowed = { min: Number(discountBand.min), max: Number(discountBand.max) };

  /** @type {Record<string, unknown> | null} */
  let partner = null;
  /** @type {string} */
  let outcome = CIPC_PRICING_OUTCOMES.MODELLED;
  /** @type {number | null} */
  let modelledServiceFee = roundZar(proposedDirect);

  if (route === 'partner_capacity') {
    outcome = CIPC_PRICING_OUTCOMES.PARTNER_CAPACITY_MODELLING_ONLY;
    modelledServiceFee = null;
    partner = {
      modelling_only: true,
      operator_set_retainer: true,
      monthly_retainer_zar: finiteOrNull(inp.partner_capacity_retainer_zar),
      minimum_viable_monthly_partner_value_zar: asObj(
        asObj(cfg.global_cost_assumptions).minimum_viable_monthly_partner_value_zar,
      ).value,
      note: 'Custom monthly retainer remains operator-set until real pilot volume exists. No subscription matrix is published.',
    };
  } else if (route === 'partner_payg') {
    const discount =
      finiteOrNull(inp.partner_discount_pct) != null ? Number(inp.partner_discount_pct) : Number(allowed.min);
    partner = derivePartnerPaygCandidate(
      proposedDirect,
      discount,
      floor.required_service_fee_floor_zar,
      allowed,
    );
    if (partner.ok === false) {
      return {
        ok: false,
        outcome: CIPC_PRICING_OUTCOMES.INVALID_INPUT,
        errors: [partner.error],
        banner,
        service_id: serviceId,
        route,
        service_fee: null,
        statutory_fee_passthrough: statutory,
        corpflowai_revenue_zar: 0,
        statutory_counted_as_revenue: false,
      };
    }
    modelledServiceFee = Number(partner.partner_service_fee_zar);
    if (partner.viable === false) {
      outcome = CIPC_PRICING_OUTCOMES.PARTNER_DISCOUNT_BREACHES_FLOOR;
    }
  }

  const revenue = route === 'partner_capacity' ? 0 : roundZar(modelledServiceFee || 0);
  const modelledContribution = route === 'partner_capacity' ? null : roundZar(revenue - cost.internal_cost_zar);
  const modelledMarginPct =
    route === 'partner_capacity' || !revenue ? null : roundZar(/** @type {number} */ (modelledContribution) / revenue);

  const result = {
    ok: true,
    outcome,
    banner,
    publication_state: str(cfg.publication_state) || 'internal_model_only_not_approved',
    service_id: serviceId,
    service_title: str(service.title),
    route,
    complexity,
    rush: false,
    fixed_price_eligible: service.fixed_price_eligible === true,
    specialist_review_required: service.specialist_review_required === true,
    cost,
    required_service_fee_floor_zar: floor.required_service_fee_floor_zar,
    target_contribution_margin_pct: marginField.value,
    recommended_internal_test_range_zar: {
      floor: finiteOrNull(band.floor),
      target: finiteOrNull(band.target),
      ceiling: finiteOrNull(band.ceiling),
      source: str(band.source),
      evidence_backed: band.evidence_backed === true,
      status: str(band.status),
    },
    proposed_direct_fee_zar: roundZar(proposedDirect),
    proposed_direct_vs_band: vsBand,
    proposed_direct_below_margin_floor: belowMarginFloor,
    proposed_direct_contribution_zar: contribution,
    proposed_direct_contribution_margin_pct: contributionPct,
    service_fee: modelledServiceFee,
    partner,
    statutory_fee_passthrough: statutory,
    customer_total_zar:
      modelledServiceFee != null && statutory.amount_zar != null
        ? roundZar(modelledServiceFee + statutory.amount_zar)
        : null,
    corpflowai_revenue_zar: revenue,
    statutory_counted_as_revenue: false,
    contribution_zar: modelledContribution,
    contribution_margin_pct: modelledMarginPct,
    turnaround_guarantee: false,
    rush_outcome_guarantee: false,
    serah_assumptions_approved: false,
    cost_assumption_status: str(cfg.cost_assumption_status) || 'synthetic_tbc',
    warnings: [
      banner,
      'Values marked synthetic_tbc are modelling placeholders, not Serah-approved cost or time.',
      'Statutory CIPC fees are pass-through and are not CorpFlowAI revenue.',
      String(rushPolicy.text || ''),
    ].filter(Boolean),
    protected_actions: {
      publish: false,
      quote: false,
      send: false,
      payment: false,
      cipc_submit: false,
    },
  };

  if (outputContainsTurnaroundGuarantee(JSON.stringify(result))) {
    return {
      ok: false,
      outcome: CIPC_PRICING_OUTCOMES.INVALID_INPUT,
      errors: ['FORBIDDEN_TURNAROUND_GUARANTEE_TEXT'],
      banner,
      service_fee: null,
      statutory_fee_passthrough: statutory,
      corpflowai_revenue_zar: 0,
      statutory_counted_as_revenue: false,
    };
  }

  return result;
}
