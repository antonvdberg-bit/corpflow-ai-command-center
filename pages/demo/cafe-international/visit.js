import React from 'react';

import CafeInternationalPreviewShell, {
  ActionButton,
  CafeInternationalTheme as T,
} from '../../../components/cafe-international/CafeInternationalPreviewShell.js';
import {
  cafeInternationalTelHref,
  CAFE_INTERNATIONAL_PREVIEW_BASE,
} from '../../../lib/website-rescue/cafe-international-preview.js';
import { getCafeInternationalPreviewProps } from '../../../lib/website-rescue/cafe-international-preview-server.js';

export default function CafeInternationalVisitPage({ truth, hoursRows, nav }) {
  return (
    <CafeInternationalPreviewShell
      title={`Visit — ${truth.public_name}`}
      description="Royal Road, Trou aux Biches — hours and phone for Café International."
      canonicalPath={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/visit`}
      nav={nav}
      activeHref={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/visit`}
      truth={truth}
    >
      <h1
        style={{
          margin: '24px 0 0',
          fontFamily: T.fontDisplay,
          fontSize: 'clamp(32px, 5vw, 48px)',
          color: T.cream,
        }}
      >
        Visit
      </h1>
      <p style={{ marginTop: 14, fontSize: 18, color: T.cream, lineHeight: 1.5 }}>
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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 22 }}>
        <ActionButton href={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/contact#book`} primary>
          Book a table
        </ActionButton>
        <ActionButton href={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/takeaway`}>
          Order takeaway
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
    },
  };
}
