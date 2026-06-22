import React from 'react';
import Link from 'next/link';
import PublicPolicyLayout, { policyStyles as ps } from '../components/PublicPolicyLayout.js';
import { MERCHANT_LEGAL_NAME } from '../lib/public/merchant-identity.js';

export default function DeliveryPolicyPage() {
  return (
    <PublicPolicyLayout title="Delivery Policy">
      <section style={ps.section}>
        <h2 style={ps.h2}>Digital services only — no physical shipping</h2>
        <p style={ps.p}>
          All services sold by {MERCHANT_LEGAL_NAME} through this website are digital and operationally
          delivered. There is no physical shipment, courier, or postal delivery. You will not receive goods by
          mail or freight.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>AI Lead Rescue launch pilot</h2>
        <p style={ps.p}>
          Delivery begins after payment is confirmed and we have the access and information needed to complete
          setup. The 48-hour setup clock starts on the payment-confirmation timestamp, not on intake submission.
        </p>
        <p style={ps.p}>Deliverables typically include:</p>
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
