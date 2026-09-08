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

const STAGES = [
  {
    n: 1,
    title: '15-minute diagnosis',
    duration: 'short commercial conversation',
    body: 'We confirm whether enquiries are already arriving, whether one conversion is valuable enough, and whether follow-up is inconsistent enough to justify work. If we cannot identify a commercially meaningful recovery problem, we should not work together.',
  },
  {
    n: 2,
    title: 'Written offer',
    duration: 'after a qualified diagnosis',
    body: `If the case qualifies, we send a written Lead Rescue offer: what is in, what is out, and the commercial terms. Lead Rescue is ${ENQUIRY_RECOVERY_PRICE_LINE}.`,
  },
  {
    n: 3,
    title: 'Commercial approval',
    duration: 'before implementation begins',
    body: LEAD_RESCUE_PUBLIC_PAYMENT_LINE,
  },
  {
    n: 4,
    title: 'First visible preview',
    duration: 'after agreed commercial and access conditions are met',
    body: ENQUIRY_RECOVERY_PREVIEW_LINE,
  },
  {
    n: 5,
    title: 'Approve, then release',
    duration: 'before production',
    body: 'You review the visible result before production release. Final commercial steps follow the written offer; the public website does not ask you to choose or calculate a payment structure.',
  },
];

const DO_LIST = [
  'Identify and recover valuable enquiries that have gone quiet',
  'Make follow-up visible to the owner or commercial manager',
  'Work with the channels you already use (website, WhatsApp, phone, Facebook, email, staff)',
  'Use a fixed, bounded engagement with a written offer before payment',
  'Decline work where the economics do not justify the engagement',
];

const DONT_LIST = [
  'Rebuild your website',
  'Replace your CRM, accounting system, or invoicing',
  'Run paid ads, SEO, or content campaigns',
  'Promise revenue, conversion lift, or "AI-driven growth"',
  'Hold a client account hostage - every artifact (Sheets, scripts, configs) is yours',
];

export default function ProcessPage() {
  const meta = buildPublicPageMeta({
    title: 'How a CorpFlowAI engagement runs',
    description: 'Lead Rescue starts with a 15-minute diagnosis and a written offer. MUR 85,000 fixed. First visible preview follows the agreed commercial, access, and asset conditions.',
    path: '/process',
    ogImage: '/assets/visuals/corpflow-process-hero.jpg',
  });

  return (
    <CorpFlowPublicPhotoShell meta={meta} visualKey="process" maxWidth={960} headerCta={{ label: ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL, href: ENQUIRY_RECOVERY_DIAGNOSIS_HREF }}>
      <h1 style={{ margin: '16px 0 8px', fontSize: 'clamp(28px, 4.6vw, 38px)', letterSpacing: '-0.03em', lineHeight: 1.15, color: '#eef6ff' }}>
        How a CorpFlowAI engagement runs
      </h1>
      <p style={ts.lead}>
        Lead Rescue starts with a short diagnosis, not a software rebuild. We do not take payment before a written offer. The five stages below show how the current commercial offer runs.
      </p>

      <section style={ps.section}>
        <p style={ts.sectionLabel}>The five stages</p>
        <h2 style={ps.h2}>Diagnosis first, then a bounded engagement</h2>

        <div style={ts.visualFrame}>
          <img
            src="/assets/visuals/corpflow-process-timeline.svg"
            alt="Five-stage CorpFlowAI engagement: diagnosis, written offer, commercial approval, first visible preview, then approved production release."
            width={1080}
            height={220}
            loading="lazy"
            style={{ width: '100%', height: 'auto', display: 'block', maxWidth: '100%' }}
          />
        </div>

        <ol style={{ listStyle: 'none', padding: 0, margin: '20px 0 8px', display: 'grid', gap: 14 }}>
          {STAGES.map((s) => (
            <li key={s.n} style={ts.card}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginBottom: 6 }}>
                <span aria-hidden="true" style={{ fontSize: 12, letterSpacing: '0.18em', color: '#7dd3fc', fontWeight: 700 }}>
                  STAGE {s.n}
                </span>
                <h3 style={{ ...ts.cardTitle, margin: 0 }}>{s.title}</h3>
                <span style={{ color: '#9fb2c8', fontSize: 13 }}>&middot; {s.duration}</span>
              </div>
              <p style={ts.cardBody}>{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <hr style={ts.divider} />

      <section style={ps.section}>
        <p style={ts.sectionLabel}>Boundaries</p>
        <h2 style={ps.h2}>What we do, and what we do not do</h2>
        <div style={ts.twoColumn}>
          <div style={ts.doCard}>
            <p style={{ ...ts.doDontTitle, color: '#5eead4' }}>What we do</p>
            <ul style={ts.doDontList}>
              {DO_LIST.map((item) => <li key={item} style={{ marginBottom: 6 }}>{item}</li>)}
            </ul>
          </div>
          <div style={ts.dontCard}>
            <p style={{ ...ts.doDontTitle, color: '#fda4af' }}>What we do not do</p>
            <ul style={ts.doDontList}>
              {DONT_LIST.map((item) => <li key={item} style={{ marginBottom: 6 }}>{item}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <hr style={ts.divider} />

      <section style={ps.section}>
        <p style={ts.sectionLabel}>Money</p>
        <h2 style={ps.h2}>Payment after review</h2>
        <p style={ps.p}>
          {LEAD_RESCUE_PUBLIC_PAYMENT_LINE} Payment is processed off-site; this site does not collect card or banking details. The refund window for cancellation before setup begins is published separately on{' '}
          <Link href="/refund-policy" style={{ color: '#7dd3fc' }}>the refund policy page</Link>.
        </p>
        <p style={ps.p}>
          We do not promise revenue, lead volume, or conversion lift. We help make sure existing enquiries are captured, visible, and followed up.
        </p>
      </section>

      <section style={ps.section}>
        <div style={ts.ctaRow}>
          <Link href="/lead-rescue" style={ts.ctaPrimary}>{ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL} &rarr;</Link>
          <Link href="/onboarding" style={ts.ctaSecondary}>See onboarding</Link>
          <Link href="/standards" style={ts.ctaSecondary}>Operational standards</Link>
        </div>
      </section>
    </CorpFlowPublicPhotoShell>
  );
}
