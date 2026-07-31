import React from 'react';
import Link from 'next/link';
import CorpFlowPublicPhotoShell from '../components/public/CorpFlowPublicPhotoShell.js';
import CustomerServiceContact from '../components/CustomerServiceContact.js';
import DiscoveryIntakeForm from '../components/public/DiscoveryIntakeForm.js';
import RareExclusiveContentPage from '../components/RareExclusiveContentPage.js';
import { policyStyles as ps } from '../components/PublicPolicyLayout.js';
import { buildGeneralDiscoveryMailto, buildPublicPageMeta, listPublicOffers } from '../lib/public/corpflow-public-market.js';
import { cfBtnSecondary } from '../components/public/corpflow-public-styles.js';
import { luxOrApexPageProps } from '../lib/client/lux-host-page-props.js';

const h1 = {
  margin: '16px 0 8px',
  fontSize: 'clamp(28px, 4.6vw, 38px)',
  letterSpacing: '-0.03em',
  lineHeight: 1.15,
  color: '#eef6ff',
};
const updated = { color: '#9fb2c8', fontSize: 13, marginBottom: 24 };

/**
 * /contact — host-aware.
 * - lux.corpflowai.com → Rare & Exclusive Collection contact / advisory path
 * - apex / other → CorpFlowAI qualified enquiry
 */
export default function ContactPage({ luxMode = false, seoHost = '' } = {}) {
  if (luxMode) {
    return <RareExclusiveContentPage pageId="contact" seoHost={seoHost} />;
  }

  const offers = listPublicOffers();
  const discoveryMailto = buildGeneralDiscoveryMailto();
  const meta = buildPublicPageMeta({
    title: 'Contact',
    description:
      'Start a qualified CorpFlowAI enquiry for managed workflow delivery — administration, lead and client systems, or website operating upgrades. Human operator follow-up; no automatic outreach.',
    path: '/contact',
    ogImage: '/assets/visuals/corpflow-contact-hero.jpg',
  });

  return (
    <CorpFlowPublicPhotoShell
      meta={meta}
      visualKey="contact"
      maxWidth={800}
      headerCta={{ label: 'View service paths', href: '/#service-paths' }}
    >
      <h1 style={h1}>Contact</h1>
      <p style={updated}>
        Submit a structured enquiry. You receive an on-screen reference immediately. A CorpFlowAI operator reviews fit
        before any commercial next step — no automatic email or messaging from this page.
      </p>

      <section style={ps.section} id="discovery">
        <DiscoveryIntakeForm heading="Start a qualified enquiry" />
        <p style={{ ...ps.p, marginTop: 16 }}>
          Prefer email?{' '}
          <a href={discoveryMailto} style={{ color: '#7dd3fc' }}>
            Open mail client
          </a>{' '}
          (no automatic reference id).
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, margin: '16px 0 8px' }}>
          <Link href="/#service-paths" style={cfBtnSecondary}>
            View service paths
          </Link>
          <Link href="/offers/ai-lead-rescue" style={cfBtnSecondary}>
            View delivery sprints
          </Link>
        </div>
        <p style={ps.p}>
          Optional priced sprints:{' '}
          {offers.map((o, i) => (
            <span key={o.slug}>
              {i > 0 ? ' · ' : ''}
              <Link href={o.path} style={{ color: '#7dd3fc' }}>
                {o.title}
              </Link>
            </span>
          ))}
        </p>
      </section>

      <section style={ps.section}>
        <h2 style={ps.h2}>Legacy AI Lead Rescue intake (USD pilot)</h2>
        <p style={ps.p}>
          The USD 150 launch pilot uses a separate intake form with persistence to our operator queue — not this
          qualified enquiry form.
        </p>
        <p style={ps.p}>
          <Link href="/lead-rescue" style={{ color: '#2dd4bf', fontWeight: 700 }}>
            Go to AI Lead Rescue intake →
          </Link>
        </p>
      </section>

      <section style={ps.section}>
        <h2 style={ps.h2}>Customer service</h2>
        <CustomerServiceContact />
      </section>

      <section style={ps.section}>
        <h2 style={ps.h2}>General enquiries</h2>
        <p style={ps.p}>
          For service questions before discovery, email{' '}
          <a href={discoveryMailto} style={{ color: '#7dd3fc' }}>
            support@corpflowai.com
          </a>{' '}
          so we can route your request correctly. The contracting entity is CorpFlowAI Ltd (Mauritius). Official business
          details appear on each invoice or service agreement.
        </p>
        <p style={ps.p}>
          Service catalogue:{' '}
          <Link href="/services" style={{ color: '#7dd3fc' }}>
            services we offer
          </Link>
          . Existing clients with portal access may use{' '}
          <Link href="/login" style={{ color: '#7dd3fc' }}>
            client login
          </Link>
          .
        </p>
      </section>

      <section style={ps.section}>
        <h2 style={ps.h2}>Customer support and complaints</h2>
        <p style={ps.p}>
          Complaints are acknowledged in writing within two working days and answered with either a resolution, a partial
          refund where applicable under our{' '}
          <Link href="/refund-policy" style={{ color: '#7dd3fc' }}>
            refund and cancellation policy
          </Link>
          , or a written explanation. If a complaint is not resolved at the support level, you may request founder review
          by replying to the same thread.
        </p>
      </section>
    </CorpFlowPublicPhotoShell>
  );
}

export async function getServerSideProps({ req }) {
  return luxOrApexPageProps(req);
}
