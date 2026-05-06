/**
 * Unified property ref resolution: curated staged slugs + feed listing ids (Phase 2B hybrid).
 * Used by concierge UI and server allowlist validation (import from `lib/cmp/router.js`).
 */

import { findLuxFeedPropertyById } from './luxe-maurice-feed-properties.js';
import { findLuxStagedPropertyBySlug } from './luxe-maurice-staged-properties.js';

/**
 * @typedef {{
 *   discovery_source: 'curated' | 'feed',
 *   ref: string,
 *   title: string,
 *   location: string,
 *   property_type: string,
 *   status: string | null,
 *   price_range: string | null,
 *   listing_provider: string,
 *   summary_text: string,
 *   highlights: string[],
 * }} LuxResolvedPropertyInterest
 */

/**
 * @param {unknown} ref
 * @returns {LuxResolvedPropertyInterest | null}
 */
export function resolveLuxPropertyRef(ref) {
  const raw = ref != null ? String(ref).trim().toLowerCase() : '';
  if (!raw) return null;

  const curated = findLuxStagedPropertyBySlug(raw);
  if (curated) {
    const teaser = curated.teaser != null ? String(curated.teaser).trim() : '';
    return {
      discovery_source: 'curated',
      ref: curated.slug,
      title: curated.title,
      location: curated.region,
      property_type: curated.property_type,
      status: curated.status || null,
      price_range: null,
      listing_provider: 'curated_staged',
      summary_text: teaser || `${curated.title} — developer-led introduction in ${curated.region}.`,
      highlights: [
        `${curated.property_type} · ${curated.region}`,
        'Availability and private previews are confirmed through the LuxeMaurice concierge.',
        'Nothing on this page is an offer; terms are agreed in writing when you proceed.',
      ],
    };
  }

  const feed = findLuxFeedPropertyById(raw);
  if (feed) {
    return {
      discovery_source: 'feed',
      ref: feed.id,
      title: feed.title,
      location: feed.location,
      property_type: feed.property_type,
      status: feed.status != null ? String(feed.status) : null,
      price_range: feed.price_range != null ? String(feed.price_range) : null,
      listing_provider: 'mock_feed_v1',
      summary_text: `Indicative market preview in ${feed.location}. Final pricing, availability, and documentation are confirmed privately with your advisor.`,
      highlights: [
        `${feed.property_type} · ${feed.location}`,
        'This entry uses a feed-shaped preview set — live IDX integration will replace the source when configured.',
        'Not a firm offer; brokerage and licensing rules apply when a real feed is connected.',
      ],
    };
  }

  return null;
}
