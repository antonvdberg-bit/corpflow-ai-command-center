import React from 'react';
import Link from 'next/link';
import PublicPolicyLayout, { policyStyles as ps } from '../components/PublicPolicyLayout.js';
import {
  MERCHANT_LEGAL_NAME,
  MERCHANT_WEBSITE_HOST,
  TRANSACTION_RECEIPT_FIELDS,
} from '../lib/public/merchant-identity.js';

export default function PaymentSecurityPage() {
  return (
    <PublicPolicyLayout title="Payment Security">
      <section style={ps.section}>
        <h2 style={ps.h2}>Card data on CorpFlowAI servers</h2>
        <p style={ps.p}>
          {MERCHANT_LEGAL_NAME} does not capture, transmit, or store payment card numbers, CVV codes, or magnetic-
          stripe data on CorpFlowAI servers or in this website&apos;s intake forms. Card entry, when offered, takes
          place on the payment gateway&apos;s hosted page operated by our acquiring bank (State Bank of Mauritius /
          MPGS) over TLS.
        </p>
        <p style={ps.p}>
          CorpFlowAI receives only the gateway&apos;s confirmation message (for example transaction reference,
          amount, currency, and timestamp). We do not retain full card numbers.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Current payment posture on this website</h2>
        <p style={ps.p}>
          The public marketing pages collect intake only. Payment instructions or a hosted payment link are issued
          after intake review. Live card acceptance through SBM MPGS is being onboarded; this website does not yet
          offer a live checkout until merchant approval is complete.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Visa, Mastercard, and UPI</h2>
        <p style={ps.p}>
          When SBM e-Commerce merchant approval is complete, we intend to accept Visa and Mastercard through the
          bank&apos;s hosted payment page. UPI may be offered only if SBM confirms it for our merchant profile and
          publishes the applicable acceptance rules. Card scheme logos are not displayed on this website until live
          acceptance begins and usage guidelines are confirmed with the bank. No logo or acceptance line on this site
          should be read as live acceptance before that point.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Transaction receipts and invoices</h2>
        <p style={ps.p}>
          Each successful payment is acknowledged with a PDF invoice or receipt issued by {MERCHANT_LEGAL_NAME}. When
          card payments are live, buyer-facing records include the following where applicable:
        </p>
        <ul style={ps.ul}>
          {TRANSACTION_RECEIPT_FIELDS.map((field) => (
            <li key={field}>{field}</li>
          ))}
        </ul>
        <p style={ps.p}>
          Merchant website address shown on receipts: {MERCHANT_WEBSITE_HOST}. Authorization codes appear when the
          gateway supplies them.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Related policies</h2>
        <p style={ps.p}>
          Privacy:{' '}
          <Link href="/privacy" style={{ color: '#7dd3fc' }}>
            privacy policy
          </Link>
          . Operational security:{' '}
          <Link href="/standards" style={{ color: '#7dd3fc' }}>
            operational standards
          </Link>
          .
        </p>
      </section>
    </PublicPolicyLayout>
  );
}
