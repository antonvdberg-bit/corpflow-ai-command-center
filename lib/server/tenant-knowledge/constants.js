/**
 * Tenant knowledge atoms v1 — categories and tenant constants.
 */

export const LWM_TENANT_ID = 'living-word-mauritius';

/** @type {readonly string[]} */
export const KNOWLEDGE_ATOM_CATEGORIES = Object.freeze([
  'service_times',
  'location',
  'contact',
  'prayer_safeguarding',
  'youth_children',
  'wordgroups',
  'volunteer_serve',
  'business_network',
  'schedule_policy',
  'general_church_info',
]);

/** @type {readonly string[]} */
export const KNOWLEDGE_VISIBILITY_VALUES = Object.freeze(['public', 'unlisted', 'internal']);

/** @type {readonly string[]} */
export const KNOWLEDGE_SENSITIVITY_VALUES = Object.freeze(['public', 'safeguarding', 'internal']);
