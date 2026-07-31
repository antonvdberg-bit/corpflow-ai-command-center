/**
 * CorpFlowAI market-ready service paths (#699).
 * Safe, non-final buyer routes — not fixed-price SKUs.
 * Persisted on leads.qualificationJson.intake_meta.service_path (no schema change).
 */

/** @typedef {'workflow-administration' | 'client-lead-service-delivery' | 'website-digital-operating'} CorpFlowServicePathId */

/**
 * @type {readonly {
 *   id: CorpFlowServicePathId,
 *   title: string,
 *   summary: string,
 *   bullets: string[],
 * }[]}
 */
export const CORPFLOW_SERVICE_PATHS = Object.freeze([
  {
    id: 'workflow-administration',
    title: 'Workflow and administration improvement',
    summary:
      'Streamline repetitive processes, handoffs, approvals and follow-ups so operational work stays organised without a large software transformation.',
    bullets: [
      'Reduce manual coordination between people, messages and documents',
      'Make approvals and follow-ups visible and owned',
      'Keep useful existing tools where they already fit',
    ],
  },
  {
    id: 'client-lead-service-delivery',
    title: 'Client, lead and service-delivery systems',
    summary:
      'Improve enquiry intake, qualification, status tracking, follow-up and client review with controlled operating surfaces where appropriate.',
    bullets: [
      'Capture enquiries into one operator-visible queue',
      'Track status, timing and next actions clearly',
      'Support controlled client or test surfaces when needed',
    ],
  },
  {
    id: 'website-digital-operating',
    title: 'Website and digital operating upgrades',
    summary:
      'Improve an existing business website and connect it to practical enquiry, content and operating workflows — suitable for opportunities such as supplier or hotel-supplies sites.',
    bullets: [
      'Clarify the offer and primary enquiry path',
      'Connect the site to follow-up and operating workflows',
      'Upgrade digital presence without unnecessary platform replacement',
    ],
  },
]);

/** @type {readonly CorpFlowServicePathId[]} */
export const CORPFLOW_SERVICE_PATH_IDS = Object.freeze(
  CORPFLOW_SERVICE_PATHS.map((p) => p.id),
);

/**
 * @param {string | null | undefined} id
 * @returns {boolean}
 */
export function isCorpFlowServicePathId(id) {
  return CORPFLOW_SERVICE_PATH_IDS.includes(/** @type {any} */ (String(id || '').trim()));
}

/**
 * @param {string | null | undefined} id
 * @returns {(typeof CORPFLOW_SERVICE_PATHS)[number] | null}
 */
export function getCorpFlowServicePath(id) {
  const key = String(id || '').trim();
  return CORPFLOW_SERVICE_PATHS.find((p) => p.id === key) || null;
}

/** Urgency / timing options for market enquiry intake. */
export const CORPFLOW_ENQUIRY_URGENCY_OPTIONS = Object.freeze([
  { value: 'asap', label: 'As soon as practical' },
  { value: 'this_month', label: 'Within this month' },
  { value: 'this_quarter', label: 'This quarter' },
  { value: 'exploring', label: 'Exploring / no fixed date' },
]);

/**
 * @param {string | null | undefined} value
 * @returns {boolean}
 */
export function isCorpFlowEnquiryUrgency(value) {
  return CORPFLOW_ENQUIRY_URGENCY_OPTIONS.some((o) => o.value === String(value || '').trim());
}

/**
 * @param {string | null | undefined} value
 * @returns {string}
 */
export function corpFlowEnquiryUrgencyLabel(value) {
  const v = String(value || '').trim();
  const hit = CORPFLOW_ENQUIRY_URGENCY_OPTIONS.find((o) => o.value === v);
  return hit?.label || (v || '—');
}
