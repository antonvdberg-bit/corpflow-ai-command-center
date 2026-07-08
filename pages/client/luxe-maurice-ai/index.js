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

export default function LuxeMauriceAiLandingPage({ featured }) {
  const cards = Array.isArray(featured) ? featured : [];

  return (
    <LuxeMauriceAiPreviewShell
      active="home"
      title="LuxeMaurice AI"
      description="Private luxury access to Mauritius — residences, yachts, aviation, collector assets, and curated island experiences."
    >
      <section
        aria-labelledby="lux-maurice-ai-hero-heading"
        style={{
          position: 'relative',
          minHeight: 'clamp(640px, 92vh, 920px)',
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
            objectPosition: '68% center',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(
              105deg,
              rgba(10, 10, 10, 0.92) 0%,
              rgba(17, 17, 17, 0.78) 38%,
              rgba(17, 17, 17, 0.35) 62%,
              rgba(17, 17, 17, 0.12) 100%
            )`,
          }}
        />
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            padding: 'clamp(48px, 8vw, 88px) clamp(20px, 4vw, 56px)',
          }}
        >
          <div
            style={{
              maxWidth: 620,
              padding: 'clamp(28px, 4vw, 40px)',
              background: 'rgba(17, 17, 17, 0.55)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: `1px solid ${T.hairlineSoft}`,
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.35)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 1,
                background: T.gold,
                marginBottom: 20,
              }}
              aria-hidden="true"
            />
            <LuxEyebrow>Curated private access · Mauritius</LuxEyebrow>
            <h1
              id="lux-maurice-ai-hero-heading"
              style={{
                marginTop: 18,
                fontFamily: T.fontDisplay,
                fontSize: 'clamp(34px, 5.5vw, 52px)',
                fontWeight: 500,
                lineHeight: 1.12,
                color: T.ivory,
              }}
            >
              {LUXE_MAURICE_AI_HERO_HEADLINE}
            </h1>
            <p
              style={{
                marginTop: 18,
                fontSize: 'clamp(16px, 2vw, 18px)',
                lineHeight: 1.65,
                color: T.ivoryMuted,
              }}
            >
              {LUXE_MAURICE_AI_HERO_SUBHEADLINE}
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 14,
                marginTop: 32,
              }}
            >
              <Link
                href={`${LUXE_MAURICE_AI_BASE}/buyer`}
                style={{
                  display: 'inline-block',
                  padding: '14px 28px',
                  background: T.gold,
                  color: T.charcoal,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                }}
              >
                Request Private Access
              </Link>
              <Link
                href={`${LUXE_MAURICE_AI_BASE}/properties`}
                style={{
                  display: 'inline-block',
                  padding: '14px 28px',
                  border: `1px solid ${T.hairline}`,
                  color: T.ivory,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                }}
              >
                View Private Opportunities
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          padding: '40px clamp(20px, 4vw, 56px)',
          background: T.charcoalSoft,
          borderTop: `1px solid ${T.hairlineSoft}`,
          borderBottom: `1px solid ${T.hairlineSoft}`,
        }}
      >
        <LuxEyebrow>Curated access categories</LuxEyebrow>
        <p style={{ marginTop: 12, color: T.ivoryMuted, maxWidth: 640, lineHeight: 1.65 }}>
          Private residences remain at the core — alongside yacht and marine access, VIP aviation
          arrivals, collector assets, bespoke island experiences, and discreet advisory mandates.
        </p>
        <div
          style={{
            marginTop: 24,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))',
            gap: 16,
          }}
        >
          {LUXE_MAURICE_AI_ACCESS_CATEGORIES.map((cat) => (
            <div
              key={cat.key}
              style={{
                padding: '18px 20px',
                border: `1px solid ${T.hairlineSoft}`,
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: T.gold,
                }}
              >
                {cat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '48px clamp(20px, 4vw, 56px)' }}>
        <LuxEyebrow>Featured curated opportunities</LuxEyebrow>
        <p style={{ marginTop: 10, color: T.ivoryMuted, maxWidth: 560, lineHeight: 1.6 }}>
          A cross-section of private access — from island residences to yacht charter and VIP
          arrival coordination.
        </p>
        <LuxHairline />
        <div
          style={{
            marginTop: 32,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
            gap: 28,
          }}
        >
          {cards.map((p) => (
            <article key={p.id}>
              <Link
                href={`${LUXE_MAURICE_AI_BASE}/properties/${p.slug}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  style={{
                    aspectRatio: '4 / 3',
                    background: previewHeroGradient(p.slug, T.placeholder),
                    marginBottom: 16,
                  }}
                  aria-hidden
                />
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.24em',
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
                    fontSize: 24,
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
  ].filter(Boolean);
  return {
    props: {
      featured: mixed.length ? mixed : all.slice(0, 3),
    },
  };
}
