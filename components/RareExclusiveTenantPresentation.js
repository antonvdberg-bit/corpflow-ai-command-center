import React from 'react';
import Head from 'next/head';

import { LUXE_MAURICE_BRAND_TOKENS as T } from '../lib/client/luxe-maurice-brand-theme.js';
import { LuxEyebrow, LuxHairline } from './LuxeMauriceBrandPrimitives.js';
import {
  LuxeMauriceFontStylesheet,
  RARE_EXCLUSIVE_ADVISORY_IMAGE,
  RARE_EXCLUSIVE_PUBLIC_BRAND,
  RARE_EXCLUSIVE_STRAPLINE,
  RareExclusiveEditorialSpine,
  RareExclusiveEnquirySteps,
  RareExclusiveFeatureBar,
  RareExclusiveFullLockup,
  RareExclusiveHeroVisual,
  RareExclusiveIvoryFooter,
  RareExclusiveIvoryHeader,
  RareExclusiveOpaquePanel,
  RareExclusiveTextLink,
  rareExclusiveCtaGoldStyle,
  rareExclusivePageShellStyle,
} from './RareExclusiveIvoryShell.js';
import { buildLuxPropertyConciergeHref } from '../lib/client/luxe-maurice-properties-public.js';

function safeStr(v) {
  return v != null ? String(v).trim() : '';
}

/**
 * Rare & Exclusive Collection — Concept A Ivory Editorial homepage.
 *
 * Visual target: approved Concept A reference for Issue #633.
 * Client test URL: lux.corpflowai.com (Vercel previews are internal only).
 *
 * Layout: Jan-approved horizontal wordmark header · split hero (full lockup +
 * lifestyle visual) · four-pillar feature bar · curated opportunities ·
 * Private Opportunities / Owner Experience bands · full-lockup footer.
 * Apex / core surfaces untouched.
 */
export default function RareExclusiveTenantPresentation({ site }) {
  const s = site || {};
  const operatorDebug = s.client_ui?.operator_debug === true;
  const hero = s.hero || {};
  const media = s.media || {};
  const staged = Array.isArray(s.staged_properties) ? s.staged_properties : [];
  const cardMedia =
    s.lux_published_card_media && typeof s.lux_published_card_media === 'object'
      ? s.lux_published_card_media
      : {};

  const meta = s.meta && typeof s.meta === 'object' ? s.meta : {};
  const pageTitle =
    safeStr(meta.page_title)?.replace(/LuxeMaurice/gi, RARE_EXCLUSIVE_PUBLIC_BRAND) ||
    `${RARE_EXCLUSIVE_PUBLIC_BRAND} · ${RARE_EXCLUSIVE_STRAPLINE}`;
  const seoDescriptionRaw =
    safeStr(meta.description)?.replace(/LuxeMaurice/gi, RARE_EXCLUSIVE_PUBLIC_BRAND) ||
    `${RARE_EXCLUSIVE_PUBLIC_BRAND} — a private-access platform for curated Mauritius opportunities, supported by a simple concierge enquiry and operator review process.`;
  const seoDescription =
    seoDescriptionRaw.length > 320
      ? `${seoDescriptionRaw.slice(0, 317)}…`
      : seoDescriptionRaw;
  const seoCanonical = 'https://lux.corpflowai.com/';
  const seoOgImage =
    safeStr(meta.og_image_url) ||
    (typeof media.hero_image_url === 'string' && media.hero_image_url.startsWith('http')
      ? media.hero_image_url
      : '');

  return (
    <div style={rareExclusivePageShellStyle()}>
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
        <LuxeMauriceFontStylesheet />
        <style>{`
          @media (max-width: 900px) {
            .re-hero-grid { grid-template-columns: 1fr !important; min-height: auto !important; }
            .re-hero-visual { min-height: 300px !important; max-height: 440px; }
            .re-card-grid { grid-template-columns: 1fr !important; }
            .re-card-inner { grid-template-columns: 1fr !important; }
            .re-curated-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </Head>

      <RareExclusiveIvoryHeader activeHref="/" />

      <RareExclusiveEditorialSpine>
      {operatorDebug ? (
        <div
          style={{
            padding: '10px 32px',
            fontSize: 11,
            color: T.charcoal,
            background: 'rgba(168, 132, 44, 0.14)',
            borderBottom: `1px solid ${T.hairlineStone}`,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            textAlign: 'center',
          }}
        >
          Client test environment · Concept A Ivory Editorial · lux-only
        </div>
      ) : null}

      <main>
        {/* ─── Concept A split hero (contained spine) ─────────────── */}
        <section
          className="re-hero-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.05fr)',
            minHeight: 560,
            background: T.ivory,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: 'clamp(48px, 6vw, 88px) clamp(32px, 4.5vw, 64px)',
              minWidth: 0,
              overflow: 'visible',
            }}
          >
            <div style={{ maxWidth: 420 }}>
              <RareExclusiveFullLockup showMonogram width={380} maxWidth="100%" />
            </div>
            <p
              style={{
                margin: '22px 0 0',
                maxWidth: 440,
                fontFamily: T.fontDisplay,
                fontSize: 'clamp(1.15rem, 2vw, 1.45rem)',
                fontStyle: 'italic',
                lineHeight: 1.45,
                color: '#4A433A',
              }}
            >
              {RARE_EXCLUSIVE_STRAPLINE}
            </p>
            <p
              style={{
                margin: '16px 0 0',
                maxWidth: 440,
                fontFamily: T.fontBody,
                fontSize: 14.5,
                lineHeight: 1.7,
                color: '#4A433A',
              }}
            >
              A private-access platform for curated Mauritius opportunities — not a public
              property portal. Introductions continue through concierge enquiry and operator review.
            </p>
            <div
              style={{
                marginTop: 40,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 22,
              }}
            >
              <a
                href={safeStr(hero.cta_href) || '/properties'}
                style={rareExclusiveCtaGoldStyle()}
              >
                {safeStr(hero.cta_label) || 'Discover Our Collection'}
              </a>
              <RareExclusiveTextLink href="/concierge">
                Request an Invitation
              </RareExclusiveTextLink>
            </div>
          </div>
          <div className="re-hero-visual" style={{ minHeight: '100%', position: 'relative' }}>
            <RareExclusiveHeroVisual fadeLeft />
          </div>
        </section>

        {/* ─── Four-pillar feature bar ─────────────────────────────── */}
        <RareExclusiveFeatureBar />

        {/* ─── Private-access journey ──────────────────────────────── */}
        <section
          id="private-access"
          style={{
            padding: 'clamp(40px, 6vw, 64px) clamp(24px, 3.5vw, 48px) 8px',
            background: T.ivory,
          }}
        >
          <RareExclusiveOpaquePanel>
            <LuxEyebrow tone="charcoal">Private-access buyer journey</LuxEyebrow>
            <h2
              style={{
                margin: '16px 0 12px',
                fontFamily: T.fontDisplay,
                fontWeight: 400,
                fontSize: 'clamp(1.55rem, 2.4vw, 2.1rem)',
                lineHeight: 1.2,
                color: T.charcoal,
              }}
            >
              From curated opportunity to controlled introduction.
            </h2>
            <p
              style={{
                margin: 0,
                maxWidth: 680,
                fontFamily: T.fontBody,
                fontSize: 15,
                lineHeight: 1.75,
                color: '#4A433A',
              }}
            >
              Explore a small set of private opportunities, open an opportunity memorandum, then
              request private access. Advisory receives your note, qualifies it, selects suitable
              information, and follows up under controlled introduction.
            </p>
            <div
              style={{
                marginTop: 22,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 18,
                alignItems: 'center',
              }}
            >
              <a href="/properties" style={rareExclusiveCtaGoldStyle()}>
                Explore private opportunities
              </a>
              <RareExclusiveTextLink href="/concierge">
                Request private access
              </RareExclusiveTextLink>
            </div>
          </RareExclusiveOpaquePanel>
          <RareExclusiveEnquirySteps />
        </section>

        {/* ─── Curated opportunity strip ───────────────────────────── */}
        {staged.length > 0 ? (
          <section
            id="curated-opportunities"
            style={{
              padding: 'clamp(32px, 5vw, 56px) clamp(24px, 3.5vw, 48px)',
              background: T.ivory,
            }}
          >
            <div style={{ marginBottom: 28, maxWidth: 640 }}>
              <LuxEyebrow tone="charcoal">Curated opportunities</LuxEyebrow>
              <h2
                style={{
                  margin: '14px 0 10px',
                  fontFamily: T.fontDisplay,
                  fontWeight: 400,
                  fontSize: 'clamp(1.55rem, 2.4vw, 2.05rem)',
                  color: T.charcoal,
                }}
              >
                A small set — prepared for private review.
              </h2>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.75, color: '#4A433A' }}>
                Region, type, and status for orientation only. Full packs remain advisory-gated.
              </p>
            </div>
            <div
              className="re-curated-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 22,
              }}
            >
              {staged.slice(0, 4).map((row) => {
                const slug = safeStr(row.slug);
                const key = slug.toLowerCase();
                const img = cardMedia[key];
                return (
                  <article
                    key={slug || row.title}
                    style={{
                      border: `1px solid ${T.hairlineStone}`,
                      background: '#F8F4EE',
                      padding: 22,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    {img && img.src ? (
                      <a
                        href={`/property/${encodeURIComponent(slug)}`}
                        style={{
                          display: 'block',
                          aspectRatio: '16 / 9',
                          overflow: 'hidden',
                          background: '#E7DED0',
                        }}
                      >
                        <img
                          src={img.src}
                          alt={safeStr(img.alt) || `${slug} · private opportunity`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          loading="lazy"
                          decoding="async"
                        />
                      </a>
                    ) : null}
                    <div
                      style={{
                        fontFamily: T.fontBody,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: T.gold,
                      }}
                    >
                      {[safeStr(row.region), safeStr(row.property_type), safeStr(row.status)]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                    <h3
                      style={{
                        margin: 0,
                        fontFamily: T.fontDisplay,
                        fontWeight: 500,
                        fontSize: 22,
                        color: T.charcoal,
                      }}
                    >
                      <a
                        href={`/property/${encodeURIComponent(slug)}`}
                        style={{ color: T.charcoal, textDecoration: 'none' }}
                      >
                        {safeStr(row.title)}
                      </a>
                    </h3>
                    {safeStr(row.teaser) ? (
                      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#4A433A' }}>
                        {safeStr(row.teaser)}
                      </p>
                    ) : null}
                    <div
                      style={{
                        marginTop: 'auto',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 16,
                        alignItems: 'center',
                        paddingTop: 8,
                      }}
                    >
                      <RareExclusiveTextLink href={`/property/${encodeURIComponent(slug)}`}>
                        Opportunity memorandum
                      </RareExclusiveTextLink>
                      <RareExclusiveTextLink href={buildLuxPropertyConciergeHref(slug)}>
                        Request private access
                      </RareExclusiveTextLink>
                    </div>
                  </article>
                );
              })}
            </div>
            <div style={{ marginTop: 28 }}>
              <a href="/properties" style={rareExclusiveCtaGoldStyle()}>
                View all private opportunities
              </a>
            </div>
          </section>
        ) : null}

        {/* ─── Side-by-side content cards (Concept A) ──────────────── */}
        <section
          id="upcoming"
          style={{
            padding: 'clamp(56px, 7vw, 88px) clamp(24px, 3.5vw, 48px)',
            background: T.ivory,
          }}
        >
          <div
            className="re-card-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 28,
            }}
          >
            <article
              id="destination"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 0.95fr)',
                minHeight: 340,
                border: `1px solid ${T.hairlineStone}`,
                background: '#F8F4EE',
              }}
              className="re-card-inner"
            >
              <RareExclusiveOpaquePanel
                style={{
                  border: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <LuxEyebrow tone="charcoal">Private Opportunities</LuxEyebrow>
                <h2
                  style={{
                    margin: '18px 0 16px',
                    fontFamily: T.fontDisplay,
                    fontWeight: 400,
                    fontSize: 'clamp(1.55rem, 2.4vw, 2.1rem)',
                    lineHeight: 1.15,
                    color: T.charcoal,
                  }}
                >
                  Access Beyond the Market
                </h2>
                <div style={{ width: 40, marginBottom: 16 }}>
                  <LuxHairline tone="gold" />
                </div>
                <p
                  style={{
                    margin: 0,
                    fontFamily: T.fontBody,
                    fontSize: 14.5,
                    lineHeight: 1.75,
                    color: '#4A433A',
                  }}
                >
                  Opportunities prepared for private review — introduced with discretion, not
                  advertised. This is not a property website.
                </p>
                <div style={{ marginTop: 22 }}>
                  <RareExclusiveTextLink href="/properties">Explore Properties</RareExclusiveTextLink>
                </div>
                <div style={{ marginTop: 12 }}>
                  <RareExclusiveTextLink href="/destination-mauritius">
                    Destination Mauritius
                  </RareExclusiveTextLink>
                </div>
              </RareExclusiveOpaquePanel>
              <div style={{ minHeight: 260, position: 'relative' }}>
                <RareExclusiveHeroVisual showCaption={false} />
              </div>
            </article>

            <article
              id="services"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 0.95fr)',
                minHeight: 340,
                border: `1px solid ${T.hairlineStone}`,
                background: '#F8F4EE',
              }}
              className="re-card-inner"
            >
              <RareExclusiveOpaquePanel
                style={{
                  border: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <LuxEyebrow tone="charcoal">Owner Experience</LuxEyebrow>
                <h2
                  style={{
                    margin: '18px 0 16px',
                    fontFamily: T.fontDisplay,
                    fontWeight: 400,
                    fontSize: 'clamp(1.55rem, 2.4vw, 2.1rem)',
                    lineHeight: 1.15,
                    color: T.charcoal,
                  }}
                >
                  Life. Elevated. Always.
                </h2>
                <div style={{ width: 40, marginBottom: 16 }}>
                  <LuxHairline tone="gold" />
                </div>
                <p
                  style={{
                    margin: 0,
                    fontFamily: T.fontBody,
                    fontSize: 14.5,
                    lineHeight: 1.75,
                    color: '#4A433A',
                  }}
                >
                  From first introduction to ongoing ownership support — one calm, personal
                  advisory thread.
                </p>
                <div style={{ marginTop: 22 }}>
                  <RareExclusiveTextLink href="/private-services">
                    Discover Owner Services
                  </RareExclusiveTextLink>
                </div>
              </RareExclusiveOpaquePanel>
              <div style={{ minHeight: 260, position: 'relative' }}>
                <RareExclusiveHeroVisual
                  src={RARE_EXCLUSIVE_ADVISORY_IMAGE}
                  alt="Mauritius lagoon and private terrace — owner lifestyle"
                  showCaption={false}
                  objectPosition="center 40%"
                />
              </div>
            </article>
          </div>
        </section>

        {/* Teaser bands → full editorial pages */}
        <section
          id="lifestyle"
          style={{
            padding: 'clamp(48px, 7vw, 80px) 32px 0',
            background: T.ivory,
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <LuxEyebrow tone="charcoal" center>
              Lifestyle
            </LuxEyebrow>
            <p
              style={{
                margin: '20px 0 0',
                fontFamily: T.fontDisplay,
                fontStyle: 'italic',
                fontSize: 'clamp(1.25rem, 2.2vw, 1.6rem)',
                lineHeight: 1.5,
                color: '#4A433A',
              }}
            >
              Climate, privacy, schooling, sport, and family quality of life — framed for
              long-term Mauritius living.
            </p>
            <div style={{ marginTop: 22 }}>
              <RareExclusiveTextLink href="/lifestyle">Read lifestyle</RareExclusiveTextLink>
            </div>
          </div>
        </section>

        <section
          id="about"
          style={{
            padding: 'clamp(48px, 7vw, 80px) 32px',
            background: T.ivory,
            textAlign: 'center',
          }}
        >
          <RareExclusiveOpaquePanel style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
            <LuxEyebrow tone="charcoal" center>
              About
            </LuxEyebrow>
            <h2
              style={{
                margin: '22px auto 16px',
                fontFamily: T.fontDisplay,
                fontWeight: 400,
                fontSize: 'clamp(2rem, 4vw, 2.8rem)',
                lineHeight: 1.15,
                color: T.charcoal,
              }}
            >
              Invitation only.
            </h2>
            <p
              style={{
                margin: '0 auto 24px',
                maxWidth: 480,
                fontFamily: T.fontBody,
                fontSize: 15,
                lineHeight: 1.7,
                color: '#4A433A',
              }}
            >
              A private Mauritius platform for residence, lifestyle, and long-horizon decisions —
              curated introductions, not an open portal.
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 18,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <a href="/about" style={rareExclusiveCtaGoldStyle()}>
                About the collection
              </a>
              <RareExclusiveTextLink href="/contact">Contact</RareExclusiveTextLink>
            </div>
          </RareExclusiveOpaquePanel>
        </section>
      </main>
      </RareExclusiveEditorialSpine>

      <RareExclusiveIvoryFooter
        note={
          operatorDebug
            ? 'Client test environment: internal platform references may appear only when debug mode is enabled.'
            : undefined
        }
      />
    </div>
  );
}
