import React from 'react';
import Link from 'next/link';

import CafeInternationalPreviewShell, {
  CafeGlassPanel,
  CafeInternationalTheme as T,
} from '../../../components/cafe-international/CafeInternationalPreviewShell.js';
import {
  CAFE_INTERNATIONAL_OWNERS,
  CAFE_INTERNATIONAL_VISUALS,
} from '../../../lib/website-rescue/cafe-international-assets.js';
import { CAFE_INTERNATIONAL_PREVIEW_BASE } from '../../../lib/website-rescue/cafe-international-preview.js';
import { getCafeInternationalPreviewProps } from '../../../lib/website-rescue/cafe-international-preview-server.js';

/**
 * About — owner-operated story with genuine restaurant-front imagery (#871 / #872).
 */
export default function CafeInternationalAboutPage({ truth, nav }) {
  return (
    <CafeInternationalPreviewShell
      title={`About — ${truth.public_name}`}
      description={`Owner-operated flame grill in Trou aux Biches since ${truth.since_year}.`}
      canonicalPath={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/about`}
      nav={nav}
      activeHref={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/about`}
      truth={truth}
    >
      <figure
        data-cafe-about-exterior
        style={{
          margin: '8px 0 0',
          borderRadius: 18,
          overflow: 'hidden',
          border: `1px solid ${T.line}`,
          boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
        }}
      >
        <img
          src={CAFE_INTERNATIONAL_VISUALS.venuePatio}
          alt="Café International restaurant front and patio on Royal Road, Trou aux Biches"
          width={1600}
          height={720}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            aspectRatio: '16 / 9',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
        <figcaption
          style={{
            padding: '10px 14px 12px',
            background: 'rgba(20,14,12,0.72)',
            color: T.creamMuted,
            fontSize: 13,
            lineHeight: 1.4,
          }}
        >
          The Flame Grill Café — restaurant front, Royal Road, Trou aux Biches.
        </figcaption>
      </figure>

      <CafeGlassPanel style={{ marginTop: 22, padding: '22px 18px' }}>
        <h1
          style={{
            margin: 0,
            fontFamily: T.fontDisplay,
            fontSize: 'clamp(32px, 5vw, 48px)',
            color: T.cream,
          }}
        >
          Since {truth.since_year}
        </h1>
        <p
          style={{
            marginTop: 16,
            maxWidth: 640,
            fontSize: 18,
            lineHeight: 1.6,
            color: T.creamMuted,
          }}
        >
          Café International — The Flame Grill Café is run by {CAFE_INTERNATIONAL_OWNERS}{' '}
          in Trou aux Biches. Guests know it for flame-grilled steaks, ribs, burgers
          and a warm local welcome. This preview keeps that story prominent without
          inventing private biography.
        </p>
        <p style={{ marginTop: 14, color: T.creamMuted, lineHeight: 1.55, maxWidth: 640 }}>
          Halal and certification wording stays as currently approved on the live
          site — not reopened in this packet.
        </p>
        <p style={{ marginTop: 20 }}>
          <Link href={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/visit`} style={{ color: T.flameSoft }}>
            Plan your visit →
          </Link>
        </p>
      </CafeGlassPanel>
    </CafeInternationalPreviewShell>
  );
}

export async function getStaticProps() {
  const props = getCafeInternationalPreviewProps();
  return { props: { truth: props.truth, nav: props.nav } };
}
