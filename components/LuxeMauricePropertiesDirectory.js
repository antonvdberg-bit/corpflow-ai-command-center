import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { LUXE_MAURICE_BRAND_TOKENS as T } from '../lib/client/luxe-maurice-brand-theme.js';
import {
  buildLuxPropertyConciergeHref,
  LUX_PROPERTIES_PUBLIC_COPY,
} from '../lib/client/luxe-maurice-properties-public.js';
import {
  LuxeMauriceFontStylesheet,
  LuxeMauriceWordmark,
  LuxEyebrow,
  LuxHairline,
} from './LuxeMauriceBrandPrimitives.js';

export {
  buildLuxPropertyConciergeHref,
  LUX_PROPERTIES_PUBLIC_COPY,
  luxPropertiesCopyAuditGuard,
} from '../lib/client/luxe-maurice-properties-public.js';

function safeStr(v) {
  return v != null ? String(v).trim() : '';
}

/**
 * LuxeMaurice `/properties` — *Private Opportunities* directory.
 *
 * Brand-fidelity rebuild (2026-06-11). Editorial layout — each opportunity
 * presents as a private investment memorandum (full-bleed photo + serif
 * title + gold eyebrow + concise editorial body), not a listing tile.
 * No hard borders, hairline dividers only, generous negative space.
 *
 * Reference benchmarks: Aman residences index, Sotheby's Private Office
 * exclusive offerings, Four Seasons Private Residences portfolio.
 *
 * Renders **published** rows only; premium empty state when the published
 * set is empty. No fake inventory; no external real-estate feed integration
 * is required on this surface.
 *
 * @param {{
 *   listings: Array<{
 *     slug: string,
 *     title: string,
 *     region_label: string,
 *     property_type: string,
 *     listing_status: string | null,
 *     price_range: string | null,
 *     short_teaser: string | null,
 *   }>,
 *   cardMediaBySlug: Record<string, { src: string, src_set?: string, alt: string, caption?: string | null }>,
 * }} props
 */
export default function LuxeMauricePropertiesDirectory({ listings, cardMediaBySlug }) {
  const list = Array.isArray(listings) ? listings : [];
  const media = cardMediaBySlug && typeof cardMediaBySlug === 'object' ? cardMediaBySlug : {};
  const empty = list.length === 0;

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
        <title>{LUX_PROPERTIES_PUBLIC_COPY.pageTitle}</title>
        <LuxeMauriceFontStylesheet />
      </Head>

      {/* ─── Quiet header — monogram wordmark + section eyebrow ─────── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          padding: '28px clamp(20px, 4vw, 56px)',
        }}
      >
        <LuxeMauriceWordmark
          variant="compact"
          tone="ivory"
          showSignature={false}
          href="/"
        />
        <span
          style={{
            fontFamily: T.fontBody,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: T.gold,
          }}
        >
          {LUX_PROPERTIES_PUBLIC_COPY.headerTagline}
        </span>
      </header>

      <main style={{ maxWidth: 1180, margin: '0 auto', padding: '64px clamp(20px, 4vw, 56px) 120px' }}>
        {/* ─── Editorial title block ──────────────────────────────────── */}
        <div style={{ maxWidth: 760, marginBottom: 80 }}>
          <LuxEyebrow>
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
              color: T.ivory,
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
              color: T.ivoryMuted,
            }}
          >
            {empty
              ? LUX_PROPERTIES_PUBLIC_COPY.emptyBody
              : LUX_PROPERTIES_PUBLIC_COPY.listSubtitle}
          </p>
        </div>

        {empty ? (
          /* ─── Empty state — editorial, single CTA ─────────────────── */
          <section
            style={{
              padding: 'clamp(72px, 12vw, 140px) clamp(24px, 6vw, 80px)',
              borderTop: `1px solid ${T.hairlineSoft}`,
              borderBottom: `1px solid ${T.hairlineSoft}`,
              textAlign: 'center',
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
                color: T.ivoryMuted,
              }}
            >
              Each opportunity is prepared for review before it appears here. Speak with
              a private advisor for availability, terms, and next steps.
            </p>
            <Link
              href={buildLuxPropertyConciergeHref(null)}
              style={{
                display: 'inline-block',
                padding: '16px 30px',
                borderRadius: T.radiusEditorial,
                background: T.gold,
                color: T.charcoal,
                fontFamily: T.fontBody,
                fontWeight: 700,
                fontSize: 12.5,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                textDecoration: 'none',
              }}
            >
              {LUX_PROPERTIES_PUBLIC_COPY.emptyCta}
            </Link>
          </section>
        ) : (
          <>
            <LuxHairline tone="ivory" />

            {/* ─── Memorandum cards — full image + editorial type ──── */}
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
                        background: T.charcoalSoft,
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
                            color: T.ivoryMuted,
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
                          color: T.ivory,
                          letterSpacing: 0.2,
                        }}
                      >
                        <Link
                          href={`/property/${encodeURIComponent(slug)}`}
                          style={{ color: T.ivory, textDecoration: 'none' }}
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
                            color: T.ivoryMuted,
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
                            color: T.ivoryMuted,
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
                            color: T.ivoryMuted,
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

            {/* ─── Closing CTA strip ───────────────────────────────── */}
            <div
              style={{
                marginTop: 120,
                padding: '64px 32px',
                borderTop: `1px solid ${T.hairlineSoft}`,
                borderBottom: `1px solid ${T.hairlineSoft}`,
                textAlign: 'center',
              }}
            >
              <LuxEyebrow center>Private Advisory</LuxEyebrow>
              <p
                style={{
                  margin: '24px auto 32px',
                  maxWidth: 520,
                  fontFamily: T.fontDisplay,
                  fontStyle: 'italic',
                  fontWeight: 400,
                  fontSize: 'clamp(1.3rem, 2.2vw, 1.6rem)',
                  lineHeight: 1.5,
                  color: T.ivory,
                }}
              >
                A private advisor responds within one business day.
              </p>
              <Link
                href={buildLuxPropertyConciergeHref(null)}
                style={{
                  display: 'inline-block',
                  padding: '16px 30px',
                  borderRadius: T.radiusEditorial,
                  background: T.gold,
                  color: T.charcoal,
                  fontFamily: T.fontBody,
                  fontWeight: 700,
                  fontSize: 12.5,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                }}
              >
                {LUX_PROPERTIES_PUBLIC_COPY.emptyCta}
              </Link>
            </div>
          </>
        )}
      </main>

      {/* ─── Minimal footer ────────────────────────────────────────────── */}
      <footer
        style={{
          padding: '56px 32px 64px',
          background: T.charcoalDeep,
          borderTop: `1px solid ${T.hairlineSoft}`,
          textAlign: 'center',
        }}
      >
        <LuxeMauriceWordmark variant="stacked" tone="ivory" showSignature />
        <p
          style={{
            margin: '36px auto 0',
            maxWidth: 600,
            fontFamily: T.fontBody,
            fontSize: 11.5,
            lineHeight: 1.8,
            color: T.ivoryMuted,
          }}
        >
          Information on this page is indicative and not legal, tax, or immigration
          advice. Nothing here is an offer or solicitation; terms are agreed in writing
          through a private advisor.
        </p>
      </footer>
    </div>
  );
}
