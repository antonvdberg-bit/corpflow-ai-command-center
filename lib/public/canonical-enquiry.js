/**
 * Canonical public enquiry route (#822 / #699).
 *
 * One buyer-facing form lives at `/contact#discovery`. Product landings
 * (including AI Lead Rescue) deep-link here with query params that
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

/** Named buyer landing for Lead Rescue (#653 / #700 / #1127 / #1164). */
export const LEAD_RESCUE_LANDING_HREF = '/lead-rescue';

/**
 * Surviving public CTA for AI Lead Rescue intake.
 * Locks DiscoveryIntakeForm to Lead Rescue without a second product question.
 */
export const LEAD_RESCUE_ENQUIRY_HREF = '/contact?offer=ai-lead-rescue#discovery';

/** SKU slug that locks the canonical form to Website Rescue. */
export const WEBSITE_RESCUE_ENQUIRY_OFFER = 'premium-landing-page-rescue';

/** Named buyer landing after #710 / #1051. SKU URL remains a live alias. */
export const WEBSITE_RESCUE_LANDING_HREF = '/website-rescue';

/**
 * Surviving public CTA for Website Rescue intake.
 * Buyer-facing alias `website-rescue` resolves to this SKU lock.
 */
export const WEBSITE_RESCUE_ENQUIRY_HREF =
  '/contact?offer=premium-landing-page-rescue#discovery';

/**
 * Buyer-typed / shared aliases that must lock the same SKU.
 * Do not add a second priced product — only names for the existing landing rescue.
 */
export const CANONICAL_ENQUIRY_OFFER_ALIASES = Object.freeze({
  'website-rescue': WEBSITE_RESCUE_ENQUIRY_OFFER,
  website_rescue: WEBSITE_RESCUE_ENQUIRY_OFFER,
});

/**
 * @param {string | null | undefined} slug
 * @returns {string} Canonical rapid-delivery offer slug, or empty string.
 */
export function resolveCanonicalEnquiryOfferSlug(slug) {
  const value = String(slug || '').trim();
  if (!value) return '';
  if (RAPID_DELIVERY_OFFER_SLUGS.includes(/** @type {any} */ (value))) return value;
  return CANONICAL_ENQUIRY_OFFER_ALIASES[value] || '';
}

/**
 * @param {string | null | undefined} slug
 * @returns {boolean}
 */
export function isCanonicalEnquiryOfferSlug(slug) {
  return Boolean(resolveCanonicalEnquiryOfferSlug(slug));
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

  if (offer) {
    const canonical = resolveCanonicalEnquiryOfferSlug(offer);
    if (canonical) params.set('offer', canonical);
  }

  if (path && isMarketServicePathId(path)) params.set('path', path);
  if (need && isMarketBuyerNeedId(need)) params.set('need', need);

  if (!params.has('path') && params.has('offer')) {
    const inferredPath = servicePathForOfferSlug(params.get('offer'));
    if (inferredPath) params.set('path', inferredPath);
  }

  if (!params.has('need') && params.has('path')) {
    const inferredNeed = buyerNeedForServicePath(params.get('path'));
    if (inferredNeed) params.set('need', inferredNeed);
  }

  const query = params.toString();
  return `${CANONICAL_ENQUIRY_PATH}${query ? `?${query}` : ''}#${CANONICAL_ENQUIRY_HASH}`;
}
