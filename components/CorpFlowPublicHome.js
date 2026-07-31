import React from 'react';
import Link from 'next/link';

import CorpFlowPublicPhotoShell from './public/CorpFlowPublicPhotoShell.js';
import PublicHero from './public/PublicHero.js';
import OfferCard from './public/OfferCard.js';
import OutcomeSection from './public/OutcomeSection.js';
import DeliverySteps from './public/DeliverySteps.js';
import PublicCtaBand from './public/PublicCtaBand.js';
import PublicTrustBand from './public/PublicTrustBand.js';
import {
  buildPublicPageMeta,
  CORPflow_DELIVERY_STEPS,
  CORPflow_HOMEPAGE_HERO,
  CORPflow_PROOF_ITEMS,
  CORPflow_TRUST_POINTS,
  listPublicOffers,
  listPublicServicePaths,
} from '../lib/public/corpflow-public-market.js';
import { shouldEmitCorpFlowBrandAssets } from '../lib/public/corpflow-brand-assets.js';
import { cfBody, cfCard, cfGrid, CF } from './public/corpflow-public-styles.js';

const FLAGSHIP_VIDEO_PATH = '/media/corpflowai/corpflowai-flagship-homepage-final-1080p.mp4';

const meta = buildPublicPageMeta({
  title: 'CorpFlowAI — practical AI-assisted business workflows',
  description:
    'CorpFlowAI designs and operates practical AI-assisted workflow systems for owner-led businesses. Managed delivery for administration, lead handling and digital operating upgrades — not generic AI advice.',
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

/**
 * @param {{ homepageAssets?: unknown, host?: string | null, search?: string | null }} props
 */
export default function CorpFlowPublicHome({ host = null, search = null }) {
  const servicePaths = listPublicServicePaths();
  const offers = listPublicOffers();
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
        label="Who this is for"
        title="Three practical service paths for owner-led businesses"
      >
        <p style={cfBody}>
          Choose the route that matches the work you need improved. Scope is confirmed after a qualified enquiry —
          no fixed public prices, revenue guarantees or fabricated outcomes on this page.
        </p>
        <div style={cfGrid}>
          {servicePaths.map((path) => (
            <div key={path.id} style={cfCard} data-service-path={path.id}>
              <h3 style={{ margin: '0 0 10px', fontSize: 18, color: CF.text }}>{path.title}</h3>
              <p style={{ ...cfBody, margin: '0 0 12px', fontSize: 14.5 }}>{path.summary}</p>
              <ul style={{ ...cfBody, margin: 0, paddingLeft: 18, fontSize: 14 }}>
                {path.bullets.map((b) => (
                  <li key={b} style={{ marginBottom: 6 }}>
                    {b}
                  </li>
                ))}
              </ul>
              <p style={{ margin: '14px 0 0' }}>
                <Link
                  href={`/contact?path=${encodeURIComponent(path.id)}#discovery`}
                  style={{ color: CF.link, fontWeight: 650, fontSize: 14 }}
                >
                  Enquire about this path →
                </Link>
              </p>
            </div>
          ))}
        </div>
      </OutcomeSection>

      <div id="how-we-deliver">
        <DeliverySteps
          label="Delivery method"
          title="Understand → design → build → verify → review → improve"
          steps={CORPflow_DELIVERY_STEPS}
        />
      </div>

      <OutcomeSection label="Proof" title="What CorpFlowAI has already demonstrated in controlled delivery">
        <p style={cfBody}>
          Evidence below is factual CorpFlowAI test-delivery capability. It does not claim named public client
          endorsements, confidential results or guaranteed outcomes.
        </p>
        <div style={cfGrid}>
          {CORPflow_PROOF_ITEMS.map((item) => (
            <div key={item.id} style={cfCard} data-proof-item={item.id}>
              <h3 style={{ margin: '0 0 10px', fontSize: 17, color: CF.text }}>{item.title}</h3>
              <p style={cfBody}>
                <strong style={{ color: CF.text }}>Problem:</strong> {item.problem}
              </p>
              <p style={cfBody}>
                <strong style={{ color: CF.text }}>Delivered:</strong> {item.delivered}
              </p>
              <p style={cfBody}>
                <strong style={{ color: CF.text }}>Approach:</strong> {item.approach}
              </p>
              <p style={{ ...cfBody, fontSize: 13, color: CF.textFaint, marginBottom: item.publicLink ? 10 : 0 }}>
                {item.note}
              </p>
              {item.publicLink ? (
                <Link href={item.publicLink.href} style={{ color: CF.link, fontWeight: 600 }}>
                  {item.publicLink.label} →
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      </OutcomeSection>

      <OutcomeSection label="Trust and safety" title="How delivery stays controlled">
        <div style={cfGrid}>
          {CORPflow_TRUST_POINTS.map((t) => (
            <div key={t.title} style={cfCard}>
              <h3 style={{ margin: '0 0 8px', fontSize: 16, color: CF.text }}>{t.title}</h3>
              <p style={{ ...cfBody, margin: 0, fontSize: 14.5 }}>{t.body}</p>
            </div>
          ))}
        </div>
      </OutcomeSection>

      <PublicTrustBand>
        <p style={{ ...cfBody, margin: 0, color: '#eef6ff' }}>
          CorpFlowAI provides managed delivery of practical workflow systems — not software licences alone and not
          generic AI consulting. Enquiries create an operator-visible record for human follow-up. No automatic email,
          WhatsApp or SMS is sent from this site.
        </p>
      </PublicTrustBand>

      <OutcomeSection id="offers" label="Optional bounded sprints" title="Also available: focused delivery sprints with starting prices in MUR">
        <p style={cfBody}>
          If you already know you need a short, priced sprint (lead response, landing-page rescue or reputation
          recovery), these remain available. Final sprint scope is confirmed after discovery. No guaranteed revenue
          outcomes.
        </p>
        <div style={cfGrid}>
          {offers.map((offer) => (
            <OfferCard key={offer.slug} offer={offer} />
          ))}
        </div>
      </OutcomeSection>

      <PublicCtaBand
        title="Ready to start a qualified enquiry?"
        body="Tell us your business, the problem to improve, your preferred service path and timing. You receive an on-screen reference immediately. A CorpFlowAI operator reviews fit before any commercial next step."
        primaryCta={CORPflow_HOMEPAGE_HERO.primaryCta}
        secondaryCta={{ label: 'View delivery sprints', href: '/offers/ai-lead-rescue' }}
      />
    </CorpFlowPublicPhotoShell>
  );
}
