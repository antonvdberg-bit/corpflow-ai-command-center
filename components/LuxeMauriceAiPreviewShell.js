import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { LUXE_MAURICE_BRAND_TOKENS as T } from '../lib/client/luxe-maurice-brand-theme.js';
import {
  LUXE_MAURICE_AI_BASE,
  LUXE_MAURICE_AI_MULTI_CHANNEL_TAGLINE,
  luxeMauriceAiBuyerCategoryHref,
  luxeMauriceAiCatalogueCategoryHref,
  luxeMauriceAiCategoryChip,
} from '../lib/client/luxe-maurice-ai-layout.js';
import { LUXE_MAURICE_AI_ACCESS_CATEGORIES } from '../lib/client/luxe-maurice-ai-data.js';
import {
  LuxeMauriceFontStylesheet,
  LuxeMauriceWordmark,
  LuxHairline,
} from './LuxeMauriceBrandPrimitives.js';

const NAV = [
  { href: LUXE_MAURICE_AI_BASE, label: 'Home', activeKey: 'home' },
  { href: `${LUXE_MAURICE_AI_BASE}/properties`, label: 'Access catalogue', activeKey: 'catalogue' },
  { href: `${LUXE_MAURICE_AI_BASE}/buyer`, label: 'Request access', activeKey: 'request' },
  { href: `${LUXE_MAURICE_AI_BASE}/crm`, label: 'Advisor pipeline', activeKey: 'pipeline' },
];

/** Shell nav categories — residences + four non-property channels for quick access. */
const QUICK_CATEGORIES = LUXE_MAURICE_AI_ACCESS_CATEGORIES.filter((c) =>
  ['residence', 'yacht_marine', 'aviation_vip', 'island_experience', 'advisory_mandate'].includes(c.key),
);

/**
 * Shared shell for LuxeMaurice AI v2 preview routes.
 * @param {{ title: string, description?: string, children: React.ReactNode, active?: string }} props
 */
export default function LuxeMauriceAiPreviewShell({ title, description, children, active }) {
  const pageTitle = title.includes('LuxeMaurice') ? title : `${title} · LuxeMaurice AI`;

  return (
    <div
      style={{
        fontFamily: T.fontBody,
        minHeight: '100vh',
        background: T.charcoal,
        color: T.ivory,
      }}
    >
      <Head>
        <title>{pageTitle}</title>
        {description ? <meta name="description" content={description} /> : null}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <LuxeMauriceFontStylesheet />
      </Head>

      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          padding: '16px clamp(16px, 4vw, 56px) 14px',
          borderBottom: `1px solid ${T.hairlineSoft}`,
          background: 'rgba(10, 10, 10, 0.94)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 14,
          }}
        >
          <LuxeMauriceWordmark variant="compact" tone="ivory" showSignature={false} href={LUXE_MAURICE_AI_BASE} />
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: T.gold,
              border: `1px solid ${T.hairline}`,
              padding: '6px 10px',
            }}
          >
            Multi-channel preview
          </span>
        </div>

        <p
          style={{
            margin: '0 0 14px',
            fontSize: 12,
            lineHeight: 1.55,
            color: T.ivoryMuted,
            maxWidth: 720,
          }}
        >
          {LUXE_MAURICE_AI_MULTI_CHANNEL_TAGLINE}
        </p>

        <nav
          aria-label="Primary"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 12,
          }}
        >
          {NAV.map((item) => {
            const isActive = active === item.activeKey;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  ...luxeMauriceAiCategoryChip(isActive),
                  minHeight: 44,
                  padding: '10px 14px',
                  color: isActive ? T.charcoal : T.ivory,
                  background: isActive ? T.gold : 'rgba(255,255,255,0.04)',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div
          aria-label="Access categories"
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 4,
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
          }}
        >
          <Link href={luxeMauriceAiCatalogueCategoryHref('')} style={luxeMauriceAiCategoryChip(false)}>
            All channels
          </Link>
          {QUICK_CATEGORIES.map((cat) => (
            <Link
              key={cat.key}
              href={luxeMauriceAiCatalogueCategoryHref(cat.key)}
              style={luxeMauriceAiCategoryChip(false)}
            >
              {cat.short}
            </Link>
          ))}
        </div>
      </header>

      <main>{children}</main>

      <footer
        style={{
          marginTop: 48,
          padding: '32px clamp(16px, 4vw, 56px) 40px',
          background: T.charcoalDeep,
          borderTop: `1px solid ${T.hairlineSoft}`,
        }}
      >
        <LuxHairline />
        <p
          style={{
            marginTop: 20,
            fontFamily: T.fontDisplay,
            fontSize: 'clamp(20px, 4vw, 24px)',
            color: T.ivory,
            lineHeight: 1.35,
          }}
        >
          Private access across every channel
        </p>
        <p style={{ marginTop: 10, fontSize: 13, color: T.ivoryMuted, maxWidth: 560, lineHeight: 1.6 }}>
          LuxeMaurice AI — curated residences, yachts, aviation, island experiences, and advisory introductions.
          Discreet by design; not an open property marketplace.
        </p>
        <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Link href={`${LUXE_MAURICE_AI_BASE}/buyer`} style={luxeMauriceAiCategoryChip(false)}>
            Request private access
          </Link>
          <Link href={`${LUXE_MAURICE_AI_BASE}/crm`} style={luxeMauriceAiCategoryChip(false)}>
            Advisor pipeline
          </Link>
        </div>
      </footer>
    </div>
  );
}

export { LUXE_MAURICE_AI_BASE };
