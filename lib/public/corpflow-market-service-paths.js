/**
 * CorpFlowAI market gateway — buyer service paths and qualified-enquiry helpers (#699).
 *
 * Safe, non-final wording. No invented prices, guarantees, or client endorsements.
 * Product funnels (Lead Rescue, Website Rescue) remain linked where they already exist.
 */

/** @typedef {'workflow-administration' | 'client-lead-service' | 'website-digital'} MarketServicePathId */

/**
 * @type {readonly {
 *   id: MarketServicePathId,
 *   title: string,
 *   summary: string,
 *   bullets: string[],
 *   offerSlug: string | null,
 *   productHref: string | null,
 *   productLabel: string | null,
 * }[]}
 */
export const MARKET_SERVICE_PATHS = Object.freeze([
  {
    id: 'workflow-administration',
    title: 'Workflow and administration improvement',
    summary:
      'Streamline repetitive processes, handoffs, approvals and follow-ups so operational work is organised and easier to coordinate.',
    bullets: [
      'Reduce manual coordination across people and tools',
      'Make approvals, documents and follow-ups visible',
      'Keep what already works; improve the weak links first',
    ],
    offerSlug: null,
    productHref: null,
    productLabel: null,
  },
  {
    id: 'client-lead-service',
    title: 'Client, lead and service-delivery systems',
    summary:
      'Improve enquiry intake, qualification, status tracking, follow-up and client review — with controlled client or test surfaces where useful.',
    bullets: [
      'Capture enquiries from the channels you already use',
      'Make ownership and next steps visible to the operator',
      'Suitable starting product: AI Lead Rescue',
    ],
    offerSlug: 'ai-lead-rescue',
    productHref: '/lead-rescue',
    productLabel: 'Open AI Lead Rescue',
  },
  {
    id: 'website-digital',
    title: 'Website and digital operating upgrades',
    summary:
      'Improve an existing business website and connect it to practical enquiry, content and operating workflows.',
    bullets: [
      'Clarify the offer and primary enquiry path',
      'Connect the site to follow-up and review workflows',
      'Suitable starting product: Website Rescue',
    ],
    offerSlug: 'premium-landing-page-rescue',
    productHref: '/offers/premium-landing-page-rescue',
    productLabel: 'Open Website Rescue',
  },
]);

/** @type {readonly { id: string, label: string }[]} */
export const MARKET_URGENCY_OPTIONS = Object.freeze([
  { id: 'asap', label: 'As soon as practical' },
  { id: 'this-month', label: 'Within this month' },
  { id: 'next-quarter', label: 'Next quarter' },
  { id: 'exploring', label: 'Exploring options' },
]);

const PATH_BY_ID = Object.freeze(
  Object.fromEntries(MARKET_SERVICE_PATHS.map((p) => [p.id, p])),
);

const URGENCY_BY_ID = Object.freeze(
  Object.fromEntries(MARKET_URGENCY_OPTIONS.map((u) => [u.id, u])),
);

/**
 * @param {string | null | undefined} id
 * @returns {boolean}
 */
export function isMarketServicePathId(id) {
  return Boolean(PATH_BY_ID[String(id || '').trim()]);
}

/**
 * @param {string | null | undefined} id
 * @returns {typeof MARKET_SERVICE_PATHS[number] | null}
 */
export function getMarketServicePath(id) {
  return PATH_BY_ID[String(id || '').trim()] || null;
}

/**
 * @param {string | null | undefined} id
 * @returns {boolean}
 */
export function isMarketUrgencyId(id) {
  return Boolean(URGENCY_BY_ID[String(id || '').trim()]);
}

/**
 * @param {string | null | undefined} id
 * @returns {string}
 */
export function marketUrgencyLabel(id) {
  return URGENCY_BY_ID[String(id || '').trim()]?.label || String(id || '').trim() || '—';
}

/**
 * @param {string | null | undefined} id
 * @returns {string}
 */
export function marketServicePathLabel(id) {
  return getMarketServicePath(id)?.title || String(id || '').trim() || '—';
}

/**
 * Derive a rapid-delivery offer slug when the buyer chose a mapped service path.
 * Workflow/admin path has no priced sprint slug — leave null.
 *
 * @param {string | null | undefined} servicePathId
 * @param {string | null | undefined} explicitOfferSlug
 * @returns {string}
 */
export function resolveOfferSlugForMarketEnquiry(servicePathId, explicitOfferSlug) {
  const explicit = String(explicitOfferSlug || '').trim();
  if (explicit) return explicit;
  const path = getMarketServicePath(servicePathId);
  return path?.offerSlug ? String(path.offerSlug) : '';
}

/**
 * Recommended operator next action for a market / rapid-delivery enquiry.
 *
 * @param {{
 *   service_path?: string | null,
 *   offer_slug?: string | null,
 *   urgency?: string | null,
 *   operator_status?: string | null,
 * }} input
 * @returns {string}
 */
export function recommendedMarketEnquiryNextAction(input = {}) {
  const status = String(input.operator_status || 'new_intake').trim();
  if (status === 'not_fit') return 'Close politely — not a fit for current CorpFlowAI managed delivery.';
  if (status === 'won') return 'Confirm onboarding checklist and ERPNext commercial record.';
  if (status === 'proposal_sent') return 'Wait for buyer reply; follow up once if no response after agreed interval.';
  if (status === 'quote_ready') return 'Prepare written quote from discovery notes; do not send without Anton approval.';
  if (status === 'discovery_booked' || status === 'qualified') {
    return 'Run discovery call; confirm service path, scope boundaries, and whether a product funnel applies.';
  }
  if (status === 'reviewing') return 'Qualify fit and urgency; book a short discovery conversation.';

  const pathId = String(input.service_path || '').trim();
  if (pathId === 'client-lead-service' || input.offer_slug === 'ai-lead-rescue') {
    return 'Review Lead Rescue fit; reply with copy-ready draft; offer /lead-rescue or discovery if scope is broader.';
  }
  if (pathId === 'website-digital' || input.offer_slug === 'premium-landing-page-rescue') {
    return 'Review Website Rescue fit; share /demo/website-rescue if useful; book discovery before quoting.';
  }
  if (pathId === 'workflow-administration') {
    return 'Clarify the workflow bottleneck; propose a bounded discovery before any build or tool change.';
  }
  if (String(input.urgency || '') === 'asap') {
    return 'Prioritise review within one business day; reply with the copy-ready draft.';
  }
  return 'Review enquiry details; reply with the copy-ready draft; book discovery if fit is clear.';
}

/**
 * Copy-ready first response draft — no live send.
 *
 * @param {{
 *   contactName?: string | null,
 *   businessName?: string | null,
 *   servicePathId?: string | null,
 *   offerTitle?: string | null,
 *   primaryPain?: string | null,
 *   reference?: string | null,
 * }} input
 * @returns {string}
 */
export function buildMarketEnquiryResponseDraft(input = {}) {
  const name = String(input.contactName || '').trim() || 'there';
  const business = String(input.businessName || '').trim() || 'your business';
  const path = getMarketServicePath(input.servicePathId);
  const pathLabel = path?.title || input.offerTitle || 'a practical operating improvement';
  const pain = String(input.primaryPain || '').trim();
  const reference = String(input.reference || '').trim();

  const lines = [
    `Hi ${name},`,
    ``,
    `Thank you for contacting CorpFlowAI about ${business}.`,
    ``,
    `We design and operate practical AI-assisted workflow systems with managed delivery — using your existing processes and appropriate tools where possible, rather than forcing a platform replacement.`,
    ``,
    `You indicated interest in ${pathLabel}.`,
  ];
  if (pain) {
    lines.push(``, `From your note, the priority looks like: ${pain}`);
  }
  lines.push(
    ``,
    `Next step: a short discovery conversation to confirm fit, scope boundaries, and whether a focused product path (such as Lead Rescue or Website Rescue) is the right start.`,
    ``,
    `No payment is taken from the enquiry form. We will confirm scope in writing before any invoice.`,
    ``,
  );
  if (reference) {
    lines.push(`Your enquiry reference: ${reference}`, ``);
  }
  lines.push(`Kind regards,`, `CorpFlowAI`);
  return lines.join('\n');
}
