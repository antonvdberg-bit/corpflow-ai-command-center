import React from 'react';
import Link from 'next/link';
import PublicPolicyLayout, { policyStyles as ps } from '../components/PublicPolicyLayout.js';

export default function RefundPolicyPage() {
  return (
    <PublicPolicyLayout title="Refund and Cancellation Policy">
      <section style={ps.section}>
        <h2 style={ps.h2}>Payment timing</h2>
        <p style={ps.p}>
          Payment is handled after intake review and scope confirmation. This website does not collect card or banking
          details.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Setup fees</h2>
        <p style={ps.p}>
          Setup fees cover time and work performed to design, configure, test, and hand over the agreed workflow. If you
          cancel before work starts, a refund may be available. Once setup work has started, refunds are discretionary or
          prorated depending on work already performed.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Monitoring and ongoing services</h2>
        <p style={ps.p}>
          Monthly monitoring or support, when offered, can usually be cancelled before the next billing period. Fees for
          work already delivered remain due.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Final terms</h2>
        <p style={ps.p}>
          Specific refund or cancellation terms may also appear on the invoice or service agreement for your engagement.
          If there is a conflict, the confirmed invoice or agreement for that engagement prevails.
        </p>
        <p style={ps.p}>
          Questions: submit intake on{' '}
          <Link href="/lead-rescue" style={{ color: '#7dd3fc' }}>
            /lead-rescue
          </Link>{' '}
          or use the <Link href="/contact" style={{ color: '#7dd3fc' }}>contact page</Link>.
        </p>
      </section>
    </PublicPolicyLayout>
  );
}
