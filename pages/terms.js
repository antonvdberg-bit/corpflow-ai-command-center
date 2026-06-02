import React from 'react';
import PublicPolicyLayout, { policyStyles as ps } from '../components/PublicPolicyLayout.js';

export default function TermsPage() {
  return (
    <PublicPolicyLayout title="Terms of Service">
      <section style={ps.section}>
        <h2 style={ps.h2}>Service description</h2>
        <p style={ps.p}>
          CorpFlowAI provides practical AI-assisted workflow systems for small businesses, including productized offers
          such as AI Lead Rescue. Services may include intake review, workflow setup, alerts, logging, summaries, and
          optional monitoring.
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
        <h2 style={ps.h2}>Service fulfilment</h2>
        <p style={ps.p}>
          The AI Lead Rescue launch pilot is a digital service. There is no physical shipment. Lead Rescue setup is
          targeted within 48 hours after payment confirmation and receipt of all required client information. Where
          additional clarification, access, client input, or scope confirmation is needed, setup will normally be
          completed within 5 business days unless otherwise agreed.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Payment</h2>
        <p style={ps.p}>
          Payment is handled after intake review and scope confirmation. This website does not collect card or banking
          details. Payment instructions are provided through the agreed invoice or payment route. All transactions for
          the AI Lead Rescue launch pilot are processed in USD.
        </p>
        <p style={ps.p}>
          Each successful payment is acknowledged by a PDF invoice issued by CorpFlowAI Ltd recording the invoice
          number, line item, ticket amount, currency, payment route, and payment-confirmation timestamp.
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
          The applicable governing law and contracting entity will be confirmed on the invoice or service agreement for
          the specific engagement.
        </p>
      </section>
    </PublicPolicyLayout>
  );
}
