/**
 * Chat widget retrieval AI v1 — constants and caps.
 */

export const LWM_TENANT_ID = 'living-word-mauritius';

/** Max characters for a visitor question. */
export const MAX_QUESTION_CHARS = 500;

/** Max characters for an AI answer returned to the visitor. */
export const MAX_ANSWER_CHARS = 600;

/** Default per-session cap when config column is unset. */
export const DEFAULT_SESSION_MESSAGE_CAP = 5;

/** Rough USD estimate per Groq call when token usage is unavailable (sandbox budget tracking). */
export const ESTIMATED_USD_PER_CALL = 0.0005;

/** Modes persisted on usage logs. */
export const AI_USAGE_MODES = Object.freeze({
  GROQ_LLM: 'groq_llm',
  RETRIEVAL_PREVIEW: 'retrieval_preview',
  SAFETY_REFUSAL: 'safety_refusal',
  EMPTY_CONTEXT: 'empty_context',
  PROVIDER_UNAVAILABLE: 'provider_unavailable',
  SESSION_CAP: 'session_cap',
  BUDGET_EXHAUSTED: 'budget_exhausted',
  AI_DISABLED: 'ai_disabled',
});

export const SAFETY_ROUTES = Object.freeze({
  EMERGENCY: 'emergency',
  COUNSELLING: 'counselling',
  YOUTH_CHILD_PII: 'youth_child_pii',
  BUSINESS_ENDORSEMENT: 'business_endorsement',
  MEDICAL_LEGAL_FINANCIAL: 'medical_legal_financial',
  PRIVATE_INTERNAL: 'private_internal',
});

export const CONTACT_FOLLOWUP =
  'For personal follow-up, choose **Contact the church** from the main menu or visit livingwordmauritius.com.';

export const UNKNOWN_ANSWER_FALLBACK =
  'I do not have an approved answer for that in our church records. ' +
  'Please check livingwordmauritius.com or use **Contact the church** in the menu so a team member can help.';
