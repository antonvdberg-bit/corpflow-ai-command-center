import React from 'react';
import Link from 'next/link';

import CafeInternationalPreviewShell, {
  CafeActionPanel,
  CafeGlassPanel,
  ActionButton,
  CafeInternationalTheme as T,
} from '../../../components/cafe-international/CafeInternationalPreviewShell.js';
import {
  CAFE_INTERNATIONAL_APPETITE_TILES,
  CAFE_INTERNATIONAL_VISUALS,
} from '../../../lib/website-rescue/cafe-international-assets.js';
import {
  buildCafeInternationalRestaurantJsonLd,
  CAFE_INTERNATIONAL_PREVIEW_BASE,
} from '../../../lib/website-rescue/cafe-international-preview.js';
import { getCafeInternationalPreviewProps } from '../../../lib/website-rescue/cafe-international-preview-server.js';

/**
 * Café International — visual-first Website Rescue preview home.
 * Client photography from Anton Drive; menu prices from live Menu-page Sheet.
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
      description="Flame-grilled favourites in Trou aux Biches. Visual Website Rescue preview for owner review."
      canonicalPath={CAFE_INTERNATIONAL_PREVIEW_BASE}
      jsonLd={jsonLd}
      nav={nav}
      activeHref={CAFE_INTERNATIONAL_PREVIEW_BASE}
      truth={truth}
      fullBleedHero
    >
      {/* Full-bleed appetite hero — client Real food / grill asset */}
      <section
        data-cafe-hero
        style={{
          position: 'relative',
          minHeight: 'min(92vh, 820px)',
          display: 'flex',
          alignItems: 'flex-end',
          backgroundImage: `
            linear-gradient(180deg, rgba(20,14,12,0.25) 0%, rgba(20,14,12,0.55) 45%, rgba(20,14,12,0.92) 100%),
            url(${CAFE_INTERNATIONAL_VISUALS.heroGrill})
          `,
          backgroundSize: 'cover',
          backgroundPosition: 'center 35%',
          padding: '40px 16px 96px',
        }}
      >
        <style>{`
          @media (max-width: 899px) {
            [data-cafe-hero] {
              min-height: 0 !important;
              height: calc(100dvh - 252px) !important;
              max-height: calc(100dvh - 252px) !important;
              align-items: flex-end !important;
              padding-top: 12px !important;
              padding-bottom: 12px !important;
              box-sizing: border-box !important;
            }
            [data-cafe-hero-glass] { padding: 14px 14px 14px !important; max-width: 100% !important; }
            [data-cafe-hero-glass] h1 { font-size: 26px !important; line-height: 1.08 !important; }
            [data-cafe-hero-glass] p[data-cafe-hero-lede] { display: none !important; }
            [data-cafe-hero-cta] { margin-top: 12px !important; }
            [data-cafe-hero-cta-secondary] { display: none !important; }
            [data-cafe-hero-cta] a { min-height: 44px !important; padding: 10px 14px !important; font-size: 14px !important; }
          }
        `}</style>
        <div style={{ maxWidth: 1100, width: '100%', margin: '0 auto' }}>
          <CafeGlassPanel
            data-cafe-hero-glass
            style={{ maxWidth: 640, padding: '18px 16px 18px' }}
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
                margin: '10px 0 0',
                fontFamily: T.fontDisplay,
                fontSize: 'clamp(28px, 6vw, 54px)',
                lineHeight: 1.05,
                letterSpacing: '-0.03em',
                color: T.cream,
              }}
            >
              Flame-grilled favourites. Big flavour. Generous portions.
            </h1>
            <p
              data-cafe-hero-lede
              style={{
                marginTop: 10,
                fontSize: 'clamp(14px, 2vw, 17px)',
                lineHeight: 1.45,
                color: T.creamMuted,
              }}
            >
              Steaks, ribs, burgers and platters — Royal Road, Trou aux Biches.
            </p>
            <div
              data-cafe-hero-cta
              style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}
            >
              <ActionButton href={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu`} primary>
                View Menu
              </ActionButton>
              <span data-cafe-hero-cta-secondary style={{ display: 'contents' }}>
                <ActionButton href={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/contact#book`}>
                  Book a Table
                </ActionButton>
                <ActionButton href={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/takeaway`}>
                  Order Takeaway
                </ActionButton>
              </span>
            </div>
          </CafeGlassPanel>
        </div>
      </section>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px' }}>
        {/* Appetite mosaic — food first */}
        <section style={{ marginTop: 28 }} aria-labelledby="cafe-appetite-heading">
          <h2
            id="cafe-appetite-heading"
            style={{
              margin: 0,
              fontFamily: T.fontDisplay,
              fontSize: 'clamp(26px, 4vw, 36px)',
              color: T.cream,
            }}
          >
            From the grill
          </h2>
          <p style={{ marginTop: 8, color: T.creamMuted, maxWidth: 520, lineHeight: 1.5 }}>
            Real plates from Café International — the appetite path guests expect.
          </p>
          <div
            data-cafe-appetite-grid
            style={{
              display: 'grid',
              gap: 12,
              marginTop: 18,
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            }}
          >
            {CAFE_INTERNATIONAL_APPETITE_TILES.map((tile) => (
              <Link
                key={tile.id}
                href={tile.href}
                style={{
                  display: 'block',
                  borderRadius: 16,
                  overflow: 'hidden',
                  textDecoration: 'none',
                  border: `1px solid ${T.line}`,
                  minHeight: 200,
                  backgroundImage: `
                    linear-gradient(180deg, rgba(20,14,12,0.05) 20%, rgba(20,14,12,0.85) 100%),
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
                    left: 12,
                    bottom: 12,
                    right: 12,
                    fontFamily: T.fontDisplay,
                    fontSize: 22,
                    color: T.cream,
                    fontWeight: 700,
                  }}
                >
                  {tile.label}
                </span>
                <span className="sr-only">{tile.alt}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Journey split — visually distinct */}
        <section style={{ marginTop: 36 }} aria-labelledby="cafe-journey-heading">
          <h2
            id="cafe-journey-heading"
            style={{
              margin: 0,
              fontFamily: T.fontDisplay,
              fontSize: 'clamp(26px, 4vw, 36px)',
              color: T.cream,
            }}
          >
            Book or takeaway
          </h2>
          <p style={{ marginTop: 8, color: T.creamMuted, maxWidth: 560, lineHeight: 1.5 }}>
            Two clear paths — clearer than the current site mix of chat for everything.
          </p>
          <div
            style={{
              display: 'grid',
              gap: 16,
              marginTop: 18,
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            }}
          >
            <CafeActionPanel
              tone="booking"
              image={CAFE_INTERNATIONAL_VISUALS.venuePatio}
              title="Book a table"
              subtitle="Phone or the current website chat. Chat behaviour is unchanged — this preview only bridges to it."
              actions={bookingActions}
            />
            <CafeActionPanel
              tone="takeaway"
              image={CAFE_INTERNATIONAL_VISUALS.takeawayVisual}
              title="Order takeaway"
              subtitle="WhatsApp or phone only. Collection — no delivery. Not through website chat."
              actions={takeawayActions}
            />
          </div>
        </section>

        {/* Venue atmosphere */}
        <section
          style={{
            marginTop: 40,
            borderRadius: 20,
            overflow: 'hidden',
            border: `1px solid ${T.line}`,
            minHeight: 280,
            backgroundImage: `
              linear-gradient(90deg, rgba(20,14,12,0.88) 0%, rgba(20,14,12,0.45) 55%, rgba(20,14,12,0.2) 100%),
              url(${CAFE_INTERNATIONAL_VISUALS.venuePatio})
            `,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            padding: '28px 20px',
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <div style={{ maxWidth: 480 }}>
            <h2
              style={{
                margin: 0,
                fontFamily: T.fontDisplay,
                fontSize: 'clamp(26px, 4vw, 34px)',
                color: T.cream,
              }}
            >
              Visit us
            </h2>
            <p style={{ marginTop: 10, color: T.cream, fontSize: 17, lineHeight: 1.45 }}>
              {truth.address}
            </p>
            <p style={{ marginTop: 6, color: T.creamMuted }}>
              <a
                href={`tel:${String(truth.public_phone || '').replace(/[^\d+]/g, '')}`}
                style={{ color: T.flameSoft }}
              >
                {truth.public_phone}
              </a>
            </p>
            <div style={{ marginTop: 14 }}>
              <ActionButton href={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/visit`} primary>
                Hours & directions
              </ActionButton>
            </div>
          </div>
        </section>

        <CafeGlassPanel style={{ marginTop: 24, padding: '16px 16px 8px' }}>
          <div
            style={{
              fontSize: 12,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: T.flameSoft,
              fontWeight: 800,
            }}
          >
            Opening hours
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 8px' }}>
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
        </CafeGlassPanel>

        {/* Owner note — below the fold, not competing with appetite */}
        <aside
          data-before-after
          style={{
            marginTop: 28,
            padding: 14,
            borderRadius: 12,
            border: '1px dashed rgba(232,160,106,0.35)',
            background: 'rgba(0,0,0,0.28)',
            fontSize: 13,
            color: T.creamMuted,
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: T.cream }}>For Dion / Anna-Marie — what changed vs live site:</strong>{' '}
          takeaway is WhatsApp or phone only (no website chat); booking stays phone or chat
          bridge; menu is crawlable HTML with prices from your live Menu-page Google Sheet;
          photography from your Drive folder.
        </aside>
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
      hoursRows: props.hoursRows,
      nav: props.nav,
    },
  };
}
