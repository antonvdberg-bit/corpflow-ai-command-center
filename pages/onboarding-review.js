import React from 'react';
import Head from 'next/head';

import BusinessAdminDeskPricingReviewPage from '../components/BusinessAdminDeskPricingReviewPage.js';
import PublicPolicyLayout, { policyStyles as ps } from '../components/PublicPolicyLayout.js';
import { APPROVED_REGIONAL_PRICES } from '../lib/public/regional-service-pricing.js';
import {
  isBusinessAdminDeskPublicHost,
  isCipcDeskStandingTestHost,
} from '../lib/server/cipc-desk-runtime.js';

function CoreReview() {
  return (
    <PublicPolicyLayout title="CorpFlowAI · Paddle onboarding review" showUpdated={false}>
      <Head>
        <meta name="robots" content="noindex,nofollow" />
        <style>{'@media print { body { background: white !important; } a { color: black !important; } }'}</style>
      </Head>
      <p style={ps.p}>REVIEW-ONLY DOCUMENT — pricing preparation evidence, not checkout or payment approval.</p>
      <section style={ps.section}>
        <h2 style={ps.h2}>Approved standard rate schedule</h2>
        <ul style={ps.ul}>
          {Object.entries(APPROVED_REGIONAL_PRICES).map(([currency, rate]) => (
            <li key={currency}>
              {rate.market} ({currency}): Lead Rescue {currency} {rate.leadSetup.toLocaleString()} setup /
              {` ${rate.leadMonthly.toLocaleString()} monthly care`}; Website Rescue from {currency}{' '}
              {rate.websiteSetup.toLocaleString()} / {rate.websiteMonthly.toLocaleString()} monthly care;
              automation from {currency} {rate.automationFrom.toLocaleString()}.
            </li>
          ))}
        </ul>
        <p style={ps.p}>
          Rates are selected market prices, not foreign-exchange conversions. Setup and optional care
          are separate. Automation is quoted against fixed outcomes and milestones.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Readiness evidence</h2>
        <ul style={ps.ul}>
          <li>VERIFIED — pricing page preparation and scope summary.</li>
          <li>REVIEW REQUIRED — final commercial approval, legal text and real contact-channel verification.</li>
          <li>REVIEW REQUIRED — software/service category eligibility with Paddle.</li>
          <li>PENDING — deployed URL, commit evidence and actual Paddle acceptance.</li>
        </ul>
      </section>
      <p style={ps.p}>
        Official sources: <a href="https://developer.paddle.com/build/set-up-checklist/">Paddle setup checklist</a>,{' '}
        <a href="https://www.paddle.com/help/start/account-verification/what-is-domain-verification">domain verification</a>,{' '}
        <a href="https://www.paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle">restricted products</a>,
        and <a href="/terms">Terms</a> / <a href="/privacy">Privacy</a> / <a href="/refund-policy">Refund</a>.
      </p>
    </PublicPolicyLayout>
  );
}

export default function OnboardingReviewPage({ host = '' }) {
  if (isCipcDeskStandingTestHost(host)) return <BusinessAdminDeskPricingReviewPage />;
  if (isBusinessAdminDeskPublicHost(host)) return null;
  return <CoreReview />;
}

export function getServerSideProps({ req }) {
  const host = req?.headers?.host || '';
  if (isBusinessAdminDeskPublicHost(host)) return { notFound: true };
  return { props: { host } };
}
