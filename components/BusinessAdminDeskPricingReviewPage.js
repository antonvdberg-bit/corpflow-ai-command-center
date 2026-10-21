import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import BusinessAdminDeskBrand from './BusinessAdminDeskBrand.js';
import BusinessAdminDeskLegalFooter from './BusinessAdminDeskLegalFooter.js';
import BusinessAdminDeskPackageTable from './BusinessAdminDeskPackageTable.js';
import {
  BAD_CHECKOUT_NOTE,
  BAD_PACKAGE_MODEL_NOTE,
  BAD_STATUTORY_FEE_NOTE,
} from '../lib/public/business-admin-desk-packages.js';

const linkStyle = { color: '#7dd3fc', textDecoration: 'underline' };
const pageStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #07111f, #102a3b)',
  color: '#eef6ff',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
};
const panelStyle = {
  marginTop: 24,
  padding: 24,
  border: '1px solid rgba(125,211,252,.25)',
  borderRadius: 18,
  background: 'rgba(255,255,255,.06)',
  lineHeight: 1.65,
};

export default function BusinessAdminDeskPricingReviewPage() {
  return (
    <div style={pageStyle}>
      <Head>
        <title>Business Admin Desk · Pricing review</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="description" content="Business Admin Desk pricing and Paddle review evidence." />
      </Head>
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px 56px' }}>
        <BusinessAdminDeskBrand />
        <p style={{ color: '#fbbf24', fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Internal staging review · noindex
        </p>
        <h1>Business Admin Desk package pricing review</h1>
        <p>
          Business Admin Desk is a service brand operated by CorpFlowAI Ltd for South Africa. This staging page shows
          the same approved one-time service fees as the public pricing page. {BAD_CHECKOUT_NOTE}
        </p>
        <section style={panelStyle}>
          <h2>Approved one-time service fees</h2>
          <p><strong>Package fees: VERIFIED</strong> — nine one-time ZAR service fees are approved for publication. <strong>Checkout: CLOSED</strong> — no payment is taken here.</p>
          <p>{BAD_PACKAGE_MODEL_NOTE}</p>
          <p>{BAD_STATUTORY_FEE_NOTE} Whether VAT is included remains an open commercial decision.</p>
          <p>Complex structures, cleanup and partner or portfolio rates are quoted separately. There is no automatic discount and no authority-turnaround guarantee.</p>
          <BusinessAdminDeskPackageTable />
        </section>
        <section style={panelStyle}>
          <h2>Included packages</h2>
          <p>
            The table above is the full approved list: existing-company onboarding, registration with onboarding,
            annual return where beneficial ownership is already current, simple beneficial ownership, director
            appointment or resignation, registered address, verified share certificate, company name reservation and
            financial year-end change. Initial beneficial ownership is scoped separately from incorporation.
          </p>
          <p>
            Billing questions:{' '}
            <a href="mailto:accounts@businessadmindesk.co.za" style={linkStyle}>
              accounts@businessadmindesk.co.za
            </a>
          </p>
        </section>
        <section style={panelStyle}>
          <h2>Policy and review links</h2>
          <p>
            <Link href="/terms" style={linkStyle}>Terms</Link> ·{' '}
            <Link href="/privacy" style={linkStyle}>Privacy</Link> ·{' '}
            <Link href="/refund-policy" style={linkStyle}>Refund / cancellation</Link>
          </p>
          <p>
            VAT treatment, legal review, contact verification, provider eligibility and live-domain evidence remain
            open. No checkout or payment is available on this page. Delivery and payment-security pages are not
            published for this brand while checkout is closed.
          </p>
        </section>
        <BusinessAdminDeskLegalFooter internalReview />
      </main>
    </div>
  );
}
