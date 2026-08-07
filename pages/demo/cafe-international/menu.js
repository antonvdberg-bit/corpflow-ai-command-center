import React from 'react';

import CafeInternationalPreviewShell, {
  CafeInternationalTheme as T,
  CafeGlassPanel,
  ActionButton,
} from '../../../components/cafe-international/CafeInternationalPreviewShell.js';
import { CAFE_INTERNATIONAL_VISUALS } from '../../../lib/website-rescue/cafe-international-assets.js';
import {
  CAFE_INTERNATIONAL_PREVIEW_BASE,
  cafeInternationalWhatsAppHref,
} from '../../../lib/website-rescue/cafe-international-preview.js';
import { getCafeInternationalPreviewProps } from '../../../lib/website-rescue/cafe-international-preview-server.js';

export default function CafeInternationalMenuPage({ truth, menu, nav }) {
  const categories = (menu.categories || []).filter((c) => c.id !== 'extras');

  return (
    <CafeInternationalPreviewShell
      title={`Menu — ${truth.public_name}`}
      description="Takeaway menu for Café International — prices from the live Menu-page Google Sheet."
      canonicalPath={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu`}
      nav={nav}
      activeHref={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu`}
      truth={truth}
    >
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
          Same prices as your live Menu-page Google Sheet. Order takeaway on WhatsApp —
          not through website chat.
        </p>
      </div>

      <div style={{ display: 'grid', gap: 16, marginTop: 22 }}>
        {categories.map((cat) => (
          <CafeGlassPanel key={cat.id} id={cat.id} as="section" style={{ padding: '18px 16px' }}>
            <h2
              style={{
                margin: 0,
                fontFamily: T.fontDisplay,
                fontSize: 26,
                color: T.flameSoft,
              }}
            >
              {cat.name}
            </h2>
            {cat.summary ? (
              <p style={{ margin: '8px 0 0', color: T.creamMuted, lineHeight: 1.45 }}>
                {cat.summary}
              </p>
            ) : null}
            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              {(cat.items || []).map((item, idx) => {
                const price =
                  item.price_display ||
                  (item.price_mur != null ? `Rs ${item.price_mur}` : '');
                const wa = cafeInternationalWhatsAppHref(
                  truth.public_phone,
                  `Hi Flame! I'd like to order:\n\n${item.name}${price ? ` - ${price}` : ''}\n\nPlease confirm availability and pickup time.`,
                );
                return (
                  <div
                    key={`${item.name}-${item.description || ''}-${idx}`}
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 10,
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      padding: '12px 0',
                      borderTop: '1px solid rgba(246,239,230,0.1)',
                    }}
                  >
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={{ color: T.cream, fontWeight: 700, fontSize: 16 }}>
                        {item.name}
                        {price ? (
                          <span style={{ color: T.flameSoft, marginLeft: 10 }}>{price}</span>
                        ) : null}
                      </div>
                      {item.description ? (
                        <div style={{ marginTop: 4, color: T.creamMuted, fontSize: 14 }}>
                          {item.description}
                        </div>
                      ) : null}
                    </div>
                    <ActionButton href={wa} primary>
                      WhatsApp
                    </ActionButton>
                  </div>
                );
              })}
            </div>
          </CafeGlassPanel>
        ))}
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
