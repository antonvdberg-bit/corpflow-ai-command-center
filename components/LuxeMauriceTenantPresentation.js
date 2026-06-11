import React, { useMemo, useState } from 'react';
import Head from 'next/head';

import { LUXE_MAURICE_BRAND_TOKENS as T } from '../lib/client/luxe-maurice-brand-theme.js';
import { safeLuxSameOriginPublicImagePath } from '../lib/client/luxe-maurice-property-resolve.js';

function safeStr(v) {
  return v != null ? String(v).trim() : '';
}

/**
 * LuxeMaurice-only marketing shell for `lux.corpflowai.com` (and preview hosts with same tenant).
 * Gated by `site.client_ui.lux_acquisition` from SSR — other tenants keep using `TenantSite`.
 *
 * Repositioned 2026-06-11 to the LuxeMaurice Private Wealth & Lifestyle Platform direction.
 * See `docs/LUX/LUXEMAURICE_STRATEGIC_VISION_2030.md`.
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
  const langDefault = typeof s.lang_default === 'string' && s.lang_default ? s.lang_default : 'en';
  const lang =
    typeof s.lang_active === 'string' && s.lang_active ? s.lang_active : langDefault;

  const i18n = s.i18n && typeof s.i18n === 'object' ? s.i18n : {};
  const i18nBlock = i18n[lang] && typeof i18n[lang] === 'object' ? i18n[lang] : null;
  const tHero = i18nBlock?.hero && typeof i18nBlock.hero === 'object' ? i18nBlock.hero : null;
  const tAbout = i18nBlock?.about && typeof i18nBlock.about === 'object' ? i18nBlock.about : null;

  const meta = s.meta && typeof s.meta === 'object' ? s.meta : {};
  const pageTitle = safeStr(meta.page_title) || 'LuxeMaurice · Private Wealth & Lifestyle Platform for Mauritius';

  const headline =
    safeStr(tHero?.headline) || safeStr(tHero?.subtitle) || safeStr(hero.headline) || safeStr(hero.subtitle) || 'Private. Curated. Considered.';
  const tagline = safeStr(tHero?.tagline) || safeStr(hero.tagline) || 'Private Wealth & Lifestyle Platform for Mauritius';

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

  const aboutTitle = safeStr(tAbout?.title) || safeStr(about.title) || 'Mauritius as a strategic base';
  const aboutBody = safeStr(tAbout?.body) || safeStr(about.body) || '';
  const servicesTitle = safeStr(services.title) || 'Private opportunities';
  const servicesIntro = safeStr(services.intro) || '';

  const items = Array.isArray(services.items) ? services.items : [];
  const staged = Array.isArray(s.staged_properties) ? s.staged_properties : [];
  const cardMediaObj =
    s.lux_published_card_media && typeof s.lux_published_card_media === 'object' && !Array.isArray(s.lux_published_card_media)
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
      detail: 'Climate, security, schools, sport, nature, and a long-term family quality of life.',
    },
    {
      label: 'Security',
      detail: 'Political stability and a credible, well-governed environment to settle in.',
    },
    {
      label: 'Connectivity',
      detail: 'Indian Ocean positioning with reliable links to Africa, Asia, the Gulf, and Europe.',
    },
    {
      label: 'Legacy',
      detail: 'A serious place to build assets that pass calmly across generations.',
    },
    {
      label: 'Opportunity',
      detail: 'A mature private real-estate segment, with curated access available through advisory.',
    },
  ];

  const TWO_JOURNEYS = [
    {
      title: 'Completed Residence Buyer',
      body: 'For clients who want finished, furnished, exceptional residences — selected with privacy, architectural quality, and immediacy in mind.',
      tags: ['Private viewing', 'Immediate occupation', 'Discreet acquisition'],
    },
    {
      title: 'Development Partner',
      body: 'For clients who buy earlier in the curve and participate — finishes, materials, furnishings, procurement — with a single advisor coordinating the work and the decisions.',
      tags: ['Co-created residence', 'Finishes & furnishings', 'Development concierge'],
    },
  ];

  return (
    <div
      style={{
        fontFamily: T.fontUi,
        background: T.charcoalDeep,
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
          gap: 20,
          flexWrap: 'wrap',
          padding: '22px 32px',
          background: T.charcoalDeep,
          borderBottom: `1px solid ${T.dividerSoft}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {media.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.logo_url}
              alt=""
              style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                border: `1px solid ${T.goldEditorial}`,
                background: T.charcoal,
              }}
            />
          )}
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: T.goldEditorial,
                fontWeight: 700,
              }}
            >
              LuxeMaurice
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: T.ivory,
                letterSpacing: 0.02,
                fontFamily: T.fontDisplay,
              }}
            >
              Private Wealth &amp; Lifestyle Platform
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <a
            href="/properties"
            style={{
              fontSize: 12,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: T.ivoryMuted,
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            Private opportunities
          </a>
          <a
            href="#owner-experience"
            style={{
              fontSize: 12,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: T.ivoryMuted,
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            Owner experience
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: T.ivoryMuted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Language</span>
            <select
              defaultValue={lang}
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
                background: T.charcoal,
                border: `1px solid ${T.dividerSoft}`,
                borderRadius: 10,
                padding: '6px 10px',
                color: T.ivory,
                fontSize: 12,
              }}
            >
              {languages.map((l) => (
                <option key={l} value={l} style={{ background: T.charcoal, color: T.ivory }}>
                  {String(l).toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <a
            href={safeStr(hero.cta_href) || '/concierge'}
            style={{
              display: 'inline-block',
              padding: '12px 22px',
              borderRadius: 999,
              border: `1px solid ${T.goldEditorial}`,
              background: 'transparent',
              color: T.goldEditorial,
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            {safeStr(hero.cta_label) || 'Request a private consultation'}
          </a>
        </div>
      </header>

      {operatorDebug ? (
        <div
          style={{
            padding: '10px 32px',
            fontSize: 12,
            color: T.ivoryMuted,
            background: T.charcoalSoft,
            borderBottom: `1px solid ${T.dividerSoft}`,
          }}
        >
          Operator debug enabled — client view unchanged.
        </div>
      ) : null}

      <main>
        {/* 1. Hero — editorial dark, gold accent. */}
        <section
          style={{
            padding: 'clamp(72px, 12vw, 140px) 32px clamp(64px, 10vw, 120px)',
            background: `radial-gradient(120% 80% at 50% 0%, ${T.charcoalSoft} 0%, ${T.charcoalDeep} 70%)`,
            color: T.ivory,
            borderBottom: `1px solid ${T.dividerSoft}`,
          }}
        >
          <div style={{ maxWidth: 1080, margin: '0 auto' }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.34em',
                textTransform: 'uppercase',
                color: T.goldEditorial,
                fontWeight: 700,
              }}
            >
              LuxeMaurice · Private Wealth &amp; Lifestyle Platform
            </div>
            <h1
              style={{
                margin: '24px 0 0',
                fontSize: 'clamp(2.4rem, 6vw, 4.4rem)',
                lineHeight: 1.05,
                fontWeight: 500,
                letterSpacing: -0.5,
                fontFamily: T.fontDisplay,
                color: T.ivory,
                maxWidth: 880,
              }}
            >
              {headline}
            </h1>
            <p
              style={{
                marginTop: 26,
                fontSize: 'clamp(1.05rem, 1.6vw, 1.25rem)',
                lineHeight: 1.6,
                maxWidth: 640,
                color: T.ivoryMuted,
                fontWeight: 400,
              }}
            >
              {tagline}
            </p>
            <div style={{ marginTop: 40, display: 'flex', flexWrap: 'wrap', gap: 14 }}>
              <a
                href="/concierge"
                style={{
                  display: 'inline-block',
                  padding: '15px 26px',
                  borderRadius: 999,
                  background: T.goldEditorial,
                  color: T.charcoalDeep,
                  fontWeight: 700,
                  fontSize: 13,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                }}
              >
                Request a private consultation
              </a>
              <a
                href="/properties"
                style={{
                  display: 'inline-block',
                  padding: '15px 26px',
                  borderRadius: 999,
                  border: `1px solid ${T.divider}`,
                  color: T.ivory,
                  fontWeight: 600,
                  fontSize: 13,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                }}
              >
                Private opportunities
              </a>
            </div>
          </div>
        </section>

        {/* 2. Reframe band — "This is not a property website." */}
        <section
          style={{
            padding: 'clamp(64px, 9vw, 110px) 32px',
            background: T.charcoal,
            borderBottom: `1px solid ${T.dividerSoft}`,
          }}
        >
          <div style={{ maxWidth: 880, margin: '0 auto' }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: '0.36em',
                textTransform: 'uppercase',
                color: T.goldEditorial,
                fontWeight: 700,
              }}
            >
              A note from LuxeMaurice
            </div>
            <p
              style={{
                marginTop: 24,
                fontSize: 'clamp(1.45rem, 2.6vw, 2rem)',
                lineHeight: 1.45,
                fontFamily: T.fontDisplay,
                color: T.ivory,
                fontWeight: 400,
                letterSpacing: -0.2,
              }}
            >
              This is not a property website.
            </p>
            <p
              style={{
                marginTop: 18,
                fontSize: 'clamp(1.05rem, 1.5vw, 1.18rem)',
                lineHeight: 1.7,
                color: T.ivoryMuted,
                maxWidth: 760,
              }}
            >
              It is the private platform through which LuxeMaurice attracts, advises, and serves exceptional clients
              considering Mauritius as a place to invest, live, and build.
            </p>
          </div>
        </section>

        {/* 3. Mauritius Strategic Base — Lifestyle / Security / Connectivity / Legacy / Opportunity. */}
        <section
          style={{
            padding: 'clamp(64px, 9vw, 110px) 32px',
            background: T.ivory,
            color: T.ink,
          }}
        >
          <div style={{ maxWidth: 1080, margin: '0 auto' }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: T.goldEditorialDeep,
                fontWeight: 700,
              }}
            >
              Mauritius as a strategic base
            </div>
            <h2
              style={{
                margin: '20px 0 18px',
                fontSize: 'clamp(1.7rem, 3vw, 2.4rem)',
                lineHeight: 1.18,
                fontFamily: T.fontDisplay,
                color: T.ink,
                fontWeight: 500,
                maxWidth: 760,
              }}
            >
              {aboutTitle}
            </h2>
            {aboutBody ? (
              <p
                style={{
                  margin: 0,
                  fontSize: 17,
                  lineHeight: 1.75,
                  color: T.inkMuted,
                  maxWidth: 760,
                }}
              >
                {aboutBody}
              </p>
            ) : null}

            <ul
              style={{
                listStyle: 'none',
                margin: '44px 0 0',
                padding: 0,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 18,
              }}
            >
              {STRATEGIC_BASE.map((row) => (
                <li
                  key={row.label}
                  style={{
                    padding: '22px 20px',
                    background: T.white,
                    border: `1px solid ${T.border}`,
                    borderRadius: T.radiusMd,
                    boxShadow: '0 8px 28px rgba(28,25,23,0.04)',
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.26em',
                      textTransform: 'uppercase',
                      color: T.goldEditorialDeep,
                      fontWeight: 800,
                    }}
                  >
                    {row.label}
                  </div>
                  <div
                    style={{
                      marginTop: 14,
                      fontSize: 14.5,
                      lineHeight: 1.6,
                      color: T.inkMuted,
                    }}
                  >
                    {row.detail}
                  </div>
                </li>
              ))}
            </ul>

            <p style={{ marginTop: 26, fontSize: 12, color: T.inkMuted, lineHeight: 1.6, maxWidth: 760 }}>
              Contextual references to Mauritius — including any residency, tax, or lifestyle topics — are descriptive only and are
              not legal, tax, or immigration advice. Qualified specialists are introduced where appropriate.
            </p>
          </div>
        </section>

        {/* 4. Two Journeys — Completed Residence Buyer / Development Partner. */}
        <section
          style={{
            padding: 'clamp(64px, 9vw, 110px) 32px',
            background: T.charcoalDeep,
            color: T.ivory,
            borderTop: `1px solid ${T.dividerSoft}`,
            borderBottom: `1px solid ${T.dividerSoft}`,
          }}
        >
          <div style={{ maxWidth: 1080, margin: '0 auto' }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: T.goldEditorial,
                fontWeight: 700,
              }}
            >
              Two private client journeys
            </div>
            <h2
              style={{
                margin: '20px 0 14px',
                fontSize: 'clamp(1.7rem, 3vw, 2.4rem)',
                lineHeight: 1.18,
                fontFamily: T.fontDisplay,
                color: T.ivory,
                fontWeight: 500,
                maxWidth: 720,
              }}
            >
              Two buyers. One standard of care.
            </h2>
            <p style={{ marginTop: 0, fontSize: 16, lineHeight: 1.65, color: T.ivoryMuted, maxWidth: 720 }}>
              LuxeMaurice serves the completed-residence buyer and the development partner with equal elegance.
              Different speeds, different commitments — the same trusted access and the same private advisor on the other side.
            </p>

            <div
              style={{
                marginTop: 44,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 22,
              }}
            >
              {TWO_JOURNEYS.map((j) => (
                <article
                  key={j.title}
                  style={{
                    padding: '28px 26px 30px',
                    background: T.charcoal,
                    border: `1px solid ${T.dividerSoft}`,
                    borderRadius: T.radiusLg,
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: T.fontDisplay,
                      fontSize: 22,
                      color: T.ivory,
                      fontWeight: 500,
                      letterSpacing: 0.02,
                    }}
                  >
                    {j.title}
                  </h3>
                  <p style={{ marginTop: 14, fontSize: 15, lineHeight: 1.7, color: T.ivoryMuted }}>{j.body}</p>
                  <ul
                    style={{
                      listStyle: 'none',
                      margin: '20px 0 0',
                      padding: 0,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    {j.tags.map((tag) => (
                      <li
                        key={tag}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 999,
                          border: `1px solid ${T.divider}`,
                          color: T.goldEditorial,
                          fontSize: 11,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                        }}
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="/concierge"
                    style={{
                      display: 'inline-block',
                      marginTop: 26,
                      fontSize: 12,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      color: T.goldEditorial,
                      textDecoration: 'none',
                      fontWeight: 700,
                    }}
                  >
                    Begin a private conversation →
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Private Opportunities — "Invited. Not advertised." */}
        <section id="upcoming" style={{ padding: 'clamp(64px, 9vw, 110px) 32px', background: T.ivory, color: T.ink }}>
          <div style={{ maxWidth: 1080, margin: '0 auto' }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: T.goldEditorialDeep,
                fontWeight: 700,
              }}
            >
              {servicesTitle}
            </div>
            <h2
              style={{
                margin: '18px 0 14px',
                fontSize: 'clamp(1.7rem, 3vw, 2.4rem)',
                lineHeight: 1.18,
                fontFamily: T.fontDisplay,
                color: T.ink,
                fontWeight: 500,
                maxWidth: 760,
              }}
            >
              Invited. Not advertised.
            </h2>
            {servicesIntro ? (
              <p style={{ marginTop: 0, fontSize: 16, lineHeight: 1.7, color: T.inkMuted, maxWidth: 760 }}>{servicesIntro}</p>
            ) : null}

            {staged.length ? (
              <div
                role="tablist"
                aria-label="Filter private opportunities"
                style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}
              >
                {[
                  { id: 'all', label: 'All' },
                  { id: 'north', label: 'North & plateau' },
                  { id: 'villa', label: 'Villas' },
                  { id: 'pipeline', label: 'In preparation' },
                ].map((chip) => {
                  const active = listFilter === chip.id;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setListFilter(chip.id)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 999,
                        border: `1px solid ${active ? T.goldEditorialDeep : T.border}`,
                        background: active ? T.charcoalDeep : T.white,
                        color: active ? T.ivory : T.inkMuted,
                        fontWeight: 700,
                        fontSize: 11,
                        letterSpacing: '0.14em',
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
                marginTop: 40,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 24,
              }}
            >
              {staged.length ? (
                visibleStaged.length ? (
                  visibleStaged.map((p) => {
                    const detailHref = `/property/${encodeURIComponent(p.slug)}`;
                    const refKey = safeStr(p.slug).toLowerCase();
                    const pubCard = cardMediaObj[refKey];
                    const cardSrc = pubCard && typeof pubCard.src === 'string' ? pubCard.src.trim() : '';
                    const cardSrcSet =
                      pubCard && typeof pubCard.src_set === 'string' && String(pubCard.src_set).trim()
                        ? String(pubCard.src_set).trim()
                        : '';
                    const staticHero = safeLuxSameOriginPublicImagePath(p?.images?.hero);
                    const heroPath = cardSrc || staticHero;
                    const cardAlt = pubCard && typeof pubCard.alt === 'string' ? pubCard.alt.trim() : '';
                    const imgAlt = cardAlt || safeStr(p.title) || 'Private opportunity';
                    return (
                      <article
                        key={p.slug}
                        style={{
                          borderRadius: T.radiusLg,
                          overflow: 'hidden',
                          border: `1px solid ${T.border}`,
                          background: T.white,
                          boxShadow: '0 14px 44px rgba(28,25,23,0.07)',
                        }}
                      >
                        <div
                          style={{
                            height: 200,
                            background: heroPath ? T.white : T.placeholder,
                            borderBottom: `1px solid ${T.border}`,
                          }}
                        >
                          {heroPath ? (
                            <img
                              src={heroPath}
                              srcSet={cardSrc && cardSrcSet ? cardSrcSet : undefined}
                              sizes={cardSrc && cardSrcSet ? '(max-width: 640px) 100vw, 360px' : undefined}
                              alt={imgAlt}
                              decoding="async"
                              loading="lazy"
                              style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : null}
                        </div>
                        <div style={{ padding: '22px 22px 26px' }}>
                          <div
                            style={{
                              fontSize: 10,
                              letterSpacing: '0.22em',
                              textTransform: 'uppercase',
                              color: T.inkMuted,
                              fontWeight: 700,
                            }}
                          >
                            {safeStr(p.region)} · {safeStr(p.property_type)}
                          </div>
                          <div
                            style={{
                              marginTop: 10,
                              fontFamily: T.fontDisplay,
                              fontSize: 19,
                              fontWeight: 500,
                              color: T.ink,
                              lineHeight: 1.3,
                            }}
                          >
                            {safeStr(p.title)}
                          </div>
                          {p.status ? (
                            <div
                              style={{
                                marginTop: 12,
                                fontSize: 11,
                                letterSpacing: '0.18em',
                                textTransform: 'uppercase',
                                color: T.goldEditorialDeep,
                                fontWeight: 700,
                              }}
                            >
                              {safeStr(p.status)}
                            </div>
                          ) : null}
                          {p.price_range != null && String(p.price_range).trim() ? (
                            <div style={{ marginTop: 10, fontSize: 15, fontWeight: 600, color: T.ink }}>{safeStr(p.price_range)}</div>
                          ) : null}
                          {p.teaser ? (
                            <p style={{ marginTop: 14, fontSize: 14, lineHeight: 1.65, color: T.inkMuted }}>{safeStr(p.teaser)}</p>
                          ) : null}
                          <div style={{ marginTop: 22, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                            <a
                              href={detailHref}
                              style={{
                                display: 'inline-block',
                                padding: '11px 18px',
                                borderRadius: 999,
                                border: `1px solid ${T.border}`,
                                color: T.ink,
                                fontSize: 12,
                                fontWeight: 700,
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                textDecoration: 'none',
                              }}
                            >
                              Opportunity overview
                            </a>
                            <a
                              href="/concierge"
                              style={{
                                display: 'inline-block',
                                padding: '11px 18px',
                                borderRadius: 999,
                                background: T.charcoalDeep,
                                color: T.ivory,
                                fontSize: 12,
                                fontWeight: 700,
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                textDecoration: 'none',
                              }}
                            >
                              Request consultation
                            </a>
                          </div>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <p style={{ color: T.inkMuted, fontSize: 15 }}>
                    No private opportunities currently match this filter. Try another, or request a private consultation.
                  </p>
                )
              ) : items.length ? (
                items.map((it, idx) => (
                  <article
                    key={idx}
                    style={{
                      borderRadius: T.radiusLg,
                      overflow: 'hidden',
                      border: `1px solid ${T.border}`,
                      background: T.white,
                      boxShadow: '0 14px 44px rgba(28,25,23,0.07)',
                    }}
                  >
                    <div style={{ padding: '28px 26px 30px' }}>
                      <div
                        style={{
                          fontFamily: T.fontDisplay,
                          fontSize: 20,
                          fontWeight: 500,
                          color: T.ink,
                          letterSpacing: 0.02,
                        }}
                      >
                        {safeStr(it?.name) || `Opportunity ${idx + 1}`}
                      </div>
                      {it?.detail ? (
                        <p style={{ marginTop: 14, fontSize: 14.5, lineHeight: 1.7, color: T.inkMuted }}>{safeStr(it.detail)}</p>
                      ) : null}
                      <a
                        href="/concierge"
                        style={{
                          display: 'inline-block',
                          marginTop: 20,
                          fontSize: 12,
                          letterSpacing: '0.16em',
                          textTransform: 'uppercase',
                          color: T.goldEditorialDeep,
                          textDecoration: 'none',
                          fontWeight: 700,
                        }}
                      >
                        Request a private consultation →
                      </a>
                    </div>
                  </article>
                ))
              ) : (
                <article
                  style={{
                    gridColumn: '1 / -1',
                    padding: '48px 36px',
                    borderRadius: T.radiusLg,
                    border: `1px solid ${T.border}`,
                    background: `linear-gradient(165deg, ${T.white} 0%, ${T.sand} 100%)`,
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      letterSpacing: '0.28em',
                      textTransform: 'uppercase',
                      color: T.goldEditorialDeep,
                      fontWeight: 700,
                    }}
                  >
                    Private opportunities
                  </div>
                  <p
                    style={{
                      margin: '22px auto 0',
                      maxWidth: 520,
                      fontFamily: T.fontDisplay,
                      fontSize: 22,
                      lineHeight: 1.4,
                      color: T.ink,
                    }}
                  >
                    Private opportunities are being prepared for client review.
                  </p>
                  <a
                    href="/concierge"
                    style={{
                      display: 'inline-block',
                      marginTop: 26,
                      padding: '13px 22px',
                      borderRadius: 999,
                      background: T.charcoalDeep,
                      color: T.ivory,
                      fontWeight: 700,
                      fontSize: 12,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      textDecoration: 'none',
                    }}
                  >
                    Request a private consultation
                  </a>
                </article>
              )}
            </div>

            <div style={{ marginTop: 36, textAlign: 'right' }}>
              <a
                href="/properties"
                style={{
                  fontSize: 12,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: T.goldEditorialDeep,
                  textDecoration: 'none',
                  fontWeight: 700,
                }}
              >
                View all private opportunities →
              </a>
            </div>
          </div>
        </section>

        {/* 6. Owner Experience — "Confidence at distance." */}
        <section
          id="owner-experience"
          style={{
            padding: 'clamp(64px, 9vw, 110px) 32px',
            background: T.charcoal,
            color: T.ivory,
            borderTop: `1px solid ${T.dividerSoft}`,
          }}
        >
          <div style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gap: 36, gridTemplateColumns: 'minmax(0, 1fr)' }}>
            <div>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                  color: T.goldEditorial,
                  fontWeight: 700,
                }}
              >
                Owner experience
              </div>
              <h2
                style={{
                  margin: '20px 0 18px',
                  fontSize: 'clamp(1.7rem, 3vw, 2.4rem)',
                  lineHeight: 1.18,
                  fontFamily: T.fontDisplay,
                  color: T.ivory,
                  fontWeight: 500,
                  maxWidth: 760,
                }}
              >
                Confidence at distance.
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: 16,
                  lineHeight: 1.75,
                  color: T.ivoryMuted,
                  maxWidth: 760,
                }}
              >
                For engaged clients and active development partners, LuxeMaurice opens an invitation-only owner environment.
                Design decisions, procurement, progress updates, and concierge support — held in a single calm thread,
                with a private advisor on the other side, wherever you are in the world.
              </p>
            </div>

            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 18,
              }}
            >
              {[
                ['Design decisions', 'Approve finishes, materials, and furnishings from anywhere — with curated options and clear deadlines.'],
                ['Procurement', 'Review suppliers, lead times, and origin. Decide once. Watch it executed on the ground.'],
                ['Progress updates', 'Verified construction milestones, private media, and dated context — never noise.'],
                ['Concierge support', 'On-island errands, specialist introductions, and the human layer behind every decision.'],
              ].map(([title, body]) => (
                <li
                  key={title}
                  style={{
                    padding: '22px 22px 24px',
                    background: T.charcoalDeep,
                    border: `1px solid ${T.dividerSoft}`,
                    borderRadius: T.radiusMd,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.26em',
                      textTransform: 'uppercase',
                      color: T.goldEditorial,
                      fontWeight: 800,
                    }}
                  >
                    {title}
                  </div>
                  <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.65, color: T.ivoryMuted }}>{body}</p>
                </li>
              ))}
            </ul>

            <p style={{ margin: 0, fontSize: 12, color: T.ivoryMuted, lineHeight: 1.6, maxWidth: 720 }}>
              The Owner Experience environment is invitation-only and introduced once a private advisory relationship is in place.
            </p>
          </div>
        </section>

        {/* 7. Concierge CTA — Request a private consultation. */}
        <section
          style={{
            padding: 'clamp(72px, 10vw, 120px) 32px',
            background: T.charcoalDeep,
            color: T.ivory,
            borderTop: `1px solid ${T.dividerSoft}`,
          }}
        >
          <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: '0.36em',
                textTransform: 'uppercase',
                color: T.goldEditorial,
                fontWeight: 700,
              }}
            >
              Begin a private conversation
            </div>
            <h2
              style={{
                margin: '22px auto 18px',
                fontFamily: T.fontDisplay,
                fontSize: 'clamp(1.7rem, 3vw, 2.4rem)',
                lineHeight: 1.25,
                color: T.ivory,
                fontWeight: 500,
                maxWidth: 620,
              }}
            >
              Request a private consultation.
            </h2>
            <p
              style={{
                margin: '0 auto',
                fontSize: 16,
                lineHeight: 1.7,
                color: T.ivoryMuted,
                maxWidth: 560,
              }}
            >
              Tell us briefly what you are seeking in Mauritius — completed residence, development partnership,
              relocation, investment, or ongoing ownership support. A private advisor responds within one business day.
            </p>
            <div style={{ marginTop: 32, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14 }}>
              <a
                href="/concierge"
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
                Request a private consultation
              </a>
              <a
                href="/properties"
                style={{
                  display: 'inline-block',
                  padding: '15px 28px',
                  borderRadius: 999,
                  border: `1px solid ${T.divider}`,
                  color: T.ivory,
                  fontWeight: 600,
                  fontSize: 13,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                }}
              >
                Private opportunities
              </a>
            </div>
          </div>
        </section>

        {/* Quiet contact strip (kept for accessibility / SEO). */}
        {(contact.email || contact.phone || contact.website) ? (
          <section
            style={{
              padding: '40px 32px',
              background: T.charcoal,
              color: T.ivoryMuted,
              borderTop: `1px solid ${T.dividerSoft}`,
            }}
          >
            <div
              style={{
                maxWidth: 1080,
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 18,
                fontSize: 13,
              }}
            >
              {contact.email ? (
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: T.goldEditorial, fontWeight: 800 }}>Email</div>
                  <a href={`mailto:${contact.email}`} style={{ display: 'inline-block', marginTop: 8, color: T.ivory, fontWeight: 600 }}>
                    {contact.email}
                  </a>
                </div>
              ) : null}
              {contact.phone ? (
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: T.goldEditorial, fontWeight: 800 }}>By appointment</div>
                  <a href={`tel:${contact.phone}`} style={{ display: 'inline-block', marginTop: 8, color: T.ivory, fontWeight: 600 }}>
                    {contact.phone}
                  </a>
                </div>
              ) : null}
              {contact.website ? (
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: T.goldEditorial, fontWeight: 800 }}>Web</div>
                  <a href={contact.website} style={{ display: 'inline-block', marginTop: 8, color: T.ivory, fontWeight: 600 }}>
                    {contact.website}
                  </a>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
      </main>

      <footer
        style={{
          padding: '34px 32px 48px',
          textAlign: 'center',
          fontSize: 12,
          color: T.ivoryMuted,
          lineHeight: 1.7,
          background: T.charcoalDeep,
          borderTop: `1px solid ${T.dividerSoft}`,
        }}
      >
        <div style={{ marginBottom: 10, fontSize: 11, letterSpacing: '0.32em', textTransform: 'uppercase', color: T.goldEditorial, fontWeight: 700 }}>
          LuxeMaurice · Private. Curated. Considered.
        </div>
        {operatorDebug
          ? 'Operator debug: internal platform references may appear when ?debug=1 is set.'
          : 'Information on this site is indicative and not legal, tax, or immigration advice. Nothing here is an offer or solicitation; terms are agreed in writing through a private advisor.'}
      </footer>
    </div>
  );
}
