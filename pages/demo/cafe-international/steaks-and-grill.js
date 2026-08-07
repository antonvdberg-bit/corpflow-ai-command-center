import React from 'react';
import Link from 'next/link';

import CafeInternationalPreviewShell, {
  ActionButton,
  CafeInternationalTheme as T,
} from '../../../components/cafe-international/CafeInternationalPreviewShell.js';
import { CAFE_INTERNATIONAL_PREVIEW_BASE } from '../../../lib/website-rescue/cafe-international-preview.js';
import { getCafeInternationalPreviewProps } from '../../../lib/website-rescue/cafe-international-preview-server.js';

export default function CafeInternationalSteaksPage({ truth, menu, nav }) {
  const cats = (menu.categories || []).filter((c) =>
    ['steaks', 'ribs', 'burgers', 'grill-favourites'].includes(c.id),
  );

  return (
    <CafeInternationalPreviewShell
      title={`Steaks & grill — ${truth.public_name}`}
      description="Steaks, ribs, burgers and grill favourites at Café International."
      canonicalPath={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/steaks-and-grill`}
      nav={nav}
      activeHref={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/steaks-and-grill`}
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
        Steaks & grill
      </h1>
      <p style={{ marginTop: 12, color: T.creamMuted, maxWidth: 560, lineHeight: 1.55 }}>
        The flame-grill path — appetite first, then the full crawlable menu.
      </p>

      <div style={{ display: 'grid', gap: 12, marginTop: 24 }}>
        {cats.map((cat) => (
          <section
            key={cat.id}
            style={{
              padding: '16px',
              borderRadius: 14,
              border: '1px solid rgba(246,239,230,0.14)',
              background: 'rgba(0,0,0,0.2)',
            }}
          >
            <h2 style={{ margin: 0, fontFamily: T.fontDisplay, fontSize: 24, color: T.cream }}>
              {cat.name}
            </h2>
            <p style={{ margin: '8px 0 0', color: T.creamMuted }}>{cat.summary}</p>
            <p style={{ margin: '10px 0 0' }}>
              <Link
                href={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu#${cat.id}`}
                style={{ color: T.flameSoft, fontWeight: 700 }}
              >
                See on menu →
              </Link>
            </p>
          </section>
        ))}
      </div>

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
