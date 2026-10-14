import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import BusinessAdminDeskBrand from './BusinessAdminDeskBrand.js';
import BusinessAdminDeskLegalFooter from './BusinessAdminDeskLegalFooter.js';

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
          Internal staging review · not public pricing
        </p>
        <h1>Business Admin Desk package pricing review</h1>
        <p>
          Business Admin Desk is a service brand operated by CorpFlowAI Ltd for South Africa. This page records
          scope and pricing evidence for review; it does not publish final rates or activate checkout.
        </p>
        <section style={panelStyle}>
          <h2>Quoted package scope</h2>
          <p><strong>Readiness status: VERIFIED</strong> — package scope is documented. <strong>Final pricing: OPEN</strong> — numerical rates are not approved.</p>
          <p>Final numerical rates are not approved. Written quotes must itemize:</p>
          <ul>
            <li>service fee and one-time setup, if applicable;</li>
            <li>statutory fee, tax and total before commitment;</li>
            <li>the configured workflow/file outcome and any required client inputs.</li>
          </ul>
          <p><strong>Pricing status: QUOTED IN ZAR / pilot rates under review.</strong></p>
        </section>
        <section style={panelStyle}>
          <h2>Included reviewable services</h2>
          <p>
            Company registration, annual return with beneficial ownership current, simple beneficial ownership,
            director appointment or resignation, registered address, company name, share certificate, year end and
            onboarding. Initial beneficial ownership is scoped separately from incorporation; a share certificate is a
            company-record task.
          </p>
          <p>
            One-time onboarding creates a reusable verified file. Complex structures and cleanup are separately quoted.
            Statutory fees are separate. There are no outcome or authority-turnaround guarantees, no duplicate billing,
            and no automatic partner or portfolio discount.
          </p>
        </section>
        <section style={panelStyle}>
          <h2>Policy and review links</h2>
          <p>
            <Link href="/terms" style={linkStyle}>Terms</Link> ·{' '}
            <Link href="/privacy" style={linkStyle}>Privacy</Link> ·{' '}
            <Link href="/refund-policy" style={linkStyle}>Refund / cancellation</Link> ·{' '}
            <Link href="/delivery-policy" style={linkStyle}>Delivery</Link> ·{' '}
            <Link href="/payment-security" style={linkStyle}>Payment security</Link> ·{' '}
            <Link href="/contact" style={linkStyle}>Contact</Link>
          </p>
          <p>
            Provider eligibility, final commercial approval, legal review, contact verification and live-domain
            evidence remain open. No checkout or payment is available on this page.
          </p>
        </section>
        <BusinessAdminDeskLegalFooter internalReview />
      </main>
    </div>
  );
}
