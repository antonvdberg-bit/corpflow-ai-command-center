import React from 'react';
import Link from 'next/link';
import PublicPolicyLayout, { policyStyles as ps } from '../components/PublicPolicyLayout.js';
import CustomerServiceContact from '../components/CustomerServiceContact.js';
import BusinessAdminDeskPolicyPage from '../components/BusinessAdminDeskPolicyPage.js';
import { resolveBusinessAdminDeskSurface } from '../lib/public/business-admin-desk-packages.js';
import { BAD_PRIVACY_SECTIONS } from '../lib/public/business-admin-desk-policies.js';

export default function PrivacyPage({ surface = 'other' }) {
  if (surface === 'public' || surface === 'staging') {
    return (
      <BusinessAdminDeskPolicyPage
        title="Privacy"
        description="Privacy notice for the Business Admin Desk website, operated by CorpFlowAI Ltd."
        path="/privacy"
        review={surface === 'staging'}
        sections={BAD_PRIVACY_SECTIONS}
      />
    );
  }
  return <CorpFlowPrivacyPage />;
}

function CorpFlowPrivacyPage() {
  return (
    <PublicPolicyLayout title="Privacy Policy">
      <section style={ps.section}>
        <h2 style={ps.h2}>Overview</h2>
        <p style={ps.p}>
          CorpFlowAI Ltd provides software and workflow automation packages, including the implementation, setup
          and support agreed in writing. This policy describes how we handle information collected through our
          public website, intake forms, and delivery of those packages.
          Business Admin Desk has its own privacy notice at{' '}
          <a href="https://businessadmindesk.co.za/privacy" style={{ color: '#7dd3fc' }}>
            businessadmindesk.co.za/privacy
          </a>
          .
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Information we collect</h2>
        <ul style={ps.ul}>
          <li>Intake form details such as business name, contact name, email, phone, and message content</li>
          <li>Operational information needed to deliver the requested workflow or pilot</li>
          <li>Basic technical logs required to operate and secure the website and services</li>
        </ul>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>How we use information</h2>
        <ul style={ps.ul}>
          <li>Review intake requests and respond about fit, scope, and next steps</li>
          <li>Deliver agreed workflow setup, alerts, logs, summaries, and monitoring</li>
          <li>Operate, maintain, and improve our services</li>
          <li>Communicate about the engagement you requested</li>
        </ul>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>What we do not do</h2>
        <p style={ps.p}>We do not sell personal data. We do not collect card or banking details through this public website.</p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Payment-card transmission</h2>
        <p style={ps.p}>
          This website does not capture, transmit, or store card data, and it does not offer live checkout. If a
          hosted payment page is later approved, card details are entered on that provider&apos;s page over TLS. If
          that provider is Paddle, Paddle is merchant of record for that transaction only and card details stay on
          Paddle&apos;s hosted page. Card details are never transmitted to or stored on CorpFlowAI servers. Naming
          Paddle here does not mean Paddle checkout is active. See the{' '}
          <Link href="/payment-security" style={{ color: '#7dd3fc' }}>
            payment security policy
          </Link>{' '}
          for full detail.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Subprocessors</h2>
        <p style={ps.p}>
          We use infrastructure providers to host and operate the website (for example Vercel for hosting and Neon for
          database storage). If a payment provider is approved and activated, card data stays on that provider&apos;s
          hosted page. We do not sell personal data.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Privacy contact</h2>
        <CustomerServiceContact />
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Retention and updates</h2>
        <p style={ps.p}>
          We retain information for as long as needed to deliver services, meet reasonable business records needs, and
          comply with applicable obligations. You may request access, correction, or deletion of your information by
          contacting us through the intake form on /lead-rescue or the contact page.
        </p>
        <p style={ps.p}>This policy may be updated from time to time. Material changes will be reflected on this page.</p>
      </section>
    </PublicPolicyLayout>
  );
}

export function getServerSideProps({ req }) {
  return { props: { surface: resolveBusinessAdminDeskSurface(req?.headers?.host) } };
}
