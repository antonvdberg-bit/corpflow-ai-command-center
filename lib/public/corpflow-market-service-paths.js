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
      'Suitable starting product: Enquiry Recovery Sprint',
    ],
    offerSlug: 'ai-lead-rescue',
    productHref: '/enquiry-recovery',
    productLabel: 'Open Enquiry Recovery',
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
    productHref: '/website-rescue',
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

/**
 * Buyer-facing discovery routing options (#712 conversion fix).
 * One plain-language question maps to internal service_path + offer_slug.
 * Prospects never see CorpFlowAI taxonomy labels on the general form.
 *
 * @type {readonly {
 *   id: string,
 *   label: string,
 *   service_path: MarketServicePathId,
 *   offer_slug: string | null,
 *   service_interest: string | null,
 * }[]}
 */
export const MARKET_BUYER_NEED_OPTIONS = Object.freeze([
  {
    id: 'losing-enquiries',
    label: 'I am losing or mishandling enquiries',
    service_path: 'client-lead-service',
    offer_slug: 'ai-lead-rescue',
    service_interest: 'lead_rescue',
  },
  {
    id: 'website-improvement',
    label: 'My website needs improvement or replacement',
    service_path: 'website-digital',
    offer_slug: 'premium-landing-page-rescue',
    service_interest: 'website_rescue',
  },
  {
    id: 'admin-workflow',
    label: 'I need help reducing repetitive admin or workflow problems',
    service_path: 'workflow-administration',
    offer_slug: null,
    service_interest: 'workflow_admin_improvement',
  },
  {
    id: 'ai-receptionist',
    label: 'I am interested in an AI receptionist/chatbot',
    service_path: 'client-lead-service',
    offer_slug: null,
    service_interest: 'ai_receptionist_chatbot',
  },
  {
    id: 'unsure',
    label: 'I am not sure — help me work it out',
    service_path: 'workflow-administration',
    offer_slug: null,
    service_interest: 'other_unsure',
  },
]);

const PATH_BY_ID = Object.freeze(
  Object.fromEntries(MARKET_SERVICE_PATHS.map((p) => [p.id, p])),
);

const URGENCY_BY_ID = Object.freeze(
  Object.fromEntries(MARKET_URGENCY_OPTIONS.map((u) => [u.id, u])),
);

const BUYER_NEED_BY_ID = Object.freeze(
  Object.fromEntries(MARKET_BUYER_NEED_OPTIONS.map((o) => [o.id, o])),
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
 * @param {string | null | undefined} id
 * @returns {boolean}
 */
export function isMarketBuyerNeedId(id) {
  return Boolean(BUYER_NEED_BY_ID[String(id || '').trim()]);
}

/**
 * @param {string | null | undefined} id
 * @returns {typeof MARKET_BUYER_NEED_OPTIONS[number] | null}
 */
export function getMarketBuyerNeed(id) {
  return BUYER_NEED_BY_ID[String(id || '').trim()] || null;
}

/**
 * Map a homepage service-path deep-link (`?path=`) to the primary buyer-need option (#699 / #712).
 * Prefer the first MARKET_BUYER_NEED_OPTIONS row whose service_path matches.
 *
 * @param {string | null | undefined} servicePathId
 * @returns {string}
 */
export function buyerNeedForServicePath(servicePathId) {
  const pathId = String(servicePathId || '').trim();
  if (!isMarketServicePathId(pathId)) return '';
  const match = MARKET_BUYER_NEED_OPTIONS.find((o) => o.service_path === pathId);
  return match?.id || '';
}

/**
 * Map a buyer-facing need selection to internal service_path + offer_slug metadata.
 *
 * @param {string | null | undefined} buyerNeedId
 * @returns {{
 *   ok: true,
 *   buyer_need: string,
 *   service_path: MarketServicePathId,
 *   offer_slug: string,
 *   service_interest: string | null,
 * } | { ok: false, reason: string }}
 */
export function mapBuyerNeedToInternal(buyerNeedId) {
  const need = getMarketBuyerNeed(buyerNeedId);
  if (!need) {
    return { ok: false, reason: 'UNKNOWN_BUYER_NEED' };
  }
  return {
    ok: true,
    buyer_need: need.id,
    service_path: need.service_path,
    offer_slug: need.offer_slug ? String(need.offer_slug) : '',
    service_interest: need.service_interest,
  };
}

/**
 * Derive service_path for a locked product offer (Lead Rescue / Website Rescue pages).
 *
 * @param {string | null | undefined} offerSlug
 * @returns {MarketServicePathId | ''}
 */
export function servicePathForOfferSlug(offerSlug) {
  const slug = String(offerSlug || '').trim();
  if (!slug) return '';
  const match = MARKET_SERVICE_PATHS.find((p) => p.offerSlug === slug);
  return match ? match.id : '';
}

/**
 * True when service_path and offer_slug do not contradict each other.
 * - Path with a canonical offer must use that offer (or empty → will be filled).
 * - Path without a canonical offer must not carry a priced offer slug.
 * - Unknown path/offer pairs are invalid when both are present.
 *
 * @param {string | null | undefined} servicePathId
 * @param {string | null | undefined} offerSlug
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function isConsistentServiceProductPair(servicePathId, offerSlug) {
  const pathId = String(servicePathId || '').trim();
  const slug = String(offerSlug || '').trim();
  if (!pathId && !slug) return { ok: true };
  if (pathId && !isMarketServicePathId(pathId)) {
    return { ok: false, reason: 'INVALID_SERVICE_PATH' };
  }
  const path = pathId ? getMarketServicePath(pathId) : null;
  if (path && path.offerSlug) {
    if (slug && slug !== path.offerSlug) {
      return { ok: false, reason: 'CONTRADICTORY_SERVICE_PRODUCT' };
    }
    return { ok: true };
  }
  if (path && !path.offerSlug && slug) {
    return { ok: false, reason: 'CONTRADICTORY_SERVICE_PRODUCT' };
  }
  if (!pathId && slug) {
    const derived = servicePathForOfferSlug(slug);
    if (!derived) return { ok: false, reason: 'INVALID_OFFER_SLUG' };
    return { ok: true };
  }
  return { ok: true };
}

/**
 * Resolve final service_path + offer_slug for a market enquiry.
 * Prefer buyer_need when present; otherwise locked/explicit offer; otherwise path mapping.
 * Never returns a contradictory pair.
 *
 * @param {{
 *   buyer_need?: string | null,
 *   service_path?: string | null,
 *   offer_slug?: string | null,
 *   locked_offer?: boolean,
 * }} input
 * @returns {{
 *   ok: true,
 *   service_path: string,
 *   offer_slug: string,
 *   buyer_need: string | null,
 *   service_interest: string | null,
 * } | { ok: false, reason: string }}
 */
export function resolveMarketEnquiryRouting(input = {}) {
  const buyerNeed = String(input.buyer_need || '').trim();
  if (buyerNeed) {
    const mapped = mapBuyerNeedToInternal(buyerNeed);
    if (!mapped.ok) return mapped;
    return {
      ok: true,
      service_path: mapped.service_path,
      offer_slug: mapped.offer_slug,
      buyer_need: mapped.buyer_need,
      service_interest: mapped.service_interest,
    };
  }

  const locked = input.locked_offer === true;
  const explicitOffer = String(input.offer_slug || '').trim();
  let pathId = String(input.service_path || '').trim();

  if (locked && explicitOffer) {
    const derived = servicePathForOfferSlug(explicitOffer);
    if (!derived) return { ok: false, reason: 'INVALID_OFFER_SLUG' };
    return {
      ok: true,
      service_path: derived,
      offer_slug: explicitOffer,
      buyer_need: null,
      service_interest:
        explicitOffer === 'ai-lead-rescue'
          ? 'lead_rescue'
          : explicitOffer === 'premium-landing-page-rescue'
            ? 'website_rescue'
            : null,
    };
  }

  if (pathId && !isMarketServicePathId(pathId)) {
    return { ok: false, reason: 'INVALID_SERVICE_PATH' };
  }

  const consistency = isConsistentServiceProductPair(pathId, explicitOffer);
  if (!consistency.ok) return consistency;

  if (!pathId && explicitOffer) {
    pathId = servicePathForOfferSlug(explicitOffer);
    if (!pathId) return { ok: false, reason: 'INVALID_OFFER_SLUG' };
  }

  const path = pathId ? getMarketServicePath(pathId) : null;
  let offerSlug = '';
  if (path?.offerSlug) {
    offerSlug = path.offerSlug;
  } else if (explicitOffer && path && !path.offerSlug) {
    return { ok: false, reason: 'CONTRADICTORY_SERVICE_PRODUCT' };
  }

  if (!pathId && !offerSlug) {
    return { ok: false, reason: 'MISSING_ROUTING' };
  }

  return {
    ok: true,
    service_path: pathId,
    offer_slug: offerSlug,
    buyer_need: null,
    service_interest: null,
  };
}

/**
 * Derive a rapid-delivery offer slug when the buyer chose a mapped service path.
 * Workflow/admin path has no priced sprint slug — leave empty.
 * Explicit offer is accepted only when consistent with the service path.
 *
 * @param {string | null | undefined} servicePathId
 * @param {string | null | undefined} explicitOfferSlug
 * @returns {string}
 */
export function resolveOfferSlugForMarketEnquiry(servicePathId, explicitOfferSlug) {
  const routed = resolveMarketEnquiryRouting({
    service_path: servicePathId,
    offer_slug: explicitOfferSlug,
  });
  if (routed.ok) return routed.offer_slug;
  // Legacy callers: if only an explicit slug is provided and path is empty/unknown,
  // keep prior behaviour of returning the explicit slug when no path conflict exists.
  const explicit = String(explicitOfferSlug || '').trim();
  const path = getMarketServicePath(servicePathId);
  if (!path && explicit) return explicit;
  if (path?.offerSlug) return String(path.offerSlug);
  return '';
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
    return 'Review Website Rescue fit; share /website-rescue and /demo/website-rescue if useful; book discovery before quoting.';
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
