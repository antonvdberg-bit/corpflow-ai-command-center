import React from 'react';
import Link from 'next/link';

import CorpFlowPublicPhotoShell from './public/CorpFlowPublicPhotoShell.js';
import PublicHero from './public/PublicHero.js';
import OfferCard from './public/OfferCard.js';
import OutcomeSection from './public/OutcomeSection.js';
import DeliverySteps from './public/DeliverySteps.js';
import PublicCtaBand from './public/PublicCtaBand.js';
import PublicTrustBand from './public/PublicTrustBand.js';
import PublishingVideoSection from './public/PublishingVideoSection.js';
import {
  buildPublicPageMeta,
  CORPflow_DELIVERY_STEPS,
  CORPflow_HOMEPAGE_HERO,
  CORPflow_PROOF_EXAMPLE,
  listPublicOffers,
} from '../lib/public/corpflow-public-market.js';
import { VIDEO_LIBRARY } from '../lib/public/insights-content.js';
import { cfBody, cfCard, cfGrid, CF } from './public/corpflow-public-styles.js';

const meta = buildPublicPageMeta({
  title: 'CorpFlowAI — bounded delivery sprints',
  description:
    'Recover missed revenue, repair weak digital journeys, and launch working client experiences quickly. Lead response, premium landing pages, and customer recovery sprints from Mauritius.',
  path: '/',
  ogImage: '/assets/visuals/corpflow-home-hero.jpg',
});

/**
 * @param {{ homepageAssets?: unknown }} props — legacy prop retained for pages/index.js SSR; visuals optional.
 */
export default function CorpFlowPublicHome() {
  const offers = listPublicOffers();

  return (
    <CorpFlowPublicPhotoShell meta={meta} visualKey="home" headerCta={CORPflow_HOMEPAGE_HERO.primaryCta}>
      <PublicHero {...CORPflow_HOMEPAGE_HERO} />

      <OutcomeSection id="offers" label="What you can buy now" title="Three delivery sprints — starting prices in MUR">
        <p style={cfBody}>
          Final scope is confirmed after discovery. Third-party fees are quoted separately where applicable. No
          guaranteed revenue outcomes.
        </p>
        <div style={cfGrid}>
          {offers.map((offer) => (
            <OfferCard key={offer.slug} offer={offer} />
          ))}
        </div>
      </OutcomeSection>

      <OutcomeSection label="Why revenue leaks" title="Slow follow-up, weak pages, and silent complaints cost real money">
        <ul style={{ ...cfBody, paddingLeft: 20, margin: 0 }}>
          <li>Enquiries arrive across WhatsApp, email, forms, and social — but no one owns the follow-up path.</li>
          <li>Landing pages hide the offer or fail on mobile, so buyers bounce before they reach you.</li>
          <li>Complaints and reviews stack up in DMs while the team responds ad hoc or not at all.</li>
        </ul>
      </OutcomeSection>

      <DeliverySteps steps={CORPflow_DELIVERY_STEPS} />

      <PublishingVideoSection
        videos={VIDEO_LIBRARY.slice(0, 1)}
        title="See the delivery approach before you decide"
        body="Our flagship briefing will walk through the governed path from discovery to live production validation. The written insight library is available now."
      />

      <OutcomeSection label="Proof" title={CORPflow_PROOF_EXAMPLE.title}>
        <div style={cfCard}>
          <p style={cfBody}>
            <strong style={{ color: CF.text }}>Problem:</strong> {CORPflow_PROOF_EXAMPLE.problem}
          </p>
          <p style={cfBody}>
            <strong style={{ color: CF.text }}>Delivered:</strong> {CORPflow_PROOF_EXAMPLE.delivered}
          </p>
          <p style={cfBody}>
            <strong style={{ color: CF.text }}>Approach:</strong> {CORPflow_PROOF_EXAMPLE.approach}
          </p>
          <p style={{ ...cfBody, fontSize: 13, color: CF.textFaint }}>
            Named case study publication: {CORPflow_PROOF_EXAMPLE.namedPublication} (internal register — not a public
            legal claim).
          </p>
          <Link href={CORPflow_PROOF_EXAMPLE.publicLink.href} style={{ color: CF.link, fontWeight: 600 }}>
            {CORPflow_PROOF_EXAMPLE.publicLink.label} →
          </Link>
        </div>
      </OutcomeSection>

      <PublicTrustBand>
        <p style={{ ...cfBody, margin: 0, color: '#eef6ff' }}>
          ERPNext remains the system of record for prospects, quotes, and deposits. CorpFlowAI is the public selling and
          delivery wrapper — visible output within 24–72 hours after deposit clearance, without revenue guarantees.
        </p>
      </PublicTrustBand>

      <OutcomeSection label="Engagement model" title="Starting prices — final scope after discovery">
        <ul style={{ ...cfBody, paddingLeft: 20, margin: 0 }}>
          <li>AI Lead Rescue Sprint — from MUR 35,000</li>
          <li>Premium Landing Page Rescue — from MUR 45,000</li>
          <li>Customer Recovery &amp; Reputation Management Sprint — from MUR 45,000</li>
          <li>50% deposit before work commences; balance per quote</li>
          <li>
            Legacy USD 150 launch pilot remains at{' '}
            <Link href="/lead-rescue" style={{ color: CF.link }}>
              /lead-rescue
            </Link>{' '}
            — separate funnel
          </li>
        </ul>
      </OutcomeSection>

      <PublicCtaBand
        title="Ready to start a discovery conversation?"
        body="Tell us your business name, how customers reach you, and which problem hurts most. We confirm fit, scope, deposit, and timeline before any invoice."
        primaryCta={CORPflow_HOMEPAGE_HERO.primaryCta}
        secondaryCta={{ label: 'View all sprints', href: '/offers/ai-lead-rescue' }}
      />
    </CorpFlowPublicPhotoShell>
  );
}
