import React from 'react';
import Link from 'next/link';
import CorpFlowPublicPhotoShell from '../components/public/CorpFlowPublicPhotoShell.js';
import { policyStyles as ps, trustStyles as ts } from '../components/PublicPolicyLayout.js';
import { buildPublicPageMeta } from '../lib/public/corpflow-public-market.js';
import {
  ENQUIRY_RECOVERY_DEPOSIT_LINE,
  ENQUIRY_RECOVERY_DIAGNOSIS_HREF,
  ENQUIRY_RECOVERY_PREVIEW_LINE,
  ENQUIRY_RECOVERY_PRICE_LINE,
  ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL,
} from '../lib/public/enquiry-recovery-sprint.js';

/**
 * /onboarding - The first fourteen days of a CorpFlowAI engagement,
 * day by day. Companion to /about, /process, and /standards.
 *
 * Photo background is decorative. Timeline SVG remains the HTML visual
 * anchor for the 14-day steps (see corpflow-onboarding-journey manifest).
 */

const STEPS = [
  {
    label: 'Step 1',
    title: ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL,
    body: 'Tell us how enquiries arrive today and where follow-up is hardest to see. Submitting the form does not create a payment obligation.',
  },
  {
    label: 'Step 2',
    title: 'Diagnosis conversation',
    body: 'A CorpFlowAI operator (a person) confirms whether recovery is commercially worth doing. If we cannot identify a meaningful recovery problem, we should not work together.',
  },
  {
    label: 'Step 3',
    title: 'Written offer',
    body: `If the case qualifies, we send a written offer. The live Enquiry Recovery Sprint is ${ENQUIRY_RECOVERY_PRICE_LINE}. ${ENQUIRY_RECOVERY_DEPOSIT_LINE}`,
  },
  {
    label: 'Step 4',
    title: 'Deposit, access, and assets',
    body: 'Implementation starts after the deposit is cleared and we have the required access and assets or information. Historic USD 150 launch-pilot invoices, if any were issued, remain governed by those invoice terms.',
  },
  {
    label: 'Step 5',
    title: 'First visible preview',
    body: ENQUIRY_RECOVERY_PREVIEW_LINE,
  },
  {
    label: 'Step 6',
    title: 'Approve, then production release',
    body: 'The remaining 40% is payable after you approve the preview and before production release. We do not ask you to replace the tools you already use.',
  },
];

const PROVIDE_LIST = [
  'Login or forwarding access for one lead source (form, mailbox, WhatsApp, or Google Form)',
  'An owner notification channel: email, SMS, or WhatsApp',
  'Access to a single Google Sheet (we share, you own)',
  'A 30-minute review meeting on Day 13',
];

const NOT_ASKED_LIST = [
  'No card or banking details on this website',
  'No deep CRM credentials',
  'No production database access',
  'No long-term commitments before the pilot review',
];

export default function OnboardingPage() {
  const meta = buildPublicPageMeta({
    title: 'Client onboarding',
    description:
      'Diagnosis, written offer, deposit, then a targeted first preview after access and assets. The live Enquiry Recovery Sprint is MUR 85,000 fixed.',
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
      <h1
        style={{
          margin: '16px 0 8px',
          fontSize: 'clamp(28px, 4.6vw, 38px)',
          letterSpacing: '-0.03em',
          lineHeight: 1.15,
          color: '#eef6ff',
        }}
      >
        Client onboarding
      </h1>
      <p style={ts.lead}>
        This is how the live Enquiry Recovery Sprint starts. Diagnosis first. Written offer if the case
        qualifies. Deposit, then a targeted first preview after required access and assets. Nothing is auto-charged
        from this website.
      </p>

      <section style={ps.section}>
        <p style={ts.sectionLabel}>Current commercial path</p>
        <h2 style={ps.h2}>From diagnosis to production release</h2>

        <div style={ts.visualFrame}>
          <img
            src="/assets/visuals/corpflow-onboarding-journey.svg"
            alt="CorpFlowAI onboarding path: diagnosis, written offer, deposit, first visible preview after access and assets, then approved preview before production release."
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
                <span
                  aria-hidden="true"
                  style={{
                    fontSize: 12,
                    letterSpacing: '0.18em',
                    color: '#7dd3fc',
                    fontWeight: 700,
                  }}
                >
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
          An Enquiry Recovery engagement is intentionally low-access at the start. If more access is required,
          we say so in the written offer before the deposit is requested.
        </p>

        <div style={ts.twoColumn}>
          <div style={ts.doCard}>
            <p style={{ ...ts.doDontTitle, color: '#5eead4' }}>What you provide</p>
            <ul style={ts.doDontList}>
              {PROVIDE_LIST.map((item) => (
                <li key={item} style={{ marginBottom: 6 }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div style={ts.dontCard}>
            <p style={{ ...ts.doDontTitle, color: '#fda4af' }}>What we do not ask for</p>
            <ul style={ts.doDontList}>
              {NOT_ASKED_LIST.map((item) => (
                <li key={item} style={{ marginBottom: 6 }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <hr style={ts.divider} />

      <section style={ps.section}>
        <p style={ts.sectionLabel}>What complete means</p>
        <h2 style={ps.h2}>Done is defined before we start</h2>
        <p style={ps.p}>
          The sprint is complete when the agreed preview is approved and the remaining balance is settled before
          production release. Historic USD 150 launch-pilot engagements, if invoiced, remain governed by those
          invoice terms.
        </p>
        <ul style={ps.ul}>
          <li>A 15-minute diagnosis has confirmed a commercially meaningful recovery problem</li>
          <li>A written offer was accepted and the deposit cleared</li>
          <li>Required access and assets were provided</li>
          <li>A first visible preview was produced against those conditions</li>
        </ul>
        <p style={ps.p}>
          We do not guarantee recovered revenue. We help identify quiet enquiries and reduce the chance that
          follow-up is forgotten.
        </p>
      </section>

      <hr style={ts.divider} />

      <section style={ps.section}>
        <div style={ts.ctaRow}>
          <Link href="/enquiry-recovery" style={ts.ctaPrimary}>
            {ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL} &rarr;
          </Link>
          <Link href="/process" style={ts.ctaSecondary}>
            See the engagement process
          </Link>
          <Link href="/standards" style={ts.ctaSecondary}>
            Operational standards
          </Link>
        </div>
      </section>
    </CorpFlowPublicPhotoShell>
  );
}
