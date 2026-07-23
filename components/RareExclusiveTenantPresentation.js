import React from 'react';
import Head from 'next/head';

import {
  LUXE_MAURICE_BRAND_TOKENS as T,
  LUXE_MAURICE_BRAND_SIGNATURE,
} from '../lib/client/luxe-maurice-brand-theme.js';
import { LuxeMauriceFontStylesheet } from './LuxeMauriceBrandPrimitives.js';

/**
 * Rare & Exclusive Collection — Option A Ivory Editorial homepage.
 *
 * lux.corpflowai.com is the client test environment; Vercel branch previews are internal only.
 *
 * Scoped to the lux_acquisition tenant homepage only (see pages/index.js).
 * Does not affect corpflowai.com apex marketing, management/admin, or other tenants.
 * LuxeMauriceTenantPresentation.js remains intact as the fallback presentation.
 */
export default function RareExclusiveTenantPresentation({ site }) {
  const s = site || {};
  const operatorDebug = s.client_ui?.operator_debug === true;
  const ctaHref =
    (s.hero && typeof s.hero.cta_href === 'string' && s.hero.cta_href.trim()) || '/concierge';
  const ctaLabel =
    (s.hero && typeof s.hero.cta_label === 'string' && s.hero.cta_label.trim()) ||
    'Request a private consultation';

  const pageTitle =
    'Rare & Exclusive Collection · Private Wealth & Lifestyle Platform for Mauritius';
  const seoDescription =
    'Rare & Exclusive Collection — curated private opportunities, private advisory, and concierge-led access for discerning clients considering Mauritius.';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.ivoryPage || T.ivory || '#F4EFE8',
        color: T.charcoal || '#111111',
        fontFamily: T.fontBody,
      }}
    >
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={seoDescription} />
        <LuxeMauriceFontStylesheet />
      </Head>

      <main
        style={{
          maxWidth: 920,
          margin: '0 auto',
          padding: 'clamp(72px, 14vh, 140px) 24px clamp(64px, 10vh, 120px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 0,
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: T.fontBody,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.36em',
            textTransform: 'uppercase',
            color: T.gold || '#A8842C',
          }}
        >
          Rare &amp; Exclusive Collection
        </p>

        <h1
          style={{
            margin: '48px 0 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0,
            fontWeight: 400,
          }}
        >
          <span
            style={{
              fontFamily: T.fontDisplay,
              fontSize: 'clamp(3.2rem, 9vw, 6.4rem)',
              lineHeight: 0.9,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: T.charcoal || '#111111',
              paddingLeft: '0.16em',
            }}
          >
            Rare
          </span>
          <span
            aria-hidden="true"
            style={{
              margin: '0.28em 0 0.18em',
              fontFamily: T.fontDisplay,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(1.6rem, 4vw, 2.8rem)',
              lineHeight: 1,
              color: T.gold || '#A8842C',
            }}
          >
            &amp;
          </span>
          <span
            style={{
              fontFamily: T.fontDisplay,
              fontSize: 'clamp(3.2rem, 9vw, 6.4rem)',
              lineHeight: 0.9,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: T.charcoal || '#111111',
              paddingLeft: '0.16em',
            }}
          >
            Exclusive
          </span>
        </h1>

        <p
          style={{
            margin: '36px 0 0',
            maxWidth: 420,
            fontFamily: T.fontBody,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: T.stone || '#6B6256',
            lineHeight: 1.6,
          }}
        >
          {LUXE_MAURICE_BRAND_SIGNATURE}
        </p>

        <span
          aria-hidden="true"
          style={{
            display: 'block',
            width: 56,
            height: 1,
            marginTop: 40,
            background: T.hairlineStone || 'rgba(107, 98, 86, 0.22)',
          }}
        />

        <p
          style={{
            margin: '36px 0 0',
            maxWidth: 480,
            fontFamily: T.fontBody,
            fontSize: 15,
            lineHeight: 1.7,
            color: T.stoneSoft || T.stone || '#8A8278',
          }}
        >
          A private wealth &amp; lifestyle presentation for Mauritius — curated,
          considered, and invitation-led.
        </p>

        <a
          href={ctaHref}
          style={{
            display: 'inline-block',
            marginTop: 48,
            padding: '16px 28px',
            borderRadius: T.radiusEditorial || 2,
            background: T.gold || '#A8842C',
            color: T.charcoal || '#111111',
            fontFamily: T.fontBody,
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          {ctaLabel}
        </a>

        {operatorDebug ? (
          <p
            style={{
              marginTop: 28,
              fontSize: 11,
              letterSpacing: '0.08em',
              color: T.stoneSoft || '#8A8278',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            }}
          >
            tenant: {String(s.tenant_id || 'n/a')} · ivory editorial · lux-only
          </p>
        ) : null}
      </main>
    </div>
  );
}
