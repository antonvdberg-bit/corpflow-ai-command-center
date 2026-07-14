import React from 'react';
import Link from 'next/link';

import CorpFlowPublicShell from '../../components/public/CorpFlowPublicShell.js';
import { CF, cfBtnPrimary, cfCard, cfGrid } from '../../components/public/corpflow-public-styles.js';
import { buildPublicPageMeta } from '../../lib/public/corpflow-public-market.js';
import { listPublishedInsights } from '../../lib/public/insights-content.js';

const meta = buildPublicPageMeta({
  title: 'Insights',
  description: 'Practical CorpFlowAI notes on lead response, web conversion, delivery governance, and operating workflows.',
  path: '/insights',
  ogImage: '/assets/visuals/corpflow-home-hero.jpg',
});

function formatDate(date) {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00Z`));
}

export default function InsightsIndexPage({ insights }) {
  return (
    <CorpFlowPublicShell meta={meta} headerCta={{ label: 'Book discovery', href: '/contact#discovery' }}>
      <section style={{ padding: '52px 0 10px', maxWidth: 860 }}>
        <p style={{ margin: 0, color: CF.link, fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>CorpFlowAI insights</p>
        <h1 style={{ margin: '12px 0', color: CF.text, fontSize: 'clamp(36px, 6vw, 58px)', lineHeight: 1.04, letterSpacing: '-0.04em' }}>
          Practical notes for making business work visible.
        </h1>
        <p style={{ margin: 0, color: '#dbe7f5', fontSize: 18, lineHeight: 1.65 }}>
          Short, evidence-aware guides on lead response, conversion paths, workflow ownership, and governed delivery.
        </p>
      </section>

      <section style={{ marginTop: 36 }}>
        <div style={cfGrid}>
          {insights.map((insight) => (
            <article key={insight.slug} style={{ ...cfCard, display: 'flex', minHeight: 280, flexDirection: 'column' }}>
              <p style={{ margin: 0, color: CF.link, fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {insight.category} · {formatDate(insight.publicationDate)}
              </p>
              <h2 style={{ margin: '12px 0 10px', color: CF.text, fontSize: 23, lineHeight: 1.2 }}>{insight.title}</h2>
              <p style={{ margin: 0, color: CF.textMuted, lineHeight: 1.65, flex: 1 }}>{insight.summary}</p>
              <Link href={`/insights/${insight.slug}`} style={{ ...cfBtnPrimary, alignSelf: 'flex-start', marginTop: 20 }}>
                Read insight
              </Link>
            </article>
          ))}
        </div>
      </section>
    </CorpFlowPublicShell>
  );
}

export async function getStaticProps() {
  return { props: { insights: listPublishedInsights() } };
}
