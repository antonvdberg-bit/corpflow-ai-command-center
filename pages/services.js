import React from 'react';
import Link from 'next/link';
import PublicPolicyLayout, { policyStyles as ps } from '../components/PublicPolicyLayout.js';
import CustomerServiceContact from '../components/CustomerServiceContact.js';
import {
  CURRENCY_PRIMARY,
  CURRENCY_SECONDARY,
  MERCHANT_LEGAL_NAME,
  MERCHANT_OUTLET_COUNTRY,
  formatCurrencyDisclosure,
} from '../lib/public/merchant-identity.js';

export default function ServicesPage() {
  return (
    <PublicPolicyLayout
      title="Services"
      description="Complete description of digital services offered by CorpFlowAI Ltd, a Mauritius-based operations company."
    >
      <section style={ps.section}>
        <h2 style={ps.h2}>Who we are</h2>
        <p style={ps.p}>
          {MERCHANT_LEGAL_NAME} is a Mauritian-registered company ({MERCHANT_OUTLET_COUNTRY}) that builds
          lightweight AI-assisted workflow systems for small businesses. We sell and deliver digital services
          only. We do not sell physical goods and we do not ship products.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Productized services</h2>
        <ul style={ps.ul}>
          <li>
            <strong style={{ color: '#dbe7f5' }}>AI Lead Rescue — launch pilot.</strong> A fixed-scope setup
            engagement that connects one existing lead source (website form, email, WhatsApp, Google Form, or
            similar), routes instant alerts to the business owner, logs every enquiry, surfaces daily follow-up
            summaries, and includes seven days of post-launch monitoring. Priced at {CURRENCY_PRIMARY} 150 after
            intake review.
          </li>
          <li>
            <strong style={{ color: '#dbe7f5' }}>Workflow setup and handover.</strong> Configuration of forms,
            alerts, logging tools, and simple status boards agreed in writing for the engagement.
          </li>
          <li>
            <strong style={{ color: '#dbe7f5' }}>Optional monitoring.</strong> Monthly monitoring or support may
            be quoted separately after a pilot demonstrates value. It is not included in the launch pilot unless
            stated on the invoice.
          </li>
        </ul>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>What we do not offer on this website</h2>
        <ul style={ps.ul}>
          <li>Physical products, inventory, warehousing, or courier delivery</li>
          <li>Regulated financial, medical, or legal advice</li>
          <li>Guaranteed revenue, lead volume, or conversion outcomes</li>
          <li>Instant online checkout on the public marketing pages (payment follows intake review)</li>
        </ul>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Currencies</h2>
        <p style={ps.p}>{formatCurrencyDisclosure()}</p>
        <p style={ps.p}>
          International buyers are invoiced in {CURRENCY_PRIMARY}. Mauritius warm-network buyers may receive a
          pro-forma in {CURRENCY_SECONDARY} at the equivalent of the USD launch pilot on the day of invoicing.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>How to engage</h2>
        <p style={ps.p}>
          Start with the intake form on{' '}
          <Link href="/lead-rescue" style={{ color: '#7dd3fc' }}>
            AI Lead Rescue
          </Link>
          . We review fit and scope before issuing an invoice or payment instructions.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Customer service</h2>
        <CustomerServiceContact />
      </section>
    </PublicPolicyLayout>
  );
}
