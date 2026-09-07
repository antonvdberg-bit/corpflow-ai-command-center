import React from 'react';
import Link from 'next/link';
import CorpFlowPublicPhotoShell from '../components/public/CorpFlowPublicPhotoShell.js';
import { policyStyles as ps } from '../components/PublicPolicyLayout.js';
import CustomerServiceContact from '../components/CustomerServiceContact.js';
import {
  CURRENCY_PRIMARY,
  CURRENCY_SECONDARY,
  MERCHANT_LEGAL_NAME,
  MERCHANT_OUTLET_COUNTRY,
  formatCurrencyDisclosure,
} from '../lib/public/merchant-identity.js';
import { buildPublicPageMeta } from '../lib/public/corpflow-public-market.js';
import {
  ENQUIRY_RECOVERY_DEPOSIT_LINE,
  ENQUIRY_RECOVERY_DIAGNOSIS_HREF,
  ENQUIRY_RECOVERY_PRICE_LINE,
  ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL,
} from '../lib/public/enquiry-recovery-sprint.js';

const h1 = {
  margin: '16px 0 8px',
  fontSize: 'clamp(28px, 4.6vw, 38px)',
  letterSpacing: '-0.03em',
  lineHeight: 1.15,
  color: '#eef6ff',
};

export default function ServicesPage() {
  const meta = buildPublicPageMeta({
    title: 'Services',
    description: 'Complete description of digital services offered by CorpFlowAI Ltd, a Mauritius-based operations company.',
    path: '/services',
    ogImage: '/assets/visuals/corpflow-services-hero.jpg',
  });

  return (
    <CorpFlowPublicPhotoShell
      meta={meta}
      visualKey="services"
      maxWidth={800}
      headerCta={{ label: ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL, href: ENQUIRY_RECOVERY_DIAGNOSIS_HREF }}
    >
      <h1 style={h1}>Services</h1>
      <section style={ps.section}>
        <h2 style={ps.h2}>Who we are</h2>
        <p style={ps.p}>
          {MERCHANT_LEGAL_NAME} is a Mauritian-registered company ({MERCHANT_OUTLET_COUNTRY}) that helps selected
          owner-led businesses recover valuable enquiries that have gone quiet, and delivers bounded website and
          administration work where it is justified. We sell and deliver digital services only. We do not sell
          physical goods and we do not ship products.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Productized services</h2>
        <ul style={ps.ul}>
          <li>
            <strong style={{ color: '#dbe7f5' }}>Enquiry Recovery Sprint.</strong> A fixed, bounded engagement
            to identify and recover valuable enquiries that have gone quiet. {ENQUIRY_RECOVERY_PRICE_LINE}.{' '}
            {ENQUIRY_RECOVERY_DEPOSIT_LINE} Maximum three founding-client slots. Historic USD 150 launch-pilot
            invoices, if issued, remain governed by those invoice terms.
          </li>
          <li>
            <strong style={{ color: '#dbe7f5' }}>Workflow setup and handover.</strong> Configuration of forms,
            alerts, logging tools, and simple status boards agreed in writing for the engagement.
          </li>
          <li>
            <strong style={{ color: '#dbe7f5' }}>Optional monitoring.</strong> Monthly monitoring or support may
            be quoted separately after an engagement demonstrates value. It is not included unless
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
          Each invoice states the currency charged ({CURRENCY_PRIMARY} or {CURRENCY_SECONDARY} as applicable)
          before you pay. Offer-specific starting prices appear only on the relevant offer pages.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>How to engage</h2>
        <p style={ps.p}>
          Start with a 15-minute diagnosis on{' '}
          <Link href="/enquiry-recovery" style={{ color: '#7dd3fc' }}>
            Enquiry Recovery
          </Link>
          . We review fit before issuing a written offer or invoice.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Customer service</h2>
        <CustomerServiceContact />
      </section>
    </CorpFlowPublicPhotoShell>
  );
}
