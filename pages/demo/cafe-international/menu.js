import React from 'react';

import CafeInternationalPreviewShell, {
  CafeInternationalTheme as T,
  CafeGlassPanel,
  ActionButton,
} from '../../../components/cafe-international/CafeInternationalPreviewShell.js';
import { CAFE_INTERNATIONAL_VISUALS } from '../../../lib/website-rescue/cafe-international-assets.js';
import {
  CAFE_INTERNATIONAL_PREVIEW_BASE,
  buildCafeInternationalMenuJsonLd,
  cafeInternationalWhatsAppHref,
} from '../../../lib/website-rescue/cafe-international-preview.js';
import { getCafeInternationalPreviewProps } from '../../../lib/website-rescue/cafe-international-preview-server.js';

/** Visible label for every category WhatsApp CTA — fixed wording. */
const CATEGORY_WHATSAPP_CTA_LABEL = 'Order on WhatsApp';

function categoryWhatsAppPrefill(categoryName) {
  const label = String(categoryName || 'the menu').trim();
  return `Hi Flame! I'd like to order from ${label}.\n\nPlease confirm availability and pickup time.`;
}

export default function CafeInternationalMenuPage({ truth, menu, nav }) {
  const categories = (menu.categories || []).filter((c) => c.id !== 'extras');
  const menuJsonLd = buildCafeInternationalMenuJsonLd(
    truth,
    menu,
    `https://corpflowai.com${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu`,
  );

  return (
    <CafeInternationalPreviewShell
      title={`Menu — ${truth.public_name}`}
      description="Takeaway menu for Café International — prices from the live Menu-page Google Sheet."
      canonicalPath={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu`}
      jsonLd={menuJsonLd}
      nav={nav}
      activeHref={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu`}
      truth={truth}
    >
      <style>{`
        [data-cafe-menu-item] {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 8px 16px;
          align-items: start;
          padding: 14px 0;
          border-top: 1px solid rgba(246,239,230,0.1);
        }
        [data-cafe-menu-item]:first-of-type { border-top: none; padding-top: 4px; }
        @media (max-width: 560px) {
          [data-cafe-menu-item] {
            grid-template-columns: 1fr;
            gap: 4px;
          }
          [data-cafe-menu-price] {
            justify-self: start !important;
            font-size: 16px !important;
          }
        }
      `}</style>

      <div
        style={{
          borderRadius: 18,
          overflow: 'hidden',
          marginTop: 8,
          minHeight: 200,
          backgroundImage: `
            linear-gradient(180deg, rgba(20,14,12,0.35), rgba(20,14,12,0.88)),
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
          Menu
        </h1>
        <p style={{ marginTop: 10, color: T.creamMuted, maxWidth: 560, lineHeight: 1.5 }}>
          Browse by section, then order the whole category on WhatsApp — not through
          website chat.
        </p>
        <div style={{ marginTop: 16 }}>
          <ActionButton href={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/takeaway`} primary>
            Takeaway options
          </ActionButton>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 22, marginTop: 26 }}>
        {categories.map((cat) => {
          const waHref = cafeInternationalWhatsAppHref(
            truth.public_phone,
            categoryWhatsAppPrefill(cat.name),
          );

          return (
            <CafeGlassPanel
              key={cat.id}
              id={cat.id}
              as="section"
              data-cafe-menu-category={cat.id}
              style={{ padding: '22px 18px 20px' }}
            >
              <header style={{ marginBottom: 6 }}>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: T.flameSoft,
                    fontWeight: 800,
                  }}
                >
                  Section
                </div>
                <h2
                  style={{
                    margin: '6px 0 0',
                    fontFamily: T.fontDisplay,
                    fontSize: 'clamp(24px, 3.5vw, 30px)',
                    color: T.cream,
                    lineHeight: 1.15,
                  }}
                >
                  {cat.name}
                </h2>
                {cat.summary ? (
                  <p
                    style={{
                      margin: '8px 0 0',
                      color: T.creamMuted,
                      lineHeight: 1.5,
                      fontSize: 15,
                      maxWidth: 520,
                    }}
                  >
                    {cat.summary}
                  </p>
                ) : null}
              </header>

              <div style={{ marginTop: 14 }} data-cafe-menu-items>
                {(cat.items || []).map((item, idx) => {
                  const price =
                    item.price_display ||
                    (item.price_mur != null ? `Rs ${item.price_mur}` : '');
                  return (
                    <div
                      key={`${item.name}-${item.description || ''}-${idx}`}
                      data-cafe-menu-item
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            color: T.cream,
                            fontWeight: 700,
                            fontSize: 16,
                            lineHeight: 1.35,
                            letterSpacing: '0.01em',
                          }}
                        >
                          {item.name}
                        </div>
                        {item.description ? (
                          <div
                            style={{
                              marginTop: 4,
                              color: T.creamMuted,
                              fontSize: 14,
                              lineHeight: 1.45,
                            }}
                          >
                            {item.description}
                          </div>
                        ) : null}
                      </div>
                      {price ? (
                        <div
                          data-cafe-menu-price
                          style={{
                            color: T.flameSoft,
                            fontWeight: 700,
                            fontSize: 17,
                            fontVariantNumeric: 'tabular-nums',
                            whiteSpace: 'nowrap',
                            justifySelf: 'end',
                            paddingTop: 1,
                          }}
                        >
                          {price}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div
                data-cafe-category-whatsapp
                style={{
                  marginTop: 18,
                  paddingTop: 16,
                  borderTop: '1px solid rgba(246,239,230,0.14)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                  alignItems: 'center',
                }}
              >
                <ActionButton href={waHref} primary>
                  {CATEGORY_WHATSAPP_CTA_LABEL}
                </ActionButton>
              </div>
            </CafeGlassPanel>
          );
        })}
      </div>

      {(menu.notes || []).length ? (
        <aside style={{ marginTop: 24, color: T.creamMuted, fontSize: 13, lineHeight: 1.5 }}>
          {(menu.notes || []).map((n) => (
            <p key={n} style={{ margin: '0 0 8px' }}>
              {n}
            </p>
          ))}
        </aside>
      ) : null}
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
