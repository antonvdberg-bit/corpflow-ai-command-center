import React from 'react';

import CafeInternationalPreviewShell, {
  CafeInternationalTheme as T,
} from '../../../components/cafe-international/CafeInternationalPreviewShell.js';
import { CAFE_INTERNATIONAL_PREVIEW_BASE } from '../../../lib/website-rescue/cafe-international-preview.js';
import { getCafeInternationalPreviewProps } from '../../../lib/website-rescue/cafe-international-preview-server.js';

export default function CafeInternationalMenuPage({ truth, menu, nav }) {
  return (
    <CafeInternationalPreviewShell
      title={`Menu — ${truth.public_name}`}
      description="Crawlable menu categories for Café International. Item prices fill from the owner sheet next."
      canonicalPath={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu`}
      nav={nav}
      activeHref={`${CAFE_INTERNATIONAL_PREVIEW_BASE}/menu`}
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
        Menu
      </h1>
      <p style={{ marginTop: 12, color: T.creamMuted, maxWidth: 560, lineHeight: 1.55 }}>
        Categories guests look for — visible on the page for phones and search.
        Full dish names, descriptions, sizes and MUR prices will be filled from
        the owner-approved menu sheet (not invented in this preview).
      </p>

      <div style={{ display: 'grid', gap: 14, marginTop: 28 }}>
        {(menu.categories || []).map((cat) => (
          <section
            key={cat.id}
            id={cat.id}
            style={{
              border: '1px solid rgba(246,239,230,0.16)',
              borderRadius: 14,
              padding: '18px 16px',
              background: 'rgba(0,0,0,0.22)',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontFamily: T.fontDisplay,
                fontSize: 26,
                color: T.cream,
              }}
            >
              {cat.name}
            </h2>
            <p style={{ margin: '8px 0 0', color: T.creamMuted, lineHeight: 1.5 }}>
              {cat.summary}
            </p>
            {Array.isArray(cat.items) && cat.items.length > 0 ? (
              <ul>
                {cat.items.map((item) => (
                  <li key={item.name}>{item.name}</li>
                ))}
              </ul>
            ) : (
              <p
                style={{
                  margin: '14px 0 0',
                  fontSize: 14,
                  color: T.flameSoft,
                  lineHeight: 1.45,
                }}
              >
                Item list pending owner menu sheet snapshot ({cat.items_status}).
              </p>
            )}
          </section>
        ))}
      </div>

      {(menu.notes || []).length ? (
        <aside style={{ marginTop: 28, color: T.creamMuted, fontSize: 13, lineHeight: 1.5 }}>
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
