import React from 'react';
import Head from 'next/head';

import { LUXE_MAURICE_BRAND_TOKENS as T } from '../lib/client/luxe-maurice-brand-theme.js';
import { LuxEyebrow, LuxHairline } from './LuxeMauriceBrandPrimitives.js';
import {
  LuxeMauriceFontStylesheet,
  RARE_EXCLUSIVE_PUBLIC_BRAND,
  RARE_EXCLUSIVE_STRAPLINE,
  RareExclusiveFeatureBar,
  RareExclusiveHeroVisual,
  RareExclusiveIvoryFooter,
  RareExclusiveIvoryHeader,
  RareExclusiveLifestylePanel,
  RareExclusiveStackedWordmark,
  RareExclusiveTextLink,
  rareExclusiveCtaGoldStyle,
  rareExclusivePageShellStyle,
} from './RareExclusiveIvoryShell.js';

function safeStr(v) {
  return v != null ? String(v).trim() : '';
}

/**
 * Rare & Exclusive Collection — Concept A Ivory Editorial homepage.
 *
 * Visual target: approved Concept A reference for Issue #633.
 * Client test URL: lux.corpflowai.com (Vercel previews are internal only).
 *
 * Layout: centered R&E crest header · split hero (stacked wordmark + lifestyle
 * visual) · four-pillar feature bar · alternating Private Opportunities /
 * Owner Experience bands · privilege footer. Public copy uses Rare & Exclusive
 * Collection. Apex / core surfaces untouched.
 */
export default function RareExclusiveTenantPresentation({ site }) {
  const s = site || {};
  const operatorDebug = s.client_ui?.operator_debug === true;
  const hero = s.hero || {};
  const media = s.media || {};

  const meta = s.meta && typeof s.meta === 'object' ? s.meta : {};
  const pageTitle =
    safeStr(meta.page_title)?.replace(/LuxeMaurice/gi, RARE_EXCLUSIVE_PUBLIC_BRAND) ||
    `${RARE_EXCLUSIVE_PUBLIC_BRAND} · ${RARE_EXCLUSIVE_STRAPLINE}`;
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
            .re-alt-grid { grid-template-columns: 1fr !important; }
            .re-alt-grid-reverse { direction: ltr !important; }
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
          Client test environment · Concept A Ivory Editorial · lux-only
        </div>
      ) : null}

      <main>
        {/* ─── Concept A split hero ────────────────────────────────── */}
        <section
          className="re-hero-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.05fr)',
            minHeight: 'calc(100vh - 86px)',
            background: T.ivory,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: 'clamp(48px, 7vw, 88px) clamp(28px, 5vw, 72px)',
            }}
          >
            <RareExclusiveStackedWordmark
              tone="charcoal"
              size="hero"
              showSignature={false}
              align="start"
            />
            <p
              style={{
                margin: '28px 0 0',
                fontFamily: T.fontBody,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: T.gold,
              }}
            >
              {RARE_EXCLUSIVE_PUBLIC_BRAND}
            </p>
            <p
              style={{
                margin: '18px 0 0',
                maxWidth: 420,
                fontFamily: T.fontDisplay,
                fontSize: 'clamp(1.2rem, 2vw, 1.55rem)',
                fontStyle: 'italic',
                lineHeight: 1.45,
                color: T.stone,
              }}
            >
              {RARE_EXCLUSIVE_STRAPLINE}
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
            <RareExclusiveHeroVisual />
          </div>
        </section>

        {/* ─── Four-pillar feature bar ─────────────────────────────── */}
        <RareExclusiveFeatureBar />

        {/* ─── Private Opportunities (text left / visual right) ───── */}
        <section
          id="upcoming"
          style={{ padding: 'clamp(72px, 10vw, 120px) clamp(24px, 5vw, 64px)', background: T.ivory }}
        >
          <div
            className="re-alt-grid"
            style={{
              maxWidth: 1180,
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.1fr)',
              gap: 'clamp(36px, 6vw, 80px)',
              alignItems: 'center',
            }}
          >
            <div>
              <LuxEyebrow tone="charcoal">Private Opportunities</LuxEyebrow>
              <h2
                style={{
                  margin: '22px 0 20px',
                  fontFamily: T.fontDisplay,
                  fontWeight: 400,
                  fontSize: 'clamp(2.2rem, 4vw, 3.4rem)',
                  lineHeight: 1.1,
                  color: T.charcoal,
                }}
              >
                Access Beyond the Market
              </h2>
              <div style={{ width: 48, marginBottom: 22 }}>
                <LuxHairline tone="gold" />
              </div>
              <p
                style={{
                  margin: 0,
                  maxWidth: 440,
                  fontFamily: T.fontBody,
                  fontSize: 15.5,
                  lineHeight: 1.85,
                  color: T.stone,
                }}
              >
                Opportunities are prepared for private review before they appear. No open-market
                noise — only introductions arranged with discretion for clients who value legacy,
                privacy, and long-term Mauritius ownership.
              </p>
              <div style={{ marginTop: 28 }}>
                <RareExclusiveTextLink href="/properties">Explore Properties</RareExclusiveTextLink>
              </div>
            </div>
            <div style={{ minHeight: 320, border: `1px solid ${T.hairlineStone}` }}>
              <RareExclusiveHeroVisual showCaption={false} />
            </div>
          </div>
        </section>

        {/* ─── Owner Experience (visual left / text right) ─────────── */}
        <section
          id="services"
          style={{
            padding: 'clamp(72px, 10vw, 120px) clamp(24px, 5vw, 64px)',
            background: '#FBF8F2',
          }}
        >
          <div
            className="re-alt-grid re-alt-grid-reverse"
            style={{
              maxWidth: 1180,
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)',
              gap: 'clamp(36px, 6vw, 80px)',
              alignItems: 'center',
            }}
          >
            <div style={{ minHeight: 320, border: `1px solid ${T.hairlineStone}` }}>
              <RareExclusiveLifestylePanel variant="sea" />
            </div>
            <div>
              <LuxEyebrow tone="charcoal">Owner Experience</LuxEyebrow>
              <h2
                style={{
                  margin: '22px 0 20px',
                  fontFamily: T.fontDisplay,
                  fontWeight: 400,
                  fontSize: 'clamp(2.2rem, 4vw, 3.4rem)',
                  lineHeight: 1.1,
                  color: T.charcoal,
                }}
              >
                Life. Elevated. Always.
              </h2>
              <div style={{ width: 48, marginBottom: 22 }}>
                <LuxHairline tone="gold" />
              </div>
              <p
                style={{
                  margin: 0,
                  maxWidth: 440,
                  fontFamily: T.fontBody,
                  fontSize: 15.5,
                  lineHeight: 1.85,
                  color: T.stone,
                }}
              >
                From first introduction to ongoing ownership support, a single private advisory
                thread holds design decisions, progress updates, and concierge access — calm,
                precise, and personal.
              </p>
              <div style={{ marginTop: 28 }}>
                <RareExclusiveTextLink href="/concierge">
                  Discover Owner Services
                </RareExclusiveTextLink>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Destination Mauritius ───────────────────────────────── */}
        <section
          id="destination"
          style={{ padding: 'clamp(72px, 10vw, 120px) clamp(24px, 5vw, 64px)', background: T.ivory }}
        >
          <div style={{ maxWidth: 820, margin: '0 auto', textAlign: 'center' }}>
            <LuxEyebrow tone="charcoal" center>
              Destination Mauritius
            </LuxEyebrow>
            <h2
              style={{
                margin: '24px 0 20px',
                fontFamily: T.fontDisplay,
                fontWeight: 400,
                fontSize: 'clamp(2.2rem, 4.5vw, 3.6rem)',
                lineHeight: 1.12,
                color: T.charcoal,
              }}
            >
              A quieter life with serious long-term value.
            </h2>
            <div style={{ margin: '0 auto 28px', width: 48 }}>
              <LuxHairline tone="gold" />
            </div>
            <p
              style={{
                margin: 0,
                fontFamily: T.fontBody,
                fontSize: 16,
                lineHeight: 1.9,
                color: T.stone,
              }}
            >
              Lifestyle, security, connectivity, and legacy — framed for private wealth clients
              considering Mauritius as a place to invest, live, and build. This is not a property website.
            </p>
          </div>
        </section>

        {/* ─── Lifestyle / About ───────────────────────────────────── */}
        <section
          id="lifestyle"
          style={{
            padding: 'clamp(72px, 10vw, 110px) clamp(24px, 5vw, 64px)',
            background: '#FBF8F2',
          }}
        >
          <div
            style={{
              maxWidth: 1120,
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 0,
              borderTop: `1px solid ${T.hairlineStone}`,
              borderBottom: `1px solid ${T.hairlineStone}`,
            }}
          >
            {[
              ['Lifestyle', 'Climate, privacy, schooling, sport, and family quality of life.'],
              ['Discretion', 'Conversations begin by introduction and continue with care.'],
              ['Legacy', 'Ownership framed for permanence — not brochure pressure.'],
            ].map(([title, body], i, arr) => (
              <article
                key={title}
                style={{
                  padding: '40px 28px',
                  borderRight: i < arr.length - 1 ? `1px solid ${T.hairlineStone}` : 'none',
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
                <p style={{ margin: '14px 0 0', fontSize: 14.5, lineHeight: 1.75, color: T.stone }}>
                  {body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="about"
          style={{
            padding: 'clamp(80px, 11vw, 130px) 32px',
            background: T.ivory,
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <LuxEyebrow tone="charcoal" center>
              Private Advisory
            </LuxEyebrow>
            <h2
              style={{
                margin: '26px auto 22px',
                fontFamily: T.fontDisplay,
                fontWeight: 400,
                fontSize: 'clamp(2.2rem, 4.5vw, 3.6rem)',
                lineHeight: 1.12,
                color: T.charcoal,
              }}
            >
              Invitation only.
            </h2>
            <p
              style={{
                margin: '0 auto 36px',
                maxWidth: 560,
                fontSize: 16,
                lineHeight: 1.85,
                color: T.stone,
              }}
            >
              Tell us what you are seeking in Mauritius. A private advisor responds with the next
              suitable step — curated, discreet, and considered.
            </p>
            <a href="/concierge" style={rareExclusiveCtaGoldStyle()}>
              Request an Invitation
            </a>
          </div>
        </section>
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
