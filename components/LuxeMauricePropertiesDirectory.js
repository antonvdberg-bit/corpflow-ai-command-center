import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { LUXE_MAURICE_BRAND_TOKENS as T } from '../lib/client/luxe-maurice-brand-theme.js';
import {
  buildLuxPropertyConciergeHref,
  LUX_PROPERTIES_PUBLIC_COPY,
} from '../lib/client/luxe-maurice-properties-public.js';

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
 * Repositioned 2026-06-11 to the LuxeMaurice Private Wealth & Lifestyle
 * Platform direction. Renders **published** rows only; premium empty state
 * when the published set is empty. No fake inventory; no external real-estate
 * feed integration is required on this surface.
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
        fontFamily: T.fontUi,
        minHeight: '100vh',
        background: T.charcoalDeep,
        color: T.ivory,
      }}
    >
      <Head>
        <title>{LUX_PROPERTIES_PUBLIC_COPY.pageTitle}</title>
      </Head>

      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          padding: '22px 32px',
          background: T.charcoalDeep,
          borderBottom: `1px solid ${T.dividerSoft}`,
        }}
      >
        <Link
          href="/"
          style={{
            fontSize: 11,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: T.goldEditorial,
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          ← LuxeMaurice
        </Link>
        <span
          style={{
            fontSize: 11,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: T.ivoryMuted,
            fontWeight: 700,
          }}
        >
          {LUX_PROPERTIES_PUBLIC_COPY.headerTagline}
        </span>
      </header>

      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '64px 32px 96px' }}>
        {empty ? (
          <section
            style={{
              borderRadius: T.radiusLg,
              border: `1px solid ${T.dividerSoft}`,
              background: T.charcoalSoft,
              padding: 'clamp(56px, 8vw, 96px) clamp(36px, 6vw, 64px)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.32em',
                textTransform: 'uppercase',
                color: T.goldEditorial,
                fontWeight: 700,
              }}
            >
              {LUX_PROPERTIES_PUBLIC_COPY.emptyKicker}
            </div>
            <h1
              style={{
                margin: '24px auto 0',
                fontSize: 'clamp(1.9rem, 4vw, 2.8rem)',
                lineHeight: 1.15,
                fontWeight: 500,
                fontFamily: T.fontDisplay,
                color: T.ivory,
                maxWidth: 720,
              }}
            >
              {LUX_PROPERTIES_PUBLIC_COPY.emptyTitle}
            </h1>
            <p
              style={{
                margin: '24px auto 0',
                maxWidth: 580,
                fontSize: 17,
                lineHeight: 1.7,
                color: T.ivoryMuted,
              }}
            >
              {LUX_PROPERTIES_PUBLIC_COPY.emptyBody}
            </p>
            <div style={{ marginTop: 40 }}>
              <Link
                href={buildLuxPropertyConciergeHref(null)}
                style={{
                  display: 'inline-block',
                  padding: '15px 28px',
                  borderRadius: 999,
                  background: T.goldEditorial,
                  color: T.charcoalDeep,
                  fontWeight: 700,
                  fontSize: 13,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                }}
              >
                {LUX_PROPERTIES_PUBLIC_COPY.emptyCta}
              </Link>
            </div>
          </section>
        ) : (
          <>
            <div style={{ marginBottom: 44 }}>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                  color: T.goldEditorial,
                  fontWeight: 700,
                }}
              >
                {LUX_PROPERTIES_PUBLIC_COPY.listKicker}
              </div>
              <h1
                style={{
                  margin: '18px 0 0',
                  fontSize: 'clamp(1.9rem, 4vw, 2.8rem)',
                  lineHeight: 1.15,
                  fontWeight: 500,
                  fontFamily: T.fontDisplay,
                  color: T.ivory,
                }}
              >
                {LUX_PROPERTIES_PUBLIC_COPY.listTitle}
              </h1>
              <p style={{ margin: '18px 0 0', maxWidth: 720, fontSize: 16, lineHeight: 1.7, color: T.ivoryMuted }}>
                {LUX_PROPERTIES_PUBLIC_COPY.listSubtitle}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
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
                      borderRadius: T.radiusLg,
                      border: `1px solid ${T.dividerSoft}`,
                      background: T.charcoalSoft,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ height: 196, background: T.charcoal }}>
                      {cardImg && cardImg.src ? (
                        <img
                          src={cardImg.src}
                          srcSet={cardImg.src_set || undefined}
                          sizes={cardImg.src_set ? '(max-width: 640px) 100vw, 320px' : undefined}
                          alt={safeStr(cardImg.alt) || `${slug} · preview`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          decoding="async"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <div style={{ padding: '22px 22px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div
                        style={{
                          fontSize: 10,
                          letterSpacing: '0.22em',
                          textTransform: 'uppercase',
                          color: T.ivoryMuted,
                          fontWeight: 700,
                        }}
                      >
                        {safeStr(row.region_label)}
                      </div>
                      <h2
                        style={{
                          margin: 0,
                          fontSize: 20,
                          lineHeight: 1.3,
                          fontFamily: T.fontDisplay,
                          color: T.ivory,
                          fontWeight: 500,
                        }}
                      >
                        {safeStr(row.title)}
                      </h2>
                      <div style={{ fontSize: 13, color: T.ivoryMuted }}>{safeStr(row.property_type)}</div>
                      {row.listing_status ? (
                        <div
                          style={{
                            fontSize: 11,
                            letterSpacing: '0.16em',
                            textTransform: 'uppercase',
                            color: T.goldEditorial,
                            fontWeight: 700,
                          }}
                        >
                          {safeStr(row.listing_status)}
                        </div>
                      ) : null}
                      {price ? <div style={{ fontSize: 15, fontWeight: 600, color: T.ivory }}>{price}</div> : null}
                      {teaser ? (
                        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: T.ivoryMuted, flex: 1 }}>{teaser}</p>
                      ) : null}
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                        <Link
                          href={`/property/${encodeURIComponent(slug)}`}
                          style={{
                            flex: '1 1 140px',
                            textAlign: 'center',
                            padding: '11px 14px',
                            borderRadius: 999,
                            border: `1px solid ${T.divider}`,
                            color: T.ivory,
                            fontWeight: 700,
                            fontSize: 12,
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            textDecoration: 'none',
                          }}
                        >
                          {LUX_PROPERTIES_PUBLIC_COPY.cardCtaDetails}
                        </Link>
                        <Link
                          href={buildLuxPropertyConciergeHref(slug)}
                          style={{
                            flex: '1 1 140px',
                            textAlign: 'center',
                            padding: '11px 14px',
                            borderRadius: 999,
                            background: T.goldEditorial,
                            color: T.charcoalDeep,
                            fontWeight: 700,
                            fontSize: 12,
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
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

            <div style={{ marginTop: 56, textAlign: 'center' }}>
              <Link
                href={buildLuxPropertyConciergeHref(null)}
                style={{
                  fontSize: 12,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: T.goldEditorial,
                  textDecoration: 'none',
                  fontWeight: 700,
                }}
              >
                {LUX_PROPERTIES_PUBLIC_COPY.emptyCta} →
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
