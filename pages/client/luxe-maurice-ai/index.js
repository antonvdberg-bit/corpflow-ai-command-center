import Link from 'next/link';

import LuxeMauriceAiPreviewShell, { LUXE_MAURICE_AI_BASE } from '../../../components/LuxeMauriceAiPreviewShell.js';
import { LUXE_MAURICE_BRAND_TOKENS as T } from '../../../lib/client/luxe-maurice-brand-theme.js';
import { LuxEyebrow, LuxHairline } from '../../../components/LuxeMauriceBrandPrimitives.js';
import {
  LUXE_MAURICE_AI_ACCESS_CATEGORIES,
  listProperties,
  previewHeroGradient,
} from '../../../lib/client/luxe-maurice-ai-data.js';
import {
  LUXE_MAURICE_AI_HERO_HEADLINE,
  LUXE_MAURICE_AI_HERO_IMAGE,
  LUXE_MAURICE_AI_HERO_SUBHEADLINE,
} from '../../../lib/client/luxe-maurice-ai-landing.js';
import {
  LUXE_MAURICE_AI_CTA_ROW,
  LUXE_MAURICE_AI_SECTION_PAD,
  luxeMauriceAiBuyerCategoryHref,
  luxeMauriceAiCatalogueCategoryHref,
  luxeMauriceAiCtaPrimary,
  luxeMauriceAiCtaSecondary,
} from '../../../lib/client/luxe-maurice-ai-layout.js';

export default function LuxeMauriceAiLandingPage({ featured }) {
  const cards = Array.isArray(featured) ? featured : [];

  return (
    <LuxeMauriceAiPreviewShell
      active="home"
      title="LuxeMaurice AI"
      description="Multi-channel private luxury access to Mauritius — residences, yachts, aviation, island experiences, and advisory introductions."
    >
      <section
        aria-labelledby="lux-maurice-ai-hero-heading"
        style={{
          position: 'relative',
          minHeight: 'clamp(520px, 88svh, 920px)',
          display: 'flex',
          alignItems: 'flex-end',
          overflow: 'hidden',
        }}
      >
        <img
          src={LUXE_MAURICE_AI_HERO_IMAGE}
          alt=""
          aria-hidden="true"
          width={1920}
          height={1080}
          decoding="async"
          fetchPriority="high"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 40%',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(
              180deg,
              rgba(10, 10, 10, 0.35) 0%,
              rgba(10, 10, 10, 0.72) 45%,
              rgba(10, 10, 10, 0.94) 100%
            )`,
          }}
        />
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            padding: LUXE_MAURICE_AI_SECTION_PAD,
            paddingBottom: 'clamp(36px, 8vw, 72px)',
          }}
        >
          <div
            style={{
              maxWidth: 640,
              width: '100%',
              padding: 'clamp(22px, 4vw, 36px)',
              background: 'rgba(17, 17, 17, 0.62)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: `1px solid ${T.hairlineSoft}`,
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.35)',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width: 48,
                height: 1,
                background: T.gold,
                marginBottom: 16,
              }}
              aria-hidden="true"
            />
            <LuxEyebrow>Multi-channel private access · Mauritius</LuxEyebrow>
            <h1
              id="lux-maurice-ai-hero-heading"
              style={{
                marginTop: 14,
                fontFamily: T.fontDisplay,
                fontSize: 'clamp(30px, 7vw, 52px)',
                fontWeight: 500,
                lineHeight: 1.12,
                color: T.ivory,
              }}
            >
              {LUXE_MAURICE_AI_HERO_HEADLINE}
            </h1>
            <p
              style={{
                marginTop: 16,
                fontSize: 'clamp(15px, 2.5vw, 18px)',
                lineHeight: 1.65,
                color: T.ivoryMuted,
              }}
            >
              {LUXE_MAURICE_AI_HERO_SUBHEADLINE}
            </p>
            <div style={LUXE_MAURICE_AI_CTA_ROW}>
              <Link href={`${LUXE_MAURICE_AI_BASE}/buyer`} style={luxeMauriceAiCtaPrimary({ flex: '1 1 200px' })}>
                Request Private Access
              </Link>
              <Link
                href={`${LUXE_MAURICE_AI_BASE}/properties`}
                style={luxeMauriceAiCtaSecondary({ flex: '1 1 200px' })}
              >
                Explore Access Catalogue
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          padding: LUXE_MAURICE_AI_SECTION_PAD,
          background: T.charcoalSoft,
          borderTop: `1px solid ${T.hairlineSoft}`,
          borderBottom: `1px solid ${T.hairlineSoft}`,
        }}
      >
        <LuxEyebrow>Access channels — equal weight</LuxEyebrow>
        <p style={{ marginTop: 12, color: T.ivoryMuted, maxWidth: 640, lineHeight: 1.65, fontSize: 'clamp(14px, 2.5vw, 16px)' }}>
          Residences are one channel among many. Yacht & marine, private aviation, island experiences, collector
          assets, and advisory mandates share the same private-access path — a full multi-channel platform, not a
          residences-only catalogue.
        </p>
        <div
          style={{
            marginTop: 22,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))',
            gap: 12,
          }}
        >
          {LUXE_MAURICE_AI_ACCESS_CATEGORIES.map((cat) => (
            <Link
              key={cat.key}
              href={luxeMauriceAiCatalogueCategoryHref(cat.key)}
              style={{
                padding: '16px 18px',
                border: `1px solid ${T.hairlineSoft}`,
                textDecoration: 'none',
                color: 'inherit',
                minHeight: 72,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: T.gold,
                }}
              >
                {cat.short}
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: T.ivoryMuted, lineHeight: 1.45 }}>{cat.label}</p>
            </Link>
          ))}
        </div>
        <div style={{ marginTop: 20 }}>
          <Link href={luxeMauriceAiBuyerCategoryHref('')} style={luxeMauriceAiCtaSecondary({ minWidth: 0 })}>
            Start a private access request →
          </Link>
        </div>
      </section>

      <section style={{ padding: LUXE_MAURICE_AI_SECTION_PAD }}>
        <LuxEyebrow>Featured across channels</LuxEyebrow>
        <p style={{ marginTop: 10, color: T.ivoryMuted, maxWidth: 560, lineHeight: 1.6 }}>
          One opportunity per channel — residence, yacht, aviation, and island experience — so owners see multi-channel
          parity, not a property catalogue alone.
        </p>
        <LuxHairline />
        <div
          style={{
            marginTop: 28,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
            gap: 24,
          }}
        >
          {cards.map((p) => (
            <article key={p.id}>
              <Link
                href={`${LUXE_MAURICE_AI_BASE}/properties/${p.slug}`}
                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
              >
                <div
                  style={{
                    aspectRatio: '4 / 3',
                    background: previewHeroGradient(p.slug, T.placeholder),
                    marginBottom: 14,
                  }}
                  aria-hidden
                />
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: T.gold,
                  }}
                >
                  {p.category_label} · {p.region_label}
                </p>
                <h2
                  style={{
                    marginTop: 8,
                    fontFamily: T.fontDisplay,
                    fontSize: 'clamp(20px, 4vw, 24px)',
                    fontWeight: 500,
                    lineHeight: 1.25,
                  }}
                >
                  {p.title}
                </h2>
                <p style={{ marginTop: 8, fontSize: 14, color: T.ivoryMuted }}>{p.price_label}</p>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </LuxeMauriceAiPreviewShell>
  );
}

export async function getStaticProps() {
  const all = listProperties();
  const mixed = [
    all.find((o) => o.slug === 'sample-coastal-residence'),
    all.find((o) => o.slug === 'private-yacht-lagoon-charter'),
    all.find((o) => o.slug === 'vip-arrival-aviation-service'),
    all.find((o) => o.slug === 'bespoke-island-experience-collector'),
  ].filter(Boolean);
  return {
    props: {
      featured: mixed.length ? mixed : all.slice(0, 4),
    },
  };
}
