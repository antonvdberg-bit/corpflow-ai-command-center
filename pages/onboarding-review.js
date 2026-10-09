import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import BusinessAdminDeskPricingReviewPage from '../components/BusinessAdminDeskPricingReviewPage.js';
import { APPROVED_REGIONAL_PRICES } from '../lib/public/regional-service-pricing.js';
import {
  isBusinessAdminDeskPublicHost,
  isCipcDeskStandingTestHost,
  normalizeHostname,
} from '../lib/server/cipc-desk-runtime.js';

const linkStyle = { color: '#7dd3fc' };
const sourceLinks = [
  ['Paddle domain verification', 'https://www.paddle.com/help/start/account-verification/what-is-domain-verification'],
  ['Paddle setup checklist', 'https://developer.paddle.com/build/set-up-checklist/'],
  ['Paddle restricted products', 'https://www.paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle'],
  ['Paddle terms', 'https://www.paddle.com/legal/terms'],
];

function Checklist({ bad }) {
  const rows = bad
    ? [
        ['Package scope documented', 'VERIFIED', 'Quote-only service scope is described; final rates remain pending.'],
        ['Final commercial approval', 'OPEN', 'Numerical ZAR rates are not approved.'],
        ['Legal and refund text', 'OPEN', 'Human review and evidence of applicable terms remain required.'],
        ['Contact channel', 'OPEN', 'Business Admin Desk contact aliases require real-channel verification.'],
        ['Provider eligibility', 'OPEN', 'Paddle eligibility is not inferred from this page.'],
      ]
    : [
        ['Approved regional pricing', 'VERIFIED', 'Selected standard product matrix is published below.'],
        ['Package scope and handover', 'VERIFIED', 'Assessment, configuration, testing, acceptance and handover are stated.'],
        ['Policy routes', 'VERIFIED', 'Terms, privacy, refund, delivery, security and contact are linked.'],
        ['Final legal review', 'OPEN', 'No new legal clause is silently treated as approved.'],
        ['Provider eligibility / acceptance', 'OPEN', 'Paddle review and acceptance remain pending.'],
      ];
  return (
    <div>
      {rows.map(([label, status, note]) => (
        <div key={label} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) 100px 2fr', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
          <strong>{label}</strong><span>{status}</span><span style={{ color: '#b8c7d8' }}>{note}</span>
        </div>
      ))}
    </div>
  );
}

export default function OnboardingReviewPage({ host = '' }) {
  const bad = isCipcDeskStandingTestHost(host);
  if (bad) return <BusinessAdminDeskPricingReviewPage />;
  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 20px', fontFamily: 'system-ui', lineHeight: 1.6 }}>
      <Head>
        <title>CorpFlowAI · Paddle onboarding review</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="description" content="Review-only pricing and policy evidence for Paddle onboarding." />
        <style>{'@media print { nav, .no-print { display: none !important } body { color: #000; background: #fff } }'}</style>
      </Head>
      <nav className="no-print"><Link href="/" style={linkStyle}>CorpFlowAI</Link> · <Link href="/pricing" style={linkStyle}>Pricing</Link></nav>
      <p style={{ color: '#b45309', fontWeight: 800 }}>REVIEW ONLY · PROVIDER ELIGIBILITY PENDING · NO CHECKOUT</p>
      <h1>CorpFlowAI Paddle onboarding evidence</h1>
      <p>This printable view supports reviewer evidence. It is not a payment page, acceptance claim or legal approval.</p>
      <section>
        <h2>Readiness checklist</h2>
        <Checklist bad={false} />
      </section>
      <section>
        <h2>Approved standard regional pricing</h2>
        {Object.entries(APPROVED_REGIONAL_PRICES).map(([currency, rate]) => (
          <p key={currency}><strong>{currency} — {rate.market}:</strong> Lead setup {currency} {rate.leadSetup.toLocaleString()}, optional care {currency} {rate.leadMonthly.toLocaleString()}/month; Website setup from {currency} {rate.websiteSetup.toLocaleString()}, optional care {currency} {rate.websiteMonthly.toLocaleString()}/month; automation projects from {currency} {rate.automationFrom.toLocaleString()}.</p>
        ))}
        <p>Rates are selected market prices, not foreign-exchange conversion. Fit, scope, timing, taxes, total price and payment instructions are confirmed in writing before commitment.</p>
      </section>
      <section>
        <h2>Package evidence</h2>
        <p>Customers buy complete configured packages: agreed AI processing, implementation, human verification, testing, acceptance outcome and handover under client control. Ongoing care is separate and requires explicit opt-in and authorised access.</p>
        <p>Lead Rescue covers one supported source up to 500 enquiry records per month. Website Rescue covers one premium landing page or bounded repair with two consolidated review rounds. No rankings, revenue, legal-compliance or WhatsApp API promise is made.</p>
      </section>
      <section>
        <h2>Policy routes and official sources</h2>
        <p><Link href="/terms" style={linkStyle}>Terms</Link> · <Link href="/privacy" style={linkStyle}>Privacy</Link> · <Link href="/refund-policy" style={linkStyle}>Refund / cancellation</Link> · <Link href="/delivery-policy" style={linkStyle}>Delivery</Link> · <Link href="/payment-security" style={linkStyle}>Payment security</Link> · <Link href="/contact" style={linkStyle}>Contact</Link></p>
        <ul>{sourceLinks.map(([label, href]) => <li key={href}><a href={href} style={linkStyle}>{label}</a></li>)}</ul>
      </section>
      <section><h2>Open evidence</h2><p>Final legal review, real contact-channel verification, business/identity evidence, product-category eligibility, deployed URL/commit evidence and actual Paddle acceptance remain separate gates.</p></section>
    </main>
  );
}

export function getServerSideProps({ req }) {
  const host = normalizeHostname(req?.headers?.host);
  if (isBusinessAdminDeskPublicHost(host)) return { notFound: true };
  return { props: { host } };
}
