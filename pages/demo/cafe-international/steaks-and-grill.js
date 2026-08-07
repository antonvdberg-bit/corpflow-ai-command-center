import React from 'react';
import Link from 'next/link';

import CafeInternationalPreviewShell, {
  ActionButton,
  CafeInternationalTheme as T,
} from '../../../components/cafe-international/CafeInternationalPreviewShell.js';
import {
  CAFE_INTERNATIONAL_APPETITE_TILES,
  CAFE_INTERNATIONAL_VISUALS,
} from '../../../lib/website-rescue/cafe-international-assets.js';
import { CAFE_INTERNATIONAL_PREVIEW_BASE } from '../../../lib/website-rescue/cafe-international-preview.js';
import { getCafeInternationalPreviewProps } from '../../../lib/website-rescue/cafe-international-preview-server.js';

export default function CafeInternationalSteaksPage({ truth, menu, nav }) {
  const grill = (menu.categories || []).find((c) => c.id === 'from-our-grill');

  return (
    <CafeInternationalPreviewShell
      title={`Steaks & grill — ${truth.public_name}`}
      description="Steaks, ribs, burgers and grill favourites at Café International."
      canonicalPath={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/steaks-and-grill`}
      nav={nav}
      activeHref={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/steaks-and-grill`}
      truth={truth}
    >
      <div
        style={{
          borderRadius: 18,
          overflow: 'hidden',
          minHeight: 240,
          marginTop: 8,
          backgroundImage: `
            linear-gradient(180deg, rgba(20,14,12,0.25), rgba(20,14,12,0.88)),
            url(${CAFE_INTERNATIONAL_VISUALS.plateSteak})
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
          Steaks & grill
        </h1>
        <p style={{ marginTop: 12, color: T.creamMuted, maxWidth: 560, lineHeight: 1.55 }}>
          The flame-grill path — appetite first, then the full crawlable menu.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gap: 12,
          marginTop: 20,
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        }}
      >
        {CAFE_INTERNATIONAL_APPETITE_TILES.map((tile) => (
          <Link
            key={tile.id}
            href={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu#from-our-grill`}
            style={{
              display: 'block',
              borderRadius: 14,
              overflow: 'hidden',
              minHeight: 160,
              textDecoration: 'none',
              border: '1px solid rgba(246,239,230,0.16)',
              backgroundImage: `
                linear-gradient(180deg, transparent 30%, rgba(20,14,12,0.85)),
                url(${tile.image})
              `,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: 10,
                bottom: 10,
                color: T.cream,
                fontFamily: T.fontDisplay,
                fontSize: 18,
              }}
            >
              {tile.label}
            </span>
          </Link>
        ))}
      </div>

      {grill ? (
        <p style={{ marginTop: 18, color: T.creamMuted, lineHeight: 1.5 }}>
          {grill.summary}{' '}
          <Link
            href={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu#from-our-grill`}
            style={{ color: T.flameSoft, fontWeight: 700 }}
          >
            See grill items &amp; Rs prices →
          </Link>
        </p>
      ) : null}

      <div style={{ marginTop: 22 }}>
        <ActionButton href={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu`} primary>
          View full menu
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
      menu: props.menu,
      nav: props.nav,
    },
  };
}
