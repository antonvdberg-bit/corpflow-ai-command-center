import React from 'react';

import CafeInternationalPreviewShell, {
  ActionButton,
  CafeActionPanel,
  CafeFoodMotion,
  CafeGlassPanel,
  CafeInternationalTheme as T,
} from '../../../components/cafe-international/CafeInternationalPreviewShell.js';
import {
  CAFE_INTERNATIONAL_OWNERS,
  CAFE_INTERNATIONAL_VISUALS,
} from '../../../lib/website-rescue/cafe-international-assets.js';
import {
  cafeInternationalTelHref,
  CAFE_INTERNATIONAL_PREVIEW_BASE,
} from '../../../lib/website-rescue/cafe-international-preview.js';
import { getCafeInternationalPreviewProps } from '../../../lib/website-rescue/cafe-international-preview-server.js';

export default function CafeInternationalVisitPage({
  truth,
  hoursRows,
  nav,
  bookingActions,
}) {
  return (
    <CafeInternationalPreviewShell
      title={`Visit — ${truth.public_name}`}
      description="Dine in at Café International — Royal Road, Trou aux Biches. Book by phone or website chat."
      canonicalPath={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/visit`}
      nav={nav}
      activeHref={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/visit`}
      truth={truth}
    >
      <div
        style={{
          borderRadius: 18,
          overflow: 'hidden',
          minHeight: 220,
          marginTop: 8,
          backgroundImage: `
            linear-gradient(180deg, rgba(20,14,12,0.28), rgba(20,14,12,0.9)),
            url(${CAFE_INTERNATIONAL_VISUALS.venuePatio})
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          padding: '36px 18px 28px',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: T.fontDisplay,
            fontSize: 'clamp(32px, 5vw, 48px)',
            color: T.cream,
          }}
        >
          Visit / dine in
        </h1>
        <p style={{ marginTop: 12, color: T.creamMuted, maxWidth: 560, lineHeight: 1.55 }}>
          Atmosphere, dining experience and the grill story — run by{' '}
          {CAFE_INTERNATIONAL_OWNERS} since {truth.since_year}. Book by phone or website
          chat.
        </p>
      </div>

      <div style={{ marginTop: 22 }}>
        <CafeFoodMotion
          src={CAFE_INTERNATIONAL_VISUALS.venueBuzzMotion}
          poster={CAFE_INTERNATIONAL_VISUALS.venueBuzz}
          caption="Dining atmosphere"
        />
      </div>

      <CafeGlassPanel style={{ marginTop: 22, padding: '20px 18px' }}>
        <h2
          style={{
            margin: 0,
            fontFamily: T.fontDisplay,
            fontSize: 24,
            color: T.cream,
          }}
        >
          Find us
        </h2>
        <p style={{ marginTop: 12, fontSize: 18, color: T.cream, lineHeight: 1.5 }}>
          {truth.address}
        </p>
        <p style={{ marginTop: 8 }}>
          <a
            href={cafeInternationalTelHref(truth.public_phone)}
            style={{ color: T.flameSoft, fontSize: 18, fontWeight: 700 }}
          >
            {truth.public_phone}
          </a>
        </p>
        <p style={{ marginTop: 10, color: T.creamMuted, fontSize: 15, lineHeight: 1.5 }}>
          Directions: Royal Road, Trou aux Biches. Ask for Café International — The Flame
          Grill Café. Dining and menu questions welcome by phone or website chat.
        </p>
      </CafeGlassPanel>

      <h2
        style={{
          margin: '28px 0 0',
          fontFamily: T.fontDisplay,
          fontSize: 24,
          color: T.cream,
        }}
      >
        Opening hours
      </h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0' }}>
        {hoursRows.map((row) => (
          <li
            key={row.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              padding: '10px 0',
              borderBottom: '1px solid rgba(246,239,230,0.1)',
              color: T.creamMuted,
            }}
          >
            <span>{row.label}</span>
            <span style={{ color: T.cream }}>{row.hours}</span>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 28 }} id="book">
        <CafeActionPanel
          tone="booking"
          image={CAFE_INTERNATIONAL_VISUALS.venueInterior}
          title="Book a table"
          subtitle="Booking is by phone or the current website chat only. Chat behaviour stays unchanged."
          actions={bookingActions}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 22 }}>
        <ActionButton href={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu`}>
          Browse menu
        </ActionButton>
        <ActionButton href={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/steaks-and-grill`}>
          Steaks & grill story
        </ActionButton>
        <ActionButton href={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/takeaway`}>
          Prefer takeaway?
        </ActionButton>
      </div>
    </CafeInternationalPreviewShell>
  );
}

export async function getStaticProps() {
  const props = getCafeInternationalPreviewProps();
  return {
    props: {
      truth: props.truth,
      hoursRows: props.hoursRows,
      nav: props.nav,
      bookingActions: props.bookingActions,
    },
  };
}
