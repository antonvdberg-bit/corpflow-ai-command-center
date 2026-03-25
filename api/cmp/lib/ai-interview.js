import { inferComplexityFromDescription } from './preview-heuristics.js';

/** @typedef {'low' | 'medium' | 'high'} Band */

/**
 * Three clarification prompts per complexity band (deterministic; replace with LLM later).
 * @type {Record<Band, readonly [string, string, string]>}
 */
const QUESTIONS_BY_COMPLEXITY = {
  low: [
    'What is the single most important outcome you need from this change when it ships?',
    'Are there any fixed launch dates or blackout windows we must respect?',
    'Who should approve the final behavior—only you, or another stakeholder too?',
  ],
  medium: [
    'Which pages, flows, or integrations are in scope vs explicitly out of scope?',
    'What environments must this work in on day one (e.g. staging only, production, mobile)?',
    'What does “done” look like for you—acceptance criteria or a short checklist we can follow?',
  ],
  high: [
    'Describe the full user journey and data touched (including third parties, CRM, payments, PHI/PII).',
    'What are the non-negotiable compliance, security, or legal constraints we must design around?',
    'What is your rollback / feature-flag plan if something fails in production?',
  ],
};

/**
 * Build three clarification questions from a free-text user request using inferred complexity.
 *
 * @param {string} userRequest
 * @returns {{ complexity: Band, questions: [string, string, string] }}
 */
export function buildClarificationQuestions(userRequest) {
  const complexity = /** @type {Band} */ (inferComplexityFromDescription(userRequest));
  const triple = QUESTIONS_BY_COMPLEXITY[complexity];
  return {
    complexity,
    questions: [triple[0], triple[1], triple[2]],
  };
}
