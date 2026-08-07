import React from 'react';
import Link from 'next/link';

import CafeInternationalPreviewShell, {
  CafeInternationalTheme as T,
} from '../../../components/cafe-international/CafeInternationalPreviewShell.js';
import { CAFE_INTERNATIONAL_PREVIEW_BASE } from '../../../lib/website-rescue/cafe-international-preview.js';
import { getCafeInternationalPreviewProps } from '../../../lib/website-rescue/cafe-international-preview-server.js';

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
      <h1
        style={{
          margin: '24px 0 0',
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
        Café International — The Flame Grill Café is an owner-operated restaurant
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
    </CafeInternationalPreviewShell>
  );
}

export async function getStaticProps() {
  const props = getCafeInternationalPreviewProps();
  return { props: { truth: props.truth, nav: props.nav } };
}
