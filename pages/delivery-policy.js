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
        <h2 style={ps.h2}>Enquiry Recovery Sprint (current commercial offer)</h2>
        <p style={ps.p}>
          Delivery of the live Enquiry Recovery Sprint begins after the deposit is cleared and we have the required
          access and assets. First visible preview is targeted within 72 hours of those three being in place — this is
          not an unconditional 72-hour delivery guarantee.
        </p>
        <p style={ps.p}>
          Balance of MUR 34,000 is payable after approved preview and before production release. Specific deliverables
          are confirmed in the written offer for that engagement.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Historic AI Lead Rescue launch pilot</h2>
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
