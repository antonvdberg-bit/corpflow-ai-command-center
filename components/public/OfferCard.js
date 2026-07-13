import React from 'react';
import Link from 'next/link';
import { formatMur } from '../../lib/public/corpflow-public-market.js';
import { cfBody, cfCard, cfH2, cfKicker, cfLink } from './corpflow-public-styles.js';

/**
 * @param {{ offer: import('../../lib/public/rapid-delivery-offers.js').RapidDeliveryOffer }} props
 */
export default function OfferCard({ offer }) {
  return (
    <article style={cfCard}>
      <p style={cfKicker}>{offer.pageLabel}</p>
      <h3 style={{ ...cfH2, fontSize: 18, marginBottom: 8 }}>{offer.title}</h3>
      <p style={{ ...cfBody, margin: '0 0 10px', fontSize: 14 }}>{offer.outcome.slice(0, 140)}…</p>
      <p style={{ margin: '0 0 14px', fontWeight: 800, color: '#2dd4bf', fontSize: 15 }}>
        Starting from {formatMur(offer.startingPriceMur)}
      </p>
      <Link href={offer.path} style={cfLink}>
        View sprint →
      </Link>
    </article>
  );
}
