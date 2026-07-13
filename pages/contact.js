import React from 'react';
import Link from 'next/link';
import PublicPolicyLayout, { policyStyles as ps } from '../components/PublicPolicyLayout.js';
import CustomerServiceContact from '../components/CustomerServiceContact.js';
import { buildGeneralDiscoveryMailto, listPublicOffers } from '../lib/public/corpflow-public-market.js';
import { cfBtnPrimary } from '../components/public/corpflow-public-styles.js';

export default function ContactPage() {
  const offers = listPublicOffers();
  const discoveryMailto = buildGeneralDiscoveryMailto();

  return (
    <PublicPolicyLayout
      title="Contact"
      description="Book a discovery conversation about CorpFlowAI delivery sprints — lead response, premium landing pages, and customer recovery. Mauritius operators welcome."
      path="/contact"
    >
      <section style={ps.section}>
        <h2 style={ps.h2}>Book a discovery conversation</h2>
        <p style={ps.p}>
          The fastest path to scope a delivery sprint is a short discovery call. Tell us your business name, how customers
          reach you today, and which problem hurts most — slow follow-up, weak landing page, or reputation recovery.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, margin: '8px 0 16px' }}>
          <a href={discoveryMailto} style={cfBtnPrimary}>
            Email to book discovery
          </a>
          <Link href="/offers/ai-lead-rescue" style={{ ...cfBtnPrimary, background: 'rgba(255,255,255,0.09)', color: '#eef6ff', border: '1px solid rgba(255,255,255,0.15)' }}>
            View delivery sprints
          </Link>
        </div>
        <p style={ps.p}>
          Active sprints:{' '}
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
          The USD 150 launch pilot uses a separate intake form with persistence to our operator queue — not the contact
          page.
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
    </PublicPolicyLayout>
  );
}
