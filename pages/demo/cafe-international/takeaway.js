import React from 'react';

import CafeInternationalPreviewShell, {
  CafeActionPanel,
  CafeInternationalTheme as T,
} from '../../../components/cafe-international/CafeInternationalPreviewShell.js';
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
      <h1
        style={{
          margin: '24px 0 0',
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

      <div style={{ marginTop: 24 }}>
        <CafeActionPanel
          tone="takeaway"
          title="Order for collection"
          subtitle={`Message or call ${truth.public_phone}. Do not use the website chat for takeaway.`}
          actions={takeawayActions}
        />
      </div>

      <p style={{ marginTop: 20, color: T.creamMuted, fontSize: 14, lineHeight: 1.5 }}>
        This separation corrects the live-site pattern that routed takeaway into
        chat. Chatbot prompts and WhatsApp automation are not changed in this
        preview.
      </p>
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
