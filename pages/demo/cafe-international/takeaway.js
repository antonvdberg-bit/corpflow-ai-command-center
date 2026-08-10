import React from 'react';

import CafeInternationalPreviewShell, {
  CafeActionPanel,
  CafeInternationalTheme as T,
} from '../../../components/cafe-international/CafeInternationalPreviewShell.js';
import { CAFE_INTERNATIONAL_VISUALS } from '../../../lib/website-rescue/cafe-international-assets.js';
import { CAFE_INTERNATIONAL_PREVIEW_BASE } from '../../../lib/website-rescue/cafe-international-preview.js';
import { getCafeInternationalPreviewProps } from '../../../lib/website-rescue/cafe-international-preview-server.js';

export default function CafeInternationalTakeawayPage({ truth, takeawayActions, nav }) {
  return (
    <CafeInternationalPreviewShell
      title={`Takeaway — ${truth.public_name}`}
      description="Order takeaway by WhatsApp or phone. Collection only — not through website chat."
      canonicalPath={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/takeaway`}
      nav={nav}
      activeHref={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/takeaway`}
      truth={truth}
    >
      <div
        style={{
          borderRadius: 18,
          overflow: 'hidden',
          minHeight: 220,
          marginTop: 8,
          backgroundImage: `
            linear-gradient(180deg, rgba(20,14,12,0.3), rgba(20,14,12,0.88)),
            url(${CAFE_INTERNATIONAL_VISUALS.takeawayVisual})
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
          Takeaway
        </h1>
        <p style={{ marginTop: 12, color: T.creamMuted, maxWidth: 560, lineHeight: 1.55 }}>
          Collection only — no delivery. Use WhatsApp or phone. Website chat is for
          table booking, not takeaway orders.
        </p>
      </div>

      <div style={{ marginTop: 24 }} data-cafe-takeaway-cta>
        <CafeActionPanel
          tone="takeaway"
          image={CAFE_INTERNATIONAL_VISUALS.plateBurger}
          title="Order for collection"
          subtitle={`Message or call ${truth.public_phone}. WhatsApp or phone only — website chat is for table bookings, not takeaway.`}
          actions={takeawayActions}
        />
      </div>

      <p style={{ marginTop: 20, color: T.creamMuted, fontSize: 15, lineHeight: 1.5 }}>
        Browse the menu first, then send the items you want. Collection only — no
        delivery. Chatbot prompts and WhatsApp automation are not changed in this
        preview.
      </p>
      <div style={{ marginTop: 14 }}>
        <a
          href={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu`}
          style={{ color: T.flameSoft, fontWeight: 700 }}
        >
          Browse the full menu →
        </a>
      </div>
    </CafeInternationalPreviewShell>
  );
}

export async function getStaticProps() {
  const props = getCafeInternationalPreviewProps();
  return {
    props: {
      truth: props.truth,
      takeawayActions: props.takeawayActions,
      nav: props.nav,
    },
  };
}
