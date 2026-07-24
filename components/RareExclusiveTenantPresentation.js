import React, { useMemo } from 'react';
import Head from 'next/head';

import {
  LUXE_MAURICE_BRAND_TOKENS as T,
  LUXE_MAURICE_BRAND_STRAPLINE,
  LUXE_MAURICE_DESIGN_PILLARS,
} from '../lib/client/luxe-maurice-brand-theme.js';
import { LuxEyebrow, LuxHairline } from './LuxeMauriceBrandPrimitives.js';
import { safeLuxSameOriginPublicImagePath } from '../lib/client/luxe-maurice-property-resolve.js';
import {
  LuxeMauriceFontStylesheet,
  RARE_EXCLUSIVE_PUBLIC_BRAND,
  RareExclusiveHeroVisual,
  RareExclusiveIvoryFooter,
  RareExclusiveIvoryHeader,
  RareExclusiveStackedWordmark,
  rareExclusiveCtaPrimaryStyle,
  rareExclusiveCtaQuietStyle,
  rareExclusivePageShellStyle,
} from './RareExclusiveIvoryShell.js';

function safeStr(v) {
  return v != null ? String(v).trim() : '';
}

/**
 * Rare & Exclusive Collection — Option A Ivory Editorial homepage.
 *
 * Client test environment: lux.corpflowai.com (Issue #633).
 * Vercel branch previews are internal only.
 *
 * Layout: fine-line luxury nav · split hero (stacked wordmark + right-side
 * Mauritius lifestyle visual) · curated ivory bands. Public copy uses
 * Rare & Exclusive Collection. LuxeMauriceTenantPresentation.js remains as
 * fallback; corpflowai.com / core.corpflowai.com are untouched.
 */
export default function RareExclusiveTenantPresentation({ site }) {
  const s = site || {};
  const operatorDebug = s.client_ui?.operator_debug === true;
  const hero = s.hero || {};
  const contact = s.sections?.contact || {};
  const media = s.media || {};
  const staged = Array.isArray(s.staged_properties) ? s.staged_properties : [];
  const cardMediaObj =
    s.lux_published_card_media &&
    typeof s.lux_published_card_media === 'object' &&
    !Array.isArray(s.lux_published_card_media)
      ? s.lux_published_card_media
      : {};

  const visibleStaged = useMemo(
    () =>
      staged
        .filter((p) => p && !String(p.slug || '').toLowerCase().includes('demo'))
        .slice(0, 3),
    [staged],
  );

  const meta = s.meta && typeof s.meta === 'object' ? s.meta : {};
  const pageTitle =
    safeStr(meta.page_title)?.replace(/LuxeMaurice/gi, RARE_EXCLUSIVE_PUBLIC_BRAND) ||
    `${RARE_EXCLUSIVE_PUBLIC_BRAND} · Private Wealth & Lifestyle Platform for Mauritius`;
  const seoDescriptionRaw =
    safeStr(meta.description)?.replace(/LuxeMaurice/gi, RARE_EXCLUSIVE_PUBLIC_BRAND) ||
    `${RARE_EXCLUSIVE_PUBLIC_BRAND} — curated private opportunities, private advisory, and concierge-led access for discerning clients considering Mauritius.`;
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

  const headline =
    safeStr(hero.headline)?.replace(/LuxeMaurice/gi, RARE_EXCLUSIVE_PUBLIC_BRAND) ||
    'Private Mauritius residences by introduction only.';
  const tagline =
    safeStr(hero.tagline)?.replace(/LuxeMaurice/gi, RARE_EXCLUSIVE_PUBLIC_BRAND) ||
    LUXE_MAURICE_BRAND_STRAPLINE;

  const strategicBase = [
    ['01', 'Lifestyle', 'Climate, privacy, schooling, sport and long-term family quality of life.'],
    ['02', 'Security', 'A stable, well-governed island environment for settlement and ownership.'],
    ['03', 'Connectivity', 'Indian Ocean positioning with links to Africa, Asia, the Gulf and Europe.'],
    ['04', 'Legacy', 'A calm place to build assets and transfer value across generations.'],
    ['05', 'Opportunity', 'Curated residences and development partnerships prepared for private review.'],
  ];

  const journeys = [
    {
      title: 'Completed Residence Buyer',
      body: 'For clients seeking finished, furnished and exceptional residences selected for privacy, architectural quality and immediacy.',
    },
    {
      title: 'Development Partner',
      body: 'For clients buying earlier in the curve, with finishes, furnishings and procurement coordinated through one private advisory relationship.',
    },
  ];

  const approach = [
    ['Private', 'No open-market noise. Conversations begin by introduction and continue with discretion.'],
    ['Curated', 'Every opportunity is selected, prepared and explained before a client is asked to decide.'],
    ['Considered', 'The experience is calm, editorial and precise from first enquiry to ownership support.'],
  ];

  const services = [
    ['Private Advisory', 'A single discreet channel for residences, development partnerships and ownership questions.'],
    ['Owner Experience', 'Design decisions, procurement and progress updates held in one calm advisory thread.'],
    ['Concierge Access', 'Introductions arranged when ready — invited, not advertised.'],
  ];

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
            .re-hero-visual { min-height: 280px !important; max-height: 420px; }
          }
        `}</style>
      </Head>

      <RareExclusiveIvoryHeader activeHref="/" />

      {operatorDebug ? (
        <div
          style={{
            padding: '10px 32px',
            fontSize: 11,
            color: T.stone,
            background: 'rgba(168, 132, 44, 0.10)',
            borderBottom: `1px solid ${T.hairlineStone}`,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            textAlign: 'center',
          }}
        >
          Client test environment · Ivory Editorial · lux-only
        </div>
      ) : null}

      <main>
        {/* ─── Split hero: wordmark + lifestyle visual ─────────────── */}
        <section
          className="re-hero-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 0.95fr)',
            minHeight: 'calc(100vh - 88px)',
            background: 'linear-gradient(180deg, #F4EFE8 0%, #EFE6D8 55%, #F8F4EE 100%)',
            borderBottom: `1px solid ${T.hairlineStone}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: 'clamp(48px, 8vw, 96px) clamp(24px, 5vw, 72px)',
              position: 'relative',
            }}
          >
            <LuxEyebrow tone="charcoal">Private Wealth & Lifestyle Platform</LuxEyebrow>
            <div style={{ marginTop: 36 }}>
              <RareExclusiveStackedWordmark
                tone="charcoal"
                size="hero"
                showSignature
                align="start"
              />
            </div>
            <p
              style={{
                margin: '40px 0 0',
                maxWidth: 480,
                fontFamily: T.fontDisplay,
                fontSize: 'clamp(1.25rem, 2.2vw, 1.75rem)',
                fontStyle: 'italic',
                lineHeight: 1.45,
                color: T.stone,
              }}
            >
              {headline}
            </p>
            <p
              style={{
                margin: '16px 0 0',
                maxWidth: 460,
                fontFamily: T.fontBody,
                fontSize: 15,
                lineHeight: 1.8,
                color: T.stoneSoft || T.stone,
              }}
            >
              {tagline}
            </p>
            <div style={{ marginTop: 40, display: 'flex', flexWrap: 'wrap', gap: 14 }}>
              <a
                href={safeStr(hero.cta_href) || '/concierge'}
                style={rareExclusiveCtaPrimaryStyle()}
              >
                {safeStr(hero.cta_label) || 'Request Private Access'}
              </a>
              <a href="/properties" style={rareExclusiveCtaQuietStyle()}>
                View Properties
              </a>
            </div>
            <p
              style={{
                margin: '28px 0 0',
                fontFamily: T.fontBody,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: T.gold,
              }}
            >
              This is not a property website.
            </p>
          </div>
          <div className="re-hero-visual" style={{ minHeight: '100%', position: 'relative' }}>
            <RareExclusiveHeroVisual />
          </div>
        </section>

        {/* ─── Editorial platform note ─────────────────────────────── */}
        <section id="about" style={{ padding: 'clamp(84px, 12vw, 140px) 32px', background: T.ivory }}>
          <div style={{ maxWidth: 980, margin: '0 auto', textAlign: 'center' }}>
            <LuxEyebrow tone="charcoal" center>
              A private editorial platform
            </LuxEyebrow>
            <p
              style={{
                margin: '34px auto 0',
                maxWidth: 820,
                fontFamily: T.fontDisplay,
                fontWeight: 400,
                fontSize: 'clamp(2.1rem, 4.6vw, 3.8rem)',
                lineHeight: 1.15,
                color: T.charcoal,
                letterSpacing: -0.4,
              }}
            >
              Not a property portal. A quiet route into carefully prepared Mauritius opportunities.
            </p>
            <div style={{ margin: '48px auto 0', width: 64 }}>
              <LuxHairline tone="gold" />
            </div>
            <p
              style={{
                margin: '42px auto 0',
                maxWidth: 700,
                fontFamily: T.fontBody,
                fontSize: 16.5,
                lineHeight: 1.9,
                color: T.stone,
              }}
            >
              {RARE_EXCLUSIVE_PUBLIC_BRAND} is built for clients who do not want noise, search pages
              or public pressure. The experience is curated, discreet and advisory-led from first
              conversation to ownership support.
            </p>
          </div>
        </section>

        {/* ─── Destination Mauritius ───────────────────────────────── */}
        <section id="destination" style={{ padding: 'clamp(84px, 11vw, 140px) 32px', background: '#FBF8F2' }}>
          <div style={{ maxWidth: 1120, margin: '0 auto' }}>
            <LuxEyebrow tone="charcoal">Mauritius as a strategic base</LuxEyebrow>
            <h2
              style={{
                margin: '28px 0 22px',
                maxWidth: 720,
                fontFamily: T.fontDisplay,
                fontWeight: 400,
                fontSize: 'clamp(2.2rem, 4.5vw, 3.8rem)',
                lineHeight: 1.08,
                color: T.charcoal,
              }}
            >
              A lighter, quieter life with serious long-term value.
            </h2>
            <p style={{ margin: 0, maxWidth: 640, fontSize: 16, lineHeight: 1.85, color: T.stone }}>
              The platform frames Mauritius through lifestyle, security, connectivity, legacy and
              opportunity — not merely bedrooms, bathrooms and brochure copy.
            </p>
            <div style={{ marginTop: 72 }}>
              <LuxHairline tone="stone" />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                }}
              >
                {strategicBase.map(([num, title, body], i) => (
                  <article
                    key={title}
                    style={{
                      padding: '38px 22px 42px',
                      borderRight:
                        i < strategicBase.length - 1 ? `1px solid ${T.hairlineStone}` : 'none',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.32em',
                        color: T.gold,
                        textTransform: 'uppercase',
                      }}
                    >
                      {num}
                    </div>
                    <h3
                      style={{
                        margin: '18px 0 14px',
                        fontFamily: T.fontDisplay,
                        fontSize: 24,
                        fontWeight: 500,
                        color: T.charcoal,
                      }}
                    >
                      {title}
                    </h3>
                    <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.75, color: T.stone }}>
                      {body}
                    </p>
                  </article>
                ))}
              </div>
              <LuxHairline tone="stone" />
            </div>
          </div>
        </section>

        {/* ─── Lifestyle ───────────────────────────────────────────── */}
        <section id="lifestyle" style={{ padding: 'clamp(84px, 11vw, 140px) 32px', background: T.ivory }}>
          <div style={{ maxWidth: 1120, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto' }}>
              <LuxEyebrow tone="charcoal" center>
                Two private client journeys
              </LuxEyebrow>
              <h2
                style={{
                  margin: '28px 0 22px',
                  fontFamily: T.fontDisplay,
                  fontWeight: 400,
                  fontSize: 'clamp(2.2rem, 4.5vw, 3.8rem)',
                  lineHeight: 1.08,
                  color: T.charcoal,
                }}
              >
                Two buyers. One standard of care.
              </h2>
              <p style={{ margin: 0, fontSize: 16, lineHeight: 1.85, color: T.stone }}>
                A completed-residence buyer and a development partner need different information,
                but they both need discretion, clarity and a private advisor who can keep the
                process calm.
              </p>
            </div>
            <div
              style={{
                marginTop: 72,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                borderTop: `1px solid ${T.hairlineStone}`,
                borderBottom: `1px solid ${T.hairlineStone}`,
              }}
            >
              {journeys.map((j, i) => (
                <article
                  key={j.title}
                  style={{
                    padding: '52px clamp(24px, 4vw, 56px)',
                    borderRight: i < journeys.length - 1 ? `1px solid ${T.hairlineStone}` : 'none',
                  }}
                >
                  <LuxEyebrow tone="charcoal">Journey 0{i + 1}</LuxEyebrow>
                  <h3
                    style={{
                      margin: '24px 0 18px',
                      fontFamily: T.fontDisplay,
                      fontWeight: 400,
                      fontSize: 32,
                      lineHeight: 1.12,
                      color: T.charcoal,
                    }}
                  >
                    {j.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.85, color: T.stone }}>
                    {j.body}
                  </p>
                  <a
                    href="/concierge"
                    style={{
                      display: 'inline-block',
                      marginTop: 34,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.28em',
                      color: T.gold,
                      textTransform: 'uppercase',
                      textDecoration: 'none',
                    }}
                  >
                    Begin a private conversation
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Private opportunities ───────────────────────────────── */}
        <section id="upcoming" style={{ padding: 'clamp(84px, 11vw, 140px) 32px', background: '#FBF8F2' }}>
          <div style={{ maxWidth: 1120, margin: '0 auto' }}>
            <LuxEyebrow tone="charcoal">Private opportunities</LuxEyebrow>
            <h2
              style={{
                margin: '28px 0 22px',
                maxWidth: 720,
                fontFamily: T.fontDisplay,
                fontWeight: 400,
                fontSize: 'clamp(2.2rem, 4.5vw, 3.8rem)',
                lineHeight: 1.08,
                color: T.charcoal,
              }}
            >
              Invited. Not advertised.
            </h2>
            <p style={{ margin: 0, maxWidth: 640, fontSize: 16, lineHeight: 1.85, color: T.stone }}>
              Opportunities are prepared for review before being shown. Public listing behaviour is
              intentionally avoided; the site points the right clients toward private advisory
              access.
            </p>
            <div
              style={{
                marginTop: 64,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 42,
              }}
            >
              {visibleStaged.length ? (
                visibleStaged.map((p) => {
                  const refKey = safeStr(p.slug).toLowerCase();
                  const pubCard = cardMediaObj[refKey];
                  const cardSrc =
                    pubCard && typeof pubCard.src === 'string' ? pubCard.src.trim() : '';
                  const staticHero = safeLuxSameOriginPublicImagePath(p?.images?.hero);
                  const heroPath = cardSrc || staticHero;
                  return (
                    <article
                      key={p.slug}
                      style={{
                        background: T.ivory,
                        border: `1px solid ${T.hairlineStone}`,
                      }}
                    >
                      <div
                        style={{
                          aspectRatio: '4 / 3',
                          background: '#E7DED0',
                          overflow: 'hidden',
                        }}
                      >
                        {heroPath ? (
                          <img
                            src={heroPath}
                            alt={safeStr(p.title) || 'Private opportunity'}
                            decoding="async"
                            loading="lazy"
                            style={{
                              display: 'block',
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        ) : null}
                      </div>
                      <div style={{ padding: 28 }}>
                        <LuxEyebrow tone="charcoal">
                          {safeStr(p.region) || 'Mauritius'}
                        </LuxEyebrow>
                        <h3
                          style={{
                            margin: '18px 0 12px',
                            fontFamily: T.fontDisplay,
                            fontWeight: 500,
                            fontSize: 26,
                            lineHeight: 1.2,
                            color: T.charcoal,
                          }}
                        >
                          {safeStr(p.title) || 'Private opportunity'}
                        </h3>
                        {p.teaser ? (
                          <p
                            style={{
                              margin: 0,
                              fontSize: 14.5,
                              lineHeight: 1.75,
                              color: T.stone,
                            }}
                          >
                            {safeStr(p.teaser)}
                          </p>
                        ) : null}
                        <a
                          href={`/property/${encodeURIComponent(p.slug)}`}
                          style={{
                            display: 'inline-block',
                            marginTop: 24,
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.26em',
                            color: T.gold,
                            textTransform: 'uppercase',
                            textDecoration: 'none',
                          }}
                        >
                          Opportunity memorandum
                        </a>
                      </div>
                    </article>
                  );
                })
              ) : (
                <article
                  style={{
                    gridColumn: '1 / -1',
                    padding: '80px 32px',
                    textAlign: 'center',
                    border: `1px solid ${T.hairlineStone}`,
                    background: T.ivory,
                  }}
                >
                  <LuxEyebrow tone="charcoal" center>
                    A quiet moment before the next reveal
                  </LuxEyebrow>
                  <p
                    style={{
                      margin: '28px auto 0',
                      maxWidth: 560,
                      fontFamily: T.fontDisplay,
                      fontSize: 30,
                      lineHeight: 1.35,
                      color: T.charcoal,
                    }}
                  >
                    Private opportunities are being prepared for client review.
                  </p>
                  <div style={{ marginTop: 34 }}>
                    <a href="/concierge" style={rareExclusiveCtaPrimaryStyle()}>
                      Request Private Access
                    </a>
                  </div>
                </article>
              )}
            </div>
          </div>
        </section>

        {/* ─── Private Services ────────────────────────────────────── */}
        <section id="services" style={{ padding: 'clamp(84px, 11vw, 140px) 32px', background: T.ivory }}>
          <div style={{ maxWidth: 1120, margin: '0 auto' }}>
            <LuxEyebrow tone="charcoal">Private Services</LuxEyebrow>
            <h2
              style={{
                margin: '28px 0 22px',
                maxWidth: 720,
                fontFamily: T.fontDisplay,
                fontWeight: 400,
                fontSize: 'clamp(2.2rem, 4.5vw, 3.8rem)',
                lineHeight: 1.08,
                color: T.charcoal,
              }}
            >
              Confidence at distance.
            </h2>
            <p style={{ margin: 0, maxWidth: 640, fontSize: 16, lineHeight: 1.85, color: T.stone }}>
              Design decisions, procurement, progress updates and concierge support are held in one
              calm advisory thread.
            </p>
            <div style={{ marginTop: 64, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 0, borderTop: `1px solid ${T.hairlineStone}` }}>
              {services.map(([title, body], i) => (
                <article
                  key={title}
                  style={{
                    padding: '40px 28px',
                    borderRight: i < services.length - 1 ? `1px solid ${T.hairlineStone}` : 'none',
                    borderBottom: `1px solid ${T.hairlineStone}`,
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: T.fontDisplay,
                      fontSize: 26,
                      fontWeight: 500,
                      color: T.charcoal,
                    }}
                  >
                    {title}
                  </h3>
                  <p style={{ margin: '16px 0 0', fontSize: 14.5, lineHeight: 1.75, color: T.stone }}>
                    {body}
                  </p>
                </article>
              ))}
            </div>
            <div style={{ marginTop: 48 }}>
              <LuxHairline tone="stone" />
              {approach.map(([title, body], i) => (
                <div
                  key={title}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(140px, 220px) 1fr',
                    gap: 'clamp(20px, 5vw, 64px)',
                    padding: '34px 0',
                    borderBottom: `1px solid ${T.hairlineStone}`,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.34em',
                        color: T.gold,
                        textTransform: 'uppercase',
                      }}
                    >
                      0{i + 1}
                    </div>
                    <h3
                      style={{
                        margin: '14px 0 0',
                        fontFamily: T.fontDisplay,
                        fontWeight: 500,
                        fontSize: 24,
                        color: T.charcoal,
                      }}
                    >
                      {title}
                    </h3>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      maxWidth: 620,
                      fontSize: 15.5,
                      lineHeight: 1.85,
                      color: T.stone,
                    }}
                  >
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Design language (charcoal contrast band) ────────────── */}
        <section
          style={{
            padding: 'clamp(84px, 11vw, 140px) 32px',
            background: T.charcoal,
            color: T.ivory,
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <LuxEyebrow center>Design language</LuxEyebrow>
            <h2
              style={{
                margin: '28px auto 24px',
                fontFamily: T.fontDisplay,
                fontWeight: 400,
                fontSize: 'clamp(2.2rem, 5vw, 4rem)',
                lineHeight: 1.12,
                color: T.ivory,
              }}
            >
              Exclusive. Strategic. Private. Extraordinary.
            </h2>
            <p
              style={{
                margin: '0 auto',
                maxWidth: 620,
                fontSize: 15.5,
                lineHeight: 1.85,
                color: T.ivoryMuted,
              }}
            >
              Ivory Editorial: spacious, pale, discreet and premium — with charcoal used as
              contrast, not as the dominant page colour.
            </p>
            <div
              style={{
                marginTop: 56,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                borderTop: `1px solid ${T.hairlineSoft}`,
                borderBottom: `1px solid ${T.hairlineSoft}`,
              }}
            >
              {LUXE_MAURICE_DESIGN_PILLARS.map((pillar, i, arr) => (
                <div
                  key={pillar.key}
                  style={{
                    padding: '32px 22px',
                    borderRight: i < arr.length - 1 ? `1px solid ${T.hairlineSoft}` : 'none',
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: T.fontDisplay,
                      fontWeight: 500,
                      fontSize: 24,
                      color: T.ivory,
                    }}
                  >
                    {pillar.label}
                  </h3>
                  <p
                    style={{
                      margin: '10px 0 0',
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color: T.gold,
                    }}
                  >
                    {pillar.sub}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Private Advisory CTA ────────────────────────────────── */}
        <section
          id="owner-experience"
          style={{ padding: 'clamp(96px, 13vw, 160px) 32px', background: T.ivory, textAlign: 'center' }}
        >
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <LuxEyebrow tone="charcoal" center>
              Private Advisory
            </LuxEyebrow>
            <h2
              style={{
                margin: '30px auto 24px',
                fontFamily: T.fontDisplay,
                fontWeight: 400,
                fontSize: 'clamp(2.4rem, 5vw, 4rem)',
                lineHeight: 1.1,
                color: T.charcoal,
              }}
            >
              Request private access.
            </h2>
            <p
              style={{
                margin: '0 auto 42px',
                maxWidth: 580,
                fontSize: 16,
                lineHeight: 1.85,
                color: T.stone,
              }}
            >
              Tell us what you are seeking in Mauritius. A private advisor responds with the next
              suitable step.
            </p>
            <a href="/concierge" style={rareExclusiveCtaPrimaryStyle()}>
              Request Private Access
            </a>
          </div>
        </section>

        {contact.email || contact.phone || contact.website ? (
          <section
            style={{
              padding: '52px 32px',
              background: '#FBF8F2',
              borderTop: `1px solid ${T.hairlineStone}`,
            }}
          >
            <div
              style={{
                maxWidth: 1120,
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                gap: 32,
              }}
            >
              {contact.email ? (
                <div>
                  <LuxEyebrow tone="charcoal">Email</LuxEyebrow>
                  <a
                    href={`mailto:${contact.email}`}
                    style={{
                      display: 'inline-block',
                      marginTop: 12,
                      color: T.charcoal,
                      textDecoration: 'none',
                      fontFamily: T.fontDisplay,
                      fontSize: 20,
                    }}
                  >
                    {contact.email}
                  </a>
                </div>
              ) : null}
              {contact.phone ? (
                <div>
                  <LuxEyebrow tone="charcoal">By appointment</LuxEyebrow>
                  <a
                    href={`tel:${contact.phone}`}
                    style={{
                      display: 'inline-block',
                      marginTop: 12,
                      color: T.charcoal,
                      textDecoration: 'none',
                      fontFamily: T.fontDisplay,
                      fontSize: 20,
                    }}
                  >
                    {contact.phone}
                  </a>
                </div>
              ) : null}
              {contact.website ? (
                <div>
                  <LuxEyebrow tone="charcoal">Web</LuxEyebrow>
                  <a
                    href={contact.website}
                    style={{
                      display: 'inline-block',
                      marginTop: 12,
                      color: T.charcoal,
                      textDecoration: 'none',
                      fontFamily: T.fontDisplay,
                      fontSize: 20,
                    }}
                  >
                    {contact.website}
                  </a>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
      </main>

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
