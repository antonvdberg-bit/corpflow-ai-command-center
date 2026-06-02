import React from 'react';
import Link from 'next/link';
import PublicPolicyLayout, { policyStyles as ps } from '../components/PublicPolicyLayout.js';

export default function ContactPage() {
  return (
    <PublicPolicyLayout title="Contact">
      <section style={ps.section}>
        <h2 style={ps.h2}>Start with intake</h2>
        <p style={ps.p}>
          The fastest way to contact CorpFlowAI about AI Lead Rescue or workflow setup is the intake form on our public
          offer page. Tell us your business name, how enquiries arrive today, and what follow-up problem you want fixed
          first.
        </p>
        <p style={ps.p}>
          <Link href="/lead-rescue" style={{ color: '#2dd4bf', fontWeight: 700 }}>
            Go to AI Lead Rescue intake →
          </Link>
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>General enquiries</h2>
        <p style={ps.p}>
          For service questions before intake, use the form above so we can route your request correctly. Official
          business contact details and contracting entity will be confirmed on the invoice or service agreement.
        </p>
        <p style={ps.p}>
          Existing clients with portal access may use <Link href="/login" style={{ color: '#7dd3fc' }}>client login</Link>.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Customer support and complaints</h2>
        <p style={ps.p}>
          For service support, write to{' '}
          <a href="mailto:support@corpflowai.com" style={{ color: '#7dd3fc' }}>support@corpflowai.com</a>. We
          acknowledge messages within two working days for routine queries and within one business day during
          active pilot windows. Complaints are acknowledged in writing within two working days and answered
          with either a resolution, a partial refund where applicable under our{' '}
          <Link href="/refund-policy" style={{ color: '#7dd3fc' }}>refund and cancellation policy</Link>, or a
          written explanation. If a complaint is not resolved at the support level, you may request founder
          review by replying to the same thread.
        </p>
      </section>
    </PublicPolicyLayout>
  );
}
