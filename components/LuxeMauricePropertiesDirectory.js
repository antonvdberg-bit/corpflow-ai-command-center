import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { LUXE_MAURICE_BRAND_TOKENS as T } from '../lib/client/luxe-maurice-brand-theme.js';
import {
  buildLuxPropertyConciergeHref,
  LUX_PROPERTIES_PUBLIC_COPY,
} from '../lib/client/luxe-maurice-properties-public.js';
import { LuxEyebrow, LuxHairline } from './LuxeMauriceBrandPrimitives.js';
import {
  LuxeMauriceFontStylesheet,
  RareExclusiveIvoryFooter,
  RareExclusiveIvoryHeader,
  rareExclusiveCtaGoldStyle,
  rareExclusivePageShellStyle,
} from './RareExclusiveIvoryShell.js';

export {
  buildLuxPropertyConciergeHref,
  LUX_PROPERTIES_PUBLIC_COPY,
  luxPropertiesCopyAuditGuard,
} from '../lib/client/luxe-maurice-properties-public.js';

function safeStr(v) {
  return v != null ? String(v).trim() : '';
}

/**
 * Rare & Exclusive Collection `/properties` — Ivory Editorial Private Opportunities.
 *
 * Shared design system with homepage / concierge / property detail (Issue #633).
 * Renders published rows only; premium empty state when empty. Demo inventory
 * is excluded upstream. No fake feed inventory.
 */
export default function LuxeMauricePropertiesDirectory({ listings, cardMediaBySlug }) {
  const list = Array.isArray(listings) ? listings : [];
  const media = cardMediaBySlug && typeof cardMediaBySlug === 'object' ? cardMediaBySlug : {};
  const empty = list.length === 0;

  return (
    <div style={rareExclusivePageShellStyle()}>
      <Head>
        <title>{LUX_PROPERTIES_PUBLIC_COPY.pageTitle}</title>
        <LuxeMauriceFontStylesheet />
      </Head>

      <RareExclusiveIvoryHeader activeHref="/properties" />

      <main style={{ maxWidth: 1180, margin: '0 auto', padding: '64px clamp(20px, 4vw, 56px) 120px' }}>
        <div style={{ maxWidth: 760, marginBottom: 80 }}>
          <LuxEyebrow tone="charcoal">
            {empty
              ? LUX_PROPERTIES_PUBLIC_COPY.emptyKicker
              : LUX_PROPERTIES_PUBLIC_COPY.listKicker}
          </LuxEyebrow>
          <h1
            style={{
              margin: '28px 0 24px',
              fontFamily: T.fontDisplay,
              fontWeight: 400,
              fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
              lineHeight: 1.1,
              letterSpacing: -0.4,
              color: T.charcoal,
            }}
          >
            {empty
              ? LUX_PROPERTIES_PUBLIC_COPY.emptyTitle
              : LUX_PROPERTIES_PUBLIC_COPY.listTitle}
          </h1>
          <p
            style={{
              margin: 0,
              maxWidth: 600,
              fontFamily: T.fontBody,
              fontSize: 16,
              lineHeight: 1.85,
              color: T.stone,
            }}
          >
            {empty
              ? LUX_PROPERTIES_PUBLIC_COPY.emptyBody
              : LUX_PROPERTIES_PUBLIC_COPY.listSubtitle}
          </p>
          <p
            style={{
              margin: '20px 0 0',
              fontFamily: T.fontBody,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: T.gold,
            }}
          >
            {LUX_PROPERTIES_PUBLIC_COPY.headerTagline}
          </p>
        </div>

        {empty ? (
          <section
            style={{
              padding: 'clamp(72px, 12vw, 140px) clamp(24px, 6vw, 80px)',
              borderTop: `1px solid ${T.hairlineStone}`,
              borderBottom: `1px solid ${T.hairlineStone}`,
              textAlign: 'center',
              background: '#FBF8F2',
            }}
          >
            <div style={{ margin: '0 auto 32px', width: 40 }}>
              <LuxHairline tone="gold" />
            </div>
            <p
              style={{
                margin: '0 auto 36px',
                maxWidth: 560,
                fontFamily: T.fontDisplay,
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 'clamp(1.3rem, 2.2vw, 1.6rem)',
                lineHeight: 1.55,
                color: T.stone,
              }}
            >
              Each opportunity is prepared for review before it appears here. Speak with
              a private advisor for availability, terms, and next steps.
            </p>
            <Link href={buildLuxPropertyConciergeHref(null)} style={rareExclusiveCtaGoldStyle()}>
              {LUX_PROPERTIES_PUBLIC_COPY.emptyCta}
            </Link>
          </section>
        ) : (
          <>
            <LuxHairline tone="stone" />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 'clamp(48px, 6vw, 80px) clamp(32px, 4vw, 56px)',
                paddingTop: 64,
              }}
            >
              {list.map((row) => {
                const slug = safeStr(row.slug);
                const key = slug.toLowerCase();
                const cardImg = media[key];
                const teaser = safeStr(row.short_teaser);
                const price = row.price_range != null ? safeStr(row.price_range) : '';
                return (
                  <article
                    key={slug || row.title}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 24,
                    }}
                  >
                    <Link
                      href={`/property/${encodeURIComponent(slug)}`}
                      style={{
                        display: 'block',
                        aspectRatio: '4 / 3',
                        background: '#E7DED0',
                        overflow: 'hidden',
                        textDecoration: 'none',
                        border: `1px solid ${T.hairlineStone}`,
                      }}
                    >
                      {cardImg && cardImg.src ? (
                        <img
                          src={cardImg.src}
                          srcSet={cardImg.src_set || undefined}
                          sizes={cardImg.src_set ? '(max-width: 640px) 100vw, 360px' : undefined}
                          alt={safeStr(cardImg.alt) || `${slug} · private opportunity`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                          decoding="async"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: T.stone,
                            fontFamily: T.fontDisplay,
                            fontStyle: 'italic',
                            fontSize: 14,
                          }}
                        >
                          Private — image pending advisor review
                        </div>
                      )}
                    </Link>

                    <div>
                      <div
                        style={{
                          fontFamily: T.fontBody,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.32em',
                          textTransform: 'uppercase',
                          color: T.gold,
                        }}
                      >
                        {safeStr(row.region_label)} · {safeStr(row.property_type)}
                      </div>
                      <h2
                        style={{
                          margin: '16px 0 14px',
                          fontFamily: T.fontDisplay,
                          fontWeight: 500,
                          fontSize: 26,
                          lineHeight: 1.25,
                          color: T.charcoal,
                          letterSpacing: 0.2,
                        }}
                      >
                        <Link
                          href={`/property/${encodeURIComponent(slug)}`}
                          style={{ color: T.charcoal, textDecoration: 'none' }}
                        >
                          {safeStr(row.title)}
                        </Link>
                      </h2>
                      {row.listing_status ? (
                        <div
                          style={{
                            margin: '0 0 12px',
                            fontFamily: T.fontBody,
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.22em',
                            textTransform: 'uppercase',
                            color: T.stone,
                          }}
                        >
                          {safeStr(row.listing_status)}
                        </div>
                      ) : null}
                      {price ? (
                        <div
                          style={{
                            margin: '0 0 14px',
                            fontFamily: T.fontDisplay,
                            fontStyle: 'italic',
                            fontWeight: 500,
                            fontSize: 17,
                            color: T.gold,
                          }}
                        >
                          {price}
                        </div>
                      ) : null}
                      {teaser ? (
                        <p
                          style={{
                            margin: '0 0 22px',
                            fontFamily: T.fontBody,
                            fontSize: 14.5,
                            lineHeight: 1.85,
                            color: T.stone,
                          }}
                        >
                          {teaser}
                        </p>
                      ) : null}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
                        <Link
                          href={`/property/${encodeURIComponent(slug)}`}
                          style={{
                            fontFamily: T.fontBody,
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.28em',
                            textTransform: 'uppercase',
                            color: T.gold,
                            textDecoration: 'none',
                            borderBottom: `1px solid ${T.hairline}`,
                            paddingBottom: 4,
                          }}
                        >
                          {LUX_PROPERTIES_PUBLIC_COPY.cardCtaDetails} →
                        </Link>
                        <Link
                          href={buildLuxPropertyConciergeHref(slug)}
                          style={{
                            fontFamily: T.fontBody,
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.28em',
                            textTransform: 'uppercase',
                            color: T.stone,
                            textDecoration: 'none',
                          }}
                        >
                          {LUX_PROPERTIES_PUBLIC_COPY.cardCtaConcierge}
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div
              style={{
                marginTop: 120,
                padding: '64px 32px',
                borderTop: `1px solid ${T.hairlineStone}`,
                borderBottom: `1px solid ${T.hairlineStone}`,
                textAlign: 'center',
                background: '#FBF8F2',
              }}
            >
              <LuxEyebrow tone="charcoal" center>
                Private Advisory
              </LuxEyebrow>
              <p
                style={{
                  margin: '24px auto 32px',
                  maxWidth: 520,
                  fontFamily: T.fontDisplay,
                  fontStyle: 'italic',
                  fontWeight: 400,
                  fontSize: 'clamp(1.3rem, 2.2vw, 1.6rem)',
                  lineHeight: 1.5,
                  color: T.charcoal,
                }}
              >
                A private advisor responds within one business day.
              </p>
              <Link href={buildLuxPropertyConciergeHref(null)} style={rareExclusiveCtaGoldStyle()}>
                {LUX_PROPERTIES_PUBLIC_COPY.emptyCta}
              </Link>
            </div>
          </>
        )}
      </main>

      <RareExclusiveIvoryFooter />
    </div>
  );
}
