/**
 * AI Lead Rescue assistant — input-side filter.
 *
 * Layer 4 of the six-layer guardrail floor mandated by
 * `docs/strategy/AI_LEAD_RESCUE_CHATBOT_VOICEBOT_OPTIONS_AUDIT_V1.md` § 5 Q14.
 *
 * Purpose: stop the assistant from ever echoing, persisting, or LLM-processing
 * banking-class data the visitor might paste into the chat (intentionally or
 * accidentally — e.g. an MCB account number, an IBAN, a credit card, a CVV).
 *
 * Posture (doctrine-locked):
 * - The /lead-rescue page explicitly says: "Payment is handled after intake review.
 *   You do not enter card or banking details on this page."
 * - The bot inherits the same posture. If banking data is detected:
 *   1. The raw message is REPLACED before it is sent to the LLM (model never sees it).
 *   2. The handler returns a canonical refusal line ('refusal_templates.bankingDataInInput').
 *   3. The handler emits `lr_bot_pii_blocked` (no PII in props) for ops visibility.
 *
 * The regexes are intentionally tight (false positives are preferable to false
 * negatives for banking data). They are deliberately NOT exposed in the system
 * prompt — the model should not know exactly which patterns we filter, to avoid
 * jail-break attempts ("can you echo back this fake card 4111…").
 */

/**
 * Card number — 13–19 digits with optional spaces/dashes every 4. We check the
 * length after stripping separators and apply a light Luhn sanity check to
 * reduce false positives. Test/example numbers (4111…, 4242…) all match.
 */
const CARD_RX = /\b(?:\d[ -]?){13,19}\b/g;

/**
 * IBAN — 2 country letters + 2 check digits + 11–30 alphanumeric (BBAN length
 * varies by country; the standard hard upper bound is 34 total). Mauritius IBANs
 * are 30 characters (`MU17…`). The pattern is case-insensitive.
 */
const IBAN_RX = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/gi;

/**
 * SWIFT / BIC — 8 or 11 characters, letters + digits, no spaces. Tight enough
 * to avoid catching ordinary words. MCB Mauritius is `MCBLMUMU`.
 */
const SWIFT_RX = /\b[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b/g;

/**
 * CVV / CVC / CVN — three or four digits explicitly labelled. We do not flag
 * bare 3-4 digit numbers (too many false positives) — only when the visitor
 * writes "cvv 123" or "cvc: 4242".
 */
const CVV_RX = /\b(?:cvv|cvc|cvn|cid)\s*[:#]?\s*\d{3,4}\b/gi;

/**
 * Light Luhn check — used only as a tiebreaker on numbers that already match
 * CARD_RX. Avoids flagging long random digit strings (e.g. order numbers,
 * timestamps) as card numbers.
 *
 * @param {string} digits
 * @returns {boolean}
 */
function luhnValid(digits) {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/**
 * @typedef {Object} InputFilterResult
 * @property {boolean} blocked — true if any banking-class match was found.
 * @property {Array<'card' | 'iban' | 'swift' | 'cvv'>} matchedClasses — one entry per class hit (order is detection order).
 * @property {string} sanitizedText — the original message with every match replaced by a fixed `[REDACTED]` placeholder. Safe to LOG and SAFE to pass to the LLM if the handler chooses (the v1 handler does NOT — it short-circuits with a refusal instead).
 */

/**
 * Scan a single user message for banking-class data.
 *
 * @param {string} text
 * @returns {InputFilterResult}
 */
export function checkUserInputForBankingData(text) {
  const raw = typeof text === 'string' ? text : '';
  if (!raw) {
    return { blocked: false, matchedClasses: [], sanitizedText: '' };
  }

  /** @type {Array<'card' | 'iban' | 'swift' | 'cvv'>} */
  const matched = [];
  let sanitized = raw;

  let m;

  // CVV first — it has labels, low false-positive cost.
  CVV_RX.lastIndex = 0;
  while ((m = CVV_RX.exec(raw)) !== null) {
    matched.push('cvv');
  }
  if (matched.includes('cvv')) {
    sanitized = sanitized.replace(CVV_RX, '[REDACTED]');
  }

  // Card (with Luhn sanity).
  CARD_RX.lastIndex = 0;
  while ((m = CARD_RX.exec(raw)) !== null) {
    const digits = m[0].replace(/[ -]/g, '');
    if (luhnValid(digits)) {
      matched.push('card');
      break;
    }
  }
  if (matched.includes('card')) {
    sanitized = sanitized.replace(CARD_RX, (hit) => {
      const digits = hit.replace(/[ -]/g, '');
      return luhnValid(digits) ? '[REDACTED]' : hit;
    });
  }

  // IBAN.
  IBAN_RX.lastIndex = 0;
  if (IBAN_RX.test(raw)) {
    matched.push('iban');
    sanitized = sanitized.replace(IBAN_RX, '[REDACTED]');
  }

  // SWIFT/BIC.
  SWIFT_RX.lastIndex = 0;
  if (SWIFT_RX.test(raw)) {
    matched.push('swift');
    sanitized = sanitized.replace(SWIFT_RX, '[REDACTED]');
  }

  return {
    blocked: matched.length > 0,
    matchedClasses: matched,
    sanitizedText: sanitized,
  };
}
