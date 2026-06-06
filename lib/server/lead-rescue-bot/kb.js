/**
 * AI Lead Rescue assistant — bounded knowledge base.
 *
 * The bot is grounded ONLY on this small, repo-resident KB plus the live
 * landing page copy. It is explicitly NOT grounded on internal CMP docs,
 * ERPNext, factory operations, tenant roster, JOURNAL, `.cursor/rules/`,
 * secrets, or anything outside `docs/marketing/` + the public landing copy.
 *
 * Doctrine source: `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine*.
 *
 * Surface this object as a single block of text appended to the system prompt
 * via `buildSystemPromptWithKb()`. Do NOT pass it as a separate tool-callable
 * KB — that would let the model invent KB queries.
 */

export const LEAD_RESCUE_KB_VERSION = 'v1.0.0-2026-06-05';

/**
 * Verbatim offer block — must match what the live landing page advertises.
 * Source: `components/AiLeadRescueLanding.js` hero + offer + post-intake cards.
 */
export const LEAD_RESCUE_OFFER_BLOCK = `OFFER (verbatim, this is the only offer):
- AI Lead Rescue Setup — USD 150 launch pilot.
- 48-hour setup once payment is confirmed and required info is in.
- Includes: one lead source connected (form, email, WhatsApp, or Google Form), instant owner / operator alert, Google Sheet lead log, simple follow-up status board, daily lead summary, 7 days of pilot monitoring.
- Invoiced after the team reviews the intake. No card or banking details on the page.
- The payment route on the invoice is decided after intake review, not by the visitor on this page.
- Service questions: support@corpflowai.com (acknowledged within two working days).

WHAT WE NEED FROM THE VISITOR (the four intake inputs):
1. The one lead source we should plug in first.
2. The owner or operator destination for alerts (Telegram or email).
3. One named contact on their side for the 48-hour setup window.
4. Approval on the USD 150 invoice we send after we review their intake.

POST-INTAKE STEPS (verbatim from the page):
1. We review the intake within 2 business hours.
2. We email a USD invoice (the agreed payment route is on the invoice).
3. They pay; the 48-hour setup clock starts.
4. Live pilot + 7-day monitoring.`;

/**
 * Allowed claims — these can be repeated, paraphrased, or used in answers.
 * Source: `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *Copy rules* and § *AI Lead Rescue doctrine*.
 */
export const LEAD_RESCUE_ALLOWED_CLAIMS = Object.freeze([
  'Designed to reduce missed enquiries.',
  'Helps make follow-up visible.',
  'Built for faster response.',
  'Simple 48-hour setup.',
  'AI Lead Rescue captures new enquiries, alerts the owner or operator, logs every lead, and surfaces follow-ups daily — without rebuilding your website or forcing a CRM migration.',
  'We do not guarantee new revenue. We help make sure existing enquiries are captured, visible, and followed up.',
  'We review every intake within two business hours.',
  'No card or banking details on this page.',
]);

/**
 * Forbidden claims — these must never appear in bot output. The output filter
 * (`./output-filter.js`) enforces this with regex; the system prompt enumerates
 * them so the model never generates them in the first place.
 */
export const LEAD_RESCUE_FORBIDDEN_CLAIMS = Object.freeze([
  'Guaranteed more sales.',
  'Guaranteed revenue.',
  'You will never miss a lead.',
  'Fully autonomous revenue machine.',
  'Replaces your sales team.',
  '10x your business.',
  'Revolutionary AI.',
  'Game-changing.',
  'AI-powered everything.',
  'Fully autonomous.',
  '24/7 AI support.',
  'AI resolved your ticket.',
  'AI deflection.',
]);

/**
 * Things explicitly out of scope for the pilot — surface in the prompt so the
 * model can recognise and refuse them quickly. Mirrors the *What is not included*
 * section of `components/AiLeadRescueLanding.js`.
 */
export const LEAD_RESCUE_OUT_OF_SCOPE = Object.freeze([
  'Website rebuild.',
  'CRM migration.',
  'Paid ads, SEO, or copywriting work.',
  'Multi-channel outbound campaigns.',
  'Customer support / helpdesk / ticket deflection.',
]);

/**
 * Build the full system prompt: doctrine floor + offer block + allowed/forbidden
 * claims + out-of-scope. Returned as one string suitable for the Responses API
 * `instructions` field (or as a `system`-role message).
 *
 * @param {string} baseSystemPrompt — typically `LEAD_RESCUE_BOT_SYSTEM_PROMPT` from `./system-prompt.js`.
 * @returns {string}
 */
export function buildSystemPromptWithKb(baseSystemPrompt) {
  const allowed = LEAD_RESCUE_ALLOWED_CLAIMS.map((c) => `- ${c}`).join('\n');
  const forbidden = LEAD_RESCUE_FORBIDDEN_CLAIMS.map((c) => `- ${c}`).join('\n');
  const outOfScope = LEAD_RESCUE_OUT_OF_SCOPE.map((c) => `- ${c}`).join('\n');
  return [
    String(baseSystemPrompt || '').trim(),
    '',
    LEAD_RESCUE_OFFER_BLOCK,
    '',
    'ALLOWED CLAIMS (you may repeat, paraphrase, or use these):',
    allowed,
    '',
    'FORBIDDEN CLAIMS (never say or imply any of these):',
    forbidden,
    '',
    'EXPLICITLY OUT OF SCOPE FOR THE PILOT (refuse politely and redirect to the offer):',
    outOfScope,
  ].join('\n');
}
