import React from 'react';
import Link from 'next/link';
import PublicPolicyLayout, { policyStyles as ps } from '../components/PublicPolicyLayout.js';
import {
  CURRENCY_PRIMARY,
  CURRENCY_SECONDARY,
  MERCHANT_LEGAL_NAME,
  MERCHANT_OUTLET_COUNTRY,
  TRANSACTION_RECEIPT_FIELDS,
  formatCurrencyDisclosure,
} from '../lib/public/merchant-identity.js';

export default function TermsPage() {
  return (
    <PublicPolicyLayout title="Terms of Service">
      <section style={ps.section}>
        <h2 style={ps.h2}>Service description</h2>
        <p style={ps.p}>
          {MERCHANT_LEGAL_NAME} provides practical AI-assisted workflow systems for small businesses, including
          productized offers such as AI Lead Rescue. Services may include intake review, workflow setup, alerts,
          logging, summaries, and optional monitoring. See the{' '}
          <Link href="/services" style={{ color: '#7dd3fc' }}>
            services page
          </Link>{' '}
          for a complete description.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Intake and engagement</h2>
        <p style={ps.p}>
          Submitting an intake form does not create a binding contract by itself. We review fit and scope before
          confirming work, pricing, and payment route. Final terms may be confirmed on the applicable invoice or service
          agreement.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>No guaranteed outcomes</h2>
        <p style={ps.p}>
          We do not guarantee new revenue, specific sales results, or uninterrupted lead flow. We help make existing
          enquiries and follow-ups more visible and actionable through agreed workflows.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Client responsibilities</h2>
        <ul style={ps.ul}>
          <li>Provide accurate intake information and timely responses</li>
          <li>Maintain access to agreed tools such as forms, email, sheets, or messaging channels</li>
          <li>Use services lawfully and in line with your own customer obligations</li>
        </ul>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Acceptable use</h2>
        <p style={ps.p}>
          You may not use our services for unlawful activity, abusive communications, or attempts to compromise systems.
          We may decline or stop work that creates security, legal, or operational risk.
        </p>
        <p style={ps.p}>
          CorpFlowAI services are offered globally for lawful business use. We may decline an engagement if local
          sanctions, regulatory, or trust-and-safety reasons apply.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Service fulfilment and delivery</h2>
        <p style={ps.p}>
          The AI Lead Rescue launch pilot is a digital service. There is no physical shipment. Lead Rescue setup is
          targeted within 48 hours after payment confirmation and receipt of all required client information. Where
          additional clarification, access, client input, or scope confirmation is needed, setup will normally be
          completed within 5 business days unless otherwise agreed.
        </p>
        <p style={ps.p}>
          Full delivery terms:{' '}
          <Link href="/delivery-policy" style={{ color: '#7dd3fc' }}>
            delivery policy
          </Link>
          .
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Payment and currencies</h2>
        <p style={ps.p}>
          Payment is handled after intake review and scope confirmation. This website does not collect card or banking
          details on the marketing pages. Payment instructions are provided through the agreed invoice or hosted payment
          link from our acquiring bank when card payments are enabled.
        </p>
        <p style={ps.p}>{formatCurrencyDisclosure()}</p>
        <p style={ps.p}>
          Primary launch-pilot currency: {CURRENCY_PRIMARY}. Mauritius pro-forma currency where applicable:{' '}
          {CURRENCY_SECONDARY}.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Receipts and transaction records</h2>
        <p style={ps.p}>
          Each successful payment is acknowledged by a PDF invoice or receipt issued by {MERCHANT_LEGAL_NAME}. Records
          include, where applicable:
        </p>
        <ul style={ps.ul}>
          {TRANSACTION_RECEIPT_FIELDS.map((field) => (
            <li key={field}>{field}</li>
          ))}
        </ul>
        <p style={ps.p}>
          Payment-card security:{' '}
          <Link href="/payment-security" style={{ color: '#7dd3fc' }}>
            payment security policy
          </Link>
          .
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Limitation</h2>
        <p style={ps.p}>
          To the extent permitted by applicable law, CorpFlowAI is not liable for indirect or consequential losses arising
          from use of the website or services. Service scope and remedies are defined in the confirmed agreement for the
          engagement.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Governing law</h2>
        <p style={ps.p}>
          {MERCHANT_LEGAL_NAME} is incorporated in {MERCHANT_OUTLET_COUNTRY}. The applicable governing law and contracting
          entity will be confirmed on the invoice or service agreement for the specific engagement.
        </p>
      </section>
    </PublicPolicyLayout>
  );
}
