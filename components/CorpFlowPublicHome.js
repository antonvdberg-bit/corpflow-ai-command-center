import React from 'react';

import CorpFlowPublicPhotoShell from './public/CorpFlowPublicPhotoShell.js';
import PublicHero from './public/PublicHero.js';
import OutcomeSection from './public/OutcomeSection.js';
import PublicCtaBand from './public/PublicCtaBand.js';
import PublicTrustBand from './public/PublicTrustBand.js';
import {
  buildPublicPageMeta,
  CORPflow_BUYER_FIT,
  CORPflow_HOMEPAGE_HERO,
} from '../lib/public/corpflow-public-market.js';
import {
  ENQUIRY_RECOVERY_DEPOSIT_LINE,
  ENQUIRY_RECOVERY_IMPLEMENTATION_LINE,
  ENQUIRY_RECOVERY_OFFER_NAME,
  ENQUIRY_RECOVERY_PRICE_LINE,
  ENQUIRY_RECOVERY_QUALIFICATION_LINE,
  ENQUIRY_RECOVERY_SCARCITY_LINE,
} from '../lib/public/enquiry-recovery-sprint.js';
import { shouldEmitCorpFlowBrandAssets } from '../lib/public/corpflow-brand-assets.js';
import { cfBody, CF } from './public/corpflow-public-styles.js';

const FLAGSHIP_VIDEO_PATH = '/media/corpflowai/corpflowai-flagship-homepage-final-1080p.mp4';
const HOME_SECTION_SPACING = { marginTop: 64 };

const meta = buildPublicPageMeta({
  title: 'Stop losing valuable enquiries after first contact',
  description:
    'CorpFlowAI helps selected Mauritius businesses identify and recover valuable enquiries that have gone quiet. Enquiry Recovery Sprint — MUR 85,000 fixed. Maximum three founding clients. Request a 15-minute Enquiry Recovery Diagnosis.',
  path: '/',
  ogImage: '/assets/visuals/corpflow-home-hero.jpg',
});

function FlagshipVideoSection() {
  return (
    <section aria-labelledby="corpflow-flagship-video-title" style={{ marginTop: 64 }}>
      <p
        style={{
          margin: 0,
          color: CF.link,
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        See the problem
      </p>
      <h2
        id="corpflow-flagship-video-title"
        style={{
          margin: '8px 0 18px',
          color: CF.text,
          fontSize: 'clamp(23px, 3vw, 30px)',
          letterSpacing: '-0.02em',
        }}
      >
        Quiet enquiries are a commercial problem
      </h2>
      <div
        style={{
          aspectRatio: '16 / 9',
          overflow: 'hidden',
          borderRadius: 18,
          border: '1px solid rgba(125,211,252,0.22)',
          background: '#020b14',
          boxShadow: '0 24px 64px rgba(2, 6, 23, 0.28)',
        }}
      >
        <video
          aria-label="CorpFlowAI briefing on recovering quiet enquiries"
          title="Quiet enquiries are a commercial problem"
          controls
          playsInline
          preload="metadata"
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
        >
          <source src={FLAGSHIP_VIDEO_PATH} type="video/mp4" />
          Your browser does not support HTML5 video.{' '}
          <a href={FLAGSHIP_VIDEO_PATH}>Open the CorpFlowAI briefing video</a>.
        </video>
      </div>
    </section>
  );
}

/**
 * @param {{ homepageAssets?: unknown, host?: string | null, search?: string | null }} props
 */
export default function CorpFlowPublicHome({ host = null, search = null }) {
  const showFlagshipVideo = shouldEmitCorpFlowBrandAssets(host, { search });

  return (
    <CorpFlowPublicPhotoShell
      meta={meta}
      visualKey="home"
      headerCta={CORPflow_HOMEPAGE_HERO.primaryCta}
      brandHost={host}
      brandSearch={search}
    >
      <PublicHero {...CORPflow_HOMEPAGE_HERO} />

      {showFlagshipVideo ? <FlagshipVideoSection /> : null}

      <OutcomeSection
        id="commercial-focus"
        label="The live offer"
        title={`${ENQUIRY_RECOVERY_OFFER_NAME} — ${ENQUIRY_RECOVERY_PRICE_LINE}`}
        style={HOME_SECTION_SPACING}
      >
        <p style={cfBody}>{ENQUIRY_RECOVERY_SCARCITY_LINE}</p>
        <p style={cfBody}>
          {ENQUIRY_RECOVERY_IMPLEMENTATION_LINE} Conversation → diagnosis → written offer → deposit.{' '}
          {ENQUIRY_RECOVERY_DEPOSIT_LINE}
        </p>
        <p style={cfBody}>{CORPflow_BUYER_FIT.body}</p>
        <p style={{ ...cfBody, margin: 0 }}>{ENQUIRY_RECOVERY_QUALIFICATION_LINE}</p>
      </OutcomeSection>

      <div style={{ marginTop: 24 }}>
        <PublicTrustBand>
          <p style={{ ...cfBody, margin: 0, color: '#eef6ff' }}>
            Mauritius-based. Controlled delivery. No guaranteed-revenue claims. We make follow-up visible without replacing your existing stack unless that work is specifically scoped.
          </p>
        </PublicTrustBand>
      </div>

      <div style={{ marginTop: 16 }}>
        <PublicCtaBand
          title="Ready to see whether quiet enquiries are costing you?"
          body="Request a 15-minute Enquiry Recovery Diagnosis. If we cannot identify a commercially meaningful recovery problem, we should not work together. No payment on this website."
          primaryCta={CORPflow_HOMEPAGE_HERO.primaryCta}
        />
      </div>
    </CorpFlowPublicPhotoShell>
  );
}
