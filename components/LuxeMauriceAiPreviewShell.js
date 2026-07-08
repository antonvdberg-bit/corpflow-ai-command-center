import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { LUXE_MAURICE_BRAND_TOKENS as T } from '../lib/client/luxe-maurice-brand-theme.js';
import {
  LuxeMauriceFontStylesheet,
  LuxeMauriceWordmark,
  LuxHairline,
} from './LuxeMauriceBrandPrimitives.js';

const BASE = '/client/luxe-maurice-ai';

const NAV = [
  { href: BASE, label: 'Home' },
  { href: `${BASE}/properties`, label: 'Properties' },
  { href: `${BASE}/buyer`, label: 'Enquire' },
  { href: `${BASE}/crm`, label: 'Advisor view' },
];

/**
 * Shared shell for LuxeMaurice AI v1 preview routes.
 * @param {{ title: string, description?: string, children: React.ReactNode, active?: string }} props
 */
export default function LuxeMauriceAiPreviewShell({ title, description, children, active }) {
  const pageTitle = title.includes('LuxeMaurice') ? title : `${title} · LuxeMaurice AI v1 preview`;

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
        <LuxeMauriceFontStylesheet />
      </Head>

      <header
        style={{
          padding: '24px clamp(20px, 4vw, 56px) 20px',
          borderBottom: `1px solid ${T.hairlineSoft}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 20,
          }}
        >
          <LuxeMauriceWordmark variant="compact" tone="ivory" showSignature={false} href={BASE} />
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: T.gold,
              border: `1px solid ${T.hairline}`,
              padding: '6px 12px',
            }}
          >
            v1 preview
          </span>
        </div>
        <nav
          aria-label="Primary"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px 24px',
          }}
        >
          {NAV.map((item) => {
            const isActive = active === item.href || active === item.label.toLowerCase();
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: isActive ? T.gold : T.ivoryMuted,
                  textDecoration: 'none',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main>{children}</main>

      <footer
        style={{
          marginTop: 64,
          padding: '32px clamp(20px, 4vw, 56px) 48px',
          background: T.charcoalDeep,
          borderTop: `1px solid ${T.hairlineSoft}`,
        }}
      >
        <LuxHairline />
        <p
          style={{
            marginTop: 24,
            fontFamily: T.fontDisplay,
            fontSize: 22,
            color: T.ivory,
            lineHeight: 1.35,
          }}
        >
          Private wealth & lifestyle opportunities in Mauritius
        </p>
        <p style={{ marginTop: 12, fontSize: 13, color: T.ivoryMuted, maxWidth: 520, lineHeight: 1.6 }}>
          LuxeMaurice AI v1 preview — curated property intelligence, buyer enquiry, and advisor lead
          workflow. Discreet by design.
        </p>
      </footer>
    </div>
  );
}

export { BASE as LUXE_MAURICE_AI_BASE };
