import Link from 'next/link';

import LuxeMauriceAiPreviewShell, { LUXE_MAURICE_AI_BASE } from '../../../components/LuxeMauriceAiPreviewShell.js';
import { LUXE_MAURICE_BRAND_TOKENS as T } from '../../../lib/client/luxe-maurice-brand-theme.js';
import { LuxEyebrow, LuxHairline } from '../../../components/LuxeMauriceBrandPrimitives.js';
import {
  LUXE_MAURICE_AI_ACCESS_CATEGORIES,
  listProperties,
  previewHeroGradient,
} from '../../../lib/client/luxe-maurice-ai-data.js';

export default function LuxeMauriceAiLandingPage({ featured }) {
  const cards = Array.isArray(featured) ? featured : [];

  return (
    <LuxeMauriceAiPreviewShell
      active="home"
      title="LuxeMaurice AI v2 preview"
      description="Private luxury access to Mauritius — residences, yachts, aviation, collector assets, and curated island experiences."
    >
      <section
        style={{
          padding: '56px clamp(20px, 4vw, 56px) 48px',
          background: `linear-gradient(180deg, ${T.charcoalDeep} 0%, ${T.charcoal} 100%)`,
        }}
      >
        <LuxEyebrow>Mauritius · Private luxury access</LuxEyebrow>
        <h1
          style={{
            marginTop: 20,
            fontFamily: T.fontDisplay,
            fontSize: 'clamp(36px, 6vw, 56px)',
            fontWeight: 500,
            lineHeight: 1.1,
            maxWidth: 760,
            color: T.ivory,
          }}
        >
          Private access to curated luxury opportunities
        </h1>
        <p
          style={{
            marginTop: 20,
            fontSize: 17,
            lineHeight: 1.65,
            color: T.ivoryMuted,
            maxWidth: 600,
          }}
        >
          LuxeMaurice AI connects principals to discreet Mauritius access — private residences,
          yacht charters, VIP arrivals, collector assets, bespoke island experiences, and advisory
          introductions. Curated opportunities, not an open marketplace.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 32 }}>
          <Link
            href={`${LUXE_MAURICE_AI_BASE}/properties`}
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
            Browse access catalogue
          </Link>
          <Link
            href={`${LUXE_MAURICE_AI_BASE}/buyer`}
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
            Request private access
          </Link>
          <Link
            href={`${LUXE_MAURICE_AI_BASE}/crm`}
            style={{
              display: 'inline-block',
              padding: '14px 28px',
              color: T.gold,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            Advisor pipeline →
          </Link>
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
        <LuxEyebrow>Access categories</LuxEyebrow>
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
