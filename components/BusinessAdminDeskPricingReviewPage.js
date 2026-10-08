import React from 'react';
import Head from 'next/head';

import PublicPolicyLayout, { policyStyles as ps } from './PublicPolicyLayout.js';

const services = [
  'Company registration and onboarding',
  'Annual return with beneficial ownership current',
  'Simple beneficial ownership work',
  'Director appointment or resignation',
  'Registered address, company name and year-end changes',
  'Share certificate and statutory record tasks',
];

export default function BusinessAdminDeskPricingReviewPage() {
  return (
    <PublicPolicyLayout title="Business Admin Desk · pricing review" showUpdated={false}>
      <Head>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="description" content="Business Admin Desk pricing and Paddle review evidence." />
      </Head>
      <p style={ps.p}>
        REVIEW-ONLY STAGING — Business Admin Desk is operated by CorpFlowAI Ltd for South Africa.
        Final numerical rates are not approved and no checkout or payment is available on this page.
      </p>
      <section style={ps.section}>
        <h2 style={ps.h2}>Who this is for</h2>
        <ul style={ps.ul}>
          <li>Small businesses</li>
          <li>Professional providers</li>
          <li>Multi-company portfolios and partner operators</li>
        </ul>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Quote-only scope</h2>
        <ul style={ps.ul}>{services.map((service) => <li key={service}>{service}</li>)}</ul>
        <p style={ps.p}>
          One-time onboarding creates a reusable verified file. Complex or cleanup work is separately
          quoted. Initial beneficial ownership work is separate from incorporation; a share certificate
          is a company-record task.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>How a written quote works</h2>
        <p style={ps.p}>
          Each quote itemizes the service fee, one-off setup, statutory fee, tax and total before
          commitment. Statutory fees are separate. Partner and portfolio rates are privately scoped;
          there is no automatic blanket discount or invented retainer.
        </p>
        <p style={ps.p}>
          We make no outcome or authority-turnaround guarantee. Provider eligibility and final
          commercial approval remain pending review.
        </p>
      </section>
      <p style={ps.p}>
        Read the <a href="/terms" style={{ color: '#7dd3fc' }}>Terms</a>,{' '}
        <a href="/privacy" style={{ color: '#7dd3fc' }}>Privacy</a>,{' '}
        <a href="/refund-policy" style={{ color: '#7dd3fc' }}>Refund/Cancellation</a>, and{' '}
        <a href="/contact" style={{ color: '#7dd3fc' }}>Contact</a> pages.
      </p>
    </PublicPolicyLayout>
  );
}
