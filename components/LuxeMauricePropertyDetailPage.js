import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { LUXE_MAURICE_BRAND_TOKENS as T } from '../lib/client/luxe-maurice-brand-theme.js';
import { LuxEyebrow, LuxHairline } from './LuxeMauriceBrandPrimitives.js';
import {
  LuxeMauriceFontStylesheet,
  RARE_EXCLUSIVE_AVAILABILITY_DISCLAIMER,
  RareExclusiveEditorialSpine,
  RareExclusiveIvoryFooter,
  RareExclusiveIvoryHeader,
  RareExclusiveOpaquePanel,
  RareExclusivePromiseGrid,
  rareExclusiveCtaGoldStyle,
  rareExclusivePageShellStyle,
} from './RareExclusiveIvoryShell.js';

function safeStr(v) {
  return v != null ? String(v).trim() : '';
}

/**
 * Rare & Exclusive Collection property detail — Ivory Editorial memorandum.
 * Issue #636: editorial spine, opaque panels, availability disclaimer,
 * private access CTA, highlights / region / status memorandum feel.
 *
 * Props are still server-built — client-supplied listing fields are
 * **not** trusted. Published-only visibility is preserved upstream in
 * `pages/property/[slug].js`. Media controls and preview gating are
 * unchanged.
 *
 * @param {{
 *   property: {
 *     ref: string,
 *     title: string,
 *     location: string,
 *     property_type: string,
 *     status: string | null,
 *     price_display: string,
 *     discovery_source: 'curated' | 'manual_curated' | 'feed' | 'lux_postgres',
 *     summary_text: string,
 *     highlights: string[],
 *     hero_image?: string | null,
 *     published_hero?: { src: string, src_set?: string, alt: string, caption: string | null } | null,
 *     published_gallery?: { src: string, src_set?: string, alt: string, caption: string | null, gallery_order?: number | null, is_gallery_cover?: boolean }[],
 *   },
 *   editor_preview?: boolean,
 * }} props
 */
export default function LuxeMauricePropertyDetailPage({ property, editor_preview }) {
  const p = property || {};
  const ref = safeStr(p.ref);
  const conciergeHref = `/concierge?intent=property&property=${encodeURIComponent(ref)}`;
  const pageTitle = ref
    ? `${safeStr(p.title)} · Private Opportunity · Rare & Exclusive Collection`
    : 'Private Opportunity · Rare & Exclusive Collection';

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
    'Rare & Exclusive Collection — a private opportunity overview. Request a private consultation to discuss availability, terms, and next steps.';
  const seoDescription =
    seoDescriptionRaw.length > 320
      ? `${seoDescriptionRaw.slice(0, 317)}…`
      : seoDescriptionRaw;
  const seoCanonical = ref
    ? `https://lux.corpflowai.com/property/${ref}`
    : 'https://lux.corpflowai.com/';
  const seoOgImage =
    p.published_hero &&
    typeof p.published_hero === 'object' &&
    p.published_hero.src &&
    /^https?:\/\//.test(p.published_hero.src)
      ? p.published_hero.src
      : '';

  const publishedHero =
    p.published_hero && typeof p.published_hero === 'object' ? p.published_hero : null;
  const publishedGallery = Array.isArray(p.published_gallery)
    ? p.published_gallery.filter(
        (g) => g && typeof g === 'object' && safeStr(g.src),
      )
    : [];

  const heroImg = (() => {
    if (publishedHero && publishedHero.src) {
      const ss =
        publishedHero.src_set != null ? String(publishedHero.src_set).trim() : '';
      return {
        src: String(publishedHero.src),
        srcSet: ss || undefined,
        sizes: ss ? '(max-width: 900px) 100vw, 1080px' : undefined,
        alt: safeStr(publishedHero.alt),
        caption: publishedHero.caption ? safeStr(publishedHero.caption) : null,
      };
    }
    const s = p.hero_image != null ? String(p.hero_image).trim() : '';
    if (!s.startsWith('/')) return null;
    if (s.includes('..') || s.includes('//')) return null;
    return { src: s, srcSet: undefined, sizes: undefined, alt: '', caption: null };
  })();

  const heroAltText = heroImg?.alt
    ? safeStr(heroImg.alt)
    : ref
      ? `${ref} · private opportunity`
      : 'Private opportunity hero image';
  const galleryAltText = (g) =>
    safeStr(g.alt) ? safeStr(g.alt) : ref ? `${ref} · gallery` : 'Gallery image';

  /** Lifestyle context — a quiet editorial paragraph that frames the
   *  region without inventing specifics. Always safe (no claims about
   *  yield, fees, residency status). Only rendered when there is at
   *  least one of `location` or `property_type` to frame. */
  const lifestyleContext =
    location || propertyType
      ? `Set ${location ? `in ${location}` : 'within the Mauritian context'}, ${propertyType ? `this ${propertyType.toLowerCase()} ` : 'this private opportunity '}sits within the Rare & Exclusive Collection radius — climate, security, schools, sport, nature, and a long-term family quality of life. A private advisor frames the local detail — schools, neighbours, access, timing — once a private conversation is under way.`
      : '';

  return (
    <div
      style={{
        ...rareExclusivePageShellStyle(),
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
        <meta
          name="twitter:card"
          content={seoOgImage ? 'summary_large_image' : 'summary'}
        />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={seoDescription} />
        {seoOgImage ? <meta name="twitter:image" content={seoOgImage} /> : null}
        <LuxeMauriceFontStylesheet />
      </Head>

      <RareExclusiveIvoryHeader activeHref="/properties" />

      <RareExclusiveEditorialSpine>
      {editor_preview ? (
        <div style={{ padding: '12px clamp(20px, 4vw, 40px) 0' }}>
          <RareExclusiveOpaquePanel
            style={{
              borderColor: T.gold,
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            Private preview — this URL is for editors only and is not the published
            opportunity memorandum. Remove{' '}
            <code style={{ fontSize: 12 }}>?preview=1</code> to open the visitor-facing
            page when the opportunity is published.
          </RareExclusiveOpaquePanel>
        </div>
      ) : null}

      <main style={{ padding: '32px clamp(20px, 4vw, 48px) 96px' }}>
        {/* ─── Title block ───────────────────────────────────────────── */}
        <section style={{ maxWidth: 760, marginBottom: 56 }}>
          <LuxEyebrow>Private Opportunity Memorandum</LuxEyebrow>
          <div
            style={{
              marginTop: 18,
              fontFamily: T.fontBody,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: T.gold,
            }}
          >
            {[safeStr(p.location), safeStr(p.property_type)]
              .filter(Boolean)
              .join(' · ') || 'Private opportunity'}
          </div>
          <h1
            style={{
              margin: '24px 0 24px',
              fontFamily: T.fontDisplay,
              fontWeight: 500,
              fontSize: 'clamp(2.2rem, 5vw, 3.6rem)',
              lineHeight: 1.1,
              letterSpacing: -0.4,
              color: T.charcoal,
            }}
          >
            {safeStr(p.title)}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'baseline' }}>
            {p.status ? (
              <span
                style={{
                  fontFamily: T.fontBody,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: '#4A433A',
                }}
              >
                {safeStr(p.status)}
              </span>
            ) : null}
            {priceLine ? (
              <span
                style={{
                  fontFamily: T.fontDisplay,
                  fontStyle: 'italic',
                  fontWeight: 500,
                  fontSize: 22,
                  color: T.gold,
                }}
              >
                {priceLine}
              </span>
            ) : null}
          </div>
        </section>

        {/* ─── Hero image — full-bleed ───────────────────────────────── */}
        {heroImg ? (
          <figure
            style={{
              margin: '0 0 64px',
            }}
          >
            <div
              style={{
                aspectRatio: '16 / 9',
                background: '#E7DED0',
                overflow: 'hidden',
              }}
            >
              <img
                src={heroImg.src}
                srcSet={heroImg.srcSet}
                sizes={heroImg.sizes}
                alt={heroAltText}
                decoding="async"
                fetchPriority="high"
                loading="eager"
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
            {heroImg.caption ? (
              <figcaption
                style={{
                  marginTop: 16,
                  fontFamily: T.fontDisplay,
                  fontStyle: 'italic',
                  fontWeight: 400,
                  fontSize: 14,
                  color: '#4A433A',
                  textAlign: 'center',
                  letterSpacing: 0.1,
                }}
              >
                {heroImg.caption}
              </figcaption>
            ) : null}
          </figure>
        ) : null}

        <LuxHairline tone="stone" />

        {/* ─── Overview ──────────────────────────────────────────────── */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(180px, 240px) 1fr',
            gap: 'clamp(28px, 6vw, 80px)',
            padding: '64px 0',
            borderBottom: `1px solid ${T.hairlineStone}`,
          }}
        >
          <LuxEyebrow>Overview</LuxEyebrow>
          <p
            style={{
              margin: 0,
              maxWidth: 620,
              fontFamily: T.fontDisplay,
              fontWeight: 400,
              fontSize: 'clamp(1.15rem, 1.7vw, 1.4rem)',
              lineHeight: 1.75,
              color: T.charcoal,
              letterSpacing: 0.05,
            }}
          >
            {summaryRaw || 'Discuss this private opportunity with a Rare & Exclusive Collection advisor for full context.'}
          </p>
        </section>

        {/* ─── Lifestyle context ─────────────────────────────────────── */}
        {lifestyleContext ? (
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(180px, 240px) 1fr',
              gap: 'clamp(28px, 6vw, 80px)',
              padding: '64px 0',
              borderBottom: `1px solid ${T.hairlineStone}`,
            }}
          >
            <LuxEyebrow>Lifestyle context</LuxEyebrow>
            <p
              style={{
                margin: 0,
                maxWidth: 620,
                fontFamily: T.fontBody,
                fontSize: 16,
                lineHeight: 1.85,
                color: '#4A433A',
              }}
            >
              {lifestyleContext}
            </p>
          </section>
        ) : null}

        {/* ─── Advisory notes ────────────────────────────────────────── */}
        {Array.isArray(p.highlights) && p.highlights.length ? (
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(180px, 240px) 1fr',
              gap: 'clamp(28px, 6vw, 80px)',
              padding: '64px 0',
              borderBottom: `1px solid ${T.hairlineStone}`,
            }}
          >
            <LuxEyebrow>Advisory notes</LuxEyebrow>
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                maxWidth: 620,
              }}
            >
              {p.highlights.map((h, i) => (
                <li
                  key={i}
                  style={{
                    padding: '18px 0',
                    borderBottom:
                      i < p.highlights.length - 1
                        ? `1px solid ${T.hairlineSoft}`
                        : 'none',
                    fontFamily: T.fontBody,
                    fontSize: 15.5,
                    lineHeight: 1.8,
                    color: T.charcoal,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 24,
                      fontFamily: T.fontDisplay,
                      fontStyle: 'italic',
                      color: T.gold,
                      verticalAlign: 'top',
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}.
                  </span>
                  <span>{safeStr(h)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* ─── Gallery ──────────────────────────────────────────────── */}
        {publishedGallery.length > 0 ? (
          <section
            style={{
              padding: '64px 0',
              borderBottom: `1px solid ${T.hairlineStone}`,
            }}
          >
            <LuxEyebrow>Gallery</LuxEyebrow>
            <div
              style={{
                marginTop: 32,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 16,
              }}
            >
              {publishedGallery.map((g, gi) => {
                const gs = g.src_set != null ? String(g.src_set).trim() : '';
                return (
                  <figure key={gi} style={{ margin: 0 }}>
                    <div
                      style={{
                        aspectRatio: '4 / 3',
                        background: '#E7DED0',
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={safeStr(g.src)}
                        srcSet={gs || undefined}
                        sizes={gs ? '(max-width: 900px) 50vw, 300px' : undefined}
                        alt={galleryAltText(g)}
                        decoding="async"
                        loading="lazy"
                        style={{
                          display: 'block',
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </div>
                    {g.caption ? (
                      <figcaption
                        style={{
                          marginTop: 8,
                          fontFamily: T.fontDisplay,
                          fontStyle: 'italic',
                          fontSize: 12,
                          color: '#4A433A',
                          lineHeight: 1.5,
                        }}
                      >
                        {safeStr(g.caption)}
                      </figcaption>
                    ) : null}
                  </figure>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* ─── At a glance ───────────────────────────────────────────── */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(180px, 240px) 1fr',
            gap: 'clamp(28px, 6vw, 80px)',
            padding: '64px 0',
          }}
        >
          <LuxEyebrow>At a glance</LuxEyebrow>
          <dl
            style={{
              margin: 0,
              display: 'grid',
              gridTemplateColumns: 'minmax(140px, 180px) 1fr',
              gap: 0,
              fontFamily: T.fontBody,
              fontSize: 14,
              color: '#4A433A',
              maxWidth: 620,
            }}
          >
            {[
              ['Reference', ref],
              ['Region', location],
              ['Type', propertyType],
              ...(p.status ? [['Status', safeStr(p.status)]] : []),
              ['Pricing', priceLine],
            ].map(([label, value], i, arr) => (
              <React.Fragment key={label}>
                <dt
                  style={{
                    padding: '18px 0',
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: '0.28em',
                    textTransform: 'uppercase',
                    color: T.gold,
                    borderTop: `1px solid ${T.hairlineStone}`,
                    borderBottom:
                      i === arr.length - 1
                        ? `1px solid ${T.hairlineSoft}`
                        : 'none',
                  }}
                >
                  {label}
                </dt>
                <dd
                  style={{
                    margin: 0,
                    padding: '18px 0',
                    fontFamily: T.fontDisplay,
                    fontSize: 17,
                    color: T.charcoal,
                    borderTop: `1px solid ${T.hairlineStone}`,
                    borderBottom:
                      i === arr.length - 1
                        ? `1px solid ${T.hairlineSoft}`
                        : 'none',
                  }}
                >
                  {value || '—'}
                </dd>
              </React.Fragment>
            ))}
          </dl>
        </section>

        <RareExclusivePromiseGrid />

        <RareExclusiveOpaquePanel style={{ marginTop: 24, marginBottom: 8 }}>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: '#4A433A' }}>
            {RARE_EXCLUSIVE_AVAILABILITY_DISCLAIMER}
          </p>
        </RareExclusiveOpaquePanel>

        {/* ─── Private Access CTA ─────────────────────────────────────── */}
        <section
          style={{
            marginTop: 48,
            padding: 'clamp(48px, 7vw, 88px) clamp(20px, 4vw, 48px)',
            textAlign: 'center',
            borderTop: `1px solid ${T.hairlineStone}`,
            background: '#F8F4EE',
          }}
        >
          <LuxEyebrow tone="charcoal" center>Private Access</LuxEyebrow>
          <div style={{ margin: '32px auto', width: 40 }}>
            <LuxHairline tone="gold" />
          </div>
          <h2
            style={{
              margin: '0 auto 24px',
              maxWidth: 640,
              fontFamily: T.fontDisplay,
              fontWeight: 400,
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              lineHeight: 1.2,
              color: T.charcoal,
              letterSpacing: -0.2,
            }}
          >
            Discuss this private opportunity with a private advisor.
          </h2>
          <p
            style={{
              margin: '0 auto 40px',
              maxWidth: 540,
              fontFamily: T.fontBody,
              fontSize: 15,
              lineHeight: 1.85,
              color: '#4A433A',
            }}
          >
            Your enquiry reaches the same private advisory channel as the rest of
            Rare & Exclusive Collection. Your advisor sees this opportunity reference and responds
            within one business day.
          </p>
          <a href={conciergeHref} style={rareExclusiveCtaGoldStyle()}>
            Request private access
          </a>
        </section>
      </main>
      </RareExclusiveEditorialSpine>

      <RareExclusiveIvoryFooter />
    </div>
  );
}
