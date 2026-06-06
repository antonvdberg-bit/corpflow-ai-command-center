/**
 * AI Lead Rescue assistant — output-side post-filter.
 *
 * Layer 5 of the six-layer guardrail floor mandated by
 * `docs/strategy/AI_LEAD_RESCUE_CHATBOT_VOICEBOT_OPTIONS_AUDIT_V1.md` § 5 Q14.
 *
 * Purpose: catch the small but non-zero set of model outputs that slipped past
 * the system prompt + temperature + tool whitelist and would violate the
 * BRAND_AND_CONVERSION_DOCTRINE.md no-revenue-guarantee / no-discount /
 * no-banking / no-hype-vocabulary rules.
 *
 * Posture: false positives are preferable to false negatives. On match, the
 * handler:
 *   1. Replaces the entire assistant message with a canonical refusal line.
 *   2. Emits `lr_bot_refusal` with `refusal_class` (no PII in props).
 *   3. Logs the offending output server-side for daily review (week 1 only).
 *
 * The filter is intentionally line-coarse and substring-based. It is NOT a
 * grammar — a determined model could still wordsmith around it. The defence-
 * in-depth model is: system prompt (layer 1) does most of the work, this filter
 * catches the residual.
 */

/**
 * Negation markers — when one of these appears in the same clause as a
 * guarantee-class word, the guarantee filter does NOT fire (the model is
 * correctly disclaiming, not promising).
 *
 * The check is done OUTSIDE the regex pass so the rest of the rules stay
 * simple. See `containsNearbyNegation()`.
 */
const NEGATION_TOKENS_RX =
  /\b(?:no|not|don'?t|do\s+not|won'?t|will\s+not|cannot|can'?t|never|isn'?t|aren'?t)\b/i;

/**
 * @param {string} text
 * @param {number} matchIdx   — index of the guarantee-class word in `text`
 * @returns {boolean}
 */
function containsNearbyNegation(text, matchIdx) {
  const windowStart = Math.max(0, matchIdx - 40);
  const windowEnd = Math.min(text.length, matchIdx + 1);
  const before = text.slice(windowStart, windowEnd);
  return NEGATION_TOKENS_RX.test(before);
}

/**
 * Revenue / volume / conversion guarantee patterns. We look for any pairing of
 * a future-tense promise + a revenue/volume keyword. Matches "you will get more
 * leads", "we guarantee more revenue", "more sales coming", etc.
 *
 * Negation guard: if "not", "don't", "no", "never", etc. appears within 40
 * chars BEFORE the guarantee-class keyword, the pattern is skipped (the model
 * is correctly disclaiming). See `containsNearbyNegation()`.
 */
const GUARANTEE_RX_LIST = [
  /\b(?:guarantee|guaranteed|promise|promised|ensure(?:d)?)\b[^.]{0,80}\b(?:revenue|sales|leads|conversions?|customers?)\b/i,
  /\b(?:you|we)\s+will\b[^.]{0,80}\b(?:get|receive|see|generate|drive)\b[^.]{0,80}\b(?:more|new|extra)\s+(?:revenue|sales|leads|conversions?|customers?)\b/i,
  /\bnever\s+miss\s+(?:a|any)\s+(?:lead|enquiry|inquiry|sale|customer)\b/i,
  /\b(?:double|triple|10x|5x)\b[^.]{0,40}\b(?:revenue|sales|leads|conversions?|business)\b/i,
];

/**
 * Discount / price-change patterns. The pilot is USD 150, period. Any non-USD
 * amount + offer-context, or any percent-off pattern, must be blocked.
 */
const DISCOUNT_RX_LIST = [
  /\b\d{1,3}\s*%\s*(?:off|discount|less|cheaper)\b/i,
  /\b(?:free|complimentary|gratis)\s+(?:setup|pilot|month|trial|first\s+month)\b/i,
  /\b(?:special|limited|exclusive)\s+(?:price|offer|deal)\b/i,
];

/**
 * Banking / payment-route patterns in OUTPUT (cannot ship them as instructions).
 * Note: we do NOT block the literal "USD 150" — that's the offer; we block
 * specific payment instructions like Stripe links, account numbers, IBANs.
 */
const BANKING_OUTPUT_RX_LIST = [
  /\bstripe\.com\/\S+\b/i,
  /\bpaypal\.me\/\S+\b/i,
  /\b(?:account\s+(?:number|no\.?))\s*[:#]?\s*\d{6,}\b/i,
  /\b(?:iban|swift|bic|routing|sort\s+code)\b\s*[:#]?\s*[A-Z0-9 ]{6,}\b/i,
  /\bmcb\s+(?:account|bank)\b/i,
];

/**
 * Hype vocabulary that contradicts the BRAND doctrine *Tone of voice* rule.
 * Tight matches only (whole-word) to avoid catching ordinary uses like
 * "guarantees" inside "no guarantees".
 */
const HYPE_RX_LIST = [
  /\brevolutionary\b/i,
  /\bgame[ -]changing\b/i,
  /\bgame[ -]changer\b/i,
  /\b10x\b(?!\s*(?:cheaper|smaller))/i, // allow "10x cheaper" if it ever shows up; nothing else
  /\bfully\s+autonomous\b/i,
  /\bAI[ -]powered\s+everything\b/i,
  /\breplace(?:s)?\s+your\s+(?:(?:sales|support|customer\s+service|account)\s+)?(?:team|staff|salespeople|workforce|department|people)\b/i,
  /\b(?:24\/7|round[ -]the[ -]clock)\s+AI\s+support\b/i,
  /\bAI\s+(?:resolved|deflected)\b/i,
];

/**
 * Out-of-scope offer patterns — bot must never offer website rebuild, CRM
 * migration, paid ads, SEO, etc. as services. The page lists these as
 * explicit non-goals; the bot must mirror.
 */
const OUT_OF_SCOPE_RX_LIST = [
  /\bwe\s+(?:can|will|do)\s+(?:rebuild|build)\s+your\s+website\b/i,
  /\bwe\s+(?:can|will|do)\s+(?:migrate|move)\s+your\s+CRM\b/i,
  /\bwe\s+(?:can|will|do)\s+(?:run|manage)\s+(?:your\s+)?(?:ads|seo|copywriting)\b/i,
];

/**
 * @typedef {'guarantee' | 'discount' | 'banking' | 'hype' | 'out_of_scope'} OutputRefusalClass
 *
 * @typedef {Object} OutputFilterResult
 * @property {boolean} blocked — true if any pattern matched.
 * @property {OutputRefusalClass | null} refusalClass — first matched class (priority order: guarantee > discount > banking > hype > out_of_scope).
 * @property {string} matchedPattern — the source pattern string (for server-side review only; NEVER send to client).
 */

/**
 * @param {string} assistantText
 * @returns {OutputFilterResult}
 */
export function checkAssistantOutput(assistantText) {
  const text = typeof assistantText === 'string' ? assistantText : '';
  if (!text) return { blocked: false, refusalClass: null, matchedPattern: '' };

  /** @type {Array<{ list: RegExp[], cls: OutputRefusalClass, suppressOnNegation?: boolean }>} */
  const groups = [
    { list: GUARANTEE_RX_LIST, cls: 'guarantee', suppressOnNegation: true },
    { list: DISCOUNT_RX_LIST, cls: 'discount' },
    { list: BANKING_OUTPUT_RX_LIST, cls: 'banking' },
    { list: HYPE_RX_LIST, cls: 'hype' },
    { list: OUT_OF_SCOPE_RX_LIST, cls: 'out_of_scope' },
  ];

  for (const g of groups) {
    for (const rx of g.list) {
      const m = rx.exec(text);
      if (!m) continue;
      if (g.suppressOnNegation && containsNearbyNegation(text, m.index)) continue;
      return { blocked: true, refusalClass: g.cls, matchedPattern: rx.source };
    }
  }

  return { blocked: false, refusalClass: null, matchedPattern: '' };
}

/**
 * Exported for unit tests only. Each entry: { class, samplePattern, expectMatch:boolean, text }.
 * Frozen array — do not mutate.
 */
export const OUTPUT_FILTER_INTERNAL_FOR_TESTS = Object.freeze({
  GUARANTEE_RX_LIST,
  DISCOUNT_RX_LIST,
  BANKING_OUTPUT_RX_LIST,
  HYPE_RX_LIST,
  OUT_OF_SCOPE_RX_LIST,
});
