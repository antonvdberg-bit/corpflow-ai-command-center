import React from 'react';
import Link from 'next/link';
import CorpFlowPublicPhotoShell from '../components/public/CorpFlowPublicPhotoShell.js';
import { policyStyles as ps, trustStyles as ts } from '../components/PublicPolicyLayout.js';
import CustomerServiceContact from '../components/CustomerServiceContact.js';
import RareExclusiveContentPage from '../components/RareExclusiveContentPage.js';
import {
  MERCHANT_BRN,
  MERCHANT_LEGAL_NAME,
  MERCHANT_OUTLET_COUNTRY,
  MERCHANT_REGISTERED_OFFICE,
  formatCurrencyDisclosure,
} from '../lib/public/merchant-identity.js';
import { buildPublicPageMeta } from '../lib/public/corpflow-public-market.js';
import { ENQUIRY_RECOVERY_DIAGNOSIS_HREF, ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL } from '../lib/public/enquiry-recovery-sprint.js';
import { luxOrApexPageProps } from '../lib/client/lux-host-page-props.js';

const PRINCIPLES = [
  {
    title: 'Effectiveness over decoration.',
    body: "A workflow is not a website. We measure success by whether the operator's day is calmer and the customer's enquiry is captured — not by how many features ship.",
  },
  {
    title: 'Operational over impressive.',
    body: 'We avoid demos, dashboards, and metrics that look good in a deck but do not move work forward. The first deliverable is always something an operator can use on Monday morning.',
  },
  {
    title: 'Bounded engagements, not platforms.',
    body: 'The live commercial offer is Lead Rescue after a 15-minute diagnosis and a written offer. Broader work is scoped separately, in writing, only when it is justified.',
  },
  {
    title: 'Honest scope.',
    body: 'If a request requires rebuilding a website, replacing a CRM, or migrating data, we say so before any payment is taken. We will decline a project we cannot deliver lightly.',
  },
  {
    title: 'Lightweight by default.',
    body: "We prefer Google Sheets over a CRM, a webhook over a portal, an email over a chatbot — until the operator's real volume requires more. Every layer of complexity has to be earned.",
  },
  {
    title: 'Diagnosis first, payment after a written offer.',
    body: 'No card or banking details are collected on this website. If Lead Rescue is a fit, commercial terms are confirmed in writing before payment.',
  },
  {
    title: 'No revenue guarantees.',
    body: 'We help make sure existing enquiries are captured, visible, and followed up. We do not promise that doing this will produce new revenue. That depends on the business, the market, and the conversation.',
  },
];

export default function AboutPage({ luxMode = false, seoHost = '' } = {}) {
  if (luxMode) return <RareExclusiveContentPage pageId="about" seoHost={seoHost} />;

  const meta = buildPublicPageMeta({
    title: 'About CorpFlowAI',
    description: 'CorpFlowAI is a Mauritius-based company that helps selected owner-led businesses identify and recover valuable enquiries that have gone quiet. Lead Rescue is the current commercial focus.',
    path: '/about',
    ogImage: '/assets/visuals/corpflow-about-hero.jpg',
  });

  return (
    <CorpFlowPublicPhotoShell meta={meta} visualKey="about" maxWidth={960} headerCta={{ label: ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL, href: ENQUIRY_RECOVERY_DIAGNOSIS_HREF }}>
      <h1 style={{ margin: '16px 0 8px', fontSize: 'clamp(28px, 4.6vw, 38px)', letterSpacing: '-0.03em', lineHeight: 1.15, color: '#eef6ff' }}>About CorpFlowAI</h1>
      <p style={ts.lead}>
        CorpFlowAI is a Mauritius-based operations company. We help selected owner-led businesses identify and recover valuable enquiries that have gone quiet — without asking them to replace everything they already use. We are not a generic marketing agency and we are not selling “AI”. The live commercial offer is Lead Rescue after a short diagnosis.
      </p>

      <section style={ps.section}>
        <p style={ts.sectionLabel}>How we operate</p>
        <h2 style={ps.h2}>Operating principles</h2>
        <p style={ps.p}>These are the working rules our team uses to decide what to build, what to decline, and how to talk to clients.</p>
        <div style={{ ...ts.pillarGrid, marginTop: 18 }}>
          {PRINCIPLES.map((p) => (
            <div key={p.title} style={ts.card}>
              <h3 style={ts.cardTitle}>{p.title}</h3>
              <p style={ts.cardBody}>{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <hr style={ts.divider} />

      <section style={ps.section}>
        <p style={ts.sectionLabel}>Founder&rsquo;s note</p>
        <h2 style={ps.h2}>Why CorpFlowAI exists</h2>
        <div style={ts.founderQuote}>
          <p style={{ margin: '0 0 14px' }}>
            I started CorpFlowAI because most small businesses do not need another platform. They need their existing enquiries to stop falling through the cracks. The fastest way to help them is to install a small, calm system that captures every lead, alerts the owner, and leaves a daily summary. After that, we can talk about CRMs, automation, and “AI”.
          </p>
          <p style={{ margin: '0 0 14px' }}>
            The team is intentionally small. Every engagement is run by an operator. If we cannot help, we say so directly, and we say it before money changes hands.
          </p>
          <p style={{ margin: 0 }}>
            CorpFlowAI is not a growth platform. It is an operations company. The number we care about is whether your follow-ups happen.
          </p>
          <div style={ts.founderSignoff}>&mdash; Anton, founder, CorpFlowAI</div>
        </div>
      </section>

      <hr style={ts.divider} />

      <section style={ps.section}>
        <p style={ts.sectionLabel}>Company</p>
        <h2 style={ps.h2}>CorpFlowAI Ltd</h2>
        <p style={ps.p}>
          {MERCHANT_LEGAL_NAME} is a Mauritian-registered company. Registered office: {MERCHANT_REGISTERED_OFFICE}. Business Registration Number: {MERCHANT_BRN}. Merchant outlet country: {MERCHANT_OUTLET_COUNTRY}.
        </p>
        <CustomerServiceContact />
        <p style={ps.p}>{formatCurrencyDisclosure()}</p>
      </section>

      <section style={ps.section}>
        <div style={ts.ctaRow}>
          <Link href="/lead-rescue" style={ts.ctaPrimary}>{ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL} &rarr;</Link>
          <Link href="/contact" style={ts.ctaSecondary}>Ask a question first</Link>
        </div>
      </section>
    </CorpFlowPublicPhotoShell>
  );
}

export async function getServerSideProps({ req }) {
  return luxOrApexPageProps(req);
}
