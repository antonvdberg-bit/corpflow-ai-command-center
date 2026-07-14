import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

import CorpFlowPublicShell from '../../components/public/CorpFlowPublicShell.js';
import { CF, cfBtnPrimary, cfBtnSecondary, cfCard } from '../../components/public/corpflow-public-styles.js';
import { buildPublicPageMeta } from '../../lib/public/corpflow-public-market.js';
import { getInsightBySlug, getInsightCanonical, INSIGHT_STATUS, INSIGHTS } from '../../lib/public/insights-content.js';

function formatDate(date) {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00Z`));
}

export default function InsightArticlePage({ insight }) {
  const isPublished = insight.status === INSIGHT_STATUS.PUBLISHED;
  const meta = buildPublicPageMeta({
    title: insight.seoTitle || insight.title,
    description: insight.seoDescription || insight.summary,
    path: `/insights/${insight.slug}`,
    ogImage: insight.hero,
  });
  const canonical = insight.canonicalUrl || getInsightCanonical(insight);

  return (
    <CorpFlowPublicShell meta={{ ...meta, canonical, ogUrl: canonical }} headerCta={{ label: 'Book discovery', href: '/contact#discovery' }}>
      <Head>{!isPublished ? <meta name="robots" content="noindex, nofollow" /> : null}</Head>
      <article style={{ maxWidth: 800, paddingTop: 52 }}>
        {!isPublished ? (
          <p style={{ margin: '0 0 16px', color: '#fde68a', fontSize: 13, fontWeight: 700 }}>Draft — not indexed or promoted.</p>
        ) : null}
        <p style={{ margin: 0, color: CF.link, fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {insight.category} · {formatDate(insight.publicationDate)} · By {insight.author}
        </p>
        <h1 style={{ margin: '14px 0', color: CF.text, fontSize: 'clamp(36px, 6vw, 58px)', lineHeight: 1.05, letterSpacing: '-0.04em' }}>
          {insight.title}
        </h1>
        <p style={{ margin: 0, color: '#dbe7f5', fontSize: 19, lineHeight: 1.65 }}>{insight.summary}</p>

        <div
          aria-hidden="true"
          style={{
            marginTop: 28,
            minHeight: 230,
            borderRadius: 18,
            backgroundImage: `linear-gradient(135deg, rgba(3,16,24,0.66), rgba(4,47,46,0.76)), url("${insight.hero}")`,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            border: `1px solid ${CF.panelBorder}`,
          }}
        />

        <div style={{ marginTop: 34 }}>
          {insight.body.map((section) => (
            <section key={section.heading} style={{ marginTop: 30 }}>
              <h2 style={{ margin: '0 0 12px', color: CF.text, fontSize: 'clamp(23px, 3vw, 30px)', letterSpacing: '-0.02em' }}>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} style={{ margin: '0 0 16px', color: CF.textMuted, fontSize: 16.5, lineHeight: 1.78 }}>
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        <section style={{ ...cfCard, marginTop: 38, background: 'rgba(45,212,191,0.08)', borderColor: 'rgba(45,212,191,0.28)' }}>
          <p style={{ margin: 0, color: CF.link, fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Next step</p>
          <h2 style={{ margin: '8px 0 10px', color: CF.text, fontSize: 25 }}>Discuss the smallest useful next move.</h2>
          <p style={{ margin: '0 0 18px', color: CF.textMuted, lineHeight: 1.65 }}>
            We can review the current hand-off, confirm whether a bounded sprint fits, and clarify scope before any invoice.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <a href={insight.cta.href} style={cfBtnPrimary}>{insight.cta.label}</a>
            <Link href="/insights" style={cfBtnSecondary}>Read more insights</Link>
          </div>
        </section>
      </article>
    </CorpFlowPublicShell>
  );
}

export async function getStaticPaths() {
  return {
    paths: INSIGHTS.map((insight) => ({ params: { slug: insight.slug } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const insight = getInsightBySlug(params?.slug);
  if (!insight) return { notFound: true };
  return { props: { insight } };
}
