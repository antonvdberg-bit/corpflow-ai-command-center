import React from 'react';

import CorpFlowPublicShell from '../components/public/CorpFlowPublicShell.js';
import PublishingVideoSection from '../components/public/PublishingVideoSection.js';
import { CF } from '../components/public/corpflow-public-styles.js';
import { buildPublicPageMeta } from '../lib/public/corpflow-public-market.js';
import { VIDEO_LIBRARY } from '../lib/public/insights-content.js';

const meta = buildPublicPageMeta({
  title: 'Video briefings',
  description: 'Short CorpFlowAI video briefings on delivery sprints, lead response, conversion paths, and governed production releases.',
  path: '/videos',
  ogImage: '/assets/visuals/corpflow-home-hero.jpg',
});

export default function VideosPage() {
  return (
    <CorpFlowPublicShell meta={meta} headerCta={{ label: 'Book discovery', href: '/contact#discovery' }}>
      <section style={{ padding: '52px 0 4px', maxWidth: 860 }}>
        <p style={{ margin: 0, color: CF.link, fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>CorpFlowAI video hub</p>
        <h1 style={{ margin: '12px 0', color: CF.text, fontSize: 'clamp(36px, 6vw, 58px)', lineHeight: 1.04, letterSpacing: '-0.04em' }}>
          Short briefings for clearer delivery decisions.
        </h1>
        <p style={{ margin: 0, color: '#dbe7f5', fontSize: 18, lineHeight: 1.65 }}>
          Approved video briefings will be published here. Until then, these cards explain the topics without broken embeds or unapproved media.
        </p>
      </section>
      <PublishingVideoSection
        videos={VIDEO_LIBRARY}
        title="Upcoming CorpFlowAI briefings"
        body="Each briefing will point to a practical written insight so viewers can validate the approach before starting a discovery conversation."
        showHubLink={false}
      />
    </CorpFlowPublicShell>
  );
}
