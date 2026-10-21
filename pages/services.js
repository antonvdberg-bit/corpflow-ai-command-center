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
  ENQUIRY_RECOVERY_DIAGNOSIS_HREF,
  ENQUIRY_RECOVERY_PREVIEW_LINE,
  ENQUIRY_RECOVERY_PRICE_LINE,
  ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL,
  ENQUIRY_RECOVERY_SCARCITY_LINE,
  LEAD_RESCUE_PUBLIC_PAYMENT_LINE,
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
    description: `${MERCHANT_LEGAL_NAME} is a software and workflow automation company. Lead Rescue, Website Rescue and bounded automation are the current configured software packages.`,
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
      <h1 style={h1}>Software and workflow automation</h1>
      <section style={ps.section}>
        <h2 style={ps.h2}>Who we are</h2>
        <p style={ps.p}>
          {MERCHANT_LEGAL_NAME} is a Mauritian-registered software and workflow automation company (
          {MERCHANT_OUTLET_COUNTRY}). We supply configured software packages and the implementation, setup and
          support agreed in writing. We do not sell physical goods and we do not ship products.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Current software packages</h2>
        <ul style={ps.ul}>
          <li>
            <strong style={{ color: '#dbe7f5' }}>Lead Rescue.</strong> Software for one business and one supported
            enquiry source, up to 500 enquiry records a month. It maps the enquiry path, configures the agreed
            capture and alerts, and is tested with you before acceptance. {ENQUIRY_RECOVERY_PRICE_LINE}.{' '}
            {ENQUIRY_RECOVERY_SCARCITY_LINE} {LEAD_RESCUE_PUBLIC_PAYMENT_LINE} Your team replies to prospects and
            closes sales. Optional monthly care is a separate opt-in after acceptance: automated health checks where
            installed, working-day review of exceptions, a weekly review, a monthly recap, and up to 60 minutes of
            agreed improvements.{' '}
            <Link href="/lead-rescue" style={{ color: '#7dd3fc' }}>
              Explore Lead Rescue
            </Link>
            .
          </li>
          <li>
            <strong style={{ color: '#dbe7f5' }}>Website Rescue.</strong> One premium landing page or a similarly
            bounded website repair, with mobile and enquiry-path checks and two consolidated review rounds. The
            outcome is a clearer page that captures an enquiry and connects it to the agreed follow-up path. Setup
            starts from the published regional price. Optional monthly care covers one supported site of up to five
            pages. Larger rebuilds, e-commerce and extra functions are quoted separately.{' '}
            <Link href="/website-rescue" style={{ color: '#7dd3fc' }}>
              Explore Website Rescue
            </Link>
            .
          </li>
          <li>
            <strong style={{ color: '#dbe7f5' }}>Business automation.</strong> A configured workflow with agreed
            outcomes, testing and handover. Published projects start from the regional minimum on the pricing page.
            The written quote states milestones, access, dependencies, acceptance and any separate software costs.{' '}
            {ENQUIRY_RECOVERY_PREVIEW_LINE}
          </li>
        </ul>
        <p style={ps.p}>
          Current prices:{' '}
          <Link href="/pricing" style={{ color: '#7dd3fc' }}>
            service pricing
          </Link>
          .
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>What we do not offer on this website</h2>
        <ul style={ps.ul}>
          <li>Physical products, inventory, warehousing, or courier delivery</li>
          <li>Regulated financial, medical, or legal advice</li>
          <li>Guaranteed revenue, lead volume, search rankings, or conversion outcomes</li>
          <li>A WhatsApp API connection or a full CRM replacement, unless that work is quoted separately</li>
          <li>Instant online checkout on the public marketing pages</li>
        </ul>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Currencies</h2>
        <p style={ps.p}>{formatCurrencyDisclosure()}</p>
        <p style={ps.p}>
          Published package prices use selected market rates in MUR, ZAR, AUD and USD. They are not a
          foreign-exchange conversion of one price. The written quote states the currency charged, including{' '}
          {CURRENCY_PRIMARY} or {CURRENCY_SECONDARY} where those apply, before you pay.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>How to engage</h2>
        <p style={ps.p}>
          For Lead Rescue, start with a 15-minute diagnosis on{' '}
          <Link href="/lead-rescue" style={{ color: '#7dd3fc' }}>
            Lead Rescue
          </Link>
          . For Website Rescue or business automation, review{' '}
          <Link href="/pricing" style={{ color: '#7dd3fc' }}>
            pricing
          </Link>{' '}
          and request an assessment. We confirm fit and scope before a written offer or invoice.
        </p>
      </section>
      <section style={ps.section}>
        <h2 style={ps.h2}>Customer service</h2>
        <CustomerServiceContact />
      </section>
    </CorpFlowPublicPhotoShell>
  );
}
