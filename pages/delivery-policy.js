import React from 'react';
import Link from 'next/link';
import PublicPolicyLayout, { policyStyles as ps } from '../components/PublicPolicyLayout.js';
import { MERCHANT_LEGAL_NAME } from '../lib/public/merchant-identity.js';
import BusinessAdminDeskPolicyPage from '../components/BusinessAdminDeskPolicyPage.js';
import { resolveBusinessAdminDeskSurface } from '../lib/public/business-admin-desk-packages.js';
import { BAD_DELIVERY_SECTIONS } from '../lib/public/business-admin-desk-policies.js';

export default function DeliveryPolicyPage({ surface = 'other' }) {
  if (surface === 'public' || surface === 'staging') {
    return (
      <BusinessAdminDeskPolicyPage
        title="Delivery"
        description="Delivery notice for Business Admin Desk packages operated by CorpFlowAI Ltd. No delivery window is promised on this page."
        path="/delivery-policy"
        review={surface === 'staging'}
        sections={BAD_DELIVERY_SECTIONS}
      />
    );
  }
  return <CorpFlowDeliveryPolicyPage />;
}

function CorpFlowDeliveryPolicyPage() {
  return (
    <PublicPolicyLayout title="Delivery Policy">
      <section style={ps.section}>
        <h2 style={ps.h2}>Digital services only — no physical shipping</h2>
        <p style={ps.p}>
          All services sold by {MERCHANT_LEGAL_NAME} through this website are digital and operationally
          delivered. There is no physical shipment, courier, or postal delivery. You will not receive goods by
          mail or freight. Business Admin Desk delivery wording is published separately at{' '}
          <a href="https://businessadmindesk.co.za/delivery-policy" style={{ color: '#7dd3fc' }}>
            businessadmindesk.co.za/delivery-policy
          </a>
          .
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Configured package delivery</h2>
        <p style={ps.p}>
          Delivery begins after the written package scope, required access and assets are confirmed. Timing,
          acceptance outcome and handover are agreed individually; no unconditional delivery window is promised.
        </p>
        <p style={ps.p}>
          CorpFlowAI builds or configures the agreed system, tests it with the client, obtains acceptance and hands it
          over under client control. Ongoing care is separate and requires authorised access.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Historic engagements</h2>
        <p style={ps.p}>
          Historic USD 150 launch-pilot engagements remain governed by the invoice issued at the time. For those
          engagements, delivery began after payment confirmation and required access. The 48-hour setup clock started
          on the payment-confirmation timestamp, not on intake submission.
        </p>
        <p style={ps.p}>Historic pilot deliverables typically included:</p>
        <ul style={ps.ul}>
          <li>Connection of one agreed lead-capture path</li>
          <li>Owner or operator alert routing on the agreed channel</li>
          <li>A lead log and simple follow-up status view</li>
          <li>Daily summary delivery during the pilot window</li>
          <li>Seven days of monitoring after the setup handover</li>
        </ul>
        <p style={ps.p}>
          Where additional clarification, access, or scope confirmation is needed, setup will normally be
          completed within five business days unless otherwise agreed in writing.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Proof of delivery</h2>
        <p style={ps.p}>
          We document delivery with operator notes, handover confirmation, and the live workflow artefacts
          (for example sheets, scripts, or configurations) agreed in the engagement. Support correspondence is
          retained for dispute and chargeback evidence when card payments are enabled.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Related policies</h2>
        <p style={ps.p}>
          Refunds and cancellations:{' '}
          <Link href="/refund-policy" style={{ color: '#7dd3fc' }}>
            refund and cancellation policy
          </Link>
          . Service terms:{' '}
          <Link href="/terms" style={{ color: '#7dd3fc' }}>
            terms of service
          </Link>
          .
        </p>
      </section>
    </PublicPolicyLayout>
  );
}

export function getServerSideProps({ req }) {
  return { props: { surface: resolveBusinessAdminDeskSurface(req?.headers?.host) } };
}
