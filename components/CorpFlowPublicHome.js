import React from 'react';
import Link from 'next/link';

import CorpFlowPublicPhotoShell from './public/CorpFlowPublicPhotoShell.js';
import PublicHero from './public/PublicHero.js';
import OutcomeSection from './public/OutcomeSection.js';
import PublicCtaBand from './public/PublicCtaBand.js';
import PublicTrustBand from './public/PublicTrustBand.js';
import {
  buildPublicPageMeta,
  CORPflow_BUYER_FIT,
  CORPflow_HOMEPAGE_HERO,
  CORPflow_PROOF_ITEMS,
  CORPflow_TRUST_POINTS,
  MARKET_SERVICE_PATHS,
} from '../lib/public/corpflow-public-market.js';
import {
  ENQUIRY_RECOVERY_DEPOSIT_LINE,
  ENQUIRY_RECOVERY_OFFER_NAME,
  ENQUIRY_RECOVERY_PRICE_LINE,
  ENQUIRY_RECOVERY_QUALIFICATION_LINE,
  ENQUIRY_RECOVERY_SCARCITY_LINE,
} from '../lib/public/enquiry-recovery-sprint.js';
import { shouldEmitCorpFlowBrandAssets } from '../lib/public/corpflow-brand-assets.js';
import { cfBody, cfCard, cfGrid, cfLink, CF } from './public/corpflow-public-styles.js';

const FLAGSHIP_VIDEO_PATH = '/media/corpflowai/corpflowai-flagship-homepage-final-1080p.mp4';

const meta = buildPublicPageMeta({
  title: 'Stop losing valuable enquiries after first contact',
  description:
    'CorpFlowAI helps selected Mauritius businesses identify and recover valuable enquiries that have gone quiet. Enquiry Recovery Sprint — MUR 85,000 fixed. Maximum three founding clients. Request a 15-minute diagnosis.',
  path: '/',
  ogImage: '/assets/visuals/corpflow-home-hero.jpg',
});

function FlagshipVideoSection() {
  return (
    <section aria-labelledby="corpflow-flagship-video-title" style={{ marginTop: 36 }}>
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
        Context
      </p>
      <h2
        id="corpflow-flagship-video-title"
        style={{
          margin: '8px 0 10px',
          color: CF.text,
          fontSize: 'clamp(23px, 3vw, 30px)',
          letterSpacing: '-0.02em',
        }}
      >
        Quiet enquiries are a commercial problem
      </h2>
      <p style={{ ...cfBody, margin: '0 0 16px', maxWidth: 760 }}>
        A short briefing on why follow-up leakage costs money. This is not a generic AI demo. Diagnosis still starts with a 15-minute conversation.
      </p>
      <div
        style={{
          aspectRatio: '16 / 9',
          overflow: 'hidden',
          borderRadius: 16,
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

function ServicePathCard({ path }) {
  const enquireHref = `/contact?path=${encodeURIComponent(path.id)}#discovery`;
  return (
    <article style={cfCard} data-service-path={path.id}>
      <h3 style={{ margin: '0 0 10px', fontSize: 18, color: CF.text, letterSpacing: '-0.02em' }}>{path.title}</h3>
      <p style={{ ...cfBody, margin: '0 0 12px', fontSize: 14 }}>{path.summary}</p>
      <ul style={{ ...cfBody, margin: '0 0 14px', paddingLeft: 18, fontSize: 14 }}>
        {path.bullets.map((b) => (
          <li key={b} style={{ marginBottom: 4 }}>
            {b}
          </li>
        ))}
      </ul>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Link href={enquireHref} style={cfLink}>
          Enquire about this path →
        </Link>
        {path.productHref && path.productLabel ? (
          <Link href={path.productHref} style={{ ...cfLink, fontSize: 13, color: CF.textFaint }}>
            {path.productLabel} →
          </Link>
        ) : null}
      </div>
    </article>
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

      <OutcomeSection
        id="commercial-focus"
        label="The live offer"
        title={`${ENQUIRY_RECOVERY_OFFER_NAME} — ${ENQUIRY_RECOVERY_PRICE_LINE}`}
      >
        <p style={cfBody}>{ENQUIRY_RECOVERY_SCARCITY_LINE}</p>
        <p style={cfBody}>
          Conversation → diagnosis → written offer → deposit. {ENQUIRY_RECOVERY_DEPOSIT_LINE} We do not ask you to
          replace the tools you already use. We are not selling generic marketing, and we are not selling “AI”.
        </p>
        <p style={{ ...cfBody, margin: 0 }}>{ENQUIRY_RECOVERY_QUALIFICATION_LINE}</p>
      </OutcomeSection>

      <OutcomeSection label={CORPflow_BUYER_FIT.label} title={CORPflow_BUYER_FIT.title}>
        <p style={{ ...cfBody, margin: 0 }}>{CORPflow_BUYER_FIT.body}</p>
      </OutcomeSection>

      {showFlagshipVideo ? <FlagshipVideoSection /> : null}

      <OutcomeSection
        id="service-paths"
        label="If enquiry recovery is not the problem"
        title="Two other starting points — still bounded, still conversation-first"
      >
        <p style={cfBody}>
          Enquiry Recovery is the live commercial offer. Website Rescue remains available if the enquiry page itself is
          weak. Broader administration work starts only after a qualified conversation — not from a product grid.
        </p>
        <div style={cfGrid}>
          {MARKET_SERVICE_PATHS.map((path) => (
            <ServicePathCard key={path.id} path={path} />
          ))}
        </div>
      </OutcomeSection>

      <OutcomeSection
        label="Proof of capability"
        title="What CorpFlowAI has already demonstrated on controlled test delivery"
      >
        <p style={{ ...cfBody, marginBottom: 14 }}>
          Evidence below describes CorpFlowAI internal and test-tenant capabilities. It is not a public client
          endorsement and does not disclose private client information.
        </p>
        <div style={cfGrid}>
          {CORPflow_PROOF_ITEMS.map((item) => (
            <div key={item.title} style={cfCard} data-proof-item>
              <h3 style={{ margin: '0 0 8px', fontSize: 17, color: CF.text }}>{item.title}</h3>
              <p style={{ ...cfBody, margin: '0 0 10px', fontSize: 14 }}>{item.capability}</p>
              <p style={{ ...cfBody, margin: '0 0 12px', fontSize: 13, color: CF.textFaint }}>
                Demonstrated by: {item.demonstratedBy}
              </p>
              <Link href={item.link.href} style={cfLink}>
                {item.link.label} →
              </Link>
            </div>
          ))}
        </div>
      </OutcomeSection>

      <OutcomeSection label="Trust and safety" title="Controlled delivery with clear boundaries">
        <div style={cfGrid}>
          {CORPflow_TRUST_POINTS.map((point) => (
            <div key={point.title} style={cfCard} data-trust-point>
              <h3 style={{ margin: '0 0 8px', fontSize: 16, color: CF.text }}>{point.title}</h3>
              <p style={{ ...cfBody, margin: 0, fontSize: 14 }}>{point.body}</p>
            </div>
          ))}
        </div>
      </OutcomeSection>

      <PublicTrustBand>
        <p style={{ ...cfBody, margin: 0, color: '#eef6ff' }}>
          CorpFlowAI is Mauritius-based and works with selected owner-led businesses. We do not promise guaranteed revenue.
          We help identify quiet enquiries and make follow-up visible — without replacing your stack unless that work is
          scoped in writing.
        </p>
      </PublicTrustBand>

      <OutcomeSection label="Product entry points" title="Start with a focused product when it already fits">
        <ul style={{ ...cfBody, paddingLeft: 20, margin: 0 }}>
          <li>
            <Link href="/enquiry-recovery" style={{ color: CF.link }}>
              Enquiry Recovery Sprint
            </Link>{' '}
            — identify and recover valuable enquiries that have gone quiet (MUR 85,000 fixed; three founding-client slots).
          </li>
          <li>
            <Link href="/website-rescue" style={{ color: CF.link }}>
              Website Rescue
            </Link>{' '}
            — bounded landing-page rescue with a clearer enquiry path; see the{' '}
            <Link href="/demo/website-rescue" style={{ color: CF.link }}>
              fictional demo
            </Link>
            .
          </li>
          <li>
            Broader workflow and administration work starts from the qualified conversation form — scope confirmed
            before any invoice.
          </li>
        </ul>
      </OutcomeSection>

      <PublicCtaBand
        title="Ready to see whether quiet enquiries are costing you?"
        body="Request a 15-minute diagnosis. If we cannot identify a commercially meaningful recovery problem, we should not work together. No payment on this website."
        primaryCta={CORPflow_HOMEPAGE_HERO.primaryCta}
        secondaryCta={{ label: 'Enquiry Recovery Sprint', href: '/enquiry-recovery' }}
      />
    </CorpFlowPublicPhotoShell>
  );
}
