import Link from 'next/link';

import LuxeMauriceAiPreviewShell, { LUXE_MAURICE_AI_BASE } from '../../../../components/LuxeMauriceAiPreviewShell.js';
import { LUXE_MAURICE_BRAND_TOKENS as T } from '../../../../lib/client/luxe-maurice-brand-theme.js';
import { LuxEyebrow, LuxHairline } from '../../../../components/LuxeMauriceBrandPrimitives.js';
import { listProperties } from '../../../../lib/client/luxe-maurice-ai-data.js';

function heroGradient(slug) {
  const palettes = {
    'sample-coastal-residence': 'linear-gradient(145deg, #2a2520 0%, #4a4034 45%, #1a1817 100%)',
    'lagoon-villa-estate': 'linear-gradient(145deg, #1e2a2e 0%, #3d5248 50%, #111111 100%)',
    'golf-residence-anahita': 'linear-gradient(145deg, #252820 0%, #4a5238 50%, #0f0f0f 100%)',
  };
  return palettes[slug] || T.placeholder;
}

function factLine(bedrooms, bathrooms) {
  const parts = [];
  if (bedrooms != null) parts.push(`${bedrooms} bed`);
  if (bathrooms != null) parts.push(`${bathrooms} bath`);
  return parts.join(' · ');
}

export default function LuxeMauriceAiPropertiesPage({ properties }) {
  const list = Array.isArray(properties) ? properties : [];

  return (
    <LuxeMauriceAiPreviewShell
      active="properties"
      title="Private opportunities"
      description="LuxeMaurice AI property catalogue — published private opportunities in Mauritius."
    >
      <section style={{ padding: '48px clamp(20px, 4vw, 56px)' }}>
        <LuxEyebrow>Property catalogue</LuxEyebrow>
        <h1
          style={{
            marginTop: 16,
            fontFamily: T.fontDisplay,
            fontSize: 'clamp(32px, 5vw, 44px)',
            fontWeight: 500,
          }}
        >
          Private opportunities
        </h1>
        <p style={{ marginTop: 12, color: T.ivoryMuted, maxWidth: 560, lineHeight: 1.6 }}>
          Published opportunities across Mauritius. Each profile opens a private memorandum view with
          enquiry path to your advisory team.
        </p>
        <LuxHairline />

        {list.length === 0 ? (
          <p style={{ marginTop: 32, color: T.ivoryMuted }}>No published opportunities in preview.</p>
        ) : (
          <div
            style={{
              marginTop: 36,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))',
              gap: 32,
            }}
          >
            {list.map((p) => (
              <article key={p.id}>
                <div
                  style={{
                    aspectRatio: '16 / 10',
                    background: heroGradient(p.slug),
                    marginBottom: 18,
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
                  {p.location_label}
                </p>
                <h2
                  style={{
                    marginTop: 8,
                    fontFamily: T.fontDisplay,
                    fontSize: 26,
                    fontWeight: 500,
                    lineHeight: 1.25,
                  }}
                >
                  {p.title}
                </h2>
                <p style={{ marginTop: 10, fontSize: 14, color: T.ivoryMuted }}>
                  {p.price_label}
                  {factLine(p.bedrooms, p.bathrooms) ? ` · ${factLine(p.bedrooms, p.bathrooms)}` : ''}
                </p>
                <p
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: T.stoneSoft,
                  }}
                >
                  {p.status}
                </p>
                <Link
                  href={`${LUXE_MAURICE_AI_BASE}/properties/${p.slug}`}
                  style={{
                    display: 'inline-block',
                    marginTop: 16,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: T.gold,
                    textDecoration: 'none',
                  }}
                >
                  View memorandum →
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </LuxeMauriceAiPreviewShell>
  );
}

export async function getStaticProps() {
  return {
    props: {
      properties: listProperties(),
    },
  };
}
