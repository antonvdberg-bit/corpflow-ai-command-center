import React, { useMemo, useState } from 'react';
import Head from 'next/head';

import {
  LUXE_MAURICE_BRAND_TOKENS as T,
  LUXE_MAURICE_BRAND_SIGNATURE,
  LUXE_MAURICE_BRAND_STRAPLINE,
  LUXE_MAURICE_DESIGN_PILLARS,
} from '../lib/client/luxe-maurice-brand-theme.js';
import {
  LuxeMauriceFontStylesheet,
  LuxeMauriceMonogram,
  LuxeMauriceWordmark,
  LuxEyebrow,
  LuxHairline,
} from './LuxeMauriceBrandPrimitives.js';
import { safeLuxSameOriginPublicImagePath } from '../lib/client/luxe-maurice-property-resolve.js';

function safeStr(v) {
  return v != null ? String(v).trim() : '';
}

/**
 * LuxeMaurice public homepage — editorial cinematic shell for `lux.corpflowai.com`.
 *
 * Brand-fidelity rebuild (2026-06-11) aligned to the client-approved brand
 * guideline and presentation deck. Reference benchmarks: Aman, Rosewood,
 * Four Seasons Private Residences, Sotheby's Private Office. See
 * `docs/LUX/LUXEMAURICE_STRATEGIC_VISION_2030.md`.
 *
 * Design rules in effect on this surface:
 *   - Four-colour brand system only — charcoal, ivory, gold, stone.
 *   - Cormorant Garamond for every heading; Inter for every body / eyebrow.
 *   - Hairline dividers in gold or ivory rather than hard borders.
 *   - Large negative space — sections breathe at the desktop viewport.
 *   - Cinematic hero — no property cards / listing grid above the fold.
 *   - No portal / SaaS / search-engine affordances; this is a private
 *     wealth platform that points at a single private-advisory CTA.
 */
export default function LuxeMauriceTenantPresentation({ site }) {
  const s = site || {};
  const operatorDebug = s.client_ui?.operator_debug === true;
  const hero = s.hero || {};
  const about = s.sections?.about || {};
  const services = s.sections?.services || {};
  const contact = s.sections?.contact || {};
  const media = s.media || {};
  const languages = Array.isArray(s.languages) ? s.languages : ['en', 'fr', 'ru'];
  const langDefault =
    typeof s.lang_default === 'string' && s.lang_default ? s.lang_default : 'en';
  const lang =
    typeof s.lang_active === 'string' && s.lang_active ? s.lang_active : langDefault;

  const i18n = s.i18n && typeof s.i18n === 'object' ? s.i18n : {};
  const i18nBlock = i18n[lang] && typeof i18n[lang] === 'object' ? i18n[lang] : null;
  const tHero = i18nBlock?.hero && typeof i18nBlock.hero === 'object' ? i18nBlock.hero : null;
  const tAbout = i18nBlock?.about && typeof i18nBlock.about === 'object' ? i18nBlock.about : null;

  const meta = s.meta && typeof s.meta === 'object' ? s.meta : {};
  const pageTitle =
    safeStr(meta.page_title) ||
    'LuxeMaurice · Private Wealth & Lifestyle Platform for Mauritius';

  const headline =
    safeStr(tHero?.headline) ||
    safeStr(tHero?.subtitle) ||
    safeStr(hero.headline) ||
    safeStr(hero.subtitle) ||
    LUXE_MAURICE_BRAND_SIGNATURE;
  const tagline =
    safeStr(tHero?.tagline) ||
    safeStr(hero.tagline) ||
    LUXE_MAURICE_BRAND_STRAPLINE;

  const seoDescriptionRaw =
    safeStr(meta.description) ||
    'LuxeMaurice — Private Wealth & Lifestyle Platform for Mauritius. Curated private opportunities, private advisory, owner experience, and concierge-led access for discerning international clients considering Mauritius as a place to invest, live, and build.';
  const seoDescription =
    seoDescriptionRaw.length > 320 ? `${seoDescriptionRaw.slice(0, 317)}…` : seoDescriptionRaw;
  const seoCanonical = 'https://lux.corpflowai.com/';
  const seoOgImage =
    safeStr(meta.og_image_url) ||
    (typeof media.hero_image_url === 'string' && media.hero_image_url.startsWith('http')
      ? media.hero_image_url
      : '');

  const aboutTitle =
    safeStr(tAbout?.title) || safeStr(about.title) || 'Mauritius as a strategic base';
  const aboutBody = safeStr(tAbout?.body) || safeStr(about.body) || '';

  const servicesIntro = safeStr(services.intro) || '';
  const items = Array.isArray(services.items) ? services.items : [];
  const staged = Array.isArray(s.staged_properties) ? s.staged_properties : [];
  const cardMediaObj =
    s.lux_published_card_media &&
    typeof s.lux_published_card_media === 'object' &&
    !Array.isArray(s.lux_published_card_media)
      ? s.lux_published_card_media
      : {};

  const [listFilter, setListFilter] = useState('all');
  const visibleStaged = useMemo(() => {
    if (!staged.length) return [];
    if (listFilter === 'all') return staged;
    return staged.filter((p) => p && String(p.group || '').toLowerCase() === listFilter);
  }, [staged, listFilter]);

  const STRATEGIC_BASE = [
    {
      label: 'Lifestyle',
      detail:
        'Climate, security, schools, sport, nature, and a long-term family quality of life.',
    },
    {
      label: 'Security',
      detail:
        'Political stability and a credible, well-governed environment to settle in.',
    },
    {
      label: 'Connectivity',
      detail:
        'Indian Ocean positioning with reliable links to Africa, Asia, the Gulf, and Europe.',
    },
    {
      label: 'Legacy',
      detail:
        'A serious place to build assets that pass calmly across generations.',
    },
    {
      label: 'Opportunity',
      detail:
        'A mature private real-estate segment, with curated access available through advisory.',
    },
  ];

  const TWO_JOURNEYS = [
    {
      title: 'Completed Residence Buyer',
      body:
        'For clients who want finished, furnished, exceptional residences — selected with privacy, architectural quality, and immediacy in mind.',
      tags: ['Private viewing', 'Immediate occupation', 'Discreet acquisition'],
    },
    {
      title: 'Development Partner',
      body:
        'For clients who buy earlier in the curve and participate — finishes, materials, furnishings, procurement — with a single advisor coordinating the work and the decisions.',
      tags: ['Co-created residence', 'Finishes & furnishings', 'Development concierge'],
    },
  ];

  const OWNER_EXPERIENCE = [
    [
      'Design decisions',
      'Approve finishes, materials, and furnishings from anywhere — with curated options and clear deadlines.',
    ],
    [
      'Procurement',
      'Review suppliers, lead times, and origin. Decide once. Watch it executed on the ground.',
    ],
    [
      'Progress updates',
      'Verified construction milestones, private media, and dated context — never noise.',
    ],
    [
      'Concierge support',
      'On-island errands, specialist introductions, and the human layer behind every decision.',
    ],
  ];

  /* ───────── Inline atoms ───────── */

  const ctaPrimary = (label, href) => (
    <a
      href={href}
      style={{
        display: 'inline-block',
        padding: '16px 30px',
        borderRadius: T.radiusEditorial,
        background: T.gold,
        color: T.charcoal,
        fontFamily: T.fontBody,
        fontWeight: 700,
        fontSize: 12.5,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        textDecoration: 'none',
      }}
    >
      {label}
    </a>
  );

  const ctaQuiet = (label, href, tone = 'ivory') => (
    <a
      href={href}
      style={{
        display: 'inline-block',
        padding: '15px 28px',
        borderRadius: T.radiusEditorial,
        border: `1px solid ${tone === 'ivory' ? T.hairline : T.hairlineStone}`,
        background: 'transparent',
        color: tone === 'ivory' ? T.ivory : T.charcoal,
        fontFamily: T.fontBody,
        fontWeight: 600,
        fontSize: 12,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        textDecoration: 'none',
      }}
    >
      {label}
    </a>
  );

  const sectionRule = (tone = 'ivoryHair') => (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 32px' }}>
      <LuxHairline tone={tone === 'ivoryHair' ? 'ivory' : 'stone'} />
    </div>
  );

  return (
    <div
      style={{
        fontFamily: T.fontBody,
        background: T.charcoal,
        color: T.ivory,
        minHeight: '100vh',
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

      {/* ─── Header — quiet, monogram-led ──────────────────────────────── */}
      <header
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
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
        <nav
          aria-label="LuxeMaurice"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 28,
            flexWrap: 'wrap',
          }}
        >
          <a
            href="/properties"
            style={{
              fontFamily: T.fontBody,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.26em',
              textTransform: 'uppercase',
              color: T.ivoryMuted,
              textDecoration: 'none',
            }}
          >
            Private Opportunities
          </a>
          <a
            href="#owner-experience"
            style={{
              fontFamily: T.fontBody,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.26em',
              textTransform: 'uppercase',
              color: T.ivoryMuted,
              textDecoration: 'none',
            }}
          >
            Owner Experience
          </a>
          <a
            href="/concierge"
            style={{
              fontFamily: T.fontBody,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.26em',
              textTransform: 'uppercase',
              color: T.gold,
              textDecoration: 'none',
            }}
          >
            Private Advisory
          </a>
          <select
            defaultValue={lang}
            aria-label="Language"
            onChange={(e) => {
              try {
                const u = new URL(window.location.href);
                u.searchParams.set('lang', e.target.value);
                window.location.href = u.toString();
              } catch {
                /* ignore */
              }
            }}
            style={{
              background: 'transparent',
              border: `1px solid ${T.hairline}`,
              padding: '6px 10px',
              color: T.ivoryMuted,
              fontFamily: T.fontBody,
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              borderRadius: T.radiusEditorial,
            }}
          >
            {languages.map((l) => (
              <option
                key={l}
                value={l}
                style={{ background: T.charcoal, color: T.ivory }}
              >
                {String(l).toUpperCase()}
              </option>
            ))}
          </select>
        </nav>
      </header>

      {operatorDebug ? (
        <div
          style={{
            position: 'absolute',
            top: 86,
            left: 0,
            right: 0,
            zIndex: 9,
            padding: '8px 32px',
            fontSize: 11,
            color: T.ivoryMuted,
            background: 'rgba(168, 132, 44, 0.08)',
            borderBottom: `1px solid ${T.hairline}`,
            fontFamily: T.fontBody,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          Operator debug enabled — client view unchanged.
        </div>
      ) : null}

      <main>
        {/* ─── 1. Hero — cinematic, monogram-centred ─────────────────── */}
        <section
          style={{
            position: 'relative',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '120px 24px 80px',
            background: T.charcoal,
            color: T.ivory,
            overflow: 'hidden',
            textAlign: 'center',
          }}
        >
          {/* Subtle cinematic vignette — kept inside the four-colour system */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(circle at 50% 30%, ${T.charcoalSoft} 0%, ${T.charcoal} 60%, ${T.charcoalDeep} 100%)`,
              pointerEvents: 'none',
            }}
          />
          {/* Hairline frame — sits inside the viewport like an editorial plate */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 40,
              left: 40,
              right: 40,
              bottom: 40,
              border: `1px solid ${T.hairlineSoft}`,
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'relative',
              maxWidth: 760,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 40,
            }}
          >
            <LuxeMauriceMonogram size={84} color={T.gold} />
            <div style={{ width: 60 }}>
              <LuxHairline tone="gold" />
            </div>
            <h1
              style={{
                margin: 0,
                fontFamily: T.fontDisplay,
                fontWeight: 400,
                fontSize: 'clamp(2.6rem, 7vw, 5.2rem)',
                letterSpacing: '0.32em',
                lineHeight: 1,
                color: T.ivory,
                textTransform: 'uppercase',
                paddingLeft: '0.32em',
              }}
            >
              LuxeMaurice
            </h1>
            <p
              style={{
                margin: 0,
                fontFamily: T.fontBody,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.42em',
                textTransform: 'uppercase',
                color: T.gold,
                paddingLeft: '0.42em',
              }}
            >
              {LUXE_MAURICE_BRAND_SIGNATURE}
            </p>
            <p
              style={{
                margin: '8px 0 0',
                fontFamily: T.fontDisplay,
                fontSize: 'clamp(1.15rem, 2vw, 1.4rem)',
                fontWeight: 400,
                fontStyle: 'italic',
                color: T.ivoryMuted,
                lineHeight: 1.5,
                maxWidth: 540,
              }}
            >
              {tagline}
            </p>
            <div
              style={{
                marginTop: 16,
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 14,
              }}
            >
              {ctaPrimary(
                safeStr(hero.cta_label) || 'Request a Private Consultation',
                safeStr(hero.cta_href) || '/concierge',
              )}
              {ctaQuiet('Private Opportunities', '/properties', 'ivory')}
            </div>
          </div>
          {headline && headline !== LUXE_MAURICE_BRAND_SIGNATURE ? (
            <span style={{ position: 'absolute', left: -9999, top: -9999 }}>{headline}</span>
          ) : null}
        </section>

        {/* ─── 2. Reframe — "This is not a property website." ─────────── */}
        <section
          style={{
            padding: 'clamp(96px, 14vw, 180px) 32px',
            background: T.charcoal,
            color: T.ivory,
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: 780, margin: '0 auto' }}>
            <LuxEyebrow center>A note from LuxeMaurice</LuxEyebrow>
            <div style={{ margin: '36px auto', width: 40 }}>
              <LuxHairline tone="gold" />
            </div>
            <p
              style={{
                margin: 0,
                fontFamily: T.fontDisplay,
                fontWeight: 400,
                fontSize: 'clamp(2rem, 4.4vw, 3.4rem)',
                lineHeight: 1.25,
                color: T.ivory,
                letterSpacing: -0.4,
              }}
            >
              This is not a property website.
            </p>
            <p
              style={{
                margin: '36px auto 0',
                maxWidth: 620,
                fontFamily: T.fontBody,
                fontSize: 16,
                lineHeight: 1.85,
                color: T.ivoryMuted,
                fontWeight: 400,
              }}
            >
              It is the private platform through which LuxeMaurice attracts, advises,
              and serves exceptional clients considering Mauritius as a place to invest,
              live, and build.
            </p>
          </div>
        </section>

        {/* ─── 3. Mauritius Strategic Base ─────────────────────────────── */}
        <section
          style={{
            padding: 'clamp(96px, 12vw, 160px) 32px',
            background: T.ivory,
            color: T.charcoal,
          }}
        >
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <LuxEyebrow tone="charcoal">Mauritius as a strategic base</LuxEyebrow>
            <h2
              style={{
                margin: '28px 0 24px',
                fontFamily: T.fontDisplay,
                fontWeight: 400,
                fontSize: 'clamp(2rem, 4.2vw, 3.2rem)',
                lineHeight: 1.15,
                color: T.charcoal,
                letterSpacing: -0.3,
                maxWidth: 760,
              }}
            >
              {aboutTitle}
            </h2>
            {aboutBody ? (
              <p
                style={{
                  margin: 0,
                  maxWidth: 640,
                  fontFamily: T.fontBody,
                  fontSize: 16.5,
                  lineHeight: 1.8,
                  color: T.stone,
                }}
              >
                {aboutBody}
              </p>
            ) : null}

            <div style={{ margin: '72px 0 0' }}>
              <LuxHairline tone="stone" />
              <ul
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                }}
              >
                {STRATEGIC_BASE.map((row, i) => (
                  <li
                    key={row.label}
                    style={{
                      padding: '36px 24px 40px',
                      borderRight:
                        i < STRATEGIC_BASE.length - 1
                          ? `1px solid ${T.hairlineStone}`
                          : 'none',
                    }}
                  >
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
                      0{i + 1}
                    </div>
                    <h3
                      style={{
                        margin: '14px 0 14px',
                        fontFamily: T.fontDisplay,
                        fontWeight: 500,
                        fontSize: 22,
                        color: T.charcoal,
                        letterSpacing: 0.4,
                      }}
                    >
                      {row.label}
                    </h3>
                    <p
                      style={{
                        margin: 0,
                        fontFamily: T.fontBody,
                        fontSize: 14,
                        lineHeight: 1.7,
                        color: T.stone,
                      }}
                    >
                      {row.detail}
                    </p>
                  </li>
                ))}
              </ul>
              <LuxHairline tone="stone" />
            </div>

            <p
              style={{
                marginTop: 56,
                maxWidth: 720,
                fontFamily: T.fontBody,
                fontSize: 12,
                lineHeight: 1.7,
                color: T.stoneSoft,
              }}
            >
              Contextual references to Mauritius — including any residency, tax, or
              lifestyle topics — are descriptive only and are not legal, tax, or
              immigration advice. Qualified specialists are introduced where appropriate.
            </p>
          </div>
        </section>

        {/* ─── 4. Two Journeys — editorial diptych ────────────────────── */}
        <section
          style={{
            padding: 'clamp(96px, 12vw, 160px) 32px',
            background: T.charcoal,
            color: T.ivory,
          }}
        >
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto' }}>
              <LuxEyebrow center>Two private client journeys</LuxEyebrow>
              <h2
                style={{
                  margin: '28px 0 22px',
                  fontFamily: T.fontDisplay,
                  fontWeight: 400,
                  fontSize: 'clamp(2rem, 4.2vw, 3.2rem)',
                  lineHeight: 1.2,
                  color: T.ivory,
                  letterSpacing: -0.3,
                }}
              >
                Two buyers. One standard of care.
              </h2>
              <p
                style={{
                  margin: '0 auto',
                  maxWidth: 600,
                  fontFamily: T.fontBody,
                  fontSize: 15.5,
                  lineHeight: 1.8,
                  color: T.ivoryMuted,
                }}
              >
                LuxeMaurice serves the completed-residence buyer and the development
                partner with equal elegance — different speeds, the same trusted access,
                the same private advisor.
              </p>
            </div>

            <div
              style={{
                marginTop: 80,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              }}
            >
              {TWO_JOURNEYS.map((j, i) => (
                <article
                  key={j.title}
                  style={{
                    padding: '0 clamp(20px, 4vw, 48px)',
                    borderRight:
                      i < TWO_JOURNEYS.length - 1
                        ? `1px solid ${T.hairlineSoft}`
                        : 'none',
                  }}
                >
                  <div
                    style={{
                      fontFamily: T.fontBody,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.36em',
                      textTransform: 'uppercase',
                      color: T.gold,
                    }}
                  >
                    Journey 0{i + 1}
                  </div>
                  <h3
                    style={{
                      margin: '20px 0 22px',
                      fontFamily: T.fontDisplay,
                      fontWeight: 400,
                      fontSize: 28,
                      lineHeight: 1.2,
                      color: T.ivory,
                      letterSpacing: 0.2,
                    }}
                  >
                    {j.title}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: T.fontBody,
                      fontSize: 15.5,
                      lineHeight: 1.85,
                      color: T.ivoryMuted,
                      maxWidth: 440,
                    }}
                  >
                    {j.body}
                  </p>
                  <ul
                    style={{
                      listStyle: 'none',
                      margin: '32px 0 0',
                      padding: 0,
                    }}
                  >
                    {j.tags.map((tag) => (
                      <li
                        key={tag}
                        style={{
                          padding: '10px 0',
                          borderTop: `1px solid ${T.hairlineSoft}`,
                          fontFamily: T.fontBody,
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: '0.24em',
                          textTransform: 'uppercase',
                          color: T.ivoryMuted,
                        }}
                      >
                        {tag}
                      </li>
                    ))}
                    <li
                      style={{
                        borderTop: `1px solid ${T.hairlineSoft}`,
                        marginTop: 0,
                      }}
                    />
                  </ul>
                  <a
                    href="/concierge"
                    style={{
                      display: 'inline-block',
                      marginTop: 36,
                      fontFamily: T.fontBody,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.32em',
                      textTransform: 'uppercase',
                      color: T.gold,
                      textDecoration: 'none',
                    }}
                  >
                    Begin a private conversation →
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 5. Private Opportunities — Invited. Not advertised. ─────── */}
        <section
          id="upcoming"
          style={{
            padding: 'clamp(96px, 12vw, 160px) 32px',
            background: T.ivory,
            color: T.charcoal,
          }}
        >
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ maxWidth: 720 }}>
              <LuxEyebrow tone="charcoal">Private Opportunities</LuxEyebrow>
              <h2
                style={{
                  margin: '28px 0 22px',
                  fontFamily: T.fontDisplay,
                  fontWeight: 400,
                  fontSize: 'clamp(2rem, 4.2vw, 3.2rem)',
                  lineHeight: 1.2,
                  color: T.charcoal,
                  letterSpacing: -0.3,
                }}
              >
                Invited. Not advertised.
              </h2>
              <p
                style={{
                  margin: 0,
                  maxWidth: 600,
                  fontFamily: T.fontBody,
                  fontSize: 15.5,
                  lineHeight: 1.85,
                  color: T.stone,
                }}
              >
                {servicesIntro ||
                  'Each opportunity is prepared for review before it appears publicly. Speak with a private advisor for availability, terms, and next steps.'}
              </p>
            </div>

            {staged.length ? (
              <div
                role="tablist"
                aria-label="Filter private opportunities"
                style={{
                  marginTop: 56,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 0,
                  borderTop: `1px solid ${T.hairlineStone}`,
                  borderBottom: `1px solid ${T.hairlineStone}`,
                }}
              >
                {[
                  { id: 'all', label: 'All' },
                  { id: 'north', label: 'North & plateau' },
                  { id: 'villa', label: 'Villas' },
                  { id: 'pipeline', label: 'In preparation' },
                ].map((chip, ci, arr) => {
                  const active = listFilter === chip.id;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setListFilter(chip.id)}
                      style={{
                        flex: '1 1 0',
                        padding: '18px 22px',
                        borderRight:
                          ci < arr.length - 1
                            ? `1px solid ${T.hairlineStone}`
                            : 'none',
                        border: 'none',
                        borderLeft: 'none',
                        background: active ? T.charcoal : 'transparent',
                        color: active ? T.ivory : T.stone,
                        fontFamily: T.fontBody,
                        fontWeight: 700,
                        fontSize: 11,
                        letterSpacing: '0.24em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                      }}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div
              style={{
                marginTop: 56,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 48,
              }}
            >
              {staged.length ? (
                visibleStaged.length ? (
                  visibleStaged.map((p) => {
                    const detailHref = `/property/${encodeURIComponent(p.slug)}`;
                    const refKey = safeStr(p.slug).toLowerCase();
                    const pubCard = cardMediaObj[refKey];
                    const cardSrc =
                      pubCard && typeof pubCard.src === 'string'
                        ? pubCard.src.trim()
                        : '';
                    const cardSrcSet =
                      pubCard &&
                      typeof pubCard.src_set === 'string' &&
                      String(pubCard.src_set).trim()
                        ? String(pubCard.src_set).trim()
                        : '';
                    const staticHero = safeLuxSameOriginPublicImagePath(
                      p?.images?.hero,
                    );
                    const heroPath = cardSrc || staticHero;
                    const cardAlt =
                      pubCard && typeof pubCard.alt === 'string'
                        ? pubCard.alt.trim()
                        : '';
                    const imgAlt =
                      cardAlt ||
                      safeStr(p.title) ||
                      'Private opportunity';
                    return (
                      <article
                        key={p.slug}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 18,
                        }}
                      >
                        <div
                          style={{
                            aspectRatio: '4 / 3',
                            background: T.stoneSoft,
                            overflow: 'hidden',
                          }}
                        >
                          {heroPath ? (
                            <img
                              src={heroPath}
                              srcSet={
                                cardSrc && cardSrcSet ? cardSrcSet : undefined
                              }
                              sizes={
                                cardSrc && cardSrcSet
                                  ? '(max-width: 640px) 100vw, 360px'
                                  : undefined
                              }
                              alt={imgAlt}
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
                        <div style={{ paddingTop: 4 }}>
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
                            {safeStr(p.region)} · {safeStr(p.property_type)}
                          </div>
                          <h3
                            style={{
                              margin: '14px 0 12px',
                              fontFamily: T.fontDisplay,
                              fontWeight: 500,
                              fontSize: 22,
                              lineHeight: 1.3,
                              color: T.charcoal,
                              letterSpacing: 0.1,
                            }}
                          >
                            {safeStr(p.title)}
                          </h3>
                          {p.price_range != null &&
                          String(p.price_range).trim() ? (
                            <div
                              style={{
                                fontFamily: T.fontBody,
                                fontSize: 14,
                                fontWeight: 600,
                                color: T.charcoal,
                                marginBottom: 12,
                              }}
                            >
                              {safeStr(p.price_range)}
                            </div>
                          ) : null}
                          {p.teaser ? (
                            <p
                              style={{
                                margin: '0 0 18px',
                                fontFamily: T.fontBody,
                                fontSize: 14,
                                lineHeight: 1.75,
                                color: T.stone,
                              }}
                            >
                              {safeStr(p.teaser)}
                            </p>
                          ) : null}
                          <a
                            href={detailHref}
                            style={{
                              display: 'inline-block',
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
                            Opportunity Memorandum →
                          </a>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <p
                    style={{
                      fontFamily: T.fontBody,
                      color: T.stone,
                      fontSize: 15,
                    }}
                  >
                    No private opportunities currently match this filter. Try another,
                    or request a private consultation.
                  </p>
                )
              ) : items.length ? (
                items.map((it, idx) => (
                  <article
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 18,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: T.fontDisplay,
                        fontWeight: 500,
                        fontSize: 24,
                        color: T.charcoal,
                        letterSpacing: 0.1,
                      }}
                    >
                      {safeStr(it?.name) || `Opportunity ${idx + 1}`}
                    </div>
                    {it?.detail ? (
                      <p
                        style={{
                          margin: 0,
                          fontFamily: T.fontBody,
                          fontSize: 14,
                          lineHeight: 1.75,
                          color: T.stone,
                        }}
                      >
                        {safeStr(it.detail)}
                      </p>
                    ) : null}
                    <a
                      href="/concierge"
                      style={{
                        fontFamily: T.fontBody,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.28em',
                        textTransform: 'uppercase',
                        color: T.gold,
                        textDecoration: 'none',
                      }}
                    >
                      Request a Private Consultation →
                    </a>
                  </article>
                ))
              ) : (
                <article
                  style={{
                    gridColumn: '1 / -1',
                    padding: '96px 32px',
                    textAlign: 'center',
                    border: `1px solid ${T.hairlineStone}`,
                    background: 'transparent',
                  }}
                >
                  <LuxEyebrow tone="charcoal" center>
                    A quiet moment before the next reveal
                  </LuxEyebrow>
                  <p
                    style={{
                      margin: '32px auto 0',
                      maxWidth: 520,
                      fontFamily: T.fontDisplay,
                      fontWeight: 400,
                      fontSize: 26,
                      lineHeight: 1.4,
                      color: T.charcoal,
                      letterSpacing: -0.1,
                    }}
                  >
                    Private opportunities are being prepared for client review.
                  </p>
                  <div style={{ marginTop: 36 }}>
                    {ctaPrimary(
                      'Request a Private Consultation',
                      '/concierge',
                    )}
                  </div>
                </article>
              )}
            </div>

            <div style={{ marginTop: 64, textAlign: 'right' }}>
              <a
                href="/properties"
                style={{
                  fontFamily: T.fontBody,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.32em',
                  textTransform: 'uppercase',
                  color: T.gold,
                  textDecoration: 'none',
                  borderBottom: `1px solid ${T.hairlineStone}`,
                  paddingBottom: 4,
                }}
              >
                View all Private Opportunities →
              </a>
            </div>
          </div>
        </section>

        {/* ─── 6. Owner Experience — Confidence at distance ────────────── */}
        <section
          id="owner-experience"
          style={{
            padding: 'clamp(96px, 12vw, 160px) 32px',
            background: T.charcoalSoft,
            color: T.ivory,
          }}
        >
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ maxWidth: 720 }}>
              <LuxEyebrow>Owner Experience · Invitation only</LuxEyebrow>
              <h2
                style={{
                  margin: '28px 0 22px',
                  fontFamily: T.fontDisplay,
                  fontWeight: 400,
                  fontSize: 'clamp(2rem, 4.6vw, 3.6rem)',
                  lineHeight: 1.15,
                  color: T.ivory,
                  letterSpacing: -0.3,
                }}
              >
                Confidence at distance.
              </h2>
              <p
                style={{
                  margin: 0,
                  maxWidth: 620,
                  fontFamily: T.fontBody,
                  fontSize: 16,
                  lineHeight: 1.85,
                  color: T.ivoryMuted,
                }}
              >
                For engaged clients and active development partners, LuxeMaurice opens
                an invitation-only owner environment. Design decisions, procurement,
                progress updates, and concierge support — held in a single calm thread,
                with a private advisor on the other side, wherever you are in the world.
              </p>
            </div>

            <div style={{ margin: '72px 0 0' }}>
              <LuxHairline tone="ivory" />
              {OWNER_EXPERIENCE.map(([title, body], i) => (
                <div
                  key={title}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(160px, 240px) 1fr',
                    gap: 'clamp(24px, 6vw, 80px)',
                    padding: '36px 0',
                    borderBottom: `1px solid ${T.hairlineSoft}`,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: T.fontBody,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.36em',
                        textTransform: 'uppercase',
                        color: T.gold,
                      }}
                    >
                      0{i + 1}
                    </div>
                    <h3
                      style={{
                        margin: '14px 0 0',
                        fontFamily: T.fontDisplay,
                        fontWeight: 400,
                        fontSize: 24,
                        color: T.ivory,
                        letterSpacing: 0.2,
                      }}
                    >
                      {title}
                    </h3>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      maxWidth: 620,
                      fontFamily: T.fontBody,
                      fontSize: 15,
                      lineHeight: 1.85,
                      color: T.ivoryMuted,
                    }}
                  >
                    {body}
                  </p>
                </div>
              ))}
            </div>

            <p
              style={{
                margin: '48px 0 0',
                maxWidth: 720,
                fontFamily: T.fontBody,
                fontSize: 12,
                lineHeight: 1.7,
                color: T.ivoryMuted,
                letterSpacing: 0.06,
              }}
            >
              The Owner Experience environment is invitation-only and introduced once a
              private advisory relationship is in place.
            </p>
          </div>
        </section>

        {/* ─── 7. Design language pillars ──────────────────────────────── */}
        <section
          style={{
            padding: 'clamp(72px, 9vw, 120px) 32px',
            background: T.charcoal,
            color: T.ivory,
            borderTop: `1px solid ${T.hairlineSoft}`,
          }}
        >
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto 56px' }}>
              <LuxEyebrow center>The LuxeMaurice approach</LuxEyebrow>
              <p
                style={{
                  margin: '24px 0 0',
                  fontFamily: T.fontDisplay,
                  fontWeight: 400,
                  fontStyle: 'italic',
                  fontSize: 'clamp(1.25rem, 2vw, 1.55rem)',
                  lineHeight: 1.55,
                  color: T.ivoryMuted,
                }}
              >
                Exclusive · Strategic · Private · Extraordinary
              </p>
            </div>
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                borderTop: `1px solid ${T.hairlineSoft}`,
                borderBottom: `1px solid ${T.hairlineSoft}`,
              }}
            >
              {LUXE_MAURICE_DESIGN_PILLARS.map((pillar, i, arr) => (
                <li
                  key={pillar.key}
                  style={{
                    padding: '36px 24px',
                    textAlign: 'center',
                    borderRight:
                      i < arr.length - 1
                        ? `1px solid ${T.hairlineSoft}`
                        : 'none',
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: T.fontDisplay,
                      fontWeight: 500,
                      fontSize: 24,
                      color: T.ivory,
                      letterSpacing: 0.4,
                    }}
                  >
                    {pillar.label}
                  </h3>
                  <p
                    style={{
                      margin: '12px 0 0',
                      fontFamily: T.fontBody,
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.24em',
                      textTransform: 'uppercase',
                      color: T.gold,
                    }}
                  >
                    {pillar.sub}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ─── 8. Private Advisory CTA — single, generous ──────────────── */}
        <section
          style={{
            padding: 'clamp(120px, 16vw, 200px) 32px',
            background: T.charcoal,
            color: T.ivory,
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <LuxEyebrow center>Private Advisory</LuxEyebrow>
            <div style={{ margin: '36px auto', width: 40 }}>
              <LuxHairline tone="gold" />
            </div>
            <h2
              style={{
                margin: '0 auto 28px',
                fontFamily: T.fontDisplay,
                fontWeight: 400,
                fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
                lineHeight: 1.15,
                color: T.ivory,
                letterSpacing: -0.3,
                maxWidth: 620,
              }}
            >
              Request a private consultation.
            </h2>
            <p
              style={{
                margin: '0 auto 48px',
                maxWidth: 560,
                fontFamily: T.fontBody,
                fontSize: 16,
                lineHeight: 1.85,
                color: T.ivoryMuted,
              }}
            >
              Tell us briefly what you are seeking in Mauritius — completed residence,
              development partnership, relocation, investment, or ongoing ownership
              support. A private advisor responds within one business day.
            </p>
            {ctaPrimary('Request a Private Consultation', '/concierge')}
          </div>
        </section>

        {/* ─── Quiet contact strip — only if data exists ───────────────── */}
        {contact.email || contact.phone || contact.website ? (
          <section
            style={{
              padding: '56px 32px',
              background: T.charcoalDeep,
              color: T.ivoryMuted,
              borderTop: `1px solid ${T.hairlineSoft}`,
            }}
          >
            <div
              style={{
                maxWidth: 1100,
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 32,
                fontFamily: T.fontBody,
                fontSize: 13,
              }}
            >
              {contact.email ? (
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.32em',
                      textTransform: 'uppercase',
                      color: T.gold,
                      fontWeight: 700,
                    }}
                  >
                    Email
                  </div>
                  <a
                    href={`mailto:${contact.email}`}
                    style={{
                      display: 'inline-block',
                      marginTop: 10,
                      color: T.ivory,
                      textDecoration: 'none',
                      fontFamily: T.fontDisplay,
                      fontSize: 18,
                      fontWeight: 500,
                    }}
                  >
                    {contact.email}
                  </a>
                </div>
              ) : null}
              {contact.phone ? (
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.32em',
                      textTransform: 'uppercase',
                      color: T.gold,
                      fontWeight: 700,
                    }}
                  >
                    By appointment
                  </div>
                  <a
                    href={`tel:${contact.phone}`}
                    style={{
                      display: 'inline-block',
                      marginTop: 10,
                      color: T.ivory,
                      textDecoration: 'none',
                      fontFamily: T.fontDisplay,
                      fontSize: 18,
                      fontWeight: 500,
                    }}
                  >
                    {contact.phone}
                  </a>
                </div>
              ) : null}
              {contact.website ? (
                <div>
                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.32em',
                      textTransform: 'uppercase',
                      color: T.gold,
                      fontWeight: 700,
                    }}
                  >
                    Web
                  </div>
                  <a
                    href={contact.website}
                    style={{
                      display: 'inline-block',
                      marginTop: 10,
                      color: T.ivory,
                      textDecoration: 'none',
                      fontFamily: T.fontDisplay,
                      fontSize: 18,
                      fontWeight: 500,
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

      {/* ─── Footer — minimal monogram plate ──────────────────────────── */}
      <footer
        style={{
          padding: '64px 32px 56px',
          background: T.charcoalDeep,
          color: T.ivoryMuted,
          borderTop: `1px solid ${T.hairlineSoft}`,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <LuxeMauriceWordmark
            variant="stacked"
            tone="ivory"
            showSignature
          />
        </div>
        <p
          style={{
            margin: '36px auto 0',
            maxWidth: 640,
            fontFamily: T.fontBody,
            fontSize: 11.5,
            lineHeight: 1.8,
            color: T.ivoryMuted,
          }}
        >
          {operatorDebug
            ? 'Operator debug: internal platform references may appear when ?debug=1 is set.'
            : 'Information on this site is indicative and not legal, tax, or immigration advice. Nothing here is an offer or solicitation; terms are agreed in writing through a private advisor.'}
        </p>
      </footer>
    </div>
  );
}
