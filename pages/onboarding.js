import React from 'react';
import Link from 'next/link';
import CorpFlowPublicPhotoShell from '../components/public/CorpFlowPublicPhotoShell.js';
import { policyStyles as ps, trustStyles as ts } from '../components/PublicPolicyLayout.js';
import { buildPublicPageMeta } from '../lib/public/corpflow-public-market.js';
import {
  ENQUIRY_RECOVERY_DIAGNOSIS_HREF,
  ENQUIRY_RECOVERY_PREVIEW_LINE,
  ENQUIRY_RECOVERY_PRICE_LINE,
  ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL,
  LEAD_RESCUE_PUBLIC_PAYMENT_LINE,
} from '../lib/public/enquiry-recovery-sprint.js';

const STEPS = [
  {
    label: 'Step 1',
    title: ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL,
    body: 'Tell us how enquiries arrive today and where follow-up is hardest to see. Submitting the form does not create a payment obligation.',
  },
  {
    label: 'Step 2',
    title: 'Diagnosis conversation',
    body: 'A CorpFlowAI operator confirms whether Lead Rescue is commercially worth doing. If we cannot identify a meaningful recovery problem, we should not work together.',
  },
  {
    label: 'Step 3',
    title: 'Written Lead Rescue offer',
    body: `If the case qualifies, we send a written offer. Lead Rescue is ${ENQUIRY_RECOVERY_PRICE_LINE}. ${LEAD_RESCUE_PUBLIC_PAYMENT_LINE}`,
  },
  {
    label: 'Step 4',
    title: 'Access and assets',
    body: 'Implementation starts after the agreed commercial conditions are met and we have the required access and assets or information.',
  },
  {
    label: 'Step 5',
    title: 'First visible preview',
    body: ENQUIRY_RECOVERY_PREVIEW_LINE,
  },
  {
    label: 'Step 6',
    title: 'Approve, then production release',
    body: 'You review the visible result before production release. Final commercial steps follow the written offer, not a public checkout flow.',
  },
];

const PROVIDE_LIST = [
  'How enquiries arrive today and where follow-up becomes hard to see',
  'Agreed access for the first lead source if we proceed',
  'A named owner or commercial contact',
  'A timely preview review',
];

const NOT_ASKED_LIST = [
  'No card or banking details on this website',
  'No deep CRM credentials before they are actually required',
  'No production database access as part of the diagnosis',
  'No long-term commitment before a written offer',
];

export default function OnboardingPage() {
  const meta = buildPublicPageMeta({
    title: 'Client onboarding',
    description: 'Lead Rescue starts with a diagnosis and written offer. MUR 85,000 fixed. First visible preview follows the agreed commercial, access, and asset conditions.',
    path: '/onboarding',
    ogImage: '/assets/visuals/corpflow-onboarding-hero.jpg',
  });

  return (
    <CorpFlowPublicPhotoShell
      meta={meta}
      visualKey="onboarding"
      maxWidth={960}
      headerCta={{ label: ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL, href: ENQUIRY_RECOVERY_DIAGNOSIS_HREF }}
    >
      <h1 style={{ margin: '16px 0 8px', fontSize: 'clamp(28px, 4.6vw, 38px)', letterSpacing: '-0.03em', lineHeight: 1.15, color: '#eef6ff' }}>
        Client onboarding
      </h1>
      <p style={ts.lead}>
        This is how Lead Rescue starts. Diagnosis first. Written offer if the case qualifies. Then the agreed access and assets, followed by a visible preview. Nothing is auto-charged from this website.
      </p>

      <section style={ps.section}>
        <p style={ts.sectionLabel}>Current commercial path</p>
        <h2 style={ps.h2}>From diagnosis to production release</h2>

        <div style={ts.visualFrame}>
          <img
            src="/assets/visuals/corpflow-onboarding-journey.svg"
            alt="CorpFlowAI onboarding path: diagnosis, written Lead Rescue offer, access and assets, first visible preview, then approved production release."
            width={1080}
            height={260}
            loading="lazy"
            style={{ width: '100%', height: 'auto', display: 'block', maxWidth: '100%' }}
          />
        </div>

        <ol style={{ listStyle: 'none', padding: 0, margin: '20px 0 8px', display: 'grid', gap: 14 }}>
          {STEPS.map((s) => (
            <li key={s.label} style={ts.card}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginBottom: 6 }}>
                <span aria-hidden="true" style={{ fontSize: 12, letterSpacing: '0.18em', color: '#7dd3fc', fontWeight: 700 }}>
                  {s.label.toUpperCase()}
                </span>
                <h3 style={{ ...ts.cardTitle, margin: 0 }}>{s.title}</h3>
              </div>
              <p style={ts.cardBody}>{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <hr style={ts.divider} />

      <section style={ps.section}>
        <p style={ts.sectionLabel}>What we ask for, and what we do not</p>
        <h2 style={ps.h2}>Access boundaries</h2>
        <p style={ps.p}>
          Lead Rescue is intentionally low-access at the start. If more access is required, we say so in the written offer before implementation begins.
        </p>

        <div style={ts.twoColumn}>
          <div style={ts.doCard}>
            <p style={{ ...ts.doDontTitle, color: '#5eead4' }}>What you provide</p>
            <ul style={ts.doDontList}>
              {PROVIDE_LIST.map((item) => <li key={item} style={{ marginBottom: 6 }}>{item}</li>)}
            </ul>
          </div>
          <div style={ts.dontCard}>
            <p style={{ ...ts.doDontTitle, color: '#fda4af' }}>What we do not ask for</p>
            <ul style={ts.doDontList}>
              {NOT_ASKED_LIST.map((item) => <li key={item} style={{ marginBottom: 6 }}>{item}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <hr style={ts.divider} />

      <section style={ps.section}>
        <p style={ts.sectionLabel}>What complete means</p>
        <h2 style={ps.h2}>Done is defined before we start</h2>
        <ul style={ps.ul}>
          <li>A 15-minute diagnosis confirmed a commercially meaningful recovery problem</li>
          <li>A written Lead Rescue offer was accepted</li>
          <li>Required access and assets were provided</li>
          <li>A visible preview was reviewed against the agreed scope</li>
        </ul>
        <p style={ps.p}>We do not guarantee recovered revenue. We help identify quiet enquiries and reduce the chance that follow-up is forgotten.</p>
      </section>

      <section style={ps.section}>
        <div style={ts.ctaRow}>
          <Link href="/lead-rescue" style={ts.ctaPrimary}>{ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL} &rarr;</Link>
          <Link href="/process" style={ts.ctaSecondary}>See the engagement process</Link>
          <Link href="/standards" style={ts.ctaSecondary}>Operational standards</Link>
        </div>
      </section>
    </CorpFlowPublicPhotoShell>
  );
}
