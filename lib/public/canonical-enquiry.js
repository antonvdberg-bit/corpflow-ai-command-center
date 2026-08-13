/**
 * Canonical public enquiry route (#822 / #699).
 *
 * One buyer-facing form lives at `/contact#discovery`. Product landings
 * (including AI Lead Rescue) must deep-link here with query params that
 * lock or preselect context — they must not embed a second submit form.
 */

import { RAPID_DELIVERY_OFFER_SLUGS } from './rapid-delivery-offers.js';
import {
  buyerNeedForServicePath,
  isMarketBuyerNeedId,
  isMarketServicePathId,
  servicePathForOfferSlug,
} from './corpflow-market-service-paths.js';

export const CANONICAL_ENQUIRY_PATH = '/contact';
export const CANONICAL_ENQUIRY_HASH = 'discovery';

/** Offer slug that locks the canonical form to AI Lead Rescue. */
export const LEAD_RESCUE_ENQUIRY_OFFER = 'ai-lead-rescue';

/**
 * Surviving public CTA for AI Lead Rescue intake.
 * Locks DiscoveryIntakeForm to Lead Rescue without a second product question.
 */
export const LEAD_RESCUE_ENQUIRY_HREF = '/contact?offer=ai-lead-rescue#discovery';

/**
 * @param {string | null | undefined} slug
 * @returns {boolean}
 */
export function isCanonicalEnquiryOfferSlug(slug) {
  const value = String(slug || '').trim();
  return RAPID_DELIVERY_OFFER_SLUGS.includes(/** @type {any} */ (value));
}

/**
 * @param {{ offer?: string | null, path?: string | null, need?: string | null }} [opts]
 * @returns {string}
 */
export function canonicalEnquiryHref(opts = {}) {
  const params = new URLSearchParams();
  const offer = String(opts.offer || '').trim();
  const path = String(opts.path || '').trim();
  const need = String(opts.need || '').trim();
  if (isCanonicalEnquiryOfferSlug(offer)) {
    params.set('offer', offer);
  } else if (isMarketServicePathId(path)) {
    params.set('path', path);
  } else if (isMarketBuyerNeedId(need)) {
    params.set('need', need);
  }
  const qs = params.toString();
  return `${CANONICAL_ENQUIRY_PATH}${qs ? `?${qs}` : ''}#${CANONICAL_ENQUIRY_HASH}`;
}

/**
 * Parse `/contact` query into DiscoveryIntakeForm props.
 * `offer=` wins and locks the product so the buyer is not asked to classify again.
 *
 * @param {Record<string, unknown> | null | undefined} query
 * @returns {{
 *   defaultOfferSlug: string,
 *   lockedOffer: boolean,
 *   defaultServicePath: string,
 *   defaultBuyerNeed: string,
 * }}
 */
export function resolveCanonicalEnquiryQuery(query = {}) {
  const rawOffer = typeof query?.offer === 'string' ? query.offer.trim() : '';
  const defaultOfferSlug = isCanonicalEnquiryOfferSlug(rawOffer) ? rawOffer : '';
  const lockedOffer = Boolean(defaultOfferSlug);

  const rawPath = typeof query?.path === 'string' ? query.path.trim() : '';
  const rawNeed = typeof query?.need === 'string' ? query.need.trim() : '';
  const defaultServicePath = lockedOffer
    ? servicePathForOfferSlug(defaultOfferSlug)
    : isMarketServicePathId(rawPath)
      ? rawPath
      : '';
  const fromPath = defaultServicePath ? buyerNeedForServicePath(defaultServicePath) : '';
  const defaultBuyerNeed = lockedOffer
    ? ''
    : isMarketBuyerNeedId(rawNeed)
      ? rawNeed
      : isMarketBuyerNeedId(fromPath)
        ? fromPath
        : '';

  return {
    defaultOfferSlug,
    lockedOffer,
    defaultServicePath,
    defaultBuyerNeed,
  };
}
