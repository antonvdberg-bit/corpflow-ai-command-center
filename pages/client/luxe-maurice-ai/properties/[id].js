import Link from 'next/link';

import LuxeMauriceAiPreviewShell, { LUXE_MAURICE_AI_BASE } from '../../../../components/LuxeMauriceAiPreviewShell.js';
import { LUXE_MAURICE_BRAND_TOKENS as T } from '../../../../lib/client/luxe-maurice-brand-theme.js';
import { LuxEyebrow, LuxHairline } from '../../../../components/LuxeMauriceBrandPrimitives.js';
import { getPropertyById, listProperties } from '../../../../lib/client/luxe-maurice-ai-data.js';

function heroGradient(slug) {
  const palettes = {
    'sample-coastal-residence': 'linear-gradient(145deg, #2a2520 0%, #4a4034 45%, #1a1817 100%)',
    'lagoon-villa-estate': 'linear-gradient(145deg, #1e2a2e 0%, #3d5248 50%, #111111 100%)',
    'golf-residence-anahita': 'linear-gradient(145deg, #252820 0%, #4a5238 50%, #0f0f0f 100%)',
  };
  return palettes[slug] || T.placeholder;
}

export default function LuxeMauriceAiPropertyDetailPage({ detail, notFound }) {
  if (notFound || !detail) {
    return (
      <LuxeMauriceAiPreviewShell active="properties" title="Opportunity not found">
        <section style={{ padding: '48px clamp(20px, 4vw, 56px)' }}>
          <p style={{ color: T.ivoryMuted }}>This opportunity is not available in the v1 preview.</p>
          <Link href={`${LUXE_MAURICE_AI_BASE}/properties`} style={{ color: T.gold }}>
            ← Back to catalogue
          </Link>
        </section>
      </LuxeMauriceAiPreviewShell>
    );
  }

  const { property, gallery, detail: facts } = detail;
  const enquiryHref = `${LUXE_MAURICE_AI_BASE}/buyer?property=${encodeURIComponent(property.slug)}`;

  return (
    <LuxeMauriceAiPreviewShell
      active="properties"
      title={property.title}
      description={property.summary || property.title}
    >
      <section style={{ padding: '40px clamp(20px, 4vw, 56px) 0' }}>
        <LuxEyebrow>{property.region_label}</LuxEyebrow>
        <h1
          style={{
            marginTop: 14,
            fontFamily: T.fontDisplay,
            fontSize: 'clamp(34px, 5vw, 48px)',
            fontWeight: 500,
            lineHeight: 1.12,
            maxWidth: 800,
          }}
        >
          {property.title}
        </h1>
        <p
          style={{
            marginTop: 14,
            fontFamily: T.fontDisplay,
            fontStyle: 'italic',
            fontSize: 20,
            color: T.gold,
          }}
        >
          {property.price_label}
        </p>
      </section>

      <section style={{ padding: '32px clamp(20px, 4vw, 56px)' }}>
        <div
          style={{
            aspectRatio: '21 / 9',
            maxHeight: 480,
            background: heroGradient(property.slug),
            marginBottom: 24,
          }}
          role="img"
          aria-label={property.hero_image?.alt_text || property.title}
        />
        {Array.isArray(gallery) && gallery.length > 1 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 12,
              marginBottom: 32,
            }}
          >
            {gallery.slice(1).map((g) => (
              <div
                key={g.id}
                style={{
                  aspectRatio: '4 / 3',
                  background: heroGradient(property.slug),
                  opacity: 0.85,
                }}
                aria-hidden
              />
            ))}
          </div>
        ) : null}
      </section>

      <section
        style={{
          padding: '0 clamp(20px, 4vw, 56px) 48px',
          display: 'flex',
          flexDirection: 'column',
          gap: 40,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <LuxEyebrow>Overview</LuxEyebrow>
          <p style={{ marginTop: 16, lineHeight: 1.75, color: T.ivoryMuted, fontSize: 16 }}>
            {facts?.description || property.summary}
          </p>
          <LuxHairline />
          <h2
            style={{
              marginTop: 28,
              fontFamily: T.fontDisplay,
              fontSize: 28,
              fontWeight: 500,
            }}
          >
            At a glance
          </h2>
          <ul
            style={{
              marginTop: 16,
              padding: 0,
              listStyle: 'none',
              color: T.ivoryMuted,
              lineHeight: 2,
            }}
          >
            <li>Location: {property.location_label}</li>
            {facts?.property_type ? <li>Type: {facts.property_type.replace(/_/g, ' ')}</li> : null}
            {facts?.bedrooms != null ? <li>Bedrooms: {facts.bedrooms}</li> : null}
            {facts?.bathrooms != null ? <li>Bathrooms: {facts.bathrooms}</li> : null}
            {facts?.area_sqm != null ? <li>Area: {facts.area_sqm} m²</li> : null}
            <li>Status: {property.status}</li>
          </ul>
        </div>
        <aside
          style={{
            alignSelf: 'start',
            padding: 28,
            background: T.charcoalSoft,
            border: `1px solid ${T.hairlineSoft}`,
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: T.gold,
            }}
          >
            Private enquiry
          </p>
          <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6, color: T.ivoryMuted }}>
            Register your interest for a confidential consultation on this opportunity.
          </p>
          <Link
            href={enquiryHref}
            style={{
              display: 'block',
              marginTop: 20,
              padding: '14px 20px',
              textAlign: 'center',
              background: T.gold,
              color: T.charcoal,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            Request consultation
          </Link>
        </aside>
      </section>
    </LuxeMauriceAiPreviewShell>
  );
}

export async function getStaticPaths() {
  const props = listProperties();
  return {
    paths: props.map((p) => ({ params: { id: p.slug } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const id = params?.id ? String(params.id) : '';
  const detail = getPropertyById(id);
  if (!detail) {
    return { props: { notFound: true, detail: null } };
  }
  return { props: { detail, notFound: false } };
}
