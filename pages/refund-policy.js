import React from 'react';
import Link from 'next/link';
import PublicPolicyLayout, { policyStyles as ps } from '../components/PublicPolicyLayout.js';
import { formatCurrencyDisclosure } from '../lib/public/merchant-identity.js';

export default function RefundPolicyPage() {
  return (
    <PublicPolicyLayout title="Refund and Cancellation Policy">
      <section style={ps.section}>
        <h2 style={ps.h2}>Payment timing</h2>
        <p style={ps.p}>
          Payment is handled after intake review and scope confirmation. This website does not collect card or banking
          details on the marketing pages. {formatCurrencyDisclosure()}
        </p>
        <p style={ps.p}>
          Each successful payment is acknowledged by a PDF invoice issued by CorpFlowAI Ltd recording the invoice
          number, line item, ticket amount, currency, payment route, and payment-confirmation timestamp.
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
        <h2 style={ps.h2}>AI Lead Rescue launch pilot</h2>
        <p style={ps.p}>
          The AI Lead Rescue USD 150 launch pilot is invoiced after intake review and scope confirmation. Refunds are
          available before setup work has started. Once the 48-hour setup work has begun, refunds are discretionary or
          prorated based on the work already performed, in line with the general setup-fee policy above.
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
        <h2 style={ps.h2}>Digital services — returns</h2>
        <p style={ps.p}>
          Services are digital. There are no physical goods to return and no shipping refunds. Cancellation and refund
          rights are described in the sections below and on our{' '}
          <Link href="/delivery-policy" style={{ color: '#7dd3fc' }}>
            delivery policy
          </Link>
          .
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Chargebacks (when card payments are live)</h2>
        <p style={ps.p}>
          When card payments are processed through our bank&apos;s gateway, chargebacks are handled through the
          bank&apos;s dispute process. CorpFlowAI supplies engagement evidence (intake, scope confirmation, delivery
          records, and support correspondence) within the timeline the bank specifies.
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
