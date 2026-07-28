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
  RARE_EXCLUSIVE_AVAILABILITY_DISCLAIMER,
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

export {
  buildLuxPropertyConciergeHref,
  LUX_PROPERTIES_PUBLIC_COPY,
  luxPropertiesCopyAuditGuard,
} from '../lib/client/luxe-maurice-properties-public.js';

function safeStr(v) {
  return v != null ? String(v).trim() : '';
}

function MetaChip({ label }) {
  if (!label) return null;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '6px 10px',
        border: `1px solid ${T.hairlineStone}`,
        background: '#F8F4EE',
        fontFamily: T.fontBody,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: T.charcoal,
      }}
    >
      {label}
    </span>
  );
}

/**
 * Rare & Exclusive Collection `/properties` — Ivory Editorial Private Opportunities.
 * Issue #636: editorial spine, curated intro, status/region/type chips,
 * invitation-only language, graphic modules, opaque readable panels.
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

      <RareExclusiveEditorialSpine>
        <RareExclusiveInteriorHero
          eyebrow={
            empty
              ? LUX_PROPERTIES_PUBLIC_COPY.emptyKicker
              : LUX_PROPERTIES_PUBLIC_COPY.listKicker
          }
          title={
            empty
              ? LUX_PROPERTIES_PUBLIC_COPY.emptyTitle
              : LUX_PROPERTIES_PUBLIC_COPY.listTitle
          }
          body={
            empty
              ? LUX_PROPERTIES_PUBLIC_COPY.emptyBody
              : LUX_PROPERTIES_PUBLIC_COPY.listSubtitle
          }
          visual="photo"
        />

        <main style={{ padding: '36px clamp(20px, 4vw, 48px) 96px' }}>
          <p
            style={{
              margin: '0 0 28px',
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

          <RareExclusiveOpaquePanel style={{ marginBottom: 36 }}>
            <LuxEyebrow tone="charcoal">{LUX_PROPERTIES_PUBLIC_COPY.guidanceTitle}</LuxEyebrow>
            <p
              style={{
                margin: '14px 0 0',
                maxWidth: 640,
                fontSize: 15,
                lineHeight: 1.8,
                color: '#4A433A',
              }}
            >
              {LUX_PROPERTIES_PUBLIC_COPY.guidanceBody}
            </p>
            <p
              style={{
                margin: '16px 0 0',
                maxWidth: 640,
                fontFamily: T.fontDisplay,
                fontStyle: 'italic',
                fontSize: 16,
                lineHeight: 1.6,
                color: T.charcoal,
              }}
            >
              {LUX_PROPERTIES_PUBLIC_COPY.journeyTitle}. {LUX_PROPERTIES_PUBLIC_COPY.journeyBody}
            </p>
          </RareExclusiveOpaquePanel>

          <RareExclusivePromiseGrid />

          {empty ? (
            <section
              style={{
                marginTop: 24,
                padding: 'clamp(56px, 8vw, 96px) clamp(24px, 4vw, 48px)',
                borderTop: `1px solid ${T.hairlineStone}`,
                borderBottom: `1px solid ${T.hairlineStone}`,
                textAlign: 'center',
                background: '#F8F4EE',
              }}
            >
              <div style={{ margin: '0 auto 28px', width: 40 }}>
                <LuxHairline tone="gold" />
              </div>
              <p
                style={{
                  margin: '0 auto 32px',
                  maxWidth: 520,
                  fontFamily: T.fontDisplay,
                  fontStyle: 'italic',
                  fontSize: 'clamp(1.25rem, 2vw, 1.55rem)',
                  lineHeight: 1.55,
                  color: '#4A433A',
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
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 28,
                  marginTop: 16,
                }}
              >
                {list.map((row) => {
                  const slug = safeStr(row.slug);
                  const key = slug.toLowerCase();
                  const cardImg = media[key];
                  const teaser = safeStr(row.short_teaser);
                  const price = row.price_range != null ? safeStr(row.price_range) : '';
                  const region = safeStr(row.region_label);
                  const type = safeStr(row.property_type);
                  const status = row.listing_status != null ? safeStr(row.listing_status) : '';
                  const highlights = Array.isArray(row.highlights)
                    ? row.highlights.map((h) => safeStr(h)).filter(Boolean).slice(0, 3)
                    : [];
                  return (
                    <article
                      key={slug || row.title}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        border: `1px solid ${T.hairlineStone}`,
                        background: '#F8F4EE',
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
                              color: '#4A433A',
                              fontFamily: T.fontDisplay,
                              fontStyle: 'italic',
                              fontSize: 14,
                              background:
                                'linear-gradient(145deg, #E8DFD0 0%, #D4C4A8 50%, #C4B090 100%)',
                            }}
                          >
                            Private — image pending advisor review
                          </div>
                        )}
                      </Link>

                      <div style={{ padding: 22, flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                          <MetaChip label={region || 'Mauritius'} />
                          <MetaChip label={type || 'Residence'} />
                          {status ? <MetaChip label={status} /> : null}
                        </div>
                        <h2
                          style={{
                            margin: '0 0 12px',
                            fontFamily: T.fontDisplay,
                            fontWeight: 500,
                            fontSize: 24,
                            lineHeight: 1.25,
                            color: T.charcoal,
                          }}
                        >
                          <Link
                            href={`/property/${encodeURIComponent(slug)}`}
                            style={{ color: T.charcoal, textDecoration: 'none' }}
                          >
                            {safeStr(row.title)}
                          </Link>
                        </h2>
                        {price ? (
                          <div
                            style={{
                              margin: '0 0 12px',
                              fontFamily: T.fontDisplay,
                              fontStyle: 'italic',
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
                              margin: '0 0 16px',
                              fontSize: 14.5,
                              lineHeight: 1.75,
                              color: '#4A433A',
                              flex: 1,
                            }}
                          >
                            {teaser}
                          </p>
                        ) : (
                          <div style={{ flex: 1 }} />
                        )}
                        {highlights.length ? (
                          <ul
                            style={{
                              listStyle: 'none',
                              margin: '0 0 18px',
                              padding: 0,
                            }}
                          >
                            {highlights.map((h) => (
                              <li
                                key={h}
                                style={{
                                  padding: '6px 0',
                                  borderTop: `1px solid ${T.hairlineSoft}`,
                                  fontSize: 13,
                                  lineHeight: 1.55,
                                  color: '#4A433A',
                                }}
                              >
                                {h}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center' }}>
                          <RareExclusiveTextLink href={`/property/${encodeURIComponent(slug)}`}>
                            {LUX_PROPERTIES_PUBLIC_COPY.cardCtaDetails}
                          </RareExclusiveTextLink>
                          <RareExclusiveTextLink href={buildLuxPropertyConciergeHref(slug)}>
                            {LUX_PROPERTIES_PUBLIC_COPY.cardCtaConcierge}
                          </RareExclusiveTextLink>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <RareExclusiveOpaquePanel style={{ marginTop: 48, textAlign: 'center' }}>
                <LuxEyebrow tone="charcoal" center>
                  Private Advisory
                </LuxEyebrow>
                <p
                  style={{
                    margin: '18px auto 24px',
                    maxWidth: 480,
                    fontFamily: T.fontDisplay,
                    fontStyle: 'italic',
                    fontSize: 'clamp(1.2rem, 2vw, 1.45rem)',
                    lineHeight: 1.5,
                    color: T.charcoal,
                  }}
                >
                  A private advisor responds within one business day.
                </p>
                <p
                  style={{
                    margin: '0 auto 28px',
                    maxWidth: 520,
                    fontSize: 13.5,
                    lineHeight: 1.7,
                    color: '#4A433A',
                  }}
                >
                  {RARE_EXCLUSIVE_AVAILABILITY_DISCLAIMER}
                </p>
                <Link href={buildLuxPropertyConciergeHref(null)} style={rareExclusiveCtaGoldStyle()}>
                  {LUX_PROPERTIES_PUBLIC_COPY.emptyCta}
                </Link>
              </RareExclusiveOpaquePanel>
            </>
          )}
        </main>
      </RareExclusiveEditorialSpine>

      <RareExclusiveIvoryFooter />
    </div>
  );
}
