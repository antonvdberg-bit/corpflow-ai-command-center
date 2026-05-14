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
        background: T.pageBg,
        color: T.ink,
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
          padding: '18px 28px',
          background: T.white,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <Link
          href="/"
          style={{
            fontSize: 12,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: T.goldDeep,
            textDecoration: 'none',
            fontWeight: 750,
          }}
        >
          ← Luxurious Mauritius
        </Link>
        <span style={{ fontSize: 11, color: T.inkMuted, fontWeight: 650 }}>{LUX_PROPERTIES_PUBLIC_COPY.headerTagline}</span>
      </header>

      <main style={{ maxWidth: 1040, margin: '0 auto', padding: '44px 24px 88px' }}>
        {empty ? (
          <section
            style={{
              borderRadius: T.radiusLg,
              border: `1px solid ${T.borderStrong}`,
              background: `linear-gradient(165deg, ${T.white} 0%, ${T.sand} 100%)`,
              padding: '48px 40px',
              textAlign: 'center',
              boxShadow: '0 24px 60px rgba(28,25,23,0.07)',
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.goldDeep, fontWeight: 800 }}>
              {LUX_PROPERTIES_PUBLIC_COPY.emptyKicker}
            </div>
            <h1
              style={{
                margin: '18px 0 0',
                fontSize: 34,
                lineHeight: 1.12,
                fontWeight: 700,
                fontFamily: T.fontDisplay,
                color: T.heroDeep,
              }}
            >
              {LUX_PROPERTIES_PUBLIC_COPY.emptyTitle}
            </h1>
            <p
              style={{
                margin: '22px auto 0',
                maxWidth: 520,
                fontSize: 17,
                lineHeight: 1.65,
                color: T.inkMuted,
              }}
            >
              {LUX_PROPERTIES_PUBLIC_COPY.emptyBody}
            </p>
            <div style={{ marginTop: 36 }}>
              <Link
                href={buildLuxPropertyConciergeHref(null)}
                style={{
                  display: 'inline-block',
                  padding: '14px 26px',
                  borderRadius: 999,
                  background: T.goldDeep,
                  color: T.white,
                  fontWeight: 750,
                  fontSize: 15,
                  textDecoration: 'none',
                  letterSpacing: '0.04em',
                }}
              >
                {LUX_PROPERTIES_PUBLIC_COPY.emptyCta}
              </Link>
            </div>
          </section>
        ) : (
          <>
            <div style={{ marginBottom: 36 }}>
              <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.goldDeep, fontWeight: 800 }}>
                {LUX_PROPERTIES_PUBLIC_COPY.listKicker}
              </div>
              <h1
                style={{
                  margin: '12px 0 0',
                  fontSize: 34,
                  lineHeight: 1.12,
                  fontWeight: 700,
                  fontFamily: T.fontDisplay,
                  color: T.heroDeep,
                }}
              >
                {LUX_PROPERTIES_PUBLIC_COPY.listTitle}
              </h1>
              <p style={{ margin: '14px 0 0', maxWidth: 640, fontSize: 16, lineHeight: 1.6, color: T.inkMuted }}>
                {LUX_PROPERTIES_PUBLIC_COPY.listSubtitle}
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 22 }}>
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
                      border: `1px solid ${T.border}`,
                      background: T.white,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: '0 14px 40px rgba(28,25,23,0.06)',
                    }}
                  >
                    <div style={{ height: 168, background: T.placeholder }}>
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
                    <div style={{ padding: '18px 18px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 13, color: T.inkMuted, fontWeight: 650 }}>{safeStr(row.region_label)}</div>
                      <h2 style={{ margin: 0, fontSize: 20, lineHeight: 1.25, fontFamily: T.fontDisplay, color: T.ink, fontWeight: 750 }}>
                        {safeStr(row.title)}
                      </h2>
                      <div style={{ fontSize: 13, color: T.inkMuted }}>{safeStr(row.property_type)}</div>
                      {row.listing_status ? (
                        <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.goldDeep, fontWeight: 750 }}>
                          {safeStr(row.listing_status)}
                        </div>
                      ) : null}
                      {price ? <div style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{price}</div> : null}
                      {teaser ? (
                        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: T.inkMuted, flex: 1 }}>{teaser}</p>
                      ) : null}
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                        <Link
                          href={`/property/${encodeURIComponent(slug)}`}
                          style={{
                            flex: '1 1 120px',
                            textAlign: 'center',
                            padding: '10px 12px',
                            borderRadius: T.radiusMd,
                            border: `1px solid ${T.borderStrong}`,
                            color: T.heroDeep,
                            fontWeight: 700,
                            fontSize: 14,
                            textDecoration: 'none',
                            background: T.sand,
                          }}
                        >
                          {LUX_PROPERTIES_PUBLIC_COPY.cardCtaDetails}
                        </Link>
                        <Link
                          href={buildLuxPropertyConciergeHref(slug)}
                          style={{
                            flex: '1 1 120px',
                            textAlign: 'center',
                            padding: '10px 12px',
                            borderRadius: T.radiusMd,
                            background: T.goldDeep,
                            color: T.white,
                            fontWeight: 750,
                            fontSize: 14,
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
            <div style={{ marginTop: 40, textAlign: 'center' }}>
              <Link
                href={buildLuxPropertyConciergeHref(null)}
                style={{ fontSize: 15, fontWeight: 700, color: T.goldDeep, textDecoration: 'none' }}
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
