import React from 'react';
import Link from 'next/link';

import CafeInternationalPreviewShell, {
  ActionButton,
  CafeGlassPanel,
  CafeInternationalTheme as T,
} from '../../../components/cafe-international/CafeInternationalPreviewShell.js';
import {
  CAFE_INTERNATIONAL_APPETITE_TILES,
  CAFE_INTERNATIONAL_VISUALS,
} from '../../../lib/website-rescue/cafe-international-assets.js';
import {
  CAFE_INTERNATIONAL_PREVIEW_BASE,
  selectCafeInternationalTakeawayFeatured,
} from '../../../lib/website-rescue/cafe-international-preview.js';
import { getCafeInternationalPreviewProps } from '../../../lib/website-rescue/cafe-international-preview-server.js';

/**
 * Takeaway / collection journey (#871 / #872 / #885).
 * One coherent path: browse → WhatsApp or phone → collect.
 * Website chat is never a takeaway ordering channel.
 * #885: owner category favourites with Sheet starting prices.
 */
export default function CafeInternationalTakeawayPage({
  truth,
  takeawayActions,
  nav,
  featuredPicks = [],
}) {
  const platterTiles = CAFE_INTERNATIONAL_APPETITE_TILES.filter((t) =>
    ['platters', 'steaks', 'burgers'].includes(t.id),
  );

  return (
    <CafeInternationalPreviewShell
      title={`Takeaway — ${truth.public_name}`}
      description="Order takeaway by WhatsApp or phone. Collection only — not through website chat."
      canonicalPath={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/takeaway`}
      nav={nav}
      activeHref={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/takeaway`}
      truth={truth}
    >
      <section
        data-cafe-takeaway-journey
        style={{
          borderRadius: 18,
          overflow: 'hidden',
          marginTop: 8,
          border: `1px solid ${T.line}`,
          background:
            'linear-gradient(180deg, rgba(196,92,38,0.18) 0%, rgba(20,14,12,0.92) 55%), ' +
            `url(${CAFE_INTERNATIONAL_VISUALS.takeawayVisual})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div style={{ padding: '36px 18px 28px', background: 'rgba(20,14,12,0.55)' }}>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: T.flameSoft,
              fontWeight: 800,
            }}
          >
            Collection only · no delivery
          </p>
          <h1
            style={{
              margin: '10px 0 0',
              fontFamily: T.fontDisplay,
              fontSize: 'clamp(32px, 5vw, 48px)',
              color: T.cream,
            }}
          >
            Takeaway
          </h1>
          <p style={{ marginTop: 12, color: T.creamMuted, maxWidth: 560, lineHeight: 1.55 }}>
            Browse what you want, message or call to order, then collect at Café
            International. WhatsApp or phone only — website chat is for table bookings,
            not takeaway orders.
          </p>

          <ol
            data-cafe-takeaway-steps
            style={{
              listStyle: 'none',
              padding: 0,
              margin: '22px 0 0',
              display: 'grid',
              gap: 10,
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            }}
          >
            {[
              { step: '1', title: 'Browse', body: 'Pick dishes from the menu or the picks below.' },
              { step: '2', title: 'Order', body: 'WhatsApp or phone — tell us what you want.' },
              { step: '3', title: 'Collect', body: 'Pick up at Royal Road, Trou aux Biches.' },
            ].map((item) => (
              <li
                key={item.step}
                style={{
                  borderRadius: 14,
                  border: '1px solid rgba(246,239,230,0.16)',
                  background: 'rgba(0,0,0,0.32)',
                  padding: '14px 14px 16px',
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
                  Step {item.step}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontFamily: T.fontDisplay,
                    fontSize: 22,
                    color: T.cream,
                    fontWeight: 700,
                  }}
                >
                  {item.title}
                </div>
                <p style={{ margin: '8px 0 0', color: T.creamMuted, fontSize: 14, lineHeight: 1.45 }}>
                  {item.body}
                </p>
              </li>
            ))}
          </ol>

          <div
            data-cafe-takeaway-order-actions
            style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 22 }}
          >
            {(takeawayActions || []).map((a) => (
              <ActionButton
                key={a.id}
                href={a.href}
                primary={a.kind === 'whatsapp' || a.kind === 'phone'}
              >
                {a.label}
              </ActionButton>
            ))}
            <ActionButton href={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu`}>
              Browse full menu
            </ActionButton>
          </div>
        </div>
      </section>

      <section
        data-cafe-takeaway-featured
        style={{ marginTop: 32 }}
        aria-labelledby="cafe-takeaway-featured-heading"
      >
        <h2
          id="cafe-takeaway-featured-heading"
          style={{
            margin: 0,
            fontFamily: T.fontDisplay,
            fontSize: 'clamp(26px, 4vw, 34px)',
            color: T.cream,
          }}
        >
          Great for takeaway
        </h2>
        <p style={{ marginTop: 8, color: T.creamMuted, maxWidth: 560, lineHeight: 1.5 }}>
          Owner favourites for collection — category starting prices from the live Menu-page
          Sheet. Sizes and options vary. Order on WhatsApp or phone, then collect.
        </p>

        <div
          data-cafe-takeaway-appetite
          style={{
            display: 'grid',
            gap: 12,
            marginTop: 18,
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          }}
        >
          {platterTiles.map((tile) => (
            <Link
              key={tile.id}
              href={tile.href}
              aria-label={tile.alt}
              data-cafe-takeaway-tile={tile.id}
              style={{
                display: 'block',
                borderRadius: 16,
                overflow: 'hidden',
                textDecoration: 'none',
                color: 'inherit',
                border:
                  tile.id === 'platters'
                    ? '1px solid rgba(232,160,106,0.65)'
                    : `1px solid ${T.line}`,
                minHeight: tile.id === 'platters' ? 230 : 190,
                backgroundImage: `
                  linear-gradient(180deg, rgba(20,14,12,0.05) 20%, rgba(20,14,12,0.88) 100%),
                  url(${tile.image})
                `,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative',
                boxShadow:
                  tile.id === 'platters' ? '0 16px 36px rgba(196,92,38,0.28)' : 'none',
              }}
            >
              {tile.id === 'platters' ? (
                <span
                  style={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    padding: '5px 9px',
                    borderRadius: 8,
                    background: 'rgba(20,14,12,0.78)',
                    color: T.flameSoft,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Platters & grill
                </span>
              ) : null}
              <span
                style={{
                  position: 'absolute',
                  left: 12,
                  bottom: 12,
                  right: 12,
                  fontFamily: T.fontDisplay,
                  fontSize: tile.id === 'platters' ? 26 : 22,
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

        <CafeGlassPanel style={{ marginTop: 18, padding: '8px 18px 18px' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {featuredPicks.map((row) => (
              <li
                key={row.id || `${row.categoryId}-${row.name}-${row.description}`}
                data-cafe-takeaway-featured-item
                data-cafe-takeaway-category={row.categoryId}
                data-cafe-favourite-id={row.id || undefined}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  gap: 12,
                  padding: '14px 0',
                  borderBottom: '1px solid rgba(246,239,230,0.1)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: T.flameSoft,
                      fontWeight: 700,
                    }}
                  >
                    {row.category}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      color: T.cream,
                      fontWeight: 700,
                      fontSize: 16,
                      lineHeight: 1.35,
                    }}
                  >
                    {row.href ? (
                      <Link
                        href={row.href}
                        style={{ color: 'inherit', textDecoration: 'none' }}
                      >
                        {row.name}
                      </Link>
                    ) : (
                      row.name
                    )}
                  </div>
                  {row.description ? (
                    <div
                      style={{
                        marginTop: 4,
                        color: T.creamMuted,
                        fontSize: 14,
                        lineHeight: 1.45,
                      }}
                    >
                      {row.description}
                    </div>
                  ) : null}
                </div>
                <div
                  data-cafe-menu-price
                  style={{
                    color: T.flameSoft,
                    fontWeight: 700,
                    fontSize: 17,
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                    paddingTop: 18,
                  }}
                >
                  {row.price_display}
                </div>
              </li>
            ))}
          </ul>
          <div
            style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}
          >
            {(takeawayActions || []).map((a) => (
              <ActionButton
                key={`featured-${a.id}`}
                href={a.href}
                primary={a.kind === 'whatsapp'}
              >
                {a.label}
              </ActionButton>
            ))}
            <ActionButton href={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu`} primary={false}>
              View full menu
            </ActionButton>
          </div>
        </CafeGlassPanel>
      </section>

      <p
        data-cafe-takeaway-channel-note
        style={{ marginTop: 20, color: T.creamMuted, fontSize: 14, lineHeight: 1.5 }}
      >
        Ordering channels: WhatsApp or phone only. Collection at {truth.address}. Website
        chat is not a takeaway channel. Chatbot prompts and WhatsApp automation are not
        changed in this preview.
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
      featuredPicks: selectCafeInternationalTakeawayFeatured(props.menu, 6),
    },
  };
}
