/**
 * Pre-LLM safety evaluation for chat widget retrieval AI.
 */

import { CONTACT_FOLLOWUP, SAFETY_ROUTES } from './constants.js';

/** @typedef {{ allowed: boolean; route?: string; refusalReason?: string; answer?: string }} SafetyResult */

const EMERGENCY_PATTERNS = [
  /\b(suicid|kill myself|end my life|self[- ]harm|immediate danger|in danger right now)\b/i,
  /\b(emergency services|call 999|call 112|call 114|police now|ambulance now)\b/i,
];

const COUNSELLING_PATTERNS = [
  /\b(depressed|suicidal thoughts|mental health crisis|need a counsellor|need counseling|therapy for)\b/i,
  /\b(abuse at home|being abused|domestic violence)\b/i,
];

const YOUTH_CHILD_PII_PATTERNS = [
  /\b(child'?s name|my son'?s name|my daughter'?s name|student'?s name|school name|date of birth)\b/i,
  /\b(how old is my child|share my child'?s details)\b/i,
];

const BUSINESS_ENDORSEMENT_PATTERNS = [
  /\b(recommend a business|best business|trusted business|verify this business|endorse)\b/i,
  /\b(which business should i|is this business approved|business network member benefits)\b/i,
];

const MEDICAL_LEGAL_FINANCIAL_PATTERNS = [
  /\b(legal advice|sue someone|lawyer|medical diagnosis|prescription|investment advice|tax advice)\b/i,
];

const PRIVATE_INTERNAL_PATTERNS = [
  /\b(staff salary|internal meeting|confidential|pastor'?s phone|leader'?s home address)\b/i,
  /\b(member database|church finances|donation records)\b/i,
];

/**
 * @param {string} question
 * @returns {SafetyResult}
 */
export function evaluateQuestionSafety(question) {
  const q = String(question || '').trim();
  if (!q) {
    return { allowed: false, route: 'empty_question', refusalReason: 'empty_question' };
  }

  if (EMERGENCY_PATTERNS.some((re) => re.test(q))) {
    return {
      allowed: false,
      route: SAFETY_ROUTES.EMERGENCY,
      refusalReason: 'emergency_or_immediate_danger',
      answer:
        'If you or someone you know is in immediate danger, contact your local emergency services right away. ' +
        'Living Word is not a crisis or counselling service. ' +
        CONTACT_FOLLOWUP.replace(/\*\*/g, ''),
    };
  }

  if (COUNSELLING_PATTERNS.some((re) => re.test(q))) {
    return {
      allowed: false,
      route: SAFETY_ROUTES.COUNSELLING,
      refusalReason: 'counselling_or_crisis',
      answer:
        'Living Word is not a counselling or crisis service. If you are in immediate danger, contact emergency services. ' +
        'For pastoral support, use **Prayer request** or **Contact the church** from the menu — a team member can follow up. ' +
        CONTACT_FOLLOWUP.replace(/\*\*/g, ''),
    };
  }

  if (YOUTH_CHILD_PII_PATTERNS.some((re) => re.test(q))) {
    return {
      allowed: false,
      route: SAFETY_ROUTES.YOUTH_CHILD_PII,
      refusalReason: 'youth_child_sensitive_data',
      answer:
        'Please do not share a child\'s name, school, or other sensitive child details in this chat. ' +
        'Use **Youth / Children** or **Contact the church** from the menu — a team member will follow up with a parent or guardian safely.',
    };
  }

  if (BUSINESS_ENDORSEMENT_PATTERNS.some((re) => re.test(q))) {
    return {
      allowed: false,
      route: SAFETY_ROUTES.BUSINESS_ENDORSEMENT,
      refusalReason: 'business_network_neutral_only',
      answer:
        'The Business Network is a community resource. We cannot recommend, verify, endorse, or guarantee any business or membership benefit. ' +
        'For up-to-date information, check the church Business Network site or ask for a team follow-up via **Contact the church**.',
    };
  }

  if (MEDICAL_LEGAL_FINANCIAL_PATTERNS.some((re) => re.test(q))) {
    return {
      allowed: false,
      route: SAFETY_ROUTES.MEDICAL_LEGAL_FINANCIAL,
      refusalReason: 'medical_legal_financial',
      answer:
        'I cannot provide medical, legal, or financial advice. Please speak with a qualified professional. ' +
        CONTACT_FOLLOWUP.replace(/\*\*/g, ''),
    };
  }

  if (PRIVATE_INTERNAL_PATTERNS.some((re) => re.test(q))) {
    return {
      allowed: false,
      route: SAFETY_ROUTES.PRIVATE_INTERNAL,
      refusalReason: 'private_internal_information',
      answer:
        'I do not have access to private or internal church information. ' +
        CONTACT_FOLLOWUP.replace(/\*\*/g, ''),
    };
  }

  return { allowed: true };
}

/**
 * Trim and cap model output; strip markdown-ish emphasis markers for plain chat.
 *
 * @param {string} text
 * @param {number} maxChars
 * @returns {string}
 */
export function sanitiseModelAnswer(text, maxChars) {
  let out = String(text || '')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (out.length > maxChars) out = `${out.slice(0, maxChars - 1)}…`;
  return out;
}
