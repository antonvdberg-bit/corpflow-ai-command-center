import React from 'react';
import Link from 'next/link';

import CorpFlowPublicPhotoShell from './public/CorpFlowPublicPhotoShell.js';
import PublicHero from './public/PublicHero.js';
import OutcomeSection from './public/OutcomeSection.js';
import DeliverySteps from './public/DeliverySteps.js';
import PublicCtaBand from './public/PublicCtaBand.js';
import PublicTrustBand from './public/PublicTrustBand.js';
import {
  buildPublicPageMeta,
  CORPflow_BUYER_FIT,
  CORPflow_DELIVERY_STEPS,
  CORPflow_HOMEPAGE_HERO,
  CORPflow_PROOF_ITEMS,
  CORPflow_TRUST_POINTS,
  MARKET_SERVICE_PATHS,
} from '../lib/public/corpflow-public-market.js';
import { shouldEmitCorpFlowBrandAssets } from '../lib/public/corpflow-brand-assets.js';
import { cfBody, cfCard, cfGrid, cfLink, CF } from './public/corpflow-public-styles.js';

const FLAGSHIP_VIDEO_PATH = '/media/corpflowai/corpflowai-flagship-homepage-final-1080p.mp4';

const meta = buildPublicPageMeta({
  title: 'CorpFlowAI — managed AI-assisted business workflows',
  description:
    'CorpFlowAI designs and operates practical AI-assisted workflow systems for SMEs — managed delivery for administration, lead handling, and website operating upgrades. Request a qualified conversation.',
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
        Flagship video
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
        Meet CorpFlowAI
      </h2>
      <p style={{ ...cfBody, margin: '0 0 16px', maxWidth: 760 }}>
        See how CorpFlowAI turns practical business problems into visible, governed delivery.
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
          aria-label="Meet CorpFlowAI flagship video"
          title="Meet CorpFlowAI"
          controls
          playsInline
          preload="metadata"
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
        >
          <source src={FLAGSHIP_VIDEO_PATH} type="video/mp4" />
          Your browser does not support HTML5 video.{' '}
          <a href={FLAGSHIP_VIDEO_PATH}>Open the approved CorpFlowAI flagship video</a>.
        </video>
      </div>
    </section>
  );
}

function ServicePathCard({ path }) {
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
      {path.productHref && path.productLabel ? (
        <Link href={path.productHref} style={cfLink}>
          {path.productLabel} →
        </Link>
      ) : (
        <Link href="/contact#discovery" style={cfLink}>
          Request a conversation →
        </Link>
      )}
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

      {showFlagshipVideo ? <FlagshipVideoSection /> : null}

      <OutcomeSection
        id="service-paths"
        label="How CorpFlowAI helps"
        title="Three practical service paths — managed delivery, not generic AI advice"
      >
        <p style={cfBody}>
          Choose the path that matches the problem. Product funnels such as AI Lead Rescue and Website Rescue are
          available where they already fit; broader workflow work starts with a qualified conversation.
        </p>
        <div style={cfGrid}>
          {MARKET_SERVICE_PATHS.map((path) => (
            <ServicePathCard key={path.id} path={path} />
          ))}
        </div>
      </OutcomeSection>

      <OutcomeSection label={CORPflow_BUYER_FIT.label} title={CORPflow_BUYER_FIT.title}>
        <p style={{ ...cfBody, margin: 0 }}>{CORPflow_BUYER_FIT.body}</p>
      </OutcomeSection>

      <DeliverySteps
        label="Delivery method"
        title="Understand → design → build → verify → review → improve"
        steps={CORPflow_DELIVERY_STEPS}
      />

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
          CorpFlowAI provides managed delivery — design, build, verify and improve with an accountable operator path.
          We do not promise guaranteed revenue, and we do not replace your stack unless that work is scoped in writing.
        </p>
      </PublicTrustBand>

      <OutcomeSection label="Product entry points" title="Start with a focused product when it already fits">
        <ul style={{ ...cfBody, paddingLeft: 20, margin: 0 }}>
          <li>
            <Link href="/lead-rescue" style={{ color: CF.link }}>
              AI Lead Rescue
            </Link>{' '}
            — capture, alert, log and follow up missed enquiries (USD 150 launch pilot path; separate intake).
          </li>
          <li>
            <Link href="/offers/premium-landing-page-rescue" style={{ color: CF.link }}>
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
        title="Ready for a qualified conversation?"
        body="Tell us your business, the problem or outcome you want, your preferred service path, and timing. You get an on-screen reference immediately. No payment and no automatic outreach from this form."
        primaryCta={CORPflow_HOMEPAGE_HERO.primaryCta}
        secondaryCta={{ label: 'Open AI Lead Rescue', href: '/lead-rescue' }}
      />
    </CorpFlowPublicPhotoShell>
  );
}
