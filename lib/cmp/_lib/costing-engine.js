/**
 * CorpFlow CMP costing: complexity + risk + tier → full market value (USD).
 * Audit / Vanguard must always store full_market_value_usd.
 *
 * Client-facing CorpFlow price = full_market × CORPFLOW_CLIENT_BUILD_PRICE_RATIO (default 0.1),
 * then optional demo discount on that line. Debit / wallet should use displayed_client_usd.
 */

import { cfg } from '../../server/runtime-config.js';

/** @typedef {'low' | 'medium' | 'high'} Band */

/** @typedef {'standard' | 'premium' | 'enterprise' | 'internal'} Tier */

const DEMO_DISCOUNT_RATE = 0.2;

/** Base USD before multipliers (complexity reflects scoped effort). */
const COMPLEXITY_BASE_USD = {
  low: 750,
  medium: 3500,
  high: 12000,
};

/** Multiplier on base (risk of rollback, security, or production blast radius). */
const RISK_MULTIPLIER = {
  low: 1,
  medium: 1.25,
  high: 1.6,
};

/** Contract / SLA band (internal uses same curve as standard for base math). */
const TIER_MULTIPLIER = {
  standard: 1,
  premium: 1.15,
  enterprise: 1.35,
  internal: 1,
};

const VALID_COMPLEXITY = /** @type {const} */ (['low', 'medium', 'high']);
const VALID_RISK = /** @type {const} */ (['low', 'medium', 'high']);
const VALID_TIER = /** @type {const} */ (['standard', 'premium', 'enterprise', 'internal']);

/**
 * @param {unknown} value
 * @param {readonly string[]} allowed
 * @param {string} label
 * @returns {string}
 */
function assertEnum(value, allowed, label) {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw new Error(`${label} must be one of: ${allowed.join(', ')}`);
  }
  return value;
}

/**
 * Round to cents for currency display and audit consistency.
 * @param {number} n
 */
function roundUsd(n) {
  return Math.round(n * 100) / 100;
}

/**
 * @typedef {Object} CostingInput
 * @property {Band} complexity
 * @property {Band} risk
 * @property {Tier} [tier] - default 'standard'
 * @property {boolean} [is_demo] - default false
 */

/**
 * @typedef {Object} CostingResult
 * @property {number} full_market_value_usd - Always 100% market value (audit truth).
 * @property {number} displayed_client_usd - Amount to show in product UI.
 * @property {boolean} is_demo
 * @property {number} demo_discount_rate - 0 if not demo, else DEMO_DISCOUNT_RATE.
 * @property {object} breakdown
 */

/**
 * Ratio of benchmark → CorpFlow client price (what they pay us). Clamped to [0.01, 1].
 *
 * @returns {number}
 */
function clientBuildPriceRatio() {
  const raw = Number(cfg('CORPFLOW_CLIENT_BUILD_PRICE_RATIO', '0.1'));
  if (!Number.isFinite(raw)) return 0.1;
  return Math.min(1, Math.max(0.01, raw));
}

/**
 * Compute market value and client-facing display amount.
 *
 * Formula:
 *   full_market_value_usd = round( base(complexity) × mult(risk) × mult(tier) )
 *   corpflow_line_usd = round( full × CORPFLOW_CLIENT_BUILD_PRICE_RATIO )  // default 10%
 * If is_demo:
 *   displayed_client_usd = round( corpflow_line_usd × (1 - DEMO_DISCOUNT_RATE) )
 * Else:
 *   displayed_client_usd = corpflow_line_usd
 *
 * @param {CostingInput} input
 * @returns {CostingResult}
 */
export function computeMarketValueCost(input) {
  const complexity = /** @type {Band} */ (assertEnum(input.complexity, VALID_COMPLEXITY, 'complexity'));
  const risk = /** @type {Band} */ (assertEnum(input.risk, VALID_RISK, 'risk'));
  const tier = /** @type {Tier} */ (
    input.tier === undefined ? 'standard' : assertEnum(input.tier, VALID_TIER, 'tier')
  );
  const is_demo = Boolean(input.is_demo);

  const baseUsd = COMPLEXITY_BASE_USD[complexity];
  const riskMult = RISK_MULTIPLIER[risk];
  const tierMult = TIER_MULTIPLIER[tier];

  const full_market_value_usd = roundUsd(baseUsd * riskMult * tierMult);
  const ratio = clientBuildPriceRatio();
  const corpflow_line_usd = roundUsd(full_market_value_usd * ratio);

  const demo_discount_rate = is_demo ? DEMO_DISCOUNT_RATE : 0;
  const displayed_client_usd = is_demo
    ? roundUsd(corpflow_line_usd * (1 - DEMO_DISCOUNT_RATE))
    : corpflow_line_usd;

  return {
    full_market_value_usd,
    displayed_client_usd,
    is_demo,
    demo_discount_rate,
    breakdown: {
      complexity,
      risk,
      tier,
      base_usd: baseUsd,
      risk_multiplier: riskMult,
      tier_multiplier: tierMult,
      client_build_price_ratio: ratio,
      corpflow_line_before_demo_usd: corpflow_line_usd,
      formula: 'full_market_value_usd = round(base_usd * risk_multiplier * tier_multiplier)',
      corpflow_price_rule: `displayed_client_usd = round(full_market × ${ratio})` + (is_demo ? ` × ${1 - DEMO_DISCOUNT_RATE} (demo)` : ''),
    },
  };
}

export { DEMO_DISCOUNT_RATE, COMPLEXITY_BASE_USD, RISK_MULTIPLIER, TIER_MULTIPLIER };
