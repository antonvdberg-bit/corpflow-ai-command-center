import React from 'react';
import Link from 'next/link';

import CafeInternationalPreviewShell, {
  CafeActionPanel,
  ActionButton,
  CafeInternationalTheme as T,
} from '../../../components/cafe-international/CafeInternationalPreviewShell.js';
import {
  buildCafeInternationalRestaurantJsonLd,
  CAFE_INTERNATIONAL_PREVIEW_BASE,
} from '../../../lib/website-rescue/cafe-international-preview.js';
import { getCafeInternationalPreviewProps } from '../../../lib/website-rescue/cafe-international-preview-server.js';

/**
 * Café International — Website Rescue owner-reviewable preview home (#797 / #760).
 * Before/after: booking vs takeaway channels separated (takeaway no longer via chat).
 */
export default function CafeInternationalPreviewHome({
  truth,
  bookingActions,
  takeawayActions,
  hoursRows,
  nav,
}) {
  const jsonLd = buildCafeInternationalRestaurantJsonLd(
    truth,
    `https://corpflowai.com${CAFE_INTERNATIONAL_PREVIEW_BASE}`,
  );

  return (
    <CafeInternationalPreviewShell
      title={`${truth.public_name} — Website Rescue preview`}
      description="Flame-grilled favourites in Trou aux Biches. Preview rebuild for owner review."
      canonicalPath={CAFE_INTERNATIONAL_PREVIEW_BASE}
      jsonLd={jsonLd}
      nav={nav}
      activeHref={CAFE_INTERNATIONAL_PREVIEW_BASE}
      truth={truth}
    >
      <section
        data-cafe-hero
        style={{
          minHeight: '72vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '48px 0 28px',
          borderBottom: `1px solid rgba(246,239,230,0.12)`,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 12,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: T.flameSoft,
            fontWeight: 800,
          }}
        >
          Since {truth.since_year} · Trou aux Biches
        </p>
        <h1
          style={{
            margin: '14px 0 0',
            fontFamily: T.fontDisplay,
            fontSize: 'clamp(36px, 7vw, 64px)',
            lineHeight: 1.02,
            letterSpacing: '-0.03em',
            maxWidth: 720,
            color: T.cream,
          }}
        >
          Flame-grilled favourites. Big flavour. Generous portions.
        </h1>
        <p
          style={{
            marginTop: 16,
            maxWidth: 540,
            fontSize: 'clamp(16px, 2vw, 19px)',
            lineHeight: 1.55,
            color: T.creamMuted,
          }}
        >
          Café International — The Flame Grill Café. Owner-operated grill in Trou
          aux Biches serving steaks, ribs, burgers and more since {truth.since_year}.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 22 }}>
          <ActionButton href={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu`} primary>
            View Menu
          </ActionButton>
          <ActionButton href={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/contact#book`}>
            Book a Table
          </ActionButton>
          <ActionButton href={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/takeaway`}>
            Order Takeaway
          </ActionButton>
        </div>
      </section>

      <section
        data-before-after
        style={{
          marginTop: 28,
          padding: 16,
          borderRadius: 14,
          border: '1px dashed rgba(232,160,106,0.45)',
          background: 'rgba(0,0,0,0.22)',
        }}
      >
        <div
          style={{
            fontSize: 12,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: T.flameSoft,
            fontWeight: 800,
          }}
        >
          What improved in this preview
        </div>
        <ul style={{ margin: '12px 0 0', paddingLeft: 18, color: T.creamMuted, lineHeight: 1.55 }}>
          <li>
            <strong style={{ color: T.cream }}>Before:</strong> takeaway was pushed
            through website chat on the live site.
          </li>
          <li>
            <strong style={{ color: T.cream }}>After:</strong> takeaway is WhatsApp or
            phone only; table booking stays phone or website chat (bridged, not
            rebuilt).
          </li>
          <li>
            Menu categories are visible HTML for phones and search — not locked
            inside chat.
          </li>
        </ul>
      </section>

      <div
        style={{
          display: 'grid',
          gap: 16,
          marginTop: 28,
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        }}
      >
        <CafeActionPanel
          tone="booking"
          title="Book a table"
          subtitle="Phone or the current website chat. Chat behaviour is unchanged — this preview only bridges to it."
          actions={bookingActions}
        />
        <CafeActionPanel
          tone="takeaway"
          title="Order takeaway"
          subtitle="WhatsApp or phone only. Collection — no delivery. Not through website chat."
          actions={takeawayActions}
        />
      </div>

      <section style={{ marginTop: 40 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: T.fontDisplay,
            fontSize: 'clamp(26px, 4vw, 36px)',
            color: T.cream,
          }}
        >
          The grill
        </h2>
        <p style={{ marginTop: 10, color: T.creamMuted, maxWidth: 560, lineHeight: 1.55 }}>
          Steaks, ribs, burgers and grill favourites — the appetite path guests
          expect. Full item names and MUR prices fill from the owner menu sheet
          next; categories are already crawlable.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
          {['Steaks', 'Ribs', 'Burgers', 'Grill favourites'].map((label) => (
            <Link
              key={label}
              href={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/steaks-and-grill`}
              style={{
                padding: '10px 14px',
                borderRadius: 999,
                border: '1px solid rgba(246,239,230,0.2)',
                color: T.cream,
                textDecoration: 'none',
                fontWeight: 700,
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: T.fontDisplay,
            fontSize: 'clamp(26px, 4vw, 36px)',
            color: T.cream,
          }}
        >
          Visit
        </h2>
        <p style={{ marginTop: 10, color: T.cream, fontSize: 17, lineHeight: 1.5 }}>
          {truth.address}
        </p>
        <p style={{ marginTop: 6, color: T.creamMuted }}>
          <a href={`tel:${String(truth.public_phone || '').replace(/[^\d+]/g, '')}`} style={{ color: T.flameSoft }}>
            {truth.public_phone}
          </a>
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 0' }}>
          {hoursRows.map((row) => (
            <li
              key={row.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                padding: '8px 0',
                borderBottom: '1px solid rgba(246,239,230,0.1)',
                color: T.creamMuted,
                fontSize: 15,
              }}
            >
              <span>{row.label}</span>
              <span style={{ color: T.cream }}>{row.hours}</span>
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 16 }}>
          <ActionButton href={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/visit`}>
            Full visit details
          </ActionButton>
        </div>
      </section>
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
      hoursRows: props.hoursRows,
      nav: props.nav,
    },
  };
}
