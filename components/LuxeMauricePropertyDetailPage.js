import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { LUXE_MAURICE_BRAND_TOKENS as T } from '../lib/client/luxe-maurice-brand-theme.js';

function safeStr(v) {
  return v != null ? String(v).trim() : '';
}

/**
 * LuxeMaurice-only property detail (Phase 2C).
 * Repositioned 2026-06-11 to read as a *private opportunity overview* under the
 * LuxeMaurice Private Wealth & Lifestyle Platform direction. Props are still
 * server-built — do not trust client-supplied listing fields.
 * Published-only visibility is preserved upstream in `pages/property/[slug].js`.
 *
 * @param {{ property: { ref: string, title: string, location: string, property_type: string, status: string | null, price_display: string, discovery_source: 'curated' | 'manual_curated' | 'feed' | 'lux_postgres', summary_text: string, highlights: string[], hero_image?: string | null, published_hero?: { src: string, src_set?: string, alt: string, caption: string | null } | null, published_gallery?: { src: string, src_set?: string, alt: string, caption: string | null, gallery_order?: number | null, is_gallery_cover?: boolean }[] }, editor_preview?: boolean }} props
 */
export default function LuxeMauricePropertyDetailPage({ property, editor_preview }) {
  const p = property || {};
  const ref = safeStr(p.ref);
  const conciergeHref = `/concierge?intent=property&property=${encodeURIComponent(ref)}`;
  const pageTitle = ref ? `${safeStr(p.title)} · Private Opportunity · LuxeMaurice` : 'Private Opportunity · LuxeMaurice';

  const summaryRaw = safeStr(p.summary_text);
  const propertyType = safeStr(p.property_type);
  const location = safeStr(p.location);
  const priceLine = safeStr(p.price_display);
  const synthesizedSummary = [
    propertyType ? `${propertyType}` : null,
    location ? `in ${location}` : null,
    priceLine ? `· ${priceLine}` : null,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
  const seoDescriptionRaw =
    summaryRaw ||
    synthesizedSummary ||
    'LuxeMaurice — a private opportunity overview. Request a private consultation to discuss availability, terms, and next steps.';
  const seoDescription =
    seoDescriptionRaw.length > 320 ? `${seoDescriptionRaw.slice(0, 317)}…` : seoDescriptionRaw;
  const seoCanonical = ref ? `https://lux.corpflowai.com/property/${ref}` : 'https://lux.corpflowai.com/';
  const seoOgImage =
    (p.published_hero && typeof p.published_hero === 'object' && p.published_hero.src && /^https?:\/\//.test(p.published_hero.src))
      ? p.published_hero.src
      : '';

  const publishedHero = p.published_hero && typeof p.published_hero === 'object' ? p.published_hero : null;
  const publishedGallery = Array.isArray(p.published_gallery)
    ? p.published_gallery.filter((g) => g && typeof g === 'object' && safeStr(g.src))
    : [];

  const heroImg = (() => {
    if (publishedHero && publishedHero.src) {
      const ss = publishedHero.src_set != null ? String(publishedHero.src_set).trim() : '';
      return {
        src: String(publishedHero.src),
        srcSet: ss || undefined,
        sizes: ss ? '(max-width: 900px) 100vw, 820px' : undefined,
        alt: safeStr(publishedHero.alt),
        caption: publishedHero.caption ? safeStr(publishedHero.caption) : null,
      };
    }
    const s = p.hero_image != null ? String(p.hero_image).trim() : '';
    if (!s.startsWith('/')) return null;
    if (s.includes('..') || s.includes('//')) return null;
    return { src: s, srcSet: undefined, sizes: undefined, alt: '', caption: null };
  })();

  const heroAltText = heroImg?.alt ? safeStr(heroImg.alt) : ref ? `${ref} · hero` : 'Private opportunity hero image';
  const galleryAltText = (g) => (safeStr(g.alt) ? safeStr(g.alt) : ref ? `${ref} · gallery` : 'Gallery image');

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
        <title>{pageTitle}</title>
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href={seoCanonical} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:url" content={seoCanonical} />
        {seoOgImage ? <meta property="og:image" content={seoOgImage} /> : null}
        <meta name="twitter:card" content={seoOgImage ? 'summary_large_image' : 'summary'} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={seoDescription} />
        {seoOgImage ? <meta name="twitter:image" content={seoOgImage} /> : null}
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
          Private opportunity overview
        </span>
      </header>

      {editor_preview ? (
        <div
          style={{
            margin: '0 auto',
            maxWidth: 880,
            padding: '16px 32px 0',
            fontSize: 14,
            lineHeight: 1.5,
            color: T.ivory,
            fontWeight: 600,
          }}
        >
          <div
            style={{
              borderRadius: T.radiusMd,
              border: `1px solid ${T.goldEditorial}`,
              background: T.charcoalSoft,
              padding: '14px 18px',
            }}
          >
            Private preview — this URL is for editors only and is not the published opportunity overview. Remove{' '}
            <code style={{ fontSize: 12 }}>?preview=1</code> to open the visitor-facing page when the opportunity is published.
          </div>
        </div>
      ) : null}

      <main style={{ maxWidth: 880, margin: '0 auto', padding: '48px 32px 88px' }}>
        <section
          style={{
            borderRadius: T.radiusLg,
            border: `1px solid ${T.dividerSoft}`,
            background: T.charcoalSoft,
            padding: '0 0 32px',
            overflow: 'hidden',
          }}
        >
          {heroImg ? (
            <div style={{ height: 320, background: T.charcoal, borderBottom: `1px solid ${T.dividerSoft}` }}>
              <img
                src={heroImg.src}
                srcSet={heroImg.srcSet}
                sizes={heroImg.sizes}
                alt={heroAltText}
                decoding="async"
                fetchPriority="high"
                loading="eager"
                style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ) : null}
          {heroImg?.caption ? (
            <p style={{ margin: '14px 32px 0', fontSize: 12, color: T.ivoryMuted, lineHeight: 1.5 }}>{heroImg.caption}</p>
          ) : null}
          <div style={{ padding: '32px 32px 0' }}>
            <p
              style={{
                margin: '0 0 12px',
                fontSize: 11,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: T.goldEditorial,
                fontWeight: 700,
              }}
            >
              {safeStr(p.location)} · {safeStr(p.property_type)}
            </p>
            <h1
              style={{
                margin: '0 0 18px',
                fontSize: 'clamp(1.7rem, 4vw, 2.4rem)',
                lineHeight: 1.15,
                fontWeight: 500,
                fontFamily: T.fontDisplay,
                color: T.ivory,
                letterSpacing: -0.3,
              }}
            >
              {safeStr(p.title)}
            </h1>
            {p.status ? (
              <p
                style={{
                  margin: '0 0 14px',
                  fontSize: 12,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  color: T.goldEditorial,
                }}
              >
                {safeStr(p.status)}
              </p>
            ) : null}
            <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: T.ivory }}>{safeStr(p.price_display)}</p>
          </div>
        </section>

        <section style={{ marginTop: 40 }}>
          <h2
            style={{
              margin: '0 0 14px',
              fontSize: 12,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              fontWeight: 700,
              color: T.goldEditorial,
            }}
          >
            Opportunity overview
          </h2>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.8, color: T.ivory, fontWeight: 400 }}>{safeStr(p.summary_text)}</p>
        </section>

        {publishedGallery.length > 0 ? (
          <section style={{ marginTop: 40 }}>
            <h2
              style={{
                margin: '0 0 14px',
                fontSize: 12,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                fontWeight: 700,
                color: T.goldEditorial,
              }}
            >
              Gallery
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 14,
              }}
            >
              {publishedGallery.map((g, gi) => {
                const gs = g.src_set != null ? String(g.src_set).trim() : '';
                return (
                  <figure key={gi} style={{ margin: 0 }}>
                    <img
                      src={safeStr(g.src)}
                      srcSet={gs || undefined}
                      sizes={gs ? '(max-width: 900px) 50vw, 220px' : undefined}
                      alt={galleryAltText(g)}
                      decoding="async"
                      loading="lazy"
                      style={{
                        display: 'block',
                        width: '100%',
                        height: 140,
                        objectFit: 'cover',
                        borderRadius: 10,
                        border: `1px solid ${T.dividerSoft}`,
                        background: T.charcoal,
                      }}
                    />
                    {g.caption ? (
                      <figcaption style={{ marginTop: 6, fontSize: 11, color: T.ivoryMuted, lineHeight: 1.5 }}>
                        {safeStr(g.caption)}
                      </figcaption>
                    ) : null}
                  </figure>
                );
              })}
            </div>
          </section>
        ) : null}

        {Array.isArray(p.highlights) && p.highlights.length ? (
          <section style={{ marginTop: 40 }}>
            <h2
              style={{
                margin: '0 0 14px',
                fontSize: 12,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                fontWeight: 700,
                color: T.goldEditorial,
              }}
            >
              Advisory notes
            </h2>
            <ul style={{ margin: 0, paddingLeft: 22, color: T.ivory, lineHeight: 1.75, fontSize: 16 }}>
              {p.highlights.map((h, i) => (
                <li key={i} style={{ marginBottom: 10, color: T.ivory }}>
                  <span style={{ color: T.ivoryMuted }}>{safeStr(h)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section style={{ marginTop: 40 }}>
          <h2
            style={{
              margin: '0 0 14px',
              fontSize: 12,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              fontWeight: 700,
              color: T.goldEditorial,
            }}
          >
            At a glance
          </h2>
          <dl
            style={{
              margin: 0,
              display: 'grid',
              gridTemplateColumns: 'minmax(140px, 180px) 1fr',
              gap: '12px 18px',
              fontSize: 14,
              color: T.ivoryMuted,
            }}
          >
            <dt style={{ fontWeight: 700, color: T.ivory, letterSpacing: 0.02 }}>Reference</dt>
            <dd style={{ margin: 0 }}>{ref}</dd>
            <dt style={{ fontWeight: 700, color: T.ivory }}>Region</dt>
            <dd style={{ margin: 0 }}>{safeStr(p.location)}</dd>
            <dt style={{ fontWeight: 700, color: T.ivory }}>Type</dt>
            <dd style={{ margin: 0 }}>{safeStr(p.property_type)}</dd>
            {p.status ? (
              <>
                <dt style={{ fontWeight: 700, color: T.ivory }}>Status</dt>
                <dd style={{ margin: 0 }}>{safeStr(p.status)}</dd>
              </>
            ) : null}
            <dt style={{ fontWeight: 700, color: T.ivory }}>Pricing</dt>
            <dd style={{ margin: 0 }}>{safeStr(p.price_display)}</dd>
          </dl>
        </section>

        <section
          style={{
            marginTop: 56,
            padding: '36px 32px',
            borderRadius: T.radiusLg,
            border: `1px solid ${T.divider}`,
            background: T.charcoalSoft,
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: T.goldEditorial,
              fontWeight: 700,
            }}
          >
            Begin a private conversation
          </div>
          <h3
            style={{
              margin: '16px 0 14px',
              fontFamily: T.fontDisplay,
              fontSize: 'clamp(1.4rem, 2.6vw, 1.85rem)',
              lineHeight: 1.3,
              color: T.ivory,
              fontWeight: 500,
            }}
          >
            Discuss this private opportunity with a private advisor.
          </h3>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.7, color: T.ivoryMuted, maxWidth: 600 }}>
            Your enquiry reaches the same private advisory channel as the rest of LuxeMaurice. Your advisor sees this
            opportunity reference and responds within one business day.
          </p>
          <a
            href={conciergeHref}
            style={{
              display: 'inline-block',
              marginTop: 26,
              padding: '14px 26px',
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
            Request a private consultation
          </a>
        </section>
      </main>

      <footer
        style={{
          padding: '28px 32px 44px',
          textAlign: 'center',
          fontSize: 12,
          color: T.ivoryMuted,
          lineHeight: 1.7,
          background: T.charcoalDeep,
          borderTop: `1px solid ${T.dividerSoft}`,
        }}
      >
        Information on this page is indicative and not legal, tax, or immigration advice. Nothing here is an offer or
        solicitation; terms are agreed in writing through a private advisor.
      </footer>
    </div>
  );
}
