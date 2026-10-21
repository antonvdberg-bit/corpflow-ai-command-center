import React from 'react';
import Link from 'next/link';
import PublicPolicyLayout, { policyStyles as ps } from '../components/PublicPolicyLayout.js';
import { formatCurrencyDisclosure } from '../lib/public/merchant-identity.js';
import BusinessAdminDeskPolicyPage from '../components/BusinessAdminDeskPolicyPage.js';
import { resolveBusinessAdminDeskSurface } from '../lib/public/business-admin-desk-packages.js';
import { BAD_REFUND_SECTIONS } from '../lib/public/business-admin-desk-policies.js';

export default function RefundPolicyPage({ surface = 'other' }) {
  if (surface === 'public' || surface === 'staging') {
    return (
      <BusinessAdminDeskPolicyPage
        title="Refund and cancellation"
        description="Refund and cancellation notice for Business Admin Desk packages operated by CorpFlowAI Ltd. No refund right is created by this page."
        path="/refund-policy"
        review={surface === 'staging'}
        sections={BAD_REFUND_SECTIONS}
      />
    );
  }
  return <CorpFlowRefundPolicyPage />;
}

function CorpFlowRefundPolicyPage() {
  return (
    <PublicPolicyLayout title="Refund and Cancellation Policy">
      <section style={ps.section}>
        <h2 style={ps.h2}>Payment timing</h2>
        <p style={ps.p}>
          Payment is handled after intake review and scope confirmation. This website does not collect card or banking
          details on the marketing pages. {formatCurrencyDisclosure()} Business Admin Desk refund wording is published
          separately at{' '}
          <a href="https://businessadmindesk.co.za/refund-policy" style={{ color: '#7dd3fc' }}>
            businessadmindesk.co.za/refund-policy
          </a>
          .
        </p>
        <p style={ps.p}>
          Where payment is invoiced directly by CorpFlowAI Ltd, each successful payment is acknowledged by a PDF
          invoice recording the invoice number, line item, amount, currency, payment route, and payment-confirmation
          timestamp. If a sale is later processed through Paddle, Paddle is merchant of record for that transaction
          and the buyer record for that charge follows Paddle&apos;s terms. CorpFlowAI Ltd does not issue a second
          customer invoice for the same Paddle charge. Paddle checkout is not active on this website, and this
          paragraph does not create a new refund or cancellation right.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Setup fees</h2>
        <p style={ps.p}>
          Setup fees cover the agreed work to design, configure, test, and hand over the software package. If you
          cancel before work starts, a refund may be available. Once setup work has started, refunds are discretionary or
          prorated depending on work already performed. This section states the existing position. It does not add a
          new refund period.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Package-specific terms</h2>
        <p style={ps.p}>
          The written quote or agreement for each configured package states the scope, acceptance point, payment
          timing and any applicable cancellation or refund terms. Existing accepted quotations retain their agreed
          terms; this page does not reprice them.
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
          <Link href="/enquiry-recovery" style={{ color: '#7dd3fc' }}>
            /enquiry-recovery
          </Link>{' '}
          or use the <Link href="/contact" style={{ color: '#7dd3fc' }}>contact page</Link>.
        </p>
      </section>
    </PublicPolicyLayout>
  );
}

export function getServerSideProps({ req }) {
  return { props: { surface: resolveBusinessAdminDeskSurface(req?.headers?.host) } };
}
