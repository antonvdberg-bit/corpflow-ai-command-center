import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { LUXE_MAURICE_BRAND_TOKENS as T } from '../lib/client/luxe-maurice-brand-theme.js';
import { getRareExclusivePageContent } from '../lib/client/rare-exclusive-page-content.js';
import { LuxHairline } from './LuxeMauriceBrandPrimitives.js';
import {
  LuxeMauriceFontStylesheet,
  RARE_EXCLUSIVE_AVAILABILITY_DISCLAIMER,
  RARE_EXCLUSIVE_PUBLIC_BRAND,
  RareExclusiveEditorialSpine,
  RareExclusiveInteriorHero,
  RareExclusiveIvoryFooter,
  RareExclusiveIvoryHeader,
  RareExclusiveOpaquePanel,
  RareExclusivePromiseGrid,
  RareExclusiveTextLink,
  rareExclusiveCtaGoldStyle,
  rareExclusivePageShellStyle,
} from './RareExclusiveIvoryShell.js';

/**
 * Shared Ivory Editorial layout for Rare & Exclusive content pages
 * (About, Contact, Lifestyle, Destination Mauritius, Private Services).
 *
 * @param {{ pageId: string, seoHost?: string }} props
 */
export default function RareExclusiveContentPage({ pageId, seoHost = '' }) {
  const page = getRareExclusivePageContent(pageId);
  if (!page) {
    return null;
  }

  const host =
    seoHost && String(seoHost).trim()
      ? String(seoHost).trim().toLowerCase().replace(/:\d+$/, '')
      : 'lux.corpflowai.com';
  const canonical = `https://${host}${page.path}`;

  return (
    <div style={rareExclusivePageShellStyle()}>
      <Head>
        <title>{page.metaTitle}</title>
        <meta name="description" content={page.metaDescription} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={page.metaTitle} />
        <meta property="og:description" content={page.metaDescription} />
        <meta property="og:url" content={canonical} />
        <meta property="og:site_name" content={RARE_EXCLUSIVE_PUBLIC_BRAND} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={page.metaTitle} />
        <meta name="twitter:description" content={page.metaDescription} />
        <LuxeMauriceFontStylesheet />
      </Head>

      <RareExclusiveIvoryHeader activeHref={page.path} />

      <RareExclusiveEditorialSpine>
        <RareExclusiveInteriorHero
          eyebrow={page.eyebrow}
          title={page.title}
          body={page.lead}
          visual={page.visual}
        />

        <main style={{ padding: '40px clamp(24px, 4vw, 56px) 96px' }}>
          <div
            style={{
              display: 'grid',
              gap: 22,
              marginBottom: 48,
            }}
          >
            {page.sections.map((section) => (
              <RareExclusiveOpaquePanel key={section.heading}>
                <h2
                  style={{
                    margin: '0 0 12px',
                    fontFamily: T.fontDisplay,
                    fontWeight: 500,
                    fontSize: 'clamp(1.35rem, 2.2vw, 1.75rem)',
                    lineHeight: 1.2,
                    color: T.charcoal,
                  }}
                >
                  {section.heading}
                </h2>
                <div style={{ width: 36, marginBottom: 14 }}>
                  <LuxHairline tone="gold" />
                </div>
                <p
                  style={{
                    margin: 0,
                    fontFamily: T.fontBody,
                    fontSize: 15.5,
                    lineHeight: 1.8,
                    color: '#4A433A',
                    maxWidth: 720,
                  }}
                >
                  {section.body}
                </p>
              </RareExclusiveOpaquePanel>
            ))}
          </div>

          <RareExclusivePromiseGrid />

          <RareExclusiveOpaquePanel
            style={{
              marginTop: 28,
              textAlign: 'center',
              padding: 'clamp(32px, 4vw, 48px)',
            }}
          >
            <p
              style={{
                margin: '0 0 22px',
                fontFamily: T.fontDisplay,
                fontStyle: 'italic',
                fontSize: 'clamp(1.2rem, 2vw, 1.45rem)',
                color: '#4A433A',
              }}
            >
              Invitation only. A privilege, not a portal.
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 20,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Link href={page.ctaHref} style={rareExclusiveCtaGoldStyle()}>
                {page.ctaLabel}
              </Link>
              {page.secondaryCtaHref && page.secondaryCtaLabel ? (
                <RareExclusiveTextLink href={page.secondaryCtaHref}>
                  {page.secondaryCtaLabel}
                </RareExclusiveTextLink>
              ) : null}
            </div>
            <p
              style={{
                margin: '28px auto 0',
                maxWidth: 560,
                fontFamily: T.fontBody,
                fontSize: 12.5,
                lineHeight: 1.7,
                color: T.stone,
              }}
            >
              {RARE_EXCLUSIVE_AVAILABILITY_DISCLAIMER}
            </p>
          </RareExclusiveOpaquePanel>
        </main>
      </RareExclusiveEditorialSpine>

      <RareExclusiveIvoryFooter />
    </div>
  );
}
