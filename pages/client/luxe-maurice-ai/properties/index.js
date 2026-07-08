import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

import LuxeMauriceAiPreviewShell, { LUXE_MAURICE_AI_BASE } from '../../../../components/LuxeMauriceAiPreviewShell.js';
import { LUXE_MAURICE_BRAND_TOKENS as T } from '../../../../lib/client/luxe-maurice-brand-theme.js';
import { LuxEyebrow, LuxHairline } from '../../../../components/LuxeMauriceBrandPrimitives.js';
import {
  LUXE_MAURICE_AI_ACCESS_CATEGORIES,
  getCategoryShortLabel,
  isResidenceCategory,
  listProperties,
  previewHeroGradient,
} from '../../../../lib/client/luxe-maurice-ai-data.js';
import {
  LUXE_MAURICE_AI_SECTION_PAD,
  luxeMauriceAiBuyerCategoryHref,
  luxeMauriceAiCatalogueCategoryHref,
  luxeMauriceAiCategoryChip,
  luxeMauriceAiCtaPrimary,
} from '../../../../lib/client/luxe-maurice-ai-layout.js';

function residenceFacts(bedrooms, bathrooms) {
  const parts = [];
  if (bedrooms != null) parts.push(`${bedrooms} bed`);
  if (bathrooms != null) parts.push(`${bathrooms} bath`);
  return parts.join(' · ');
}

export default function LuxeMauriceAiPropertiesPage({ properties }) {
  const router = useRouter();
  const all = Array.isArray(properties) ? properties : [];
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    const raw = router.query.category;
    const val = Array.isArray(raw) ? raw[0] : raw;
    setCategoryFilter(typeof val === 'string' ? val.trim() : '');
  }, [router.isReady, router.query.category]);

  const list = useMemo(() => {
    if (!categoryFilter) return all;
    return all.filter((p) => p.opportunity_category === categoryFilter);
  }, [all, categoryFilter]);

  return (
    <LuxeMauriceAiPreviewShell
      active="catalogue"
      title="Access catalogue"
      description="LuxeMaurice AI multi-channel access catalogue — residences, yachts, aviation, island experiences, and advisory introductions."
    >
      <section style={{ padding: LUXE_MAURICE_AI_SECTION_PAD }}>
        <LuxEyebrow>Multi-channel access catalogue</LuxEyebrow>
        <h1
          style={{
            marginTop: 14,
            fontFamily: T.fontDisplay,
            fontSize: 'clamp(28px, 6vw, 44px)',
            fontWeight: 500,
            lineHeight: 1.15,
          }}
        >
          Curated private access
        </h1>
        <p style={{ marginTop: 12, color: T.ivoryMuted, maxWidth: 620, lineHeight: 1.65 }}>
          Browse by channel — residences, yacht & marine, aviation, island experiences, collector assets, and advisory
          mandates. Each profile opens a private memorandum with an advisory introduction path.
        </p>

        <div
          style={{
            marginTop: 22,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <Link
            href={luxeMauriceAiCatalogueCategoryHref('')}
            style={luxeMauriceAiCategoryChip(!categoryFilter)}
          >
            All channels
          </Link>
          {LUXE_MAURICE_AI_ACCESS_CATEGORIES.map((cat) => (
            <Link
              key={cat.key}
              href={luxeMauriceAiCatalogueCategoryHref(cat.key)}
              style={luxeMauriceAiCategoryChip(categoryFilter === cat.key)}
            >
              {cat.short}
            </Link>
          ))}
        </div>

        {categoryFilter ? (
          <p style={{ marginTop: 14, fontSize: 13, color: T.gold }}>
            Showing: {getCategoryShortLabel(categoryFilter)}
          </p>
        ) : null}

        <LuxHairline />

        {list.length === 0 ? (
          <p style={{ marginTop: 28, color: T.ivoryMuted }}>No opportunities in this channel yet.</p>
        ) : (
          <div
            style={{
              marginTop: 28,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
              gap: 28,
            }}
          >
            {list.map((p) => (
              <article key={p.id}>
                <div
                  style={{
                    aspectRatio: '16 / 10',
                    background: previewHeroGradient(p.slug, T.placeholder),
                    marginBottom: 14,
                  }}
                  aria-hidden
                />
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: T.gold,
                  }}
                >
                  {p.category_label}
                </p>
                <p style={{ marginTop: 6, fontSize: 12, color: T.stoneSoft }}>{p.location_label}</p>
                <h2
                  style={{
                    marginTop: 8,
                    fontFamily: T.fontDisplay,
                    fontSize: 'clamp(22px, 4vw, 26px)',
                    fontWeight: 500,
                    lineHeight: 1.25,
                  }}
                >
                  {p.title}
                </h2>
                <p style={{ marginTop: 10, fontSize: 14, color: T.ivoryMuted }}>
                  {p.price_label}
                  {isResidenceCategory(p.opportunity_category) && residenceFacts(p.bedrooms, p.bathrooms)
                    ? ` · ${residenceFacts(p.bedrooms, p.bathrooms)}`
                    : p.access_model
                      ? ` · ${p.access_model}`
                      : ''}
                </p>
                <p
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: T.stoneSoft,
                  }}
                >
                  {p.availability || p.status}
                </p>
                <Link
                  href={`${LUXE_MAURICE_AI_BASE}/properties/${p.slug}`}
                  style={{
                    display: 'inline-block',
                    marginTop: 14,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.18em',
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

        <div style={{ marginTop: 36 }}>
          <Link href={luxeMauriceAiBuyerCategoryHref(categoryFilter || '')} style={luxeMauriceAiCtaPrimary()}>
            Request private access
          </Link>
        </div>
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
