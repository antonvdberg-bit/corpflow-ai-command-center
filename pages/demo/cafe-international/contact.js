import React from 'react';

import CafeInternationalPreviewShell, {
  CafeActionPanel,
  CafeInternationalTheme as T,
} from '../../../components/cafe-international/CafeInternationalPreviewShell.js';
import { CAFE_INTERNATIONAL_PREVIEW_BASE } from '../../../lib/website-rescue/cafe-international-preview.js';
import { getCafeInternationalPreviewProps } from '../../../lib/website-rescue/cafe-international-preview-server.js';

export default function CafeInternationalContactPage({
  truth,
  bookingActions,
  takeawayActions,
  nav,
}) {
  return (
    <CafeInternationalPreviewShell
      title={`Contact — ${truth.public_name}`}
      description="Book a table by phone or website chat. Takeaway by WhatsApp or phone."
      canonicalPath={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/contact`}
      nav={nav}
      activeHref={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/contact`}
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
        Contact
      </h1>
      <p style={{ marginTop: 12, color: T.creamMuted, lineHeight: 1.55 }}>
        {truth.address}
        <br />
        {truth.public_phone}
      </p>

      <div id="book" style={{ marginTop: 28 }}>
        <CafeActionPanel
          tone="booking"
          title="Book a table"
          subtitle="Phone or current website chat (bridged — chatbot logic unchanged)."
          actions={bookingActions}
        />
      </div>

      <div id="takeaway" style={{ marginTop: 16 }}>
        <CafeActionPanel
          tone="takeaway"
          title="Takeaway (not chat)"
          subtitle="WhatsApp or phone only. Collection — no delivery."
          actions={takeawayActions}
        />
      </div>
    </CafeInternationalPreviewShell>
  );
}

export async function getStaticProps() {
  const props = getCafeInternationalPreviewProps();
  return {
    props: {
      truth: props.truth,
      bookingActions: props.bookingActions,
      takeawayActions: props.takeawayActions,
      nav: props.nav,
    },
  };
}
